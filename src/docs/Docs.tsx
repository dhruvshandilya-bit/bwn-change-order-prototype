import type { ReactNode } from 'react'
import { changes, coTotal, delta, fmtDate, fmtShort, paren, qtyText, qtyUnit, revisedWith, signedCOs, statement, money, type Change } from '@/lib/logic'
import { SECTIONS, TODAY } from '@/lib/seed'
import type { ChangeOrder, Sel, State } from '@/lib/types'
import { SigView, Tag, cn } from '@/components/ui'

/* Paper versions of BWN's two forms (Rev. 11/16/26). Letters A–H match the annotated PDFs. */

function Paper({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg bg-[#e9e6ec] p-3 sm:p-5">
      <div className="doc relative mx-auto min-w-[640px] max-w-[816px] bg-white px-10 py-8 text-[11.5px] leading-snug text-black shadow-md">
        <div aria-hidden className="pointer-events-none absolute inset-0 grid place-items-center overflow-hidden">
          <span className="rotate-[-28deg] select-none whitespace-nowrap text-[54px] font-black tracking-widest text-black/[0.045]">PROTOTYPE · SAMPLE DATA</span>
        </div>
        <div className="relative">{children}</div>
      </div>
    </div>
  )
}

function Letterhead({ title }: { title: string }) {
  return (
    <>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div className="grid h-11 w-11 place-items-center rounded-md bg-gradient-to-br from-[#1f4e9c] to-[#b3203b] text-[13px] font-black text-white">BWN</div>
          <div>
            <div className="text-[20px] font-black leading-none tracking-wide text-[#1f4e9c]">BASEMENT</div>
            <div className="text-[9.5px] font-bold tracking-wide text-[#b3203b]">
              WATERPROOFING <span className="font-normal text-[#1f4e9c]">NATIONWIDE</span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] italic text-[#d9534f]">Rev. 11/16/26</div>
          <div className="mt-3 text-[14px] font-bold">{title}</div>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-2 border-y border-black text-center text-[10.5px]">
        <div className="border-r border-black py-1">
          A Maryland Corporation • MHIC 30160
          <br />
          Bel Air, MD (410) 679-2000
          <br />
          109 E Wheel Road • Bel Air, MD 21015
        </div>
        <div className="py-1">
          A Delaware Corporation
          <br />
          Wilmington, DE (302) 652-7911
          <br />
          PO Box 1798 • Wilmington, DE 19899
        </div>
      </div>
      <div className="border-b-2 border-[#3d6fa8] py-1 text-center text-[10.5px]">Toll Free (800) 888-0487 • www.bwn.com • Fax (410) 679-2038</div>
    </>
  )
}

function Blank({ label, value, tag, map, className }: { label: string; value: ReactNode; tag?: string; map?: boolean; className?: string }) {
  return (
    <div className={cn('flex items-end gap-2', className)}>
      <span className="shrink-0 pb-0.5">{label}</span>
      <span className="flex min-h-[20px] flex-1 items-end gap-1.5 border-b border-black pb-0.5 font-semibold text-[#1d3d8f]">
        {value}
        {map && tag && <Tag l={tag} className="ml-auto" />}
      </span>
    </div>
  )
}

const box = (on: boolean) => <span className="inline-grid h-3 w-3 place-items-center border border-black text-[10px] font-bold leading-none">{on ? '✓' : ''}</span>

const CHANGE_STYLE: Record<Change['change'], string> = {
  added: 'bg-[#e3f4ea] text-[#1b6b3a]',
  increased: 'bg-[#e3f4ea] text-[#1b6b3a]',
  reduced: 'bg-[#fde8ea] text-[#b3203b]',
  removed: 'bg-[#fde8ea] text-[#b3203b]',
}

function ScopeItem({ x, showAmount }: { x: Change; showAmount?: boolean }) {
  const tag = x.change === 'added' ? 'ADDED' : x.change === 'removed' ? 'REMOVED' : `${x.delta > 0 ? '+' : '−'}${qtyText(Math.abs(x.delta))} ${x.unit}`
  const text =
    x.change === 'added'
      ? x.description
      : x.change === 'removed'
        ? `Remove from the contract (was ${qtyUnit(x.baseQty, x.unit)}).`
        : `Change quantity from ${qtyUnit(x.baseQty, x.unit)} to ${qtyUnit(x.qty, x.unit)}.`
  return (
    <div className="border-b border-[#c9d3e3] py-1.5 last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <div className="font-bold">
          <span className={cn('mr-1.5 rounded px-1 text-[10px] font-bold', CHANGE_STYLE[x.change])}>{tag}</span>
          <span className={cn(x.change === 'removed' && 'line-through decoration-[#b3203b]')}>{x.name}</span>
        </div>
        <span className="flex shrink-0 items-center gap-2">
          <span className="rounded bg-[#eef1f6] px-1.5 text-[10px] font-bold">
            {x.change === 'added' ? qtyUnit(x.qty, x.unit) : `${qtyUnit(x.baseQty, x.unit)} → ${qtyUnit(x.qty, x.unit)}`}
          </span>
          {showAmount && <span className={cn('tnum min-w-[70px] text-right font-semibold', x.amount < 0 && 'text-[#c0392b]')}>{paren(x.amount)}</span>}
        </span>
      </div>
      <div className="mt-0.5 text-[10.5px] text-[#333]">{text}</div>
      {(x.coNote || (x.change === 'added' && x.note)) && <div className="mt-0.5 text-[10.5px] italic text-[#333]">{x.coNote || x.note}</div>}
    </div>
  )
}

/** An item that stays as signed: one line, no description (that is on the original contract). */
function Unchanged({ x }: { x: Sel }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[#c9d3e3] py-1 last:border-b-0">
      <span>{x.name}</span>
      <span className="rounded bg-[#eef1f6] px-1.5 text-[10px] font-bold">{qtyUnit(x.qty, x.unit)}</span>
    </div>
  )
}

const bySectionOrder = (names: string[]) => {
  const order = (n: string) => {
    const i = (SECTIONS as readonly string[]).indexOf(n)
    return i < 0 ? 99 : i
  }
  return [...new Set(names)].sort((a, b) => order(a) - order(b))
}

export function ChangeOrderDoc({ s, co, map }: { s: State; co: ChangeOrder; map?: boolean }) {
  const c = s.contract
  const cu = c.customer
  const d = coTotal(co)
  const prev = signedCOs(s).filter((x) => x.id !== co.id && x.number < co.number)
  const e = revisedWith(s, co)
  const list = changes(co)
  const byKey = new Map(list.map((x) => [x.key, x]))
  // The full scope after this change order, then what came off it.
  const final = co.sels.filter((x) => x.qty > 0)
  const removed = list.filter((x) => x.change === 'removed')
  const sections = bySectionOrder(final.map((x) => x.section))
  const filler = Math.max(0, 5 - final.length - removed.length)
  const sigs = co.signatures
  return (
    <Paper>
      <Letterhead title={`CHANGE ORDER #${co.number}`} />
      <div className="mt-4 grid grid-cols-[1.4fr_1fr] gap-x-6 gap-y-2.5">
        <Blank label="Name" value={cu.names} tag="from contract" map={map} />
        <Blank label="Date" value={fmtDate(co.signedAt ?? co.createdAt)} />
        <Blank label="Job Address" value={cu.street} />
        <Blank label="City" value={cu.city} />
        <Blank label="County" value={cu.county} />
        <div className="grid grid-cols-[1fr_1.4fr] gap-3">
          <Blank label="State" value={cu.state} />
          <Blank label="ZIP Code" value={cu.zip} />
        </div>
      </div>

      <div className="mt-4 min-h-[300px] border-2 border-[#3d6fa8] px-3 py-2">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2 font-bold">
          <span>
            SCOPE OF WORK: <span className="font-normal">contract after this change order</span>
          </span>
          <span className="flex items-center gap-1.5 text-[9.5px] font-bold">
            <span className={cn('rounded px-1', CHANGE_STYLE.added)}>ADDED</span>
            <span className={cn('rounded px-1', CHANGE_STYLE.increased)}>+ QTY</span>
            <span className={cn('rounded px-1', CHANGE_STYLE.reduced)}>− QTY</span>
            <span className={cn('rounded px-1', CHANGE_STYLE.removed)}>REMOVED</span>
          </span>
        </div>
        {map && <div className="text-[10px] font-semibold text-brand-500">Every item on the contract after this change order, with the changes marked. Removed items are listed at the end.</div>}
        {sections.map((sec) => (
          <div key={sec} className="mt-1.5">
            <div className="text-[10px] font-bold tracking-wide text-[#3d6fa8]">{sec}</div>
            {final
              .filter((x) => x.section === sec)
              .map((x) => {
                const ch = byKey.get(x.key)
                return ch ? <ScopeItem key={x.key} x={ch} showAmount={co.showAmounts} /> : <Unchanged key={x.key} x={x} />
              })}
          </div>
        ))}
        {removed.length > 0 && (
          <div className="mt-2.5 border-t border-dashed border-[#b3203b]/50 pt-1">
            <div className="text-[10px] font-bold tracking-wide text-[#b3203b]">REMOVED FROM THE CONTRACT</div>
            {removed.map((x) => (
              <ScopeItem key={x.key} x={x} showAmount={co.showAmounts} />
            ))}
          </div>
        )}
        {Array.from({ length: filler }).map((_, i) => (
          <div key={i} className="h-[22px] border-b border-[#9aa6b8]" />
        ))}
        <div className="mt-2 text-[10px] italic text-[#444]">
          Items without a mark are unchanged and remain as agreed in the contract dated {fmtDate(c.signedAt)}
          {prev.length ? ' and its previous change orders' : ''}.
        </div>
        {prev.length > 0 && (
          <div className="mt-1 text-[10px] italic text-[#444]">
            Previous change orders to this contract: {prev.map((p) => `#${p.number} (${fmtDate(p.signedAt)}) ${delta(coTotal(p))}`).join(' · ')}
          </div>
        )}
      </div>

      <div className="mt-0 grid grid-cols-[1.45fr_1fr] border-b-2 border-[#3d6fa8]">
        <div className="space-y-3 py-3 pr-4">
          <div className="flex items-end gap-2">
            <span>This authorizes the changes described above to your contract dated:</span>
            <span className="flex min-w-[110px] flex-1 items-end gap-1 border-b border-black pb-0.5 font-semibold text-[#1d3d8f]">
              {fmtDate(c.signedAt)} {map && <Tag l="H" className="ml-auto" />}
            </span>
          </div>
          <div>The changes described above may alter your project completion date.</div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
            <span>Project schedule:</span>
            <span className="flex items-center gap-1.5">{box(co.schedule === 'increase')} Increase</span>
            <span className="flex items-center gap-1.5">{box(co.schedule === 'decrease')} Decrease</span>
            <span className="flex items-center gap-1.5">{box(co.schedule === 'remain')} Remain</span>
          </div>
          {co.schedule !== 'remain' && co.newCompletion && <div className="text-[10.5px] text-[#1d3d8f]">New approx. completion date: {fmtDate(co.newCompletion)}</div>}
          <div className="text-[10.5px]">
            These changes shall be considered a part of the original contract. Original contract payments remain due as agreed. Payment for this change order is due as stated, with any remaining change-order balance due upon substantial completion of the change-order work.
          </div>
        </div>
        <div className="border-l border-black py-2 pl-3">
          <div className="space-y-1.5 bg-[#e8e8e8] p-2">
            <MoneyRow label="Original Contract Price" v={money(c.total)} tag="A" map={map} bold />
            <MoneyRow label="Original Contract Deposit" v={money(c.deposit)} tag="B" map={map} bold />
            <MoneyRow label="Original Contract Balance Due" v={money(c.total - c.deposit)} tag="C" map={map} bold />
          </div>
          <div className="mt-2 space-y-2 px-2">
            <MoneyRow
              label={
                <>
                  This Change Order: <span className={cn(d >= 0 && 'font-bold underline')}>Increase</span> / <span className={cn(d < 0 && 'font-bold underline')}>Decrease</span>
                </>
              }
              v={<span className={cn(d < 0 && 'text-[#c0392b]')}>{paren(d)}</span>}
              tag="D"
              map={map}
            />
            <MoneyRow label="Revised Total Contract Price" v={money(e)} tag="E" map={map} />
            <MoneyRow label="Payment Due Upon Signing This Change Order" v={money(co.dueOnSigning)} tag="F" map={map} />
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-5">
        <SigLine label="CUSTOMER SIGNATURE" sig={<SigView sig={sigs.customer} />} sub={sigs.customer ? `${c.customer.primary} · ${fmtDate(sigs.customer.at)}` : undefined} />
        <SigLine label="BWN REPRESENTATIVE" sig={<SigView sig={sigs.rep} />} sub={sigs.rep ? `${c.rep} · ${fmtDate(sigs.rep.at)}` : undefined} />
        <SigLine label="CUSTOMER SIGNATURE" sig={<SigView sig={sigs.additional} />} sub={sigs.additional ? `${c.customer.additional} · ${fmtDate(sigs.additional.at)}` : undefined} />
        <SigLine label="BWN OFFICER SIGNATURE" sig={null} sub={map ? 'Left blank on purpose' : undefined} />
      </div>
    </Paper>
  )
}

function MoneyRow({ label, v, tag, map, bold }: { label: ReactNode; v: ReactNode; tag: string; map?: boolean; bold?: boolean }) {
  return (
    <div className="flex items-end justify-between gap-2 text-[10.5px]">
      <span className={cn(bold && 'font-bold')}>{label}</span>
      <span className="flex shrink-0 items-end gap-1">
        {map && <Tag l={tag} />}
        <span className="tnum min-w-[78px] border-b border-black text-right font-semibold text-[#1d3d8f]">{v}</span>
      </span>
    </div>
  )
}

function SigLine({ label, sig, sub }: { label: string; sig: ReactNode; sub?: string }) {
  return (
    <div>
      <div className="flex h-11 items-end border-b border-black pb-0.5">{sig}</div>
      <div className="mt-1 flex items-center justify-between gap-2">
        <span className="text-[10.5px] font-bold">{label}</span>
        {sub && <span className="text-[10px] text-[#555]">{sub}</span>}
      </div>
    </div>
  )
}

/** Contract Statement. With `draft`, the unsigned change order shows as pending so the homeowner sees the result before signing. */
export function StatementDoc({ s, draft, map }: { s: State; draft?: ChangeOrder; map?: boolean }) {
  const c = s.contract
  const st = statement(s, draft)
  const asOf = TODAY
  const rows = [...st.rows, ...Array.from({ length: Math.max(0, 8 - st.rows.length) }, () => null)]
  return (
    <Paper>
      <Letterhead title="CONTRACT STATEMENT" />
      <div className="mt-4 flex items-start justify-between gap-4 text-[12px]">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            Customer: <b>{c.customer.names}</b> {map && <span className="text-[10px] font-semibold text-brand-500">from the change order</span>}
          </div>
          <div>
            Job address: {c.customer.street}, {c.customer.city}, {c.customer.state} {c.customer.zip}
          </div>
        </div>
        <div>As of: {fmtShort(asOf)}</div>
      </div>

      <table className="mt-5 w-full border-collapse text-[11px]">
        <thead>
          <tr className="border-b-2 border-black text-left">
            <th className="py-1.5 pr-2 font-bold">Date</th>
            <th className="px-2 font-bold">Unit</th>
            <th className="px-2 font-bold">Description</th>
            <th className="px-2 text-right font-bold">Contracts</th>
            <th className="px-2 text-right font-bold">Payments</th>
            <th className="bg-white pl-2 text-right font-bold">Running Balance</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const tag = !map || !r ? undefined : i === 0 ? 'A' : r.desc.startsWith('Deposit') ? 'B' : r.desc.startsWith('Change Order') && (r.contract ?? 0) > 0 ? 'D' : r.desc.startsWith('Payment - Change') ? 'F' : undefined
            return (
              <tr key={i} className={cn('h-[30px] border-b border-[#d9d9d9]', r?.pending && 'bg-[#fff8e6]')}>
                <td className="pr-2">{r ? fmtShort(r.date) : ''}</td>
                <td className="px-2">{r ? 1 : ''}</td>
                <td className="px-2">
                  {r?.desc}
                  {r?.pending && <span className="ml-1.5 whitespace-nowrap rounded bg-[#ffe7b3] px-1 text-[9.5px] font-bold text-[#8a5a00]">PENDING SIGNATURE</span>}
                </td>
                <td className={cn('tnum px-2 text-right', r && (r.contract ?? 0) < 0 && 'text-[#c0392b]')}>
                  <span className="inline-flex items-center gap-1">
                    {tag && (r?.contract ?? 0) !== 0 && <Tag l={tag} />}
                    {r?.contract !== undefined ? paren(r.contract) : ''}
                  </span>
                </td>
                <td className="tnum px-2 text-right text-[#c0392b]">
                  <span className="inline-flex items-center gap-1">
                    {tag && r?.payment !== undefined && <Tag l={tag} />}
                    {r?.payment !== undefined ? `(${money(r.payment)})` : ''}
                  </span>
                </td>
                <td className="tnum bg-[#e2e2e2] pl-2 pr-1 text-right">
                  <span className="inline-flex items-center gap-1">
                    {map && i === 1 && <Tag l="C" />}
                    {money(r ? r.balance : st.balance)}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <div className="mt-6 border-b-2 border-[#3d6fa8] text-[12px]">
        {(
          [
            ['Total contract charges', <span className="inline-flex items-center gap-1">{map && <Tag l="E" />}{money(st.charges)}</span>, ''],
            [
              <>
                Change-order credits
                {map && <span className="block text-[10px] font-semibold text-brand-500">Credits only: change orders that reduce scope and price</span>}
              </>,
              paren(st.credits),
              'text-[#c0392b]',
            ],
            ['Revised contract price', money(st.revised), ''],
            ['Total payments received', `(${money(st.paid)})`, 'text-[#c0392b]'],
            ['Current balance', st.balance < 0 ? `Refund due ${money(st.balance)}` : money(st.balance), 'font-bold'],
          ] as [ReactNode, ReactNode, string][]
        ).map(([label, value, cls], i, all) => (
          <div key={i} className="grid grid-cols-[110px_1fr_230px_150px]">
            <div />
            <div className={cn('py-1.5', i === 0 && 'pt-3', i === all.length - 1 && 'pb-3 font-bold')}>{label}</div>
            <div className={cn('tnum flex items-center justify-end bg-[#e2e2e2] pr-2', i === 0 && 'border-t-2 border-black', cls)}>{value}</div>
            <div />
          </div>
        ))}
      </div>
      <div className="mt-5 space-y-2 text-[10.5px] text-[#555]">
        <p>Additions and credits appear under Contracts; actual payments appear under Payments.</p>
        <p>Payment deadlines remain as agreed in the original contract and each change order.</p>
      </div>
    </Paper>
  )
}

/** Legend for the field map toggle, worded from the annotations. */
export function FieldLegend({ kind }: { kind: 'co' | 'statement' }) {
  const co: [string, string][] = [
    ['Name / address', 'Auto-filled from the original contract (quote BWN-1042)'],
    ['H', 'Date the original contract was signed'],
    ['A', 'Original contract price (FINAL · CONTRACT on the quote)'],
    ['B', 'Original contract deposit'],
    ['C', 'Original contract balance due = A − B'],
    ['D', 'Difference between the selections before and after this change order (after any rep override)'],
    ['E', 'Original contract + any previous change orders + this change order'],
    ['F', 'Payment due upon signing, entered by the rep on this change order'],
  ]
  const st: [string, string][] = [
    ['A', 'Original contract'],
    ['B', 'Deposit received'],
    ['C', 'Running balance'],
    ['D', 'Each signed change order (credits show in red brackets)'],
    ['F', 'Payment collected when a change order was signed'],
    ['E', 'Total contract charges (credits listed separately below it)'],
  ]
  return (
    <div className="mt-3 grid gap-1.5 rounded-xl bg-brand-50 p-3 text-[12.5px] sm:grid-cols-2">
      {(kind === 'co' ? co : st).map(([k, v]) => (
        <div key={k} className="flex items-start gap-2">
          {k.length === 1 ? <Tag l={k} className="mt-px" /> : <span className="shrink-0 font-semibold text-brand-500">{k}</span>}
          <span className="text-text-sub-600">{v}</span>
        </div>
      ))}
      {kind === 'co' && <div className="text-text-sub-600 sm:col-span-2">Signatures: customer, additional customer, the rep who sold the change order. The BWN officer line is left blank.</div>}
    </div>
  )
}
