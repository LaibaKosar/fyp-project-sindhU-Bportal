import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabaseClient'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Building2,
  Loader2,
  Plus,
  Briefcase
} from 'lucide-react'
import Breadcrumbs from '../components/Breadcrumbs'
import DirectoryRow from '../components/DirectoryRow'

function CampusDetailView() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [loading, setLoading] = useState(true)
  const [campus, setCampus] = useState(null)
  const [user, setUser] = useState(null)
  const [faculties, setFaculties] = useState([])
  const [departmentsByFaculty, setDepartmentsByFaculty] = useState({})
  const [programsByDepartment, setProgramsByDepartment] = useState({})
  const [reportsByProgram, setReportsByProgram] = useState({})
  const [expandedFaculties, setExpandedFaculties] = useState(new Set())
  const [expandedDepartments, setExpandedDepartments] = useState(new Set())
  const [expandedPrograms, setExpandedPrograms] = useState(new Set())
  const [nonTeachingCount, setNonTeachingCount] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')

  // Fuzzy STEM vs Non-STEM logic reused from UB Admin dashboard
  const STEM_KEYWORDS = /(computer|it|software|engineering|ai|cyber|electrical|science|technology)/i
  const classifyProgram = (programName, facultyName) => {
    const p = programName != null ? String(programName).trim() : ''
    const f = facultyName != null ? String(facultyName).trim() : ''
    const combined = [p, f].filter(Boolean).join(' ') || ''
    const result = combined && STEM_KEYWORDS.test(combined) ? 'STEM' : 'Non-STEM'
    return { result }
  }

  const toggleInSet = (set, id) => {
    const next = new Set(set)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    return next
  }

  const toggleFaculty = (facultyId) => {
    setExpandedFaculties((prev) => toggleInSet(prev, facultyId))
  }

  const toggleDepartment = (deptId) => {
    setExpandedDepartments((prev) => toggleInSet(prev, deptId))
  }

  const toggleProgram = (programId) => {
    setExpandedPrograms((prev) => toggleInSet(prev, programId))
  }

  useEffect(() => {
    loadUserData()
  }, [])

  useEffect(() => {
    if (!user?.university_id || !id) return
    let cancelled = false
    setLoading(true)
    const run = async () => {
      try {
        await fetchCampusDetails()
        if (cancelled) return
        await fetchFacultiesAndSummary()
        await fetchNonTeachingCount()
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [user, id])

  const loadUserData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        navigate('/login')
        return
      }

      // Fetch user profile to get university_id
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('university_id, role')
        .eq('id', session.user.id)
        .single()

      if (profileError || !profile) {
        console.error('Error fetching profile:', profileError)
        navigate('/login')
        return
      }

      // Check if user is UFP
      if (profile.role !== 'UFP') {
        navigate('/ufp-dashboard')
        return
      }

      setUser(profile)
      if (!id) setLoading(false)
    } catch (error) {
      console.error('Error loading user data:', error)
      navigate('/login')
    }
  }

  const fetchCampusDetails = async () => {
    if (!id || !user?.university_id) return

    try {
      const { data, error } = await supabase
        .from('campuses')
        .select('*')
        .eq('id', id)
        .eq('university_id', user.university_id)
        .single()

      if (error) {
        console.error('Error fetching campus:', error)
        navigate('/ufp/campuses')
        return
      }

      setCampus(data)
    } catch (error) {
      console.error('Error in fetchCampusDetails:', error)
      navigate('/ufp/campuses')
    }
  }

  const fetchFacultiesAndSummary = async () => {
    if (!id || !user?.university_id) return
    try {
      const { data: facultiesData, error: facError } = await supabase
        .from('faculties')
        .select('*')
        .eq('university_id', user.university_id)
        .eq('campus_id', id)
        .order('name', { ascending: true })

      if (facError) {
        console.error('Error fetching faculties:', facError)
        return
      }

      const facultyList = facultiesData || []
      setFaculties(facultyList)

      const facultyIds = facultyList.map((f) => f.id)
      if (facultyIds.length === 0) {
        setDepartmentsByFaculty({})
        setProgramsByDepartment({})
        setReportsByProgram({})
        return
      }

      const { data: deptRows, error: deptError } = await supabase
        .from('departments')
        .select('id, name, code, faculty_id')
        .eq('university_id', user.university_id)
        .eq('campus_id', id)
        .in('faculty_id', facultyIds)

      if (deptError) {
        console.error('Error fetching departments for ladder view:', deptError)
      }

      const deptList = deptRows || []
      const deptsByFac = {}
      const deptIds = []
      deptList.forEach((d) => {
        deptIds.push(d.id)
        if (!deptsByFac[d.faculty_id]) deptsByFac[d.faculty_id] = []
        deptsByFac[d.faculty_id].push(d)
      })
      setDepartmentsByFaculty(deptsByFac)

      if (deptIds.length === 0) {
        setProgramsByDepartment({})
        setReportsByProgram({})
        return
      }

      const { data: progRows, error: progError } = await supabase
        .from('programs')
        .select('id, name, degree_level, department_id, faculty_id')
        .eq('university_id', user.university_id)
        .eq('campus_id', id)
        .in('department_id', deptIds)

      if (progError) {
        console.error('Error fetching programs for ladder view:', progError)
      }

      const progList = progRows || []
      const progsByDept = {}
      const programIds = []
      progList.forEach((p) => {
        programIds.push(p.id)
        if (!progsByDept[p.department_id]) progsByDept[p.department_id] = []
        progsByDept[p.department_id].push(p)
      })
      setProgramsByDepartment(progsByDept)

      if (programIds.length === 0) {
        setReportsByProgram({})
        return
      }

      const { data: reportRows, error: reportError } = await supabase
        .from('enrollment_reports')
        .select('id, program_id, academic_year, semester, total_enrolled, male_students, female_students')
        .eq('university_id', user.university_id)
        .eq('campus_id', id)
        .in('program_id', programIds)
        .order('academic_year', { ascending: false })
        .order('semester', { ascending: false })

      if (reportError) {
        console.error('Error fetching enrollment reports for ladder view:', reportError)
      }

      const reportsByProg = {}
      ;(reportRows || []).forEach((row) => {
        const baseTotal =
          row.total_enrolled != null && row.total_enrolled !== undefined
            ? row.total_enrolled
            : (row.male_students || 0) + (row.female_students || 0)
        const entry = {
          id: row.id,
          program_id: row.program_id,
          academic_year: row.academic_year,
          semester: row.semester,
          total_enrolled: baseTotal
        }
        if (!reportsByProg[row.program_id]) reportsByProg[row.program_id] = []
        reportsByProg[row.program_id].push(entry)
      })
      setReportsByProgram(reportsByProg)
    } catch (error) {
      console.error('Error fetching faculties/summary for ladder view:', error)
    }
  }

  const fetchNonTeachingCount = async () => {
    if (!id || !user?.university_id) return
    try {
      const { count } = await supabase
        .from('staff')
        .select('*', { count: 'exact', head: true })
        .eq('university_id', user.university_id)
        .eq('campus_id', id)
        .eq('type', 'Non-Teaching')
      setNonTeachingCount(count ?? 0)
    } catch (e) {
      console.error('Error fetching non-teaching count:', e)
    }
  }

  const renderLadderRows = () => {
    if (!faculties || faculties.length === 0) return null

    const query = searchQuery.trim().toLowerCase()
    const searchActive = query.length > 0
    const matches = (text) => (text || '').toLowerCase().includes(query)

    const rows = []
    const sortedFaculties = [...faculties].sort((a, b) =>
      (a.name || '').localeCompare(b.name || '')
    )

    sortedFaculties.forEach((faculty) => {
      const departments = departmentsByFaculty[faculty.id] || []

      if (searchActive) {
        const facultyMatches = matches(faculty.name) || matches(faculty.code)
        const deptMatches = departments.some((d) => matches(d.name) || matches(d.code))
        const progMatches = departments.some((d) => {
          const deptPrograms = programsByDepartment[d.id] || []
          return deptPrograms.some((p) => matches(p.name) || matches(p.degree_level))
        })
        if (!facultyMatches && !deptMatches && !progMatches) {
          return
        }
      }
      const isFacExpanded = expandedFaculties.has(faculty.id)

      rows.push(
        <DirectoryRow
          key={`fac-${faculty.id}`}
          level={0}
          type="faculty"
          name={faculty.name}
          code={faculty.code}
          focalPerson={faculty.dean_name}
          isExpandable={departments.length > 0}
          isExpanded={isFacExpanded}
          onToggle={departments.length ? () => toggleFaculty(faculty.id) : undefined}
        />
      )

      if (!isFacExpanded) return

      if (departments.length === 0) {
        rows.push(
          <DirectoryRow
            key={`fac-${faculty.id}-empty`}
            level={1}
            type="info"
            name="No departments added yet."
          />
        )
        return
      }

      departments.forEach((dept) => {
        const deptPrograms = programsByDepartment[dept.id] || []
        const isDeptExpanded = expandedDepartments.has(dept.id)

        rows.push(
          <DirectoryRow
            key={`dept-${dept.id}`}
            level={1}
            type="department"
            name={dept.name}
            code={dept.code}
            focalPerson={dept.focal_person_name}
            isExpandable={deptPrograms.length > 0}
            isExpanded={isDeptExpanded}
            onToggle={deptPrograms.length ? () => toggleDepartment(dept.id) : undefined}
          />
        )

        if (!isDeptExpanded) return

        if (deptPrograms.length === 0) {
          rows.push(
            <DirectoryRow
              key={`dept-${dept.id}-empty`}
              level={2}
              type="info"
              name="No programs added yet."
            />
          )
          return
        }

        deptPrograms.forEach((prog) => {
          const programReports = reportsByProgram[prog.id] || []
          const hasReports = programReports.length > 0
          const isProgExpanded = expandedPrograms.has(prog.id)
          const { result } = classifyProgram(prog.name, faculty.name)

          rows.push(
            <DirectoryRow
              key={`prog-${prog.id}`}
              level={2}
              type="program"
              name={prog.name}
              code={prog.degree_level}
              isExpandable={hasReports}
              isExpanded={isProgExpanded}
              onToggle={hasReports ? () => toggleProgram(prog.id) : undefined}
              status={hasReports ? null : 'Missing report'}
              statusTone={hasReports ? undefined : 'danger'}
            />
          )

          if (isProgExpanded && !hasReports) {
            rows.push(
              <DirectoryRow
                key={`prog-${prog.id}-empty`}
                level={3}
                type="info"
                name="No enrollment reports added yet."
              />
            )
            return
          }

          if (!isProgExpanded || !hasReports) return

          programReports.forEach((rep) => {
            const codeText = rep.academic_year
              ? rep.semester
                ? `${rep.academic_year} • ${rep.semester}`
                : rep.academic_year
              : rep.semester || ''
            const totalLabel =
              rep.total_enrolled != null
                ? `${Number(rep.total_enrolled).toLocaleString()} students`
                : undefined

            rows.push(
              <DirectoryRow
                key={`rep-${rep.id}`}
                level={3}
                type="report"
                name={`Enrollment Report${codeText ? ` – ${codeText}` : ''}`}
                code={codeText}
                totalLabel={totalLabel}
                stemBadge={{
                  label: result === 'STEM' ? 'STEM' : 'Non-STEM',
                  tone: result === 'STEM' ? 'stem' : 'nonstem'
                }}
              />
            )
          })
        })
      })
    })

    return rows
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-800/10 to-[#f8fafc] flex items-center justify-center">
        <div className="text-cyan-600 text-xl flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    )
  }

  if (!campus) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-800/10 to-[#f8fafc] flex items-center justify-center">
        <div className="text-center">
          <Building2 className="w-16 h-16 mx-auto mb-4 text-slate-400" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Campus Not Found</h2>
          <p className="text-slate-600 mb-4">The campus you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-full font-semibold transition-all"
          >
            Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-800/10 to-[#f8fafc] p-8">
      {/* Glass Header Container */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="bg-white/5 backdrop-blur-md border-b border-white/10 p-8 mb-8 rounded-t-3xl"
      >
        {/* Back Button */}
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-full font-semibold transition-all shadow-lg shadow-cyan-400/30 mb-6 group"
        >
          <ArrowLeft className="w-5 h-5 text-white group-hover:-translate-x-1 transition-transform" />
          <span className="text-white">Back</span>
        </motion.button>

        <Breadcrumbs
          items={[
            { label: 'Dashboard', path: '/ufp-dashboard' },
            { label: campus.name, path: `/ufp/campus/${id}` },
            { label: 'Faculties' }
          ]}
          className="text-white/80 mb-2"
        />

        {/* Header */}
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">{campus.name}</h2>
          <div className="flex items-center gap-4 text-white/90">
            <span className="text-sm">{campus.city}</span>
            {campus.is_main_campus && (
              <span className="px-3 py-1 bg-emerald-500 text-white text-xs font-semibold rounded-full">
                Main Campus
              </span>
            )}
            {campus.code && (
              <span className="px-3 py-1 bg-white/10 text-white text-xs font-mono rounded-full">
                {campus.code}
              </span>
            )}
          </div>
        </div>
      </motion.div>

      {/* Faculty Directory ladder view */}
      <div className="bg-white rounded-3xl shadow-xl shadow-blue-900/10 border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">All Faculties</h3>
            <p className="text-xs text-slate-500">
              Expand a faculty to see its departments, programs, and enrollment reports in a single nested view.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate(`/ufp/faculties?campusId=${id}`)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800"
          >
            <Plus className="w-4 h-4" />
            Add Faculty
          </button>
        </div>

        <div className="border border-slate-200 rounded-xl overflow-hidden">
          {/* Header row */}
          <div className="flex items-center bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
            <div className="flex-1 px-3 py-2">Name / Hierarchy</div>
            <div className="w-52 px-3 py-2">Code / Type</div>
            <div className="w-64 px-3 py-2">Focal / Status</div>
          </div>

          {/* Body */}
          <div className="max-h-[520px] overflow-y-auto">
            {faculties.length === 0 ? (
              <div className="px-4 py-6 text-sm text-slate-500">
                No faculties added yet for this campus. Use the Add Faculty button to get started.
              </div>
            ) : (
              renderLadderRows()
            )}
          </div>
        </div>
      </div>

      {/* Campus-level: Non-Teaching Staff (optional entry) */}
      <div className="mt-8 flex justify-end">
        <button
          onClick={() => navigate(`/ufp/staff?campusId=${id}&staffType=Non-Teaching`)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-full text-slate-700 hover:bg-slate-50 text-sm font-medium shadow-sm"
        >
          <Briefcase className="w-4 h-4" />
          Non-Teaching Staff ({nonTeachingCount})
        </button>
      </div>
    </div>
  )
}

export default CampusDetailView
