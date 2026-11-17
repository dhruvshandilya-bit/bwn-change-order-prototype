import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronRight,
  Droplets,
  FileText,
  Lock,
  Mail,
  MinusCircle,
  Pencil,
  Plus,
  PlusCircle,
  Receipt,
  RotateCcw,
  Search,
  Trash2,
  Hand,
  Briefcase,
  FolderKanban,
  CalendarDays,
  Wallet,
  ListChecks,
} from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useStore } from '@/lib/store'
import { CATALOG, OTHER_QUOTES, SECTIONS, TODAY, catalogSel, uid } from '@/lib/seed'
import {
  coSubtotal,
  coTotal,
  contractValue,
  changes,
  changeSummary,
  currentScope,
  defaultDue,
  delta,
  draftCO,
  expectedEnd,
  fmtDate,
  money,
  paren,
  prevCOTotal,
  qtyUnit,
  revisedWith,
  round2,
  selsTotal,
  signedCOs,
} from '@/lib/logic'
import type { ChangeOrder, PayMethod, Schedule, Sel, Unit } from '@/lib/types'
import { Button, Card, Field, Modal, MoneyInput, Pill, Segmented, SigView, SignaturePad, Stepper, Tag, cn, inputCls } from '@/components/ui'
import { ChangeOrderDoc, FieldLegend, StatementDoc } from '@/docs/Docs'

/* ───────────────────────── shell pieces ───────────────────────── */

