import { Eraser, Minus, Plus, X } from 'lucide-react'
import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { qtyText } from '@/lib/logic'
import type { Sig } from '@/lib/types'

export function cn(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(' ')
}

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
const VARIANT: Record<Variant, string> = {
  primary: 'bg-brand-500 text-white hover:bg-brand-600 disabled:bg-brand-200',
  secondary: 'bg-brand-50 text-brand-500 hover:bg-brand-100 disabled:opacity-50',
  outline: 'border border-stroke-sub-300 bg-white text-text-strong-950 hover:bg-bg-weak-50 disabled:opacity-50',
  ghost: 'text-text-sub-600 hover:bg-bg-weak-50 disabled:opacity-50',
  danger: 'bg-white border border-state-error-light text-state-error-base hover:bg-state-error-lighter',
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  ...p
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md' | 'lg' }) {
  const sz = size === 'sm' ? 'h-8 px-3 text-[13px]' : size === 'lg' ? 'h-12 px-5 text-[15px]' : 'h-10 px-4 text-sm'
  return (
    <button
      type="button"
      {...p}
      className={cn('inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors disabled:cursor-not-allowed', VARIANT[variant], sz, className)}
    />
  )
}

export type Tone = 'neutral' | 'brand' | 'blue' | 'warn' | 'ok' | 'error'
const TONE: Record<Tone, string> = {
  neutral: 'bg-bg-weak-50 text-text-sub-600 ring-stroke-soft-200',
  brand: 'bg-brand-50 text-brand-500 ring-brand-100',
  blue: 'bg-state-blue-lighter text-state-blue-dark ring-state-blue-light',
  warn: 'bg-state-warning-lighter text-state-warning-dark ring-state-warning-light',
  ok: 'bg-state-success-lighter text-state-success-dark ring-state-success-light',
  error: 'bg-state-error-lighter text-state-error-dark ring-state-error-light',
}
export function Pill({ children, tone = 'neutral', dot, className }: { children: ReactNode; tone?: Tone; dot?: boolean; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[11.5px] font-semibold ring-1 ring-inset', TONE[tone], className)}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />}
      {children}
    </span>
  )
}

export function Card({ title, right, children, className, icon }: { title?: ReactNode; right?: ReactNode; children: ReactNode; className?: string; icon?: ReactNode }) {
  return (
    <section className={cn('rounded-2xl border border-stroke-soft-200 bg-white', className)}>
      {(title || right) && (
        <header className="flex items-center justify-between gap-3 border-b border-stroke-soft-200 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2 text-[12px] font-bold uppercase tracking-wide text-text-sub-600">
            {icon}
            {title}
          </div>
          {right}
        </header>
      )}
      {children}
    </section>
  )
}

/** Purple letter badge that matches the letters on the annotated BWN forms. */
export function Tag({ l, className }: { l: string; className?: string }) {
  return (
    <span
      title={`Field "${l}" on the BWN form`}
      className={cn('inline-grid h-[18px] min-w-[18px] place-items-center rounded-full bg-brand-500 px-1 text-[10px] font-bold leading-none text-white', className)}
    >
      {l}
    </span>
  )
}

export function Stepper({ value, onChange, min = 0, max, step = 1, unit }: { value: number; onChange: (n: number) => void; min?: number; max?: number; step?: number; unit?: string }) {
  const [txt, setTxt] = useState(qtyText(value))
  useEffect(() => setTxt(qtyText(value)), [value])
  const clamp = (x: number) => Math.min(max ?? Infinity, Math.max(min, Math.round(x * 100) / 100))
  return (
    <div className="flex items-center gap-1">
      <button type="button" aria-label="Less" onClick={() => onChange(clamp(value - step))} className="grid h-8 w-8 place-items-center rounded-lg border border-stroke-soft-200 bg-white text-text-sub-600 active:bg-bg-weak-50">
        <Minus size={14} />
      </button>
      <div className="flex h-8 items-center rounded-lg border border-stroke-soft-200 bg-white pr-2">
        <input
          inputMode="decimal"
          aria-label="Quantity"
          value={txt}
          onChange={(e) => setTxt(e.target.value)}
          onBlur={() => {
            const v = parseFloat(txt)
            onChange(Number.isFinite(v) ? clamp(v) : value)
          }}
          className="tnum w-12 bg-transparent text-center text-[13px] font-semibold outline-none"
        />
        {unit && <span className="text-[11px] font-semibold text-text-soft-400">{unit}</span>}
      </div>
      <button type="button" aria-label="More" onClick={() => onChange(clamp(value + step))} className="grid h-8 w-8 place-items-center rounded-lg border border-stroke-soft-200 bg-white text-text-sub-600 active:bg-bg-weak-50">
        <Plus size={14} />
      </button>
    </div>
  )
}

