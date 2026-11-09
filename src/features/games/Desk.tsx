import { useState, type ReactNode } from 'react'
import { evalProduction, evalRnd } from './generators'
import type { BinaryCase, ProductionCase, RndCase, Section } from './types'
import type { GameMeta } from './config'

export type Stamp = 'approved' | 'rejected' | null

export function DocPanel({ title, sections, tone, stamp, children }: { title: string; sections: Section[]; tone: 'ref' | 'doc'; stamp?: Stamp; children?: ReactNode }) {
  return (
    <section aria-label={title} className={`relative rounded-lg border p-4 ${tone === 'ref' ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-white'}`}>
      <h2 className="mb-3 text-sm font-bold text-slate-700">{title}</h2>
      <div className="flex flex-col gap-4">
        {sections.map((s) => (
          <div key={s.title}>
            <h3 className="mb-1 text-xs font-semibold text-slate-600">{s.title}</h3>
            <dl className="text-sm">
              {s.rows.map((r) => (
                <div key={r.label} className="flex justify-between gap-4 border-b border-slate-200/70 py-1.5">
                  <dt className="text-slate-600">{r.label}</dt>
                  <dd className="text-right font-semibold text-slate-900">{r.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
      {children}
      {stamp && <div aria-hidden="true" className={`stamp ${stamp === 'approved' ? 'stamp-approved' : 'stamp-rejected'}`}>{stamp === 'approved' ? 'APPROVED' : 'REJECTED'}</div>}
    </section>
  )
}

function Stepper({ label, value, unit, min, max, step, onChange }: { label: string; value: number; unit: string; min: number; max: number; step: number; onChange: (v: number) => void }) {
  const btn = 'grid size-11 place-items-center rounded-md border border-slate-300 bg-white text-lg font-bold disabled:opacity-40'
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-200/70 py-2">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" aria-label={`Giảm ${label}`} disabled={value - step < min} onClick={() => onChange(value - step)} className={btn}>−</button>
        <output aria-label={label} className="w-16 text-center font-semibold tabular-nums">{value}{unit}</output>
        <button type="button" aria-label={`Tăng ${label}`} disabled={value + step > max} onClick={() => onChange(value + step)} className={btn}>+</button>
      </div>
    </div>
  )
}

const Meter = ({ label, now, goal, ok }: { label: string; now: string; goal: string; ok: boolean }) => (
  <div className={`flex justify-between rounded-md px-3 py-2 text-sm font-semibold ${ok ? 'bg-green-100 text-green-900' : 'bg-red-100 text-red-900'}`}>
    <span>{label}</span>
    <span>{now} / {goal}</span>
  </div>
)

export function BinaryDesk({ c, meta, stamp, disabled, onDecide }: { c: BinaryCase; meta: GameMeta; stamp: Stamp; disabled: boolean; onDecide: (approve: boolean) => void }) {
  const base = 'min-h-12 flex-1 rounded-md px-4 text-sm font-bold text-white disabled:opacity-60'
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <DocPanel title={meta.leftTitle} sections={c.reference} tone="ref" />
      <div className="flex flex-col gap-3">
        <DocPanel title={meta.rightTitle} sections={c.document} tone="doc" stamp={stamp} />
        <div className="flex gap-3">
          <button disabled={disabled} onClick={() => onDecide(false)} className={`${base} bg-red-700`}>{meta.rejectLabel} (←)</button>
          <button disabled={disabled} onClick={() => onDecide(true)} className={`${base} bg-green-700`}>{meta.approveLabel} (→)</button>
        </div>
      </div>
    </div>
  )
}

export function ProductionDesk({ c, meta, stamp, disabled, onSubmit, onSkip }: { c: ProductionCase; meta: GameMeta; stamp: Stamp; disabled: boolean; onSubmit: (ok: boolean, reason: string) => void; onSkip: () => void }) {
  const [hours, setHours] = useState<number[]>(c.machines.map(() => 0))
  const r = evalProduction(c, hours)
  const submit = () =>
    onSubmit(r.ok, r.ok ? 'Kế hoạch đạt KPI và không vượt kho nguyên vật liệu.' : r.output < c.target ? `Sản lượng ${r.output} chưa đạt KPI ${c.target}.` : `Nguyên vật liệu ${r.material} kg vượt kho ${c.stock} kg.`)
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <DocPanel title={meta.leftTitle} sections={c.reference} tone="ref" />
      <DocPanel title={meta.rightTitle} sections={[]} tone="doc" stamp={stamp}>
        {c.machines.map((m, i) => (
          <Stepper key={m.name} label={m.name} unit=" giờ" min={0} max={c.maxHours} step={1} value={hours[i]} onChange={(v) => setHours(hours.map((h, k) => (k === i ? v : h)))} />
        ))}
        <div className="mt-3 flex flex-col gap-2">
          <Meter label="Sản lượng dự kiến" now={String(r.output)} goal={`≥ ${c.target}`} ok={r.output >= c.target} />
          <Meter label="Nguyên vật liệu dùng" now={`${r.material} kg`} goal={`≤ ${c.stock} kg`} ok={r.material <= c.stock} />
        </div>
        <div className="mt-3 flex gap-3">
          <button disabled={disabled} onClick={onSkip} className="min-h-12 rounded-md border border-slate-300 px-4 text-sm font-bold disabled:opacity-60">Bỏ qua</button>
          <button disabled={disabled} onClick={submit} className="min-h-12 flex-1 rounded-md bg-accent px-4 text-sm font-bold text-white disabled:opacity-60">Chốt kế hoạch</button>
        </div>
      </DocPanel>
    </div>
  )
}

export function RndDesk({ c, meta, stamp, disabled, onSubmit, onSkip }: { c: RndCase; meta: GameMeta; stamp: Stamp; disabled: boolean; onSubmit: (ok: boolean, reason: string) => void; onSkip: () => void }) {
  const [a, setA] = useState(0)
  const [b, setB] = useState(0)
  const pct = [a, b, 100 - a - b]
  const r = evalRnd(c, pct)
  const inRange = Math.abs(r.strength - c.target) <= c.tolerance + 1e-9
  const dec1 = (x: number) => x.toFixed(1).replace('.', ',')
  const submit = () =>
    onSubmit(r.ok, r.ok ? 'Công thức đạt độ bền mục tiêu và trong ngân sách.' : !inRange ? `Độ bền ${dec1(r.strength)} MPa lệch mục tiêu ${dec1(c.target)} MPa quá sai số.` : `Chi phí ${Math.round(r.cost).toLocaleString('vi-VN')} ₫/kg vượt trần ${c.budget.toLocaleString('vi-VN')} ₫/kg.`)
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <DocPanel title={meta.leftTitle} sections={c.reference} tone="ref" />
      <DocPanel title={meta.rightTitle} sections={[]} tone="doc" stamp={stamp}>
        <Stepper label={c.ingredients[0].name} unit="%" min={0} max={100 - b} step={5} value={a} onChange={setA} />
        <Stepper label={c.ingredients[1].name} unit="%" min={0} max={100 - a} step={5} value={b} onChange={setB} />
        <div className="flex items-center justify-between border-b border-slate-200/70 py-2 text-sm">
          <span className="font-medium">{c.ingredients[2].name} (phần còn lại)</span>
          <span className="w-16 text-center font-semibold tabular-nums">{pct[2]}%</span>
        </div>
        <div className="mt-3 flex flex-col gap-2">
          <Meter label="Độ bền" now={`${dec1(r.strength)} MPa`} goal={`${dec1(c.target)} ± ${c.tolerance}`} ok={inRange} />
          <Meter label="Chi phí" now={`${Math.round(r.cost).toLocaleString('vi-VN')} ₫`} goal={`≤ ${c.budget.toLocaleString('vi-VN')} ₫`} ok={r.cost <= c.budget + 1e-9} />
        </div>
        <div className="mt-3 flex gap-3">
          <button disabled={disabled} onClick={onSkip} className="min-h-12 rounded-md border border-slate-300 px-4 text-sm font-bold disabled:opacity-60">Bỏ qua</button>
          <button disabled={disabled} onClick={submit} className="min-h-12 flex-1 rounded-md bg-accent px-4 text-sm font-bold text-white disabled:opacity-60">Chốt công thức</button>
        </div>
      </DocPanel>
    </div>
  )
}
