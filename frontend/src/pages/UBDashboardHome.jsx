import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabaseClient'
import { University, Building2, GraduationCap, Loader2, CheckCircle, AlertTriangle, Users, FlaskConical } from 'lucide-react'
import LandingCharts from '../components/LandingCharts'

const WELCOME_SUBTITLE = 'Aggregated Provincial Oversight: Strategic analytics and institutional intelligence across all public and private universities in Sindh. Support policy decisions with real-time data on regional distribution and enrollment parity.'

// Demo mode: rich sample data so examiner sees full dashboard with variety when institutional data is sparse
const DEMO_LANDING_ANALYTICS = {
  city_distribution: [
    { city: 'Karachi', uni_count: 12 },
    { city: 'Hyderabad', uni_count: 4 },
    { city: 'Jamshoro', uni_count: 3 },
    { city: 'Sukkur', uni_count: 2 },
    { city: 'Larkana', uni_count: 2 },
    { city: 'Mirpurkhas', uni_count: 1 },
    { city: 'Nawabshah', uni_count: 1 },
    { city: 'Dadu', uni_count: 1 },
    { city: 'Khairpur', uni_count: 1 }
  ],
  gender_data: { total_male: 45200, total_female: 37800, total_enrollment: 83000 },
  compliance_data: {
    total_unis: 11,
    compliant_unis: 3,
    compliant_percent: 27,
    total_programs: 11,
    covered_programs: 3,
    missing_programs: 8
  },
  compliance_details: {
    covered: [
      { programId: 'p-101', programName: 'BS Computer Science', universityId: 'u-01', universityName: 'University of Karachi' },
      { programId: 'p-102', programName: 'BE Electrical Engineering', universityId: 'u-03', universityName: 'NED University of Engineering' },
      { programId: 'p-103', programName: 'BBA', universityId: 'u-05', universityName: 'Sukkur IBA University' }
    ],
    missing: [
      { programId: 'p-104', programName: 'BS Artificial Intelligence', universityId: 'u-03', universityName: 'NED University of Engineering' },
      { programId: 'p-105', programName: 'BS Mathematics', universityId: 'u-02', universityName: 'University of Sindh, Jamshoro' },
      { programId: 'p-106', programName: 'BEd', universityId: 'u-07', universityName: 'Shah Abdul Latif University' },
      { programId: 'p-107', programName: 'MBBS', universityId: 'u-06', universityName: 'Liaquat University of Medical' },
      { programId: 'p-108', programName: 'BSc Agriculture', universityId: 'u-09', universityName: 'Sindh Agriculture University' },
      { programId: 'p-109', programName: 'BS Physics', universityId: 'u-01', universityName: 'University of Karachi' },
      { programId: 'p-110', programName: 'BS Sociology', universityId: 'u-08', universityName: 'DOW University of Health' },
      { programId: 'p-111', programName: 'BS Economics', universityId: 'u-10', universityName: 'Benazir Bhutto Shaheed Univ' }
    ]
  },
  total_universities: 27,
  total_campuses: 32,
  total_students: 83000,
  active_accounts: 18,
  expired_boards: 3,
  total_staff: 450,
  top_universities: [
    { name: 'University of Karachi', value: 18200, maleStudents: 9828, femaleStudents: 8372 },
    { name: 'University of Sindh, Jamshoro', value: 12500, maleStudents: 6813, femaleStudents: 5687 },
    { name: 'NED University of Engineering', value: 9800, maleStudents: 5096, femaleStudents: 4704 },
    { name: 'Mehran UET', value: 7200, maleStudents: 3816, femaleStudents: 3384 },
    { name: 'Sukkur IBA University', value: 6500, maleStudents: 3380, femaleStudents: 3120 },
    { name: 'Liaquat University of Medical', value: 5800, maleStudents: 2726, femaleStudents: 3074 },
    { name: 'Shah Abdul Latif University', value: 4200, maleStudents: 2142, femaleStudents: 2058 },
    { name: 'DOW University of Health', value: 3900, maleStudents: 2145, femaleStudents: 1755 },
    { name: 'Sindh Agriculture University', value: 3100, maleStudents: 1736, femaleStudents: 1364 },
    { name: 'Benazir Bhutto Shaheed Univ', value: 2600, maleStudents: 1404, femaleStudents: 1196 }
  ],
  enrollment_by_faculty_type: [
    { name: 'STEM', value: 52000 },
    { name: 'Non-STEM', value: 31000 }
  ],
  regional_parity: [
    { city: 'Karachi', students: 37200, universities: 12 },
    { city: 'Hyderabad', students: 12400, universities: 4 },
    { city: 'Jamshoro', students: 9300, universities: 3 },
    { city: 'Sukkur', students: 6200, universities: 2 },
    { city: 'Larkana', students: 6200, universities: 2 },
    { city: 'Mirpurkhas', students: 3100, universities: 1 },
    { city: 'Nawabshah', students: 3100, universities: 1 },
    { city: 'Dadu', students: 3100, universities: 1 },
    { city: 'Khairpur', students: 3100, universities: 1 }
  ]
}

