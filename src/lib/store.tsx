import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { seed, TODAY, uid } from './seed'
import { balance, contractValue, coTotal, currentScope, delta, expectedEnd, fmtDate, money } from './logic'
import type { Activity, ChangeOrder, Payment, RepScreen, Sel, Signatures, State, View } from './types'

export interface Store {
  s: State
  setView: (v: View) => void
  go: (screen: RepScreen) => void
  /** Opens the current draft, or starts Change Order #n on the signed quote. */
  startCO: () => string
  patchCO: (id: string, patch: Partial<ChangeOrder>) => void
  /** Adds an item to the copy. An item already on it gets the quantity added instead. */
  addSel: (coId: string, sel: Sel) => void
  patchSel: (coId: string, key: string, patch: Partial<Sel>) => void
  /** Contract items go to qty 0 (removed); items new on this change order leave the copy. */
  dropSel: (coId: string, key: string) => void
  deleteCO: (id: string) => void
  signCO: (id: string, sigs: Signatures) => void
  addPayment: (p: Omit<Payment, 'id'>) => void
  reset: () => void
}

const Ctx = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [s, set] = useState<State>(seed)

  const store = useMemo<Store>(() => {
    const mapCO = (id: string, fn: (c: ChangeOrder) => ChangeOrder) =>
      set((p) => ({ ...p, cos: p.cos.map((c) => (c.id === id ? fn(c) : c)) }))
    return {
      s,
      setView: (view) => set((p) => ({ ...p, view })),
      go: (screen) => set((p) => ({ ...p, view: 'rep', screen })),
      startCO: () => {
        const existing = s.cos.find((c) => c.status === 'draft')
        if (existing) {
          set((p) => ({ ...p, view: 'rep', screen: { name: 'co', coId: existing.id } }))
          return existing.id
        }
        const id = uid('co')
        const number = Math.max(0, ...s.cos.map((c) => c.number)) + 1
        const co: ChangeOrder = {
          id,
          number,
          status: 'draft',
          createdAt: TODAY,
          sels: currentScope(s),
          schedule: 'remain',
          dueOnSigning: 0,
          dueTouched: false,
          payMethod: 'Check',
          checkNo: '',
          signatures: {},
        }
        set((p) => ({
          ...p,
          cos: [...p.cos, co],
          view: 'rep',
          screen: { name: 'co', coId: id },
          activity: [...p.activity, { id: uid('a'), at: TODAY, who: p.contract.rep, text: `Change Order #${number} started on quote ${p.contract.quoteId}`, where: ['quote', 'opportunity'] }],
        }))
        return id
      },
      patchCO: (id, patch) => mapCO(id, (c) => ({ ...c, ...patch })),
      addSel: (coId, sel) =>
        mapCO(coId, (c) => {
          const hit = sel.itemId ? c.sels.find((x) => x.itemId === sel.itemId) : undefined
          if (hit) return { ...c, sels: c.sels.map((x) => (x === hit ? { ...x, qty: x.qty + sel.qty, coNote: sel.coNote ?? x.coNote } : x)) }
          return { ...c, sels: [...c.sels, sel] }
        }),
      patchSel: (coId, key, patch) => mapCO(coId, (c) => ({ ...c, sels: c.sels.map((x) => (x.key === key ? { ...x, ...patch } : x)) })),
      dropSel: (coId, key) =>
        mapCO(coId, (c) => ({
          ...c,
          sels: c.sels.flatMap((x) => (x.key !== key ? [x] : x.baseQty === 0 ? [] : [{ ...x, qty: 0 }])),
        })),
      deleteCO: (id) =>
        set((p) => ({ ...p, cos: p.cos.filter((c) => c.id !== id || c.status === 'signed'), view: 'rep', screen: { name: 'quote' } })),
      signCO: (id, sigs) =>
        set((p) => {
          const co = p.cos.find((c) => c.id === id)
          if (!co || co.status === 'signed') return p
          const valueBefore = contractValue(p)
          const endBefore = expectedEnd(p)
          const d = coTotal(co)
          const signed: ChangeOrder = { ...co, status: 'signed', signedAt: TODAY, signatures: sigs }
          const payments = [...p.payments]
          const ref = co.payMethod === 'Check' && co.checkNo ? `Check #${co.checkNo}` : co.payMethod
          if (co.dueOnSigning > 0)
            payments.push({ id: uid('pay'), date: TODAY, label: `Payment - Change Order #${co.number}`, amount: co.dueOnSigning, method: co.payMethod, ref, source: 'co', coId: id })
          const mid: State = { ...p, cos: p.cos.map((c) => (c.id === id ? signed : c)), payments }
          const valueAfter = contractValue(mid)
          const endAfter = expectedEnd(mid)
          const flow = { valueBefore, valueAfter, endBefore, endAfter, balanceAfter: balance(mid) }
          const signer = p.contract.customer.primary
          const act: Activity[] = [
            { id: uid('a'), at: TODAY, who: p.contract.rep, text: `Change Order #${co.number} signed by ${signer} on quote ${p.contract.quoteId} · ${delta(d)} · contract now ${money(valueAfter)}`, where: ['quote', 'opportunity', 'project'] },
          ]
          if (co.dueOnSigning > 0)
            act.push({ id: uid('a'), at: TODAY, who: p.contract.rep, text: `Payment ${money(co.dueOnSigning)} received for Change Order #${co.number} · ${ref}`, where: ['opportunity', 'project'] })
          if (endAfter !== endBefore)
            act.push({ id: uid('a'), at: TODAY, who: 'Merlin', text: `Expected end moved ${fmtDate(endBefore)} → ${fmtDate(endAfter)} by Change Order #${co.number}`, where: ['project'] })
          return {
            ...mid,
            cos: mid.cos.map((c) => (c.id === id ? { ...signed, flow } : c)),
            activity: [...p.activity, ...act],
            view: 'rep',
            screen: { name: 'done', coId: id },
          }
        }),
      addPayment: (pay) =>
        set((p) => ({
          ...p,
          payments: [...p.payments, { ...pay, id: uid('pay') }],
          activity: [...p.activity, { id: uid('a'), at: pay.date, who: 'Office', text: `Payment ${money(pay.amount)} received${pay.ref ? ` · ${pay.ref}` : ''}`, where: ['opportunity', 'project'] }],
        })),
      reset: () => set(seed()),
    }
  }, [s])

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>
}

export function useStore() {
  const v = useContext(Ctx)
  if (!v) throw new Error('StoreProvider missing')
  return v
}
