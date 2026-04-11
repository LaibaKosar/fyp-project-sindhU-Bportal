import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { BarChart3, ChevronLeft, ChevronRight, GraduationCap, Info, Users } from 'lucide-react'
import { getResourceInsightForItem } from '../utils/governanceInsights'

export { getResourceInsightForItem }

const PAGE_SIZE = 8

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const fn = () => setReduced(mq.matches)
    mq.addEventListener('change', fn)
    return () => mq.removeEventListener('change', fn)
  }, [])
  return reduced
}

const READINESS_COLORS = ['#059669', '#ca8a04']

/** Left border accent for "At a glance" cards — keys match `densityBand` from getResourceInsightForItem */
const DENSITY_BAND_BORDER = {
  high: 'border-l-rose-400',
  moderate: 'border-l-amber-400',
  balanced: 'border-l-emerald-400',
  lean: 'border-l-slate-400',
}

/** Presentation demo: 12 rows to exercise pagination; includes gender breakdown. */
const PRESENTATION_RESOURCE_DEMO = [
  { university_id: 'p1', universityShort: 'Sukkur IBA Univ', universityFull: 'Sukkur IBA University', staff: 21, faculties: 4, staff_male: 14, staff_female: 6, staff_unknown: 1 },
  { university_id: 'p2', universityShort: 'Univ. of Karachi', universityFull: 'University of Karachi', staff: 18, faculties: 3, staff_male: 10, staff_female: 7, staff_unknown: 1 },
  { university_id: 'p3', universityShort: 'Aror University', universityFull: 'Aror University of Art, Architecture, Design & Heritage', staff: 14, faculties: 3, staff_male: 8, staff_female: 5, staff_unknown: 1 },
  { university_id: 'p4', universityShort: 'Shaheed Benazir', universityFull: 'Shaheed Benazir Bhutto University', staff: 12, faculties: 2, staff_male: 7, staff_female: 4, staff_unknown: 1 },
  { university_id: 'p5', universityShort: 'DOW University', universityFull: 'DOW University of Health Sciences', staff: 10, faculties: 2, staff_male: 5, staff_female: 4, staff_unknown: 1 },
  { university_id: 'p6', universityShort: 'Univ. of Sindh', universityFull: 'University of Sindh', staff: 9, faculties: 4, staff_male: 5, staff_female: 3, staff_unknown: 1 },
  { university_id: 'p7', universityShort: 'Mehran UET', universityFull: 'Mehran University of Engineering & Technology', staff: 8, faculties: 2, staff_male: 6, staff_female: 2, staff_unknown: 0 },
  { university_id: 'p8', universityShort: 'NED University', universityFull: 'NED University of Engineering & Technology', staff: 7, faculties: 3, staff_male: 5, staff_female: 2, staff_unknown: 0 },
  { university_id: 'p9', universityShort: 'LUMHS', universityFull: 'Liaquat University of Medical and Health Sciences', staff: 7, faculties: 2, staff_male: 3, staff_female: 3, staff_unknown: 1 },
  { university_id: 'p10', universityShort: 'SALU', universityFull: 'Shah Abdul Latif University', staff: 6, faculties: 3, staff_male: 4, staff_female: 2, staff_unknown: 0 },
  { university_id: 'p11', universityShort: 'IBA Sukkur', universityFull: 'Sukkur IBA University — City Campus', staff: 5, faculties: 1, staff_male: 3, staff_female: 1, staff_unknown: 1 },
  { university_id: 'p12', universityShort: 'SZABIST', universityFull: 'SZABIST University', staff: 4, faculties: 2, staff_male: 2, staff_female: 2, staff_unknown: 0 },
]

function truncateLabel(s, max = 20) {
  if (s == null || s === '') return ''
  const str = typeof s === 'string' ? s : String(s)
  return str.length <= max ? str : `${str.slice(0, max - 1)}…`
}

