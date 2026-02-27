import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabaseClient'
import { useNavigate } from 'react-router-dom'
import { 
  Trash2, 
  Plus, 
  Loader2,
  X,
  ArrowLeft,
  Users,
  Building2,
  Globe,
  Search,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Calendar,
  Clock,
  Edit2,
  Crown,
  User
} from 'lucide-react'
import Breadcrumbs from '../components/Breadcrumbs'

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

function BoardManagement() {
  const navigate = useNavigate()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState(null)
  const [boards, setBoards] = useState([])
  const [filteredBoards, setFilteredBoards] = useState([])
  const [faculties, setFaculties] = useState([])
  const [departments, setDepartments] = useState([])
  const [deans, setDeans] = useState([])
  const [toast, setToast] = useState(null)
  const [deanNotFoundWarning, setDeanNotFoundWarning] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [showMemberModal, setShowMemberModal] = useState(false)
  const [selectedBoard, setSelectedBoard] = useState(null)
  const [boardMembers, setBoardMembers] = useState([])
  const [activeTab, setActiveTab] = useState(BOARD_LEVELS.UNIVERSITY)
  const [editingBoard, setEditingBoard] = useState(null)

  // Form state
  const [boardName, setBoardName] = useState('')
  const [termStart, setTermStart] = useState('')
  const [termEnd, setTermEnd] = useState('')
  const [meetingFrequency, setMeetingFrequency] = useState('')
  const [facultyId, setFacultyId] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [deanId, setDeanId] = useState('')

  // Member form state
  const [memberName, setMemberName] = useState('')
  const [memberDesignation, setMemberDesignation] = useState('')
  const [memberRole, setMemberRole] = useState('')
  const [memberType, setMemberType] = useState('Internal')
  const [memberAffiliation, setMemberAffiliation] = useState('')
  const [memberStatusAsPerAct, setMemberStatusAsPerAct] = useState('')

  // Filter state
  const [searchQuery, setSearchQuery] = useState('')

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
      if (activeTab === BOARD_LEVELS.FACULTY) {
        fetchDeans()
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
        .select('*, staff:dean_id(full_name, academic_designation, administrative_role)')
        .eq('university_id', user.university_id)

      // Filter by board level
      if (activeTab === BOARD_LEVELS.UNIVERSITY) {
        query = query.eq('board_type', BOARD_TYPES.UNIVERSITY)
      } else if (activeTab === BOARD_LEVELS.FACULTY) {
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
        .select('id, name, dean_id')
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

  const fetchDeans = async () => {
    if (!user?.university_id) return

    try {
      // Fetch staff who are Deans or Professors
      const { data, error } = await supabase
        .from('staff')
        .select('id, full_name, academic_designation, administrative_role')
        .eq('university_id', user.university_id)
        .eq('type', 'Teaching')
        .or('administrative_role.eq.Dean,academic_designation.eq.Professor')
        .order('full_name', { ascending: true })

      if (error) throw error
      setDeans(data || [])
    } catch (error) {
      console.error('Error fetching deans:', error)
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

    if (new Date(termEnd) < new Date(termStart)) {
      showToast('Term end date must be after term start date', 'error')
      return
    }

    if (activeTab === BOARD_LEVELS.FACULTY && !facultyId) {
      showToast('Please select a faculty', 'error')
      return
    }

    // Dean is required only when creating a new Faculty board, not when editing
    if (activeTab === BOARD_LEVELS.FACULTY && !deanId && !editingBoard) {
      showToast('Please select a Dean (Chairperson)', 'error')
      return
    }

    if (activeTab === BOARD_LEVELS.DEPARTMENT && !departmentId) {
      showToast('Please select a department', 'error')
      return
    }

    setSaving(true)

    try {
      const boardData = {
        university_id: user.university_id,
        name: boardName,
        board_type: activeTab === BOARD_LEVELS.UNIVERSITY ? BOARD_TYPES.UNIVERSITY :
                   activeTab === BOARD_LEVELS.FACULTY ? BOARD_TYPES.FACULTY :
                   BOARD_TYPES.DEPARTMENT,
        term_start: termStart,
        term_end: termEnd,
        meeting_frequency: meetingFrequency
      }

      if (activeTab === BOARD_LEVELS.FACULTY) {
        boardData.faculty_id = facultyId
        boardData.dean_id = deanId
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
          showToast('Board updated successfully!', 'success')
        }
      } else {
        // Create new board
        const { error: insertError } = await supabase
          .from('university_boards')
          .insert([boardData])

        error = insertError
        if (!error) {
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
      setDeanId('')
      setEditingBoard(null)
      setDeanNotFoundWarning(false)
      
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

    if (!memberName || !memberRole) {
      showToast('Please fill in all required fields', 'error')
      return
    }

    if (memberType === 'External' && !memberAffiliation) {
      showToast('Please provide affiliation for external members', 'error')
      return
    }

    setSaving(true)

    try {
      const memberData = {
        board_id: selectedBoard.id,
        full_name: memberName,
        designation: memberDesignation || null,
        role: memberRole,
        member_type: memberType,
        affiliation: memberType === 'External' ? memberAffiliation : null,
        status_as_per_act: memberStatusAsPerAct || null
      }

      const { error } = await supabase
        .from('board_members')
        .insert([memberData])

      if (error) throw error

      showToast('Member added successfully!', 'success')
      
      // Clear form
      setMemberName('')
      setMemberDesignation('')
      setMemberRole('')
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
    setDeanId(board.dean_id || '')
    setDeanNotFoundWarning(false)
    
    // Set the active tab to match the board type
    if (board.board_type === BOARD_TYPES.UNIVERSITY) {
      setActiveTab(BOARD_LEVELS.UNIVERSITY)
    } else if (board.board_type === BOARD_TYPES.FACULTY) {
      setActiveTab(BOARD_LEVELS.FACULTY)
      if (board.faculty_id) {
        await fetchFaculties()
        await fetchDeans()
        
        // Auto-lookup dean_id from faculty record
        try {
          const { data: facultyData, error: facultyError } = await supabase
            .from('faculties')
            .select('dean_id')
            .eq('id', board.faculty_id)
            .single()
          
          if (!facultyError && facultyData?.dean_id) {
            // Check if this dean exists in staff table
            const { data: staffData, error: staffError } = await supabase
              .from('staff')
              .select('id, full_name')
              .eq('id', facultyData.dean_id)
              .single()
            
            if (!staffError && staffData) {
              // Dean found in staff table, set it
              setDeanId(facultyData.dean_id)
            } else {
              // Dean ID exists in faculty but not found in staff table
              setDeanNotFoundWarning(true)
              setDeanId('')
            }
          }
        } catch (error) {
          console.error('Error fetching faculty dean:', error)
        }
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
      const { error } = await supabase
        .from('board_members')
        .delete()
        .eq('id', memberId)

      if (error) throw error

      await fetchBoardMembers()
      showToast('Member removed successfully', 'success')
    } catch (error) {
      console.error('Error deleting member:', error)
      showToast(error.message || 'Error removing member', 'error')
    }
  }

  const handleManageMembers = (board) => {
    setSelectedBoard(board)
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
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-800/10 to-[#f8fafc] flex items-center justify-center">
        <div className="text-cyan-600 text-xl">Loading...</div>
      </div>
    )
  }

  const compliance = selectedBoard ? checkCompliance(selectedBoard) : null

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
            { label: 'Board Management' }
          ]}
          className="text-white/80 mb-2"
        />

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">Board Management</h2>
            <p className="text-white/90">
              Manage statutory academic boards and committees
            </p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-full font-semibold transition-all shadow-lg"
          >
            <Plus className="w-5 h-5" />
            <span>Add Board</span>
          </button>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-lg p-2 mb-6 border border-slate-200 flex gap-2">
        {Object.values(BOARD_LEVELS).map((level) => (
          <button
            key={level}
            onClick={() => {
              setActiveTab(level)
              setSearchQuery('')
            }}
            className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all ${
              activeTab === level
                ? 'bg-slate-900 text-white shadow-md'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {level}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-slate-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search boards by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
          />
        </div>
      </div>

      {/* Boards Grid */}
      {filteredBoards.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-16 border border-slate-100 text-center max-w-2xl mx-auto"
        >
          <Building2 className="w-24 h-24 mx-auto mb-6 text-slate-300" />
          <h3 className="text-2xl font-bold text-slate-900 mb-3">No Boards Found</h3>
          <p className="text-slate-600 mb-8 text-lg">
            Get started by creating your first {activeTab === BOARD_LEVELS.UNIVERSITY ? BOARD_TYPES.UNIVERSITY :
            activeTab === BOARD_LEVELS.FACULTY ? BOARD_TYPES.FACULTY :
            BOARD_TYPES.DEPARTMENT} board.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-8 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-full font-semibold transition-all shadow-md hover:shadow-lg text-lg"
          >
            <Plus className="w-6 h-6" />
            <span>Add First Board</span>
          </button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBoards.map((board, index) => {
            const status = getStatus(board.term_start, board.term_end)
            const StatusIcon = status.icon

            return (
              <motion.div
                key={board.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 hover:shadow-xl transition-all flex flex-col"
              >
                {/* Status Badge */}
                <div className={`flex items-center justify-between mb-4`}>
                  <div className={`px-3 py-1 text-xs font-semibold rounded-full flex items-center gap-1 ${status.color}`}>
                    <StatusIcon className="w-3 h-3" />
                    <span>{status.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEditBoard(board)}
                      className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-all"
                      title="Edit board"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteBoard(board.id)}
                      className="p-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-all"
                      title="Delete board"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Board Name */}
                <h3 className="text-xl font-bold text-slate-900 mb-3 line-clamp-2">
                  {board.name}
                </h3>

                {/* Dean Display (Board of Faculty only) */}
                {board.board_type === BOARD_TYPES.FACULTY && board.staff && board.staff.full_name && (
                  <div className="mb-3 pb-3 border-b border-slate-200">
                    <div className="flex items-center gap-2 text-sm text-slate-700">
                      <Crown className="w-4 h-4 text-amber-600" />
                      <span className="font-semibold">Chairperson/Dean:</span>
                      <span className="text-slate-900">{board.staff.full_name}</span>
                    </div>
                  </div>
                )}

                {/* Term Dates */}
                <div className="mb-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Calendar className="w-4 h-4" />
                    <span>Term: {formatDate(board.term_start)} - {formatDate(board.term_end)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Clock className="w-4 h-4" />
                    <span>Meets: {board.meeting_frequency}</span>
                  </div>
                </div>

                {/* Actions */}
                <button
                  onClick={() => handleManageMembers(board)}
                  className="mt-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2"
                >
                  <Users className="w-4 h-4" />
                  <span>Manage Members</span>
                </button>
              </motion.div>
            )
          })}
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
                      {editingBoard ? 'Edit' : 'Create'} {activeTab === BOARD_LEVELS.UNIVERSITY ? BOARD_TYPES.UNIVERSITY :
                             activeTab === BOARD_LEVELS.FACULTY ? BOARD_TYPES.FACULTY :
                             BOARD_TYPES.DEPARTMENT}
                    </h3>
                  </div>
                  <button
                    onClick={() => {
                      setShowForm(false)
                      setEditingBoard(null)
                      setDeanNotFoundWarning(false)
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
                            onChange={(e) => {
                              const selectedFacultyId = e.target.value
                              setFacultyId(selectedFacultyId)
                              
                              // Auto-lookup dean_id from selected faculty
                              if (selectedFacultyId) {
                                const selectedFaculty = faculties.find(f => f.id === selectedFacultyId)
                                if (selectedFaculty?.dean_id) {
                                  setDeanId(selectedFaculty.dean_id)
                                } else {
                                  setDeanId('')
                                }
                              } else {
                                setDeanId('')
                              }
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
                            Select Dean (Chairperson) {!editingBoard && <span className="text-red-500">*</span>}
                          </label>
                          <select
                            value={deanId}
                            onChange={(e) => setDeanId(e.target.value)}
                            className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm"
                            required={!editingBoard}
                          >
                            <option value="">Select Dean</option>
                            {deans.map((dean) => (
                              <option key={dean.id} value={dean.id}>
                                {dean.full_name} {dean.administrative_role === 'Dean' ? '(Dean)' : dean.academic_designation === 'Professor' ? '(Professor)' : ''}
                              </option>
                            ))}
                          </select>
                          {(() => {
                            if (editingBoard && deanNotFoundWarning) {
                              return (
                                <p className="mt-1 text-xs text-amber-600 font-medium">
                                  ⚠ Dean name not found in Staff records.
                                </p>
                              )
                            }
                            if (editingBoard && !deanId && !deanNotFoundWarning) {
                              return (
                                <p className="mt-1 text-xs text-slate-500 italic">
                                  You can retroactively assign a Dean to this board.
                                </p>
                              )
                            }
                            if (!editingBoard && facultyId) {
                              const selectedFaculty = faculties.find(f => f.id === facultyId)
                              if (selectedFaculty?.dean_id && deanId === selectedFaculty.dean_id) {
                                return (
                                  <p className="mt-1 text-xs text-green-600 font-medium">
                                    ✓ Official Dean identified from Faculty records.
                                  </p>
                                )
                              } else if (selectedFaculty && !selectedFaculty.dean_id) {
                                return (
                                  <p className="mt-1 text-xs text-amber-600 font-medium">
                                    ⚠ Please assign a Dean to this Faculty first.
                                  </p>
                                )
                              }
                            }
                            return null
                          })()}
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
                          setDeanNotFoundWarning(false)
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
                          onChange={(e) => setMemberRole(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                          required
                        >
                          <option value="">Select Role</option>
                          {MEMBER_ROLES.map((role) => (
                            <option key={role} value={role}>
                              {role}
                            </option>
                          ))}
                        </select>
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
    </div>
  )
}

export default BoardManagement
