import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  Legend
} from 'recharts'
import { Info } from 'lucide-react'

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']

const RADIAN = Math.PI / 180
function PieSliceLabel({ cx, cy, midAngle, outerRadius, percent, name }) {
  const radius = outerRadius + 24
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  return (
    <text
      x={x}
      y={y}
      fill="#334155"
      textAnchor={x >= cx ? 'start' : 'end'}
      dominantBaseline="central"
      fontSize={11}
    >
      {`${name} ${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

function ChartInfoCard({ title, insights, children, className = '' }) {
  const [show, setShow] = useState(false)
  return (
    <div
      className={`relative overflow-visible ${className}`}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={(e) => {
        // Only hide when the cursor actually leaves the whole card (including the tooltip),
        // not when moving between the chart area and the floating info panel.
        if (!(e.relatedTarget instanceof Node)) {
          setShow(false)
          return
        }
        if (!e.currentTarget.contains(e.relatedTarget)) {
          setShow(false)
        }
      }}
    >
      {show && (
        <div className="absolute right-0 top-12 z-20 w-[min(100%,280px)] max-h-48 overflow-y-auto p-3 rounded-xl bg-slate-900 text-white text-sm shadow-xl border border-slate-700">
          <div className="font-semibold text-slate-100 mb-1.5 text-xs">{title}</div>
          <ul className="text-slate-300 text-xs leading-relaxed space-y-1 list-disc list-inside">
            {insights.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="absolute top-2 right-2 z-10 flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 text-slate-500 pointer-events-none">
        <Info className="w-4 h-4" />
      </div>
      {children}
    </div>
  )
}

class ChartErrorBoundary extends React.Component {
  state = { hasError: false }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  componentDidCatch(err, info) {
    console.error('Landing chart error:', err, info)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="h-[280px] flex items-center justify-center bg-slate-50 rounded-xl border border-slate-200">
          <p className="text-slate-500 text-sm">Chart unavailable</p>
        </div>
      )
    }
    return this.props.children
  }
}

// Normalize city_distribution to { name, value }[]
function normalizeCityDistribution(raw) {
  if (!raw || !Array.isArray(raw)) return []
  return raw.map((item) => {
    if (item && typeof item.name !== 'undefined' && typeof item.value !== 'undefined') return item
    if (item && (item.city !== undefined || item.name) && (item.count !== undefined || item.value !== undefined || item.uni_count !== undefined)) {
      return { name: item.city ?? item.name ?? 'Unknown', value: Number(item.uni_count ?? item.count ?? item.value ?? 0) }
    }
    return null
  }).filter(Boolean)
}

// Normalize gender_data to { name, value }[] (supports array or object { total_male, total_female })
function normalizeGenderData(raw) {
  if (!raw) return []
  if (typeof raw === 'object' && !Array.isArray(raw) && (raw.total_male != null || raw.total_female != null)) {
    const male = Number(raw.total_male ?? 0)
    const female = Number(raw.total_female ?? 0)
    return [
      { name: 'Male', value: male },
      { name: 'Female', value: female }
    ].filter((d) => d.value > 0)
  }
  if (!Array.isArray(raw)) return []
  return raw.map((item) => {
    if (item && typeof item.name !== 'undefined' && typeof item.value !== 'undefined') return item
    if (item && (item.gender !== undefined || item.name) && (item.count !== undefined || item.value !== undefined)) {
      return { name: item.gender ?? item.name ?? 'Unknown', value: Number(item.count ?? item.value ?? 0) }
    }
    return null
  }).filter(Boolean)
}

// Compliance: { total, compliant }, { total_unis, compliant_unis }, or { compliant_percent }
function getComplianceStats(raw) {
  if (!raw || typeof raw !== 'object') return { total: 0, compliant: 0, percent: 0 }
  const total = Number(raw.total ?? raw.total_unis ?? 0)
  const compliant = Number(raw.compliant ?? raw.compliant_unis ?? 0)
  const percent = raw.compliant_percent != null ? Number(raw.compliant_percent) : (total > 0 ? Math.round((compliant / total) * 100) : 0)
  return { total, compliant, percent }
}

function CityDistributionChart({ data, onHoverCity }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const series = normalizeCityDistribution(data)
  if (!mounted) return <div className="h-[280px] flex items-center justify-center text-slate-400 text-sm">Loading...</div>
  if (series.length === 0) {
    return (
      <div className="h-[280px] flex items-center justify-center bg-white rounded-xl border border-slate-200">
        <p className="text-slate-500 text-sm">No city distribution data yet</p>
      </div>
    )
  }
  return (
    <ChartErrorBoundary>
      <div className="w-full h-[420px] min-h-[300px]">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <PieChart>
            <Pie
              data={series}
              dataKey="value"
              nameKey="name"
              cx="42%"
              cy="52%"
              outerRadius={148}
              stroke="#fff"
              strokeWidth={2}
              labelLine={{ stroke: '#94a3b8', strokeWidth: 1 }}
              label={PieSliceLabel}
              onMouseEnter={(_, index) => {
                if (onHoverCity) onHoverCity(series[index] || null)
              }}
              onMouseLeave={() => {
                if (onHoverCity) onHoverCity(null)
              }}
            >
              {series.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => [value, 'Universities']} contentStyle={{ fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} formatter={(value) => <span style={{ color: '#334155' }}>{value}</span>} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </ChartErrorBoundary>
  )
}

function GenderRatioChart({ data }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const series = normalizeGenderData(data)
  if (!mounted) return <div className="h-[280px] flex items-center justify-center text-slate-400 text-sm">Loading...</div>
  if (series.length === 0) {
    return (
      <div className="h-[280px] flex items-center justify-center bg-white rounded-xl border border-slate-200">
        <p className="text-slate-500 text-sm">No gender data yet</p>
      </div>
    )
  }
  return (
    <ChartErrorBoundary>
      <div className="w-full h-[420px] min-h-[300px]">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <PieChart>
            <Pie
              data={series}
              dataKey="value"
              nameKey="name"
              cx="42%"
              cy="52%"
              innerRadius={76}
              outerRadius={148}
              stroke="#fff"
              strokeWidth={2.5}
              paddingAngle={2}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            >
              {series.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => [value, 'Students']} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </ChartErrorBoundary>
  )
}

function ComplianceStatusRing({ data }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const { total, compliant, percent } = getComplianceStats(data)
  const [animatedPercent, setAnimatedPercent] = useState(0)
  const missingPrograms = Math.max(0, total - compliant)
  const ringData = [
    { name: 'Covered', value: compliant },
    { name: 'Missing', value: missingPrograms }
  ]

  useEffect(() => {
    if (!mounted) return
    let rafId = null
    const duration = 1000
    const start = performance.now()

    const tick = (now) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const nextValue = Math.round(percent * progress)
      setAnimatedPercent(nextValue)
      if (progress < 1) rafId = requestAnimationFrame(tick)
    }

    setAnimatedPercent(0)
    rafId = requestAnimationFrame(tick)
    return () => {
      if (rafId) cancelAnimationFrame(rafId)
    }
  }, [mounted, percent])

  if (!mounted) return <div className="h-[280px] flex items-center justify-center text-slate-400 text-sm">Loading...</div>
  if (total === 0) {
    return (
      <div className="h-[280px] flex flex-col items-center justify-center bg-white rounded-xl border border-slate-200 p-4">
        <p className="text-slate-500 text-sm">No compliance data yet</p>
      </div>
    )
  }
  return (
    <ChartErrorBoundary>
      <div className="h-full w-full min-w-0 flex flex-col items-center justify-center p-1 sm:p-2 overflow-hidden min-h-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Coverage Status</p>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="relative w-full h-full max-w-[380px] max-h-[260px] min-h-0"
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={ringData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={80}
                outerRadius={124}
                startAngle={90}
                endAngle={-270}
                isAnimationActive
                animationDuration={1000}
                animationEasing="ease-out"
                stroke="#ffffff"
                strokeWidth={2}
              >
                <Cell fill="#10b981" />
                <Cell fill="#e2e8f0" />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl font-bold text-slate-900">{animatedPercent}%</span>
          </div>
        </motion.div>
      </div>
    </ChartErrorBoundary>
  )
}

// Top universities: [{ name, value }] or [{ university_name, total_enrollment }]
function normalizeTopUniversities(raw) {
  if (!raw || !Array.isArray(raw)) return []
  return raw.slice(0, 10).map((item, index) => {
    if (!item) return null
    const fullName = item.name ?? item.university_name ?? 'Unknown'
    const value = Number(item.value ?? item.total_enrollment ?? item.enrollment ?? 0)
    const maleStudents = Number(item.maleStudents ?? 0)
    const femaleStudents = Number(item.femaleStudents ?? 0)
    const malePercent = item.malePercent != null ? Number(item.malePercent) : (value > 0 ? Math.round((maleStudents / value) * 100) : 0)
    const femalePercent = item.femalePercent != null ? Number(item.femalePercent) : (value > 0 ? Math.round((femaleStudents / value) * 100) : 0)
    const universityId = item.universityId ?? null
    const rank = item.rank ?? (index + 1)
    return { name: fullName, fullName, value, universityId, maleStudents, femaleStudents, malePercent, femalePercent, rank }
  }).filter(Boolean)
}

function TopUniversitiesChart({ data, onHoverUniversity }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const series = normalizeTopUniversities(data)
  const totalUniversities = Array.isArray(data) ? data.length : 0
  const visibleCount = series.length
  const formatUniversityLabel = (name) => {
    const label = String(name ?? '')
    return label.length > 20 ? `${label.slice(0, 20)}...` : label
  }
  if (!mounted) return <div className="h-[280px] flex items-center justify-center text-slate-400 text-sm">Loading...</div>
  if (series.length === 0) {
    return (
      <div className="h-[280px] flex items-center justify-center bg-white rounded-xl border border-slate-200">
        <p className="text-slate-500 text-sm">No enrollment data by university yet</p>
      </div>
    )
  }
  return (
    <ChartErrorBoundary>
      <div className="w-full h-[420px] min-h-[300px]">
        <div className="px-1 pb-2">
          <p className="text-[11px] text-slate-500">Showing top {visibleCount} of {totalUniversities} universities ranked by total enrollment</p>
        </div>
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={280}>
          <BarChart
            data={series}
            layout="vertical"
            margin={{ left: 8, right: 8 }}
            barCategoryGap="22%"
            onMouseMove={(state) => {
              const hoveredItem = state?.activePayload?.[0]?.payload || null
              if (onHoverUniversity) onHoverUniversity(hoveredItem)
            }}
            onMouseLeave={() => {
              if (onHoverUniversity) onHoverUniversity(null)
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="name" width={190} tick={{ fontSize: 11 }} tickFormatter={formatUniversityLabel} />
            <Tooltip
              formatter={(value) => [value, 'Students']}
              labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
            />
            <Bar dataKey="value" name="Enrolled" radius={[0, 8, 8, 0]} animationDuration={800}>
              {series.map((entry, index) => (
                <Cell key={entry.name} fill={index === 0 ? '#1d4ed8' : '#60a5fa'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartErrorBoundary>
  )
}

// Enrollment by faculty type: two bars only — STEM (blue), Non-STEM (slate)
const FACULTY_TYPE_COLORS = {
  'STEM': '#3b82f6',
  'Non-STEM': '#64748b'
}

function normalizeEnrollmentByFacultyType(raw) {
  if (!raw || !Array.isArray(raw)) return []
  return raw.map((item) => {
    if (!item || !item.name) return null
    return { name: item.name, value: Number(item.value ?? item.enrollment ?? 0) }
  }).filter(Boolean)
}

function EnrollmentByFacultyTypeChart({ data }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const series = normalizeEnrollmentByFacultyType(data)
  if (!mounted) return <div className="h-[280px] flex items-center justify-center text-slate-400 text-sm">Loading...</div>
  if (series.length === 0) {
    return (
      <div className="h-[280px] flex items-center justify-center bg-white rounded-xl border border-slate-200">
        <p className="text-slate-500 text-sm">No enrollment by faculty type yet</p>
      </div>
    )
  }
  return (
    <ChartErrorBoundary>
      <div className="w-full h-[420px] min-h-[300px]">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={280}>
          <BarChart data={series} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(value) => [value, 'Students']} />
            <Legend wrapperStyle={{ fontSize: 11 }} formatter={(value) => <span style={{ color: '#334155' }}>{value}</span>} />
            <Bar dataKey="value" name="Enrolled" radius={[4, 4, 0, 0]}>
              {series.map((entry, index) => (
                <Cell key={entry.name} fill={FACULTY_TYPE_COLORS[entry.name] ?? '#94a3b8'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartErrorBoundary>
  )
}

// Regional parity: [{ city, students, universities }] — bars = students per city, line = universities per city
function normalizeRegionalParity(raw) {
  if (!raw || !Array.isArray(raw)) return []
  return raw.map((item) => {
    if (!item || !item.city) return null
    return {
      city: item.city,
      students: Number(item.students ?? 0),
      universities: Number(item.universities ?? item.uni_count ?? 0)
    }
  }).filter(Boolean)
}

function RegionalParityChart({ data, onHoverRegion }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const series = normalizeRegionalParity(data)
  if (!mounted) return <div className="h-[280px] flex items-center justify-center text-slate-400 text-sm">Loading...</div>
  if (series.length === 0) {
    return (
      <div className="h-[280px] flex items-center justify-center bg-white rounded-xl border border-slate-200">
        <p className="text-slate-500 text-sm">No regional parity data yet</p>
      </div>
    )
  }
  return (
    <ChartErrorBoundary>
      <div className="w-full h-[420px] min-h-[300px]">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={280}>
          <ComposedChart
            data={series}
            margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
            onMouseMove={(state) => {
              const activeLabel = state?.activeLabel
              const hoveredItem = activeLabel
                ? (series.find((item) => item.city === activeLabel) || null)
                : (state?.activePayload?.[0]?.payload || null)
              if (onHoverRegion) onHoverRegion(hoveredItem)
            }}
            onMouseLeave={() => {
              if (onHoverRegion) onHoverRegion(null)
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="city" tick={{ fontSize: 10 }} />
            <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
            <Tooltip
              formatter={(value, name) => [name === 'Universities' ? value : value.toLocaleString(), name === 'Universities' ? 'Universities' : 'Students']}
              labelFormatter={(label) => `City: ${label}`}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} formatter={(value) => <span style={{ color: '#334155' }}>{value}</span>} />
            <Bar yAxisId="left" dataKey="students" name="Students" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            <Line yAxisId="right" type="monotone" dataKey="universities" name="Universities" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </ChartErrorBoundary>
  )
}

// Compute insight lines from current chart data (answers from the data, not generic descriptions)
function getChartInsights(cityDistribution, genderData, complianceData, topUniversities, enrollmentByFacultyType, regionalParity) {
  const citySeries = normalizeCityDistribution(cityDistribution)
  const totalCityUnis = citySeries.reduce((s, d) => s + d.value, 0)
  const topCity = citySeries.length ? citySeries.reduce((a, b) => (a.value >= b.value ? a : b), citySeries[0]) : null
  const top3City = citySeries.slice().sort((a, b) => b.value - a.value).slice(0, 3)
  const cityInsights = citySeries.length === 0
    ? ['No city data loaded yet.']
    : [
        `Total: ${citySeries.length} cities, ${totalCityUnis} universities.`,
        topCity ? `Leading: ${topCity.name} (${topCity.value} universities).` : '',
        top3City.length ? `Top 3: ${top3City.map((c) => `${c.name} (${c.value})`).join(', ')}.` : ''
      ].filter(Boolean)

  const genderSeries = normalizeGenderData(genderData)
  const totalStudents = genderSeries.reduce((s, d) => s + d.value, 0)
  const maleEntry = genderSeries.find((d) => d.name === 'Male' || d.name?.toLowerCase() === 'male')
  const femaleEntry = genderSeries.find((d) => d.name === 'Female' || d.name?.toLowerCase() === 'female')
  const maleCount = maleEntry?.value ?? 0
  const femaleCount = femaleEntry?.value ?? 0
  const malePct = totalStudents > 0 ? Math.round((maleCount / totalStudents) * 100) : 0
  const femalePct = totalStudents > 0 ? Math.round((femaleCount / totalStudents) * 100) : 0
  const genderInsights = totalStudents === 0
    ? ['No enrollment by gender yet.']
    : [
        `Total students: ${totalStudents.toLocaleString()}.`,
        `Male: ${maleCount.toLocaleString()} (${malePct}%).`,
        `Female: ${femaleCount.toLocaleString()} (${femalePct}%).`
      ]

  const comp = getComplianceStats(complianceData)
  const complianceInsights = comp.total === 0
    ? ['No compliance data yet.']
    : [
        `${comp.compliant} of ${comp.total} programs have reports (${comp.percent}%).`,
        comp.total - comp.compliant > 0 ? `${comp.total - comp.compliant} programs missing enrollment data.` : 'All programs reported.'
      ].filter(Boolean)

  const topUniSeries = normalizeTopUniversities(topUniversities)
  const topUniTotal = topUniSeries.reduce((s, d) => s + d.value, 0)
  const topUni = topUniSeries.length ? topUniSeries[0] : null
  const topUniInsights = topUniSeries.length === 0
    ? ['No enrollment by university yet.']
    : [
        topUni ? `Largest: ${topUni.name} (${topUni.value.toLocaleString()} students).` : '',
        `Top ${topUniSeries.length} total: ${topUniTotal.toLocaleString()} students.`
      ].filter(Boolean)

  const facultySeries = normalizeEnrollmentByFacultyType(enrollmentByFacultyType)
  const facultyTotal = facultySeries.reduce((s, d) => s + d.value, 0)
  const facultyInsights = facultyTotal === 0
    ? ['No enrollment by faculty type yet.']
    : [
        ...facultySeries.map((d) => `${d.name}: ${d.value.toLocaleString()} students.`),
        `Total: ${facultyTotal.toLocaleString()}.`
      ]

  const regionalSeries = normalizeRegionalParity(regionalParity)
  const regionalInsights = regionalSeries.length === 0
    ? ['No regional parity data yet.']
    : [
        `Students and institution count across ${regionalSeries.length} cities.`,
        regionalSeries.length ? `Largest by students: ${regionalSeries.reduce((a, b) => (a.students >= b.students ? a : b), regionalSeries[0])?.city ?? '—'}.` : '',
        'Line = universities per city; bars = total students (distribution by city).'
      ].filter(Boolean)

  return {
    city: { title: 'From this data', insights: cityInsights },
    gender: { title: 'From this data', insights: genderInsights },
    compliance: { title: 'From this data', insights: complianceInsights },
    topUniversities: { title: 'From this data', insights: topUniInsights },
    enrollmentByFaculty: { title: 'From this data', insights: facultyInsights },
    regionalParity: { title: 'From this data', insights: regionalInsights }
  }
}

export default function LandingCharts({
  cityDistribution,
  genderData,
  complianceData,
  complianceDetails = null,
  topUniversities = null,
  enrollmentByFacultyType = null,
  regionalParity = null
}) {
  const insights = getChartInsights(cityDistribution, genderData, complianceData, topUniversities, enrollmentByFacultyType, regionalParity)
  const chartTabs = [
    { id: 'topUniversities', label: 'Top Universities', title: 'Top 10 Universities by Enrollment' },
    { id: 'city', label: 'City Distribution', title: 'Universities by city' },
    { id: 'compliance', label: 'Enrollment Reporting Coverage', title: 'Enrollment reporting coverage' },
    { id: 'gender', label: 'Gender Ratio', title: 'Gender ratio (all students)' },
    { id: 'enrollmentByFaculty', label: 'STEM vs Non-STEM', title: 'Enrollment by faculty type' },
    { id: 'regionalParity', label: 'Regional Parity', title: 'Regional enrollment parity' }
  ]
  const [activeChart, setActiveChart] = useState('topUniversities')
  const [complianceListMode, setComplianceListMode] = useState(null)
  const [hoveredTopUniversity, setHoveredTopUniversity] = useState(null)
  const [hoveredCity, setHoveredCity] = useState(null)
  const [hoveredRegion, setHoveredRegion] = useState(null)
  const tabIds = useMemo(
    () =>
      chartTabs.reduce((acc, tab) => {
        acc[tab.id] = {
          tabId: `landing-chart-tab-${tab.id}`,
          panelId: `landing-chart-panel-${tab.id}`
        }
        return acc
      }, {}),
    []
  )

  const activeTab = chartTabs.find((tab) => tab.id === activeChart) ?? chartTabs[0]
  const activeInsightLines = insights[activeChart]?.insights ?? ['No analytics insight available yet.']
  const activeInsight = activeInsightLines[0] ?? 'No analytics insight available yet.'
  const activeTakeaway =
    activeChart === 'gender' && activeInsightLines.length >= 3
      ? `${activeInsightLines[1]}\n${activeInsightLines[2]}`
      : activeChart === 'enrollmentByFaculty' && activeInsightLines.length >= 2
        ? `${activeInsightLines[0]}\n${activeInsightLines[1]}`
        : (activeInsightLines[1] ?? activeInsight)

  const renderActiveChart = () => {
    if (activeChart === 'topUniversities') return <TopUniversitiesChart data={topUniversities} onHoverUniversity={setHoveredTopUniversity} />
    if (activeChart === 'city') return <CityDistributionChart data={cityDistribution} onHoverCity={setHoveredCity} />
    if (activeChart === 'gender') return <GenderRatioChart data={genderData} />
    if (activeChart === 'enrollmentByFaculty') return <EnrollmentByFacultyTypeChart data={enrollmentByFacultyType} />
    if (activeChart === 'compliance') return <ComplianceStatusRing data={complianceData} />
    return <RegionalParityChart data={regionalParity} onHoverRegion={setHoveredRegion} />
  }
  const handleTabKeyDown = (e, currentId) => {
    const currentIndex = chartTabs.findIndex((tab) => tab.id === currentId)
    if (currentIndex < 0) return

    let nextIndex = currentIndex
    if (e.key === 'ArrowRight') nextIndex = (currentIndex + 1) % chartTabs.length
    if (e.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + chartTabs.length) % chartTabs.length
    if (e.key === 'Home') nextIndex = 0
    if (e.key === 'End') nextIndex = chartTabs.length - 1

    if (nextIndex !== currentIndex) {
      e.preventDefault()
      const nextId = chartTabs[nextIndex].id
      setActiveChart(nextId)
      const nextTabEl = document.getElementById(tabIds[nextId].tabId)
      if (nextTabEl) nextTabEl.focus()
    }
  }

  const comp = getComplianceStats(complianceData)
  const coveredPrograms = Number(complianceData?.covered_programs ?? comp.compliant ?? 0)
  const totalPrograms = Number(complianceData?.total_programs ?? comp.total ?? 0)
  const missingPrograms = Number(complianceData?.missing_programs ?? Math.max(0, totalPrograms - coveredPrograms))
  const coveredPct = totalPrograms > 0 ? Math.round((coveredPrograms / totalPrograms) * 100) : 0
  const missingPct = totalPrograms > 0 ? Math.round((missingPrograms / totalPrograms) * 100) : 0
  const complianceListItems = complianceListMode === 'covered'
    ? (complianceDetails?.covered || [])
    : (complianceDetails?.missing || [])
  const normalizedTopUniversities = normalizeTopUniversities(topUniversities)
  const topUniversityDetail = hoveredTopUniversity || normalizedTopUniversities[0] || null
  const normalizedCitySeries = normalizeCityDistribution(cityDistribution)
  const defaultCity = normalizedCitySeries.length > 0
    ? normalizedCitySeries.reduce((a, b) => (a.value >= b.value ? a : b), normalizedCitySeries[0])
    : null
  const cityDetail = hoveredCity || defaultCity
  const normalizedRegionalSeries = normalizeRegionalParity(regionalParity)
  const defaultRegion = normalizedRegionalSeries.length > 0
    ? normalizedRegionalSeries.reduce((a, b) => (a.students >= b.students ? a : b), normalizedRegionalSeries[0])
    : null
  const regionalDetail = hoveredRegion || defaultRegion

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-2 shadow-sm">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Analytics chart tabs">
          {chartTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveChart(tab.id)}
              onKeyDown={(e) => handleTabKeyDown(e, tab.id)}
              id={tabIds[tab.id].tabId}
              role="tab"
              aria-selected={activeChart === tab.id}
              aria-controls={tabIds[tab.id].panelId}
              tabIndex={activeChart === tab.id ? 0 : -1}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors duration-200 ${
                activeChart === tab.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <ChartInfoCard title={insights[activeChart]?.title ?? 'From this data'} insights={activeInsightLines}>
        <div
          className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm"
          id={tabIds[activeChart].panelId}
          role="tabpanel"
          aria-labelledby={tabIds[activeChart].tabId}
        >
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-900">{activeTab.title}</h3>
            <p className="text-xs text-slate-500 mt-1">Focused analytics view. Switch tabs to review each dataset clearly.</p>
          </div>
          {activeChart === 'compliance' ? (
            <div className="grid grid-cols-1 lg:grid-cols-10 gap-4 h-auto lg:h-[460px] items-stretch">
              <div className="lg:col-span-7 h-full rounded-xl bg-slate-50 border border-slate-100 p-3 sm:p-4 overflow-hidden flex flex-col">
                <div className="flex-1 flex items-center justify-center min-h-0">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeChart}
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.3, ease: 'easeOut' }}
                      className="h-full w-full flex items-center justify-center"
                    >
                      {renderActiveChart()}
                    </motion.div>
                  </AnimatePresence>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <button
                    type="button"
                    onClick={() => setComplianceListMode('covered')}
                    className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-left hover:bg-emerald-100 transition-colors"
                  >
                    <p className="text-[11px] uppercase tracking-wide font-semibold text-emerald-700">Covered Programs</p>
                    <p className="text-xl font-bold text-emerald-800 mt-1">{coveredPrograms}</p>
                    <p className="text-xs text-emerald-700 mt-0.5">{coveredPct}% of total</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setComplianceListMode('missing')}
                    className="rounded-lg border border-red-200 bg-red-50 p-3 text-left hover:bg-red-100 transition-colors"
                  >
                    <p className="text-[11px] uppercase tracking-wide font-semibold text-red-700">Missing Programs</p>
                    <p className="text-xl font-bold text-red-800 mt-1">{missingPrograms}</p>
                    <p className="text-xs text-red-700 mt-0.5">{missingPct}% of total</p>
                  </button>
                </div>
              </div>

              <motion.aside
                key={`side-panel-${activeChart}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.32, ease: 'easeOut' }}
                className="lg:col-span-3 h-full rounded-xl border border-slate-200 bg-slate-50/80 p-4 sm:p-5 flex flex-col"
              >
                <div className="space-y-3">
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                    <p className="text-xs sm:text-sm font-bold uppercase tracking-wide text-emerald-800">What this means</p>
                    <p className="text-sm text-slate-700 mt-1 leading-relaxed">{activeInsight}</p>
                  </div>
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                    <p className="text-xs sm:text-sm font-bold uppercase tracking-wide text-blue-800">Key takeaway</p>
                    <p className="text-sm text-slate-700 mt-1 leading-relaxed whitespace-pre-line">{activeTakeaway}</p>
                  </div>
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                    <p className="text-[11px] uppercase tracking-wide font-semibold text-red-800">Attention</p>
                    <p className="text-sm text-red-900 mt-1 leading-relaxed">
                      {activeTakeaway.includes('missing') ? activeTakeaway : 'Some programs are still missing enrollment data and should be prioritized for reporting.'}
                    </p>
                  </div>
                  <div className="pt-1 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setComplianceListMode('missing')}
                      className="px-3 py-2 text-xs font-semibold rounded-lg bg-red-100 text-red-800 border border-red-200 hover:bg-red-200 transition-colors"
                    >
                      View Missing
                    </button>
                    <button
                      type="button"
                      onClick={() => setComplianceListMode('covered')}
                      className="px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-200 hover:bg-emerald-200 transition-colors"
                    >
                      View Covered
                    </button>
                  </div>
                </div>
                <div className="mt-3 flex-1 min-h-[120px] rounded-lg border border-slate-200 bg-white p-3">
                  <p className="text-[11px] uppercase tracking-wide font-semibold text-slate-600">Details Panel</p>
                  {complianceListMode ? (
                    <p className="text-sm text-slate-700 mt-1 leading-relaxed">
                      {complianceListMode === 'missing'
                        ? `Missing programs selected (${complianceListItems.length}). Use "View Missing" to open the full list.`
                        : `Covered programs selected (${complianceListItems.length}). Use "View Covered" to open the full list.`}
                    </p>
                  ) : (
                    <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                      Select "View Missing" or "View Covered" to inspect detailed program lists.
                    </p>
                  )}
                </div>
              </motion.aside>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-10 gap-4 h-auto lg:h-[460px]">
              <div className="lg:col-span-7 h-[380px] lg:h-full rounded-xl bg-slate-50 border border-slate-100 p-1 sm:p-2 overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeChart}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    className="h-full"
                  >
                    {renderActiveChart()}
                  </motion.div>
                </AnimatePresence>
              </div>

              <motion.aside
                key={`side-panel-${activeChart}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.32, ease: 'easeOut' }}
                className="lg:col-span-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4 sm:p-5"
              >
                <div className="space-y-4">
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                    <p className="text-xs sm:text-sm font-bold uppercase tracking-wide text-emerald-800">Insight</p>
                    <p className="text-sm text-slate-700 mt-1 leading-relaxed">{activeInsight}</p>
                  </div>
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                    <p className="text-xs sm:text-sm font-bold uppercase tracking-wide text-blue-800">Key Takeaway</p>
                    <p className="text-sm text-slate-700 mt-1 leading-relaxed whitespace-pre-line">{activeTakeaway}</p>
                  </div>
                  {activeChart === 'regionalParity' && regionalDetail && (
                    <div className="rounded-lg border border-slate-200 bg-white p-3">
                      <p className="text-xs sm:text-sm font-bold uppercase tracking-wide text-slate-700">Regional Detail</p>
                      <p className="text-sm font-semibold text-slate-900 mt-1">{regionalDetail.city}</p>
                      <div className="mt-2 grid grid-cols-2 gap-2.5">
                        <div className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-2.5">
                          <p className="text-[10px] uppercase tracking-wide font-semibold text-blue-700">Students</p>
                          <p className="text-base font-bold text-blue-900 mt-0.5">{Number(regionalDetail.students || 0).toLocaleString()}</p>
                        </div>
                        <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2.5">
                          <p className="text-[10px] uppercase tracking-wide font-semibold text-emerald-700">Universities</p>
                          <p className="text-base font-bold text-emerald-900 mt-0.5">{Number(regionalDetail.universities || 0)}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  {activeChart === 'city' && cityDetail && (
                    <div className="rounded-lg border border-slate-200 bg-white p-3">
                      <p className="text-xs sm:text-sm font-bold uppercase tracking-wide text-slate-700">City Detail</p>
                      <p className="text-sm font-semibold text-slate-900 mt-1">{cityDetail.name}</p>
                      <p className="text-3xl font-bold text-slate-900 mt-2">{Number(cityDetail.value || 0)}</p>
                      <p className="text-xs text-slate-500">universities in this city</p>
                    </div>
                  )}
                  {activeChart === 'topUniversities' && topUniversityDetail && (
                    <div className="rounded-lg border border-slate-200 bg-white p-3">
                      <p className="text-xs sm:text-sm font-bold uppercase tracking-wide text-slate-700">University Details</p>
                      <p className="text-sm font-bold text-red-700 mt-1">
                        Rank: #{topUniversityDetail.rank ?? 1} by total enrollment
                      </p>
                      <p className="text-sm font-semibold text-slate-900 mt-1">{topUniversityDetail.fullName}</p>
                      <div className="mt-2 space-y-1 text-xs text-slate-700">
                        <p>Total students: <span className="font-semibold text-slate-900">{Number(topUniversityDetail.value || 0).toLocaleString()}</span></p>
                        <p>Male students: <span className="font-semibold text-slate-900">{Number(topUniversityDetail.maleStudents || 0).toLocaleString()}</span></p>
                        <p>Female students: <span className="font-semibold text-slate-900">{Number(topUniversityDetail.femaleStudents || 0).toLocaleString()}</span></p>
                        <p>Gender split: <span className="font-semibold text-slate-900">{Number(topUniversityDetail.malePercent || 0)}%</span> male / <span className="font-semibold text-slate-900">{Number(topUniversityDetail.femalePercent || 0)}%</span> female</p>
                      </div>
                    </div>
                  )}
                </div>
              </motion.aside>
            </div>
          )}
        </div>
      </ChartInfoCard>

      {activeChart === 'compliance' && complianceListMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/45 backdrop-blur-[1px]" onClick={() => setComplianceListMode(null)} />
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="relative w-full max-w-3xl max-h-[80vh] overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-2xl"
          >
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h4 className="text-base font-bold text-slate-900">
                  {complianceListMode === 'missing' ? 'Missing Programs' : 'Covered Programs'}
                </h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  {complianceListItems.length} {complianceListItems.length === 1 ? 'program' : 'programs'} listed
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                    complianceListMode === 'missing'
                      ? 'bg-red-100 text-red-800 border border-red-200'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  }`}
                >
                  {complianceListMode === 'missing' ? 'Action Needed' : 'Reported'}
                </span>
                <button
                  type="button"
                  onClick={() => setComplianceListMode(null)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-200 text-slate-800 hover:bg-slate-300"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="p-4 overflow-auto max-h-[calc(80vh-64px)]">
              {complianceListItems.length === 0 ? (
                <p className="text-sm text-slate-500">No program records available.</p>
              ) : (
                <div className="space-y-2.5">
                  {complianceListItems.map((item, idx) => (
                    <div
                      key={`${item.programId || 'prog'}-${idx}`}
                      className={`rounded-lg border p-3 ${
                        complianceListMode === 'missing'
                          ? 'border-red-200 bg-red-50/60'
                          : 'border-emerald-200 bg-emerald-50/60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{item.programName || 'Unknown Program'}</p>
                          <p className="text-xs text-slate-700 mt-0.5">{item.universityName || 'Unknown University'}</p>
                        </div>
                        <span className="text-[10px] uppercase tracking-wide font-semibold text-slate-600 bg-white/70 border border-slate-200 rounded px-2 py-0.5">
                          {item.programId || 'N/A'}
                        </span>
                      </div>
        </div>
                  ))}
        </div>
              )}
        </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}

export { normalizeCityDistribution, normalizeGenderData, getComplianceStats }