function ResourceTooltip({ active, payload, presentationMode }) {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload
  if (!row) return null
  const staff = row.staff ?? 0
  const faculties = row.faculties ?? 0
  const insight = getResourceInsightForItem({ staff, faculties })
  const fullNameRaw = row.universityFull ?? row.university ?? ''
  const fullName =
    typeof fullNameRaw === 'string' ? fullNameRaw : fullNameRaw != null ? String(fullNameRaw) : ''
  return (
    <div className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-xs text-white shadow-xl max-w-[280px]">
      {presentationMode && (
        <p className="mb-1 font-medium text-amber-300">Presentation mode — sample data</p>
      )}
      <p className="font-semibold text-slate-100 leading-snug">{fullName}</p>
      {insight.summary && <p className="mt-1 text-slate-200">{insight.summary}</p>}
      {insight.ratio && <p className="mt-0.5 text-slate-300">{insight.ratio}</p>}
      <p className="mt-1.5 leading-relaxed text-slate-400">{insight.insight}</p>
    </div>
  )
}

function ReadinessTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const p = payload[0]
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-slate-900">{p.name}</p>
      <p className="tabular-nums text-slate-600">{p.value} universities</p>
    </div>
  )
}

function GenderBreakdownBars({ male, female, unknown, total }) {
  const t = Number(total)
  if (!Number.isFinite(t) || t <= 0) {
    return <p className="text-xs text-slate-500">No gender-tagged staff in aggregate.</p>
  }
  const pct = (n) => {
    const v = Number(n)
    const num = Number.isFinite(v) ? v : 0
    return Math.round((num / t) * 1000) / 10
  }
  const rows = [
    { label: 'Male', value: Number.isFinite(Number(male)) ? male : 0, pct: pct(male), gradId: 'gMale', from: '#6366f1', to: '#4f46e5' },
    { label: 'Female', value: Number.isFinite(Number(female)) ? female : 0, pct: pct(female), gradId: 'gFemale', from: '#8b5cf6', to: '#6d28d9' },
    { label: 'Other / not stated', value: Number.isFinite(Number(unknown)) ? unknown : 0, pct: pct(unknown), gradId: 'gUnk', from: '#a78bfa', to: '#7c3aed' },
  ]
  return (
    <div className="space-y-2.5">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="mb-0.5 flex justify-between text-[11px] font-medium text-slate-600">
            <span>{r.label}</span>
            <span className="tabular-nums text-slate-800">
              {r.value} <span className="text-slate-400 font-normal">({r.pct}%)</span>
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-indigo-100/80">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${r.pct}%`,
                background: `linear-gradient(90deg, ${r.from}, ${r.to})`,
                boxShadow: 'inset 0 1px 0 rgb(255 255 255 / 0.25)',
              }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

function isUniversityActive(u) {
  return !!(
    u &&
    (u.has_focal_person === true ||
      u.hasFocalPerson === true ||
      u.setup_status === 'Active')
  )
}

function ReadinessBlock({ readinessSlices, readinessPieData, animActive, reducedMotion }) {
  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-xl border-2 border-slate-200/90 border-l-4 border-l-emerald-500 bg-gradient-to-br from-white to-emerald-50/40 p-5 shadow-md transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg hover:shadow-emerald-500/15"
    >
      <h3 className="mb-1 flex items-center gap-2 text-lg font-semibold text-slate-900">
        <BarChart3 className="h-5 w-5 text-emerald-600" />
        University setup & readiness
      </h3>
      <p className="mb-3 text-xs text-slate-500">
        Focal person (UFP) activation across registered universities. Board-level compliance metrics will
        appear here once that data is connected in analytics.
      </p>
      <div className="mb-4 flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50/90 px-3 py-2.5">
        <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" />
        <p className="text-sm text-slate-700">
          <span className="font-medium text-slate-800">What you are seeing: </span>
          Each university is either <strong>active</strong> (focal account created) or <strong>setup pending</strong>.
          Use this to prioritize onboarding before deeper governance reporting.
        </p>
      </div>

      {readinessSlices.some((s) => s.value > 0) ? (
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-center">
          <div className="h-[220px] w-full max-w-[280px] min-h-[220px] min-w-[200px]">
            <ResponsiveContainer width="100%" height={220} minHeight={220} minWidth={0}>
              <PieChart>
                <Pie
                  data={readinessPieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={58}
                  outerRadius={88}
                  paddingAngle={readinessPieData.length > 1 ? 2 : 0}
                  isAnimationActive={animActive}
                  animationDuration={reducedMotion ? 0 : 550}
                >
                  {readinessPieData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.color}
                      stroke="white"
                      strokeWidth={2}
                      style={{ filter: 'drop-shadow(0 2px 4px rgb(15 23 42 / 0.12))' }}
                    />
                  ))}
                </Pie>
                <Tooltip content={<ReadinessTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="w-full max-w-xs space-y-2 text-sm">
            {readinessSlices.map((s, i) => (
              <li
                key={s.name}
                className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2"
              >
                <span className="flex items-center gap-2 font-medium text-slate-700">
                  <span
                    className="h-2.5 w-2.5 rounded-full shadow-sm"
                    style={{ backgroundColor: READINESS_COLORS[i % READINESS_COLORS.length] }}
                  />
                  {s.name}
                </span>
                <span className="tabular-nums font-semibold text-slate-900">{s.value}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="flex h-[200px] items-center justify-center text-slate-400">
          <div className="text-center">
            <BarChart3 className="mx-auto mb-2 h-10 w-10 opacity-50" />
            <p className="font-medium">No university records yet</p>
            <p className="mt-1 text-xs">Load analytics to see setup status.</p>
          </div>
        </div>
      )}
    </motion.div>
  )
}

/**
 * sections: 'boards' = setup & readiness, 'resources' = staff vs faculties chart.
 * Pass merged analytics rows (e.g. mapData) so focal status matches Universities list.
 */
function GovernanceCharts({
  data,
  presentationMode = false,
  sections = ['boards', 'resources'],
}) {
  const showBoards = sections.includes('boards')
  const showResources = sections.includes('resources')
  const reducedMotion = usePrefersReducedMotion()
  const [resourcePage, setResourcePage] = useState(0)
  const [hoveredUniversityId, setHoveredUniversityId] = useState(null)
  const leaveTimerRef = useRef(null)

  const clearHoverSoon = useCallback(() => {
    if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current)
    leaveTimerRef.current = setTimeout(() => setHoveredUniversityId(null), 140)
  }, [])

  const setHoverNow = useCallback((id) => {
    if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current)
    setHoveredUniversityId(id ?? null)
  }, [])

  useEffect(() => {
    return () => {
      if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current)
    }
  }, [])

  const readinessSlices = useMemo(() => {
    let list = Array.isArray(data) ? data : []
    if (presentationMode && list.length === 0) {
      return [
        { name: 'Active focal account', value: 20 },
        { name: 'Setup pending', value: 7 },
      ]
    }
    const active = list.filter((u) => isUniversityActive(u)).length
    const pending = Math.max(0, list.length - active)
    return [
      { name: 'Active focal account', value: active },
      { name: 'Setup pending', value: pending },
    ]
  }, [data, presentationMode])

  const readinessPieData = useMemo(() => {
    const nameToColor = {
      'Active focal account': READINESS_COLORS[0],
      'Setup pending': READINESS_COLORS[1],
    }
    return readinessSlices
      .filter((s) => s.value > 0)
      .map((s) => ({ ...s, color: nameToColor[s.name] || READINESS_COLORS[0] }))
  }, [readinessSlices])

  const allResourceRows = useMemo(() => {
    if (presentationMode && showResources) {
      return PRESENTATION_RESOURCE_DEMO.map((r) => ({
        ...r,
        university: r.universityShort,
      }))
    }
    return (Array.isArray(data) ? data : [])
      .filter((u) => u && u.total_staff !== undefined)
      .sort((a, b) => (b.total_staff || 0) - (a.total_staff || 0))
      .map((u) => {
        const fullRaw = u.university_name ?? 'Unknown'
        const full = typeof fullRaw === 'string' ? fullRaw : String(fullRaw)
        const shortRaw =
          u.university_short_name != null && u.university_short_name !== ''
            ? u.university_short_name
            : full
        const short =
          typeof shortRaw === 'string' ? shortRaw : String(shortRaw)
        return {
          university_id: u.university_id ?? u.id,
          university: truncateLabel(short, 22),
          universityFull: full,
          universityShort: short,
          staff: u.total_staff || 0,
          faculties: u.total_faculties || 0,
          staff_male: Number(u.staff_male) || 0,
          staff_female: Number(u.staff_female) || 0,
          staff_unknown: Number(u.staff_unknown) || 0,
        }
      })
  }, [data, presentationMode, showResources])

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(allResourceRows.length / PAGE_SIZE) - 1)
    if (resourcePage > maxPage) setResourcePage(maxPage)
  }, [allResourceRows.length, resourcePage])

  const resourcePageCount = Math.max(1, Math.ceil(allResourceRows.length / PAGE_SIZE) || 1)
  const visibleResourceRows = useMemo(() => {
    const start = resourcePage * PAGE_SIZE
    return allResourceRows.slice(start, start + PAGE_SIZE).map((r) => ({
      ...r,
      university: r.university,
    }))
  }, [allResourceRows, resourcePage])

  const maxStaffAll = allResourceRows.length
    ? Math.max(
        1,
        ...allResourceRows.map((d) => {
          const n = Number(d.staff)
          return Number.isFinite(n) && n >= 0 ? n : 0
        })
      )
    : 1
  const xAxisDomainMax = Number.isFinite(Math.ceil(maxStaffAll * 1.08))
    ? Math.ceil(maxStaffAll * 1.08)
    : 1

  const provinceGenderTotals = useMemo(() => {
    let male = 0
    let female = 0
    let unknown = 0
    for (const r of allResourceRows) {
      male += r.staff_male ?? 0
      female += r.staff_female ?? 0
      unknown += r.staff_unknown ?? 0
    }
    const total = male + female + unknown
    return { male, female, unknown, total }
  }, [allResourceRows])

  const hoveredRow = useMemo(() => {
    if (hoveredUniversityId == null) return null
    return allResourceRows.find((r) => String(r.university_id) === String(hoveredUniversityId)) || null
  }, [allResourceRows, hoveredUniversityId])

  const glanceRows = useMemo(() => {
    return visibleResourceRows.slice(0, 5).map((item) => ({
      item,
      insight: getResourceInsightForItem({ staff: item.staff, faculties: item.faculties }),
    }))
  }, [visibleResourceRows])

  const sharedGlanceInsight = useMemo(() => {
    const texts = glanceRows.map((r) => r.insight.insight).filter(Boolean)
    if (texts.length < 2) return null
    const first = texts[0]
    return texts.every((t) => t === first) ? first : null
  }, [glanceRows])

  const animActive = !reducedMotion

  /** U&B overview: readiness + resources shown together — gender panel sits under readiness (left column). */
  const overviewPairLayout = showBoards && showResources

  return (
    <div
      className={
        overviewPairLayout
          ? 'grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-stretch'
          : 'space-y-6'
      }
    >
      {overviewPairLayout && (
        <div className="flex min-h-0 flex-col gap-6 lg:col-span-1">
          <ReadinessBlock
            readinessSlices={readinessSlices}
            readinessPieData={readinessPieData}
            animActive={animActive}
            reducedMotion={reducedMotion}
          />
          {visibleResourceRows.length > 0 && (
            <motion.div
              initial={reducedMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
              className="min-h-[11rem] w-full rounded-xl border-2 border-indigo-200/85 bg-gradient-to-br from-indigo-50/90 via-violet-50/50 to-white p-4 shadow-md ring-1 ring-indigo-100/60 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-500/15"
            >
              <div className="mb-2 flex items-center gap-2 text-indigo-900">
                <Users className="h-4 w-4 text-indigo-600" />
                <span className="text-xs font-bold uppercase tracking-wide text-indigo-800/90">
                  Staff gender split
                </span>
              </div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={hoveredUniversityId ?? 'province-avg'}
                  className="min-h-[9rem]"
                  initial={reducedMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reducedMotion ? false : { opacity: 0, y: -6 }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                >
                  {hoveredRow ? (
                    <>
                      <p className="mb-1 text-sm font-semibold leading-snug text-slate-900">
                        {hoveredRow.universityFull}
                      </p>
                      <p className="mb-3 text-[11px] text-indigo-700/80">
                        Recorded genders for staff at this university.
                      </p>
                      <GenderBreakdownBars
                        male={hoveredRow.staff_male}
                        female={hoveredRow.staff_female}
                        unknown={hoveredRow.staff_unknown}
                        total={hoveredRow.staff_male + hoveredRow.staff_female + hoveredRow.staff_unknown}
                      />
                    </>
                  ) : (
                    <>
                      <p className="mb-2 text-xs italic text-slate-500">
                        Hover a university on the staff chart (right).
                      </p>
                      <p className="mb-0.5 text-sm font-semibold text-slate-900">Comparative average (province-wide)</p>
                      <p className="mb-3 text-[11px] text-indigo-700/80">
                        Aggregated across all {allResourceRows.length} registered universities in this view. Hover a bar on
                        the chart to compare a single institution.
                      </p>
                      <GenderBreakdownBars
                        male={provinceGenderTotals.male}
                        female={provinceGenderTotals.female}
                        unknown={provinceGenderTotals.unknown}
                        total={provinceGenderTotals.total}
                      />
                    </>
                  )}
                </motion.div>
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      )}

      {!overviewPairLayout && showBoards && (
        <ReadinessBlock
          readinessSlices={readinessSlices}
          readinessPieData={readinessPieData}
          animActive={animActive}
          reducedMotion={reducedMotion}
        />
      )}

      {showResources && (
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
          className={`rounded-xl border border-slate-200 border-l-4 border-l-blue-500 bg-gradient-to-br from-white to-blue-50/30 p-5 shadow-sm${
            overviewPairLayout ? ' min-h-0 lg:col-span-2' : ''
          }`}
        >
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              Staff & faculties comparison
            </h3>
            {presentationMode && (
              <span className="rounded border border-amber-200 bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
                Presentation mode
              </span>
            )}
          </div>
          <p className="mb-1 text-xs text-slate-500">
            <span className="font-medium text-blue-700">Blue</span> bars = total staff (people).{' '}
            <span className="font-medium text-emerald-700">Green</span> bars = faculty units (organizational).{' '}
            {overviewPairLayout
              ? 'Hover a row for the full university name; staff gender updates in the card under setup & readiness.'
              : 'Hover a row for the full university name and staff gender split (violet panel).'}
          </p>

          {visibleResourceRows.length > 0 ? (
            <>
              <div className="grid gap-6 lg:grid-cols-5 lg:gap-8">
                <div
                  className="min-h-0 lg:col-span-3"
                  onMouseLeave={clearHoverSoon}
                >
                  <div
                    style={{ height: Math.min(560, Math.max(280, visibleResourceRows.length * 52 + 100)) }}
                    className="w-full min-h-[280px] min-w-0 rounded-lg border border-slate-100 bg-gradient-to-b from-slate-50/60 to-white p-2"
                  >
                    <ResponsiveContainer
                      width="100%"
                      height="100%"
                      minHeight={280}
                      minWidth={0}
                    >
                      <BarChart
                        layout="vertical"
                        data={visibleResourceRows}
                        margin={{ top: 8, right: 20, left: 8, bottom: 12 }}
                        barCategoryGap={10}
                      >
                        <defs>
                          <linearGradient id="gcStaffTri" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#60a5fa" />
                            <stop offset="55%" stopColor="#3b82f6" />
                            <stop offset="100%" stopColor="#1d4ed8" />
                          </linearGradient>
                          <linearGradient id="gcFacTri" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#6ee7b7" />
                            <stop offset="50%" stopColor="#10b981" />
                            <stop offset="100%" stopColor="#047857" />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" horizontal className="stroke-slate-200" />
                        <XAxis
                          type="number"
                          tick={{ fontSize: 11, fill: '#64748b' }}
                          allowDecimals={false}
                          domain={[0, xAxisDomainMax]}
                        />
                        <YAxis
                          type="category"
                          dataKey="university"
                          width={124}
                          tick={(props) => {
                            const { x, y, payload } = props
                            const row = visibleResourceRows.find((r) => r.university === payload.value)
                            const full = row?.universityFull || payload.value
                            const shown = truncateLabel(payload.value, 18)
                            return (
                              <g transform={`translate(${x},${y})`}>
                                <title>{full}</title>
                                <text
                                  textAnchor="end"
                                  x={-6}
                                  y={4}
                                  fontSize={11}
                                  fill="#334155"
                                  className="font-medium"
                                >
                                  {shown}
                                </text>
                              </g>
                            )
                          }}
                        />
                        <Tooltip
                          content={<ResourceTooltip presentationMode={presentationMode} />}
                          cursor={{ fill: 'rgb(241 245 249 / 0.65)' }}
                        />
                        <Bar
                          dataKey="staff"
                          name="Staff (people)"
                          fill="url(#gcStaffTri)"
                          radius={[0, 5, 5, 0]}
                          isAnimationActive={animActive}
                          animationDuration={reducedMotion ? 0 : 480}
                          onMouseEnter={(_, i) => {
                            const r = visibleResourceRows[i]
                            if (r?.university_id != null) setHoverNow(r.university_id)
                          }}
                        />
                        <Bar
                          dataKey="faculties"
                          name="Faculties (units)"
                          fill="url(#gcFacTri)"
                          radius={[0, 5, 5, 0]}
                          isAnimationActive={animActive}
                          animationDuration={reducedMotion ? 0 : 480}
                          onMouseEnter={(_, i) => {
                            const r = visibleResourceRows[i]
                            if (r?.university_id != null) setHoverNow(r.university_id)
                          }}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                    <div
                      className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 pt-2 text-xs font-medium text-slate-700"
                      style={{ transform: 'translateX(calc((124px + 8px - 20px) / 2))' }}
                    >
                      <span className="inline-flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-sm shadow-sm border border-blue-700/20"
                          style={{ background: 'linear-gradient(90deg, #60a5fa, #1d4ed8)' }}
                          aria-hidden
                        />
                        Staff (people)
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-sm shadow-sm border border-emerald-700/20"
                          style={{ background: 'linear-gradient(90deg, #6ee7b7, #047857)' }}
                          aria-hidden
                        />
                        Faculties (units)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-2">
                  <div className="mb-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">At a glance</p>
                    <p className="mt-0.5 text-[11px] leading-snug text-slate-400">
                      Top five on this chart page — numbers match the bars.
                    </p>
                  </div>
                  <div className="space-y-3">
                    {glanceRows.map(({ item, insight }, index) => {
                      const band = insight.densityBand
                      const borderAccent =
                        band && DENSITY_BAND_BORDER[band] ? DENSITY_BAND_BORDER[band] : 'border-l-slate-200'
                      const showCardInsight = insight.insight && !sharedGlanceInsight
                      return (
                        <motion.div
                          key={`${item.university_id}-${resourcePage}-${index}`}
                          initial={reducedMotion ? false : { opacity: 0, x: 8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{
                            duration: 0.35,
                            ease: [0.22, 1, 0.36, 1],
                            delay: reducedMotion ? 0 : index * 0.04,
                          }}
                          className={`rounded-xl border border-slate-200/80 bg-white pl-3.5 pr-3 py-3 shadow-sm transition-shadow hover:border-slate-300/90 hover:shadow-md border-l-[3px] ${borderAccent}`}
                        >
                          <p className="text-[15px] font-semibold leading-snug text-slate-900 line-clamp-2">
                            {item.universityFull || item.university}
                          </p>
                          <div className="mt-2.5 flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold tabular-nums text-blue-900 ring-1 ring-blue-100/80">
                              <Users className="h-3.5 w-3.5 text-blue-600 opacity-80" aria-hidden />
                              {item.staff} staff
                            </span>
                            <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold tabular-nums text-emerald-900 ring-1 ring-emerald-100/80">
                              <GraduationCap className="h-3.5 w-3.5 text-emerald-600 opacity-80" aria-hidden />
                              {item.faculties} faculties
                            </span>
                          </div>
                          {insight.ratio && (
                            <p className="mt-2 text-[11px] leading-relaxed text-slate-500">{insight.ratio}</p>
                          )}
                          {insight.summary && !insight.ratio && (
                            <p className="mt-2 text-[11px] text-slate-600">{insight.summary}</p>
                          )}
                          {showCardInsight && (
                            <p className="mt-2 border-t border-slate-100 pt-2 text-[11px] leading-relaxed text-slate-500">
                              {insight.insight}
                            </p>
                          )}
                        </motion.div>
                      )
                    })}
                  </div>
                  {sharedGlanceInsight && (
                    <p className="mt-3 rounded-lg bg-slate-50/90 px-3 py-2 text-[11px] leading-relaxed text-slate-600 ring-1 ring-slate-100">
                      <span className="font-medium text-slate-700">Note for all listed: </span>
                      {sharedGlanceInsight}
                    </p>
                  )}
                </div>
              </div>

              <div
                className={
                  overviewPairLayout
                    ? 'mt-5 flex justify-end sm:pb-1'
                    : 'mt-5 flex flex-col gap-4 sm:flex-row sm:items-stretch sm:justify-between'
                }
              >
                {!overviewPairLayout && (
                  <div className="min-w-0 flex-1 max-w-lg">
                    <div className="min-h-[11rem] rounded-xl border border-indigo-200/80 bg-gradient-to-br from-indigo-50/90 via-violet-50/50 to-white p-4 shadow-sm ring-1 ring-indigo-100/60">
                      <div className="mb-2 flex items-center gap-2 text-indigo-900">
                        <Users className="h-4 w-4 text-indigo-600" />
                        <span className="text-xs font-bold uppercase tracking-wide text-indigo-800/90">
                          Staff gender split
                        </span>
                      </div>
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={hoveredUniversityId ?? 'province-avg'}
                          className="min-h-[9rem]"
                          initial={reducedMotion ? false : { opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={reducedMotion ? false : { opacity: 0, y: -6 }}
                          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                        >
                          {hoveredRow ? (
                            <>
                              <p className="mb-1 text-sm font-semibold leading-snug text-slate-900">
                                {hoveredRow.universityFull}
                              </p>
                              <p className="mb-3 text-[11px] text-indigo-700/80">
                                Recorded genders for staff at this university.
                              </p>
                              <GenderBreakdownBars
                                male={hoveredRow.staff_male}
                                female={hoveredRow.staff_female}
                                unknown={hoveredRow.staff_unknown}
                                total={hoveredRow.staff_male + hoveredRow.staff_female + hoveredRow.staff_unknown}
                              />
                            </>
                          ) : (
                            <>
                              <p className="mb-2 text-xs italic text-slate-500">Hover a university on the chart.</p>
                              <p className="mb-0.5 text-sm font-semibold text-slate-900">Comparative average (province-wide)</p>
                              <p className="mb-3 text-[11px] text-indigo-700/80">
                                Aggregated across all {allResourceRows.length} registered universities in this view. Hover a
                                bar above to compare a single institution.
                              </p>
                              <GenderBreakdownBars
                                male={provinceGenderTotals.male}
                                female={provinceGenderTotals.female}
                                unknown={provinceGenderTotals.unknown}
                                total={provinceGenderTotals.total}
                              />
                            </>
                          )}
                        </motion.div>
                      </AnimatePresence>
                    </div>
                  </div>
                )}

                <div className="flex flex-shrink-0 items-end justify-end sm:pb-1">
                  <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50/90 p-1 shadow-sm">
                    <button
                      type="button"
                      disabled={resourcePage <= 0}
                      onClick={() => setResourcePage((p) => Math.max(0, p - 1))}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-transparent text-slate-700 transition-colors hover:bg-white hover:border-slate-200 hover:shadow-sm disabled:opacity-40 disabled:pointer-events-none focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                      aria-label="Previous page"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <span className="min-w-[7.5rem] px-2 text-center text-xs font-semibold tabular-nums text-slate-600">
                      Page {resourcePage + 1} of {resourcePageCount}
                    </span>
                    <button
                      type="button"
                      disabled={resourcePage >= resourcePageCount - 1}
                      onClick={() => setResourcePage((p) => Math.min(resourcePageCount - 1, p + 1))}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-transparent text-slate-700 transition-colors hover:bg-white hover:border-slate-200 hover:shadow-sm disabled:opacity-40 disabled:pointer-events-none focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                      aria-label="Next page"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex h-[240px] items-center justify-center text-slate-400">
              <div className="text-center">
                <BarChart3 className="mx-auto mb-2 h-12 w-12 opacity-50" />
                <p className="font-medium">Data unavailable</p>
                <p className="mt-1 text-xs">No resource metrics in analytics yet.</p>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  )
}

export default GovernanceCharts
