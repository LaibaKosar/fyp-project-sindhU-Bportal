import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ChevronDown, MapPin, Search } from 'lucide-react'

/** Region keys used by filter chips and aggregation */
export const REGION_KEYS = ['karachi', 'sukkur', 'hyderabad', 'larkana', 'others']

export const REGION_LABELS = {
  karachi: 'Karachi',
  sukkur: 'Sukkur',
  hyderabad: 'Hyderabad',
  larkana: 'Larkana',
  others: 'Other regions',
}

const REGION_CHART_COLORS = ['#2563eb', '#059669', '#d97706', '#7c3aed', '#64748b']

/**
 * Infer administrative region from university name only (ub_analytics_hub has no city column).
 */
export function inferRegionFromUniversityName(name) {
  if (!name || typeof name !== 'string') return 'others'
  const n = name.toLowerCase()

  const matches = (patterns) => patterns.some((p) => n.includes(p))

  if (
    matches([
      'karachi',
      'lyari',
      'ned university',
      'dow university',
      'dawood university',
      'jinnah sindh medical',
      'sindh madressatul islam',
      'szabul',
      'zulfiqar ali bhutto university of law',
      'karachi metropolitan',
    ])
  ) {
    return 'karachi'
  }

  if (
    matches([
      'larkana',
      'larkano',
      'shaheed allah bukhsh soomro',
      'dadu',
      'mohtarma benazir bhutto medical university',
    ])
  ) {
    return 'larkana'
  }

  if (
    matches([
      'hyderabad',
      'jamshoro',
      'mehran university',
      'university of sindh',
      'liaquat university of medical',
      'sindh agriculture university',
      'sufism & modern sciences',
      'sufism and modern sciences',
    ])
  ) {
    return 'hyderabad'
  }

  if (
    matches([
      'sukkur',
      'shah abdul latif university',
      'khairpur',
      'benazirabad',
      'nawabshah',
      'shaikh ayaz',
      'aror university',
      'begum nusrat bhutto',
      'quaid-e-awam university',
      'veterinary & animal sciences',
    ])
  ) {
    return 'sukkur'
  }

  return 'others'
}

function isActiveRow(row, simulationMode) {
  return simulationMode || row.hasFocalPerson || row.setup_status === 'Active'
}

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

function RegionBarTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-slate-900">{row.name}</p>
      <p className="tabular-nums text-slate-600">{row.count} universities</p>
      <p className="mt-1 text-[10px] text-slate-400">Click the bar to filter</p>
    </div>
  )
}

