import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabaseClient'
import { useNavigate, useLocation } from 'react-router-dom'
import { LayoutDashboard, University, LogOut, Plus, RefreshCw, Key, X, CheckCircle, Search, User, Users, BarChart3, AlertTriangle, Mail, Send, Download, FileText, Loader2, Trash2, Eye, ChevronDown, ChevronUp, Lock, Unlock, UserCheck, UserX } from 'lucide-react'
import RegisteredUniversitiesByRegion from '../components/RegisteredUniversitiesByRegion'
import GovernanceCharts, { getResourceInsightForItem } from '../components/GovernanceCharts'
import GovernanceActivityFeed from '../components/GovernanceActivityFeed'
import DataTable from '../components/DataTable'
import UBDashboardHome from './UBDashboardHome'

// List of universities to initialize
const UNIVERSITY_NAMES = [
  'Begum Nusrat Bhutto Women University',
  'Benazir Bhutto Shaheed University Lyari',
  'Dawood University of Engineering & Technology',
  'DOW University of Health Sciences',
  'Government College University Hyderabad',
  'Jinnah Sindh Medical University',
  'Liaquat University of Medical and Health Sciences',
  'Mehran University of Engineering & Technology',
  'NED University of Engineering & Technology',
  'Quaid-e-Awam University of Engineering, Science & Technology',
  'Shah Abdul Latif University',
  'Shaheed Allah Buksh Soomro University',
  'Shaheed Benazir Bhutto University of Veterinary & Animal Sciences',
  'Shaheed Benazir Bhutto University Shaheed Benazirabad',
  'Shaheed Mohtarma Benazir Bhutto Medical University',
  'Shaheed Zulfiqar Ali Bhutto University of Law',
  'Shaikh Ayaz University',
  'Sindh Agriculture University',
  'Sindh Madressatul Islam University',
  'Sukkur IBA University',
  'University of Sufism & Modern Sciences',
  'University of Karachi',
  'University of Sindh',
  'Aror University of Art, Architecture, Design & Heritage',
  'University of Larkano',
  'The Mirpurkhas University',
  'Karachi Metropolitan University'
]

// Dummy data for University Accounts presentation/demo mode
const DUMMY_UNIVERSITY_ACCOUNTS = [
  { id: 'demo-1', full_name: 'Dr. Ahmed Khan', email: 'ahmed@sku.iba.edu.pk', university_id: 'demo-uni-1', is_locked: false, is_setup_complete: true, universities: { name: 'Sukkur IBA University' } },
  { id: 'demo-2', full_name: 'Prof. Sara Ali', email: 'sara@uok.edu.pk', university_id: 'demo-uni-2', is_locked: false, is_setup_complete: true, universities: { name: 'University of Karachi' } },
  { id: 'demo-3', full_name: 'Muhammad Hassan', email: 'hassan@usindh.edu.pk', university_id: 'demo-uni-3', is_locked: true, is_setup_complete: false, universities: { name: 'University of Sindh' } },
  { id: 'demo-4', full_name: 'Dr. Fatima Noor', email: 'fatima@lumhs.edu.pk', university_id: 'demo-uni-4', is_locked: false, is_setup_complete: true, universities: { name: 'Liaquat University of Medical and Health Sciences' } },
]

// Dummy universities for Staff Directory presentation mode (filter dropdown)
const DUMMY_STAFF_UNIVERSITIES = [
  { id: 'ds-u1', name: 'Sukkur IBA University' },
  { id: 'ds-u2', name: 'University of Karachi' },
  { id: 'ds-u3', name: 'University of Sindh' },
  { id: 'ds-u4', name: 'NED University of Engineering & Technology' },
  { id: 'ds-u5', name: 'Mehran University of Engineering & Technology' },
  { id: 'ds-u6', name: 'University of Sindh, Jamshoro' },
  { id: 'ds-u7', name: 'Liaquat University of Medical and Health Sciences' },
  { id: 'ds-u8', name: 'Shah Abdul Latif University' },
]

// Build ~50 dummy staff for presentation mode (multiple universities, Teaching/Non-Teaching, contract types)
const _names = [
  'Dr. Ahmed Khan', 'Prof. Sara Ali', 'Muhammad Hassan', 'Dr. Fatima Noor', 'Mr. Asad Ali', 'Ms. Noreen Gul', 'Dr. Khalid Mahmood', 'Ms. Ayesha Siddiqui',
  'Prof. Rashid Ahmed', 'Dr. Zainab Hussain', 'Mr. Bilal Akhtar', 'Ms. Sana Khan', 'Dr. Imran Malik', 'Prof. Nadia Sheikh', 'Mr. Faisal Iqbal', 'Ms. Hina Raza',
  'Dr. Tariq Mahmood', 'Ms. Sadia Ahmed', 'Prof. Omar Farooq', 'Dr. Mariam Khan', 'Mr. Usman Ali', 'Ms. Aisha Malik', 'Dr. Waqas Ahmad', 'Prof. Saima Hassan',
  'Mr. Hamza Khan', 'Ms. Zara Ali', 'Dr. Saad Mahmood', 'Prof. Amna Sheikh', 'Mr. Ali Raza', 'Ms. Maham Noor', 'Dr. Hassan Iqbal', 'Prof. Farah Ahmed',
  'Mr. Danish Khan', 'Ms. Hira Malik', 'Dr. Noman Ali', 'Prof. Saba Hussain', 'Mr. Adnan Sheikh', 'Ms. Minahil Khan', 'Dr. Arslan Ahmad', 'Prof. Dania Raza',
  'Mr. Zeeshan Ali', 'Ms. Anum Sheikh', 'Dr. Talha Khan', 'Prof. Eman Malik', 'Mr. Rehan Ahmed', 'Ms. Areeba Noor', 'Dr. Hamdan Iqbal', 'Prof. Hania Hassan',
  'Mr. Moiz Khan', 'Ms. Zoya Ali'
]
const _teachingDesignations = ['Professor', 'Associate Professor', 'Assistant Professor', 'Lecturer', 'Senior Lecturer', 'Instructor', 'Visiting Faculty']
const _nonTeachingDesignations = ['HR Manager', 'Registrar', 'Auditor', 'Estate Manager', 'Lab Engineer', 'Admin Officer', 'IT Manager', 'Finance Officer']
const _faculties = ['Computer Science & IT', 'Engineering', 'Education', 'Business Administration', 'Sciences', 'Arts', 'Law', 'Medicine']
const _depts = ['Computer Science', 'Software Engineering', 'Electrical Engineering', 'Education', 'Management', 'Mathematics', 'Physics', 'English', 'Administration']
function buildDummyStaff() {
  const list = []
  const unis = DUMMY_STAFF_UNIVERSITIES
  const types = ['Teaching', 'Non-Teaching']
  const contractTypes = ['Permanent', 'Contractual', 'Ad-hoc']
  const campuses = ['Main Campus', 'City Campus', 'North Campus', 'South Campus', 'Sukkur IBA', 'Karachi', 'Jamshoro']
  for (let i = 0; i < 50; i++) {
    const type = types[i % 2]
    const uni = unis[i % unis.length]
    const campusName = type === 'Teaching' ? [campuses[i % 5], campuses[(i + 2) % 5]][i % 2] : campuses[i % campuses.length]
    list.push({
      id: `demo-staff-${i + 1}`,
      full_name: _names[i % _names.length],
      type,
      academic_designation: type === 'Teaching' ? _teachingDesignations[i % _teachingDesignations.length] : undefined,
      designation: type === 'Non-Teaching' ? _nonTeachingDesignations[i % _nonTeachingDesignations.length] : undefined,
      category: type === 'Non-Teaching' ? 'Administrative' : undefined,
      departments: { name: _depts[i % _depts.length] },
      faculties: { name: `Faculty of ${_faculties[i % _faculties.length]}` },
      universities: { name: uni.name },
      campuses: { name: campusName },
      university_id: uni.id,
      email: `staff${i + 1}@demo.edu.pk`,
      phone: `+92 300 ${String(1000000 + i).slice(1)}`,
      employment_type: contractTypes[i % 3],
    })
  }
  return list
}
const DUMMY_STAFF = buildDummyStaff()

