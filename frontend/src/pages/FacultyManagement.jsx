import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabaseClient'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { 
  Trash2, 
  Plus, 
  Upload, 
  Loader2,
  CheckCircle,
  X,
  Building2,
  ArrowLeft,
  Users,
  ArrowRight,
  AlertTriangle,
  BookOpen,
  UserCheck,
  GraduationCap
} from 'lucide-react'
import Breadcrumbs from '../components/Breadcrumbs'

const FACULTY_NAMES = [
  'Faculty of Arts & Social Sciences',
  'Faculty of Science',
  'Faculty of Engineering & Technology',
  'Faculty of Management Sciences',
  'Faculty of Commerce & Business Administration',
  'Faculty of Law',
  'Faculty of Education',
  'Faculty of Pharmacy',
  'Faculty of Agriculture',
  'Faculty of Medicine & Allied Medical Sciences',
  'Faculty of Islamic Studies',
  'Faculty of Computer Science & IT',
  'Faculty of Architecture & Design',
  'Faculty of Earth & Environmental Sciences',
  'Other'
]

// Faculty name to abbreviation mapping
const FACULTY_ABBREVIATIONS = {
  'Faculty of Arts & Social Sciences': 'FASS',
  'Faculty of Science': 'FS',
  'Faculty of Engineering & Technology': 'FET',
  'Faculty of Management Sciences': 'FMS',
  'Faculty of Commerce & Business Administration': 'FCBA',
  'Faculty of Law': 'FL',
  'Faculty of Education': 'FE',
  'Faculty of Pharmacy': 'FP',
  'Faculty of Agriculture': 'FA',
  'Faculty of Medicine & Allied Medical Sciences': 'FMAMS',
  'Faculty of Islamic Studies': 'FIS',
  'Faculty of Computer Science & IT': 'FCSIT',
  'Faculty of Architecture & Design': 'FAD',
  'Faculty of Earth & Environmental Sciences': 'FEES',
  'Other': ''
}

