import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabaseClient'
import ComplianceAnalytics from '../components/ComplianceAnalytics'
import { 
  Search, Building2, Users, AlertTriangle, 
  ChevronRight, BarChart3, GraduationCap, MapPin,
  Home, CheckCircle, X, UserMinus
} from 'lucide-react'

/** Staffing shortfall severity from FTE gap (additional teachers needed). */
function staffingGapSeverity(gap) {
  if (gap >= 15) return 'high'
  if (gap >= 5) return 'medium'
  return 'low'
}

function StaffingGapRow({ row }) {
  const {
    name,
    gap,
    threshold,
    currentRatio,
    currentTeachers,
    requiredTeachers,
    ceilingLabel,
    severity,
  } = row
  const rail =
    severity === 'high' ? 'bg-red-500' : severity === 'medium' ? 'bg-amber-500' : 'bg-orange-400'
  const cardBorder =
    severity === 'high'
      ? 'border-red-500/35'
      : severity === 'medium'
        ? 'border-amber-500/35'
        : 'border-orange-400/35'

  return (
    <div
      className={`flex overflow-hidden rounded-xl border ${cardBorder} bg-white/[0.06]`}
      role="status"
      aria-label={`${name}: above HEC ceiling, shortfall ${gap} teaching posts`}
    >
      <div className={`w-1 shrink-0 ${rail}`} aria-hidden />
      <div className="min-w-0 flex-1 p-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <AlertTriangle
              className={`h-4 w-4 shrink-0 ${severity === 'high' ? 'text-red-400' : severity === 'medium' ? 'text-amber-400' : 'text-orange-300'}`}
              aria-hidden
            />
            <span className="truncate text-sm font-semibold text-white">{name}</span>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-red-500/40 bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-200">
            <UserMinus className="h-3 w-3" aria-hidden />
            Understaffed
          </span>
        </div>
        <div className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px] tabular-nums sm:grid-cols-4">
          <div>
            <div className="text-slate-500">Current STR</div>
            <div className="font-semibold text-white">{Number(currentRatio).toFixed(1)}:1</div>
          </div>
          <div>
            <div className="text-slate-500">Ceiling</div>
            <div className="font-semibold text-slate-200">{threshold}:1</div>
          </div>
          <div>
            <div className="text-slate-500">Teaching staff</div>
            <div className="font-semibold text-slate-200">{currentTeachers}</div>
          </div>
          <div>
            <div className="text-slate-500">Shortfall</div>
            <div className="font-bold text-red-400">+{gap} teacher{gap !== 1 ? 's' : ''}</div>
          </div>
        </div>
        <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
          <span className="text-slate-400">{ceilingLabel}.</span>{' '}
          Need <span className="font-semibold text-slate-300">{requiredTeachers}</span> teaching posts
          at {threshold}:1 for current enrollment vs <span className="font-semibold text-slate-300">{currentTeachers}</span> now.
        </p>
      </div>
    </div>
  )
}

