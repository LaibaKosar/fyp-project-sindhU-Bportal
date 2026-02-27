import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabaseClient'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { 
  Trash2, 
  Plus, 
  Loader2,
  X,
  ArrowLeft,
  BookOpen,
  MapPin,
  GraduationCap
} from 'lucide-react'
import Breadcrumbs from '../components/Breadcrumbs'

// Map Degree Level (UI label) to PROGRAM_CATEGORIES key
const DEGREE_LEVEL_TO_KEY = {
  'Undergraduate': 'undergraduate',
  'Graduate (MS/M.Phil)': 'graduate',
  'Postgraduate (PhD)': 'postgraduate'
}

// Program Categories and Programs by degree level
const PROGRAM_CATEGORIES = {
  'Engineering': {
    undergraduate: [
      'BE Electrical',
      'BE Mechanical',
      'BE Civil',
      'BE Software',
      'BE Mechatronics',
      'BE Chemical',
      'BE Petroleum'
    ],
    graduate: [
      'ME Renewable Energy',
      'ME Electrical Engineering'
    ],
    postgraduate: []
  },
  'Medicine & Health': {
    undergraduate: [
      'MBBS',
      'BDS',
      'Pharm-D',
      'DPT',
      'BS Nursing',
      'BS Medical Technology',
      'BS Radiography'
    ],
    graduate: [],
    postgraduate: []
  },
  'Computer Science': {
    undergraduate: [
      'BS Computer Science',
      'BS Software Engineering',
      'BS AI',
      'BS Data Science',
      'BS Cyber Security'
    ],
    graduate: ['MS Computer Science'],
    postgraduate: ['PhD Computer Science']
  },
  'Business / Management': {
    undergraduate: [
      'BBA',
      'BS Accounting & Finance',
      'BS Supply Chain'
    ],
    graduate: [
      'MBA (2 Years)',
      'MS Management Sciences'
    ],
    postgraduate: ['PhD Management Sciences']
  },
  'Education': {
    undergraduate: [
      'B.Ed (Hons) 4-Year',
      'B.Ed 1.5-Year',
      'B.Ed 2.5-Year',
      'ADE (Associate Degree in Education)'
    ],
    graduate: ['MS Education'],
    postgraduate: ['PhD Education']
  },
  'Social Sciences': {
    undergraduate: [
      'BS Psychology',
      'BS International Relations',
      'BS Sociology',
      'BS English',
      'LLB (5-Year)'
    ],
    graduate: [],
    postgraduate: []
  },
  'Basic Sciences': {
    undergraduate: [
      'BS Mathematics',
      'BS Physics',
      'BS Chemistry',
      'BS Microbiology',
      'BS Biotechnology'
    ],
    graduate: [],
    postgraduate: []
  }
}

// Degree Levels
const DEGREE_LEVELS = [
  'Undergraduate',
  'Graduate (MS/M.Phil)',
  'Postgraduate (PhD)'
]

// Duration Options (Years)
const DURATION_OPTIONS = [1, 1.5, 2, 2.5, 3, 3.5, 4, 5]

