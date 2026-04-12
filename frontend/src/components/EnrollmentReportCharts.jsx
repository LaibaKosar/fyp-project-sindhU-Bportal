import { motion } from 'framer-motion'
import { TrendingUp } from 'lucide-react'

export const VIOLET_STROKE = '#8b5cf6'
export const VIOLET_TRACK = '#ede9fe'
export const ORANGE_STROKE = '#ea580c'
export const ORANGE_TRACK = '#ffedd5'

export function DualGenderRings({ male, female, displayTotal, size = 132 }) {
  const m = Math.max(0, Number(male) || 0)
  const f = Math.max(0, Number(female) || 0)
  const genderSum = m + f
  const centerTotal =
    displayTotal != null && displayTotal !== '' ? Number(displayTotal) : genderSum
  const ringDen = genderSum > 0 ? genderSum : Math.max(1, Number(centerTotal) || 1)
  const maleFrac = ringDen > 0 ? m / ringDen : 0
  const femaleFrac = ringDen > 0 ? f / ringDen : 0

  const cx = size / 2
  const cy = size / 2
  const rOuter = size / 2 - 12
  const rInner = rOuter - 16
  const lenOuter = 2 * Math.PI * rOuter
  const lenInner = 2 * Math.PI * rInner
  const outerDash = `${maleFrac * lenOuter} ${lenOuter}`
  const innerDash = `${femaleFrac * lenInner} ${lenInner}`

  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="overflow-visible" aria-hidden>
        <g transform={`rotate(-90 ${cx} ${cy})`}>
          <circle cx={cx} cy={cy} r={rOuter} fill="none" stroke={VIOLET_TRACK} strokeWidth={9} strokeLinecap="round" />
          <motion.circle
            cx={cx}
            cy={cy}
            r={rOuter}
            fill="none"
            stroke={VIOLET_STROKE}
            strokeWidth={9}
            strokeLinecap="round"
            initial={{ strokeDasharray: `0 ${lenOuter}` }}
            animate={{ strokeDasharray: outerDash }}
            transition={{ duration: 1.15, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
          />
          <circle cx={cx} cy={cy} r={rInner} fill="none" stroke={ORANGE_TRACK} strokeWidth={9} strokeLinecap="round" />
          <motion.circle
            cx={cx}
            cy={cy}
            r={rInner}
            fill="none"
            stroke={ORANGE_STROKE}
            strokeWidth={9}
            strokeLinecap="round"
            initial={{ strokeDasharray: `0 ${lenInner}` }}
            animate={{ strokeDasharray: innerDash }}
            transition={{ duration: 1.15, ease: [0.22, 1, 0.36, 1], delay: 0.22 }}
          />
        </g>
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Total</span>
        <span
          className="font-bold tabular-nums leading-none text-slate-900"
          style={{ fontSize: Math.max(18, Math.round(size * 0.18)) }}
        >
          {Number.isFinite(centerTotal) ? centerTotal : 0}
        </span>
        <span className="mt-0.5 text-[10px] text-slate-400">enrolled</span>
      </div>
    </div>
  )
}

export function AdmissionsMixBar({ newAdmissions, total }) {
  const n = Math.max(0, Number(newAdmissions) || 0)
  const t = Math.max(0, Number(total) || 0)
  const pct = t > 0 ? Math.round((n / t) * 100) : 0
  const widthPct = t > 0 ? (n / t) * 100 : 0

  if (n <= 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-3 py-2 text-center text-xs text-slate-500">
        No new admissions recorded for this term
      </div>
    )
  }

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="flex items-center gap-1.5 font-semibold text-emerald-700">
          <TrendingUp className="h-3.5 w-3.5 shrink-0" aria-hidden />
          New admissions
        </span>
        <span className="shrink-0 font-bold tabular-nums text-emerald-800">+{n}</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200/90 sm:h-3">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 shadow-sm"
          initial={{ width: '0%' }}
          animate={{ width: `${Math.min(100, widthPct)}%` }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.35 }}
        />
      </div>
      <p className="text-center text-[11px] text-slate-500 sm:text-xs">
        <span className="font-semibold text-slate-700">{pct}%</span> of enrolled cohort are new intakes
      </p>
    </div>
  )
}

export function GenderLegend({ male, female, className = '' }) {
  return (
    <div className={`flex flex-wrap justify-center gap-6 text-xs sm:gap-8 ${className}`}>
      <div className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-violet-500 shadow-sm ring-2 ring-violet-200" aria-hidden />
        <div>
          <p className="font-semibold text-slate-800">Male</p>
          <p className="tabular-nums text-slate-600">{male}</p>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-orange-500 shadow-sm ring-2 ring-orange-200" aria-hidden />
        <div>
          <p className="font-semibold text-slate-800">Female</p>
          <p className="tabular-nums text-slate-600">{female}</p>
        </div>
      </div>
    </div>
  )
}