export function Segmented<T extends string>({ value, options, onChange, className }: { value: T; options: { value: T; label: ReactNode }[]; onChange: (v: T) => void; className?: string }) {
  return (
    <div className={cn('inline-flex rounded-lg bg-bg-weak-50 p-0.5 ring-1 ring-inset ring-stroke-soft-200', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn('h-8 rounded-md px-3 text-[13px] font-semibold transition-colors', o.value === value ? 'bg-white text-brand-500 shadow-sm ring-1 ring-stroke-soft-200' : 'text-text-sub-600 hover:text-text-strong-950')}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Modal({ open, onClose, title, children, footer, wide, contained }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode; wide?: boolean; contained?: boolean }) {
  useEffect(() => {
    if (!open) return
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className={cn(contained ? 'absolute' : 'fixed', 'inset-0 z-40 flex items-end justify-center bg-black/40 sm:items-center sm:p-4')} onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className={cn('animate-sheet flex max-h-[92%] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl', wide ? 'sm:max-w-4xl' : 'sm:max-w-xl')}
      >
        <div className="flex items-center justify-between gap-3 border-b border-stroke-soft-200 px-4 py-3">
          <div className="min-w-0 text-[15px] font-semibold">{title}</div>
          <button type="button" aria-label="Close" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-text-sub-600 hover:bg-bg-weak-50">
            <X size={18} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        {footer && <div className="border-t border-stroke-soft-200 px-4 py-3">{footer}</div>}
      </div>
    </div>
  )
}

export function Field({ label, children, hint, className }: { label: ReactNode; children: ReactNode; hint?: ReactNode; className?: string }) {
  return (
    <label className={cn('block', className)}>
      <span className="mb-1 block text-[12px] font-semibold text-text-sub-600">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11.5px] text-text-soft-400">{hint}</span>}
    </label>
  )
}

export const inputCls = 'h-10 w-full rounded-lg border border-stroke-soft-200 bg-white px-3 text-[14px] outline-none focus:border-brand-400'

export function MoneyInput({ value, onChange, className, ariaLabel }: { value: number; onChange: (n: number) => void; className?: string; ariaLabel?: string }) {
  const [txt, setTxt] = useState(value ? value.toFixed(2) : '0.00')
  useEffect(() => setTxt(value ? value.toFixed(2) : '0.00'), [value])
  return (
    <div className={cn('flex h-10 items-center rounded-lg border border-stroke-soft-200 bg-white px-3 focus-within:border-brand-400', className)}>
      <span className="text-text-soft-400">$</span>
      <input
        inputMode="decimal"
        aria-label={ariaLabel}
        value={txt}
        onChange={(e) => setTxt(e.target.value)}
        onBlur={() => {
          const v = parseFloat(txt.replace(/[$,]/g, ''))
          onChange(Number.isFinite(v) ? Math.round(v * 100) / 100 : value)
        }}
        className="tnum w-full bg-transparent pl-1 text-right text-[14px] font-semibold outline-none"
      />
    </div>
  )
}

/** Shows a captured (image) or saved/typed signature. */
export function SigView({ sig, className }: { sig?: Sig; className?: string }) {
  if (!sig) return null
  if (sig.kind === 'img') return <img src={sig.src} alt="Signature" className={cn('h-10 w-auto object-contain', className)} />
  return <span className={cn('font-sig text-[26px] leading-none text-[#1e3a8a]', className)}>{sig.name}</span>
}

export function SignaturePad({ onChange, height = 140 }: { onChange: (src?: string) => void; height?: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const [empty, setEmpty] = useState(true)

  useEffect(() => {
    const c = ref.current
    if (!c) return
    const r = c.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    c.width = Math.max(1, r.width * dpr)
    c.height = Math.max(1, r.height * dpr)
    const ctx = c.getContext('2d')
    if (!ctx) return
    ctx.scale(dpr, dpr)
    ctx.lineWidth = 2.2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#1e3a8a'
  }, [])

  const pos = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect()
    return [e.clientX - r.left, e.clientY - r.top] as const
  }
  const clear = () => {
    const c = ref.current
    const ctx = c?.getContext('2d')
    if (!c || !ctx) return
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, c.width, c.height)
    ctx.restore()
    setEmpty(true)
    onChange(undefined)
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-dashed border-stroke-sub-300 bg-white" style={{ height }}>
      <canvas
        ref={ref}
        aria-label="Signature pad"
        className="h-full w-full touch-none"
        onPointerDown={(e) => {
          const ctx = ref.current?.getContext('2d')
          if (!ctx) return
          drawing.current = true
          ref.current!.setPointerCapture(e.pointerId)
          const [x, y] = pos(e)
          ctx.beginPath()
          ctx.moveTo(x, y)
        }}
        onPointerMove={(e) => {
          if (!drawing.current) return
          const ctx = ref.current?.getContext('2d')
          if (!ctx) return
          const [x, y] = pos(e)
          ctx.lineTo(x, y)
          ctx.stroke()
        }}
        onPointerUp={() => {
          if (!drawing.current) return
          drawing.current = false
          setEmpty(false)
          onChange(ref.current!.toDataURL('image/png'))
        }}
      />
      <div className="pointer-events-none absolute inset-x-6 bottom-8 border-b border-stroke-sub-300" />
      {empty && <span className="pointer-events-none absolute inset-0 grid place-items-center text-[13px] text-text-soft-400">Sign here with a finger or stylus</span>}
      {!empty && (
        <button type="button" onClick={clear} className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-md bg-white/90 px-2 py-1 text-[12px] font-semibold text-text-sub-600 ring-1 ring-stroke-soft-200">
          <Eraser size={13} /> Clear
        </button>
      )}
    </div>
  )
}
