import { useState, useEffect, useRef } from 'react'
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
  BookOpen,
  UserCheck,
  GraduationCap,
  Info,
  ChevronRight,
} from 'lucide-react'
import Breadcrumbs from '../components/Breadcrumbs'
import { UfpAdminShell, UfpAdminContainer, UfpAdminLoadingCenter } from '../components/UfpAdminShell'
import { recordSystemLog } from '../utils/systemLogs'

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
  const facultyTableEmblemInputRef = useRef(null)
  const pendingEmblemFacultyIdRef = useRef(null)
  const [emblemUploadingFacultyId, setEmblemUploadingFacultyId] = useState(null)

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

      const { data, error } = await supabase
        .from('faculties')
        .insert(insertData)
        .select()
        .single()

      if (error) {
        throw new Error('Failed to save faculty: ' + error.message)
      }

      const campusLabel = campusName ? ` (${campusName})` : ''
      await recordSystemLog({
        universityId: user.university_id,
        actionType: 'FACULTY_ADDED',
        details: `Added faculty: ${officialName}${campusLabel}`,
      })

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
      const facultyToDelete = faculties.find((f) => f.id === facultyId)
      const { error } = await supabase
        .from('faculties')
        .delete()
        .eq('id', facultyId)

      if (error) {
        throw new Error('Failed to delete faculty: ' + error.message)
      }

      await recordSystemLog({
        universityId: user?.university_id,
        actionType: 'FACULTY_DELETED',
        details: `Deleted faculty: ${facultyToDelete?.name || 'Unnamed faculty'}`,
      })

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

  const openFacultyEmblemPicker = (facultyId, e) => {
    e?.stopPropagation()
    if (emblemUploadingFacultyId) return
    pendingEmblemFacultyIdRef.current = facultyId
    facultyTableEmblemInputRef.current?.click()
  }

  const handleFacultyTableEmblemChange = async (e) => {
    const file = e.target.files?.[0]
    const facultyId = pendingEmblemFacultyIdRef.current
    e.target.value = ''
    pendingEmblemFacultyIdRef.current = null
    if (!file || !facultyId || !user?.university_id) return
    if (!file.type.startsWith('image/')) {
      showToast('Please choose an image file', 'error')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image must be 5MB or smaller', 'error')
      return
    }
    setEmblemUploadingFacultyId(facultyId)
    try {
      const fileName = `faculty-emblem-${user.university_id}-${Date.now()}-${file.name.replace(/\s/g, '-')}`
      const { error: uploadError } = await supabase.storage
        .from('university-logos')
        .upload(fileName, file, { cacheControl: '3600', upsert: false })
      if (uploadError) throw new Error(uploadError.message)
      const { data: urlData } = supabase.storage.from('university-logos').getPublicUrl(fileName)
      const publicUrl = urlData?.publicUrl
      if (!publicUrl) throw new Error('Could not get file URL')
      const urlWithCache = `${publicUrl}?t=${Date.now()}`
      const { error: dbErr } = await supabase
        .from('faculties')
        .update({ emblem_url: urlWithCache })
        .eq('id', facultyId)
        .eq('university_id', user.university_id)
      if (dbErr) throw new Error(dbErr.message)

      const updatedFaculty = faculties.find((f) => f.id === facultyId)
      await recordSystemLog({
        universityId: user.university_id,
        actionType: 'FACULTY_UPDATED',
        details: `Updated emblem for faculty: ${updatedFaculty?.name || 'Unnamed faculty'}`,
      })

      await fetchFaculties()
      showToast('Faculty emblem updated')
    } catch (err) {
      console.error(err)
      showToast(err.message || 'Failed to upload emblem', 'error')
    } finally {
      setEmblemUploadingFacultyId(null)
    }
  }

  if (loading) {
    return <UfpAdminLoadingCenter />
  }

  return (
    <UfpAdminShell>
      <UfpAdminContainer>
      <motion.div
        initial={{ y: -12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="mb-10 rounded-xl border border-slate-200/90 border-t-[3px] border-t-blue-600 bg-gradient-to-br from-white via-blue-50/25 to-blue-50/20 p-5 shadow-md shadow-blue-900/5 shadow-slate-300/20 ring-1 ring-blue-950/[0.05] ring-slate-200/45 sm:mb-12 sm:p-6"
      >
        <motion.button
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          type="button"
          onClick={() => navigate(-1)}
          className="mb-4 inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:border-blue-200 hover:bg-slate-50 hover:text-blue-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </motion.button>

        <Breadcrumbs
          items={[
            { label: 'Dashboard', path: '/ufp-dashboard' },
            { label: campusName ? `Faculties - ${campusName}` : 'Faculty Management' }
          ]}
          className="mb-2 text-sm text-slate-500"
        />

        <div className="flex items-start gap-4">
          <div
            className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600/22 to-blue-700/12 text-blue-700 shadow-sm ring-1 ring-blue-300/55"
            aria-hidden
          >
            <Building2 className="h-5 w-5" strokeWidth={2} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="mb-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {campusName ? `Faculties - ${campusName}` : 'Faculty Management'}
          </h2>
            <p className="text-sm text-slate-600 sm:text-base">
            {campusName 
              ? `Manage faculties for ${campusName}`
                : "Manage your university's faculties and departments"}
          </p>
          </div>
        </div>
      </motion.div>

      {/* Faculty list: table (lg+), stacked cards (mobile) */}
      {faculties.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-2xl rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm sm:p-16"
        >
          <Building2 className="mx-auto mb-6 h-16 w-16 text-slate-300 sm:h-24 sm:w-24" />
          <h3 className="mb-3 text-xl font-bold text-slate-900 sm:text-2xl">No Faculties Yet</h3>
          <p className="mb-8 text-slate-600">Get started by adding your first faculty to begin organizing your university structure.</p>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
          >
            <Plus className="h-5 w-5" />
            <span>Add First Faculty</span>
          </button>
        </motion.div>
      ) : (
        <section className="rounded-xl border border-slate-200/90 bg-gradient-to-br from-slate-50/95 via-white to-blue-50/40 p-3 shadow-sm shadow-blue-900/[0.04] ring-1 ring-blue-950/[0.04] ring-slate-200/45 sm:p-4">
          <input
            ref={facultyTableEmblemInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFacultyTableEmblemChange}
            aria-hidden
          />
          {/* Desktop: data table */}
          <div className="mb-4 hidden items-center justify-end lg:flex">
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Add Faculty
            </button>
          </div>
          <div className="hidden overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm lg:block">
            <table className="w-full min-w-[1024px] border-collapse text-left text-sm text-slate-700">
              <thead>
                <tr className="border-b-2 border-blue-200/80 bg-gradient-to-r from-blue-100/90 via-sky-50 to-blue-100/85">
                  <th
                    scope="col"
                    className="px-4 py-3.5 text-left text-sm font-bold leading-snug tracking-tight text-slate-900"
                  >
                    Faculty
                  </th>
                  <th scope="col" className="w-24 px-3 py-3.5 text-left text-sm font-bold leading-snug tracking-tight text-slate-900">
                    Code
                  </th>
                  <th
                    scope="col"
                    className="min-w-[10rem] px-3 py-3.5 text-left text-sm font-bold leading-snug tracking-tight text-slate-900"
                  >
                    Dean
                  </th>
                  {!campusId && (
                    <th
                      scope="col"
                      className="min-w-[8rem] px-3 py-3.5 text-left text-sm font-bold leading-snug tracking-tight text-slate-900"
                    >
                      Campus
                    </th>
                  )}
                  <th
                    scope="col"
                    className="w-[4.5rem] px-2 py-3.5 text-center text-sm font-bold leading-snug tracking-tight text-slate-900"
                  >
                    Depts
                  </th>
                  <th
                    scope="col"
                    className="w-[4.75rem] px-2 py-3.5 text-center text-sm font-bold leading-snug tracking-tight text-slate-900"
                  >
                    Programs
                  </th>
                  <th
                    scope="col"
                    className="w-[4.5rem] px-2 py-3.5 text-center text-sm font-bold leading-snug tracking-tight text-slate-900"
                  >
                    Staff
                  </th>
                  <th
                    scope="col"
                    className="w-[4.75rem] px-2 py-3.5 text-center text-sm font-bold leading-snug tracking-tight text-slate-900"
                  >
                    Students
                  </th>
                  <th
                    scope="col"
                    className="w-36 px-3 py-3.5 text-right text-sm font-bold leading-snug tracking-tight text-slate-900"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80">
                {faculties.map((faculty) => {
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
                  const go = () => {
                    if (campusIdForNav) navigate(`/ufp/campus/${campusIdForNav}/faculty/${faculty.id}`)
                  }
                  return (
                    <tr
                      key={faculty.id}
                      className="cursor-pointer odd:bg-white even:bg-slate-50/70 transition-colors hover:bg-blue-50/50"
                      onClick={go}
                    >
                      <td className="max-w-md px-4 py-3.5 align-top">
                        <div className="flex gap-3">
                          <button
                            type="button"
                            title="Change faculty emblem"
                            aria-label={`Upload emblem for ${faculty.name}`}
                            disabled={!!emblemUploadingFacultyId}
                            onClick={(e) => openFacultyEmblemPicker(faculty.id, e)}
                            className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white text-left ring-offset-2 transition hover:ring-2 hover:ring-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                          >
                            {faculty.emblem_url ? (
                              <img src={faculty.emblem_url} alt="" className="h-full w-full object-contain p-1" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-slate-50">
                                <Building2 className="h-6 w-6 text-slate-400" />
                              </div>
                            )}
                            {emblemUploadingFacultyId === faculty.id && (
                              <span className="absolute inset-0 flex items-center justify-center bg-white/85">
                                <Loader2 className="h-5 w-5 animate-spin text-blue-600" aria-hidden />
                              </span>
                            )}
                          </button>
                          <p className="min-w-0 break-words font-medium leading-snug text-slate-900" title={faculty.name}>
                            {faculty.name}
                          </p>
                        </div>
                      </td>
                      <td className="px-3 py-3.5 align-top font-mono text-xs text-slate-600">{faculty.code || '—'}</td>
                      <td className="px-3 py-3.5 align-top break-words text-slate-700" title={faculty.dean_name || ''}>
                        {faculty.dean_name || '—'}
                      </td>
                      {!campusId && (
                        <td className="px-3 py-3.5 align-top break-words text-slate-600">{faculty.campuses?.name || '—'}</td>
                      )}
                      <td
                        className="relative px-2 py-3.5 text-center align-middle tabular-nums"
                        onMouseEnter={() => { setHoverFacultyId(faculty.id); setHoverMetric('depts') }}
                        onMouseLeave={() => setHoverMetric(null)}
                      >
                        <span className="inline-flex items-center justify-center gap-1 text-slate-800">
                          <Building2 className="h-4 w-4 shrink-0 text-blue-600" strokeWidth={2} />
                          {d}
                        </span>
                        {hoverFacultyId === faculty.id && hoverMetric === 'depts' && (
                          <div className="absolute left-1/2 top-full z-30 mt-1 w-72 -translate-x-1/2 rounded-xl border border-slate-700 bg-slate-900 p-3 text-left text-white shadow-xl">
                            <h4 className="mb-2 text-xs font-semibold">Departments — {faculty.code || faculty.name}</h4>
                            {departmentsByFaculty[faculty.id]?.length ? (
                              <ul className="max-h-48 space-y-1 overflow-y-auto text-xs">
                                {departmentsByFaculty[faculty.id].map((dpt) => (
                                  <li key={dpt.id} className="flex gap-2">
                                    <Building2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-300" />
                                    <span>{dpt.name}</span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-xs text-slate-300">No departments yet.</p>
                            )}
                          </div>
                        )}
                      </td>
                      <td
                        className="relative px-2 py-3.5 text-center align-middle tabular-nums text-slate-800"
                        onMouseEnter={() => { setHoverFacultyId(faculty.id); setHoverMetric('programs') }}
                        onMouseLeave={() => setHoverMetric(null)}
                      >
                        <span className="inline-flex items-center justify-center gap-1">
                          <BookOpen className="h-4 w-4 shrink-0 text-amber-500" strokeWidth={2} />
                          {p}
                        </span>
                        {hoverFacultyId === faculty.id && hoverMetric === 'programs' && (
                          <div className="absolute left-1/2 top-full z-30 mt-1 w-72 -translate-x-1/2 rounded-xl border border-slate-700 bg-slate-900 p-3 text-left text-white shadow-xl">
                            <h4 className="mb-2 text-xs font-semibold">Programs</h4>
                            {programsByFaculty[faculty.id]?.length ? (
                              <ul className="max-h-48 space-y-1 overflow-y-auto text-xs">
                                {programsByFaculty[faculty.id].map((prog) => (
                                  <li key={prog.id} className="flex gap-2">
                                    <BookOpen className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
                                    <span>{prog.name}</span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-xs text-slate-300">No programs yet.</p>
                            )}
                          </div>
                        )}
                      </td>
                      <td
                        className="relative px-2 py-3.5 text-center align-middle tabular-nums text-slate-800"
                        onMouseEnter={() => { setHoverFacultyId(faculty.id); setHoverMetric('staff') }}
                        onMouseLeave={() => setHoverMetric(null)}
                      >
                        <span className="inline-flex items-center justify-center gap-1">
                          <UserCheck className="h-4 w-4 shrink-0 text-emerald-600" strokeWidth={2} />
                          {t}
                        </span>
                        {hoverFacultyId === faculty.id && hoverMetric === 'staff' && (
                          <div className="absolute left-1/2 top-full z-30 mt-1 w-72 -translate-x-1/2 rounded-xl border border-slate-700 bg-slate-900 p-3 text-left text-white shadow-xl">
                            <h4 className="mb-2 text-xs font-semibold">Teaching staff</h4>
                            {staffByFaculty[faculty.id]?.length ? (
                              <ul className="max-h-48 space-y-1 overflow-y-auto text-xs">
                                {staffByFaculty[faculty.id].map((st) => (
                                  <li key={st.id} className="flex gap-2">
                                    <UserCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                                    <span>{st.full_name}</span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-xs text-slate-300">No staff yet.</p>
                            )}
                          </div>
                        )}
                      </td>
                      <td
                        className="relative px-2 py-3.5 text-center align-middle tabular-nums text-slate-800"
                        onMouseEnter={() => { setHoverFacultyId(faculty.id); setHoverMetric('students') }}
                        onMouseLeave={() => setHoverMetric(null)}
                      >
                        <span className="inline-flex items-center justify-center gap-1">
                          <GraduationCap className="h-4 w-4 shrink-0 text-pink-600" strokeWidth={2} />
                          {s}
                        </span>
                        {hoverFacultyId === faculty.id && hoverMetric === 'students' && (
                          <div className="absolute right-0 top-full z-30 mt-1 w-64 rounded-xl border border-slate-700 bg-slate-900 p-3 text-left text-white shadow-xl">
                            <h4 className="mb-1 text-xs font-semibold">Students</h4>
                            <p className="text-lg font-bold">{s}</p>
                            <p className="text-[11px] text-slate-300">From latest enrollment reports for programs under this faculty.</p>
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3.5 text-right align-middle">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              go()
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-white px-2.5 py-1.5 text-xs font-medium text-blue-700 shadow-sm transition-colors hover:border-blue-300 hover:bg-blue-50"
                          >
                            Open
                            <ChevronRight className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDelete(faculty.id)
                            }}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                            title="Delete faculty"
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

          {/* Mobile / tablet: quick add + stacked cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:hidden">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            onClick={() => setShowForm(true)}
              className="flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 border-l-4 border-l-blue-600 bg-white p-6 shadow-sm transition-shadow hover:border-slate-400 hover:shadow-md"
          >
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
                <Plus className="h-6 w-6 text-blue-600" />
            </div>
              <span className="text-sm font-semibold text-slate-800">Add Faculty</span>
              <span className="mt-1 text-center text-xs text-slate-500">Create a new faculty record</span>
          </motion.div>

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
              if (d) insightParts.push(`${d} dept${d !== 1 ? 's' : ''}`)
              if (p) insightParts.push(`${p} prog`)
              if (t) insightParts.push(`${t} staff`)
              if (s) insightParts.push(`${s} stud`)
              const insightText = insightParts.length ? insightParts.join(' · ') : 'No activity yet'
            return (
              <motion.div
                key={faculty.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: (index + 1) * 0.05 }}
                onClick={() => campusIdForNav && navigate(`/ufp/campus/${campusIdForNav}/faculty/${faculty.id}`)}
                  className="relative flex cursor-pointer flex-col rounded-xl border border-slate-200 border-l-4 border-l-blue-600 bg-white p-5 shadow-sm transition-shadow hover:border-slate-300 hover:shadow-md"
                title={insightText}
              >
                <button
                    type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(faculty.id)
                  }}
                    className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                  title="Delete faculty"
                >
                    <Trash2 className="h-4 w-4" />
                </button>
                  <div className="mb-3 flex justify-center">
                    <button
                      type="button"
                      title="Change faculty emblem"
                      aria-label={`Upload emblem for ${faculty.name}`}
                      disabled={!!emblemUploadingFacultyId}
                      onClick={(e) => openFacultyEmblemPicker(faculty.id, e)}
                      className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white ring-offset-2 transition hover:ring-2 hover:ring-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                    >
                    {faculty.emblem_url ? (
                        <img src={faculty.emblem_url} alt="" className="h-full w-full object-contain p-1" />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center bg-slate-50">
                          <Building2 className="h-10 w-10 text-slate-400" />
                      </div>
                    )}
                      {emblemUploadingFacultyId === faculty.id && (
                        <span className="absolute inset-0 flex items-center justify-center bg-white/85">
                          <Loader2 className="h-6 w-6 animate-spin text-blue-600" aria-hidden />
                        </span>
                      )}
                    </button>
                  </div>
                  <h3 className="mb-1 break-words text-center text-base font-semibold leading-snug text-slate-900" title={faculty.name}>
                        {faculty.name}
                      </h3>
                  <p className="mb-1 text-center font-mono text-xs text-slate-500">{faculty.code}</p>
                      {!campusId && faculty.campuses?.name && (
                    <p className="mb-2 text-center text-xs text-slate-500">{faculty.campuses.name}</p>
                      )}
                  <p className="mb-3 text-center text-sm text-slate-600">Dean: {faculty.dean_name || '—'}</p>
                  <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 text-sm">
                      <div
                      className="relative flex items-center justify-center gap-1 rounded-lg bg-slate-50 py-2"
                        onMouseEnter={() => { setHoverFacultyId(faculty.id); setHoverMetric('depts') }}
                        onMouseLeave={() => setHoverMetric(null)}
                      >
                      <Building2 className="h-4 w-4 text-blue-600" strokeWidth={2} />
                      <span className="font-semibold tabular-nums">{d}</span>
                      <span className="text-xs text-slate-500">Depts</span>
                        {hoverFacultyId === faculty.id && hoverMetric === 'depts' && (
                        <div className="absolute bottom-full left-1/2 z-20 mb-2 w-64 -translate-x-1/2 rounded-xl border border-slate-700 bg-slate-900 p-3 text-left text-white shadow-xl">
                          <h4 className="mb-2 text-xs font-semibold">Departments</h4>
                          {departmentsByFaculty[faculty.id]?.length ? (
                            <ul className="max-h-40 space-y-1 overflow-y-auto text-xs">
                                {departmentsByFaculty[faculty.id].map((dpt) => (
                                <li key={dpt.id}>{dpt.name}</li>
                                ))}
                              </ul>
                            ) : (
                            <p className="text-xs text-slate-300">None yet.</p>
                            )}
                          </div>
                        )}
                      </div>
                      <div
                      className="relative flex items-center justify-center gap-1 rounded-lg bg-slate-50 py-2"
                        onMouseEnter={() => { setHoverFacultyId(faculty.id); setHoverMetric('programs') }}
                        onMouseLeave={() => setHoverMetric(null)}
                      >
                      <BookOpen className="h-4 w-4 text-amber-500" strokeWidth={2} />
                      <span className="font-semibold tabular-nums">{p}</span>
                      <span className="text-xs text-slate-500">Prog</span>
                        {hoverFacultyId === faculty.id && hoverMetric === 'programs' && (
                        <div className="absolute bottom-full left-1/2 z-20 mb-2 w-64 -translate-x-1/2 rounded-xl border border-slate-700 bg-slate-900 p-3 text-left text-white shadow-xl">
                          <h4 className="mb-2 text-xs font-semibold">Programs</h4>
                          {programsByFaculty[faculty.id]?.length ? (
                            <ul className="max-h-40 space-y-1 overflow-y-auto text-xs">
                                {programsByFaculty[faculty.id].map((prog) => (
                                <li key={prog.id}>{prog.name}</li>
                                ))}
                              </ul>
                            ) : (
                            <p className="text-xs text-slate-300">None yet.</p>
                            )}
                          </div>
                        )}
                      </div>
                      <div
                      className="relative flex items-center justify-center gap-1 rounded-lg bg-slate-50 py-2"
                        onMouseEnter={() => { setHoverFacultyId(faculty.id); setHoverMetric('staff') }}
                        onMouseLeave={() => setHoverMetric(null)}
                      >
                      <UserCheck className="h-4 w-4 text-emerald-600" strokeWidth={2} />
                      <span className="font-semibold tabular-nums">{t}</span>
                      <span className="text-xs text-slate-500">Staff</span>
                        {hoverFacultyId === faculty.id && hoverMetric === 'staff' && (
                        <div className="absolute bottom-full left-1/2 z-20 mb-2 w-64 -translate-x-1/2 rounded-xl border border-slate-700 bg-slate-900 p-3 text-left text-white shadow-xl">
                          <h4 className="mb-2 text-xs font-semibold">Staff</h4>
                          {staffByFaculty[faculty.id]?.length ? (
                            <ul className="max-h-40 space-y-1 overflow-y-auto text-xs">
                                {staffByFaculty[faculty.id].map((st) => (
                                <li key={st.id}>{st.full_name}</li>
                                ))}
                              </ul>
                            ) : (
                            <p className="text-xs text-slate-300">None yet.</p>
                            )}
                          </div>
                        )}
                      </div>
                      <div
                      className="relative flex items-center justify-center gap-1 rounded-lg bg-slate-50 py-2"
                        onMouseEnter={() => { setHoverFacultyId(faculty.id); setHoverMetric('students') }}
                        onMouseLeave={() => setHoverMetric(null)}
                      >
                      <GraduationCap className="h-4 w-4 text-pink-600" strokeWidth={2} />
                      <span className="font-semibold tabular-nums">{s}</span>
                      <span className="text-xs text-slate-500">Stud</span>
                        {hoverFacultyId === faculty.id && hoverMetric === 'students' && (
                        <div className="absolute bottom-full left-1/2 z-20 mb-2 w-56 -translate-x-1/2 rounded-xl border border-slate-700 bg-slate-900 p-3 text-left text-white shadow-xl">
                          <p className="text-lg font-bold">{s}</p>
                          <p className="text-[11px] text-slate-300">Enrollment total</p>
                          </div>
                        )}
                      </div>
                    </div>
                  <p className="mt-3 text-center text-xs font-medium text-blue-700">Tap to open faculty</p>
              </motion.div>
            )
          })}
        </div>
        </section>
      )}

      </UfpAdminContainer>

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
                  <input
                    type="text"
                    value={deanName}
                    onChange={(e) => setDeanName(e.target.value)}
                    placeholder="Enter dean's full name"
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm"
                    required
                  />
                <p className="mt-2 text-xs leading-relaxed text-slate-500">
                  Kindly register the dean as a staff member as well when possible — it keeps records aligned and helps with board management workflows.
                </p>
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
                <Info className="w-5 h-5 text-blue-600" />
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
    </UfpAdminShell>
  )
}

export default FacultyManagement
