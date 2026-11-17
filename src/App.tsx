import { RotateCcw, Check } from 'lucide-react'
import { StoreProvider, useStore } from '@/lib/store'
import { changes, draftCO, signedCOs } from '@/lib/logic'
import { RepApp } from '@/rep/RepApp'
import { cn } from '@/components/ui'

export default function App() {
  return (
    <StoreProvider>
      <Frame />
    </StoreProvider>
  )
}

function Frame() {
  const { reset } = useStore()
  return (
    <div className="mx-auto max-w-[1360px] px-4 pb-8">
      <header className="flex flex-wrap items-center justify-between gap-3 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-500 text-[14px] font-black text-white">M</div>
          <div className="min-w-0">
            <div className="truncate text-[15px] font-bold">BWN change orders · from the quote</div>
            <div className="truncate text-[12px] text-text-sub-600">Merlin prototype · sample customer and numbers</div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={reset} className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-white px-3 text-[13px] font-semibold text-text-sub-600 ring-1 ring-stroke-soft-200 hover:bg-bg-weak-50">
            <RotateCcw size={14} /> Reset
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[260px_1fr]">
        <Guide />
        <div className="mx-auto w-full max-w-[1000px] rounded-[30px] bg-[#1c1a1f] p-2 shadow-xl sm:p-3">
          <div className="relative h-[min(800px,calc(100vh-120px))] min-h-[560px] overflow-hidden rounded-[22px] bg-white">
            <RepApp />
          </div>
        </div>
      </div>
    </div>
  )
}

function Guide() {
  const { s, go, startCO } = useStore()
  const draft = draftCO(s)
  const sc = s.screen
  const newest = s.cos.slice().sort((a, b) => b.number - a.number)[0]
  const signedNew = signedCOs(s).length > 1
  const target = draft ?? (newest && newest.number > 1 ? newest : undefined)
  const steps: { label: string; sub: string; on: boolean; done: boolean; go?: () => void }[] = [
    { label: 'Open the signed quote', sub: 'BWN-1042 · contract signed 11/11', on: sc.name === 'quote' || sc.name === 'list', done: !!draft || signedNew, go: () => go({ name: 'quote' }) },
    { label: 'Create Change Order', sub: 'Copies every selection on the quote. Contract details fill in.', on: false, done: !!draft || signedNew, go: () => startCO() },
    { label: 'Edit the copied selections', sub: 'Change quantities, remove items or add new ones. The difference is the amount.', on: sc.name === 'co', done: signedNew || (!!draft && changes(draft).length > 0), go: draft ? () => go({ name: 'co', coId: draft.id }) : undefined },
    { label: 'Preview the two pages', sub: 'Change order form + contract statement', on: sc.name === 'preview', done: signedNew, go: draft && changes(draft).length ? () => go({ name: 'preview', coId: draft.id }) : undefined },
    { label: 'Customer signs', sub: 'Touch or DocuSign, like the quote', on: sc.name === 'sign', done: signedNew, go: draft && changes(draft).length ? () => go({ name: 'sign', coId: draft.id }) : undefined },
    { label: 'See what updated', sub: 'Quote total, completion date, statement', on: sc.name === 'done', done: false, go: target && target.status === 'signed' ? () => go({ name: 'done', coId: target.id }) : undefined },
  ]
  return (
    <aside className="order-last lg:order-first">
      <div className="rounded-2xl bg-white p-4 ring-1 ring-stroke-soft-200 lg:sticky lg:top-4">
        <div className="text-[12px] font-bold uppercase tracking-wide text-text-sub-600">Walkthrough</div>
        <ol className="mt-3 space-y-1">
          {steps.map((st, i) => (
            <li key={st.label}>
              <button
                type="button"
                disabled={!st.go}
                onClick={st.go}
                className={cn('flex w-full items-start gap-2.5 rounded-lg px-2 py-1.5 text-left enabled:hover:bg-bg-weak-50 disabled:opacity-50', st.on && 'bg-brand-50')}
              >
                <span className={cn('mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-bold', st.done ? 'bg-state-success-base text-white' : st.on ? 'bg-brand-500 text-white' : 'bg-bg-weak-50 text-text-sub-600 ring-1 ring-stroke-soft-200')}>
                  {st.done ? <Check size={11} /> : i + 1}
                </span>
                <span className="min-w-0">
                  <span className={cn('block text-[13px] font-semibold', st.on && 'text-brand-500')}>{st.label}</span>
                  <span className="block text-[12px] text-text-sub-600">{st.sub}</span>
                </span>
              </button>
            </li>
          ))}
        </ol>
        <div className="mt-3 rounded-xl bg-bg-weak-50 p-3 text-[12px] text-text-sub-600">
          Purple letters (A–H) match the letters on your annotated forms. Turn on <b>Show field map</b> in the preview to see where each one comes from.
        </div>
      </div>
    </aside>
  )
}