export default function RegisteredUniversitiesByRegion({
  data = [],
  selectedDivision = 'all',
  onSelectDivision,
  searchQuery = '',
  onSearchChange,
  simulationMode = false,
}) {
  const reducedMotion = usePrefersReducedMotion()
  const [expandedRegion, setExpandedRegion] = useState(null)

  const rows = useMemo(() => {
    if (!Array.isArray(data)) return []
    const q = (searchQuery || '').trim().toLowerCase()
    return data.map((row) => {
      const raw = row.university_name ?? row.name ?? ''
      const name = typeof raw === 'string' ? raw : String(raw)
      const region = inferRegionFromUniversityName(name)
      return {
        ...row,
        university_name: name,
        region,
        matchesSearch: !q || name.toLowerCase().includes(q),
      }
    })
  }, [data, searchQuery])

  const byRegion = useMemo(() => {
    const map = { karachi: [], sukkur: [], hyderabad: [], larkana: [], others: [] }
    rows.forEach((r) => {
      map[r.region].push(r)
    })
    return map
  }, [rows])

  const counts = useMemo(() => {
    const c = {}
    REGION_KEYS.forEach((k) => {
      c[k] = byRegion[k].length
    })
    return c
  }, [byRegion])

  const chartRows = useMemo(
    () =>
      REGION_KEYS.map((key, i) => ({
        key,
        name: REGION_LABELS[key],
        count: counts[key],
        fill: REGION_CHART_COLORS[i % REGION_CHART_COLORS.length],
      })),
    [counts]
  )

  const maxCount = useMemo(() => Math.max(1, ...REGION_KEYS.map((k) => counts[k])), [counts])

  const filteredRows = useMemo(() => {
    if (selectedDivision === 'all') return rows.filter((r) => r.matchesSearch)
    return rows.filter((r) => r.region === selectedDivision && r.matchesSearch)
  }, [rows, selectedDivision])

  const totalUniversities = rows.length
  const totalActive = useMemo(
    () => rows.filter((r) => isActiveRow(r, simulationMode)).length,
    [rows, simulationMode]
  )

  useEffect(() => {
    if (selectedDivision !== 'all') {
      setExpandedRegion(selectedDivision)
    }
  }, [selectedDivision])

  const toggleRegion = (key) => {
    setExpandedRegion((prev) => (prev === key ? null : key))
  }

  const handleBarClick = (entry) => {
    if (!entry?.key) return
    onSelectDivision?.(entry.key)
    setExpandedRegion(entry.key)
  }

  const universitiesForAccordion = (key) => {
    const list = [...(byRegion[key] || [])].sort((a, b) =>
      (a.university_name || '').localeCompare(b.university_name || '')
    )
    return searchQuery.trim() ? list.filter((r) => r.matchesSearch) : list
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-6 lg:grid-cols-2 lg:items-stretch">
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="min-h-[240px] rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50/80 to-white p-4 shadow-sm"
        >
          <div className="mb-2 flex items-center gap-2 text-slate-900">
            <MapPin className="h-4 w-4 text-blue-600" />
            <h4 className="text-sm font-semibold">Distribution by inferred region</h4>
          </div>
          <p className="mb-3 text-xs text-slate-500">
            Based on university name keywords (not GPS). Select a bar to focus that region below.
          </p>
          <div className="h-[220px] w-full min-h-[220px] min-w-0">
            <ResponsiveContainer width="100%" height={220} minHeight={220} minWidth={0}>
              <BarChart layout="vertical" data={chartRows} margin={{ top: 4, right: 12, left: 4, bottom: 4 }}>
                <defs>
                  {chartRows.map((r, i) => (
                    <linearGradient key={r.key} id={`rgGrad-${r.key}`} x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor={r.fill} stopOpacity={0.85} />
                      <stop offset="100%" stopColor={r.fill} stopOpacity={1} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" horizontal className="stroke-slate-200" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} domain={[0, maxCount]} />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11, fill: '#334155' }} />
                <Tooltip content={<RegionBarTooltip />} cursor={{ fill: 'rgb(241 245 249 / 0.5)' }} />
                <Bar
                  dataKey="count"
                  radius={[0, 6, 6, 0]}
                  isAnimationActive={!reducedMotion}
                  animationDuration={reducedMotion ? 0 : 520}
                  className="cursor-pointer"
                >
                  {chartRows.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={`url(#rgGrad-${entry.key})`}
                      stroke={selectedDivision === entry.key ? '#1d4ed8' : 'transparent'}
                      strokeWidth={selectedDivision === entry.key ? 2 : 0}
                      style={{
                        filter: 'drop-shadow(0 1px 2px rgb(15 23 42 / 0.08))',
                        cursor: 'pointer',
                      }}
                      onClick={() => handleBarClick(entry)}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: reducedMotion ? 0 : 0.06 }}
          className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <label className="mb-2 block text-xs font-medium text-slate-600">Search universities</label>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder="Filter by name…"
              className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-3 text-sm text-slate-900 transition-shadow placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Region filter</p>
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'all', label: 'All regions' },
              ...REGION_KEYS.map((k) => ({ id: k, label: REGION_LABELS[k] })),
            ].map((chip) => {
              const active = selectedDivision === chip.id
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => {
                    onSelectDivision?.(chip.id)
                    if (chip.id === 'all') setExpandedRegion(null)
                  }}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                    active
                      ? 'bg-blue-600 text-white shadow-md hover:shadow-md'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:shadow-sm'
                  }`}
                >
                  {chip.label}
                </button>
              )
            })}
          </div>
          <div className="mt-4 border-t border-slate-100 pt-4 text-xs text-slate-600">
            <span className="font-semibold text-slate-800">{totalActive}</span> with active focal account
            {simulationMode ? ' (demo)' : ''}
            <span className="mx-2 text-slate-300">·</span>
            <span className="font-semibold text-slate-800">{filteredRows.length}</span> match filters
            <span className="mx-2 text-slate-300">·</span>
            <span className="font-semibold text-slate-800">{totalUniversities}</span> total
          </div>
        </motion.div>
      </div>

      <div>
        <h4 className="mb-3 text-sm font-semibold text-slate-900">Universities by region</h4>
        <p className="mb-4 text-xs text-slate-500">
          Expand a region to browse institutions in a compact grid. No empty sidebar — the list lives under the chart.
        </p>
        <ul className="space-y-2">
          {REGION_KEYS.map((key, regionIndex) => {
            const list = universitiesForAccordion(key)
            const isDimmed = selectedDivision !== 'all' && selectedDivision !== key
            const isOpen = expandedRegion === key
            const count = counts[key]

            if (selectedDivision !== 'all' && selectedDivision !== key) {
              return null
            }

            return (
              <motion.li
                key={key}
                initial={reducedMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: isDimmed ? 0.45 : 1, y: 0 }}
                transition={{
                  duration: 0.35,
                  ease: [0.22, 1, 0.36, 1],
                  delay: reducedMotion ? 0 : regionIndex * 0.03,
                }}
                className={`overflow-hidden rounded-xl border transition-colors ${
                  isOpen ? 'border-blue-200 bg-blue-50/30 shadow-sm' : 'border-slate-200 bg-white'
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleRegion(key)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors transition-shadow hover:bg-slate-50/80 hover:shadow-[inset_0_1px_0_0_rgb(241_245_249)] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
                >
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full shadow-sm"
                      style={{ backgroundColor: REGION_CHART_COLORS[regionIndex % REGION_CHART_COLORS.length] }}
                    />
                    <span className="font-semibold text-slate-900">{REGION_LABELS[key]}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium tabular-nums text-slate-600">
                      {count}
                    </span>
                  </span>
                  <motion.span animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: reducedMotion ? 0 : 0.25 }}>
                    <ChevronDown className="h-5 w-5 text-slate-400" />
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={reducedMotion ? false : { height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={reducedMotion ? false : { height: 0, opacity: 0 }}
                      transition={{ duration: reducedMotion ? 0 : 0.28, ease: 'easeOut' }}
                      className="border-t border-slate-100"
                    >
                      <div className="max-h-[min(52vh,420px)] overflow-y-auto p-4">
                        {list.length === 0 ? (
                          <p className="text-sm text-slate-500">No universities match the current search.</p>
                        ) : (
                          <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                            {list.map((u, i) => {
                              const active = isActiveRow(u, simulationMode)
                              return (
                                <motion.li
                                  key={u.university_id || u.id || u.university_name}
                                  initial={reducedMotion ? false : { opacity: 0, y: 4 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{
                                    duration: 0.25,
                                    delay: reducedMotion ? 0 : Math.min(i, 12) * 0.02,
                                  }}
                                  className="rounded-lg border border-slate-200/90 bg-white px-3 py-2.5 text-sm shadow-sm transition-shadow hover:shadow-md"
                                >
                                  <div className="font-medium leading-snug text-slate-900">{u.university_name}</div>
                                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                                    <span
                                      className={`inline-flex rounded px-1.5 py-0.5 text-xs font-medium ${
                                        active ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600'
                                      }`}
                                    >
                                      {active ? 'Active' : 'Setup pending'}
                                    </span>
                                    {selectedDivision === 'all' && (
                                      <span className="text-xs text-slate-400">{REGION_LABELS[u.region]}</span>
                                    )}
                                  </div>
                                </motion.li>
                              )
                            })}
                          </ul>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