function AppBar({ title, sub, onBack, right }: { title: ReactNode; sub?: ReactNode; onBack?: () => void; right?: ReactNode }) {
  return (
    <div className="flex items-center gap-2 border-b border-stroke-soft-200 bg-white px-3 py-2.5">
      {onBack && (
        <button type="button" aria-label="Back" onClick={onBack} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-text-strong-950 hover:bg-bg-weak-50">
          <ArrowLeft size={20} />
        </button>
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[16px] font-bold">{title}</div>
        {sub && <div className="truncate text-[12px] text-text-sub-600">{sub}</div>}
      </div>
      {right}
    </div>
  )
}

function Body({ children }: { children: ReactNode }) {
  return <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3 sm:p-4">{children}</div>
}

function BottomBar({ children }: { children: ReactNode }) {
  return <div className="flex gap-2 border-t border-stroke-soft-200 bg-white p-3">{children}</div>
}

const STEPS = ['Build', 'Review', 'Sign', 'Done']
function FlowSteps({ at }: { at: number }) {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto rounded-xl bg-white px-3 py-2 ring-1 ring-stroke-soft-200 no-scrollbar">
      {STEPS.map((st, i) => (
        <div key={st} className="flex shrink-0 items-center gap-1.5">
          <span className={cn('grid h-5 w-5 place-items-center rounded-full text-[11px] font-bold', i < at ? 'bg-state-success-base text-white' : i === at ? 'bg-brand-500 text-white' : 'bg-bg-weak-50 text-text-soft-400 ring-1 ring-stroke-soft-200')}>
            {i < at ? <Check size={12} /> : i + 1}
          </span>
          <span className={cn('text-[12.5px] font-semibold', i === at ? 'text-brand-500' : 'text-text-sub-600')}>{st}</span>
          {i < STEPS.length - 1 && <span className="mx-1 h-px w-5 bg-stroke-sub-300" />}
        </div>
      ))}
    </div>
  )
}

function Kv({ k, v, tag, sub }: { k: ReactNode; v: ReactNode; tag?: string; sub?: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-wide text-text-soft-400">
        {tag && <Tag l={tag} />}
        {k}
      </div>
      <div className="tnum mt-0.5 truncate text-[15px] font-semibold">{v}</div>
      {sub && <div className="truncate text-[12px] text-text-sub-600">{sub}</div>}
    </div>
  )
}

type DocReq = { kind: 'co'; id: string } | { kind: 'statement' } | null

function DocModal({ req, onClose }: { req: DocReq; onClose: () => void }) {
  const { s } = useStore()
  const [map, setMap] = useState(false)
  const co = req?.kind === 'co' ? s.cos.find((c) => c.id === req.id) : undefined
  return (
    <Modal
      contained
      wide
      open={!!req}
      onClose={onClose}
      title={req?.kind === 'statement' ? 'Contract Statement' : `Change Order #${co?.number ?? ''}${co?.status === 'signed' ? ' · signed' : ''}`}
    >
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

/* ───────────────────────── screens ───────────────────────── */

export function RepApp() {
  const { s } = useStore()
  const sc = s.screen
  const co = 'coId' in sc ? s.cos.find((c) => c.id === sc.coId) : undefined
  return (
    <div className="relative flex h-full flex-col bg-[#f5f4f7]">
      {sc.name === 'list' && <QuotesList />}
      {sc.name === 'quote' && <SignedQuote />}
      {sc.name === 'co' && co && <Builder co={co} />}
      {sc.name === 'preview' && co && <Preview co={co} />}
      {sc.name === 'sign' && co && <Sign co={co} />}
      {sc.name === 'done' && co && <Done co={co} />}
      {'coId' in sc && !co && <SignedQuote />}
    </div>
  )
}

function QuotesList() {
  const { s, go } = useStore()
  const c = s.contract
  const [note, setNote] = useState('')
  return (
    <>
      <AppBar
        title="Quotes"
        right={
          <Button size="sm" onClick={() => setNote('Change orders start from a signed quote. Open BWN-1042 to try it.')}>
            <Plus size={15} /> New Quote
          </Button>
        }
      />
      <Body>
        <div className="flex h-10 items-center gap-2 rounded-xl bg-white px-3 ring-1 ring-stroke-soft-200">
          <Search size={16} className="text-text-soft-400" />
          <span className="text-[14px] text-text-soft-400">Search quotes, customers, addresses</span>
        </div>
        {note && <div className="rounded-xl bg-brand-50 px-3 py-2 text-[13px] text-brand-500">{note}</div>}
        <button type="button" onClick={() => go({ name: 'quote' })} className="block w-full rounded-2xl bg-white p-4 text-left ring-2 ring-brand-200 transition hover:ring-brand-400">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <Pill tone="brand">#{c.quoteId}</Pill>
                <Pill tone="ok" dot>
                  Contract signed
                </Pill>
              </div>
              <div className="mt-2 text-[16px] font-bold">{c.customer.names}</div>
              <div className="text-[13px] text-text-sub-600">
                {c.customer.street}, {c.customer.city}, {c.customer.state} {c.customer.zip}
              </div>
              <div className="mt-1 text-[12.5px] text-text-soft-400">
                {currentScope(s).length} items · signed {fmtDate(c.signedAt)} · {c.rep}
              </div>
            </div>
            <div className="text-right">
              <div className="tnum text-[17px] font-bold">{money(contractValue(s))}</div>
              <div className="text-[12px] text-text-sub-600">revised contract</div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-stroke-soft-200 pt-3">
            <span className="text-[12px] font-semibold text-text-sub-600">Change orders</span>
            {s.cos
              .slice()
              .sort((a, b) => a.number - b.number)
              .map((co) => (
                <Pill key={co.id} tone={co.status === 'signed' ? 'ok' : 'warn'}>
                  CO #{co.number} · {co.status === 'signed' ? 'Signed' : 'Draft'} · {delta(coTotal(co))}
                </Pill>
              ))}
          </div>
        </button>
        {OTHER_QUOTES.map((q) => (
          <div key={q.id} className="flex items-start justify-between gap-3 rounded-2xl bg-white p-4 opacity-70 ring-1 ring-stroke-soft-200">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <Pill>#{q.id}</Pill>
                <Pill tone={q.status === 'Signed' ? 'ok' : q.status === 'Sent' ? 'blue' : 'neutral'} dot>
                  {q.status}
                </Pill>
              </div>
              <div className="mt-2 font-semibold">{q.name}</div>
              <div className="text-[13px] text-text-sub-600">{q.addr}</div>
              <div className="mt-1 text-[12.5px] text-text-soft-400">{q.items} items</div>
            </div>
            <div className="tnum font-semibold">{money(q.total)}</div>
          </div>
        ))}
      </Body>
    </>
  )
}

function SignedQuote() {
  const { s, go, startCO } = useStore()
  const c = s.contract
  const draft = draftCO(s)
  const signed = signedCOs(s)
  const [doc, setDoc] = useState<DocReq>(null)
  const end = expectedEnd(s)
  const all = s.cos.slice().sort((a, b) => a.number - b.number)
  const scope = currentScope(s)
  const orig = new Map(c.sels.map((x) => [x.key, x]))
  const gone = c.sels.filter((x) => !scope.some((y) => y.key === x.key))
  const sections = sortSections([...scope, ...gone].map((x) => x.section))
  return (
    <>
      <AppBar onBack={() => go({ name: 'list' })} title={`Quote #${c.quoteId}`} sub={c.customer.names} right={<Pill tone="ok" dot>Contract signed</Pill>} />
      <Body>
        <div className="flex items-start gap-3 rounded-2xl bg-white p-4 ring-1 ring-stroke-soft-200">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-50 text-[14px] font-bold text-brand-500">DW</div>
          <div className="min-w-0 flex-1">
            <div className="text-[16px] font-bold">{c.customer.names}</div>
            <div className="text-[13px] text-text-sub-600">
              {c.customer.street}, {c.customer.city}, {c.customer.state} {c.customer.zip} · {c.customer.county} County
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Pill tone="brand">#{c.quoteId}</Pill>
              <Pill>Post-1978</Pill>
              <Pill>Rep · {c.rep}</Pill>
            </div>
          </div>
        </div>

        <Card title="Original contract" icon={<Lock size={14} />} right={<span className="flex items-center gap-1.5 text-[12.5px] text-text-sub-600"><Tag l="H" /> Signed {fmtDate(c.signedAt)}</span>}>
          <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-3">
            <Kv k="Total price" tag="A" v={money(c.total)} />
            <Kv k="Deposit" tag="B" v={money(c.deposit)} sub={c.depositRef} />
            <Kv k="Balance due" tag="C" v={money(c.total - c.deposit)} />
            <Kv k="Approx. start" v={fmtDate(c.start)} />
            <Kv k="Approx. completion" v={fmtDate(end)} sub={end !== c.completion ? `Moved from ${fmtDate(c.completion)} by a change order` : undefined} />
          </div>
          <div className="mx-4 mb-4 flex items-start gap-2 rounded-xl bg-bg-weak-50 px-3 py-2 text-[12.5px] text-text-sub-600">
            <Lock size={14} className="mt-0.5 shrink-0" /> This contract is signed and locked. Any change to scope or price goes on a change order below.
          </div>
        </Card>

        <Card title="Change orders" icon={<ListChecks size={14} />} className="ring-2 ring-brand-100" right={<Pill tone="brand">{all.length}</Pill>}>
          <div className="divide-y divide-stroke-soft-200">
            {all.length === 0 && <div className="px-4 py-4 text-[13px] text-text-sub-600">No change orders yet.</div>}
            {all.map((co) => (
              <button
                key={co.id}
                type="button"
                onClick={() => (co.status === 'signed' ? setDoc({ kind: 'co', id: co.id }) : go({ name: 'co', coId: co.id }))}
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-bg-weak-50"
              >
                <div className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-lg', coTotal(co) < 0 ? 'bg-state-error-lighter text-state-error-base' : 'bg-state-success-lighter text-state-success-dark')}>
                  {coTotal(co) < 0 ? <MinusCircle size={18} /> : <PlusCircle size={18} />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 font-semibold">
                    Change Order #{co.number}
                    <Pill tone={co.status === 'signed' ? 'ok' : 'warn'} dot>
                      {co.status === 'signed' ? `Signed ${fmtDate(co.signedAt)}` : 'Draft · not signed'}
                    </Pill>
                  </div>
                  <div className="truncate text-[12.5px] text-text-sub-600">{changeSummary(co)}</div>
                </div>
                <div className={cn('tnum shrink-0 text-right font-semibold', coTotal(co) < 0 && 'text-state-error-base')}>{delta(coTotal(co))}</div>
                <ChevronRight size={16} className="shrink-0 text-text-soft-400" />
              </button>
            ))}
          </div>
          <div className="space-y-1.5 border-t border-stroke-soft-200 bg-bg-soft-50 px-4 py-3 text-[13.5px]">
            <div className="flex justify-between">
              <span className="text-text-sub-600">Original contract</span>
              <span className="tnum">{money(c.total)}</span>
            </div>
            {signed.map((co) => (
              <div key={co.id} className="flex justify-between">
                <span className="text-text-sub-600">Change Order #{co.number}</span>
                <span className={cn('tnum', coTotal(co) < 0 && 'text-state-error-base')}>{delta(coTotal(co))}</span>
              </div>
            ))}
            <div className="flex justify-between border-t border-stroke-soft-200 pt-1.5 font-bold">
              <span>Revised contract price</span>
              <span className="tnum">{money(contractValue(s))}</span>
            </div>
            {draft && <div className="text-[12px] text-state-warning-dark">Change Order #{draft.number} is a draft. It counts once the customer signs.</div>}
          </div>
          <div className="p-4 pt-3">
            <Button size="lg" className="w-full" onClick={() => startCO()}>
              {draft ? (
                <>
                  <Pencil size={17} /> Continue Change Order #{draft.number}
                </>
              ) : (
                <>
                  <Plus size={18} /> Create Change Order
                </>
              )}
            </Button>
            <div className="mt-2 text-center text-[12px] text-text-soft-400">Customer, address, contract date, price, deposit and balance fill in from this contract.</div>
          </div>
        </Card>

        <Card title="Documents" icon={<FileText size={14} />}>
          <div className="divide-y divide-stroke-soft-200">
            <DocRow icon={<FileText size={16} />} title={`Signed contract · ${c.quoteId}.pdf`} sub={`Scope of work + payment schedule · ${fmtDate(c.signedAt)}`} />
            {signed.map((co) => (
              <DocRow key={co.id} icon={<FileText size={16} />} title={`Change Order #${co.number} · signed.pdf`} sub={`${fmtDate(co.signedAt)} · ${delta(coTotal(co))}`} onClick={() => setDoc({ kind: 'co', id: co.id })} />
            ))}
            <DocRow icon={<Receipt size={16} />} title="Contract statement" sub="Every charge, credit and payment on this contract" onClick={() => setDoc({ kind: 'statement' })} />
          </div>
        </Card>

        <Card
          title={signed.length ? 'Scope of work · current contract' : 'Scope of work · as signed'}
          icon={<Droplets size={14} />}
          right={signed.length ? <span className="text-[12px] text-text-soft-400">Includes {signed.map((x) => `CO #${x.number}`).join(', ')}</span> : undefined}
        >
          <div className="divide-y divide-stroke-soft-200">
            {sections.map((sec) => (
              <div key={sec} className="px-4 py-3">
                <div className="mb-1.5 text-[11.5px] font-bold tracking-wide text-text-soft-400">{sec}</div>
                {[...scope, ...gone]
                  .filter((x) => x.section === sec)
                  .map((x) => {
                    const o = orig.get(x.key)
                    const out = gone.includes(x)
                    return (
                      <div key={x.key} className="flex items-center justify-between gap-3 py-1 text-[13.5px]">
                        <span className={cn('truncate', out && 'text-text-soft-400 line-through')}>{x.name}</span>
                        <span className="flex shrink-0 items-center gap-1.5">
                          {!o && <Pill tone="ok">Added by change order</Pill>}
                          {out && <Pill tone="error">Removed by change order</Pill>}
                          {o && !out && o.qty !== x.qty && <span className="text-[11.5px] text-text-soft-400">was {qtyUnit(o.qty, o.unit)}</span>}
                          {!out && <span className="rounded-md bg-bg-weak-50 px-1.5 text-[12px] font-semibold text-text-sub-600">{qtyUnit(x.qty, x.unit)}</span>}
                        </span>
                      </div>
                    )
                  })}
              </div>
            ))}
          </div>
        </Card>
      </Body>
      <DocModal req={doc} onClose={() => setDoc(null)} />
    </>
  )
}

function DocRow({ icon, title, sub, onClick }: { icon: ReactNode; title: string; sub: string; onClick?: () => void }) {
  return (
    <button type="button" disabled={!onClick} onClick={onClick} className="flex w-full items-center gap-3 px-4 py-3 text-left enabled:hover:bg-bg-weak-50 disabled:cursor-default">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-state-error-lighter text-state-error-base">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">{title}</span>
        <span className="block truncate text-[12.5px] text-text-sub-600">{sub}</span>
      </span>
      {onClick && <span className="text-[13px] font-semibold text-brand-500">View</span>}
    </button>
  )
}

/* ───────────── builder ───────────── */

const sortSections = (names: string[]) =>
  [...new Set(names)].sort((a, b) => (SECTIONS as readonly string[]).indexOf(a) - (SECTIONS as readonly string[]).indexOf(b))

function Builder({ co }: { co: ChangeOrder }) {
  const { s, go, patchCO, patchSel, dropSel, deleteCO } = useStore()
  const [sheet, setSheet] = useState<null | 'catalog' | 'custom'>(null)
  const [editTotal, setEditTotal] = useState(false)
  const [onlyChanges, setOnlyChanges] = useState(false)
  const c = s.contract
  const before = selsTotal(co.sels, true)
  const after = selsTotal(co.sels)
  const sub = coSubtotal(co)
  const d = coTotal(co)
  const prev = prevCOTotal(s, co)
  const e = revisedWith(s, co)
  const list = changes(co)
  const shown = onlyChanges ? co.sels.filter((x) => x.qty !== x.baseQty) : co.sels
  const sections = sortSections(shown.map((x) => x.section))

  // "F" follows the default until the rep types their own amount. A net credit owes nothing.
  useEffect(() => {
    const want = d <= 0 ? 0 : co.dueTouched ? co.dueOnSigning : defaultDue(d)
    if (want !== co.dueOnSigning) patchCO(co.id, { dueOnSigning: want, ...(d <= 0 ? { dueTouched: false } : {}) })
  }, [d, co.dueTouched, co.dueOnSigning, co.id, patchCO])

  return (
    <>
      <AppBar
        onBack={() => go({ name: 'quote' })}
        title={`Change Order #${co.number}`}
        sub={`Draft · copy of quote ${c.quoteId} selections`}
        right={
          <button type="button" aria-label="Delete draft" onClick={() => deleteCO(co.id)} className="grid h-9 w-9 place-items-center rounded-lg text-text-sub-600 hover:bg-state-error-lighter hover:text-state-error-base">
            <Trash2 size={18} />
          </button>
        }
      />
      <Body>
        <FlowSteps at={0} />

        <Card title="From the original contract · auto-filled" icon={<Lock size={14} />}>
          <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
            <Kv k="Name" v={c.customer.names} />
            <Kv k="Job address" v={`${c.customer.street}, ${c.customer.city}`} sub={`${c.customer.county} County · ${c.customer.state} ${c.customer.zip}`} />
            <Kv k="Contract dated" tag="H" v={fmtDate(c.signedAt)} />
            <Kv k="Change order date" v={fmtDate(co.createdAt)} />
          </div>
          <div className="grid grid-cols-1 gap-4 border-t border-stroke-soft-200 bg-bg-soft-50 p-4 sm:grid-cols-3">
            <Kv k="Original price" tag="A" v={money(c.total)} />
            <Kv k="Original deposit" tag="B" v={money(c.deposit)} />
            <Kv k="Original balance" tag="C" v={money(c.total - c.deposit)} />
          </div>
        </Card>

        <Card
          title={`Selections · copied from quote ${c.quoteId}`}
          icon={<Droplets size={14} />}
          right={<Pill tone={list.length ? 'brand' : 'neutral'}>{list.length} change{list.length === 1 ? '' : 's'}</Pill>}
        >
          <div className="grid grid-cols-3 gap-3 border-b border-stroke-soft-200 bg-bg-soft-50 px-4 py-3">
            <Kv k="Before" v={money(before)} sub="On the contract today" />
            <Kv k="After" v={money(after)} sub="With your edits" />
            <Kv k="Difference" tag="D" v={<span className={cn(sub < 0 && 'text-state-error-base', sub > 0 && 'text-state-success-dark')}>{delta(sub)}</span>} sub="Change order amount" />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
            <span className="text-[12.5px] text-text-sub-600">Change a quantity, remove an item, or add one. Unchanged items stay as signed.</span>
            <label className="flex items-center gap-2 text-[12.5px] font-semibold text-text-sub-600">
              <input type="checkbox" checked={onlyChanges} onChange={(ev) => setOnlyChanges(ev.target.checked)} className="accent-brand-500" /> Show changes only
            </label>
          </div>
          {onlyChanges && list.length === 0 && <div className="px-4 pb-4 text-[13px] text-text-soft-400">No changes yet.</div>}
          {sections.map((sec) => (
            <div key={sec} className="border-t border-stroke-soft-200">
              <div className="bg-bg-soft-50 px-4 py-2 text-[11.5px] font-bold tracking-wide text-text-sub-600">{sec}</div>
              {shown
                .filter((x) => x.section === sec)
                .map((x) => (
                  <SelRow
                    key={x.key}
                    x={x}
                    onQty={(q) => patchSel(co.id, x.key, { qty: q })}
                    onDrop={() => dropSel(co.id, x.key)}
                    onRestore={() => patchSel(co.id, x.key, { qty: x.baseQty })}
                  />
                ))}
            </div>
          ))}
          <div className="grid grid-cols-1 gap-2 border-t border-stroke-soft-200 p-3 sm:grid-cols-2">
            <Button variant="secondary" onClick={() => setSheet('catalog')}>
              <PlusCircle size={16} /> Add item from catalog
            </Button>
            <Button variant="outline" onClick={() => setSheet('custom')}>
              <Pencil size={15} /> Custom item
            </Button>
          </div>
        </Card>

        <Card title="Project schedule" icon={<CalendarDays size={14} />}>
          <div className="space-y-3 p-4">
            <div className="text-[13px] text-text-sub-600">The changes may alter the completion date. Pick one for the form.</div>
            <Segmented<Schedule>
              value={co.schedule}
              onChange={(v) => patchCO(co.id, { schedule: v, newCompletion: v === 'remain' ? undefined : co.newCompletion ?? expectedEnd(s) })}
              options={[
                { value: 'increase', label: 'Increase' },
                { value: 'decrease', label: 'Decrease' },
                { value: 'remain', label: 'Remain' },
              ]}
            />
            {co.schedule !== 'remain' && (
              <Field label="New approx. completion date" hint={`Currently ${fmtDate(expectedEnd(s))}. Updates the approx. completion date on the quote when signed.`}>
                <input type="date" className={cn(inputCls, 'max-w-[220px]')} value={co.newCompletion ?? expectedEnd(s)} onChange={(ev) => patchCO(co.id, { newCompletion: ev.target.value })} />
              </Field>
            )}
          </div>
        </Card>

        <Card title="Change order total" icon={<Wallet size={14} />}>
          <div className="space-y-2.5 p-4 text-[14px]">
            <Row k="Selections before" v={money(before)} muted />
            <Row k="Selections after" v={money(after)} muted />
            <Row k="Difference · auto (after − before)" v={delta(sub)} muted />
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 font-semibold">
                <Tag l="D" /> Final · this change order
              </span>
              {editTotal ? (
                <span className="flex items-center gap-2">
                  <MoneyInput ariaLabel="Change order total" className="w-36" value={d} onChange={(v) => patchCO(co.id, { override: v === sub ? undefined : v })} />
                  <Button size="sm" variant="outline" onClick={() => setEditTotal(false)}>
                    Done
                  </Button>
                </span>
              ) : (
                <button type="button" onClick={() => setEditTotal(true)} className={cn('tnum inline-flex items-center gap-1.5 text-[16px] font-bold', d < 0 && 'text-state-error-base')}>
                  {paren(d)} <Pencil size={13} className="text-text-soft-400" />
                </button>
              )}
            </div>
            {co.override !== undefined && (
              <div className="flex items-center justify-between text-[12.5px] text-state-warning-dark">
                <span>Δ override (office report): {delta(round2(co.override - sub))}</span>
                <button type="button" className="inline-flex items-center gap-1 font-semibold" onClick={() => patchCO(co.id, { override: undefined })}>
                  <RotateCcw size={12} /> Reset
                </button>
              </div>
            )}
            <label className="flex items-center gap-2 text-[12.5px] text-text-sub-600">
              <input type="checkbox" checked={!!co.showAmounts} onChange={(ev) => patchCO(co.id, { showAmounts: ev.target.checked })} className="accent-brand-500" />
              Print each item's difference on the form (off: only the total, like the quote)
            </label>
            <div className="space-y-1.5 border-t border-stroke-soft-200 pt-2.5">
              <Row k={<><Tag l="A" /> Original contract</>} v={money(c.total)} muted />
              <Row k="Previous change orders" v={prev ? delta(prev) : '—'} muted />
              <Row k={<><Tag l="D" /> This change order</>} v={delta(d)} muted />
              <Row k={<><Tag l="E" /> Revised total contract price</>} v={money(e)} strong />
            </div>
            <div className="space-y-3 border-t border-stroke-soft-200 pt-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 font-semibold">
                  <Tag l="F" /> Payment due upon signing
                </span>
                {d > 0 ? (
                  <MoneyInput ariaLabel="Payment due upon signing" className="w-36" value={co.dueOnSigning} onChange={(v) => patchCO(co.id, { dueOnSigning: Math.min(v, d), dueTouched: true })} />
                ) : (
                  <span className="tnum font-bold">{money(0)}</span>
                )}
              </div>
              <div className="text-[12px] text-text-soft-400">
                {d > 0 ? 'Defaults to 30% rounded to $100, like the quote deposit. Edit to match what you collect today.' : 'This change order lowers the price, so nothing is due at signing. The credit lowers the balance.'}
              </div>
              {co.dueOnSigning > 0 && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Form of payment">
                    <select className={inputCls} value={co.payMethod} onChange={(ev) => patchCO(co.id, { payMethod: ev.target.value as PayMethod })}>
                      {(['Check', 'Credit Card', 'Cash', 'Financed', 'Other'] as PayMethod[]).map((m) => (
                        <option key={m}>{m}</option>
                      ))}
                    </select>
                  </Field>
                  {co.payMethod === 'Check' && (
                    <Field label="Check number">
                      <input className={inputCls} value={co.checkNo} placeholder="e.g. 4021" onChange={(ev) => patchCO(co.id, { checkNo: ev.target.value })} />
                    </Field>
                  )}
                </div>
              )}
            </div>
          </div>
        </Card>
      </Body>
      <BottomBar>
        <Button variant="outline" className="flex-1" onClick={() => setSheet('catalog')}>
          <Plus size={16} /> Add Line Item
        </Button>
        <Button className="flex-1" disabled={list.length === 0 && co.override === undefined} onClick={() => go({ name: 'preview', coId: co.id })}>
          Preview Change Order <ChevronRight size={16} />
        </Button>
      </BottomBar>
      <AddSheet co={co} tab={sheet} onTab={setSheet} onClose={() => setSheet(null)} />
    </>
  )
}

function Row({ k, v, muted, strong }: { k: ReactNode; v: ReactNode; muted?: boolean; strong?: boolean }) {
  return (
    <div className={cn('flex items-center justify-between gap-3', strong && 'text-[15px] font-bold')}>
      <span className={cn('flex items-center gap-1.5', muted && 'text-text-sub-600')}>{k}</span>
      <span className="tnum">{v}</span>
    </div>
  )
}

/** One copied selection: quantity on the contract vs. after this change order, and the money difference. */
function SelRow({ x, onQty, onDrop, onRestore }: { x: Sel; onQty: (q: number) => void; onDrop: () => void; onRestore: () => void }) {
  const d = round2(x.qty - x.baseQty)
  const isNew = x.baseQty === 0
  const removed = !isNew && x.qty === 0
  const amt = round2(d * x.price)
  return (
    <div className={cn('flex gap-3 border-t border-stroke-soft-200 px-4 py-3', amt > 0 && 'bg-state-success-lighter/50', amt < 0 && 'bg-state-error-lighter/50')}>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5 font-semibold">
          <span className={cn(removed && 'text-text-soft-400 line-through')}>{x.name}</span>
          {isNew && <Pill tone="ok">New</Pill>}
          {removed && <Pill tone="error">Removed</Pill>}
          {!isNew && !removed && d !== 0 && (
            <Pill tone={d > 0 ? 'ok' : 'error'}>
              {d > 0 ? '+' : '−'}
              {qtyUnit(Math.abs(d), x.unit)}
            </Pill>
          )}
          {x.kind === 'custom' && <Pill>Custom</Pill>}
        </div>
        <div className="mt-0.5 line-clamp-2 text-[12.5px] text-text-sub-600">
          {isNew ? x.description || `${money(x.price)}/${x.unit}` : `On contract ${qtyUnit(x.baseQty, x.unit)} · ${money(Math.abs(x.price))}/${x.unit}`}
        </div>
        {x.coNote && <div className="mt-0.5 text-[12.5px] italic text-text-sub-600">{x.coNote}</div>}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        {removed ? (
          <Button size="sm" variant="outline" onClick={onRestore}>
            <RotateCcw size={13} /> Restore
          </Button>
        ) : (
          <Stepper value={x.qty} unit={x.unit} step={x.unit === 'LF' ? 5 : 1} onChange={onQty} />
        )}
        <div className={cn('tnum text-[13.5px]', amt === 0 ? 'text-text-soft-400' : 'font-semibold', amt < 0 && 'text-state-error-base', amt > 0 && 'text-state-success-dark')}>
          {amt === 0 ? 'No change' : delta(amt)}
        </div>
      </div>
      {removed ? (
        <span className="w-8 shrink-0" />
      ) : (
        <button
          type="button"
          aria-label={isNew ? 'Take off this new item' : 'Remove from contract'}
          title={isNew ? 'Take off this new item' : 'Remove from contract'}
          onClick={onDrop}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-text-soft-400 hover:bg-state-error-lighter hover:text-state-error-base"
        >
          <Trash2 size={16} />
        </button>
      )}
    </div>
  )
}

/* ───────────── add-line sheet ───────────── */

function AddSheet({ co, tab, onTab, onClose }: { co: ChangeOrder; tab: null | 'catalog' | 'custom'; onTab: (t: 'catalog' | 'custom') => void; onClose: () => void }) {
  return (
    <Modal contained wide open={!!tab} onClose={onClose} title={`Add to Change Order #${co.number}`}>
      <div className="border-b border-stroke-soft-200 px-4 py-3">
        <Segmented
          value={tab ?? 'catalog'}
          onChange={onTab}
          options={[
            { value: 'catalog', label: 'Catalog' },
            { value: 'custom', label: 'Custom item' },
          ]}
        />
      </div>
      {tab === 'catalog' && <CatalogTab co={co} onDone={onClose} />}
      {tab === 'custom' && <CustomTab co={co} onDone={onClose} />}
    </Modal>
  )
}

function CatalogTab({ co, onDone }: { co: ChangeOrder; onDone: () => void }) {
  const { addSel } = useStore()
  const [sec, setSec] = useState<string>('All')
  const [open, setOpen] = useState<string | null>(null)
  const [qty, setQty] = useState(1)
  const [note, setNote] = useState('')
  const items = CATALOG.filter((c) => sec === 'All' || c.section === sec)
  return (
    <div>
      <div className="flex gap-1.5 overflow-x-auto px-4 py-3 no-scrollbar">
        {['All', ...SECTIONS.filter((x) => x !== 'ADDITIONAL WORK')].map((x) => (
          <button key={x} type="button" onClick={() => setSec(x)} className={cn('shrink-0 rounded-full px-3 py-1 text-[12.5px] font-semibold ring-1 ring-inset', sec === x ? 'bg-brand-500 text-white ring-brand-500' : 'bg-white text-text-sub-600 ring-stroke-soft-200')}>
            {x === 'All' ? 'All' : x.charAt(0) + x.slice(1).toLowerCase()}
          </button>
        ))}
      </div>
      <div className="divide-y divide-stroke-soft-200 border-t border-stroke-soft-200">
        {items.map((it) => {
          const have = co.sels.find((x) => x.itemId === it.id)
          return (
            <div key={it.id} className={cn(open === it.id && 'bg-brand-50/50')}>
              <button
                type="button"
                onClick={() => {
                  setOpen(open === it.id ? null : it.id)
                  setQty(it.unit === 'LF' ? 10 : 1)
                  setNote('')
                }}
                className="flex w-full items-start gap-3 px-4 py-3 text-left"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5 font-semibold">
                    {it.name}
                    {have && <Pill tone="brand">On this change order · {qtyUnit(have.qty, have.unit)}</Pill>}
                  </div>
                  <div className="line-clamp-1 text-[12.5px] text-text-sub-600">{it.description}</div>
                </div>
                <div className="tnum shrink-0 text-[13px] font-semibold text-text-sub-600">
                  {money(it.price)}/{it.unit}
                </div>
              </button>
              {open === it.id && (
                <div className="flex flex-wrap items-end gap-3 px-4 pb-4">
                  <Field label={have ? 'Quantity to add' : 'Quantity'}>
                    <Stepper value={qty} unit={it.unit} min={0} step={it.unit === 'LF' ? 5 : 1} onChange={setQty} />
                  </Field>
                  <Field label="Additional note (prints on the form)" className="min-w-[200px] flex-1">
                    <input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />
                  </Field>
                  <Button
                    disabled={qty <= 0}
                    onClick={() => {
                      addSel(co.id, catalogSel(it.id, qty, note || undefined, 0))
                      onDone()
                    }}
                  >
                    {have ? 'Add to quantity' : 'Add'} · +{money(qty * it.price)}
                  </Button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function CustomTab({ co, onDone }: { co: ChangeOrder; onDone: () => void }) {
  const { addSel } = useStore()
  const [sign, setSign] = useState<'1' | '-1'>('1')
  const [section, setSection] = useState<string>('ADDITIONAL WORK')
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [unit, setUnit] = useState<Unit>('EA')
  const [qty, setQty] = useState(1)
  const [price, setPrice] = useState(0)
  const amt = (sign === '1' ? 1 : -1) * qty * price
  return (
    <div className="space-y-3 p-4">
      <Segmented
        value={sign}
        onChange={setSign}
        options={[
          { value: '1', label: 'Charge (adds to price)' },
          { value: '-1', label: 'Credit (lowers price)' },
        ]}
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Section">
          <select className={inputCls} value={section} onChange={(e) => setSection(e.target.value)}>
            {SECTIONS.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </Field>
        <Field label="Item name">
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder={sign === '1' ? 'e.g. Relocate dryer vent' : 'e.g. Goodwill credit'} />
        </Field>
      </div>
      <Field label="Description (prints on the form)">
        <textarea className={cn(inputCls, 'h-20 py-2')} value={desc} onChange={(e) => setDesc(e.target.value)} />
      </Field>
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Unit">
          <Segmented<Unit> value={unit} onChange={setUnit} options={[{ value: 'EA', label: 'EA' }, { value: 'LF', label: 'LF' }]} />
        </Field>
        <Field label="Quantity">
          <Stepper value={qty} unit={unit} min={0} onChange={setQty} />
        </Field>
        <Field label="Unit price">
          <MoneyInput className="w-36" value={price} onChange={setPrice} />
        </Field>
        <div className={cn('tnum ml-auto pb-2 text-[16px] font-bold', amt < 0 && 'text-state-error-base')}>{paren(amt)}</div>
      </div>
      <Button
        className="w-full"
        variant={sign === '1' ? 'primary' : 'danger'}
        disabled={!name.trim() || qty <= 0 || price <= 0}
        onClick={() => {
          addSel(co.id, {
            key: uid('custom'),
            section,
            name: name.trim(),
            description: desc.trim(),
            unit,
            qty,
            baseQty: 0,
            price: sign === '1' ? price : -price,
            kind: 'custom',
          })
          onDone()
        }}
      >
        Add {sign === '1' ? 'charge' : 'credit'}
      </Button>
    </div>
  )
}

/* ───────────── preview / sign / done ───────────── */

function Preview({ co }: { co: ChangeOrder }) {
  const { s, go } = useStore()
  const [tab, setTab] = useState<'co' | 'statement'>('co')
  const [map, setMap] = useState(true)
  return (
    <>
      <AppBar onBack={() => go({ name: 'co', coId: co.id })} title={`Change Order #${co.number} · Preview`} sub="PDF · what the customer signs" />
      <Body>
        <FlowSteps at={1} />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Segmented
            value={tab}
            onChange={setTab}
            options={[
              { value: 'co', label: 'Page 1 · Change Order' },
              { value: 'statement', label: 'Page 2 · Contract Statement' },
            ]}
          />
          <label className="flex items-center gap-2 text-[13px] font-semibold text-text-sub-600">
            <input type="checkbox" checked={map} onChange={(e) => setMap(e.target.checked)} className="accent-brand-500" /> Show field map
          </label>
        </div>
        <div className="rounded-xl bg-brand-50 px-3 py-2 text-[12.5px] text-brand-600">
          The customer gets two pages: the change order, and a contract statement with every charge, credit and payment on this contract so the new balance is clear.
        </div>
        {tab === 'co' ? <ChangeOrderDoc s={s} co={co} map={map} /> : <StatementDoc s={s} draft={co} map={map} />}
        {map && <FieldLegend kind={tab === 'co' ? 'co' : 'statement'} />}
      </Body>
      <BottomBar>
        <Button variant="outline" className="flex-1" onClick={() => go({ name: 'co', coId: co.id })}>
          <Pencil size={15} /> Edit
        </Button>
        <Button className="flex-1" onClick={() => go({ name: 'sign', coId: co.id })}>
          Customer Signature <ChevronRight size={16} />
        </Button>
      </BottomBar>
    </>
  )
}

function Sign({ co }: { co: ChangeOrder }) {
  const { s, go, signCO } = useStore()
  const c = s.contract
  const [method, setMethod] = useState<'touch' | 'docusign'>('touch')
  const [cust, setCust] = useState<string | 'sample' | undefined>()
  const [add, setAdd] = useState<string | 'sample' | undefined>()
  const d = coTotal(co)
  const sigOf = (v: string | undefined, name: string) =>
    v === undefined ? undefined : v === 'sample' ? ({ kind: 'typed', name, at: TODAY } as const) : ({ kind: 'img', src: v, at: TODAY } as const)
  return (
    <>
      <AppBar onBack={() => go({ name: 'preview', coId: co.id })} title="Customer Signature" sub={`Change Order #${co.number} · ${c.customer.names}`} />
      <Body>
        <FlowSteps at={2} />
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setMethod('touch')} className={cn('rounded-xl bg-white p-3 text-left ring-1', method === 'touch' ? 'ring-2 ring-brand-500' : 'ring-stroke-soft-200')}>
            <Hand size={18} className="text-brand-500" />
            <div className="mt-1 font-semibold">Touch signature</div>
            <div className="text-[12px] text-text-sub-600">In person · fastest close</div>
          </button>
          <button type="button" onClick={() => setMethod('docusign')} className={cn('rounded-xl bg-white p-3 text-left ring-1', method === 'docusign' ? 'ring-2 ring-brand-500' : 'ring-stroke-soft-200')}>
            <Mail size={18} className="text-brand-500" />
            <div className="mt-1 font-semibold">DocuSign email link</div>
            <div className="text-[12px] text-text-sub-600">Remote · async close</div>
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 rounded-xl bg-white p-3 ring-1 ring-stroke-soft-200 sm:grid-cols-4">
          <Kv k="This change order" tag="D" v={<span className={cn(d < 0 && 'text-state-error-base')}>{paren(d)}</span>} />
          <Kv k="Revised total" tag="E" v={money(revisedWith(s, co))} />
          <Kv k="Due today" tag="F" v={money(co.dueOnSigning)} sub={co.dueOnSigning > 0 ? (co.payMethod === 'Check' && co.checkNo ? `Check #${co.checkNo}` : co.payMethod) : undefined} />
          <Kv k="Schedule" v={co.schedule === 'remain' ? 'Remain' : `${co.schedule === 'increase' ? 'Increase' : 'Decrease'} → ${fmtDate(co.newCompletion)}`} />
        </div>
        {method === 'docusign' ? (
          <div className="rounded-xl bg-white p-4 text-[13.5px] text-text-sub-600 ring-1 ring-stroke-soft-200">
            Sends both pages to {c.customer.email} for signature, the same way quotes go out today. The change order counts on the quote once DocuSign reports it signed. For this demo, use touch signature.
          </div>
        ) : (
          <>
            <SignPoint n={1} title="Customer signature" who={c.customer.primary} required value={cust} onChange={setCust} />
            {c.customer.additional && <SignPoint n={2} title="Customer signature · additional party" who={`${c.customer.additional} (optional)`} value={add} onChange={setAdd} />}
            <div className="rounded-xl bg-white p-4 ring-1 ring-stroke-soft-200">
              <div className="flex items-center justify-between gap-2">
                <div className="font-semibold">3 · BWN representative</div>
                <Pill tone="ok">From your profile</Pill>
              </div>
              <div className="text-[12.5px] text-text-sub-600">{c.rep}, the rep who sold this change order</div>
              <div className="mt-2 border-b border-stroke-sub-300 pb-1">
                <SigView sig={{ kind: 'typed', name: c.rep, at: TODAY }} />
              </div>
            </div>
            <div className="rounded-xl border border-dashed border-stroke-sub-300 p-4 text-[13px] text-text-sub-600">
              <span className="font-semibold text-text-strong-950">BWN officer signature</span> · left blank on purpose.
            </div>
          </>
        )}
      </Body>
      <BottomBar>
        <Button
          size="lg"
          className="flex-1"
          disabled={method !== 'touch' || !cust}
          onClick={() =>
            signCO(co.id, {
              customer: sigOf(cust, c.customer.primary),
              additional: sigOf(add, c.customer.additional ?? ''),
              rep: { kind: 'typed', name: c.rep, at: TODAY },
            })
          }
        >
          <Check size={18} /> Confirm & Finish
        </Button>
      </BottomBar>
    </>
  )
}

function SignPoint({ n, title, who, required, value, onChange }: { n: number; title: string; who: string; required?: boolean; value?: string; onChange: (v?: string) => void }) {
  const name = who.replace(' (optional)', '')
  return (
    <div className="rounded-xl bg-white p-4 ring-1 ring-stroke-soft-200">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="font-semibold">
            {n} · {title} {required && <span className="text-state-error-base">*</span>}
          </div>
          <div className="text-[12.5px] text-text-sub-600">{who}</div>
        </div>
        {value === 'sample' ? (
          <Button size="sm" variant="ghost" onClick={() => onChange(undefined)}>
            Clear
          </Button>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => onChange('sample')}>
            Use sample signature
          </Button>
        )}
      </div>
      {value === 'sample' ? (
        <div className="flex h-[120px] items-end rounded-xl border border-stroke-soft-200 px-6 pb-6">
          <SigView sig={{ kind: 'typed', name, at: TODAY }} className="text-[34px]" />
        </div>
      ) : (
        <SignaturePad onChange={onChange} height={120} />
      )}
    </div>
  )
}

function Done({ co }: { co: ChangeOrder }) {
  const { s, go } = useStore()
  const [doc, setDoc] = useState<DocReq>(null)
  const c = s.contract
  const f = co.flow
  const d = coTotal(co)
  const pay = s.payments.find((p) => p.coId === co.id)
  if (!f) return null
  return (
    <>
      <AppBar onBack={() => go({ name: 'quote' })} title={`Change Order #${co.number}`} sub={`Signed ${fmtDate(co.signedAt)} · ${c.quoteId}`} right={<Pill tone="ok" dot>Signed</Pill>} />
      <Body>
        <FlowSteps at={3} />
        <div className="flex items-center gap-3 rounded-2xl bg-state-success-lighter p-4 ring-1 ring-state-success-light">
          <CheckCircle2 size={28} className="shrink-0 text-state-success-base" />
          <div>
            <div className="text-[16px] font-bold text-state-success-dark">Change Order #{co.number} signed</div>
            <div className="text-[13px] text-state-success-dark">
              Signed by {c.customer.primary}
              {co.signatures.additional ? ` and ${c.customer.additional}` : ''} · {delta(d)} · revised contract {money(f.valueAfter)}
            </div>
          </div>
        </div>

        <Card title="What updated on the quote" icon={<ListChecks size={14} />}>
          <div className="divide-y divide-stroke-soft-200">
            <FlowRow icon={<FileText size={16} />} title="Change orders" detail={`Change Order #${co.number} listed on quote ${c.quoteId}, signed PDF saved`} action="Open quote" onAction={() => go({ name: 'quote' })} />
            <FlowRow icon={<Wallet size={16} />} title="Revised contract price" before={money(f.valueBefore)} after={money(f.valueAfter)} />
            <FlowRow icon={<CalendarDays size={16} />} title="Approx. completion" before={f.endBefore !== f.endAfter ? fmtDate(f.endBefore) : undefined} after={fmtDate(f.endAfter)} detail={f.endBefore === f.endAfter ? (co.schedule === 'remain' ? ' · no change (Remain)' : ' · same date kept') : undefined} />
            <FlowRow icon={<Wallet size={16} />} title="Payment at signing" detail={pay ? `${money(pay.amount)} recorded · ${pay.ref}` : 'Nothing due (credit). The credit lowers the balance.'} />
            <FlowRow icon={<Receipt size={16} />} title="Contract statement · current balance" after={money(f.balanceAfter)} action="View" onAction={() => setDoc({ kind: 'statement' })} />
          </div>
        </Card>

        <Card title="Documents" icon={<FileText size={14} />}>
          <div className="divide-y divide-stroke-soft-200">
            <DocRow icon={<FileText size={16} />} title={`Change Order #${co.number} · signed.pdf`} sub="Page 1 change order + page 2 contract statement" onClick={() => setDoc({ kind: 'co', id: co.id })} />
            <DocRow icon={<Receipt size={16} />} title="Contract statement" sub={`As of ${fmtDate(TODAY)}`} onClick={() => setDoc({ kind: 'statement' })} />
          </div>
        </Card>
      </Body>
      <BottomBar>
        <Button variant="outline" className="flex-1" onClick={() => go({ name: 'quote' })}>
          Back to Quote
        </Button>
      </BottomBar>
      <DocModal req={doc} onClose={() => setDoc(null)} />
    </>
  )
}

function FlowRow({ icon, title, before, after, detail, action, onAction }: { icon: ReactNode; title: string; before?: string; after?: string; detail?: string; action?: string; onAction?: () => void }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-500">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="font-semibold">{title}</div>
        <div className="tnum text-[13px] text-text-sub-600">
          {before && (
            <>
              <span className="line-through decoration-text-soft-400">{before}</span> →{' '}
            </>
          )}
          {after && <span className="font-semibold text-text-strong-950">{after}</span>}
          {detail}
        </div>
      </div>
      {action && (
        <Button size="sm" variant="secondary" onClick={onAction}>
          {action}
        </Button>
      )}
    </div>
  )
}