export default function UBDashboardHome({ user, showToast }) {
  const [demoMode, setDemoMode] = useState(true)
  const [landingAnalytics, setLandingAnalytics] = useState({
    city_distribution: null,
    gender_data: null,
    compliance_data: null,
    compliance_details: null,
    total_universities: 0,
    total_campuses: 0,
    total_students: 0,
    active_accounts: 0,
    expired_boards: 0,
    total_staff: 0,
    top_universities: null,
    enrollment_by_faculty_type: null,
    regional_parity: null
  })
  const [loading, setLoading] = useState(true)

  // Fuzzy search: combine program + faculty name and check for STEM keywords (case-insensitive).
  const STEM_KEYWORDS = /(computer|it|software|engineering|ai|cyber|electrical|science|technology|\bcs\b|bscs|bs cs|mscs|ms cs)/i
  const classifyProgram = (programName, facultyName) => {
    const p = programName != null ? String(programName).trim() : ''
    const f = facultyName != null ? String(facultyName).trim() : ''
    const combined = [p, f].filter(Boolean).join(' ') || ''
    const result = combined && STEM_KEYWORDS.test(combined) ? 'STEM' : 'Non-STEM'
    return { result }
  }

  useEffect(() => {
    let cancelled = false
    const fetchData = async () => {
      setLoading(true)
      try {
        const [
          analyticsRes,
          unisRes,
          campusesRes,
          studentsRes,
          hubRes,
          profilesRes,
          staffRes,
          enrollmentWithFacultyRes,
          programsRes,
          universitiesRes
        ] = await Promise.all([
          supabase.from('ub_landing_analytics').select('city_distribution, gender_data, compliance_data').maybeSingle(),
          supabase.from('universities').select('id', { count: 'exact', head: true }),
          supabase.from('campuses').select('id', { count: 'exact', head: true }),
          supabase.from('enrollment_reports').select('total_enrolled, male_students, female_students, university_id'),
          supabase.from('ub_analytics_hub').select('university_id, expired_boards'),
          supabase.from('profiles').select('university_id').eq('role', 'UFP').not('university_id', 'is', null),
          supabase.from('staff').select('id', { count: 'exact', head: true }),
          supabase.from('enrollment_reports').select('total_enrolled, program_id, programs(name, faculties(name))'),
          supabase.from('programs').select('id, name, university_id'),
          supabase.from('universities').select('id, name')
        ])

        console.log('Debug programsRes.error:', programsRes.error)
        console.log('Debug programsRes.data length:', programsRes.data?.length)
        console.log('Debug enrollmentWithFacultyRes.error:', enrollmentWithFacultyRes.error)
        console.log('Debug enrollmentWithFacultyRes.data length:', enrollmentWithFacultyRes.data?.length)
        console.log('Debug universitiesRes.error:', universitiesRes.error)
        console.log('Debug universitiesRes.data length:', universitiesRes.data?.length)

        if (cancelled) return

        const row = analyticsRes.data || {}
        console.log('Debug analytics row:', row)
        const enrollmentList = studentsRes.data || []
        const byUni = {}
        enrollmentList.forEach((r) => {
          const uid = r.university_id
          if (!uid) return
          const male = Number(r.male_students ?? r.maleStudents ?? 0) || 0
          const female = Number(r.female_students ?? r.femaleStudents ?? 0) || 0
          if (!byUni[uid]) {
            byUni[uid] = {
              universityId: uid,
              value: 0,
              maleStudents: 0,
              femaleStudents: 0
            }
          }
          byUni[uid].value += Number(r.total_enrolled) || 0
          byUni[uid].maleStudents += male
          byUni[uid].femaleStudents += female
        })
        const uniMap = (universitiesRes.data || []).reduce((acc, u) => { acc[u.id] = u.name; return acc }, {})
        const topUniversities = Object.values(byUni)
          .sort((a, b) => b.value - a.value)
          .slice(0, 10)
          .map((item, index) => {
            const total = Number(item.value) || 0
            const maleStudents = Number(item.maleStudents) || 0
            const femaleStudents = Number(item.femaleStudents) || 0
            const malePercent = total > 0 ? Math.round((maleStudents / total) * 100) : 0
            const femalePercent = total > 0 ? Math.round((femaleStudents / total) * 100) : 0
            const fullName = uniMap[item.universityId] || 'Unknown'

            return {
              universityId: item.universityId,
              name: fullName,
              fullName,
              value: total,
              maleStudents,
              femaleStudents,
              malePercent,
              femalePercent,
              rank: index + 1
            }
          })
        console.log(
          'Debug topUniversities first 3:',
          topUniversities.slice(0, 3).map((u) => ({
            universityName: u.fullName,
            totalStudents: u.value,
            maleStudents: u.maleStudents,
            femaleStudents: u.femaleStudents
          }))
        )

        const totalStudentsFromReports = enrollmentList.reduce((s, r) => s + (Number(r.total_enrolled) || 0), 0)
        const enrollmentWithFaculty = enrollmentWithFacultyRes.data || []
        const byType = { STEM: 0, 'Non-STEM': 0 }
        let sumWithFaculty = 0
        enrollmentWithFaculty.forEach((item) => {
          const enrolled = Number(item.total_enrolled) || 0
          sumWithFaculty += enrolled

          // Use program + faculty name directly from the joined programs relation
          const p = Array.isArray(item.programs) ? item.programs[0] : item.programs
          const facultyName =
            Array.isArray(p?.faculties) ? (p.faculties[0]?.name || '') : (p?.faculties?.name || '')
          const searchStr = `${p?.name || ''} ${facultyName}`.trim().toLowerCase()

          const isStem = /computer|software|engineering|ai|\bit\b|\bcs\b|bscs|bs cs|mscs|ms cs/i.test(searchStr)
          const result = isStem ? 'STEM' : 'Non-STEM'

          console.log('Final Categorization:', searchStr || '(empty)', 'is', result)
          byType[result] = byType[result] + enrolled
        })
        const uncategorized = Math.max(0, totalStudentsFromReports - sumWithFaculty)
        byType['Non-STEM'] = byType['Non-STEM'] + uncategorized
        const enrollmentByFacultyType = [
          { name: 'STEM', value: byType.STEM },
          { name: 'Non-STEM', value: byType['Non-STEM'] }
        ]

        const expiredBoards = (hubRes.data || []).reduce((s, u) => s + (Number(u.expired_boards) || 0), 0)
        const activeAccountIds = new Set((profilesRes.data || []).map((p) => p.university_id).filter(Boolean))

        const allPrograms = programsRes.data || []
        const coveredProgramIds = new Set((enrollmentWithFacultyRes.data || []).map((r) => r.program_id).filter(Boolean))
        const covered = []
        const missing = []

        allPrograms.forEach((program) => {
          const programId = program.id
          const details = {
            programId,
            programName: program.name || 'Unknown Program',
            universityId: program.university_id || null,
            universityName: uniMap[program.university_id] || 'Unknown University'
          }
          if (coveredProgramIds.has(programId)) {
            covered.push(details)
          } else {
            missing.push(details)
          }
        })

        const totalPrograms = allPrograms.length
        const coveredPrograms = covered.length
        const missingPrograms = missing.length
        const compliancePercent = totalPrograms > 0
          ? Math.round((coveredPrograms / totalPrograms) * 100)
          : 0

        console.log('Compliance totals:', {
          totalPrograms,
          coveredPrograms,
          missingPrograms
        })
        console.log('Compliance first 3 missing records:', missing.slice(0, 3))

        const compliance_data = {
          total_unis: totalPrograms,
          compliant_unis: coveredPrograms,
          compliant_percent: compliancePercent,
          total_programs: totalPrograms,
          covered_programs: coveredPrograms,
          missing_programs: missingPrograms
        }
        const compliance_details = { covered, missing }
        console.log('Debug final compliance_data:', compliance_data)
        console.log('Debug final compliance_details counts:', {
          covered: compliance_details.covered.length,
          missing: compliance_details.missing.length
        })

        // Regional parity: enrollment by city (from city_distribution + total enrollment proportionally)
        const cityDist = row.city_distribution && Array.isArray(row.city_distribution) ? row.city_distribution : []
        const totalCityUnis = cityDist.reduce((s, c) => s + (Number(c.uni_count) || 0), 0)
        const regionalParity = totalCityUnis > 0
          ? cityDist.map((c) => {
              const unis = Number(c.uni_count) || 0
              const cityName = c.city ?? c.name ?? 'Unknown'
              const students = Math.round((unis / totalCityUnis) * totalStudentsFromReports)
              return { city: cityName, students, universities: unis }
            }).filter((d) => d.city)
          : []

        setLandingAnalytics(prev => ({
          ...prev,
          city_distribution: row.city_distribution ?? null,
          gender_data: row.gender_data ?? null,
          compliance_data,
          compliance_details,
          total_universities: unisRes.count ?? 0,
          total_campuses: campusesRes.count ?? 0,
          total_students: (studentsRes.data || []).reduce((sum, r) => sum + (Number(r.total_enrolled) || 0), 0),
          active_accounts: activeAccountIds.size,
          expired_boards: expiredBoards,
          total_staff: staffRes.count ?? 0,
          top_universities: topUniversities,
          enrollment_by_faculty_type: enrollmentByFacultyType,
          regional_parity: regionalParity
        }))
      } catch (err) {
        if (!cancelled) {
          console.error('Error loading dashboard data:', err)
          setLandingAnalytics(prev => ({ ...prev, city_distribution: null, gender_data: null, compliance_data: null, compliance_details: null }))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchData()
    return () => { cancelled = true }
  }, [])

  const data = demoMode ? DEMO_LANDING_ANALYTICS : landingAnalytics
  const totalUnis = data.total_universities ?? 0
  const totalCampuses = data.total_campuses ?? 0
  const totalStudents = data.total_students ?? 0
  const activeAccounts = data.active_accounts ?? 0
  const expiredBoards = data.expired_boards ?? 0
  const totalStaff = data.total_staff ?? 0

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="p-6 sm:p-8 space-y-8"
      >
        <div id="ub-dashboard-home-summary" className="space-y-8">
          {/* Welcome Hero Block - dark panel for strong contrast */}
          <div className="bg-slate-800/95 backdrop-blur-md border border-slate-600/50 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-slate-900/50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2 drop-shadow-sm">
                Welcome back, {user?.full_name || 'User'}!
              </h1>
              <p className="text-slate-200 text-sm sm:text-base max-w-3xl leading-relaxed">
                {WELCOME_SUBTITLE}
              </p>
            </div>
            <div className="flex flex-col items-end gap-3">
                <div className="flex items-center gap-3 flex-wrap justify-end">
                  <button
                    type="button"
                    onClick={() => setDemoMode((v) => !v)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${demoMode ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50' : 'bg-white/10 text-slate-300 border border-white/20 hover:bg-white/15'}`}
                  >
                    <FlaskConical className="w-4 h-4" />
                    {demoMode ? 'Demo mode: On' : 'Demo mode: Off'}
                  </button>
                </div>
                {demoMode && (
                  <p className="text-amber-400/90 text-xs max-w-xs text-right">Charts and KPIs show sample data so examiners can see the full dashboard with variety.</p>
                )}
              </div>
          </div>
          </div>

          {/* Aggregation Row - clear section title + high-contrast KPI cards */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="rounded-2xl"
          >
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">At a glance</h2>
              {demoMode && (
                <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-500/20 text-amber-400 border border-amber-500/40">
                  Demo data
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-white border border-slate-200 shadow-lg">
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                  <University className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900 tabular-nums">{totalUnis}</p>
                  <p className="text-sm font-medium text-slate-600">Total Universities</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-xl bg-white border border-slate-200 shadow-lg">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900 tabular-nums">{activeAccounts}</p>
                  <p className="text-sm font-medium text-slate-600">Active Accounts</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-xl bg-white border border-slate-200 shadow-lg">
                <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900 tabular-nums">{expiredBoards}</p>
                  <p className="text-sm font-medium text-slate-600">Expired Boards</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-xl bg-white border border-slate-200 shadow-lg">
                <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-slate-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900 tabular-nums">{totalCampuses}</p>
                  <p className="text-sm font-medium text-slate-600">Total Campuses</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-xl bg-white border border-slate-200 shadow-lg">
                <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                  <GraduationCap className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900 tabular-nums">{totalStudents.toLocaleString()}</p>
                  <p className="text-sm font-medium text-slate-600">Total Students</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-xl bg-white border border-slate-200 shadow-lg">
                <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center">
                  <Users className="w-6 h-6 text-violet-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900 tabular-nums">{totalStaff.toLocaleString()}</p>
                  <p className="text-sm font-medium text-slate-600">Total Staff</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Strategic analytics */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Strategic analytics</h2>
              {demoMode && (
                <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-500/20 text-amber-400 border border-amber-500/40">
                  Demo data
                </span>
              )}
            </div>
            {loading ? (
              <div className="bg-slate-800/80 backdrop-blur-md border border-slate-600/50 rounded-2xl p-12 text-center">
                <Loader2 className="w-10 h-10 animate-spin text-blue-400 mx-auto mb-3" />
                <p className="text-slate-300 text-sm">Loading dashboard charts…</p>
              </div>
            ) : (
              <LandingCharts
                cityDistribution={data.city_distribution}
                genderData={data.gender_data}
                complianceData={data.compliance_data ?? {
                  total_unis: 0,
                  compliant_unis: 0,
                  compliant_percent: 0,
                  total_programs: 0,
                  covered_programs: 0,
                  missing_programs: 0
                }}
                complianceDetails={data.compliance_details}
                topUniversities={data.top_universities}
                enrollmentByFacultyType={data.enrollment_by_faculty_type}
                regionalParity={data.regional_parity}
              />
            )}
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
