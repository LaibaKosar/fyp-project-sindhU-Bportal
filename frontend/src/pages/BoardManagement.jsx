import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabaseClient'
import { useNavigate } from 'react-router-dom'
import { 
  Trash2, 
  Plus, 
  Loader2,
  X,
  Users,
  Building2,
  BookOpen,
  Globe,
  Search,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Calendar,
  Edit2,
  Crown,
  LayoutList,
} from 'lucide-react'
import { UfpAdminShell, UfpAdminPageWide, UfpAdminLoadingCenter } from '../components/UfpAdminShell'
import { UfpManagementPageHeader } from '../components/UfpManagementPageHeader'
import { recordSystemLog } from '../utils/systemLogs'
import { normalizeText } from '../utils/validation/commonValidators'
import {
  FIELD_LIMITS,
  validateDateRangeField,
  validateRequiredField,
} from '../utils/validation/formRules'

// Board Levels
const BOARD_LEVELS = {
  UNIVERSITY: 'Academic Council',
  FACULTY: 'Board of Faculty',
  DEPARTMENT: 'Board of Studies'
}

// Board Types
const BOARD_TYPES = {
  UNIVERSITY: 'Academic Council',
  FACULTY: 'Board of Faculty',
  DEPARTMENT: 'Board of Studies'
}

/** Tabs shown in Boards UI (Academic Council is managed under Governance → Academic Council). */
const BOARD_MAIN_TABS = [BOARD_LEVELS.FACULTY, BOARD_LEVELS.DEPARTMENT]

/** Visual system: Faculty = indigo, Studies = emerald (distinct at a glance). */
const BOARD_TAB_THEME = {
  [BOARD_LEVELS.FACULTY]: {
    tabActive: 'bg-indigo-700 text-white shadow-md ring-1 ring-indigo-950/10',
    tabInactive: 'border border-indigo-100 bg-white text-indigo-950 hover:bg-indigo-50/90',
    shell: 'border-indigo-200/90 shadow-md shadow-indigo-950/[0.04] ring-1 ring-indigo-950/[0.06]',
    summary: 'border-b border-indigo-100 bg-gradient-to-r from-indigo-50 via-white to-slate-50/80',
    summaryIcon: 'bg-indigo-100 text-indigo-700',
    thead: 'bg-indigo-50/90 text-indigo-900/80',
    row: 'border-l-[4px] border-l-indigo-500 hover:bg-indigo-50/35',
    searchFocus: 'focus:border-indigo-500 focus:ring-indigo-500/20',
  },
  [BOARD_LEVELS.DEPARTMENT]: {
    tabActive: 'bg-emerald-700 text-white shadow-md ring-1 ring-emerald-950/10',
    tabInactive: 'border border-emerald-100 bg-white text-emerald-950 hover:bg-emerald-50/90',
    shell: 'border-emerald-200/90 shadow-md shadow-emerald-950/[0.04] ring-1 ring-emerald-950/[0.06]',
    summary: 'border-b border-emerald-100 bg-gradient-to-r from-emerald-50 via-white to-slate-50/80',
    summaryIcon: 'bg-emerald-100 text-emerald-700',
    thead: 'bg-emerald-50/90 text-emerald-900/80',
    row: 'border-l-[4px] border-l-emerald-600 hover:bg-emerald-50/35',
    searchFocus: 'focus:border-emerald-500 focus:ring-emerald-500/20',
  },
}

// Meeting Frequencies
const MEETING_FREQUENCIES = [
  'Quarterly',
  'Bi-Annual',
  'Annual'
]

// Member Roles
const MEMBER_ROLES = [
  'Chairman',
  'Secretary',
  'Member',
  'External Expert'
]
const OTHER_BOARD_MEMBER_ROLE = '__OTHER_BOARD_MEMBER_ROLE__'

function facultyRelationFromBoard(board) {
  const f = board?.faculties
  if (!f) return null
  return Array.isArray(f) ? f[0] || null : f
}