// Dummy meetings for Meetings & Reports presentation mode (10 from different universities)
const DUMMY_MEETINGS = [
  { id: 'dm1', body_type: 'Syndicate', meeting_date: '2026-02-02', subject: '4th Syndicate Meeting - Fiscal Review', venue: 'VC Conference Room', universities: { name: 'Sukkur IBA University' }, attendance: 'Present: Vice Chancellor (Chair), Registrar, DVCs. Absent: None.', decisions_summary: 'The Syndicate reviewed the quarterly financial report and approved budget reallocations.', status: 'Official', notification_url: null, minutes_url: null },
  { id: 'dm2', body_type: 'Board of Faculty', meeting_date: '2026-01-20', subject: 'Review of Undergraduate Curriculum - CS', venue: 'Faculty Hall', universities: { name: 'University of Karachi' }, attendance: 'Present: Dean, HODs, external experts. Absent: 1 member.', decisions_summary: 'The Board reviewed and approved revised course outlines for BSCS.', status: 'Draft', notification_url: null, minutes_url: null },
  { id: 'dm3', body_type: 'Board of Studies', meeting_date: '2025-11-13', subject: 'BS Electrical Engineering - Course Outline', venue: 'Engineering Block', universities: { name: 'NED University of Engineering & Technology' }, attendance: 'Present: Chair, program coordinators. Absent: None.', decisions_summary: 'Course outlines for EE final year approved with minor amendments.', status: 'Draft', notification_url: null, minutes_url: null },
  { id: 'dm4', body_type: 'Board of Faculty', meeting_date: '2025-09-22', subject: 'Approval of Revised Curriculum - MBA', venue: 'Business School', universities: { name: 'University of Sindh' }, attendance: 'Present: Dean, faculty members. Absent: None.', decisions_summary: 'Revised MBA curriculum and elective courses approved.', status: 'Official', notification_url: null, minutes_url: null },
  { id: 'dm5', body_type: 'Senate', meeting_date: '2025-01-23', subject: 'Annual Budget Approval & Strategic Plan', venue: 'Senate Hall', universities: { name: 'Sukkur IBA University' }, attendance: 'Present: VC, Registrar, Senate members. Absent: 2.', decisions_summary: 'Annual budget and strategic priorities for 2025 approved.', status: 'Official', notification_url: null, minutes_url: null },
  { id: 'dm6', body_type: 'Academic Council', meeting_date: '2025-10-15', subject: 'Academic Calendar and Exam Schedule', venue: 'Main Admin', universities: { name: 'Mehran University of Engineering & Technology' }, attendance: 'Present: All members. Absent: None.', decisions_summary: 'Academic calendar and centralized exam schedule approved.', status: 'Official', notification_url: null, minutes_url: null },
  { id: 'dm7', body_type: 'Senate', meeting_date: '2024-12-10', subject: 'Policy on Research Grants', venue: 'Conference Centre', universities: { name: 'University of Karachi' }, attendance: 'Present: VC, deans, Senate. Absent: 1.', decisions_summary: 'New policy for faculty research grants and travel support approved.', status: 'Official', notification_url: null, minutes_url: null },
  { id: 'dm8', body_type: 'Finance Committee', meeting_date: '2025-06-05', subject: 'Mid-Year Financial Review', venue: 'Finance Office', universities: { name: 'Liaquat University of Medical and Health Sciences' }, attendance: 'Present: Treasurer, committee members. Absent: None.', decisions_summary: 'Mid-year expenditure review and procurement approvals.', status: 'Official', notification_url: null, minutes_url: null },
  { id: 'dm9', body_type: 'Board of Studies', meeting_date: '2025-03-18', subject: 'New Programs - Data Science & AI', venue: 'IT Building', universities: { name: 'Shah Abdul Latif University' }, attendance: 'Present: Chair, coordinators, industry rep. Absent: None.', decisions_summary: 'Proposal for MS Data Science and BS AI programs approved in principle.', status: 'Draft', notification_url: null, minutes_url: null },
  { id: 'dm10', body_type: 'Syndicate', meeting_date: '2024-08-20', subject: 'Appointments and Promotions', venue: 'VC Office', universities: { name: 'University of Sindh' }, attendance: 'Present: VC, members. Absent: 2.', decisions_summary: 'Faculty promotions and new appointments ratified.', status: 'Official', notification_url: null, minutes_url: null },
]

/** Split typical "Present: A, B. Absent: C." attendance strings into name lists. */
function parseMeetingAttendance(raw) {
  if (!raw || typeof raw !== 'string') {
    return { present: [], absent: [], unstructured: '' }
  }
  const t = raw.trim()
  if (!t) return { present: [], absent: [], unstructured: '' }

  const absentIdx = t.search(/\bAbsent:\s*/i)
  if (absentIdx === -1) {
    return { present: [], absent: [], unstructured: t }
  }

  const beforeAbsent = t.slice(0, absentIdx).trim()
  const absentSegment = t.slice(absentIdx).replace(/\bAbsent:\s*/i, '').trim()
  const presentStr = beforeAbsent.replace(/^\s*Present:\s*/i, '').replace(/\s*\.?\s*$/, '').trim()

  const splitNames = (segment) => {
    if (!segment) return []
    const noTrail = segment.replace(/\.\s*$/, '').trim()
    if (!noTrail || /^none$/i.test(noTrail)) return []
    return noTrail
      .split(/\s*,\s*/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => (s.endsWith('.') ? s.slice(0, -1).trim() : s))
      .filter(Boolean)
  }

  return {
    present: splitNames(presentStr),
    absent: splitNames(absentSegment),
    unstructured: '',
  }
}

function openAttendancePopover(setPopover, e, payload) {
  const rect = e.currentTarget.getBoundingClientRect()
  const width = 256
  let left = rect.left
  if (left + width > window.innerWidth - 12) left = Math.max(12, window.innerWidth - width - 12)
  if (left < 12) left = 12
  const top = rect.bottom + 8
  const maxH = Math.min(320, window.innerHeight - top - 16)
  setPopover((prev) => {
    if (
      prev &&
      prev.title === payload.title &&
      (payload.raw ? prev.raw === payload.raw : (prev.raw || '') === '')
    ) {
      return null
    }
    return { top, left, maxH, ...payload }
  })
}

