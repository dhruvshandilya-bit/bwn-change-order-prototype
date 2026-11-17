import type { ChangeOrder, Sel, State, Unit } from './types'
import { TODAY } from './seed'

export const round2 = (x: number) => Math.round(x * 100) / 100
export const money = (x: number) =>
  '$' + Math.abs(x).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
/** Accounting style: credits in brackets. */
export const paren = (x: number) => (x < 0 ? `(${money(x)})` : money(x))
export const delta = (x: number) => (x > 0 ? '+' : x < 0 ? '−' : '') + money(x)
export const qtyText = (q: number) => (Number.isInteger(q) ? String(q) : q.toFixed(2).replace(/0+$/, ''))
export const qtyUnit = (q: number, u: Unit) => `${qtyText(q)} ${u}`

const parts = (iso: string) => iso.split('-').map(Number) as [number, number, number]
export const fmtDate = (iso?: string) => {
  if (!iso) return ''
  const [y, m, d] = parts(iso)
  return `${String(m).padStart(2, '0')}/${String(d).padStart(2, '0')}/${y}`
}
export const fmtShort = (iso: string) => fmtDate(iso).replace(/\/(\d{2})(\d{2})$/, '/$2')
export const daysBetween = (a: string, b: string) => {
  const [y1, m1, d1] = parts(a)
  const [y2, m2, d2] = parts(b)
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000)
}

export type ChangeKind = 'added' | 'removed' | 'increased' | 'reduced'
export interface Change extends Sel {
  delta: number
  amount: number
  change: ChangeKind
}
/** What a selection costs at a given quantity. */
export const selAmount = (x: Sel, qty = x.qty) => round2(qty * x.price)
export const selsTotal = (sels: Sel[], base = false) => round2(sels.reduce((a, x) => a + selAmount(x, base ? x.baseQty : x.qty), 0))
/** The difference between the copied selections and the edited ones, item by item. */
export function changes(co: { sels: Sel[] }): Change[] {
  return co.sels
    .map((x) => ({ x, d: round2(x.qty - x.baseQty) }))
    .filter(({ d }) => d !== 0)
    .map(({ x, d }) => ({
      ...x,
      delta: d,
      amount: round2(d * x.price),
      change: (x.baseQty === 0 ? 'added' : x.qty === 0 ? 'removed' : d > 0 ? 'increased' : 'reduced') as ChangeKind,
    }))
}
export const changeLabel = (c: Change) =>
  c.change === 'added' ? `${c.name} added` : c.change === 'removed' ? `${c.name} removed` : `${c.name} ${c.delta > 0 ? '+' : '−'}${qtyText(Math.abs(c.delta))} ${c.unit}`
export const changeSummary = (co: ChangeOrder) => changes(co).map(changeLabel).join(' · ') || 'No changes yet'
/** Before total minus after total of the selections. */
export const coSubtotal = (co: ChangeOrder) => round2(selsTotal(co.sels) - selsTotal(co.sels, true))
/** "D": the change-order total after any rep override. */
export const coTotal = (co: ChangeOrder) => (co.override ?? coSubtotal(co))
export const signedCOs = (s: State) => s.cos.filter((c) => c.status === 'signed').sort((a, b) => a.number - b.number)
export const draftCO = (s: State) => s.cos.find((c) => c.status === 'draft')
export const prevCOTotal = (s: State, co: ChangeOrder) =>
  round2(signedCOs(s).filter((c) => c.id !== co.id && c.number < co.number).reduce((a, c) => a + coTotal(c), 0))
/** Contract value now = A + every signed change order. Drives Opportunity + Project. */
export const contractValue = (s: State) => round2(s.contract.total + signedCOs(s).reduce((a, c) => a + coTotal(c), 0))
/** "E" for a given change order = A + previous change orders + this one. */
export const revisedWith = (s: State, co: ChangeOrder) => round2(s.contract.total + prevCOTotal(s, co) + coTotal(co))
export const paidTotal = (s: State) => round2(s.payments.reduce((a, p) => a + p.amount, 0))
export const balance = (s: State) => round2(contractValue(s) - paidTotal(s))
export const expectedEnd = (s: State) => {
  let end = s.contract.completion
  for (const c of signedCOs(s)) if (c.schedule !== 'remain' && c.newCompletion) end = c.newCompletion
  return end
}
/** Same rule the quote uses for the deposit: 30% rounded to $100. Credits owe nothing. */
export const defaultDue = (d: number) => (d > 0 ? Math.round((d * 0.3) / 100) * 100 : 0)

/** Selections on the contract today: the latest signed change order's copy, else the original quote. */
export function currentScope(s: State): Sel[] {
  const done = signedCOs(s)
  const last = done[done.length - 1]
  return (last ? last.sels : s.contract.sels).filter((x) => x.qty > 0).map((x) => ({ ...x, baseQty: x.qty, coNote: undefined }))
}

export interface StmtRow {
  date: string
  desc: string
  contract?: number
  payment?: number
  balance: number
  pending?: boolean
}
export interface Statement {
  rows: StmtRow[]
  charges: number
  credits: number
  revised: number
  paid: number
  balance: number
}

/** Contract Statement: contracts and credits under Contracts, money received under Payments. */
export function statement(s: State, draft?: ChangeOrder): Statement {
  type Ev = { date: string; seq: number; desc: string; contract?: number; payment?: number; pending?: boolean }
  const ev: Ev[] = [{ date: s.contract.signedAt, seq: 0, desc: 'Original Waterproofing Contract', contract: s.contract.total }]
  const coLabel = (c: ChangeOrder) => `Change Order #${c.number}${coTotal(c) < 0 ? ' - credit' : ''}`
  for (const c of signedCOs(s)) ev.push({ date: c.signedAt ?? c.createdAt, seq: 10 + c.number * 2, desc: coLabel(c), contract: coTotal(c) })
  for (const p of s.payments) {
    const co = p.coId ? s.cos.find((c) => c.id === p.coId) : undefined
    const seq = p.source === 'deposit' ? 1 : co ? 11 + co.number * 2 : 1000
    ev.push({ date: p.date, seq, desc: p.ref ? `${p.label} · ${p.ref}` : p.label, payment: p.amount })
  }
  if (draft && draft.status === 'draft') {
    ev.push({ date: TODAY, seq: 5000, desc: `${coLabel(draft)} (this change order)`, contract: coTotal(draft), pending: true })
    if (draft.dueOnSigning > 0)
      ev.push({ date: TODAY, seq: 5001, desc: `Payment - Change Order #${draft.number} (due at signing)`, payment: draft.dueOnSigning, pending: true })
  }
  ev.sort((a, b) => (a.date === b.date ? a.seq - b.seq : a.date < b.date ? -1 : 1))
  let run = 0
  const rows = ev.map((e) => {
    run = round2(run + (e.contract ?? 0) - (e.payment ?? 0))
    return { ...e, balance: run }
  })
  const charges = round2(ev.reduce((a, e) => a + (e.contract && e.contract > 0 ? e.contract : 0), 0))
  const credits = round2(ev.reduce((a, e) => a + (e.contract && e.contract < 0 ? e.contract : 0), 0))
  const paid = round2(ev.reduce((a, e) => a + (e.payment ?? 0), 0))
  return { rows, charges, credits, revised: round2(charges + credits), paid, balance: round2(charges + credits - paid) }
}