function ProgramManagement() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const campusId = searchParams.get('campusId')
  const departmentIdParam = searchParams.get('departmentId')
  const returnTo = searchParams.get('returnTo')
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState(null)
  const [programs, setPrograms] = useState([])
  const [campuses, setCampuses] = useState([])
  const [faculties, setFaculties] = useState([])
  const [departments, setDepartments] = useState([])
  const [toast, setToast] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [campusName, setCampusName] = useState(null)

  // Form state
  const [selectedCampusId, setSelectedCampusId] = useState(campusId || '')
  const [facultyId, setFacultyId] = useState('')
  const [departmentId, setDepartmentId] = useState(departmentIdParam || '')
  const [category, setCategory] = useState('')
  const [programName, setProgramName] = useState('')
  const [degreeLevel, setDegreeLevel] = useState('Undergraduate')
  const [duration, setDuration] = useState(4)
  const [totalCreditHours, setTotalCreditHours] = useState('')

  // Get available programs based on selected category and degree level
  const levelKey = DEGREE_LEVEL_TO_KEY[degreeLevel]
  const availablePrograms = category && levelKey && PROGRAM_CATEGORIES[category]
    ? (PROGRAM_CATEGORIES[category][levelKey] || [])
    : []

  useEffect(() => {
    loadUserData()
  }, [])

  useEffect(() => {
    if (user?.university_id) {
      if (campusId) {
        setSelectedCampusId(campusId)
        fetchCampusName()
        fetchFaculties()
        if (departmentIdParam) {
          fetchDepartmentDetails()
        }
      } else {
        fetchCampuses()
      }
      fetchPrograms()
    }
  }, [user, campusId, departmentIdParam])

  useEffect(() => {
    if (selectedCampusId) {
      fetchFaculties()
      // Reset selections when campus changes
      setFacultyId('')
      setDepartmentId('')
      setDepartments([])
    } else {
      setFaculties([])
      setDepartments([])
    }
  }, [selectedCampusId])

  useEffect(() => {
    if (facultyId && selectedCampusId) {
      fetchDepartments()
    } else {
      setDepartmentId('')
      setDepartments([])
    }
  }, [facultyId, selectedCampusId])

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

  const fetchCampuses = async () => {
    if (!user?.university_id) return

    try {
      const { data, error } = await supabase
        .from('campuses')
        .select('id, name')
        .eq('university_id', user.university_id)
        .order('name', { ascending: true })

      if (error) throw error
      setCampuses(data || [])
    } catch (error) {
      console.error('Error fetching campuses:', error)
    }
  }

  const fetchCampusName = async () => {
    if (!campusId || !user?.university_id) return

    try {
      const { data, error } = await supabase
        .from('campuses')
        .select('name')
        .eq('id', campusId)
        .eq('university_id', user.university_id)
        .single()

      if (error) throw error
      setCampusName(data?.name || null)
    } catch (error) {
      console.error('Error fetching campus name:', error)
    }
  }

  const fetchFaculties = async () => {
    if (!user?.university_id || !selectedCampusId) return

    try {
      const { data, error } = await supabase
        .from('faculties')
        .select('id, name')
        .eq('university_id', user.university_id)
        .eq('campus_id', selectedCampusId)
        .order('name', { ascending: true })

      if (error) throw error
      setFaculties(data || [])
    } catch (error) {
      console.error('Error fetching faculties:', error)
    }
  }

  const fetchDepartments = async () => {
    if (!user?.university_id || !selectedCampusId || !facultyId) return

    try {
      const { data, error } = await supabase
        .from('departments')
        .select('id, name')
        .eq('university_id', user.university_id)
        .eq('campus_id', selectedCampusId)
        .eq('faculty_id', facultyId)
        .order('name', { ascending: true })

      if (error) throw error
      setDepartments(data || [])
    } catch (error) {
      console.error('Error fetching departments:', error)
    }
  }

  const fetchDepartmentDetails = async () => {
    if (!departmentIdParam || !user?.university_id) return

    try {
      const { data, error } = await supabase
        .from('departments')
        .select('id, name, faculty_id')
        .eq('id', departmentIdParam)
        .eq('university_id', user.university_id)
        .single()

      if (error) throw error
      
      if (data) {
        setDepartmentId(data.id)
        setFacultyId(data.faculty_id)
        // Fetch faculties for this campus to ensure dropdown is populated
        if (selectedCampusId) {
          fetchFaculties()
        }
      }
    } catch (error) {
      console.error('Error fetching department details:', error)
    }
  }

  const fetchPrograms = async () => {
    if (!user?.university_id) return

    try {
      let query = supabase
        .from('programs')
        .select('*, campuses:campus_id(name), departments:department_id(name)')
        .eq('university_id', user.university_id)

      if (campusId) {
        query = query.eq('campus_id', campusId)
      }

      if (departmentIdParam) {
        query = query.eq('department_id', departmentIdParam)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error
      setPrograms(data || [])
    } catch (error) {
      console.error('Error fetching programs:', error)
      showToast('Error loading programs: ' + error.message, 'error')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!user?.university_id) {
      showToast('University ID not found. Please log in again.', 'error')
      return
    }

    if (!selectedCampusId) {
      showToast('Please select a campus', 'error')
      return
    }

    if (!facultyId || !departmentId) {
      showToast('Please select faculty and department', 'error')
      return
    }

    if (!category || !programName) {
      showToast('Please select category and program', 'error')
      return
    }

    if (!degreeLevel || !duration || !totalCreditHours) {
      showToast('Please fill in all required fields', 'error')
      return
    }

    setSaving(true)

    try {
      const programData = {
        university_id: user.university_id,
        campus_id: selectedCampusId,
        faculty_id: facultyId,
        department_id: departmentId,
        name: programName,
        category: category,
        degree_level: degreeLevel,
        duration_years: duration,
        total_credit_hours: parseInt(totalCreditHours) || null
      }

      const { data, error } = await supabase
        .from('programs')
        .insert(programData)
        .select()
        .single()

      if (error) throw error

      showToast('Program added successfully!', 'success')
      
      // Clear form
      setCategory('')
      setProgramName('')
      setDegreeLevel('Undergraduate')
      setDuration(4)
      setTotalCreditHours('')
      
      await fetchPrograms()
      setShowForm(false)

      if (returnTo === 'department' && selectedCampusId && facultyId && departmentId) {
        navigate(`/ufp/campus/${selectedCampusId}/faculty/${facultyId}/department/${departmentId}`)
      }
    } catch (error) {
      console.error('Error saving program:', error)
      showToast(error.message || 'Error saving program', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (programId) => {
    if (!confirm('Are you sure you want to delete this program? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('programs')
        .delete()
        .eq('id', programId)

      if (error) throw error

      await fetchPrograms()
      showToast('Program deleted successfully', 'success')
    } catch (error) {
      console.error('Error deleting program:', error)
      showToast(error.message || 'Error deleting program', 'error')
    }
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
            { label: 'Program Management' }
          ]}
          className="text-white/80 mb-2"
        />

        {/* Header */}
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Program Management</h2>
          <p className="text-white/90">
            {campusId ? `Manage programs for ${campusName || 'this campus'}` : 'Manage your university programs'}
          </p>
        </div>
      </motion.div>

      {/* Gallery Grid */}
      {programs.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-16 border border-slate-100 text-center max-w-2xl mx-auto"
        >
          <BookOpen className="w-24 h-24 mx-auto mb-6 text-slate-300" />
          <h3 className="text-2xl font-bold text-slate-900 mb-3">No Programs Yet</h3>
          <p className="text-slate-600 mb-8 text-lg">Get started by adding your first program.</p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-8 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-full font-semibold transition-all shadow-md hover:shadow-lg text-lg"
          >
            <Plus className="w-6 h-6" />
            <span>Add First Program</span>
          </button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 justify-items-center">
          {/* Quick Add Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            onClick={() => setShowForm(true)}
            className="bg-white rounded-3xl shadow-xl shadow-blue-900/10 border-x border-b border-slate-200 border-t-[8px] border-t-blue-600 p-6 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col items-center justify-center min-h-[280px] max-w-[380px] w-full"
          >
            <div className="w-20 h-20 rounded-full bg-cyan-100 flex items-center justify-center mb-4">
              <Plus className="w-10 h-10 text-cyan-600" />
            </div>
            <button className="px-8 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-full font-semibold transition-all shadow-md hover:shadow-lg">
              Add Program
            </button>
          </motion.div>

          {/* Program Cards */}
          {programs.map((program, index) => (
            <motion.div
              key={program.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: (index + 1) * 0.1 }}
              className="bg-white rounded-3xl shadow-xl shadow-blue-900/10 border-x border-b border-slate-200 border-t-[8px] border-t-blue-600 p-8 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 relative max-w-[380px] w-full flex flex-col items-center text-center"
            >
              {/* Campus Location Badge (Only in Global View) */}
              {!campusId && program.campuses && program.campuses.name && (
                <div className="absolute top-4 left-4 px-3 py-1 bg-cyan-100 text-cyan-700 text-xs font-semibold rounded-full flex items-center gap-1 z-10">
                  <MapPin className="w-3 h-3" />
                  <span>{program.campuses.name}</span>
                </div>
              )}

              {/* Delete Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleDelete(program.id)
                }}
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-slate-900 hover:bg-red-600 hover:scale-110 flex items-center justify-center shadow-md transition-all duration-200 z-10"
                title="Delete program"
              >
                <Trash2 className="w-[18px] h-[18px] text-white" />
              </button>

              {/* Program Icon */}
              <div className="mb-6">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center mx-auto shadow-lg">
                  <GraduationCap className="w-10 h-10 text-white" />
                </div>
              </div>

              {/* Program Info */}
              <div className="text-center w-full">
                <h3 className="text-lg font-bold text-slate-900 mb-2 line-clamp-2">
                  {program.name}
                </h3>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                    {program.degree_level}
                  </span>
                </div>
                <p className="text-sm text-slate-600 mb-2">
                  Duration: {program.duration_years} {program.duration_years === 1 ? 'Year' : 'Years'}
                </p>
                {program.total_credit_hours && (
                  <p className="text-xs text-slate-500 mb-2">
                    {program.total_credit_hours} Credit Hours
                  </p>
                )}
                {program.departments && program.departments.name && (
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <p className="text-xs text-slate-500 mb-1">Department</p>
                    <p className="text-sm font-semibold text-slate-700">{program.departments.name}</p>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal Form */}
      <AnimatePresence>
        {showForm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowForm(false)}
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
                    <h3 className="text-xl font-semibold text-slate-900">Add New Program</h3>
                  </div>
                  <button
                    onClick={() => setShowForm(false)}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-600" />
                  </button>
                </div>

                {/* Modal Content */}
                <div className="p-6">
                  <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Campus Selection (Locked if campusId exists) */}
                    <div>
                      <label className="block text-sm font-medium text-slate-900 mb-2">
                        Select Campus <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={selectedCampusId}
                        onChange={(e) => setSelectedCampusId(e.target.value)}
                        disabled={!!campusId}
                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm disabled:bg-slate-100 disabled:cursor-not-allowed"
                        required
                      >
                        <option value="">Select Campus</option>
                        {campuses.map((campus) => (
                          <option key={campus.id} value={campus.id}>
                            {campus.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Faculty Selection */}
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
                        disabled={!selectedCampusId || !!departmentIdParam}
                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm disabled:bg-slate-100 disabled:cursor-not-allowed"
                        required
                      >
                        <option value="">{selectedCampusId ? 'Select Faculty' : 'Select Campus first'}</option>
                        {faculties.map((faculty) => (
                          <option key={faculty.id} value={faculty.id}>
                            {faculty.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Department Selection (Locked if departmentIdParam exists) */}
                    <div>
                      <label className="block text-sm font-medium text-slate-900 mb-2">
                        Select Department <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={departmentId}
                        onChange={(e) => setDepartmentId(e.target.value)}
                        disabled={!facultyId || !!departmentIdParam}
                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm disabled:bg-slate-100 disabled:cursor-not-allowed"
                        required
                      >
                        <option value="">{facultyId ? (departmentIdParam ? 'Department pre-selected' : 'Select Department') : 'Select Faculty first'}</option>
                        {departments.map((dept) => (
                          <option key={dept.id} value={dept.id}>
                            {dept.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Category Selection */}
                    <div>
                      <label className="block text-sm font-medium text-slate-900 mb-2">
                        Program Category <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={category}
                        onChange={(e) => {
                          setCategory(e.target.value)
                          setProgramName('')
                        }}
                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm"
                        required
                      >
                        <option value="">Select Category</option>
                        {Object.keys(PROGRAM_CATEGORIES).map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Degree Level - above Program Name so options filter correctly */}
                    <div>
                      <label className="block text-sm font-medium text-slate-900 mb-2">
                        Degree Level <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={degreeLevel}
                        onChange={(e) => {
                          setDegreeLevel(e.target.value)
                          setProgramName('')
                        }}
                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm"
                        required
                      >
                        {DEGREE_LEVELS.map((level) => (
                          <option key={level} value={level}>
                            {level}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Program Name Selection - filtered by category and degree level */}
                    <div>
                      <label className="block text-sm font-medium text-slate-900 mb-2">
                        Program Name <span className="text-red-500">*</span>
                      </label>
                      {!category ? (
                        <div className="w-full px-4 py-2.5 bg-slate-100 border border-slate-300 rounded-lg text-slate-500 text-sm">
                          Please select a category first
                        </div>
                      ) : (
                        <select
                          value={programName}
                          onChange={(e) => setProgramName(e.target.value)}
                          className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm"
                          required
                        >
                          <option value="">Select Program</option>
                          {availablePrograms.map((prog) => (
                            <option key={prog} value={prog}>
                              {prog}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* Duration and Credit Hours */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-900 mb-2">
                          Duration (Years) <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={duration}
                          onChange={(e) => setDuration(parseFloat(e.target.value))}
                          className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm"
                          required
                        >
                          {DURATION_OPTIONS.map((years) => (
                            <option key={years} value={years}>
                              {years} {years === 1 ? 'Year' : 'Years'}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-900 mb-2">
                          Total Credit Hours <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          value={totalCreditHours}
                          onChange={(e) => setTotalCreditHours(e.target.value)}
                          placeholder="e.g., 130"
                          min="0"
                          className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm"
                          required
                        />
                      </div>
                    </div>

                    {/* Submit Button */}
                    <div className="flex gap-4 pt-4">
                      <button
                        type="button"
                        onClick={() => setShowForm(false)}
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
                          <span>Save Program</span>
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

export default ProgramManagement
