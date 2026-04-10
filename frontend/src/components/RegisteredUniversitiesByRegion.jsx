import { useMemo } from 'react'
import { motion } from 'framer-motion'

/** Region keys used by filter chips and aggregation */
export const REGION_KEYS = ['karachi', 'sukkur', 'hyderabad', 'larkana', 'others']

export const REGION_LABELS = {
  karachi: 'Karachi',
  sukkur: 'Sukkur',
  hyderabad: 'Hyderabad',
  larkana: 'Larkana',
  others: 'Other regions',
}

/**
 * Infer administrative region from university name only (ub_analytics_hub has no city column).
 * First matching rule wins; patterns are lowercase substrings of the official name.
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

export default function RegisteredUniversitiesByRegion({
  data = [],
  selectedDivision = 'all',
  onSelectDivision,
  searchQuery = '',
  simulationMode = false,
}) {
  const rows = useMemo(() => {
    if (!Array.isArray(data)) return []
    const q = (searchQuery || '').trim().toLowerCase()
    return data.map((row) => {
      const name = row.university_name || row.name || ''
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
    const map = {
      karachi: [],
      sukkur: [],
      hyderabad: [],
      larkana: [],
      others: [],
    }
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

  const panelTitle =
    selectedDivision === 'all' ? 'All regions' : REGION_LABELS[selectedDivision] || 'Region'
  const panelCount =
    selectedDivision === 'all' ? totalUniversities : counts[selectedDivision] ?? 0

  const panelUniversities = useMemo(() => {
    if (selectedDivision === 'all') {
      return [...rows].sort((a, b) =>
        (a.university_name || '').localeCompare(b.university_name || '')
      )
    }
    return [...(byRegion[selectedDivision] || [])].sort((a, b) =>
      (a.university_name || '').localeCompare(b.university_name || '')
    )
  }, [selectedDivision, rows, byRegion])

  const visiblePanelList = searchQuery.trim()
    ? panelUniversities.filter((r) => r.matchesSearch)
    : panelUniversities

  return (
    <div className="flex flex-col lg:flex-row gap-6 min-h-[360px] lg:min-h-[420px]">
      <div className="flex-1 min-w-0 flex flex-col">
        <p className="text-xs text-slate-500 mb-3">
          Counts by inferred region from registered university names (no geographic map).
        </p>
        <ul className="space-y-3 flex-1">
          {REGION_KEYS.map((key, index) => {
            const count = counts[key]
            const pct = maxCount ? (count / maxCount) * 100 : 0
            const isSelected = selectedDivision === 'all' || selectedDivision === key
            const dimmed = selectedDivision !== 'all' && selectedDivision !== key

            return (
              <li key={key}>
                <button
                  type="button"
                  onClick={() => onSelectDivision?.(key)}
                  className={`w-full text-left rounded-lg border transition-colors ${
                    selectedDivision === key
                      ? 'border-blue-500 bg-blue-50/80 ring-1 ring-blue-200'
                      : dimmed
                        ? 'border-slate-100 bg-slate-50/50 opacity-60'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80'
                  } px-3 py-2.5`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span
                      className={`text-sm font-medium ${isSelected ? 'text-slate-900' : 'text-slate-600'}`}
                    >
                      {REGION_LABELS[key]}
                    </span>
                    <span className="text-sm font-semibold tabular-nums text-slate-900">{count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-600"
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: index * 0.04 }}
                    />
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
          <span>
            <span className="font-semibold text-slate-800">{totalActive}</span> with active focal
            account
            {simulationMode ? ' (demo: all active)' : ''}
          </span>
          <span className="text-slate-300 hidden sm:inline">|</span>
          <span>
            <span className="font-semibold text-slate-800">{filteredRows.length}</span> match
            filters
          </span>
        </div>
      </div>

      <div className="w-full lg:w-[min(100%,380px)] lg:flex-shrink-0 flex flex-col rounded-xl border border-slate-200 bg-slate-50/80 p-4">
        <div className="mb-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Details</p>
          <h4 className="text-lg font-semibold text-slate-900 mt-0.5">{panelTitle}</h4>
          <p className="text-sm text-slate-600 mt-1">
            <span className="font-semibold text-slate-800">{panelCount}</span> universities
            {selectedDivision === 'all' ? ' registered' : ` in ${REGION_LABELS[selectedDivision]}`}
          </p>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto pr-1 -mr-1 max-h-[280px] lg:max-h-none">
          {visiblePanelList.length === 0 ? (
            <p className="text-sm text-slate-500 py-4">No universities match the current filters.</p>
          ) : (
            <ul className="space-y-2">
              {visiblePanelList.map((u) => {
                const active = isActiveRow(u, simulationMode)
                return (
                  <li
                    key={u.university_id || u.id || u.university_name}
                    className="rounded-lg bg-white border border-slate-200/80 px-3 py-2 text-sm"
                  >
                    <div className="font-medium text-slate-900 leading-snug">{u.university_name}</div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                      <span
                        className={`inline-flex items-center rounded px-1.5 py-0.5 font-medium ${
                          active ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {active ? 'Active' : 'Setup pending'}
                      </span>
                      {selectedDivision === 'all' && (
                        <span className="text-slate-400">{REGION_LABELS[u.region]}</span>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
