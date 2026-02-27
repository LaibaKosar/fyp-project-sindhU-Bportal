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
  UsersRound,
  MapPin,
  TrendingUp
} from 'lucide-react'
import Breadcrumbs from '../components/Breadcrumbs'

// Academic Years (2024-2030)
const ACADEMIC_YEARS = [
  '2024-2025',
  '2025-2026',
  '2026-2027',
  '2027-2028',
  '2028-2029',
  '2029-2030',
  '2030-2031'
]

// Semesters
const SEMESTERS = ['Fall', 'Spring', 'Summer']

function StudentEnrollment() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const campusId = searchParams.get('campusId')
  const programIdParam = searchParams.get('programId')
  const returnTo = searchParams.get('returnTo')
  const returnCampusId = searchParams.get('returnCampusId')
  const returnFacultyId = searchParams.get('returnFacultyId')
  const returnDeptId = searchParams.get('returnDeptId')
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState(null)
  const [enrollments, setEnrollments] = useState([])
  const [campuses, setCampuses] = useState([])
  const [programs, setPrograms] = useState([])
  const [toast, setToast] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [campusName, setCampusName] = useState(null)

  // Form state (programId pre-filled from URL when opening from Department Detail)
  const [selectedCampusId, setSelectedCampusId] = useState(campusId || '')
  const [programId, setProgramId] = useState(programIdParam || '')
  const [academicYear, setAcademicYear] = useState('')
  const [semester, setSemester] = useState('')
  const [maleStudents, setMaleStudents] = useState('')
  const [femaleStudents, setFemaleStudents] = useState('')
  const [newAdmissions, setNewAdmissions] = useState('')

  useEffect(() => {
    loadUserData()
  }, [])

  useEffect(() => {
    if (user?.university_id) {
      if (campusId) {
        setSelectedCampusId(campusId)
        fetchCampusName()
        fetchPrograms()
      } else {
        fetchCampuses()
      }
      fetchEnrollments()
    }
  }, [user, campusId, programIdParam, returnDeptId])

  useEffect(() => {
    if (selectedCampusId || returnDeptId) {
      fetchPrograms()
    } else {
      setPrograms([])
    }
  }, [selectedCampusId, returnDeptId])

  useEffect(() => {
    if (programIdParam) setProgramId(programIdParam)
  }, [programIdParam])

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

  const fetchPrograms = async () => {
    if (!user?.university_id || !selectedCampusId) return

    try {
      const { data, error } = await supabase
        .from('programs')
        .select('id, name')
        .eq('university_id', user.university_id)
        .eq('campus_id', selectedCampusId)
        .order('name', { ascending: true })

      if (error) throw error
      setPrograms(data || [])
    } catch (error) {
      console.error('Error fetching programs:', error)
    }
  }

  const fetchEnrollments = async () => {
    if (!user?.university_id) return

    try {
      let query = supabase
        .from('enrollment_reports')
        .select('*, programs:program_id(name), campuses:campus_id(name)')
        .eq('university_id', user.university_id)

      if (campusId) {
        query = query.eq('campus_id', campusId)
      }
      if (programIdParam) {
        query = query.eq('program_id', programIdParam)
      }

      const { data, error } = await query
        .order('academic_year', { ascending: false })
        .order('semester', { ascending: false })

      if (error) throw error
      setEnrollments(data || [])
    } catch (error) {
      console.error('Error fetching enrollments:', error)
      showToast('Error loading enrollment reports: ' + error.message, 'error')
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

    if (!programId) {
      showToast('Please select a program', 'error')
      return
    }

    if (!academicYear || !semester) {
      showToast('Please select academic year and semester', 'error')
      return
    }

    if (!maleStudents || !femaleStudents) {
      showToast('Please enter male and female student counts', 'error')
      return
    }

    setSaving(true)

    try {
      const enrollmentData = {
        university_id: user.university_id,
        campus_id: selectedCampusId,
        program_id: programId,
        academic_year: academicYear,
        semester: semester,
        male_students: parseInt(maleStudents) || 0,
        female_students: parseInt(femaleStudents) || 0,
        new_admissions: parseInt(newAdmissions) || 0
      }

      const { data, error } = await supabase
        .from('enrollment_reports')
        .insert(enrollmentData)
        .select()
        .single()

      if (error) throw error

      showToast('Enrollment report added successfully!', 'success')
      
      // Clear form
      setProgramId('')
      setAcademicYear('')
      setSemester('')
      setMaleStudents('')
      setFemaleStudents('')
      setNewAdmissions('')
      
      await fetchEnrollments()
      setShowForm(false)

      if (returnTo === 'department' && returnCampusId && returnFacultyId && returnDeptId) {
        navigate(`/ufp/campus/${returnCampusId}/faculty/${returnFacultyId}/department/${returnDeptId}`)
      }
    } catch (error) {
      console.error('Error saving enrollment report:', error)
      showToast(error.message || 'Error saving enrollment report', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (enrollmentId) => {
    if (!confirm('Are you sure you want to delete this enrollment report? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('enrollment_reports')
        .delete()
        .eq('id', enrollmentId)

      if (error) throw error

      await fetchEnrollments()
      showToast('Enrollment report deleted successfully', 'success')
    } catch (error) {
      console.error('Error deleting enrollment report:', error)
      showToast(error.message || 'Error deleting enrollment report', 'error')
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
            { label: 'Student Enrollment' }
          ]}
          className="text-white/80 mb-2"
        />

        {/* Header */}
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Student Enrollment</h2>
          <p className="text-white/90">
            {campusId ? `Manage enrollment reports for ${campusName || 'this campus'}` : 'Manage your university enrollment reports'}
          </p>
        </div>
      </motion.div>

      {/* Gallery Grid */}
      {enrollments.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-16 border border-slate-100 text-center max-w-2xl mx-auto"
        >
          <UsersRound className="w-24 h-24 mx-auto mb-6 text-slate-300" />
          <h3 className="text-2xl font-bold text-slate-900 mb-3">No Enrollment Reports Yet</h3>
          <p className="text-slate-600 mb-8 text-lg">Get started by adding your first enrollment report.</p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-8 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-full font-semibold transition-all shadow-md hover:shadow-lg text-lg"
          >
            <Plus className="w-6 h-6" />
            <span>Add First Report</span>
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
              Add Report
            </button>
          </motion.div>

          {/* Enrollment Report Cards */}
          {enrollments.map((enrollment, index) => (
            <motion.div
              key={enrollment.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: (index + 1) * 0.1 }}
              className="bg-white rounded-3xl shadow-xl shadow-blue-900/10 border-x border-b border-slate-200 border-t-[8px] border-t-blue-600 p-8 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 relative max-w-[380px] w-full flex flex-col items-center text-center"
            >
              {/* Campus Location Badge (Only in Global View) */}
              {!campusId && enrollment.campuses && enrollment.campuses.name && (
                <div className="absolute top-4 left-4 px-3 py-1 bg-cyan-100 text-cyan-700 text-xs font-semibold rounded-full flex items-center gap-1 z-10">
                  <MapPin className="w-3 h-3" />
                  <span>{enrollment.campuses.name}</span>
                </div>
              )}

              {/* Delete Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleDelete(enrollment.id)
                }}
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-slate-900 hover:bg-red-600 hover:scale-110 flex items-center justify-center shadow-md transition-all duration-200 z-10"
                title="Delete report"
              >
                <Trash2 className="w-[18px] h-[18px] text-white" />
              </button>

              {/* Program Icon */}
              <div className="mb-6">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center mx-auto shadow-lg">
                  <UsersRound className="w-10 h-10 text-white" />
                </div>
              </div>

              {/* Enrollment Info */}
              <div className="text-center w-full">
                <h3 className="text-lg font-bold text-slate-900 mb-2 line-clamp-2">
                  {enrollment.programs?.name || 'Unknown Program'}
                </h3>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                    {enrollment.semester} {enrollment.academic_year}
                  </span>
                </div>
                <p className="text-2xl font-bold text-slate-900 mb-2">
                  {enrollment.total_enrolled || (enrollment.male_students + enrollment.female_students) || 0}
                </p>
                <p className="text-xs text-slate-500 mb-2">
                  Total Enrolled
                </p>
                {enrollment.new_admissions > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-200 flex items-center justify-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    <span className="text-sm font-semibold text-emerald-600">
                      +{enrollment.new_admissions} New Admissions
                    </span>
                  </div>
                )}
                <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-slate-500 mb-1">Male</p>
                    <p className="font-semibold text-slate-700">{enrollment.male_students || 0}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 mb-1">Female</p>
                    <p className="font-semibold text-slate-700">{enrollment.female_students || 0}</p>
                  </div>
                </div>
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
                    <h3 className="text-xl font-semibold text-slate-900">Add Enrollment Report</h3>
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

                    {/* Program Selection */}
                    <div>
                      <label className="block text-sm font-medium text-slate-900 mb-2">
                        Select Program <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={programId}
                        onChange={(e) => programIdParam ? undefined : setProgramId(e.target.value)}
                        disabled={!selectedCampusId || !!programIdParam}
                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm disabled:bg-slate-100 disabled:cursor-not-allowed"
                        required
                      >
                        <option value="">{selectedCampusId ? (programIdParam ? 'Program pre-selected' : 'Select Program') : 'Select Campus first'}</option>
                        {programs.map((program) => (
                          <option key={program.id} value={program.id}>
                            {program.name}
                          </option>
                        ))}
                      </select>
                      {selectedCampusId && programs.length === 0 && (
                        <p className="mt-2 text-sm text-amber-600">No programs found. Please add a program first.</p>
                      )}
                    </div>

                    {/* Academic Year and Semester */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-900 mb-2">
                          Academic Year <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={academicYear}
                          onChange={(e) => setAcademicYear(e.target.value)}
                          className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm"
                          required
                        >
                          <option value="">Select Year</option>
                          {ACADEMIC_YEARS.map((year) => (
                            <option key={year} value={year}>
                              {year}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-900 mb-2">
                          Semester <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={semester}
                          onChange={(e) => setSemester(e.target.value)}
                          className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm"
                          required
                        >
                          <option value="">Select Semester</option>
                          {SEMESTERS.map((sem) => (
                            <option key={sem} value={sem}>
                              {sem}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Student Metrics */}
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-900 mb-2">
                          Male Students <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          value={maleStudents}
                          onChange={(e) => setMaleStudents(e.target.value)}
                          placeholder="0"
                          min="0"
                          className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-900 mb-2">
                          Female Students <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          value={femaleStudents}
                          onChange={(e) => setFemaleStudents(e.target.value)}
                          placeholder="0"
                          min="0"
                          className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-900 mb-2">
                          New Admissions
                        </label>
                        <input
                          type="number"
                          value={newAdmissions}
                          onChange={(e) => setNewAdmissions(e.target.value)}
                          placeholder="0"
                          min="0"
                          className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm"
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
                          <span>Save Report</span>
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

export default StudentEnrollment
