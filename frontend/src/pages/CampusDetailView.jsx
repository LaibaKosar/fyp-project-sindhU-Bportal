import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabaseClient'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Building2,
  Plus,
  Briefcase,
  MapPin
} from 'lucide-react'
import Breadcrumbs from '../components/Breadcrumbs'
import {
  UFP_ADMIN_HERO_SURFACE_CLASS,
  UFP_ADMIN_HERO_BACK_BUTTON_CLASS,
  UFP_ADMIN_HERO_ICON_WRAP_CLASS,
} from '../components/UfpManagementPageHeader'
import DirectoryRow from '../components/DirectoryRow'
import { UfpAdminShell, UfpAdminContainer, UfpAdminLoadingCenter } from '../components/UfpAdminShell'

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
        .select('id, name, code, faculty_id, head_of_department')
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
            focalPerson={dept.head_of_department}
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
              status={hasReports ? 'Report submitted' : 'Missing report'}
              statusTone={hasReports ? 'success' : 'danger'}
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
    return <UfpAdminLoadingCenter />
  }

  if (!campus) {
    return (
      <UfpAdminShell>
        <UfpAdminContainer>
          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <Building2 className="mx-auto mb-4 h-14 w-14 text-slate-300" />
            <h2 className="mb-2 text-xl font-semibold text-slate-900">Campus Not Found</h2>
            <p className="mb-6 text-sm text-slate-600">The campus you&apos;re looking for doesn&apos;t exist.</p>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Back
            </button>
          </div>
        </UfpAdminContainer>
      </UfpAdminShell>
    )
  }

  return (
    <UfpAdminShell>
      <UfpAdminContainer>
        <motion.div
          initial={{ y: -12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className={`mb-6 ${UFP_ADMIN_HERO_SURFACE_CLASS}`}
        >
          <motion.button
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            type="button"
            onClick={() => navigate(-1)}
            className={`group/back ${UFP_ADMIN_HERO_BACK_BUTTON_CLASS}`}
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover/back:-translate-x-0.5" />
            Back
          </motion.button>

          <Breadcrumbs
            items={[
              { label: 'Dashboard', path: '/ufp-dashboard' },
              { label: campus.name, path: `/ufp/campus/${id}` },
              { label: 'Faculties' }
            ]}
            variant="onDark"
            className="mb-2 text-sm"
          />

          <div className="flex items-start gap-4">
            <div className={UFP_ADMIN_HERO_ICON_WRAP_CLASS} aria-hidden>
              <MapPin className="h-5 w-5" strokeWidth={2} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="mb-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">{campus.name}</h2>
              <div className="flex flex-wrap items-center gap-2 text-sm text-slate-300 sm:gap-3">
                <span>{campus.city}</span>
                {campus.is_main_campus && (
                  <span className="rounded-full bg-emerald-600 px-3 py-0.5 text-xs font-semibold text-white">
                    Main Campus
                  </span>
                )}
                {campus.code && (
                  <span className="rounded-full border border-white/20 bg-white/10 px-3 py-0.5 font-mono text-xs font-medium text-slate-200">
                    {campus.code}
                  </span>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      {/* Faculty Directory ladder view */}
      <div className="rounded-xl border border-slate-200/90 bg-gradient-to-br from-white via-slate-50/40 to-blue-50/35 p-5 shadow-md shadow-blue-900/5 shadow-slate-300/18 ring-1 ring-blue-950/[0.05] ring-slate-200/45 sm:p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 border-l-4 border-l-blue-600 pl-3">
            <h3 className="text-xl font-semibold tracking-tight text-slate-900">All Faculties</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Expand a faculty to see its departments, programs, and enrollment reports in a single nested view.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate(`/ufp/faculties?campusId=${id}`)}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Add Faculty
          </button>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200">
          {/* Header row */}
          <div className="flex items-center border-b-2 border-blue-200/70 bg-gradient-to-r from-blue-50/95 via-sky-50/90 to-blue-50/95 text-[11px] font-semibold uppercase tracking-wide text-slate-700">
            <div className="flex-1 px-3 py-2">Name / Hierarchy</div>
            <div className="w-52 px-3 py-2">Code / Type</div>
            <div className="w-[17.5rem] shrink-0 px-3 py-2">Focal / Status</div>
          </div>

          {/* Body */}
          <div className="max-h-[520px] overflow-y-auto bg-slate-50">
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
      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={() => navigate(`/ufp/staff?campusId=${id}&staffType=Non-Teaching`)}
          className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-white px-5 py-2.5 text-sm font-medium text-blue-800 shadow-sm hover:bg-blue-50"
        >
          <Briefcase className="h-4 w-4" />
          Non-Teaching Staff ({nonTeachingCount})
        </button>
      </div>
      </UfpAdminContainer>
    </UfpAdminShell>
  )
}

export default CampusDetailView