function FacultyManagement() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const campusId = searchParams.get('campusId')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState(null)
  const [faculties, setFaculties] = useState([])
  const [summaryByFaculty, setSummaryByFaculty] = useState({})
  const [departmentsByFaculty, setDepartmentsByFaculty] = useState({})
  const [programsByFaculty, setProgramsByFaculty] = useState({})
  const [staffByFaculty, setStaffByFaculty] = useState({})
  const [hoverFacultyId, setHoverFacultyId] = useState(null)
  const [hoverMetric, setHoverMetric] = useState(null)
  const [toast, setToast] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [campusName, setCampusName] = useState(null)

  // Form state
  const [emblemFile, setEmblemFile] = useState(null)
  const [emblemPreview, setEmblemPreview] = useState(null)
  const [officialName, setOfficialName] = useState('')
  const [facultyCode, setFacultyCode] = useState('')
  const [activeStatus, setActiveStatus] = useState('Active')
  const [startDate, setStartDate] = useState('')
  const [deanName, setDeanName] = useState('')
  const [email, setEmail] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [deanId, setDeanId] = useState(null)
  const [deanExistsInStaff, setDeanExistsInStaff] = useState(false)
  const [deanPhotoFile, setDeanPhotoFile] = useState(null)
  const [deanPhotoPreview, setDeanPhotoPreview] = useState(null)
  const [deanAppointmentLetterFile, setDeanAppointmentLetterFile] = useState(null)

  useEffect(() => {
    loadUserData()
  }, [])

  useEffect(() => {
    if (user?.university_id) {
      fetchFaculties()
      if (campusId) {
        fetchCampusName()
      }
    }
  }, [user, campusId])

  // Auto-fill faculty code when official name is selected
  useEffect(() => {
    if (officialName && FACULTY_ABBREVIATIONS[officialName]) {
      setFacultyCode(FACULTY_ABBREVIATIONS[officialName])
    } else if (officialName === 'Other') {
      setFacultyCode('')
    }
  }, [officialName])

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
      setLoading(false)
    } catch (error) {
      console.error('Error loading user data:', error)
      navigate('/login')
    }
  }

  const fetchFaculties = async () => {
    if (!user?.university_id) return

    try {
      let query = supabase
        .from('faculties')
        .select('*, campuses(name)')
        .eq('university_id', user.university_id)

      // If campusId is present, filter by campus_id
      if (campusId) {
        query = query.eq('campus_id', campusId)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching faculties:', error)
        showToast('Error loading faculties: ' + error.message, 'error')
        return
      }

      const list = data || []
      setFaculties(list)

      if (list.length > 0) {
        const { data: summaryData, error: sumError } = await supabase
          .from('faculty_summary')
          .select('faculty_id, departments_count, programs_count, teaching_staff_count, students_count')
          .in('faculty_id', list.map((f) => f.id))

        if (!sumError && summaryData) {
          const byId = {}
          summaryData.forEach((row) => {
            byId[row.faculty_id] = {
              departments_count: row.departments_count ?? 0,
              programs_count: row.programs_count ?? 0,
              teaching_staff_count: row.teaching_staff_count ?? 0,
              students_count: row.students_count ?? 0
            }
          })
          setSummaryByFaculty(byId)
        } else {
          if (sumError) {
            console.error('Error fetching faculty_summary in FacultyManagement:', sumError)
          }
          setSummaryByFaculty({})
        }

        const facultyIds = list.map((f) => f.id)
        const { data: deptRows } = await supabase
          .from('departments')
          .select('id, name, faculty_id')
          .eq('university_id', user.university_id)
          .in('faculty_id', facultyIds)
        const deptList = deptRows || []
        const deptsByFac = {}
        deptList.forEach((d) => {
          if (!deptsByFac[d.faculty_id]) deptsByFac[d.faculty_id] = []
          deptsByFac[d.faculty_id].push({ id: d.id, name: d.name })
        })
        setDepartmentsByFaculty(deptsByFac)

        const deptIds = deptList.map((d) => d.id)
        if (deptIds.length > 0) {
          const { data: progRows } = await supabase
            .from('programs')
            .select('id, name, department_id')
            .eq('university_id', user.university_id)
            .in('department_id', deptIds)
          const progList = progRows || []
          const progsByFac = {}
          progList.forEach((p) => {
            const dept = deptList.find((d) => d.id === p.department_id)
            if (!dept) return
            if (!progsByFac[dept.faculty_id]) progsByFac[dept.faculty_id] = []
            progsByFac[dept.faculty_id].push({ id: p.id, name: p.name })
          })
          setProgramsByFaculty(progsByFac)

          const { data: staffRows } = await supabase
            .from('staff')
            .select('id, full_name, department_id')
            .eq('university_id', user.university_id)
            .eq('type', 'Teaching')
            .in('department_id', deptIds)
          const staffList = staffRows || []
          const staffByFac = {}
          staffList.forEach((s) => {
            const dept = deptList.find((d) => d.id === s.department_id)
            if (!dept) return
            if (!staffByFac[dept.faculty_id]) staffByFac[dept.faculty_id] = []
            staffByFac[dept.faculty_id].push({ id: s.id, full_name: s.full_name })
          })
          setStaffByFaculty(staffByFac)
        } else {
          setProgramsByFaculty({})
          setStaffByFaculty({})
        }
      } else {
        setSummaryByFaculty({})
        setDepartmentsByFaculty({})
        setProgramsByFaculty({})
        setStaffByFaculty({})
      }
    } catch (error) {
      console.error('Error in fetchFaculties:', error)
      showToast('Error loading faculties: ' + error.message, 'error')
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

      if (error) {
        console.error('Error fetching campus name:', error)
        return
      }

      setCampusName(data?.name || null)
    } catch (error) {
      console.error('Error in fetchCampusName:', error)
    }
  }

  const handleEmblemChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setEmblemFile(file)
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setEmblemPreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const checkDeanInStaff = async () => {
    if (!deanName || !user?.university_id) {
      setDeanExistsInStaff(false)
      setDeanId(null)
      return
    }

    try {
      // Check if dean exists in staff table by name
      const { data, error } = await supabase
        .from('staff')
        .select('id, full_name')
        .eq('university_id', user.university_id)
        .ilike('full_name', `%${deanName}%`)
        .limit(1)

      if (!error && data && data.length > 0) {
        setDeanExistsInStaff(true)
        setDeanId(data[0].id)
      } else {
        setDeanExistsInStaff(false)
        setDeanId(null)
      }
    } catch (error) {
      console.error('Error checking dean in staff:', error)
      setDeanExistsInStaff(false)
      setDeanId(null)
    }
  }

  const registerDeanAsStaff = () => {
    if (!deanName) {
      showToast('Please enter Dean name first', 'error')
      return
    }

    if (!campusId) {
      showToast('Campus ID is required to register staff', 'error')
      return
    }

    // Build return path with current form state
    const returnPath = `/ufp/faculties${campusId ? `?campusId=${campusId}` : ''}`
    
    // Redirect to staff management with dean name and return path
    const params = new URLSearchParams({
      campusId: campusId,
      staffType: 'Teaching',
      fullName: deanName,
      returnPath: returnPath,
      administrativeRole: 'Dean',
      academicDesignation: 'Professor'
    })
    
    // Also pass email and phone if available
    if (email) params.set('email', email)
    if (phoneNumber) params.set('phone', phoneNumber)
    
    navigate(`/ufp/staff?${params.toString()}`)
  }

  // Check if dean exists in staff when name changes
  useEffect(() => {
    if (!deanName || !user?.university_id) {
      setDeanExistsInStaff(false)
      setDeanId(null)
      return
    }

    const timeoutId = setTimeout(() => {
      checkDeanInStaff()
    }, 500) // Debounce for 500ms

    return () => clearTimeout(timeoutId)
  }, [deanName, user?.university_id])

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!user?.university_id) {
      showToast('University ID not found. Please log in again.', 'error')
      return
    }

    // Validation
    if (!officialName) {
      showToast('Please select an official name', 'error')
      return
    }
    if (!facultyCode) {
      showToast('Please enter a faculty code/abbreviation', 'error')
      return
    }
    if (!startDate) {
      showToast('Please select a start date', 'error')
      return
    }
    if (!deanName) {
      showToast('Please enter dean/focal person name', 'error')
      return
    }
    if (!email) {
      showToast('Please enter an email address', 'error')
      return
    }
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      showToast('Please enter a valid email address', 'error')
      return
    }
    if (!phoneNumber) {
      showToast('Please enter a phone number', 'error')
      return
    }

    setSaving(true)

    try {
      let emblemUrl = null

      // Upload emblem if file is selected
      if (emblemFile) {
        const fileName = `faculty-emblem-${user.university_id}-${Date.now()}-${emblemFile.name}`
        
        const { error: uploadError } = await supabase.storage
          .from('university-logos')
          .upload(fileName, emblemFile, {
            cacheControl: '3600',
            upsert: false
          })

        if (uploadError) {
          throw new Error('Failed to upload emblem: ' + uploadError.message)
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('university-logos')
          .getPublicUrl(fileName)

        emblemUrl = urlData.publicUrl
      }

      // Upload dean photo to official_photos bucket (optional)
      let deanPhotoUrl = null
      if (deanPhotoFile) {
        const fileName = `dean-photo-${user.university_id}-${Date.now()}-${deanPhotoFile.name.replace(/\s/g, '-')}`
        const { error: photoErr } = await supabase.storage.from('official_photos').upload(fileName, deanPhotoFile, { cacheControl: '3600', upsert: true })
        if (!photoErr) {
          const { data: photoData } = supabase.storage.from('official_photos').getPublicUrl(fileName)
          deanPhotoUrl = photoData?.publicUrl || null
        }
      }

      // Upload dean appointment letter to appointment_letters bucket (optional)
      let deanLetterUrl = null
      if (deanAppointmentLetterFile) {
        const ext = deanAppointmentLetterFile.name.split('.').pop() || 'pdf'
        const fileName = `dean-letter-${user.university_id}-${Date.now()}.${ext}`
        const { error: letterErr } = await supabase.storage.from('appointment_letters').upload(fileName, deanAppointmentLetterFile, { cacheControl: '3600', upsert: true })
        if (!letterErr) {
          const { data: letterData } = supabase.storage.from('appointment_letters').getPublicUrl(fileName)
          deanLetterUrl = letterData?.publicUrl || null
        }
      }

      // Insert into faculties table
      const insertData = {
        university_id: user.university_id,
        name: officialName,
        code: facultyCode,
        status: activeStatus,
        establishment_date: startDate,
        dean_name: deanName,
        dean_email: email,
        dean_phone: phoneNumber,
        emblem_url: emblemUrl,
        dean_photo_url: deanPhotoUrl || null,
        dean_appointment_letter_url: deanLetterUrl || null
      }

      // If campusId is present in URL, include it in the insert
      if (campusId) {
        insertData.campus_id = campusId
      }

      // If dean_id exists (from staff table), link it
      if (deanId) {
        insertData.dean_id = deanId
      }

      const { data, error } = await supabase
        .from('faculties')
        .insert(insertData)
        .select()
        .single()

      if (error) {
        throw new Error('Failed to save faculty: ' + error.message)
      }

      try {
        console.log("LOGGING DEBUG: Attempting fetch to Port 5000...");
        await fetch('http://localhost:5000/api/logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uni_id: user?.university_id || '1',
            uni_name: 'Sukkur IBA University',
            action: 'FACULTY_ADDED',
            details: `Registered new faculty: ${officialName}`
          })
        });
        console.log("LOGGING DEBUG: Success!");
      } catch (logErr) {
        console.warn("Log server offline, but record saved to Supabase.");
      }

      // Clear form
      setEmblemFile(null)
      setEmblemPreview(null)
      setOfficialName('')
      setFacultyCode('')
      setActiveStatus('Active')
      setStartDate('')
      setDeanName('')
      setEmail('')
      setPhoneNumber('')
      setDeanId(null)
      setDeanExistsInStaff(false)
      setDeanPhotoFile(null)
      setDeanPhotoPreview(null)
      setDeanAppointmentLetterFile(null)
      
      // Reset file inputs
      const fileInput = document.getElementById('emblem-upload')
      if (fileInput) fileInput.value = ''
      const deanPhotoInput = document.getElementById('dean-photo-upload')
      if (deanPhotoInput) deanPhotoInput.value = ''
      const deanLetterInput = document.getElementById('dean-letter-upload')
      if (deanLetterInput) deanLetterInput.value = ''

      // Refresh faculties list
      await fetchFaculties()

      // Close modal form
      setShowForm(false)

      showToast('Faculty added successfully!', 'success')
      
      // Post-save reminder if dean is not registered
      if (!deanId && deanName) {
        setTimeout(() => {
          showToast(`Faculty Created! Remember to add ${deanName} as a staff member to enable board management for this faculty.`, 'info')
        }, 1500)
      }
    } catch (error) {
      console.error('Error saving faculty:', error)
      showToast(error.message || 'Error saving faculty', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (facultyId) => {
    if (!confirm('Are you sure you want to delete this faculty? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('faculties')
        .delete()
        .eq('id', facultyId)

      if (error) {
        throw new Error('Failed to delete faculty: ' + error.message)
      }

      // Refresh faculties list
      await fetchFaculties()
      showToast('Faculty deleted successfully', 'success')
    } catch (error) {
      console.error('Error deleting faculty:', error)
      showToast(error.message || 'Error deleting faculty', 'error')
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
            { label: campusName ? `Faculties - ${campusName}` : 'Faculty Management' }
          ]}
          className="text-white/80 mb-2"
        />

        {/* Header */}
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">
            {campusName ? `Faculties - ${campusName}` : 'Faculty Management'}
          </h2>
          <p className="text-white/90">
            {campusName 
              ? `Manage faculties for ${campusName}`
              : 'Manage your university\'s faculties and departments'
            }
          </p>
        </div>
      </motion.div>

      {/* Gallery Grid */}
      {faculties.length === 0 ? (
        /* Empty State */
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-16 border border-slate-100 text-center max-w-2xl mx-auto"
        >
          <Building2 className="w-24 h-24 mx-auto mb-6 text-slate-300" />
          <h3 className="text-2xl font-bold text-slate-900 mb-3">No Faculties Yet</h3>
          <p className="text-slate-600 mb-8 text-lg">Get started by adding your first faculty to begin organizing your university structure.</p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-8 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-full font-semibold transition-all shadow-md hover:shadow-lg text-lg"
          >
            <Plus className="w-6 h-6" />
            <span>Add First Faculty</span>
          </button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Quick Add Card - Always First */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            onClick={() => setShowForm(true)}
            className="bg-white rounded-3xl shadow-xl shadow-blue-900/10 border-x border-b border-slate-200 border-t-[10px] border-t-blue-600 p-6 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col items-center justify-center min-h-[280px]"
          >
            <div className="w-20 h-20 rounded-full bg-cyan-100 flex items-center justify-center mb-4">
              <Plus className="w-10 h-10 text-cyan-600" />
            </div>
            <button className="px-8 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-full font-semibold transition-all shadow-md hover:shadow-lg">
              Add Faculty
            </button>
          </motion.div>

          {/* Faculty Cards – Premium LHS/RHS split + hover insight */}
          {faculties.map((faculty, index) => {
            const summary = summaryByFaculty[faculty.id] || {
              departments_count: 0,
              programs_count: 0,
              teaching_staff_count: 0,
              students_count: 0
            }
            const campusIdForNav = campusId || faculty.campus_id
            const d = summary.departments_count
            const p = summary.programs_count
            const t = summary.teaching_staff_count
            const s = summary.students_count
            const insightParts = []
            if (d) insightParts.push(`${d} Department${d !== 1 ? 's' : ''}`)
            if (p) insightParts.push(`${p} Program${p !== 1 ? 's' : ''}`)
            if (t) insightParts.push(`${t} Teaching Staff`)
            if (s) insightParts.push(`${s} Student${s !== 1 ? 's' : ''}`)
            const insightText = insightParts.length
              ? `Overseeing ${insightParts.join(', ')}.`
              : 'No departments or students recorded yet.'
            return (
              <motion.div
                key={faculty.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: (index + 1) * 0.1 }}
                onClick={() => campusIdForNav && navigate(`/ufp/campus/${campusIdForNav}/faculty/${faculty.id}`)}
                className="group relative bg-white rounded-3xl shadow-xl shadow-blue-900/10 border-x border-b border-slate-200 border-t-[10px] border-t-blue-600 p-8 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer min-h-[340px] flex flex-col"
                title={insightText}
              >
                {/* Delete Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(faculty.id)
                  }}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-900 hover:bg-red-600 flex items-center justify-center transition-colors z-10"
                  title="Delete faculty"
                >
                  <Trash2 className="w-4 h-4 text-white" />
                </button>

                {/* Half-half: LHS = emblem + dean | RHS = name/code top, stats bottom — attached, center-aligned */}
                <div className="flex flex-1 min-h-0 gap-2 items-center justify-center">
                  {/* LHS: Larger emblem + larger dean text, less empty space */}
                  <div className="flex flex-col justify-center items-center flex-1 min-w-0 py-1">
                    {faculty.emblem_url ? (
                      <div className="w-40 h-40 rounded-2xl border-2 border-slate-200 flex items-center justify-center overflow-hidden bg-white shadow-sm flex-shrink-0">
                        <img src={faculty.emblem_url} alt={faculty.name} className="w-full h-full object-contain p-2" />
                      </div>
                    ) : (
                      <div className="w-40 h-40 rounded-2xl border-2 border-slate-200 bg-slate-50 flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-20 h-20 text-slate-400" />
                      </div>
                    )}
                    <p className="text-base text-slate-700 text-center mt-2 font-semibold">
                      Dean: {faculty.dean_name || '—'}
                      {faculty.dean_name && !faculty.dean_id && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            const params = new URLSearchParams({
                              campusId: faculty.campus_id || campusId || '',
                              staffType: 'Teaching',
                              fullName: faculty.dean_name,
                              returnPath: `/ufp/faculties${campusId ? `?campusId=${campusId}` : ''}`,
                              administrativeRole: 'Dean',
                              academicDesignation: 'Professor'
                            })
                            if (faculty.dean_email) params.set('email', faculty.dean_email)
                            if (faculty.dean_phone) params.set('phone', faculty.dean_phone)
                            navigate(`/ufp/staff?${params.toString()}`)
                          }}
                          className="inline-block ml-1 align-middle"
                          title="This person is not registered as a staff member."
                        >
                          <AlertTriangle className="w-5 h-5 text-amber-500 hover:text-amber-600 transition-colors" />
                        </button>
                      )}
                    </p>
                  </div>

                  {/* RHS: Grey box + stats attached; stats larger than name box; both enlarged */}
                  <div className="flex flex-col flex-1 min-w-0 overflow-hidden rounded-xl border border-slate-200/60">
                    <div className="flex flex-col justify-center py-3 px-4 rounded-t-xl bg-slate-50/80 border-b border-slate-200/60 text-center">
                      <h3 className="text-base font-semibold text-slate-700 line-clamp-2" style={{ fontFamily: 'system-ui' }}>
                        {faculty.name}
                      </h3>
                      <span className="mt-1 text-sm font-mono text-slate-500">{faculty.code}</span>
                      {!campusId && faculty.campuses?.name && (
                        <span className="mt-1.5 text-xs text-slate-400">📍 {faculty.campuses.name}</span>
                      )}
                    </div>
                    <div className="bg-slate-800 text-white py-4 px-5 flex flex-col justify-center gap-2.5 rounded-b-xl">
                      <div
                        className="flex items-center justify-center gap-2.5 relative"
                        onMouseEnter={() => { setHoverFacultyId(faculty.id); setHoverMetric('depts') }}
                        onMouseLeave={() => setHoverMetric(null)}
                      >
                        <Building2 className="w-5 h-5 text-cyan-400 shrink-0" />
                        <span className="text-base font-bold tabular-nums">{d}</span>
                        <span className="text-sm text-slate-300">Depts</span>
                        {hoverFacultyId === faculty.id && hoverMetric === 'depts' && (
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-72 bg-slate-900/95 text-white rounded-2xl shadow-2xl p-4 z-20 border border-slate-700">
                            <h4 className="text-sm font-semibold mb-2">Departments in {faculty.code || faculty.name}</h4>
                            {(departmentsByFaculty[faculty.id]?.length) ? (
                              <ul className="space-y-1.5 text-sm max-h-48 overflow-y-auto">
                                {departmentsByFaculty[faculty.id].map((dpt) => (
                                  <li key={dpt.id} className="flex items-center gap-2">
                                    <Building2 className="w-4 h-4 text-cyan-300 shrink-0" />
                                    <span>{dpt.name}</span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-sm text-slate-300">No departments registered yet.</p>
                            )}
                          </div>
                        )}
                      </div>
                      <div
                        className="flex items-center justify-center gap-2.5 relative"
                        onMouseEnter={() => { setHoverFacultyId(faculty.id); setHoverMetric('programs') }}
                        onMouseLeave={() => setHoverMetric(null)}
                      >
                        <BookOpen className="w-5 h-5 text-amber-400 shrink-0" />
                        <span className="text-base font-bold tabular-nums">{p}</span>
                        <span className="text-sm text-slate-300">Programs</span>
                        {hoverFacultyId === faculty.id && hoverMetric === 'programs' && (
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-72 bg-slate-900/95 text-white rounded-2xl shadow-2xl p-4 z-20 border border-slate-700">
                            <h4 className="text-sm font-semibold mb-2">Programs offered</h4>
                            {(programsByFaculty[faculty.id]?.length) ? (
                              <ul className="space-y-1.5 text-sm max-h-48 overflow-y-auto">
                                {programsByFaculty[faculty.id].map((prog) => (
                                  <li key={prog.id} className="flex items-center gap-2">
                                    <BookOpen className="w-4 h-4 text-amber-300 shrink-0" />
                                    <span>{prog.name}</span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-sm text-slate-300">No programs registered yet.</p>
                            )}
                          </div>
                        )}
                      </div>
                      <div
                        className="flex items-center justify-center gap-2.5 relative"
                        onMouseEnter={() => { setHoverFacultyId(faculty.id); setHoverMetric('staff') }}
                        onMouseLeave={() => setHoverMetric(null)}
                      >
                        <UserCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                        <span className="text-base font-bold tabular-nums">{t}</span>
                        <span className="text-sm text-slate-300">Staff</span>
                        {hoverFacultyId === faculty.id && hoverMetric === 'staff' && (
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-72 bg-slate-900/95 text-white rounded-2xl shadow-2xl p-4 z-20 border border-slate-700">
                            <h4 className="text-sm font-semibold mb-2">Teaching staff</h4>
                            {(staffByFaculty[faculty.id]?.length) ? (
                              <ul className="space-y-1.5 text-sm max-h-48 overflow-y-auto">
                                {staffByFaculty[faculty.id].map((st) => (
                                  <li key={st.id} className="flex items-center gap-2">
                                    <UserCheck className="w-4 h-4 text-emerald-300 shrink-0" />
                                    <span>{st.full_name}</span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-sm text-slate-300">No teaching staff recorded yet.</p>
                            )}
                          </div>
                        )}
                      </div>
                      <div
                        className="flex items-center justify-center gap-2.5 relative"
                        onMouseEnter={() => { setHoverFacultyId(faculty.id); setHoverMetric('students') }}
                        onMouseLeave={() => setHoverMetric(null)}
                      >
                        <GraduationCap className="w-5 h-5 text-pink-400 shrink-0" />
                        <span className="text-base font-bold tabular-nums">{s}</span>
                        <span className="text-sm text-slate-300">Students</span>
                        {hoverFacultyId === faculty.id && hoverMetric === 'students' && (
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-80 bg-slate-900/95 text-white rounded-2xl shadow-2xl p-4 z-20 border border-slate-700">
                            <h4 className="text-sm font-semibold mb-1">Student summary</h4>
                            <p className="text-2xl font-bold mb-2">{s}</p>
                            <p className="text-xs text-slate-300">
                              Total students currently enrolled in programs under this faculty (from the latest enrollment reports).
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Modal Form */}
      <AnimatePresence>
        {showForm && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowForm(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            />
            
            {/* Modal */}
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
                    <h3 className="text-xl font-semibold text-slate-900">Quick Add Faculty</h3>
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
              {/* Faculty Emblem Upload */}
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">
                  Faculty Emblem
                </label>
                <div className="relative">
                  <input
                    type="file"
                    id="emblem-upload"
                    accept="image/*"
                    onChange={handleEmblemChange}
                    className="hidden"
                  />
                  <label
                    htmlFor="emblem-upload"
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-blue-600 transition-colors bg-slate-50"
                  >
                    {emblemPreview ? (
                      <img
                        src={emblemPreview}
                        alt="Emblem preview"
                        className="h-full w-full object-contain rounded-lg"
                      />
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-slate-400 mb-2" />
                        <span className="text-sm text-slate-500">Click to upload emblem</span>
                      </>
                    )}
                  </label>
                </div>
              </div>

              {/* Official Name Dropdown */}
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">
                  Official Name <span className="text-red-500">*</span>
                </label>
                <select
                  value={officialName}
                  onChange={(e) => setOfficialName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm"
                  required
                >
                  <option value="">-- Select Faculty --</option>
                  {FACULTY_NAMES.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Faculty Code */}
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">
                  Faculty Code/Abbreviation <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={facultyCode}
                  onChange={(e) => setFacultyCode(e.target.value.toUpperCase())}
                  placeholder="e.g., FBAS"
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm"
                  required
                />
              </div>

              {/* Active Status */}
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">
                  Active Status <span className="text-red-500">*</span>
                </label>
                <select
                  value={activeStatus}
                  onChange={(e) => setActiveStatus(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm"
                  required
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm"
                  required
                />
              </div>

              {/* Dean Name */}
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">
                  Dean / Focal Person Name <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={deanName}
                    onChange={(e) => setDeanName(e.target.value)}
                    placeholder="Enter dean's full name"
                    className="flex-1 px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm"
                    required
                  />
                  {deanName && !deanExistsInStaff && campusId && (
                    <button
                      type="button"
                      onClick={registerDeanAsStaff}
                      className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all text-sm whitespace-nowrap flex items-center gap-2"
                      title="Register this dean as a staff member to link with Board Management"
                    >
                      <span>Register as Staff</span>
                    </button>
                  )}
                </div>
                {deanName && deanExistsInStaff && (
                  <p className="mt-1 text-xs text-green-600 font-medium">
                    ✓ Dean found in Staff records. Will be linked automatically.
                  </p>
                )}
                {deanName && !deanExistsInStaff && campusId && (
                  <p className="mt-1 text-xs text-amber-600">
                    Note: This Dean is not yet registered in the staff system. You can save the faculty now, but you will need to register them later to manage boards.
                  </p>
                )}
                {deanName && !campusId && (
                  <p className="mt-1 text-xs text-slate-500">
                    Note: Staff registration requires a campus selection.
                  </p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="dean@university.edu.pk"
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm"
                  required
                />
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+92-XXX-XXXXXXX"
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm"
                  required
                />
              </div>

              {/* Dean Photo (optional) */}
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">
                  Dean Photo <span className="text-slate-500 text-xs">(Optional)</span>
                </label>
                <div className="flex items-center gap-4">
                  {deanPhotoPreview ? (
                    <div className="w-20 h-20 rounded-full border-2 border-slate-200 overflow-hidden bg-white flex-shrink-0">
                      <img src={deanPhotoPreview} alt="Dean preview" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-full border-2 border-slate-200 bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <UserCheck className="w-10 h-10 text-slate-400" />
                    </div>
                  )}
                  <div className="flex-1">
                    <input type="file" accept="image/*" id="dean-photo-upload" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setDeanPhotoFile(f); const r = new FileReader(); r.onloadend = () => setDeanPhotoPreview(r.result); r.readAsDataURL(f) } }} />
                    <label htmlFor="dean-photo-upload" className="flex items-center gap-2 px-4 py-3 bg-white border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-blue-600 transition-colors text-sm text-slate-700">
                      <Upload className="w-5 h-5" />
                      <span>{deanPhotoPreview ? 'Change photo' : 'Upload photo'}</span>
                    </label>
                    {deanPhotoPreview && <button type="button" onClick={() => { setDeanPhotoFile(null); setDeanPhotoPreview(null); const i = document.getElementById('dean-photo-upload'); if (i) i.value = '' }} className="mt-2 text-xs text-red-600 hover:text-red-700">Remove</button>}
                  </div>
                </div>
              </div>

              {/* Dean Appointment Letter (optional) */}
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">
                  Dean Appointment Letter (Notification) <span className="text-slate-500 text-xs">(Optional)</span>
                </label>
                <input type="file" accept=".pdf,.doc,.docx" id="dean-letter-upload" className="hidden" onChange={(e) => setDeanAppointmentLetterFile(e.target.files?.[0] || null)} />
                <label htmlFor="dean-letter-upload" className="flex items-center gap-2 px-4 py-3 bg-white border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-blue-600 transition-colors text-sm text-slate-700">
                  <Upload className="w-5 h-5" />
                  <span>{deanAppointmentLetterFile ? deanAppointmentLetterFile.name : 'Upload PDF or document'}</span>
                </label>
                {deanAppointmentLetterFile && <button type="button" onClick={() => { setDeanAppointmentLetterFile(null); const i = document.getElementById('dean-letter-upload'); if (i) i.value = '' }} className="mt-2 text-xs text-red-600 hover:text-red-700">Remove letter</button>}
              </div>

              {/* Submit Button */}
              <motion.button
                type="submit"
                disabled={saving}
                whileHover={{ scale: saving ? 1 : 1.02 }}
                whileTap={{ scale: saving ? 1 : 0.98 }}
                className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 disabled:cursor-not-allowed text-white py-3 rounded-lg font-semibold transition-all duration-300 shadow-md hover:shadow-lg flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Faculty</span>
                )}
              </motion.button>
            </form>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 z-50 transform -translate-x-1/2"
          >
            <div
              className={`flex items-center gap-3 px-6 py-4 rounded-lg shadow-xl border ${
                toast.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : toast.type === 'info'
                  ? 'bg-blue-50 border-blue-200 text-blue-800'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}
            >
              {toast.type === 'success' ? (
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              ) : toast.type === 'info' ? (
                <AlertTriangle className="w-5 h-5 text-blue-600" />
              ) : (
                <X className="w-5 h-5 text-red-600" />
              )}
              <span className="font-medium">{toast.message}</span>
              <button
                onClick={() => setToast(null)}
                className="ml-2 text-slate-400 hover:text-slate-600 transition-colors"
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

export default FacultyManagement