const InstitutionalIntelligence = () => {
  // View mode state
  const [viewMode, setViewMode] = useState('gallery') // 'gallery' | 'campuses' | 'data'
  
  // Data states
  const [universities, setUniversities] = useState([])
  const [selectedUni, setSelectedUni] = useState(null)
  const [campuses, setCampuses] = useState([])
  const [selectedCampus, setSelectedCampus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [details, setDetails] = useState({ faculties: [], departments: [], staff: [] })
  const [activeFaculty, setActiveFaculty] = useState(null)
  const [enrollmentTotal, setEnrollmentTotal] = useState(0)
  
  // Staff search and filter
  const [staffSearchQuery, setStaffSearchQuery] = useState('')
  const [staffFilter, setStaffFilter] = useState('All') // 'All' | 'Teaching' | 'Non-Teaching'
  
  // Presentation Mode state
  const [isPresentationMode, setIsPresentationMode] = useState(() => {
    const stored = sessionStorage.getItem('presentationMode')
    if (stored === null) return true
    return stored === 'true'
  })

  useEffect(() => {
    fetchUniversities()
  }, [])

  // Sync presentation mode to sessionStorage whenever it changes
  useEffect(() => {
    sessionStorage.setItem('presentationMode', isPresentationMode.toString())
  }, [isPresentationMode])

  useEffect(() => {
    if (viewMode === 'campuses' && selectedUni) {
      fetchCampuses(selectedUni.id)
    }
  }, [viewMode, selectedUni])

  useEffect(() => {
    if (viewMode === 'data' && selectedUni && selectedCampus) {
      fetchInstitutionalData(selectedUni.id, selectedCampus.id)
    }
  }, [viewMode, selectedUni, selectedCampus])

  // Fetch active universities with campus counts
  const fetchUniversities = async () => {
    setLoading(true)
    try {
      // Fetch all universities
      const { data: allUnis, error: allError } = await supabase
        .from('universities')
        .select('*')
        .order('name', { ascending: true })

      if (allError) {
        console.error('Error fetching universities:', allError)
        setLoading(false)
        return
      }

      if (!allUnis || allUnis.length === 0) {
        setUniversities([])
        setLoading(false)
        return
      }

      // Fetch all campuses once and group by university_id
      const { data: allCampuses, error: campusesError } = await supabase
        .from('campuses')
        .select('university_id')

      if (campusesError) {
        console.error('Error fetching campuses:', campusesError)
      }

      // Create a map of university_id -> campus count (same key logic: String(id).toLowerCase().trim())
      const campusCountMap = new Map()
      if (allCampuses) {
        allCampuses.forEach(campus => {
          const uniId = (campus.university_id != null ? campus.university_id.toString() : '').toLowerCase().trim()
          const currentCount = campusCountMap.get(uniId) || 0
          campusCountMap.set(uniId, currentCount + 1)
        })
        // Debug: Log campus counts for verification
        console.log('Campus Count Map:', Array.from(campusCountMap.entries()))
      }

      // Get all profiles with UFP role and university_id
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, university_id, role, is_setup_complete')
        .eq('role', 'UFP')

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError)
      }

      // Create a map of university_id -> profile (same key logic as lookup: String(id).toLowerCase().trim())
      const profileMap = new Map()
      if (profiles) {
        profiles.forEach(profile => {
          const uniId = profile.university_id
          if (uniId != null && uniId !== '') {
            const key = uniId.toString().toLowerCase().trim()
            if (!profileMap.has(key)) {
              profileMap.set(key, profile)
            }
          }
        })
      }

      // Map universities with focal person status and campus counts
      const universitiesWithStatus = allUnis.map((uni) => {
        const uniIdString = (uni.id != null ? uni.id.toString() : '').toLowerCase().trim()
        let profile = profileMap.get(uniIdString)
        // Dirty match: if exact key missed, find by loose comparison (same normalized key)
        if (!profile) {
          for (const [k, v] of profileMap) {
            if (k.toLowerCase().trim() === uniIdString) {
              profile = v
              break
            }
          }
        }
        if (!profile) {
          console.log('Final Check:', { uniIdString, profileKeys: Array.from(profileMap.keys()) })
        }
        const hasFocalPerson = !!profile
        const campusCount = campusCountMap.get(uniIdString) || 0

        // Debug: Log specific university for verification
        if (uni.name === 'Sukkur IBA University') {
          console.log('Sukkur IBA University Debug:', {
            uniId: uni.id,
            uniIdString,
            campusCount,
            expectedId: 'fe1a140d-7e21-414d-9522-6cd53d1c66b3',
            matches: uniIdString === 'fe1a140d-7e21-414d-9522-6cd53d1c66b3'
          })
        }

        return {
          ...uni,
          hasFocalPerson,
          focalPersonEmail: profile?.email || null,
          campusCount,
          isSetupComplete: Boolean(profile?.is_setup_complete)
        }
      })

      // Filter to only show active universities (focal person + initial wizard completed)
      const activeUniversities = universitiesWithStatus.filter(u => u.hasFocalPerson && u.isSetupComplete)
      setUniversities(activeUniversities)
    } catch (error) {
      console.error('Error in fetchUniversities:', error)
    } finally {
      setLoading(false)
    }
  }

  // Fetch campuses for a university
  const fetchCampuses = async (uniId) => {
    setLoading(true)
    try {
      // Debug: Log the ID being used for the query
      const uniIdString = String(uniId)
      console.log('fetchCampuses called with uniId:', {
        uniId,
        uniIdString,
        expectedId: 'fe1a140d-7e21-414d-9522-6cd53d1c66b3',
        matches: uniIdString === 'fe1a140d-7e21-414d-9522-6cd53d1c66b3',
        type: typeof uniId
      })

      const { data, error } = await supabase
        .from('campuses')
        .select('*')
        .eq('university_id', uniId)
        .order('is_main_campus', { ascending: false })
        .order('name', { ascending: true })

      if (error) {
        console.error('Error fetching campuses:', error)
        return
      }

      console.log('Campuses fetched:', { count: data?.length || 0, data })
      setCampuses(data || [])
    } catch (error) {
      console.error('Error in fetchCampuses:', error)
    } finally {
    setLoading(false)
    }
  }

  // Fetch institutional data filtered by campus
  const fetchInstitutionalData = async (uniId, campusId) => {
    setLoading(true)
    try {
      const [facRes, deptRes, staffRes, enrollmentRes] = await Promise.all([
        supabase.from('faculties').select('*').eq('university_id', uniId).eq('campus_id', campusId),
        supabase.from('departments').select('*').eq('university_id', uniId).eq('campus_id', campusId),
        supabase.from('staff').select('*').eq('university_id', uniId).eq('campus_id', campusId),
        supabase.from('enrollment_reports')
          .select('total_enrolled, male_students, female_students, program_id')
          .eq('university_id', uniId)
          .eq('campus_id', campusId)
          .order('created_at', { ascending: false })
      ])
      
      // Get latest enrollment report's total_enrolled (fallback for empty departments.total_students)
      let latestEnrollmentTotal = 0
      if (enrollmentRes.data && enrollmentRes.data.length > 0) {
        const latestReport = enrollmentRes.data[0] // Already ordered by created_at desc
        if (latestReport.total_enrolled !== null && latestReport.total_enrolled !== undefined) {
          latestEnrollmentTotal = latestReport.total_enrolled
        } else {
          // Fallback to male + female if total_enrolled not available
          latestEnrollmentTotal = (latestReport.male_students || 0) + (latestReport.female_students || 0)
        }
        console.log('Latest enrollment report total_enrolled:', latestEnrollmentTotal)
      }
      // Store enrollment total for chart Y-axis context
      setEnrollmentTotal(latestEnrollmentTotal)
      
      // Merge enrollment data with departments - use enrollment total as fallback for empty total_students
      const departmentsWithEnrollment = (deptRes.data || []).map(dept => ({
        ...dept,
        // Use enrollment total if department's total_students is empty/zero
        total_students: (dept.total_students && dept.total_students > 0) 
          ? dept.total_students 
          : latestEnrollmentTotal
      }))
      
    setDetails({
      faculties: facRes.data || [],
        departments: departmentsWithEnrollment,
      staff: staffRes.data || []
    })
      
      // Don't auto-select faculty - keep activeFaculty as null to show all departments initially
      // This allows users to see all departments when a campus is first selected
      // User can then click a faculty to filter if desired
    } catch (error) {
      console.error('Error in fetchInstitutionalData:', error)
    } finally {
    setLoading(false)
    }
  }

  // Presentation Mode Mock Data
  // Mock Faculties (5-6 with Dean names)
  const mockFaculties = [
    { id: 'mock-fac-1', name: 'Faculty of Medicine & Health Sciences', code: 'FMHS', dean_name: 'Dr. Sarah Ahmed', university_id: null, campus_id: null },
    { id: 'mock-fac-2', name: 'Faculty of Engineering & Technology', code: 'FET', dean_name: 'Prof. Muhammad Hassan', university_id: null, campus_id: null },
    { id: 'mock-fac-3', name: 'Faculty of Humanities & Social Sciences', code: 'FHSS', dean_name: 'Dr. Fatima Khan', university_id: null, campus_id: null },
    { id: 'mock-fac-4', name: 'Faculty of Natural Sciences', code: 'FNS', dean_name: 'Prof. Ali Raza', university_id: null, campus_id: null },
    { id: 'mock-fac-5', name: 'Faculty of Business & Management', code: 'FBM', dean_name: 'Dr. Zainab Malik', university_id: null, campus_id: null },
    { id: 'mock-fac-6', name: 'Faculty of Law & Legal Studies', code: 'FLS', dean_name: 'Prof. Ahmed Sheikh', university_id: null, campus_id: null }
  ]

  // Mock Departments (10+ matching presentationData ratios)
  const mockDepartments = [
    { id: 'mock-dept-1', name: 'Business Administration', faculty_id: 'mock-fac-5', campus_id: null, total_students: 500, discipline_type: 'Social Science', teachers: 20 },
    { id: 'mock-dept-2', name: 'Electrical Engineering', faculty_id: 'mock-fac-2', campus_id: null, total_students: 360, discipline_type: 'Science/Lab', teachers: 20 },
    { id: 'mock-dept-3', name: 'Computer Science', faculty_id: 'mock-fac-2', campus_id: null, total_students: 440, discipline_type: 'Science/Lab', teachers: 20 },
    { id: 'mock-dept-4', name: 'Mathematics', faculty_id: 'mock-fac-4', campus_id: null, total_students: 560, discipline_type: 'Social Science', teachers: 20 },
    { id: 'mock-dept-5', name: 'Pharmacy', faculty_id: 'mock-fac-1', campus_id: null, total_students: 900, discipline_type: 'Science/Lab', teachers: 20 },
    { id: 'mock-dept-6', name: 'Law', faculty_id: 'mock-fac-6', campus_id: null, total_students: 1200, discipline_type: 'Social Science', teachers: 20 },
    { id: 'mock-dept-7', name: 'Media Studies', faculty_id: 'mock-fac-3', campus_id: null, total_students: 700, discipline_type: 'Social Science', teachers: 20 },
    { id: 'mock-dept-8', name: 'Chemistry', faculty_id: 'mock-fac-4', campus_id: null, total_students: 380, discipline_type: 'Science/Lab', teachers: 20 },
    { id: 'mock-dept-9', name: 'English Literature', faculty_id: 'mock-fac-3', campus_id: null, total_students: 540, discipline_type: 'Social Science', teachers: 20 },
    { id: 'mock-dept-10', name: 'Physics', faculty_id: 'mock-fac-4', campus_id: null, total_students: 420, discipline_type: 'Science/Lab', teachers: 20 },
    { id: 'mock-dept-11', name: 'Mechanical Engineering', faculty_id: 'mock-fac-2', campus_id: null, total_students: 320, discipline_type: 'Science/Lab', teachers: 18 },
    { id: 'mock-dept-12', name: 'Economics', faculty_id: 'mock-fac-5', campus_id: null, total_students: 480, discipline_type: 'Social Science', teachers: 18 }
  ]

  // Mock Staff Directory (15+ faculty members)
  const mockStaff = [
    { id: 'mock-staff-1', full_name: 'Prof. Dr. Sarah Ahmed', type: 'Teaching', department_id: 'mock-dept-1', designation: 'Professor' },
    { id: 'mock-staff-2', full_name: 'Dr. Muhammad Hassan', type: 'Teaching', department_id: 'mock-dept-2', designation: 'Associate Professor' },
    { id: 'mock-staff-3', full_name: 'Dr. Fatima Khan', type: 'Teaching', department_id: 'mock-dept-3', designation: 'Assistant Professor' },
    { id: 'mock-staff-4', full_name: 'Prof. Ali Raza', type: 'Teaching', department_id: 'mock-dept-4', designation: 'Professor' },
    { id: 'mock-staff-5', full_name: 'Dr. Zainab Malik', type: 'Teaching', department_id: 'mock-dept-5', designation: 'Associate Professor' },
    { id: 'mock-staff-6', full_name: 'Prof. Ahmed Sheikh', type: 'Teaching', department_id: 'mock-dept-6', designation: 'Professor' },
    { id: 'mock-staff-7', full_name: 'Dr. Ayesha Iqbal', type: 'Teaching', department_id: 'mock-dept-7', designation: 'Lecturer' },
    { id: 'mock-staff-8', full_name: 'Dr. Usman Ali', type: 'Teaching', department_id: 'mock-dept-8', designation: 'Assistant Professor' },
    { id: 'mock-staff-9', full_name: 'Prof. Hina Rauf', type: 'Teaching', department_id: 'mock-dept-9', designation: 'Professor' },
    { id: 'mock-staff-10', full_name: 'Dr. Bilal Ahmed', type: 'Teaching', department_id: 'mock-dept-10', designation: 'Associate Professor' },
    { id: 'mock-staff-11', full_name: 'Dr. Sana Khan', type: 'Teaching', department_id: 'mock-dept-11', designation: 'Assistant Professor' },
    { id: 'mock-staff-12', full_name: 'Prof. Tariq Mahmood', type: 'Teaching', department_id: 'mock-dept-12', designation: 'Professor' },
    { id: 'mock-staff-13', full_name: 'Dr. Nida Hassan', type: 'Teaching', department_id: 'mock-dept-1', designation: 'Lecturer' },
    { id: 'mock-staff-14', full_name: 'Dr. Faisal Raza', type: 'Teaching', department_id: 'mock-dept-2', designation: 'Assistant Professor' },
    { id: 'mock-staff-15', full_name: 'Prof. Amna Sheikh', type: 'Teaching', department_id: 'mock-dept-3', designation: 'Professor' },
    { id: 'mock-staff-16', full_name: 'Dr. Hamza Ali', type: 'Teaching', department_id: 'mock-dept-4', designation: 'Lecturer' },
    { id: 'mock-staff-17', full_name: 'Dr. Mariam Khan', type: 'Teaching', department_id: 'mock-dept-5', designation: 'Assistant Professor' },
    { id: 'mock-staff-18', full_name: 'Mr. Asad Malik', type: 'Non-Teaching', department_id: 'mock-dept-1', designation: 'Administrative Officer' },
    { id: 'mock-staff-19', full_name: 'Ms. Hira Ahmed', type: 'Non-Teaching', department_id: 'mock-dept-2', designation: 'Lab Assistant' }
  ]

  // Presentation Mode Chart Data (matching mock departments - using full names for consistency)
  const presentationData = [
    { name: 'Business Administration', ratio: 25, threshold: 30, faculty_id: 'mock-fac-5', total_students: 500, teachers: 20 },
    { name: 'Electrical Engineering', ratio: 18, threshold: 20, faculty_id: 'mock-fac-2', total_students: 360, teachers: 20 },
    { name: 'Computer Science', ratio: 22, threshold: 20, faculty_id: 'mock-fac-2', total_students: 440, teachers: 20 },
    { name: 'Mathematics', ratio: 28, threshold: 30, faculty_id: 'mock-fac-4', total_students: 560, teachers: 20 },
    { name: 'Pharmacy', ratio: 45, threshold: 20, faculty_id: 'mock-fac-1', total_students: 900, teachers: 20 },
    { name: 'Law', ratio: 60, threshold: 30, faculty_id: 'mock-fac-6', total_students: 1200, teachers: 20 },
    { name: 'Media Studies', ratio: 35, threshold: 30, faculty_id: 'mock-fac-3', total_students: 700, teachers: 20 },
    { name: 'Chemistry', ratio: 19, threshold: 20, faculty_id: 'mock-fac-4', total_students: 380, teachers: 20 },
    { name: 'English Literature', ratio: 27, threshold: 30, faculty_id: 'mock-fac-3', total_students: 540, teachers: 20 },
    { name: 'Physics', ratio: 21, threshold: 20, faculty_id: 'mock-fac-4', total_students: 420, teachers: 20 }
  ]

  // Mock Quick Stats
  const mockTotalStudents = 12000
  const mockTotalFaculty = 450
  const mockTotalDepartments = mockDepartments.length

  // Get data source based on presentation mode
  const displayDetails = isPresentationMode 
    ? { faculties: mockFaculties, departments: mockDepartments, staff: mockStaff }
    : details

  // Calculate STR for Chart (only departments from selected campus)
  const liveChartData = displayDetails.departments
    .filter(dept => !selectedCampus || dept.campus_id === selectedCampus.id)
    .map(dept => {
    const teachers = displayDetails.staff.filter(s => s.department_id === dept.id && s.type === 'Teaching').length
    const ratio = teachers > 0 ? (dept.total_students / teachers).toFixed(1) : 0
    return {
      name: dept.name,
      ratio: parseFloat(ratio),
      threshold: dept.discipline_type === 'Science/Lab' ? 20 : 30,
      faculty_id: dept.faculty_id, // Include faculty_id for filtering
      total_students: dept.total_students || 0, // Include for staffing gap calculation
      teachers: teachers // Include current teacher count
    }
  })

  // Use presentation data if mode is on, otherwise use live data
  const chartData = isPresentationMode ? presentationData : liveChartData

  // Calculate compliance audit metrics
  const violations = chartData.filter(dept => dept.ratio > dept.threshold)
  const violationCount = violations.length
  const isCompliant = violationCount === 0

  // Calculate staffing gaps for violating departments (sorted worst-first for scanability)
  const staffingGaps = violations
    .map((dept) => {
      if (dept.total_students === 0 || dept.ratio === 0) return null
      const requiredTeachers = Math.ceil(dept.total_students / dept.threshold)
      const currentTeachers = dept.teachers
      const gap = requiredTeachers - currentTeachers
      if (gap <= 0) return null
      const ceilingLabel =
        dept.threshold === 20 ? 'Science max 20:1' : 'Social sciences max 30:1'
      return {
        name: dept.name,
        gap,
        threshold: dept.threshold,
        currentRatio: dept.ratio,
        currentTeachers,
        requiredTeachers,
        ceilingLabel,
        severity: staffingGapSeverity(gap),
      }
    })
    .filter(Boolean)
    .sort((a, b) => b.gap - a.gap)

  const compliantDepartmentCount = chartData.length - violationCount

  // Filter staff based on search and filter
  const filteredStaff = displayDetails.staff.filter(member => {
    const matchesSearch = staffSearchQuery === '' || 
      (member.full_name || '').toLowerCase().includes(staffSearchQuery.toLowerCase())
    const matchesFilter = staffFilter === 'All' || member.type === staffFilter
    return matchesSearch && matchesFilter
  })

  // Get departments for active faculty
  const facultyDepartments = activeFaculty
    ? displayDetails.departments.filter(d => d.faculty_id === activeFaculty.id)
    : []

  // Calculate quick stats (use mock data in presentation mode, otherwise use enrollment data)
  const totalStudents = isPresentationMode 
    ? mockTotalStudents 
    : displayDetails.departments.reduce((sum, dept) => sum + (dept.total_students || 0), 0)
  const totalFaculty = isPresentationMode 
    ? mockTotalFaculty 
    : displayDetails.staff.filter(s => s.type === 'Teaching').length
  const totalDepartments = isPresentationMode 
    ? mockTotalDepartments 
    : displayDetails.departments.length
  
  // Debug: Log totalStudents to verify enrollment data is being used
  console.log('Quick Stats:', { totalStudents, totalFaculty, totalDepartments, enrollmentDataUsed: totalStudents > 0 })

  // Breadcrumb component
  const Breadcrumb = () => {
    if (viewMode === 'gallery') return null

  return (
      <div className="flex items-center gap-2 text-sm text-slate-400 mb-6">
        <button 
          onClick={() => { 
            setViewMode('gallery')
            setSelectedUni(null)
            setSelectedCampus(null)
            setCampuses([])
            setDetails({ faculties: [], departments: [], staff: [] })
            setActiveFaculty(null)
            setStaffSearchQuery('')
            setStaffFilter('All')
            // Re-fetch universities to refresh campus counts
            fetchUniversities()
          }}
          className="hover:text-white transition-colors flex items-center gap-1"
        >
          <Home className="w-4 h-4" />
          <span>Home</span>
        </button>
        {selectedUni && (
          <>
            <ChevronRight className="w-4 h-4" />
            <button
              onClick={() => {
                setViewMode('campuses')
                setSelectedCampus(null)
              }}
              className="hover:text-white transition-colors"
            >
              {selectedUni.name}
            </button>
          </>
        )}
        {selectedCampus && (
          <>
            <ChevronRight className="w-4 h-4" />
            <span className="text-white">{selectedCampus.name}</span>
          </>
        )}
      </div>
    )
  }

  // Level 1: University Gallery
  const renderUniversityGallery = () => {
    if (loading) {
      return (
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-cyan-500" />
        </div>
      )
    }

    if (universities.length === 0) {
      return (
        <div className="bg-white/5 backdrop-blur-md p-12 rounded-3xl border border-white/10 text-center">
          <Building2 className="w-16 h-16 mx-auto mb-4 text-slate-400" />
          <p className="text-slate-400 text-lg">
            No active universities found. Universities must have a registered focal person to appear here.
          </p>
        </div>
      )
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {universities.map((uni) => (
          <motion.div
              key={uni.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.02 }}
            className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-6 cursor-pointer transition-all hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/10"
            onClick={() => {
              setSelectedUni(uni)
              setViewMode('campuses')
            }}
          >
            {/* University Logo */}
            <div className="flex justify-center mb-4">
              {uni.logo_url ? (
                <img 
                  src={uni.logo_url} 
                  alt={uni.name}
                  className="w-20 h-20 object-contain rounded-lg"
                />
              ) : (
                <div className="w-20 h-20 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                  <Building2 className="w-10 h-10 text-cyan-400" />
                </div>
              )}
            </div>

            {/* University Name */}
            <h3 className="text-lg font-bold text-white text-center mb-3">
              {uni.name}
            </h3>

            {/* Campus Count Badge */}
            <div className="flex justify-center">
              <span className="bg-cyan-500/20 text-cyan-400 px-3 py-1 rounded-lg text-xs font-semibold">
                {uni.campusCount} {uni.campusCount === 1 ? 'Campus' : 'Campuses'}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    )
  }

  // Level 2: Campus Selector
  const renderCampusSelector = () => {
    if (loading) {
      return (
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-cyan-500" />
        </div>
      )
    }

    if (campuses.length === 0) {
      return (
        <div className="bg-white/5 backdrop-blur-md p-12 rounded-3xl border border-white/10 text-center">
          <MapPin className="w-16 h-16 mx-auto mb-4 text-slate-400" />
          <p className="text-slate-400 text-lg">
            No campuses registered for this university yet.
          </p>
        </div>
      )
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {campuses.map((campus) => (
          <motion.div
            key={campus.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.02 }}
            className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 px-5 py-5 cursor-pointer transition-all hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/10 flex flex-row items-center gap-4 min-w-0"
            onClick={() => {
              setSelectedCampus(campus)
              setViewMode('data')
              setActiveFaculty(null) // Reset to show all departments initially
            }}
          >
            {/* Left: Text block */}
            <div className="flex-1 min-w-0 flex flex-col items-start gap-1">
              <h3 className="text-lg font-bold text-white text-left leading-tight">
                {campus.name}
              </h3>
              {campus.city && (
                <p className="text-sm text-slate-400 text-left">
                  {campus.city}
                </p>
              )}
              {campus.is_main_campus && (
                <span className="bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-lg text-xs font-semibold mt-1">
                  Main Campus
                </span>
              )}
            </div>

            {/* Right: Enlarged image */}
            <div className="flex-shrink-0">
              {campus.campus_photo_url ? (
                <img
                  src={campus.campus_photo_url}
                  alt={campus.name}
                  className="w-28 h-28 sm:w-32 sm:h-32 object-cover rounded-xl"
                />
              ) : (
                <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                  <MapPin className="w-14 h-14 text-cyan-400" />
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    )
  }

  // Level 3: Data Command Center
  const renderDataCommandCenter = () => {
    if (loading) {
      return (
              <div className="h-64 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-cyan-500" />
        </div>
      )
    }

    return (
      <div className="space-y-8">
        {/* Dashboard Header */}
        <div className="bg-white/5 backdrop-blur-md p-6 rounded-3xl border border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">
                {isPresentationMode ? 'Demo Mode - Sample Data' : selectedCampus?.name}
              </h2>
              {selectedCampus?.city && !isPresentationMode && (
                <p className="text-slate-400 text-sm flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  {selectedCampus.city}
                </p>
              )}
              {isPresentationMode && (
                <p className="text-slate-400 text-sm flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Presentation data for demonstration purposes
                </p>
              )}
            </div>
            <div className="flex items-center gap-4">
              {/* Demo Mode Toggle */}
              <div className="flex items-center gap-3">
                <span className={`text-sm font-medium ${isPresentationMode ? 'text-cyan-400' : 'text-slate-400'}`}>
                  Demo Mode
                </span>
                <button
                  onClick={() => {
                    const newMode = !isPresentationMode
                    setIsPresentationMode(newMode)
                    // Sync with sessionStorage for System Logs component
                    sessionStorage.setItem('presentationMode', newMode.toString())
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 ${
                    isPresentationMode ? 'bg-cyan-500' : 'bg-slate-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isPresentationMode ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              {!isPresentationMode && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/30 rounded-full">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-semibold text-emerald-400">HEC Compliant</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section 1: Compliance Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Student-Teacher Ratio Summary */}
          <div className="lg:col-span-2 bg-white/5 backdrop-blur-md p-6 rounded-3xl border border-white/10 flex flex-col">
            <h3 className="mb-2 flex items-center gap-2 text-lg font-bold">
              <AlertTriangle className="h-5 w-5 text-amber-400" aria-hidden />
              HEC student–teacher ratio by department
            </h3>
            <p className="mb-6 text-xs leading-relaxed text-slate-400">
              Each bar is one department. Values show the current ratio against the applicable HEC ceiling (Science 20:1,
              Social Sciences 30:1).
            </p>
            <div className="flex-1 min-h-[500px]">
              <ComplianceAnalytics 
                chartData={chartData}
                activeFaculty={activeFaculty}
                enrollmentTotal={enrollmentTotal}
                isPresentationMode={isPresentationMode}
              />
            </div>
          </div>

          {/* HEC Compliance Audit Card */}
          <div className="bg-white/5 backdrop-blur-md p-6 rounded-3xl border border-white/10">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <CheckCircle className={`w-5 h-5 ${isCompliant ? 'text-emerald-400' : 'text-red-400'}`} /> 
              HEC Compliance Audit
            </h3>
            
            {/* Status Badge */}
            <div className="mb-6">
              {isCompliant ? (
                <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 border border-emerald-500/30 rounded-lg">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-semibold text-emerald-400">Fully Compliant</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-4 py-2 bg-red-500/20 border border-red-500/30 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  <span className="text-sm font-semibold text-red-400">Action Required</span>
                </div>
              )}
            </div>

            {/* Violations Count */}
            <div className="mb-6 p-4 bg-white/5 rounded-2xl border border-white/5">
              <div className="text-xs text-slate-500 uppercase mb-1">Departments in Violation</div>
              <div className="text-3xl font-bold text-white">{violationCount}</div>
              <div className="text-xs text-slate-400 mt-1">
                of {chartData.length} total departments
              </div>
            </div>

            {/* Staffing Gaps */}
            {staffingGaps.length > 0 && (
              <div className="space-y-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Staffing Gap Analysis
                </div>
                {selectedUni && selectedCampus && (
                  <p className="text-[11px] leading-snug text-slate-400 line-clamp-2">
                    <span className="text-slate-500">Showing departments for</span>{' '}
                    <span className="font-medium text-slate-300">{selectedCampus.name}</span>
                    <span className="text-slate-600"> · </span>
                    <span className="font-medium text-slate-300">{selectedUni.name}</span>
                  </p>
                )}
                <div className="space-y-2.5 max-h-64 overflow-y-auto pr-0.5">
                  {staffingGaps.map((row, index) => (
                    <StaffingGapRow key={`${row.name}-${row.gap}-${index}`} row={row} />
                  ))}
                </div>
                {compliantDepartmentCount > 0 && (
                  <div className="flex items-start gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2.5">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
                    <div className="min-w-0 text-[11px] leading-relaxed text-emerald-200/90">
                      <span className="font-semibold text-emerald-100">
                        {compliantDepartmentCount} department{compliantDepartmentCount !== 1 ? 's' : ''}
                      </span>{' '}
                      still meet the applicable HEC student–teacher ceiling in this view (not listed in the gap list
                      above).
                    </div>
                  </div>
                )}
              </div>
            )}

            {isCompliant && (
              <div className="mt-4 p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20 text-center">
                <div className="text-xs text-emerald-400">
                  All departments meet HEC compliance standards
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          <div className="bg-white/5 backdrop-blur-md p-6 rounded-3xl border border-white/10">
            <div className="text-xs text-slate-500 uppercase mb-1">Total Students</div>
            <div className="text-2xl font-bold text-white">{totalStudents.toLocaleString()}</div>
          </div>
          <div className="bg-white/5 backdrop-blur-md p-6 rounded-3xl border border-white/10">
            <div className="text-xs text-slate-500 uppercase mb-1">Total Faculty</div>
            <div className="text-2xl font-bold text-white">{totalFaculty}</div>
          </div>
          <div className="bg-white/5 backdrop-blur-md p-6 rounded-3xl border border-white/10">
            <div className="text-xs text-slate-500 uppercase mb-1">Total Departments</div>
            <div className="text-2xl font-bold text-white">{totalDepartments}</div>
          </div>
        </div>

        {/* Section 2: Faculty & Departments */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Faculty List */}
                  <div className="bg-white/5 backdrop-blur-md p-6 rounded-3xl border border-white/10">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                      <GraduationCap className="text-cyan-400 w-5 h-5" /> Faculty Hierarchy
                    </h3>
            {displayDetails.faculties.length > 0 ? (
                    <div className="space-y-3">
                      {displayDetails.faculties.map(faculty => (
                  <motion.div
                    key={faculty.id}
                    onClick={() => setActiveFaculty(faculty)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                      activeFaculty?.id === faculty.id
                        ? 'bg-cyan-500/20 border-cyan-500'
                        : 'bg-white/5 border-white/5 hover:bg-white/10'
                    }`}
                  >
                          <div className="flex justify-between items-center">
                      <span className={`font-bold ${activeFaculty?.id === faculty.id ? 'text-white' : 'text-cyan-100'}`}>
                        {faculty.name}
                      </span>
                      <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-1 rounded-lg uppercase tracking-tighter font-mono">
                        {faculty.code}
                      </span>
                          </div>
                          <div className="mt-3 grid grid-cols-2 gap-2">
                            <div className="text-[10px] text-slate-500 uppercase">Dean Name</div>
                            <div className="text-[10px] text-slate-500 uppercase">Departments</div>
                      <div className="text-xs text-white">{faculty.dean_name || 'N/A'}</div>
                            <div className="text-xs text-white">
                              {displayDetails.departments.filter(d => d.faculty_id === faculty.id).length} Active Units
                            </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400">
                <GraduationCap className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No faculties registered for this campus.</p>
              </div>
            )}
          </div>

          {/* Departments for Selected Faculty */}
          <div className="bg-white/5 backdrop-blur-md p-6 rounded-3xl border border-white/10">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Building2 className="text-cyan-400 w-5 h-5" /> Departments
            </h3>
            {activeFaculty ? (
              facultyDepartments.length > 0 ? (
                <div className="space-y-3">
                  {facultyDepartments.map(dept => (
                    <div key={dept.id} className="p-4 bg-white/5 rounded-2xl border border-white/5">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold text-white">{dept.name}</span>
                        {dept.discipline_type && (
                          <span className="text-xs bg-slate-500/20 text-slate-400 px-2 py-1 rounded-lg">
                            {dept.discipline_type}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <div className="text-slate-500 uppercase text-[10px] mb-1">Students</div>
                          <div className="text-white font-semibold">{dept.total_students || 0}</div>
                        </div>
                        <div>
                          <div className="text-slate-500 uppercase text-[10px] mb-1">Teachers</div>
                          <div className="text-white font-semibold">
                            {displayDetails.staff.filter(s => s.department_id === dept.id && s.type === 'Teaching').length}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <Building2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No departments in this faculty.</p>
                </div>
              )
            ) : (
              <div className="text-center py-8 text-slate-400">
                <Building2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Select a faculty to view departments.</p>
              </div>
            )}
                    </div>
                  </div>

        {/* Section 3: Staff Directory */}
                  <div className="bg-white/5 backdrop-blur-md p-6 rounded-3xl border border-white/10">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Users className="text-cyan-400 w-5 h-5" /> Staff Directory
                    </h3>
            
            {/* Search and Filter */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search staff..."
                  value={staffSearchQuery}
                  onChange={(e) => setStaffSearchQuery(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div className="flex gap-2">
                {['All', 'Teaching', 'Non-Teaching'].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setStaffFilter(filter)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      staffFilter === filter
                        ? 'bg-cyan-500 text-white'
                        : 'bg-white/5 text-slate-400 hover:bg-white/10'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {filteredStaff.length > 0 ? (
            <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="text-slate-500 border-b border-white/10">
                            <th className="pb-3 font-medium">Name</th>
                            <th className="pb-3 font-medium">Type</th>
                    <th className="pb-3 font-medium">Department</th>
                            <th className="pb-3 font-medium">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                  {filteredStaff.map(member => (
                            <tr key={member.id} className="group hover:bg-white/5 transition-colors">
                      <td className="py-3 text-slate-200 font-medium">{member.full_name || 'N/A'}</td>
                      <td className="py-3 text-slate-400 text-xs">{member.type || 'N/A'}</td>
                      <td className="py-3 text-slate-400 text-xs">
                        {displayDetails.departments.find(d => d.id === member.department_id)?.name || 'N/A'}
                      </td>
                              <td className="py-3">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-bold">
                          ACTIVE
                        </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
          ) : (
            <div className="text-center py-8 text-slate-400">
              <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No staff members found matching your criteria.</p>
                </div>
            )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f172a] p-8 text-white">
      {/* Header */}
      <div className="mb-8 bg-white/5 backdrop-blur-md p-6 rounded-3xl border border-white/10">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <BarChart3 className="text-cyan-400" /> Institutional Intelligence Hub
        </h1>
        <p className="text-slate-400 mt-1 text-sm">Hierarchical oversight and HEC compliance monitoring</p>
      </div>

      {/* Breadcrumb Navigation */}
      <Breadcrumb />

      {/* Content based on view mode */}
      <AnimatePresence mode="wait">
        {viewMode === 'gallery' && (
          <motion.div
            key="gallery"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {renderUniversityGallery()}
          </motion.div>
        )}

        {viewMode === 'campuses' && (
          <motion.div
            key="campuses"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {renderCampusSelector()}
          </motion.div>
        )}

        {viewMode === 'data' && (
          <motion.div
            key="data"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {renderDataCommandCenter()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default InstitutionalIntelligence