function MeetingAttendanceCell({ attendance }) {
  const [popover, setPopover] = useState(null)

  useEffect(() => {
    if (!popover) return
    const onKey = (ev) => {
      if (ev.key === 'Escape') setPopover(null)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [popover])

  const parsed = useMemo(() => parseMeetingAttendance(attendance ?? ''), [attendance])
  const { present, absent, unstructured } = parsed

  if (!attendance || !String(attendance).trim()) {
    return <span className="text-slate-400">—</span>
  }

  const cardBase =
    'flex flex-1 min-w-[3.75rem] max-w-[4.75rem] flex-col rounded-md border px-1.5 py-1 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1'

  const popoverLayer =
    popover &&
    createPortal(
      <>
        <div
          className="fixed inset-0 z-[200] bg-transparent"
          aria-hidden
          onClick={() => setPopover(null)}
        />
        <div
          role="dialog"
          aria-label={popover.title}
          className="fixed z-[210] w-64 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl"
          style={{ top: popover.top, left: popover.left, maxHeight: popover.maxH ?? 320 }}
          onClick={(ev) => ev.stopPropagation()}
        >
          <div className="border-b border-slate-100 bg-slate-50 px-3 py-2">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-600">{popover.title}</p>
          </div>
          <div className="max-h-56 overflow-y-auto p-3">
            {popover.raw ? (
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{popover.raw}</p>
            ) : popover.items.length === 0 ? (
              <p className="text-sm italic text-slate-500">None listed.</p>
            ) : (
              <ol className="list-none space-y-2 p-0 m-0">
                {popover.items.map((name, i) => (
                  <li
                    key={`${i}-${name.slice(0, 24)}`}
                    className="flex gap-2 text-sm text-slate-800"
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-slate-100 text-[10px] font-semibold text-slate-500">
                      {i + 1}
                    </span>
                    <span className="min-w-0 leading-snug">{name}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </>,
      document.body
    )

  if (unstructured) {
    return (
      <>
        <button
          type="button"
          className={`${cardBase} border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100`}
          onClick={(e) =>
            openAttendancePopover(setPopover, e, {
              title: 'Attendance',
              items: [],
              raw: unstructured,
            })
          }
        >
          <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-600 leading-tight">Details</span>
          <span className="mt-0.5 flex items-center gap-0.5 text-[10px] font-medium text-slate-700 leading-none">
            <Users className="h-3 w-3 shrink-0 opacity-70" />
            View
          </span>
        </button>
        {popoverLayer}
      </>
    )
  }

  return (
    <>
      <div className="flex flex-wrap items-stretch gap-1">
        <button
          type="button"
          className={`${cardBase} border-emerald-200 bg-emerald-50/90 text-emerald-900 hover:bg-emerald-100`}
          onClick={(e) =>
            openAttendancePopover(setPopover, e, {
              title: 'Present',
              items: present,
              raw: '',
            })
          }
        >
          <span className="flex items-center gap-0.5 text-[9px] font-semibold uppercase tracking-wide text-emerald-800 leading-tight">
            <UserCheck className="h-2.5 w-2.5 shrink-0" />
            Present
          </span>
          <span className="mt-0.5 text-sm font-bold tabular-nums leading-none">{present.length}</span>
        </button>
        <button
          type="button"
          className={`${cardBase} border-rose-200 bg-rose-50/90 text-rose-900 hover:bg-rose-100`}
          onClick={(e) =>
            openAttendancePopover(setPopover, e, {
              title: 'Absent',
              items: absent,
              raw: '',
            })
          }
        >
          <span className="flex items-center gap-0.5 text-[9px] font-semibold uppercase tracking-wide text-rose-800 leading-tight">
            <UserX className="h-2.5 w-2.5 shrink-0" />
            Absent
          </span>
          <span className="mt-0.5 text-sm font-bold tabular-nums leading-none">{absent.length}</span>
        </button>
      </div>
      {popoverLayer}
    </>
  )
}

function UBAdminDashboard() {
  const [user, setUser] = useState(null)
  const [activeSection, setActiveSection] = useState('overview')
  const [universities, setUniversities] = useState([])
  const [analyticsData, setAnalyticsData] = useState([])
  const [loading, setLoading] = useState(true)
  const [totalUniversities, setTotalUniversities] = useState(0)
  const [activeAccounts, setActiveAccounts] = useState(0)
  const [totalExpiredBoards, setTotalExpiredBoards] = useState(0)
  const [selectedUniversityId, setSelectedUniversityId] = useState('')
  const [focalPersonEmail, setFocalPersonEmail] = useState('')
  const [tempPassword, setTempPassword] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [isInitializing, setIsInitializing] = useState(false)
  const [toast, setToast] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [simulationMode, setSimulationMode] = useState(false)
  const [presentationMode, setPresentationMode] = useState(false)
  const [selectedDivision, setSelectedDivision] = useState('all')
  const [showSystemLogs, setShowSystemLogs] = useState(false)
  // Staff Directory (all universities)
  const [staffList, setStaffList] = useState([])
  const [staffLoading, setStaffLoading] = useState(false)
  const [staffSearch, setStaffSearch] = useState('')
  const [staffTypeFilter, setStaffTypeFilter] = useState('All')
  const [staffUniFilter, setStaffUniFilter] = useState('')
  // Meetings & Reports (all universities)
  const [meetingsList, setMeetingsList] = useState([])
  const [meetingsLoading, setMeetingsLoading] = useState(false)
  const [meetingsSearch, setMeetingsSearch] = useState('')
  const [meetingsBodyFilter, setMeetingsBodyFilter] = useState('')
  const [meetingsYearFilter, setMeetingsYearFilter] = useState('')
  // University Accounts (UFP-only, university-centric)
  const [accountsList, setAccountsList] = useState([])
  const [accountsLoading, setAccountsLoading] = useState(false)
  const [lockingAccountId, setLockingAccountId] = useState(null)
  const [deleteModal, setDeleteModal] = useState(null) // { row, universityName, totalStaff, confirmText }
  const [deletingUniversityId, setDeletingUniversityId] = useState(null)
  const [decisionViewMeeting, setDecisionViewMeeting] = useState(null) // row for Decisions modal
  const navigate = useNavigate()
  const location = useLocation()

  // Read section from URL query parameter; default to 'home' so U&B Admin lands on dashboard home first
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search)
    const section = searchParams.get('section')
    if (section && ['home', 'overview', 'universities', 'accounts', 'staff', 'meetings'].includes(section)) {
      setActiveSection(section)
    } else {
      setActiveSection('home')
    }
  }, [location.search])

  useEffect(() => {
    const loadData = async () => {
      await checkUser()
      // Run cleanup once on mount (only if needed) - don't block on this
      cleanupDuplicateUniversities().catch(console.error)
      // Initialize missing universities - don't block on this
      initializeUniversities().catch(console.error)
      // Always fetch universities - this is the main data load
      await fetchUniversities()
      // Fetch analytics data from ub_analytics_hub view
      await fetchAnalyticsData()
      // Fetch landing dashboard data from ub_landing_analytics view (city, gender, compliance)
    }
    loadData()
  }, [])

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      navigate('/login')
      return
    }

    // Fetch user profile to check role
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()

    if (!profile || profile.role !== 'U&B_ADMIN') {
      navigate('/')
      return
    }

    setUser(profile)
    setLoading(false)
  }

  // Cleanup duplicate universities - keep one entry per name
  const cleanupDuplicateUniversities = async () => {
    try {
      const { data: allUnis, error: fetchError } = await supabase
        .from('universities')
        .select('*')

      if (fetchError) {
        console.error('Error fetching universities for cleanup:', fetchError)
        return
      }

      if (!allUnis || allUnis.length === 0) return

      // Group by name
      const universitiesByName = {}
      allUnis.forEach(uni => {
        const name = uni.name?.trim()
        if (name) {
          if (!universitiesByName[name]) {
            universitiesByName[name] = []
          }
          universitiesByName[name].push(uni)
        }
      })

      // Find duplicates
      const idsToDelete = []
      Object.keys(universitiesByName).forEach(name => {
        const unis = universitiesByName[name]
        if (unis.length > 1) {
          // Keep the first one (or the one with an ID)
          const toKeep = unis[0]
          unis.forEach(uni => {
            if (uni.id !== toKeep.id) {
              idsToDelete.push(uni.id)
            }
          })
        }
      })

      // Delete duplicates
      if (idsToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('universities')
          .delete()
          .in('id', idsToDelete)

        if (deleteError) {
          console.error('Error deleting duplicates:', deleteError)
        } else {
          console.log(`Successfully removed ${idsToDelete.length} duplicate entries`)
        }
      }
    } catch (error) {
      console.error('Error in cleanupDuplicateUniversities:', error)
    }
  }

  // Initialize universities table with the provided list
  const initializeUniversities = async () => {
    if (isInitializing) return
    setIsInitializing(true)

    try {
      const { data: existingUnis } = await supabase
        .from('universities')
        .select('name')

      const existingNames = new Set(existingUnis?.map(u => u.name) || [])

      const missing = UNIVERSITY_NAMES.filter(name => !existingNames.has(name))

      if (missing.length > 0) {
        const { error } = await supabase
          .from('universities')
          .insert(missing.map(name => ({ name })))

        if (error) {
          console.error('Error initializing universities:', error)
        }
        setIsInitializing(false)
      }
    } catch (error) {
      console.error('Error in initializeUniversities:', error)
      setIsInitializing(false)
    }
  }

  // Fetch universities with focal person status
  const fetchUniversities = async () => {
    try {
      const { data: allUnis, error: allError } = await supabase
        .from('universities')
        .select('*')
        .order('name', { ascending: true })

      if (allError) {
        showToast('Error loading universities: ' + allError.message, 'error')
        return
      }

      if (!allUnis || allUnis.length === 0) {
        setUniversities([])
        return
      }

      // Get all profiles with UFP role and university_id (LEFT JOIN equivalent)
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, university_id, role')
        .eq('role', 'UFP')

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError)
        // Continue anyway - we can still show universities without profile status
      }

      // Debug: Log profiles data
      if (profiles && profiles.length > 0) {
        console.log(`Found ${profiles.length} UFP profiles`)
      } else {
        console.log('No UFP profiles found')
      }

      // Create a map of university_id -> profile for quick lookup
      const profileMap = new Map()
      if (profiles) {
        profiles.forEach(profile => {
          const uniId = profile.university_id
          if (uniId) {
            const uniIdString = String(uniId)
            if (!profileMap.has(uniIdString)) {
              profileMap.set(uniIdString, profile)
              console.log(`✓ Mapped profile for university_id: ${uniIdString}, email: ${profile.email}`)
            }
          }
        })
      }

      // Map ALL universities with focal person status (LEFT JOIN logic)
      const universitiesWithStatus = allUnis.map(uni => {
        const uniId = uni.id
        const uniIdString = String(uniId)
        const profile = profileMap.get(uniIdString)
        const hasFocalPerson = !!profile

        if (hasFocalPerson) {
          console.log(`✓ University "${uni.name}" (${uniIdString}) has focal person: ${profile.email}`)
        }
        
        return {
          ...uni,
          hasFocalPerson: hasFocalPerson, // true if profile exists in profiles table with UFP role
          focalPersonEmail: profile?.email || null
        }
      })

      const activeCount = universitiesWithStatus.filter(u => u.hasFocalPerson).length
      console.log(`\n=== University Status Summary ===`)
      console.log(`Total universities: ${universitiesWithStatus.length}`)
      console.log(`Active (with focal person): ${activeCount}`)
      console.log(`Pending (no focal person): ${universitiesWithStatus.length - activeCount}`)

      if (activeCount > 0) {
        console.log(`   Active universities:`, universitiesWithStatus.filter(u => u.hasFocalPerson).map(u => `${u.name} (${u.focalPersonEmail})`))
      }

      // Sort: Active (hasFocalPerson) first, then Setup Pending; within each group sort by name
      universitiesWithStatus.sort((a, b) => {
        if (a.hasFocalPerson !== b.hasFocalPerson) return a.hasFocalPerson ? -1 : 1
        return (a.name || '').localeCompare(b.name || '')
      })

      setUniversities(universitiesWithStatus)
      setActiveAccounts(universitiesWithStatus.filter(u => u.hasFocalPerson).length)
    } catch (error) {
      console.error('Error in fetchUniversities:', error)
      showToast('Error loading universities: ' + error.message, 'error')
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  // Generate a strong 12-character password
  const generatePassword = () => {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const lowercase = 'abcdefghijklmnopqrstuvwxyz'
    const numbers = '0123456789'
    const special = '!@#$%^&*'
    const allChars = uppercase + lowercase + numbers + special

    // Ensure at least one of each type
    let password = ''
    password += uppercase[Math.floor(Math.random() * uppercase.length)]
    password += lowercase[Math.floor(Math.random() * lowercase.length)]
    password += numbers[Math.floor(Math.random() * numbers.length)]
    password += special[Math.floor(Math.random() * special.length)]

    // Fill the rest randomly
    for (let i = password.length; i < 12; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)]
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('')
  }

  const handleGeneratePassword = () => {
    setTempPassword(generatePassword())
  }

  // Check for duplicate email or password
  const checkDuplicates = async (email) => {
    const { data: emailCheck } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (emailCheck) {
      return { isDuplicate: true, message: 'This email is already assigned to another user.' }
    }

    // Note: We can't directly check passwords in Supabase Auth from client side
    
    return { isDuplicate: false }
  }

  const handleCreateUniversity = async (e) => {
    e.preventDefault()
    setIsCreating(true)

    try {
      if (!selectedUniversityId || !focalPersonEmail || !tempPassword) {
        showToast('Please fill in all fields', 'error')
        setIsCreating(false)
        return
      }

      const selectedUniversity = universities.find(u => u.id === selectedUniversityId)

      if (!selectedUniversity) {
        showToast('Invalid university selected', 'error')
        setIsCreating(false)
        return
      }

      // Check if university already has a focal person (from profiles table)
      if (selectedUniversity.hasFocalPerson) {
        showToast('This university already has a focal person assigned', 'error')
        setIsCreating(false)
        return
      }

      // Check for duplicates
      const duplicateCheck = await checkDuplicates(focalPersonEmail)
      if (duplicateCheck.isDuplicate) {
        showToast(duplicateCheck.message, 'error')
        setIsCreating(false)
        return
      }

      // Get current admin session to preserve it
      const { data: { session: adminSession } } = await supabase.auth.getSession()
      const adminUserId = adminSession?.user?.id
      const adminAccessToken = adminSession?.access_token
      const adminRefreshToken = adminSession?.refresh_token

      if (!adminSession) {
        throw new Error('Admin session lost. Please log in again.')
      }

      // Store admin session tokens
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: focalPersonEmail,
        password: tempPassword,
        options: {
          data: {
            role: 'UFP',
            university_id: selectedUniversityId,
            university_name: selectedUniversity.name
          },
          emailRedirectTo: null  // Prevent session switching
        }
      })

      if (authError) {
        // If signUp failed, admin session should still be intact
        throw authError
      }

      // Check if session was switched (user ID changed)
      const { data: { session: currentSession } } = await supabase.auth.getSession()
      
      // If session was switched to the new user, restore admin session
      if (currentSession && currentSession.user.id !== adminUserId) {
        // Restore admin session
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: adminAccessToken,
          refresh_token: adminRefreshToken
        })
        
        if (sessionError) {
          console.error('Error restoring admin session:', sessionError)
          throw new Error('Failed to restore admin session. Please log in again.')
        }
      }

      if (authError) {
        // Handle specific error cases
        if (authError.message.includes('already registered')) {
          throw new Error('This email is already registered. Please use a different email.')
        }
        throw authError
      }

      // Update profile entry (trigger creates it automatically, we just update it)
      if (authData.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            role: 'UFP',
            university_id: selectedUniversityId,
            university_name: selectedUniversity.name
          })
          .eq('id', authData.user.id)

        if (profileError) {
          console.error('Error updating profile:', profileError)
          // Don't throw - the account was created, profile update can be retried
        }
      }

      // Reset form
      setSelectedUniversityId('')
      setFocalPersonEmail('')
      setTempPassword('')

      showToast(`University account created for ${selectedUniversity.name}!`, 'success')
      
      // Refresh the universities list
      await fetchUniversities()
    } catch (error) {
      console.error('Error creating university account:', error)
      showToast(error.message || 'Error creating university account', 'error')
    } finally {
      setIsCreating(false)
    }
  }

  // Fetch analytics data from ub_analytics_hub view
  const fetchAnalyticsData = async () => {
    try {
      const { data, error } = await supabase
        .from('ub_analytics_hub')
        .select('*')

      if (error) {
        console.error('Error fetching analytics data:', error)
        showToast('Error loading analytics data: ' + error.message, 'error')
        setAnalyticsData([]) // Set empty array on error
        return
      }

      if (data && data.length > 0) {
        setAnalyticsData(data)
        // Calculate stats (Active Accounts comes from universities/profiles in fetchUniversities)
        setTotalUniversities(data.length)
        setTotalExpiredBoards(data.reduce((sum, u) => sum + (u.expired_boards || 0), 0))
      } else {
        setAnalyticsData([])
      }
    } catch (error) {
      console.error('Error in fetchAnalyticsData:', error)
      showToast('Error loading analytics data: ' + error.message, 'error')
      setAnalyticsData([]) // Set empty array on error
    }
  }

  // Fetch all staff across universities (for Staff Directory)
  const fetchStaffAll = async () => {
    setStaffLoading(true)
    try {
      const { data, error } = await supabase
        .from('staff')
        .select(`
          *,
          universities:university_id(name),
          campuses:campus_id(name),
          faculties:faculty_id(name),
          departments:department_id(name)
        `)
        .order('full_name', { ascending: true })

      if (error) throw error
      setStaffList(data || [])
    } catch (err) {
      console.error('Error fetching staff:', err)
      showToast('Error loading staff: ' + (err.message || 'Unknown error'), 'error')
      setStaffList([])
    } finally {
      setStaffLoading(false)
    }
  }

  // Fetch all meetings across universities (for Meetings & Reports)
  const fetchMeetingsAll = async () => {
    setMeetingsLoading(true)
    try {
      const { data, error } = await supabase
        .from('meetings')
        .select('*, universities:university_id(name)')
        .order('meeting_date', { ascending: false })
        .order('start_time', { ascending: false })

      if (error) throw error
      setMeetingsList(data || [])
    } catch (err) {
      console.error('Error fetching meetings:', err)
      showToast('Error loading meetings: ' + (err.message || 'Unknown error'), 'error')
      setMeetingsList([])
    } finally {
      setMeetingsLoading(false)
    }
  }

  // Fetch University Accounts: UFP profiles with university_id not null, joined to universities
  const fetchUniversityAccounts = async () => {
    setAccountsLoading(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, university_id, is_locked, is_setup_complete, universities:university_id(name)')
        .eq('role', 'UFP')
        .not('university_id', 'is', null)

      if (error) throw error
      setAccountsList(data || [])
    } catch (err) {
      console.error('Error fetching university accounts:', err)
      showToast('Error loading university accounts: ' + (err?.message || 'Unknown error'), 'error')
      setAccountsList([])
    } finally {
      setAccountsLoading(false)
    }
  }

  useEffect(() => {
    if (activeSection === 'staff') fetchStaffAll()
    if (activeSection === 'meetings') fetchMeetingsAll()
    if (activeSection === 'accounts') fetchUniversityAccounts()
  }, [activeSection])

  const handleLockAccount = async (account) => {
    if (lockingAccountId) return
    setLockingAccountId(account.id)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_locked: !account.is_locked })
        .eq('id', account.id)
      if (error) throw error
      setAccountsList((prev) =>
        prev.map((a) => (a.id === account.id ? { ...a, is_locked: !a.is_locked } : a))
      )
      showToast(account.is_locked ? 'University account unlocked.' : 'University account locked.', 'success')
    } catch (err) {
      showToast(err?.message || 'Failed to update lock.', 'error')
    } finally {
      setLockingAccountId(null)
    }
  }

  const openDeleteModal = async (account) => {
    const universityName = account.universities?.name || account.university_name || 'this university'
    let totalStaff = null
    const analyticsRow = analyticsData?.find((a) => String(a.university_id) === String(account.university_id))
    if (analyticsRow != null && typeof analyticsRow.total_staff === 'number') {
      totalStaff = analyticsRow.total_staff
    } else {
      try {
        const { data } = await supabase
          .from('ub_analytics_hub')
          .select('total_staff')
          .eq('university_id', account.university_id)
          .maybeSingle()
        if (data?.total_staff != null) totalStaff = data.total_staff
      } catch (_) {}
    }
    setDeleteModal({
      row: account,
      universityName,
      totalStaff,
      confirmText: ''
    })
  }

  const handleDeleteUniversity = async () => {
    if (!deleteModal) return
    const { row } = deleteModal
    setDeletingUniversityId(row.university_id)
    try {
      const { error } = await supabase.rpc('delete_university_cascade', {
        target_uni_id: row.university_id
      })
      if (error) throw error
      showToast('University and all associated data deleted.', 'success')
      setDeleteModal(null)
      fetchUniversityAccounts()
      fetchUniversities()
      fetchAnalyticsData()
    } catch (err) {
      showToast(err?.message || 'Failed to delete university.', 'error')
    } finally {
      setDeletingUniversityId(null)
    }
  }

  // Send reminder email to university
  const handleSendReminder = async (universityId, email) => {
    try {
      // Placeholder for email sending logic
      console.log('Sending reminder to:', email, 'for university:', universityId)
      showToast('Reminder sent successfully', 'success')
    } catch (error) {
      console.error('Error sending reminder:', error)
      showToast('Error sending reminder: ' + error.message, 'error')
    }
  }


  // Toast notification function
  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 5000)
  }

  // Merge universities (hasFocalPerson from profiles) into analytics data so map highlights active universities
  const mapData = useMemo(() => {
    if (!analyticsData?.length) return analyticsData || []
    if (!universities?.length) return analyticsData
    return analyticsData.map((a) => {
      const u = universities.find((uni) => String(uni.id) === String(a.university_id || a.id))
      return {
        ...a,
        hasFocalPerson: u?.hasFocalPerson ?? a.hasFocalPerson ?? false,
        setup_status: u?.hasFocalPerson ? 'Active' : (a.setup_status || 'Setup Pending')
      }
    })
  }, [analyticsData, universities])

  const filteredStaff = useMemo(() => {
    let list = staffList || []
    if (staffSearch.trim()) {
      const q = staffSearch.trim().toLowerCase()
      list = list.filter(
        (s) =>
          (s.full_name || '').toLowerCase().includes(q) ||
          (s.email || '').toLowerCase().includes(q) ||
          (s.phone || '').toLowerCase().includes(q) ||
          (s.universities?.name || '').toLowerCase().includes(q)
      )
    }
    if (staffTypeFilter === 'Teaching') list = list.filter((s) => s.type === 'Teaching')
    if (staffTypeFilter === 'Non-Teaching') list = list.filter((s) => s.type === 'Non-Teaching')
    if (staffUniFilter) {
      list = list.filter((s) => String(s.university_id) === String(staffUniFilter))
    }
    return list
  }, [staffList, staffSearch, staffTypeFilter, staffUniFilter])

  const filteredMeetings = useMemo(() => {
    let list = meetingsList || []
    if (meetingsSearch.trim()) {
      const q = meetingsSearch.trim().toLowerCase()
      list = list.filter(
        (m) =>
          (m.subject || '').toLowerCase().includes(q) ||
          (m.venue || '').toLowerCase().includes(q) ||
          (m.universities?.name || '').toLowerCase().includes(q)
      )
    }
    if (meetingsBodyFilter) list = list.filter((m) => m.body_type === meetingsBodyFilter)
    if (meetingsYearFilter) {
      list = list.filter((m) => {
        const y = m.meeting_date ? new Date(m.meeting_date).getFullYear() : null
        return y != null && String(y) === meetingsYearFilter
      })
    }
    return list
  }, [meetingsList, meetingsSearch, meetingsBodyFilter, meetingsYearFilter])

  const meetingsYears = useMemo(() => {
    const years = new Set()
    ;(meetingsList || []).forEach((m) => {
      if (m.meeting_date) years.add(new Date(m.meeting_date).getFullYear())
    })
    return Array.from(years).sort((a, b) => b - a)
  }, [meetingsList])

  // University Accounts: show dummy data in presentation mode, else real list
  const accountsDisplayList = useMemo(() => {
    if (activeSection === 'accounts' && presentationMode) return DUMMY_UNIVERSITY_ACCOUNTS
    return accountsList
  }, [activeSection, presentationMode, accountsList])

  const accountsIsDemo = activeSection === 'accounts' && presentationMode

  // Staff Directory: in presentation mode use dummy list and apply same filters (search, type, university)
  const staffDisplayList = useMemo(() => {
    if (activeSection !== 'staff' || !presentationMode) return filteredStaff
    let list = DUMMY_STAFF
    if (staffSearch.trim()) {
      const q = staffSearch.trim().toLowerCase()
      list = list.filter(
        (s) =>
          (s.full_name || '').toLowerCase().includes(q) ||
          (s.email || '').toLowerCase().includes(q) ||
          (s.phone || '').toLowerCase().includes(q) ||
          (s.universities?.name || '').toLowerCase().includes(q)
      )
    }
    if (staffTypeFilter === 'Teaching') list = list.filter((s) => s.type === 'Teaching')
    if (staffTypeFilter === 'Non-Teaching') list = list.filter((s) => s.type === 'Non-Teaching')
    if (staffUniFilter) list = list.filter((s) => String(s.university_id) === String(staffUniFilter))
    return list
  }, [activeSection, presentationMode, filteredStaff, staffSearch, staffTypeFilter, staffUniFilter])

  const staffIsDemo = activeSection === 'staff' && presentationMode

  // Meetings & Reports: in presentation mode use dummy list and apply same filters (search, body, year)
  const meetingsDisplayList = useMemo(() => {
    if (activeSection !== 'meetings' || !presentationMode) return filteredMeetings
    let list = DUMMY_MEETINGS
    if (meetingsSearch.trim()) {
      const q = meetingsSearch.trim().toLowerCase()
      list = list.filter(
        (m) =>
          (m.subject || '').toLowerCase().includes(q) ||
          (m.venue || '').toLowerCase().includes(q) ||
          (m.universities?.name || '').toLowerCase().includes(q)
      )
    }
    if (meetingsBodyFilter) list = list.filter((m) => m.body_type === meetingsBodyFilter)
    if (meetingsYearFilter) {
      list = list.filter((m) => {
        const y = m.meeting_date ? new Date(m.meeting_date).getFullYear() : null
        return y != null && String(y) === meetingsYearFilter
      })
    }
    return list
  }, [activeSection, presentationMode, filteredMeetings, meetingsSearch, meetingsBodyFilter, meetingsYearFilter])

  const meetingsYearsForFilter = useMemo(() => {
    if (activeSection === 'meetings' && presentationMode) {
      const years = new Set()
      DUMMY_MEETINGS.forEach((m) => {
        if (m.meeting_date) years.add(new Date(m.meeting_date).getFullYear())
      })
      return Array.from(years).sort((a, b) => b - a)
    }
    return meetingsYears
  }, [activeSection, presentationMode, meetingsYears])

  const meetingsIsDemo = activeSection === 'meetings' && presentationMode

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-blue-600 text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="w-full">
      {/* Main Content */}
      <div className="w-full">
        {/* Breadcrumbs */}
        <div className="bg-white border-b border-slate-200 px-8 py-2">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <span>Portal</span>
            <span>/</span>
            <span className="text-slate-600 font-medium">
              {activeSection === 'home' ? 'Home' : activeSection === 'overview' ? 'Governance Command Center' : 'University Management'}
            </span>
          </div>
        </div>

        <div className="p-8">
          {/* Dedicated U&B Dashboard Home - default landing */}
          {activeSection === 'home' && (
            <UBDashboardHome user={user} showToast={showToast} />
          )}

          {/* Header - only when not on home */}
          {activeSection !== 'home' && (
          <>
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-3xl font-bold text-slate-900">
                  {activeSection === 'overview' ? 'Governance Command Center' : 
                   activeSection === 'universities' ? 'University Management' :
                   activeSection === 'accounts' ? 'University Accounts' :
                   activeSection === 'staff' ? 'Staff Directory' :
                   activeSection === 'meetings' ? 'Meetings & Reports' : 'Dashboard'}
                </h2>
                {(activeSection === 'overview' || activeSection === 'accounts' || activeSection === 'staff' || activeSection === 'meetings') && (
                  <div className="flex items-center gap-2">
                    {activeSection === 'overview' && (
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                        <span className="text-sm font-semibold text-emerald-700">System Status: Healthy</span>
                      </div>
                    )}
                    {(activeSection === 'accounts' || activeSection === 'staff' || activeSection === 'meetings') && presentationMode && (
                      <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                        Demo data
                      </span>
                    )}
                  </div>
                )}
              </div>
              {(activeSection === 'overview' || activeSection === 'accounts' || activeSection === 'staff' || activeSection === 'meetings') && (
                <button
                  onClick={() => setPresentationMode(!presentationMode)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    presentationMode
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                      : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                  }`}
                >
                  {presentationMode ? '✓ Presentation Mode' : 'Enable Presentation Mode'}
                </button>
              )}
            </div>
            <p className="text-slate-500 max-w-3xl">
              {activeSection === 'overview'
                ? 'Comprehensive analytics and governance oversight for all 27 universities'
                : activeSection === 'universities'
                  ? 'Manage university accounts and focal persons'
                  : activeSection === 'accounts'
                    ? 'University-centric view of accounts. Lock access or delete a university and all its data (with confirmation).'
                    : activeSection === 'staff'
                      ? 'Master list of employees across universities. Use for payroll verification and to assess academic strength (e.g. PhD-qualified faculty).'
                      : activeSection === 'meetings'
                        ? 'Monitor meetings and official reports. Governance timeline, document archive, and statutory compliance.'
                        : 'Dashboard'}
            </p>
          </motion.div>

          {/* Overview Section */}
          {activeSection === 'overview' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-6"
            >
              {/* Loading State for Analytics */}
              {loading && analyticsData.length === 0 && (
                <div className="bg-white border border-slate-200 rounded-xl p-12 shadow-sm text-center">
                  <div className="text-blue-600 text-xl mb-2">Loading analytics data...</div>
                  <div className="text-slate-500 text-sm">Fetching data from ub_analytics_hub</div>
                </div>
              )}
              
              {/* Analytics Content - Only show when data is loaded */}
              {!loading && (
                <>
              {/* Top summary strip */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
                      <University className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-slate-500 text-xs font-medium">Total Universities</div>
                      <div className="text-2xl font-bold text-slate-900 leading-tight">{totalUniversities || universities.length}</div>
                    </div>
                  </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <div className="text-slate-500 text-xs font-medium">Active Accounts</div>
                      <div className="text-2xl font-bold text-slate-900 leading-tight">{simulationMode ? totalUniversities || universities.length : activeAccounts}</div>
                    </div>
                  </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <div className="text-slate-500 text-xs font-medium">Expired Boards</div>
                      <div className="text-2xl font-bold text-slate-900 leading-tight">{totalExpiredBoards}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Hero row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-blue-600" />
                      Registered Universities by Region
                    </h3>
                  </div>

                  <div className="mb-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedDivision('all')}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        selectedDivision === 'all'
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      All regions
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedDivision('karachi')}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        selectedDivision === 'karachi'
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      Karachi
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedDivision('sukkur')}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        selectedDivision === 'sukkur'
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      Sukkur
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedDivision('hyderabad')}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        selectedDivision === 'hyderabad'
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      Hyderabad
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedDivision('larkana')}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        selectedDivision === 'larkana'
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      Larkana
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedDivision('others')}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        selectedDivision === 'others'
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      Other regions
                    </button>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-white p-4 flex-1 min-h-0">
                    {(mapData?.length ?? 0) > 0 ? (
                      <RegisteredUniversitiesByRegion
                        data={mapData}
                        selectedDivision={selectedDivision}
                        onSelectDivision={setSelectedDivision}
                        searchQuery={searchQuery}
                        simulationMode={presentationMode}
                      />
                    ) : (
                      <div className="h-[280px] flex items-center justify-center text-slate-400">
                        <div className="text-center">
                          <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p>No university data available</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="lg:col-span-1 flex flex-col gap-6 min-h-0">
                  {analyticsData.length > 0 && (
                    <div className="flex-shrink-0 bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                      <GovernanceCharts
                        data={analyticsData}
                        presentationMode={presentationMode}
                        sections={['boards']}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Analysis row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                  {(analyticsData.length > 0 || presentationMode) ? (
                    <GovernanceCharts
                      data={analyticsData}
                      presentationMode={presentationMode}
                      sections={['resources']}
                      resourceLayout="horizontal"
                    />
                  ) : (
                    <div className="h-[220px] rounded-lg border border-dashed border-slate-300 flex items-center justify-center text-slate-500 text-sm">
                      Resource comparison data will appear once analytics are available.
                    </div>
                  )}
                </div>

                <div className="lg:col-span-1 bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                  <h3 className="text-base font-semibold text-slate-900 mb-3">Resource Comparison Insight</h3>
                  {(() => {
                    let resourceData = analyticsData
                      .filter(u => u && u.total_staff !== undefined)
                      .sort((a, b) => (b.total_staff || 0) - (a.total_staff || 0))
                      .slice(0, 5)
                      .map(u => ({
                        university: u.university_short_name || u.university_name?.substring(0, 20) || 'Unknown',
                        staff: u.total_staff || 0,
                        faculties: u.total_faculties || 0
                      }))
                    if (presentationMode) {
                      resourceData = [
                        { university: 'Sukkur IBA Univ', staff: 21, faculties: 4 },
                        { university: 'University of K', staff: 18, faculties: 3 },
                        { university: 'Aror University', staff: 14, faculties: 3 },
                        { university: 'Shaheed Benazir', staff: 12, faculties: 2 },
                        { university: 'DOW University', staff: 10, faculties: 2 }
                      ]
                    }
                    const insightsList = resourceData.map((item) => ({
                      ...item,
                      insight: getResourceInsightForItem(item)
                    }))

                    if (!insightsList.length) {
                      return (
                        <div className="h-[220px] rounded-lg border border-dashed border-slate-300 flex items-center justify-center text-slate-500 text-sm text-center px-4">
                          Insights will appear here after resource metrics are available.
                        </div>
                      )
                    }

                    return (
                      <div className="space-y-3">
                        {insightsList.map((item, i) => (
                          <div key={i} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                            <p className="text-sm font-semibold text-slate-900">{item.university}</p>
                            {item.insight.ratio && (
                              <p className="text-xs text-slate-700 mt-1">{item.insight.ratio}</p>
                            )}
                            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{item.insight.insight}</p>
                          </div>
                        ))}
                      </div>
                    )
                  })()}
                </div>
              </div>

              {/* Bottom system logs (collapsible) */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowSystemLogs((v) => !v)}
                  className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                  <div className="text-left">
                    <h3 className="text-base font-semibold text-slate-900">System Logs</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Full activity timeline for governance events</p>
                  </div>
                  {showSystemLogs ? <ChevronUp className="w-5 h-5 text-slate-500" /> : <ChevronDown className="w-5 h-5 text-slate-500" />}
                </button>
                <AnimatePresence initial={false}>
                  {showSystemLogs && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: 'easeOut' }}
                      className="border-t border-slate-200"
                    >
                      <div className="p-5">
                        {(!analyticsData.length && !presentationMode) ? (
                          <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-slate-500 text-sm">
                            No system logs available yet.
                          </div>
                        ) : (
                          <GovernanceActivityFeed isPresentationMode={presentationMode} showTitle={false} />
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

                </>
              )}
            </motion.div>
          )}

          {/* University Management Section */}
          {activeSection === 'universities' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-6"
            >
              {/* Create University Account Form */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm relative">
                <h3 className="text-xl font-semibold text-slate-900 mb-4">Create University Account</h3>
                <form onSubmit={handleCreateUniversity} className="space-y-4 relative">
                  {/* Select wrapper: isolate stacking so dropdown doesn't block fields below */}
                  <div className="relative z-0">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Select University
                    </label>
                    <select
                      value={selectedUniversityId}
                      onChange={(e) => setSelectedUniversityId(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-slate-900 cursor-pointer"
                      required
                    >
                      <option value="" className="bg-white text-slate-900">Choose a university...</option>
                      {universities
                        .filter(u => !u.hasFocalPerson)
                        .map(uni => (
                          <option key={uni.id} value={uni.id} className="bg-white text-slate-900">
                            {uni.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="relative z-10">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Focal Person Email
                    </label>
                    <input
                      type="email"
                      value={focalPersonEmail}
                      onChange={(e) => setFocalPersonEmail(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-slate-900"
                      placeholder="focal.person@university.edu.pk"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Temporary Password
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={tempPassword}
                        onChange={(e) => setTempPassword(e.target.value)}
                        className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-slate-900"
                        placeholder="Generate or enter password"
                        required
                      />
                      <button
                        type="button"
                        onClick={handleGeneratePassword}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors flex items-center gap-2"
                      >
                        <Key className="w-4 h-4" />
                        <span>Generate</span>
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isCreating}
                    className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCreating ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Creating Account...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        <span>Create University Account</span>
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Universities List */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-slate-900">All Universities</h3>
                  <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search universities..."
                      className="px-3 py-1 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  {universities
                    .filter(uni => 
                      searchQuery === '' || 
                      uni.name.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map(uni => (
                      <div
                        key={uni.id}
                        className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100 hover:bg-slate-100 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <div className="text-slate-900 font-medium">{uni.name}</div>
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              uni.hasFocalPerson
                                ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                : 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                            }`}>
                              {uni.hasFocalPerson ? 'Active' : 'Setup Pending'}
                            </span>
                          </div>
                          <div className="text-sm text-slate-500 mt-1">
                            {uni.focalPersonEmail || 'No focal person assigned'}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* University Accounts Section - U&B University Control Center */}
          {activeSection === 'accounts' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-6"
            >
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  {!accountsIsDemo && accountsLoading && accountsList.length === 0 ? (
                    <div className="p-12 text-center text-slate-500">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-600" />
                      <p>Loading university accounts…</p>
                    </div>
                  ) : !accountsIsDemo && accountsList.length === 0 ? (
                    <div className="p-12 text-center text-slate-500">
                      No university accounts found. Accounts appear when a focal person is assigned to a university.
                    </div>
                  ) : (
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-sm font-medium">
                          <th className="px-4 py-4">University name</th>
                          <th className="px-4 py-4">Focal person</th>
                          <th className="px-4 py-4">Setup complete</th>
                          <th className="px-4 py-4">Locked</th>
                          <th className="px-4 py-4 w-[1%] whitespace-nowrap">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {accountsDisplayList.map((acc) => (
                          <tr key={acc.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                            <td className="px-4 py-5 text-slate-900 font-medium">{acc.universities?.name || '—'}</td>
                            <td className="px-4 py-5 text-slate-700">{acc.full_name || acc.email || '—'}</td>
                            <td className="px-4 py-5">
                              <span
                                className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${
                                  acc.is_setup_complete
                                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                                    : 'border-slate-200 bg-slate-100 text-slate-700'
                                }`}
                              >
                                {acc.is_setup_complete ? 'Complete' : 'Incomplete'}
                              </span>
                            </td>
                            <td className="px-4 py-5">
                              <span
                                className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${
                                  acc.is_locked
                                    ? 'border-rose-200 bg-rose-50 text-rose-800'
                                    : 'border-slate-200 bg-slate-50 text-slate-700'
                                }`}
                              >
                                {acc.is_locked ? 'Locked' : 'Unlocked'}
                              </span>
                            </td>
                            <td className="px-4 py-5">
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  title={acc.is_locked ? 'Unlock account' : 'Lock account'}
                                  aria-label={acc.is_locked ? 'Unlock account' : 'Lock account'}
                                  onClick={() => accountsIsDemo ? showToast('Presentation mode – no changes saved.', 'success') : handleLockAccount(acc)}
                                  disabled={!accountsIsDemo && lockingAccountId === acc.id}
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-50 disabled:pointer-events-none"
                                >
                                  {!accountsIsDemo && lockingAccountId === acc.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : acc.is_locked ? (
                                    <Unlock className="w-4 h-4" />
                                  ) : (
                                    <Lock className="w-4 h-4" />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  title="Delete university"
                                  aria-label="Delete university"
                                  onClick={() => accountsIsDemo ? showToast('Presentation mode – delete disabled.', 'success') : openDeleteModal(acc)}
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-700 transition-colors hover:bg-red-100 disabled:opacity-60"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
            </motion.div>
          )}

          {/* Staff Directory Section - Human Resource Command */}
          {activeSection === 'staff' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-6"
            >
                <DataTable
                  columns={[
                    { key: 'full_name', label: 'Name', render: (row) => row.full_name || '—' },
                    {
                      key: 'designation',
                      label: 'Designation',
                      render: (row) =>
                        row.type === 'Teaching'
                          ? (row.academic_designation || '—')
                          : (row.designation || row.category || '—')
                    },
                    {
                      key: 'faculty_department',
                      label: 'Faculty / Department',
                      render: (row) => {
                        if (row.type === 'Non-Teaching' && (row.department_id == null || row.departments?.name == null)) {
                          return <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-medium">Administrative / General</span>
                        }
                        const dept = row.departments?.name
                        const fac = row.faculties?.name
                        if (dept || fac) return [dept, fac].filter(Boolean).join(' · ') || '—'
                        return '—'
                      }
                    },
                    { key: 'university', label: 'University', render: (row) => row.universities?.name || '—' },
                    { key: 'campus', label: 'Campus', render: (row) => row.campuses?.name || '—' },
                    {
                      key: 'contact',
                      label: 'Contact',
                      render: (row) => [row.email, row.phone].filter(Boolean).join(' · ') || '—'
                    },
                    {
                      key: 'type',
                      label: 'Type',
                      render: (row) => (
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${row.type === 'Teaching' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                          {row.type || '—'}
                        </span>
                      )
                    },
                    {
                      key: 'employment_type',
                      label: 'Contract Type',
                      render: (row) => {
                        const val = row.employment_type ?? null
                        if (val === 'Permanent') return <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 text-xs font-medium">Permanent</span>
                        if (val === 'Contractual') return <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-xs font-medium">Contractual</span>
                        if (val === 'Ad-hoc') return <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-700 text-xs font-medium">Ad-hoc</span>
                        return <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-xs font-medium">Not Specified</span>
                      }
                    }
                  ]}
                  data={staffDisplayList}
                  loading={staffIsDemo ? false : staffLoading}
                  emptyMessage={staffIsDemo ? 'No staff match the current filters.' : 'No staff records found. Data appears when universities add staff.'}
                  searchPlaceholder="Search by name, email, phone, or university..."
                  searchValue={staffSearch}
                  onSearchChange={setStaffSearch}
                  filterSlot={
                    <div className="flex flex-wrap items-center gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Staff type</label>
                        <select
                          value={staffTypeFilter}
                          onChange={(e) => setStaffTypeFilter(e.target.value)}
                          className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[140px] [&>option]:bg-white [&>option]:text-slate-900"
                        >
                          <option value="All">All types</option>
                          <option value="Teaching">Teaching</option>
                          <option value="Non-Teaching">Non-Teaching</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">University</label>
                        <select
                          value={staffUniFilter}
                          onChange={(e) => setStaffUniFilter(e.target.value)}
                          className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px] [&>option]:bg-white [&>option]:text-slate-900"
                        >
                          <option value="">All universities</option>
                          {(staffIsDemo ? DUMMY_STAFF_UNIVERSITIES : universities).map((u) => (
                            <option key={u.id} value={u.id}>{u.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  }
                  pageSize={25}
                />
            </motion.div>
          )}

          {/* Meetings & Reports Section - Governance Command */}
          {activeSection === 'meetings' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-6"
            >
                <DataTable
                  columns={[
                    {
                      key: 'body_type',
                      label: 'Body',
                      render: (row) => {
                        const colors = {
                          Senate: 'bg-red-100 text-red-700 border-red-300',
                          Syndicate: 'bg-blue-100 text-blue-700 border-blue-300',
                          'Academic Council': 'bg-emerald-100 text-emerald-700 border-emerald-300',
                          'Board of Faculty': 'bg-purple-100 text-purple-700 border-purple-300',
                          'Board of Studies': 'bg-amber-100 text-amber-700 border-amber-300',
                          'Finance Committee': 'bg-slate-100 text-slate-700 border-slate-300'
                        }
                        const c = colors[row.body_type] || 'bg-slate-100 text-slate-700 border-slate-300'
                        return (
                          <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${c}`}>
                            {row.body_type || '—'}
                          </span>
                        )
                      }
                    },
                    {
                      key: 'meeting_date',
                      label: 'Date',
                      render: (row) =>
                        row.meeting_date
                          ? new Date(row.meeting_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                          : '—'
                    },
                    { key: 'subject', label: 'Subject', render: (row) => <span className="max-w-[200px] truncate block" title={row.subject}>{row.subject || '—'}</span> },
                    { key: 'university', label: 'University', render: (row) => row.universities?.name || '—' },
                    {
                      key: 'attendance',
                      label: 'Attendance',
                      render: (row) => <MeetingAttendanceCell attendance={row.attendance} />,
                    },
                    {
                      key: 'decisions_summary',
                      label: 'Decisions',
                      render: (row) => (
                        <div className="flex items-center gap-2">
                          <span className="max-w-[120px] truncate block text-slate-600 text-sm" title={row.decisions_summary}>
                            {row.decisions_summary
                              ? row.decisions_summary.length > 35
                                ? `${row.decisions_summary.slice(0, 35)}…`
                                : row.decisions_summary
                              : '—'}
                          </span>
                          <button
                            type="button"
                            title="View full decisions"
                            aria-label="View full decisions"
                            onClick={() => setDecisionViewMeeting(row)}
                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-700 transition-colors hover:bg-blue-100"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      )
                    },
                    {
                      key: 'documents',
                      label: 'Documents',
                      render: (row) => (
                        <div className="flex items-center gap-1.5">
                          {row.notification_url ? (
                            <a
                              href={row.notification_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Open notification"
                              aria-label="Open notification document"
                              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-700 transition-colors hover:bg-blue-100"
                            >
                              <FileText className="w-4 h-4" />
                            </a>
                          ) : (
                            <span
                              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-100 bg-slate-50 text-slate-300"
                              title="No notification"
                              aria-label="No notification document"
                            >
                              <FileText className="w-4 h-4" aria-hidden />
                            </span>
                          )}
                          {row.minutes_url ? (
                            <a
                              href={row.minutes_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Open minutes"
                              aria-label="Open meeting minutes"
                              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 transition-colors hover:bg-emerald-100"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                          ) : (
                            <span
                              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-100 bg-slate-50 text-slate-300"
                              title="No minutes"
                              aria-label="No meeting minutes"
                            >
                              <Download className="w-4 h-4" aria-hidden />
                            </span>
                          )}
                        </div>
                      )
                    },
                    {
                      key: 'status',
                      label: 'Status',
                      render: (row) => {
                        const official = row.status === 'Official'
                        return (
                          <span
                            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${
                              official
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                                : 'border-amber-200 bg-amber-50 text-amber-800'
                            }`}
                          >
                            {row.status || 'Draft'}
                          </span>
                        )
                      }
                    }
                  ]}
                  data={meetingsDisplayList}
                  loading={meetingsIsDemo ? false : meetingsLoading}
                  emptyMessage={meetingsIsDemo ? 'No meetings match the current filters.' : 'No meeting records found. Data appears when universities add meetings.'}
                  searchPlaceholder="Search by subject, venue, or university..."
                  searchValue={meetingsSearch}
                  onSearchChange={setMeetingsSearch}
                  filterSlot={
                    <div className="flex flex-wrap items-center gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Body type</label>
                        <select
                          value={meetingsBodyFilter}
                          onChange={(e) => setMeetingsBodyFilter(e.target.value)}
                          className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[160px] [&>option]:bg-white [&>option]:text-slate-900"
                        >
                          <option value="">All body types</option>
                          <option value="Senate">Senate</option>
                          <option value="Syndicate">Syndicate</option>
                          <option value="Academic Council">Academic Council</option>
                          <option value="Board of Faculty">Board of Faculty</option>
                          <option value="Board of Studies">Board of Studies</option>
                          <option value="Finance Committee">Finance Committee</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Year</label>
                        <select
                          value={meetingsYearFilter}
                          onChange={(e) => setMeetingsYearFilter(e.target.value)}
                          className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[100px] [&>option]:bg-white [&>option]:text-slate-900"
                        >
                          <option value="">All years</option>
                          {meetingsYearsForFilter.map((y) => (
                            <option key={y} value={String(y)}>{y}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  }
                  pageSize={25}
                />
            </motion.div>
          )}
          </>
          )}
        </div>
      </div>

      {/* Decision view card (full decisions text) */}
      <AnimatePresence>
        {decisionViewMeeting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => setDecisionViewMeeting(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full max-h-[85vh] flex flex-col"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Meeting decisions</h3>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {decisionViewMeeting.subject || 'Meeting'} · {decisionViewMeeting.body_type || '—'} · {decisionViewMeeting.meeting_date ? new Date(decisionViewMeeting.meeting_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDecisionViewMeeting(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="px-6 py-4 overflow-y-auto flex-1">
                <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {decisionViewMeeting.decisions_summary || 'No decision summary recorded.'}
                </p>
              </div>
              <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 rounded-b-xl">
                <button
                  type="button"
                  onClick={() => setDecisionViewMeeting(null)}
                  className="w-full py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete University confirmation modal */}
      <AnimatePresence>
        {deleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => !deletingUniversityId && setDeleteModal(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl shadow-xl border-2 border-red-200 max-w-md w-full overflow-hidden"
            >
              <div className="bg-red-50 border-b border-red-200 px-6 py-4">
                <h3 className="text-lg font-semibold text-red-800">Confirm Deletion</h3>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-slate-700">
                  Are you sure you want to permanently delete <strong>{deleteModal.universityName}</strong> and all associated data?
                </p>
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  This action cannot be undone.
                </div>
              </div>
              <div className="flex justify-end gap-2 px-6 py-4 bg-slate-50 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setDeleteModal(null)}
                  disabled={!!deletingUniversityId}
                  className="px-4 py-2 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteUniversity}
                  disabled={!!deletingUniversityId}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {deletingUniversityId ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Delete Permanently
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: -50 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: 20, x: -50 }}
            className="fixed bottom-4 right-4 bg-white border border-slate-200 rounded-lg shadow-lg p-4 z-50 min-w-[300px]"
          >
            <div className="flex items-center gap-3">
              {toast.type === 'success' ? (
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              ) : (
                <X className="w-5 h-5 text-red-600" />
              )}
              <p className="text-slate-900">{toast.message}</p>
              <button
                onClick={() => setToast(null)}
                className="ml-auto text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default UBAdminDashboard
