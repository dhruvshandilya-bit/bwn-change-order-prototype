import { Briefcase, CalendarDays, FileText, FolderKanban, LayoutDashboard, MinusCircle, Plus, PlusCircle, Receipt, Users, Wallet, Settings, ClipboardList, ArrowUpRight } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useStore } from '@/lib/store'
import { TODAY } from '@/lib/seed'
import { balance, changes, changeSummary, coTotal, contractValue, daysBetween, delta, draftCO, expectedEnd, fmtDate, money, paidTotal, paren, signedCOs, statement } from '@/lib/logic'
import type { Place, PayMethod } from '@/lib/types'
import { Button, Card, Field, Modal, MoneyInput, Pill, cn, inputCls } from '@/components/ui'
import { ChangeOrderDoc, FieldLegend, StatementDoc } from '@/docs/Docs'

const NAV: { label: string; icon: ReactNode }[] = [
  { label: 'Dashboard', icon: <LayoutDashboard size={16} /> },
  { label: 'Opportunities', icon: <Briefcase size={16} /> },
  { label: 'Projects', icon: <FolderKanban size={16} /> },
  { label: 'Customers', icon: <Users size={16} /> },
  { label: 'Daily Log', icon: <ClipboardList size={16} /> },
  { label: 'Finance', icon: <Wallet size={16} /> },
  { label: 'Settings', icon: <Settings size={16} /> },
]

function Shell({ active, crumbs, children }: { active: string; crumbs: string[]; children: ReactNode }) {
  return (
    <div className="flex min-h-[calc(100vh-112px)] overflow-hidden rounded-2xl border border-stroke-soft-200 bg-white">
      <aside className="hidden w-52 shrink-0 border-r border-stroke-soft-200 bg-bg-soft-50 p-3 md:block">
        <div className="mb-4 flex items-center gap-2 px-2 pt-1">
          <div className="grid h-7 w-7 place-items-center rounded-lg bg-brand-500 text-[13px] font-black text-white">M</div>
          <span className="font-bold">Merlin</span>
        </div>
        {NAV.map((n) => (
          <div key={n.label} className={cn('mb-0.5 flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] font-medium', n.label === active ? 'bg-brand-50 text-brand-500' : 'text-text-sub-600')}>
            {n.icon}
            {n.label}
          </div>
        ))}
      </aside>
      <main className="min-w-0 flex-1 bg-[#fafafa]">
        <div className="border-b border-stroke-soft-200 bg-white px-4 py-2.5 text-[12.5px] text-text-soft-400 sm:px-6">{crumbs.join('  /  ')}</div>
        <div className="space-y-4 p-4 sm:p-6">{children}</div>
      </main>
    </div>
  )
}

function Kpi({ label, value, sub, tone }: { label: string; value: string; sub?: ReactNode; tone?: 'brand' | 'ok' | 'warn' }) {
  return (
    <div className={cn('rounded-2xl border bg-white p-4', tone === 'brand' ? 'border-brand-200 ring-2 ring-brand-50' : 'border-stroke-soft-200')}>
      <div className="text-[12px] font-semibold uppercase tracking-wide text-text-soft-400">{label}</div>
      <div className="tnum mt-1 text-[22px] font-bold">{value}</div>
      {sub && <div className="mt-0.5 text-[12.5px] text-text-sub-600">{sub}</div>}
    </div>
  )
}

