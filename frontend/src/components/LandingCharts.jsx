import React, { useState, useEffect } from 'react'
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

function CityDistributionChart({ data }) {
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
      <div className="h-[280px] min-h-[280px] w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={280}>
          <PieChart>
            <Pie
              data={series}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={90}
              stroke="#fff"
              strokeWidth={1.5}
              labelLine={{ stroke: '#94a3b8', strokeWidth: 1 }}
              label={PieSliceLabel}
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
      <div className="h-[280px] min-h-[280px] w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={280}>
          <PieChart>
            <Pie
              data={series}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={90}
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
  if (!mounted) return <div className="h-[280px] flex items-center justify-center text-slate-400 text-sm">Loading...</div>
  if (total === 0) {
    return (
      <div className="h-[280px] flex flex-col items-center justify-center bg-white rounded-xl border border-slate-200 p-4">
        <p className="text-slate-500 text-sm">No compliance data yet</p>
      </div>
    )
  }
  const circumference = 2 * Math.PI * 45
  const strokeDash = (percent / 100) * circumference
  return (
    <ChartErrorBoundary>
      <div className="h-[280px] w-full min-w-0 flex flex-col items-center justify-center p-3 overflow-hidden">
        <div className="relative w-32 h-32 shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="#e2e8f0" strokeWidth="10" />
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke={percent >= 80 ? '#10b981' : percent >= 50 ? '#f59e0b' : '#ef4444'}
              strokeWidth="10"
              strokeDasharray={`${strokeDash} ${circumference}`}
              strokeLinecap="round"
              className="transition-all duration-500"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-bold text-slate-900">{percent}%</span>
          </div>
        </div>
        <p className="text-sm font-medium text-slate-700 mt-1.5 shrink-0">Programs with reports</p>
        <p className="text-xs text-slate-500 shrink-0">{compliant} of {total} programs have enrollment data</p>
      </div>
    </ChartErrorBoundary>
  )
}

// Top universities: [{ name, value }] or [{ university_name, total_enrollment }]
function normalizeTopUniversities(raw) {
  if (!raw || !Array.isArray(raw)) return []
  return raw.slice(0, 10).map((item) => {
    if (!item) return null
    const name = item.name ?? item.university_name ?? 'Unknown'
    const value = Number(item.value ?? item.total_enrollment ?? item.enrollment ?? 0)
    return { name: name.length > 25 ? name.slice(0, 22) + '…' : name, value }
  }).filter(Boolean)
}

function TopUniversitiesChart({ data }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const series = normalizeTopUniversities(data)
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
      <div className="h-[280px] min-h-[280px] w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={280}>
          <BarChart data={series} layout="vertical" margin={{ left: 8, right: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10 }} />
            <Tooltip formatter={(value) => [value, 'Students']} />
            <Bar dataKey="value" name="Enrolled" fill="#3b82f6" radius={[0, 4, 4, 0]} />
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
      <div className="h-[280px] min-h-[280px] w-full min-w-0">
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

function RegionalParityChart({ data }) {
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
      <div className="h-[280px] min-h-[280px] w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={280}>
          <ComposedChart data={series} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
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
  topUniversities = null,
  enrollmentByFacultyType = null,
  regionalParity = null
}) {
  const insights = getChartInsights(cityDistribution, genderData, complianceData, topUniversities, enrollmentByFacultyType, regionalParity)
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <ChartInfoCard title={insights.city.title} insights={insights.city.insights}>
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900 mb-1">Universities by city</h3>
          <p className="text-xs text-slate-500 mb-3">Number of universities per city. Use this to see which cities have more or fewer institutions.</p>
          <CityDistributionChart data={cityDistribution} />
        </div>
      </ChartInfoCard>
      <ChartInfoCard title={insights.gender.title} insights={insights.gender.insights}>
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900 mb-1">Gender ratio (all students)</h3>
          <p className="text-xs text-slate-500 mb-3">Male vs female enrollment across all universities and programs.</p>
          <GenderRatioChart data={genderData} />
        </div>
      </ChartInfoCard>
      <ChartInfoCard title={insights.compliance.title} insights={insights.compliance.insights}>
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900 mb-1">Report compliance</h3>
          <p className="text-xs text-slate-500 mb-3">Share of programs that have enrollment reports (e.g., BE Electrical, BS AI missing = lower %).</p>
          <ComplianceStatusRing data={complianceData} />
        </div>
      </ChartInfoCard>
      <ChartInfoCard title={insights.topUniversities.title} insights={insights.topUniversities.insights}>
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900 mb-1">Top universities by enrollment</h3>
          <p className="text-xs text-slate-500 mb-3">Universities with the highest total enrollment. Use this to see where students are concentrated.</p>
          <TopUniversitiesChart data={topUniversities} />
        </div>
      </ChartInfoCard>
      <ChartInfoCard title={insights.enrollmentByFaculty.title} insights={insights.enrollmentByFaculty.insights} className="md:col-span-2 lg:col-span-1">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900 mb-1">Enrollment by faculty type</h3>
          <p className="text-xs text-slate-500 mb-3">Enrollment vs capacity by faculty type (STEM vs Humanities) to spot over-enrollment and balance degree focus.</p>
          <EnrollmentByFacultyTypeChart data={enrollmentByFacultyType} />
        </div>
      </ChartInfoCard>
      <ChartInfoCard title={insights.regionalParity.title} insights={insights.regionalParity.insights}>
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900 mb-1">Regional enrollment parity</h3>
          <p className="text-xs text-slate-500 mb-3">Students per city (bars) and number of universities per city (line). See if student concentration matches institutional distribution across Sindh.</p>
          <RegionalParityChart data={regionalParity} />
        </div>
      </ChartInfoCard>
    </div>
  )
}

export { normalizeCityDistribution, normalizeGenderData, getComplianceStats }