function BoardManagement() {
  const navigate = useNavigate()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState(null)
  const [boards, setBoards] = useState([])
  const [filteredBoards, setFilteredBoards] = useState([])
  const [faculties, setFaculties] = useState([])
  const [departments, setDepartments] = useState([])
  const [toast, setToast] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [showMemberModal, setShowMemberModal] = useState(false)
  const [selectedBoard, setSelectedBoard] = useState(null)
  const [boardMembers, setBoardMembers] = useState([])
  const [activeTab, setActiveTab] = useState(BOARD_LEVELS.FACULTY)
  const [editingBoard, setEditingBoard] = useState(null)

  // Form state
  const [boardName, setBoardName] = useState('')
  const [termStart, setTermStart] = useState('')
  const [termEnd, setTermEnd] = useState('')
  const [meetingFrequency, setMeetingFrequency] = useState('')
  const [facultyId, setFacultyId] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  // Member form state
  const [memberName, setMemberName] = useState('')
  const [memberDesignation, setMemberDesignation] = useState('')
  const [memberRole, setMemberRole] = useState('')
  const [customMemberRole, setCustomMemberRole] = useState('')
  const [memberType, setMemberType] = useState('Internal')
  const [memberAffiliation, setMemberAffiliation] = useState('')
  const [memberStatusAsPerAct, setMemberStatusAsPerAct] = useState('')

  // Filter state
  const [searchQuery, setSearchQuery] = useState('')

  const selectedFacultyForm = facultyId
    ? faculties.find((f) => String(f.id) === String(facultyId))
    : null
  const selectedFacultyDeanName = (selectedFacultyForm?.dean_name || '').trim()
  const selectedFacultyDeanEmail = (selectedFacultyForm?.dean_email || '').trim()

  useEffect(() => {
    loadUserData()
  }, [])

  useEffect(() => {
    if (user?.university_id) {
      fetchBoards()
      if (activeTab === BOARD_LEVELS.FACULTY || activeTab === BOARD_LEVELS.DEPARTMENT) {
        fetchFaculties()
      }
      if (activeTab === BOARD_LEVELS.DEPARTMENT && facultyId) {
        fetchDepartments()
      }
    }
  }, [user, activeTab, facultyId])

  useEffect(() => {
    applyFilters()
  }, [boards, searchQuery, activeTab])

  useEffect(() => {
    if (selectedBoard && showMemberModal) {
      fetchBoardMembers()
    }
  }, [selectedBoard, showMemberModal])

  const loadUserData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        navigate('/login')
        return
      }

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

      if (profile.role !== 'UFP') {
        navigate('/ufp-dashboard')
        return
      }

      setUser(profile)
      setLoading(false)
    } catch (error) {
      console.error('Error loading user data:', error)
      navigate('/login')
    }
  }

  const fetchBoards = async () => {
    if (!user?.university_id) return

    try {
      let query = supabase
        .from('university_boards')
        .select(
          '*, staff:dean_id(full_name, academic_designation, administrative_role), faculties(dean_name, dean_email, name)'
        )
        .eq('university_id', user.university_id)

      if (activeTab === BOARD_LEVELS.FACULTY) {
        query = query.eq('board_type', BOARD_TYPES.FACULTY)
      } else if (activeTab === BOARD_LEVELS.DEPARTMENT) {
        query = query.eq('board_type', BOARD_TYPES.DEPARTMENT)
      }

      const { data, error } = await query.order('term_start', { ascending: false })

      if (error) throw error
      setBoards(data || [])
    } catch (error) {
      console.error('Error fetching boards:', error)
      showToast('Error loading boards: ' + error.message, 'error')
    }
  }

  const fetchFaculties = async () => {
    if (!user?.university_id) return

    try {
      const { data, error } = await supabase
        .from('faculties')
        .select('id, name, dean_id, dean_name, dean_email')
        .eq('university_id', user.university_id)
        .order('name', { ascending: true })

      if (error) throw error
      setFaculties(data || [])
    } catch (error) {
      console.error('Error fetching faculties:', error)
    }
  }

  const fetchDepartments = async () => {
    if (!user?.university_id || !facultyId) return

    try {
      const { data, error } = await supabase
        .from('departments')
        .select('id, name')
        .eq('university_id', user.university_id)
        .eq('faculty_id', facultyId)
        .order('name', { ascending: true })

      if (error) throw error
      setDepartments(data || [])
    } catch (error) {
      console.error('Error fetching departments:', error)
    }
  }

  const fetchBoardMembers = async () => {
    if (!selectedBoard?.id) return

    try {
      const { data, error } = await supabase
        .from('board_members')
        .select('*')
        .eq('board_id', selectedBoard.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setBoardMembers(data || [])
    } catch (error) {
      console.error('Error fetching board members:', error)
      showToast('Error loading members: ' + error.message, 'error')
    }
  }

  const applyFilters = () => {
    let filtered = [...boards]

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(board =>
        board.name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    setFilteredBoards(filtered)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!user?.university_id) {
      showToast('University ID not found. Please log in again.', 'error')
      return
    }

    if (!boardName || !termStart || !termEnd || !meetingFrequency) {
      showToast('Please fill in all required fields', 'error')
      return
    }

    const normalizedBoardName = normalizeText(boardName)
    const boardNameError = validateRequiredField(normalizedBoardName, 'board name')
    if (boardNameError) return showToast(boardNameError, 'error')
    if (normalizedBoardName.length > FIELD_LIMITS.title) {
      return showToast(`Board name is too long (max ${FIELD_LIMITS.title} characters)`, 'error')
    }

    const dateError = validateDateRangeField(termStart, termEnd)
    if (dateError) {
      showToast('Term end date must be after term start date', 'error')
      return
    }

    if (activeTab === BOARD_LEVELS.FACULTY && !facultyId) {
      showToast('Please select a faculty', 'error')
      return
    }

    if (activeTab === BOARD_LEVELS.FACULTY) {
      const selFac = faculties.find((x) => String(x.id) === String(facultyId))
      const dn = (selFac?.dean_name || '').trim()
      if (!dn) {
        showToast(
          'This faculty has no dean name on file. Set dean name on the faculty record before creating or updating this board.',
          'error'
        )
      return
      }
    }

    if (activeTab === BOARD_LEVELS.DEPARTMENT && !departmentId) {
      showToast('Please select a department', 'error')
      return
    }

    setSaving(true)

    try {
      const boardData = {
        university_id: user.university_id,
        name: normalizedBoardName,
        board_type: activeTab === BOARD_LEVELS.FACULTY ? BOARD_TYPES.FACULTY : BOARD_TYPES.DEPARTMENT,
        term_start: termStart,
        term_end: termEnd,
        meeting_frequency: meetingFrequency
      }

      if (activeTab === BOARD_LEVELS.FACULTY) {
        const selFac = faculties.find((x) => String(x.id) === String(facultyId))
        boardData.faculty_id = facultyId
        boardData.dean_id = selFac?.dean_id ?? null
      }

      if (activeTab === BOARD_LEVELS.DEPARTMENT) {
        boardData.department_id = departmentId
      }

      let error
      if (editingBoard) {
        // Update existing board
        const { error: updateError } = await supabase
          .from('university_boards')
          .update(boardData)
          .eq('id', editingBoard.id)

        error = updateError
        if (!error) {
          await recordSystemLog({
            universityId: user.university_id,
            actionType: 'BOARD_UPDATED',
            details: `Updated board: ${normalizedBoardName}`,
          })
          showToast('Board updated successfully!', 'success')
        }
      } else {
        // Create new board
        const { error: insertError } = await supabase
          .from('university_boards')
          .insert([boardData])

        error = insertError
        if (!error) {
          await recordSystemLog({
            universityId: user.university_id,
            actionType: 'BOARD_ADDED',
            details: `Added board: ${normalizedBoardName}`,
          })
          showToast('Board created successfully!', 'success')
        }
      }

      if (error) throw error
      
      // Clear form
      setBoardName('')
      setTermStart('')
      setTermEnd('')
      setMeetingFrequency('')
      setFacultyId('')
      setDepartmentId('')
      setEditingBoard(null)
      
      await fetchBoards()
      setShowForm(false)
    } catch (error) {
      console.error('Error saving board:', error)
      showToast(error.message || 'Error creating board', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleAddMember = async (e) => {
    e.preventDefault()
    
    if (!selectedBoard?.id) {
      showToast('No board selected', 'error')
      return
    }

    const normalizedMemberName = normalizeText(memberName)
    const normalizedDesignation = normalizeText(memberDesignation)
    const normalizedAffiliation = normalizeText(memberAffiliation)
    const normalizedStatusPerAct = normalizeText(memberStatusAsPerAct)
    const memberNameError = validateRequiredField(normalizedMemberName, 'member name')
    if (memberNameError) return showToast(memberNameError, 'error')
    if (normalizedMemberName.length > FIELD_LIMITS.name) {
      return showToast(`Member name is too long (max ${FIELD_LIMITS.name} characters)`, 'error')
    }
    if (!memberRole) return showToast('Please fill in all required fields', 'error')

    const finalMemberRole =
      memberRole === OTHER_BOARD_MEMBER_ROLE ? normalizeText(customMemberRole) : memberRole

    if (memberRole === OTHER_BOARD_MEMBER_ROLE && !finalMemberRole) {
      showToast('Please enter a role when using Other', 'error')
      return
    }

    if (memberType === 'External' && !normalizedAffiliation) {
      showToast('Please provide affiliation for external members', 'error')
      return
    }

    setSaving(true)

    try {
      const memberData = {
        board_id: selectedBoard.id,
        full_name: normalizedMemberName,
        designation: normalizedDesignation || null,
        role: finalMemberRole,
        member_type: memberType,
        affiliation: memberType === 'External' ? normalizedAffiliation : null,
        status_as_per_act: normalizedStatusPerAct || null
      }

      const { error } = await supabase
        .from('board_members')
        .insert([memberData])

      if (error) throw error

      await recordSystemLog({
        universityId: user.university_id,
        actionType: 'BOARD_MEMBER_ADDED',
        details: `Added board member: ${normalizedMemberName} (${finalMemberRole}) in ${selectedBoard?.name || 'board'}.`,
      })

      showToast('Member added successfully!', 'success')
      
      // Clear form
      setMemberName('')
      setMemberDesignation('')
      setMemberRole('')
      setCustomMemberRole('')
      setMemberType('Internal')
      setMemberAffiliation('')
      setMemberStatusAsPerAct('')
      
      await fetchBoardMembers()
    } catch (error) {
      console.error('Error adding member:', error)
      showToast(error.message || 'Error adding member', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleEditBoard = async (board) => {
    setEditingBoard(board)
    setBoardName(board.name)
    setTermStart(board.term_start)
    setTermEnd(board.term_end)
    setMeetingFrequency(board.meeting_frequency)
    setFacultyId(board.faculty_id || '')
    setDepartmentId(board.department_id || '')
    
    if (board.board_type === BOARD_TYPES.UNIVERSITY) {
      showToast('Academic Council records are managed in Governance → Academic Council.', 'success')
      return
    }
    if (board.board_type === BOARD_TYPES.FACULTY) {
      setActiveTab(BOARD_LEVELS.FACULTY)
      if (board.faculty_id) {
        await fetchFaculties()
      }
    } else if (board.board_type === BOARD_TYPES.DEPARTMENT) {
      setActiveTab(BOARD_LEVELS.DEPARTMENT)
      if (board.faculty_id) {
        fetchFaculties()
        if (board.department_id) {
          fetchDepartments()
        }
      }
    }
    
    setShowForm(true)
  }

  const handleDeleteBoard = async (boardId) => {
    if (!confirm('Are you sure you want to delete this board? This will also delete all associated members.')) {
      return
    }

    try {
      const boardToDelete = boards.find((board) => board.id === boardId)
      // Delete members first
      await supabase
        .from('board_members')
        .delete()
        .eq('board_id', boardId)

      // Delete board
      const { error } = await supabase
        .from('university_boards')
        .delete()
        .eq('id', boardId)

      if (error) throw error

      await recordSystemLog({
        universityId: user?.university_id,
        actionType: 'BOARD_DELETED',
        details: `Deleted board: ${boardToDelete?.name || 'Unnamed board'}`,
      })

      await fetchBoards()
      showToast('Board deleted successfully', 'success')
    } catch (error) {
      console.error('Error deleting board:', error)
      showToast(error.message || 'Error deleting board', 'error')
    }
  }

  const handleDeleteMember = async (memberId) => {
    if (!confirm('Are you sure you want to remove this member?')) {
      return
    }

    try {
      const memberToDelete = boardMembers.find((member) => member.id === memberId)
      const { error } = await supabase
        .from('board_members')
        .delete()
        .eq('id', memberId)

      if (error) throw error

      await recordSystemLog({
        universityId: user?.university_id,
        actionType: 'BOARD_MEMBER_DELETED',
        details: `Removed board member: ${memberToDelete?.full_name || 'Unnamed member'} from ${selectedBoard?.name || 'board'}.`,
      })

      await fetchBoardMembers()
      showToast('Member removed successfully', 'success')
    } catch (error) {
      console.error('Error deleting member:', error)
      showToast(error.message || 'Error removing member', 'error')
    }
  }

  const handleManageMembers = (board) => {
    setSelectedBoard(board)
    setMemberRole('')
    setCustomMemberRole('')
    setShowMemberModal(true)
  }

  const getStatus = (termStart, termEnd) => {
    const today = new Date()
    const start = new Date(termStart)
    const end = new Date(termEnd)
    
    if (today >= start && today <= end) {
      return { label: 'Active', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 }
    } else if (today > end) {
      return { label: 'Expired', color: 'bg-red-100 text-red-700', icon: XCircle }
    } else {
      return { label: 'Upcoming', color: 'bg-blue-100 text-blue-700', icon: Calendar }
    }
  }

  const checkCompliance = (board) => {
    if (board.board_type !== BOARD_TYPES.DEPARTMENT) return null
    
    const externalMembers = boardMembers.filter(m => 
      m.board_id === board.id && m.member_type === 'External'
    )
    
    if (externalMembers.length < 2) {
      return {
        compliant: false,
        message: 'Non-Compliant: Needs External Experts',
        count: externalMembers.length
      }
    }
    
    return { compliant: true }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 5000)
  }

  if (loading) {
    return <UfpAdminLoadingCenter />
  }

  const compliance = selectedBoard ? checkCompliance(selectedBoard) : null
  const tabTheme = BOARD_TAB_THEME[activeTab]

  return (
    <UfpAdminShell>
      <UfpAdminPageWide>
        <UfpManagementPageHeader
          breadcrumbItems={[
            { label: 'Dashboard', path: '/ufp-dashboard' },
            { label: 'Board Management' },
          ]}
          title="Board Management"
          description="Board of Faculty and Board of Studies: terms, meeting frequency, and membership. Academic Council is maintained under Governance → Academic Council."
          icon={<LayoutList className="h-5 w-5" strokeWidth={2} aria-hidden />}
          primaryAction={{ label: 'Add Board', onClick: () => setShowForm(true) }}
        />
      {/* Tabs — color-coded: Faculty (indigo) vs Studies (emerald) */}
      <div className="mb-4 rounded-2xl border border-slate-200/90 bg-white p-1.5 shadow-sm">
        <div className="flex flex-col gap-1 sm:flex-row sm:gap-2">
          {BOARD_MAIN_TABS.map((level) => {
            const isActive = activeTab === level
            const t = BOARD_TAB_THEME[level]
            return (
          <button
            key={level}
                type="button"
            onClick={() => {
              setActiveTab(level)
              setSearchQuery('')
            }}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                  isActive ? t.tabActive : t.tabInactive
                }`}
              >
                {level === BOARD_LEVELS.FACULTY ? (
                  <Building2 className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                ) : (
                  <BookOpen className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                )}
                <span>{level}</span>
          </button>
            )
          })}
        </div>
      </div>

      {/* Search */}
      <div
        className={`mb-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm ${
          activeTab === BOARD_LEVELS.FACULTY ? 'ring-1 ring-indigo-500/10' : 'ring-1 ring-emerald-500/10'
        }`}
      >
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search boards by name…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full rounded-xl border border-slate-300 py-2.5 pl-11 pr-4 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${tabTheme.searchFocus}`}
          />
        </div>
      </div>

      {/* Boards table — themed shell, readable type scale */}
      {filteredBoards.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className={`overflow-hidden rounded-2xl border bg-white ${tabTheme.shell}`}
        >
          <div className={`flex flex-wrap items-center justify-between gap-3 px-5 py-4 ${tabTheme.summary}`}>
            <div className="flex min-w-0 items-center gap-3">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tabTheme.summaryIcon}`}
              >
                {activeTab === BOARD_LEVELS.FACULTY ? (
                  <Building2 className="h-6 w-6" aria-hidden />
                ) : (
                  <BookOpen className="h-6 w-6" aria-hidden />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-2">
                  <h3 className="truncate text-lg font-bold text-slate-900 sm:text-xl">
                    {activeTab === BOARD_LEVELS.FACULTY ? 'Board of Faculty' : 'Board of Studies'}
                  </h3>
                  <span className="shrink-0 text-base font-semibold text-slate-500">(0)</span>
                  <span
                    className={`hidden rounded-full px-2.5 py-0.5 text-xs font-semibold sm:inline-flex ${
                      activeTab === BOARD_LEVELS.FACULTY
                        ? 'bg-indigo-100 text-indigo-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {activeTab === BOARD_LEVELS.FACULTY ? 'Faculty level' : 'Department level'}
                  </span>
                </div>
                <p className="mt-0.5 text-sm text-slate-600">
                  {activeTab === BOARD_LEVELS.FACULTY
                    ? 'Faculty-level boards: term, meeting cadence, chairperson, and members.'
                    : 'Department-level boards of studies under your faculties.'}
                </p>
              </div>
            </div>
          </div>
          <div className="max-h-[min(72vh,760px)] overflow-auto">
            <table className="w-full min-w-[800px] table-fixed border-collapse text-left">
              <thead className={`sticky top-0 z-10 border-b border-slate-200/90 ${tabTheme.thead}`}>
                <tr>
                  <th className="w-14 px-4 py-3.5" aria-hidden />
                  <th className="px-4 py-3.5 text-xs font-bold uppercase tracking-wider">Board name</th>
                  <th className="w-[22%] px-4 py-3.5 text-xs font-bold uppercase tracking-wider">Term</th>
                  <th className="w-[18%] px-4 py-3.5 text-xs font-bold uppercase tracking-wider">Meetings</th>
                  <th className="w-[14%] px-4 py-3.5 text-xs font-bold uppercase tracking-wider">Status</th>
                  <th className="w-[20%] px-4 py-3.5 text-right text-xs font-bold uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={6} className="border-b border-slate-100 px-5 py-8 align-top">
                    {searchQuery.trim() ? (
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="text-lg font-semibold text-slate-900">No boards match your search</p>
                          <p className="mt-2 max-w-xl text-base leading-relaxed text-slate-600">
                            Try another name, or clear the filter to see all{' '}
                            {activeTab === BOARD_LEVELS.FACULTY ? 'faculty' : 'department'} boards in this tab.
                          </p>
                        </div>
          <button
                          type="button"
                          onClick={() => setSearchQuery('')}
                          className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl border-2 border-slate-300 bg-white px-5 py-3 text-base font-semibold text-slate-800 hover:bg-slate-50 transition-colors sm:w-auto"
                        >
                          Clear search
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 gap-4">
                          <div
                            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${tabTheme.summaryIcon}`}
                          >
                            {activeTab === BOARD_LEVELS.FACULTY ? (
                              <Building2 className="h-6 w-6" aria-hidden />
                            ) : (
                              <BookOpen className="h-6 w-6" aria-hidden />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-lg font-semibold text-slate-900">
                              {activeTab === BOARD_LEVELS.FACULTY
                                ? 'No Board of Faculty records yet'
                                : 'No Board of Studies records yet'}
                            </p>
                            <p className="mt-2 max-w-xl text-base leading-relaxed text-slate-600">
                              {activeTab === BOARD_LEVELS.FACULTY
                                ? 'Add a faculty board with term and meeting cadence, then attach members.'
                                : 'Add a department board of studies, set term and meetings, then add members.'}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
            onClick={() => setShowForm(true)}
                          className={`inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-base font-semibold text-white shadow-md transition-colors sm:w-auto ${
                            activeTab === BOARD_LEVELS.FACULTY
                              ? 'bg-indigo-700 hover:bg-indigo-800'
                              : 'bg-emerald-700 hover:bg-emerald-800'
                          }`}
                        >
                          <Plus className="h-5 w-5" />
                          Add first board
          </button>
                      </div>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </motion.div>
      ) : (
        <div className={`overflow-hidden rounded-2xl border bg-white ${tabTheme.shell}`}>
          <div className={`flex flex-wrap items-center justify-between gap-3 px-5 py-4 ${tabTheme.summary}`}>
            <div className="flex min-w-0 items-center gap-3">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tabTheme.summaryIcon}`}
              >
                {activeTab === BOARD_LEVELS.FACULTY ? (
                  <Building2 className="h-6 w-6" aria-hidden />
                ) : (
                  <BookOpen className="h-6 w-6" aria-hidden />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-2">
                  <h3 className="truncate text-lg font-bold text-slate-900 sm:text-xl">
                    {activeTab === BOARD_LEVELS.FACULTY ? 'Board of Faculty' : 'Board of Studies'}
                  </h3>
                  <span className="shrink-0 text-base font-semibold text-slate-500">
                    ({filteredBoards.length})
                  </span>
                  <span
                    className={`hidden rounded-full px-2.5 py-0.5 text-xs font-semibold sm:inline-flex ${
                      activeTab === BOARD_LEVELS.FACULTY
                        ? 'bg-indigo-100 text-indigo-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {activeTab === BOARD_LEVELS.FACULTY ? 'Faculty level' : 'Department level'}
                  </span>
                </div>
                <p className="mt-0.5 text-sm text-slate-600">
                  {activeTab === BOARD_LEVELS.FACULTY
                    ? 'Chairperson is taken from the faculty record (dean name).'
                    : 'Boards are tied to a department under the selected faculty.'}
                </p>
              </div>
            </div>
          </div>
          <div className="max-h-[min(72vh,760px)] overflow-auto">
            <table className="w-full min-w-[800px] table-fixed border-collapse text-left">
              <thead className={`sticky top-0 z-10 border-b border-slate-200/90 ${tabTheme.thead}`}>
                <tr>
                  <th className="w-14 px-4 py-3.5" aria-hidden />
                  <th className="px-4 py-3.5 text-xs font-bold uppercase tracking-wider">Board name</th>
                  <th className="w-[22%] px-4 py-3.5 text-xs font-bold uppercase tracking-wider">Term</th>
                  <th className="w-[18%] px-4 py-3.5 text-xs font-bold uppercase tracking-wider">Meetings</th>
                  <th className="w-[14%] px-4 py-3.5 text-xs font-bold uppercase tracking-wider">Status</th>
                  <th className="w-[20%] px-4 py-3.5 text-right text-xs font-bold uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBoards.map((board) => {
            const status = getStatus(board.term_start, board.term_end)
            const StatusIcon = status.icon
                  const TypeIcon = board.board_type === BOARD_TYPES.FACULTY ? Building2 : BookOpen
                  const facultyRow = facultyRelationFromBoard(board)
                  const facultyChairName =
                    board.board_type === BOARD_TYPES.FACULTY
                      ? (facultyRow?.dean_name || '').trim() || board.staff?.full_name || ''
                      : ''

            return (
                    <tr key={board.id} className={`${tabTheme.row} transition-colors`}>
                      <td className="px-4 py-4 align-middle">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                            board.board_type === BOARD_TYPES.FACULTY
                              ? 'bg-indigo-50 text-indigo-700'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          <TypeIcon className="h-5 w-5" aria-hidden />
                  </div>
                      </td>
                      <td className="px-4 py-4 align-middle">
                        <div className="text-base font-semibold leading-snug text-slate-900 line-clamp-2">
                          {board.name}
                        </div>
                        {board.board_type === BOARD_TYPES.FACULTY && facultyChairName && (
                          <div className="mt-1.5 flex items-center gap-1.5 text-sm text-slate-600">
                            <Crown className="h-4 w-4 shrink-0 text-amber-600" />
                            <span className="truncate font-medium">Chair: {facultyChairName}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 align-top text-sm font-medium leading-relaxed text-slate-700">
                        {formatDate(board.term_start)}
                        <span className="mx-1 text-slate-400">–</span>
                        {formatDate(board.term_end)}
                      </td>
                      <td className="px-4 py-4 align-top text-sm font-medium text-slate-700">
                        {board.meeting_frequency}
                      </td>
                      <td className="px-4 py-4 align-top">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${status.color}`}
                        >
                          <StatusIcon className="h-4 w-4 shrink-0" />
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                    <button
                            type="button"
                            onClick={() => handleManageMembers(board)}
                            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-semibold shadow-sm transition-colors ${
                              activeTab === BOARD_LEVELS.FACULTY
                                ? 'border-indigo-200 bg-indigo-50 text-indigo-900 hover:bg-indigo-100'
                                : 'border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100'
                            }`}
                            title="Manage members"
                          >
                            <Users className="h-4 w-4" />
                            Members
                          </button>
                          <button
                            type="button"
                      onClick={() => handleEditBoard(board)}
                            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white p-2.5 text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
                      title="Edit board"
                    >
                            <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                            type="button"
                      onClick={() => handleDeleteBoard(board.id)}
                            className="inline-flex items-center justify-center rounded-xl border border-red-200 bg-red-50 p-2.5 text-red-800 shadow-sm hover:bg-red-100 transition-colors"
                      title="Delete board"
                    >
                            <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Board Modal */}
      <AnimatePresence>
        {showForm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowForm(false)
                setEditingBoard(null)
              }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200">
                {/* Modal Header */}
                <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-3xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-cyan-100 flex items-center justify-center">
                      <Plus className="w-5 h-5 text-cyan-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-900">
                      {editingBoard ? 'Edit' : 'Create'}{' '}
                      {activeTab === BOARD_LEVELS.FACULTY ? BOARD_TYPES.FACULTY : BOARD_TYPES.DEPARTMENT}
                    </h3>
                  </div>
                  <button
                    onClick={() => {
                      setShowForm(false)
                      setEditingBoard(null)
                    }}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-600" />
                  </button>
                </div>

                {/* Modal Content */}
                <div className="p-6">
                  <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Board Name */}
                    <div>
                      <label className="block text-sm font-medium text-slate-900 mb-2">
                        Board Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={boardName}
                        onChange={(e) => setBoardName(e.target.value)}
                        placeholder="e.g., Board of Studies for Computer Science"
                        maxLength={180}
                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm"
                        required
                      />
                    </div>

                    {/* Faculty Selection (Faculty Level) */}
                    {activeTab === BOARD_LEVELS.FACULTY && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-slate-900 mb-2">
                            Select Faculty <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={facultyId}
                            onChange={(e) => setFacultyId(e.target.value)}
                            className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm"
                            required
                          >
                            <option value="">Select Faculty</option>
                            {faculties.map((faculty) => (
                              <option key={faculty.id} value={faculty.id}>
                                {faculty.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-900 mb-2">
                            Dean (Chairperson) <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            readOnly
                            value={facultyId ? selectedFacultyDeanName : ''}
                            placeholder={
                              facultyId
                                ? ''
                                : 'Select a faculty — dean name is filled from the faculty record automatically.'
                            }
                            className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none cursor-default ${
                              facultyId && selectedFacultyDeanName
                                ? 'border-slate-300 bg-slate-50 text-slate-900'
                                : 'border-slate-200 bg-slate-50 text-slate-500 placeholder:text-slate-400'
                            }`}
                            aria-readonly="true"
                          />
                          {facultyId && !selectedFacultyDeanName ? (
                            <p className="mt-1 text-sm text-amber-700">
                              This faculty has no dean name on file. Add it on the faculty record before saving this
                              board.
                            </p>
                          ) : null}
                          {facultyId && selectedFacultyDeanEmail ? (
                            <p className="mt-1 text-xs text-slate-500">{selectedFacultyDeanEmail}</p>
                          ) : null}
                        </div>
                      </>
                    )}

                    {/* Department Selection (Department Level) */}
                    {activeTab === BOARD_LEVELS.DEPARTMENT && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-slate-900 mb-2">
                            Select Faculty <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={facultyId}
                            onChange={(e) => {
                              setFacultyId(e.target.value)
                              setDepartmentId('')
                            }}
                            className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm"
                            required
                          >
                            <option value="">Select Faculty</option>
                            {faculties.map((faculty) => (
                              <option key={faculty.id} value={faculty.id}>
                                {faculty.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-900 mb-2">
                            Select Department <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={departmentId}
                            onChange={(e) => setDepartmentId(e.target.value)}
                            disabled={!facultyId}
                            className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm disabled:bg-slate-100 disabled:cursor-not-allowed"
                            required
                          >
                            <option value="">{facultyId ? 'Select Department' : 'Select Faculty first'}</option>
                            {departments.map((dept) => (
                              <option key={dept.id} value={dept.id}>
                                {dept.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </>
                    )}

                    {/* Term Dates */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-900 mb-2">
                          Term Start <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          value={termStart}
                          onChange={(e) => setTermStart(e.target.value)}
                          className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-900 mb-2">
                          Term End <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          value={termEnd}
                          onChange={(e) => setTermEnd(e.target.value)}
                          className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm"
                          required
                        />
                      </div>
                    </div>

                    {/* Meeting Frequency */}
                    <div>
                      <label className="block text-sm font-medium text-slate-900 mb-2">
                        Meeting Frequency <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={meetingFrequency}
                        onChange={(e) => setMeetingFrequency(e.target.value)}
                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm"
                        required
                      >
                        <option value="">Select Frequency</option>
                        {MEETING_FREQUENCIES.map((freq) => (
                          <option key={freq} value={freq}>
                            {freq}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Submit Button */}
                    <div className="flex gap-4 pt-4">
                      <button
                        type="button"
                        onClick={() => {
                          setShowForm(false)
                          setEditingBoard(null)
                        }}
                        className="flex-1 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={saving}
                        className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {saving ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>Saving...</span>
                          </>
                        ) : (
                          <span>{editingBoard ? 'Update Board' : 'Create Board'}</span>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Manage Members Modal */}
      <AnimatePresence>
        {showMemberModal && selectedBoard && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowMemberModal(false)
                setSelectedBoard(null)
                setBoardMembers([])
                setCustomMemberRole('')
              }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-slate-200">
                {/* Modal Header */}
                <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-3xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-slate-900">Manage Members</h3>
                      <p className="text-sm text-slate-600">{selectedBoard.name}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowMemberModal(false)
                      setSelectedBoard(null)
                      setBoardMembers([])
                      setCustomMemberRole('')
                    }}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-600" />
                  </button>
                </div>

                {/* Compliance Warning */}
                {compliance && !compliance.compliant && (
                  <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <div>
                      <p className="text-sm font-semibold text-red-700">{compliance.message}</p>
                      <p className="text-xs text-red-600">Current: {compliance.count} external expert(s). Required: 2</p>
                    </div>
                  </div>
                )}

                {/* Modal Content */}
                <div className="p-6">
                  {/* Add Member Form */}
                  <form onSubmit={handleAddMember} className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <h4 className="text-sm font-semibold text-slate-900 mb-4">Add New Member</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Full Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={memberName}
                          onChange={(e) => setMemberName(e.target.value)}
                          maxLength={120}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Designation
                        </label>
                        <input
                          type="text"
                          value={memberDesignation}
                          onChange={(e) => setMemberDesignation(e.target.value)}
                          maxLength={120}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Official Seat / Status As Per Act
                        </label>
                        <input
                          type="text"
                          value={memberStatusAsPerAct}
                          onChange={(e) => setMemberStatusAsPerAct(e.target.value)}
                          placeholder="e.g., Nominee of the Commission, Vice Chancellor"
                          maxLength={180}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                        />
                        <p className="mt-1 text-xs text-slate-500 italic">
                          This field helps the U&B Department verify that the board composition follows the University Act.
                        </p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Role <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={memberRole}
                          onChange={(e) => {
                            setMemberRole(e.target.value)
                            if (e.target.value !== OTHER_BOARD_MEMBER_ROLE) {
                              setCustomMemberRole('')
                            }
                          }}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                          required
                        >
                          <option value="">Select Role</option>
                          {MEMBER_ROLES.map((role) => (
                            <option key={role} value={role}>
                              {role}
                            </option>
                          ))}
                          <option value={OTHER_BOARD_MEMBER_ROLE}>Other (type your own)</option>
                        </select>
                        {memberRole === OTHER_BOARD_MEMBER_ROLE && (
                          <input
                            type="text"
                            value={customMemberRole}
                            onChange={(e) => setCustomMemberRole(e.target.value)}
                            placeholder="Enter role (e.g., Co-opted member, Observer)"
                            maxLength={120}
                            className="mt-2 w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                          />
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Member Type <span className="text-red-500">*</span>
                        </label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setMemberType('Internal')
                              setMemberAffiliation('')
                            }}
                            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                              memberType === 'Internal'
                                ? 'bg-blue-600 text-white'
                                : 'bg-white text-slate-700 border border-slate-300'
                            }`}
                          >
                            Internal
                          </button>
                          <button
                            type="button"
                            onClick={() => setMemberType('External')}
                            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                              memberType === 'External'
                                ? 'bg-blue-600 text-white'
                                : 'bg-white text-slate-700 border border-slate-300'
                            }`}
                          >
                            External
                          </button>
                        </div>
                      </div>
                      {memberType === 'External' && (
                        <div className="md:col-span-2">
                          <label className="block text-xs font-medium text-slate-700 mb-1">
                            Affiliation <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={memberAffiliation}
                            onChange={(e) => setMemberAffiliation(e.target.value)}
                            placeholder="e.g., IBA Sukkur, Google"
                            maxLength={120}
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                            required={memberType === 'External'}
                          />
                        </div>
                      )}
                      <div className="md:col-span-2">
                        <button
                          type="submit"
                          disabled={saving}
                          className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {saving ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Adding...</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-4 h-4" />
                              <span>Add Member</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </form>

                  {/* Members List */}
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 mb-4">Current Members ({boardMembers.length})</h4>
                    {boardMembers.length === 0 ? (
                      <p className="text-sm text-slate-500 text-center py-8">No members added yet</p>
                    ) : (
                      <div className="space-y-3">
                        {boardMembers.map((member) => (
                          <div
                            key={member.id}
                            className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                member.member_type === 'Internal' ? 'bg-blue-100' : 'bg-violet-100'
                              }`}>
                                {member.member_type === 'Internal' ? (
                                  <Building2 className="w-5 h-5 text-blue-600" />
                                ) : (
                                  <Globe className="w-5 h-5 text-violet-600" />
                                )}
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-slate-900">{member.full_name}</p>
                                {member.designation && (
                                  <p className="text-xs text-slate-600">{member.designation}</p>
                                )}
                                {member.status_as_per_act && (
                                  <p className="text-xs text-slate-500 italic mt-1">
                                    {member.status_as_per_act}
                                  </p>
                                )}
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                  <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-700 rounded">
                                    {member.role}
                                  </span>
                                  <span className={`text-xs px-2 py-0.5 rounded ${
                                    member.member_type === 'Internal'
                                      ? 'bg-blue-100 text-blue-700'
                                      : 'bg-violet-100 text-violet-700'
                                  }`}>
                                    {member.member_type}
                                  </span>
                                  {member.affiliation && (
                                    <span className="text-xs text-slate-500">
                                      • {member.affiliation}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => handleDeleteMember(member.id)}
                              className="p-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-all"
                              title="Remove member"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className={`fixed bottom-4 right-4 px-6 py-4 rounded-lg shadow-lg z-50 ${
            toast.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'
          } text-white`}
        >
          {toast.message}
        </motion.div>
      )}
      </UfpAdminPageWide>
    </UfpAdminShell>
  )
}

export default BoardManagement