function ActivityCard({ where }: { where: Place }) {
  const { s } = useStore()
  const items = s.activity.filter((a) => a.where.includes(where)).slice().reverse()
  return (
    <Card title="Activity">
      <ol className="space-y-3 p-4">
        {items.map((a, i) => (
          <li key={a.id} className="flex gap-3">
            <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', i === 0 ? 'bg-brand-500' : 'bg-stroke-sub-300')} />
            <div className="min-w-0">
              <div className="text-[13.5px]">{a.text}</div>
              <div className="text-[12px] text-text-soft-400">
                {fmtDate(a.at)} · {a.who}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </Card>
  )
}

type DocReq = { kind: 'co'; id: string } | { kind: 'statement' } | null
function DocModal({ req, onClose }: { req: DocReq; onClose: () => void }) {
  const { s } = useStore()
  const [map, setMap] = useState(false)
  const co = req?.kind === 'co' ? s.cos.find((c) => c.id === req.id) : undefined
  return (
    <Modal wide open={!!req} onClose={onClose} title={req?.kind === 'statement' ? 'Contract Statement' : `Change Order #${co?.number ?? ''}`}>
      <div className="p-3">
        <label className="mb-2 flex items-center gap-2 text-[13px] font-semibold text-text-sub-600">
          <input type="checkbox" checked={map} onChange={(e) => setMap(e.target.checked)} className="accent-brand-500" /> Show where each field comes from
        </label>
        {req?.kind === 'statement' && <StatementDoc s={s} map={map} />}
        {co && <ChangeOrderDoc s={s} co={co} map={map} />}
        {map && <FieldLegend kind={req?.kind === 'statement' ? 'statement' : 'co'} />}
      </div>
    </Modal>
  )
}

/** Same numbers as the printable statement, as a web table. */
function StatementCard({ onOpen }: { onOpen: () => void }) {
  const { s, addPayment } = useStore()
  const st = statement(s)
  const [open, setOpen] = useState(false)
  const [amt, setAmt] = useState(0)
  const [method, setMethod] = useState<PayMethod>('Check')
  const [ref, setRef] = useState('')
  return (
    <Card
      title="Contract statement"
      icon={<Receipt size={14} />}
      right={
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
            <Plus size={14} /> Record payment
          </Button>
          <Button size="sm" variant="secondary" onClick={onOpen}>
            Printable
          </Button>
        </div>
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-[13px]">
          <thead>
            <tr className="border-b border-stroke-soft-200 text-left text-[11.5px] uppercase tracking-wide text-text-soft-400">
              <th className="px-4 py-2 font-semibold">Date</th>
              <th className="px-2 font-semibold">Description</th>
              <th className="px-2 text-right font-semibold">Contracts</th>
              <th className="px-2 text-right font-semibold">Payments</th>
              <th className="px-4 text-right font-semibold">Balance</th>
            </tr>
          </thead>
          <tbody>
            {st.rows.map((r, i) => (
              <tr key={i} className="border-b border-stroke-soft-200 last:border-b-0">
                <td className="tnum px-4 py-2 text-text-sub-600">{fmtDate(r.date)}</td>
                <td className="px-2">{r.desc}</td>
                <td className={cn('tnum px-2 text-right', (r.contract ?? 0) < 0 && 'text-state-error-base')}>{r.contract !== undefined ? paren(r.contract) : ''}</td>
                <td className="tnum px-2 text-right text-state-error-base">{r.payment !== undefined ? `(${money(r.payment)})` : ''}</td>
                <td className="tnum px-4 text-right font-medium">{money(r.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 border-t border-stroke-soft-200 bg-bg-soft-50 px-4 py-3 text-[13px] sm:grid-cols-5">
        <Tot k="Contract charges" v={money(st.charges)} />
        <Tot k="Change-order credits" v={paren(st.credits)} red={st.credits < 0} />
        <Tot k="Revised contract price" v={money(st.revised)} />
        <Tot k="Payments received" v={`(${money(st.paid)})`} red />
        <Tot k="Current balance" v={money(st.balance)} strong />
      </div>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Record payment"
        footer={
          <Button
            className="w-full"
            disabled={amt <= 0}
            onClick={() => {
              addPayment({ date: TODAY, label: 'Payment', amount: amt, method, ref: method === 'Check' && ref ? `Check #${ref}` : method, source: 'office' })
              setOpen(false)
              setAmt(0)
              setRef('')
            }}
          >
            Save payment
          </Button>
        }
      >
        <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-3">
          <Field label="Amount">
            <MoneyInput value={amt} onChange={setAmt} />
          </Field>
          <Field label="Form of payment">
            <select className={inputCls} value={method} onChange={(e) => setMethod(e.target.value as PayMethod)}>
              {(['Check', 'Credit Card', 'Cash', 'Financed', 'Other'] as PayMethod[]).map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </Field>
          {method === 'Check' && (
            <Field label="Check number">
              <input className={inputCls} value={ref} onChange={(e) => setRef(e.target.value)} />
            </Field>
          )}
        </div>
      </Modal>
    </Card>
  )
}

function Tot({ k, v, red, strong }: { k: string; v: string; red?: boolean; strong?: boolean }) {
  return (
    <div>
      <div className="text-[11.5px] text-text-soft-400">{k}</div>
      <div className={cn('tnum', red && 'text-state-error-base', strong && 'font-bold')}>{v}</div>
    </div>
  )
}

function ChangeOrderTable({ onOpen, showDraftNote }: { onOpen: (id: string) => void; showDraftNote?: boolean }) {
  const { s, go } = useStore()
  const c = s.contract
  const draft = draftCO(s)
  return (
    <div className="divide-y divide-stroke-soft-200">
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-500">
          <FileText size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-semibold">Quote {c.quoteId} · original contract</div>
          <div className="text-[12.5px] text-text-sub-600">Signed {fmtDate(c.signedAt)} by {c.customer.primary}</div>
        </div>
        <div className="tnum font-semibold">{money(c.total)}</div>
      </div>
      {signedCOs(s).map((co) => {
        const d = coTotal(co)
        return (
          <button key={co.id} type="button" onClick={() => onOpen(co.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-bg-weak-50">
            <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-lg', d < 0 ? 'bg-state-error-lighter text-state-error-base' : 'bg-state-success-lighter text-state-success-dark')}>
              {d < 0 ? <MinusCircle size={16} /> : <PlusCircle size={16} />}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 font-semibold">
                Change Order #{co.number}
                <Pill tone="ok" dot>
                  Signed {fmtDate(co.signedAt)}
                </Pill>
                <span className="text-[12px] font-normal text-text-soft-400">from quote {c.quoteId}</span>
              </div>
              <div className="truncate text-[12.5px] text-text-sub-600">{changeSummary(co)}</div>
            </div>
            <div className={cn('tnum font-semibold', d < 0 && 'text-state-error-base')}>{delta(d)}</div>
          </button>
        )
      })}
      {draft && (
        <button type="button" onClick={() => go({ name: 'co', coId: draft.id })} className="flex w-full items-center gap-3 px-4 py-3 text-left opacity-80 hover:bg-bg-weak-50">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-state-warning-lighter text-state-warning-dark">
            <FileText size={16} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 font-semibold">
              Change Order #{draft.number}
              <Pill tone="warn" dot>
                Draft on quote
              </Pill>
            </div>
            <div className="text-[12.5px] text-text-sub-600">{showDraftNote ? 'Not counted until the customer signs' : 'Waiting on the rep'}</div>
          </div>
          <div className="tnum text-text-soft-400">{delta(coTotal(draft))}</div>
        </button>
      )}
      <div className="flex items-center justify-between bg-bg-soft-50 px-4 py-3 font-bold">
        <span>Revised contract price</span>
        <span className="tnum">{money(contractValue(s))}</span>
      </div>
    </div>
  )
}

export function OpportunityPage() {
  const { s, setView, go } = useStore()
  const c = s.contract
  const [doc, setDoc] = useState<DocReq>(null)
  const cos = signedCOs(s)
  const coSum = cos.reduce((a, x) => a + coTotal(x), 0)
  return (
    <Shell active="Opportunities" crumbs={['Opportunities', c.opportunityName]}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[22px] font-bold">{c.opportunityName}</h1>
            <Pill tone="ok" dot>
              Won
            </Pill>
          </div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <Pill>{c.opportunityId}</Pill>
            <Pill>Owner · {c.rep}</Pill>
            <button type="button" onClick={() => setView('project')}>
              <Pill tone="blue">
                Project {c.projectId} <ArrowUpRight size={12} />
              </Pill>
            </button>
            <button type="button" onClick={() => go({ name: 'quote' })}>
              <Pill tone="brand">
                Quote {c.quoteId} <ArrowUpRight size={12} />
              </Pill>
            </button>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Kpi tone="brand" label="Opportunity value" value={money(contractValue(s))} sub={`Revised contract price · ${cos.length} signed change order${cos.length === 1 ? '' : 's'}`} />
        <Kpi label="Original contract" value={money(c.total)} sub={`Change orders ${delta(coSum)}`} />
        <Kpi label="Balance due" value={money(balance(s))} sub={`${money(paidTotal(s))} received`} />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card title="Quote & change orders" icon={<FileText size={14} />}>
            <ChangeOrderTable onOpen={(id) => setDoc({ kind: 'co', id })} showDraftNote />
          </Card>
          <StatementCard onOpen={() => setDoc({ kind: 'statement' })} />
        </div>
        <div className="space-y-4">
          <Card title="Customer">
            <div className="space-y-1 p-4 text-[13.5px]">
              <div className="font-semibold">{c.customer.names}</div>
              <div className="text-text-sub-600">
                {c.customer.street}, {c.customer.city}, {c.customer.state} {c.customer.zip}
              </div>
              <div className="text-text-sub-600">{c.customer.phone}</div>
              <div className="text-text-sub-600">{c.customer.email}</div>
            </div>
          </Card>
          <ActivityCard where="opportunity" />
        </div>
      </div>
      <DocModal req={doc} onClose={() => setDoc(null)} />
    </Shell>
  )
}

export function ProjectPage() {
  const { s, setView } = useStore()
  const c = s.contract
  const [doc, setDoc] = useState<DocReq>(null)
  const cos = signedCOs(s)
  const coSum = cos.reduce((a, x) => a + coTotal(x), 0)
  const draft = draftCO(s)
  const end = expectedEnd(s)
  const shift = daysBetween(c.completion, end)
  const value = contractValue(s)
  const paid = paidTotal(s)
  const pctPaid = value > 0 ? Math.min(100, (paid / value) * 100) : 0
  const pctOrig = value > 0 ? Math.min(100, (c.total / Math.max(value, c.total)) * 100) : 100
  return (
    <Shell active="Projects" crumbs={['Projects', `${c.projectId} · ${c.projectName}`, 'Finance']}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[22px] font-bold">
              {c.projectId} · {c.projectName}
            </h1>
            <Pill tone="blue" dot>
              Scheduled
            </Pill>
          </div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <button type="button" onClick={() => setView('opportunity')}>
              <Pill>
                From {c.opportunityId} <ArrowUpRight size={12} />
              </Pill>
            </button>
            <Pill>Quote {c.quoteId}</Pill>
          </div>
        </div>
      </div>
      <div className="flex gap-1 overflow-x-auto border-b border-stroke-soft-200 no-scrollbar">
        {['Overview', 'Schedule', 'BOM', 'Finance', 'Files', 'Daily Log'].map((t) => (
          <span key={t} className={cn('shrink-0 border-b-2 px-3 py-2 text-[13.5px] font-semibold', t === 'Finance' ? 'border-brand-500 text-brand-500' : 'border-transparent text-text-soft-400')}>
            {t}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi tone="brand" label="Contract value" value={money(value)} sub={`Original ${money(c.total)} + change orders ${delta(coSum)}`} />
        <Kpi label="Collected" value={money(paid)} sub={`${s.payments.length} payments`} />
        <Kpi label="Balance due" value={money(balance(s))} />
        <Kpi label="Expected end" value={fmtDate(end)} sub={shift ? `${shift > 0 ? '+' : ''}${shift} days from change orders` : 'As contracted'} />
      </div>

      <Card title="Money spine" icon={<Wallet size={14} />}>
        <div className="space-y-3 p-4">
          <div>
            <div className="mb-1 flex justify-between text-[12.5px] text-text-sub-600">
              <span>Contract value</span>
              <span className="tnum">{money(value)}</span>
            </div>
            <div className="flex h-3 overflow-hidden rounded-full bg-bg-weak-50">
              <div className="bg-brand-500" style={{ width: `${pctOrig}%` }} title="Original contract" />
              {coSum > 0 && <div className="bg-brand-300" style={{ width: `${100 - pctOrig}%` }} title="Change orders" />}
            </div>
            <div className="mt-1 flex gap-4 text-[12px] text-text-sub-600">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-brand-500" /> Original {money(c.total)}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-brand-300" /> Change orders {delta(coSum)}
              </span>
            </div>
          </div>
          <div>
            <div className="mb-1 flex justify-between text-[12.5px] text-text-sub-600">
              <span>Collected</span>
              <span className="tnum">
                {money(paid)} of {money(value)}
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-bg-weak-50">
              <div className="h-full bg-state-success-base" style={{ width: `${pctPaid}%` }} />
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card
            title={
              <span className="normal-case tracking-normal">
                Change orders · <span className="text-text-strong-950">{delta(coSum)} signed</span> · {money(draft ? Math.abs(coTotal(draft)) : 0)} waiting
              </span>
            }
            icon={<FileText size={14} />}
          >
            <div className="divide-y divide-stroke-soft-200">
              {cos.map((co) => {
                const d = coTotal(co)
                return (
                  <button key={co.id} type="button" onClick={() => setDoc({ kind: 'co', id: co.id })} className="grid w-full grid-cols-[1fr_auto] items-center gap-3 px-4 py-3 text-left hover:bg-bg-weak-50 sm:grid-cols-[1fr_auto_auto]">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 font-semibold">
                        Change Order #{co.number}
                        <Pill tone="ok" dot>
                          Signed by customer
                        </Pill>
                      </div>
                      <div className="text-[12.5px] text-text-sub-600">
                        From quote {c.quoteId} · {fmtDate(co.signedAt)} · {changes(co).length} changes
                      </div>
                    </div>
                    <div className="hidden text-[12.5px] text-text-sub-600 sm:block">
                      <CalendarDays size={13} className="mr-1 inline" />
                      {co.schedule === 'remain' ? 'Schedule unchanged' : `End → ${fmtDate(co.newCompletion)}`}
                    </div>
                    <div className={cn('tnum text-right font-semibold', d < 0 && 'text-state-error-base')}>{delta(d)}</div>
                  </button>
                )
              })}
              {draft && (
                <div className="flex items-center justify-between gap-3 px-4 py-3 text-[13px] text-text-sub-600">
                  <span>
                    Change Order #{draft.number} · <Pill tone="warn">Draft on quote</Pill> · not counted until the customer signs
                  </span>
                  <span className="tnum">{delta(coTotal(draft))}</span>
                </div>
              )}
              {cos.length === 0 && !draft && <div className="px-4 py-4 text-[13px] text-text-sub-600">No change orders.</div>}
            </div>
          </Card>
          <StatementCard onOpen={() => setDoc({ kind: 'statement' })} />
        </div>
        <ActivityCard where="project" />
      </div>
      <DocModal req={doc} onClose={() => setDoc(null)} />
    </Shell>
  )
}
