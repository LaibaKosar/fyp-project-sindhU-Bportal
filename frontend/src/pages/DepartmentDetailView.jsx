import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabaseClient'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Building2,
  Plus,
  Loader2,
  BookOpen,
  UserCheck,
  GraduationCap,
  FileText,
  User,
  Search,
  SlidersHorizontal,
  Trash2,
  Briefcase
} from 'lucide-react'
import Breadcrumbs from '../components/Breadcrumbs'
import { UfpAdminShell, UfpAdminContainer, UfpAdminLoadingCenter } from '../components/UfpAdminShell'
import UfpLeadershipPanel from '../components/UfpLeadershipPanel'
import AddProgramInlineModal from '../components/AddProgramInlineModal'
import AddTeachingStaffInlineModal from '../components/AddTeachingStaffInlineModal'

/** Must match `DEGREE_LEVELS` in ProgramManagement.jsx (add program form). */
const PROGRAM_DEGREE_LEVEL_FILTER_OPTIONS = [
  'Undergraduate',
  'Graduate (MS/M.Phil)',
  'Postgraduate (PhD)'
]

/** Align with StaffManagement.jsx teaching-staff form options. */
const ACADEMIC_DESIGNATION_OPTIONS = [
  'Professor',
  'Associate Professor',
  'Assistant Professor',
  'Lecturer',
  'Instructor',
  'Lab Instructor'
]

const STAFF_EMPLOYMENT_TYPE_OPTIONS = ['Permanent', 'Contract', 'Visiting', 'Daily Wages']

const STAFF_ADMINISTRATIVE_ROLE_OPTIONS = [
  'No Additional Role',
  'Dean',
  'Head of Department',
  'Director',
  'Chairperson',
  'Program Coordinator'
]

const STAFF_GENDER_OPTIONS = ['Male', 'Female', 'Prefer not to say']

function DepartmentDetailView() {
  const navigate = useNavigate()
  const { id: campusId, facultyId, deptId } = useParams()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [campus, setCampus] = useState(null)
  const [faculty, setFaculty] = useState(null)
  const [department, setDepartment] = useState(null)
  const [programs, setPrograms] = useState([])
  const [teachingStaff, setTeachingStaff] = useState([])
  const [nonTeachingStaff, setNonTeachingStaff] = useState([])
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [uploadingLetter, setUploadingLetter] = useState(false)
  const [uploadError, setUploadError] = useState(null)
  const [programSearch, setProgramSearch] = useState('')
  const [programCategoryFilter, setProgramCategoryFilter] = useState('')
  const [programDegreeFilter, setProgramDegreeFilter] = useState('')
  const [programDurationFilter, setProgramDurationFilter] = useState('')
  const [programCreditsFilter, setProgramCreditsFilter] = useState('')
  const [staffSearch, setStaffSearch] = useState('')
  const [staffDesignationFilter, setStaffDesignationFilter] = useState('')
  const [staffEmploymentFilter, setStaffEmploymentFilter] = useState('')
  const [staffAdminRoleFilter, setStaffAdminRoleFilter] = useState('')
  const [staffGenderFilter, setStaffGenderFilter] = useState('')
  const [ntStaffSearch, setNtStaffSearch] = useState('')
  const [ntStaffEmploymentFilter, setNtStaffEmploymentFilter] = useState('')
  const [ntStaffCategoryFilter, setNtStaffCategoryFilter] = useState('')
  const [showAddProgramModal, setShowAddProgramModal] = useState(false)
  const [showAddStaffModal, setShowAddStaffModal] = useState(false)
  const [toast, setToast] = useState(null)
  const staffTablePhotoInputRef = useRef(null)
  const pendingStaffPhotoIdRef = useRef(null)
  const [staffProfilePhotoUploadingId, setStaffProfilePhotoUploadingId] = useState(null)
  const ntStaffTablePhotoInputRef = useRef(null)
  const pendingNtStaffPhotoIdRef = useRef(null)
  const [ntStaffProfilePhotoUploadingId, setNtStaffProfilePhotoUploadingId] = useState(null)

  useEffect(() => {
    loadUserData()
  }, [])

  useEffect(() => {
    if (!user?.university_id || !campusId || !facultyId || !deptId) return
    let cancelled = false
    setLoading(true)
    const run = async () => {
      try {
        await fetchCampus()
        if (cancelled) return
        await fetchFaculty()
        if (cancelled) return
        await fetchDepartment()
        if (cancelled) return
        fetchPrograms()
        fetchTeachingStaff()
        fetchNonTeachingStaff()
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [user, campusId, facultyId, deptId])

  const loadUserData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        navigate('/login')
        return
      }
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('university_id, role')
        .eq('id', session.user.id)
        .single()
      if (error || !profile || profile.role !== 'UFP') {
        navigate('/ufp-dashboard')
        return
      }
      setUser(profile)
      if (!campusId || !facultyId || !deptId) setLoading(false)
    } catch (e) {
      console.error(e)
      navigate('/login')
    }
  }

  const fetchCampus = async () => {
    if (!campusId || !user?.university_id) return
    const { data, error } = await supabase
      .from('campuses')
      .select('id, name')
      .eq('id', campusId)
      .eq('university_id', user.university_id)
      .single()
    if (error) {
      navigate('/ufp/campuses')
      return
    }
    setCampus(data)
  }

  const fetchFaculty = async () => {
    if (!facultyId || !user?.university_id) return
    const { data, error } = await supabase
      .from('faculties')
      .select('id, name, code')
      .eq('id', facultyId)
      .eq('university_id', user.university_id)
      .single()
    if (error || !data) {
      navigate(`/ufp/campus/${campusId}`)
      return
    }
    setFaculty(data)
  }

  const fetchDepartment = async () => {
    if (!deptId || !user?.university_id) return
    const { data, error } = await supabase
      .from('departments')
      .select('*')
      .eq('id', deptId)
      .eq('university_id', user.university_id)
      .eq('faculty_id', facultyId)
      .single()
    if (error || !data) {
      navigate(`/ufp/campus/${campusId}/faculty/${facultyId}`)
      return
    }
    setDepartment(data)
  }

  const fetchPrograms = async () => {
    if (!deptId || !user?.university_id) return
    const { data, error } = await supabase
      .from('programs')
      .select('id, name, category, degree_level, duration_years, total_credit_hours')
      .eq('university_id', user.university_id)
      .eq('department_id', deptId)
      .order('name', { ascending: true })
    if (error) {
      console.error('Error fetching programs:', error)
      return
    }
    setPrograms(data || [])
  }

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 5000)
  }

  const fetchTeachingStaff = async () => {
    if (!deptId || !user?.university_id) return
    const { data, error } = await supabase
      .from('staff')
      .select(
        'id, full_name, academic_designation, designation, profile_photo_url, qualification, specialization, email, phone, gender, employment_type, administrative_role'
      )
      .eq('university_id', user.university_id)
      .eq('department_id', deptId)
      .eq('type', 'Teaching')
      .order('full_name', { ascending: true })
    if (error) {
      console.error('Error fetching teaching staff:', error)
      return
    }
    setTeachingStaff(data || [])
  }

  const fetchNonTeachingStaff = async () => {
    if (!deptId || !user?.university_id) return
    const { data, error } = await supabase
      .from('staff')
      .select(
        'id, full_name, category, designation, profile_photo_url, email, phone, gender, employment_type'
      )
      .eq('university_id', user.university_id)
      .eq('department_id', deptId)
      .eq('type', 'Non-Teaching')
      .order('full_name', { ascending: true })
    if (error) {
      console.error('Error fetching non-teaching staff:', error)
      return
    }
    setNonTeachingStaff(data || [])
  }

  const handleDeleteProgram = async (programId) => {
    if (!confirm('Are you sure you want to delete this program? This action cannot be undone.')) {
      return
    }
    try {
      const { error } = await supabase
        .from('programs')
        .delete()
        .eq('id', programId)
        .eq('department_id', deptId)
      if (error) throw error
      await fetchPrograms()
      showToast('Program deleted successfully.')
    } catch (error) {
      console.error('Error deleting program:', error)
      showToast(error.message || 'Error deleting program', 'error')
    }
  }

  const handleDeleteTeachingStaff = async (staffId) => {
    if (!confirm('Are you sure you want to delete this staff member? This action cannot be undone.')) {
      return
    }
    try {
      const { error } = await supabase
        .from('staff')
        .delete()
        .eq('id', staffId)
        .eq('department_id', deptId)
        .eq('type', 'Teaching')
      if (error) throw error
      await fetchTeachingStaff()
      showToast('Staff member deleted successfully.')
    } catch (error) {
      console.error('Error deleting staff:', error)
      showToast(error.message || 'Error deleting staff member', 'error')
    }
  }

  const handleDeleteNonTeachingStaff = async (staffId) => {
    if (!confirm('Are you sure you want to delete this staff member? This action cannot be undone.')) {
      return
    }
    try {
      const { error } = await supabase
        .from('staff')
        .delete()
        .eq('id', staffId)
        .eq('department_id', deptId)
        .eq('type', 'Non-Teaching')
      if (error) throw error
      await fetchNonTeachingStaff()
      showToast('Staff member deleted successfully.')
    } catch (error) {
      console.error('Error deleting staff:', error)
      showToast(error.message || 'Error deleting staff member', 'error')
    }
  }

  const openStaffTablePhotoPicker = (staffId) => {
    if (staffProfilePhotoUploadingId || ntStaffProfilePhotoUploadingId) return
    pendingStaffPhotoIdRef.current = staffId
    staffTablePhotoInputRef.current?.click()
  }

  const handleStaffTablePhotoChange = async (e) => {
    const file = e.target.files?.[0]
    const staffId = pendingStaffPhotoIdRef.current
    e.target.value = ''
    pendingStaffPhotoIdRef.current = null
    if (!file || !staffId || !user?.university_id || !deptId) return
    if (!file.type.startsWith('image/')) {
      showToast('Please choose an image file.', 'error')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image must be 5MB or smaller.', 'error')
      return
    }
    setStaffProfilePhotoUploadingId(staffId)
    try {
      const fileName = `staff-photo-${user.university_id}-${Date.now()}-${file.name.replace(/\s/g, '-')}`
      const { error: uploadError } = await supabase.storage
        .from('staff-profiles')
        .upload(fileName, file, { cacheControl: '3600', upsert: false })
      if (uploadError) throw new Error(uploadError.message)
      const { data: urlData } = supabase.storage.from('staff-profiles').getPublicUrl(fileName)
      const publicUrl = urlData?.publicUrl
      if (!publicUrl) throw new Error('Could not get file URL')
      const urlWithCache = `${publicUrl}?t=${Date.now()}`
      const { error: updateError } = await supabase
        .from('staff')
        .update({ profile_photo_url: urlWithCache })
        .eq('id', staffId)
        .eq('department_id', deptId)
        .eq('type', 'Teaching')
      if (updateError) throw new Error(updateError.message)
      await fetchTeachingStaff()
      showToast('Staff photo updated.')
    } catch (err) {
      console.error(err)
      showToast(err.message || 'Failed to upload photo', 'error')
    } finally {
      setStaffProfilePhotoUploadingId(null)
    }
  }

  const openNtStaffTablePhotoPicker = (staffId) => {
    if (ntStaffProfilePhotoUploadingId || staffProfilePhotoUploadingId) return
    pendingNtStaffPhotoIdRef.current = staffId
    ntStaffTablePhotoInputRef.current?.click()
  }

  const handleNtStaffTablePhotoChange = async (e) => {
    const file = e.target.files?.[0]
    const staffId = pendingNtStaffPhotoIdRef.current
    e.target.value = ''
    pendingNtStaffPhotoIdRef.current = null
    if (!file || !staffId || !user?.university_id || !deptId) return
    if (!file.type.startsWith('image/')) {
      showToast('Please choose an image file.', 'error')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image must be 5MB or smaller.', 'error')
      return
    }
    setNtStaffProfilePhotoUploadingId(staffId)
    try {
      const fileName = `staff-photo-${user.university_id}-${Date.now()}-${file.name.replace(/\s/g, '-')}`
      const { error: uploadError } = await supabase.storage
        .from('staff-profiles')
        .upload(fileName, file, { cacheControl: '3600', upsert: false })
      if (uploadError) throw new Error(uploadError.message)
      const { data: urlData } = supabase.storage.from('staff-profiles').getPublicUrl(fileName)
      const publicUrl = urlData?.publicUrl
      if (!publicUrl) throw new Error('Could not get file URL')
      const urlWithCache = `${publicUrl}?t=${Date.now()}`
      const { error: updateError } = await supabase
        .from('staff')
        .update({ profile_photo_url: urlWithCache })
        .eq('id', staffId)
        .eq('department_id', deptId)
        .eq('type', 'Non-Teaching')
      if (updateError) throw new Error(updateError.message)
      await fetchNonTeachingStaff()
      showToast('Staff photo updated.')
    } catch (err) {
      console.error(err)
      showToast(err.message || 'Failed to upload photo', 'error')
    } finally {
      setNtStaffProfilePhotoUploadingId(null)
    }
  }

  const uploadHodPhoto = async (file) => {
    if (!file || !user?.university_id || !deptId) return
    setUploadError(null)
    setUploadingPhoto(true)
    try {
      const fileName = `hod-photo-${user.university_id}-${Date.now()}-${file.name.replace(/\s/g, '-')}`
      const { error: upErr } = await supabase.storage.from('official_photos').upload(fileName, file, { cacheControl: '3600', upsert: true })
      if (upErr) throw new Error(upErr.message || 'Upload failed')
      const { data: urlData } = supabase.storage.from('official_photos').getPublicUrl(fileName)
      const url = urlData?.publicUrl
      if (!url) throw new Error('Failed to get URL')
      const { error: dbErr } = await supabase.from('departments').update({ hod_photo_url: url }).eq('id', deptId).eq('university_id', user.university_id)
      if (dbErr) throw new Error(dbErr.message || 'Database update failed')
      setDepartment((d) => (d ? { ...d, hod_photo_url: url } : d))
      await fetchDepartment()
    } catch (e) {
      console.error('HOD photo upload error:', e)
      setUploadError(e.message || 'Failed to upload photo')
    } finally {
      setUploadingPhoto(false)
    }
  }

  const uploadHodLetter = async (file) => {
    if (!file || !user?.university_id || !deptId) return
    setUploadError(null)
    setUploadingLetter(true)
    try {
      const ext = file.name.split('.').pop() || 'pdf'
      const fileName = `hod-letter-${user.university_id}-${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('appointment_letters').upload(fileName, file, { cacheControl: '3600', upsert: true })
      if (upErr) throw new Error(upErr.message || 'Upload failed')
      const { data: urlData } = supabase.storage.from('appointment_letters').getPublicUrl(fileName)
      const url = urlData?.publicUrl
      if (!url) throw new Error('Failed to get URL')
      const { error: dbErr } = await supabase.from('departments').update({ hod_appointment_letter_url: url }).eq('id', deptId).eq('university_id', user.university_id)
      if (dbErr) throw new Error(dbErr.message || 'Database update failed')
      setDepartment((d) => (d ? { ...d, hod_appointment_letter_url: url } : d))
      await fetchDepartment()
    } catch (e) {
      console.error('HOD letter upload error:', e)
      setUploadError(e.message || 'Failed to upload letter')
    } finally {
      setUploadingLetter(false)
    }
  }

  if (loading) {
    return <UfpAdminLoadingCenter />
  }

  if (!campus || !faculty || !department) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="text-center">
          <Building2 className="mx-auto mb-4 h-14 w-14 text-slate-300" />
          <h2 className="mb-3 text-xl font-semibold text-slate-900">Not Found</h2>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            Back
          </button>
        </div>
      </div>
    )
  }

  const displayDesignation = (s) => s.academic_designation || s.designation || null

  const programCategories = [...new Set(programs.map((p) => p.category).filter(Boolean))].sort()
  const degreeLevelsFromData = [...new Set(programs.map((p) => p.degree_level).filter(Boolean))]
  const extraDegreeLevels = degreeLevelsFromData
    .filter((l) => !PROGRAM_DEGREE_LEVEL_FILTER_OPTIONS.includes(l))
    .sort((a, b) => a.localeCompare(b))
  const programDegreeLevelFilterOptions = [...PROGRAM_DEGREE_LEVEL_FILTER_OPTIONS, ...extraDegreeLevels]
  const programDurations = [
    ...new Set(
      programs
        .map((p) => p.duration_years)
        .filter((y) => y != null && y !== '')
        .map((y) => String(y))
    )
  ].sort((a, b) => Number(a) - Number(b))
  const programCreditOptions = [
    ...new Set(
      programs
        .map((p) => p.total_credit_hours)
        .filter((c) => c != null && c !== '')
        .map((c) => String(c))
    )
  ].sort((a, b) => Number(a) - Number(b))
  const staffDesignationsFromData = [...new Set(teachingStaff.map((s) => displayDesignation(s)).filter(Boolean))]
  const staffDesignationFilterOptions = [
    ...ACADEMIC_DESIGNATION_OPTIONS,
    ...staffDesignationsFromData
      .filter((d) => !ACADEMIC_DESIGNATION_OPTIONS.includes(d))
      .sort((a, b) => a.localeCompare(b))
  ]
  const filteredPrograms = programs.filter((p) => {
    const q = programSearch.trim().toLowerCase()
    const matchSearch =
      !q ||
      (p.name || '').toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q) ||
      (p.degree_level || '').toLowerCase().includes(q)
    const matchCategory = !programCategoryFilter || (p.category || '') === programCategoryFilter
    const matchDegree = !programDegreeFilter || (p.degree_level || '') === programDegreeFilter
    const matchDuration =
      !programDurationFilter || String(p.duration_years ?? '') === programDurationFilter
    const matchCredits =
      !programCreditsFilter || String(p.total_credit_hours ?? '') === programCreditsFilter
    return matchSearch && matchCategory && matchDegree && matchDuration && matchCredits
  })

  const ntCategoryFilterOptions = [
    ...new Set(nonTeachingStaff.map((s) => s.category).filter(Boolean))
  ].sort((a, b) => String(a).localeCompare(String(b)))

  const filteredNonTeachingStaff = nonTeachingStaff.filter((s) => {
    const q = ntStaffSearch.trim().toLowerCase()
    const matchSearch =
      !q ||
      (s.full_name || '').toLowerCase().includes(q) ||
      (s.email || '').toLowerCase().includes(q) ||
      (s.phone || '').toLowerCase().replace(/\s/g, '').includes(q.replace(/\s/g, '')) ||
      (s.designation || '').toLowerCase().includes(q) ||
      (s.category || '').toLowerCase().includes(q)
    const matchEmployment =
      !ntStaffEmploymentFilter || (s.employment_type || '') === ntStaffEmploymentFilter
    const matchCategory = !ntStaffCategoryFilter || (s.category || '') === ntStaffCategoryFilter
    return matchSearch && matchEmployment && matchCategory
  })

  const filteredTeachingStaff = teachingStaff.filter((s) => {
    const q = staffSearch.trim().toLowerCase()
    const matchSearch =
      !q ||
      (s.full_name || '').toLowerCase().includes(q) ||
      (s.email || '').toLowerCase().includes(q) ||
      (s.phone || '').toLowerCase().replace(/\s/g, '').includes(q.replace(/\s/g, '')) ||
      (s.qualification || '').toLowerCase().includes(q) ||
      (s.specialization || '').toLowerCase().includes(q) ||
      (s.administrative_role || '').toLowerCase().includes(q)
    const designation = displayDesignation(s)
    const matchDesignation = !staffDesignationFilter || designation === staffDesignationFilter
    const matchEmployment =
      !staffEmploymentFilter || (s.employment_type || '') === staffEmploymentFilter
    const adminRole = s.administrative_role || 'No Additional Role'
    const matchAdminRole = !staffAdminRoleFilter || adminRole === staffAdminRoleFilter
    const matchGender = !staffGenderFilter || (s.gender || '') === staffGenderFilter
    return (
      matchSearch &&
      matchDesignation &&
      matchEmployment &&
      matchAdminRole &&
      matchGender
    )
  })

  return (
    <UfpAdminShell>
      <UfpAdminContainer>
        <motion.div
          initial={{ y: -12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="mb-10 rounded-xl border border-slate-200/90 border-t-[3px] border-t-blue-600 bg-gradient-to-br from-white via-blue-50/25 to-blue-50/20 p-5 shadow-md shadow-blue-900/5 shadow-slate-300/20 ring-1 ring-blue-950/[0.05] ring-slate-200/45 sm:mb-12 sm:p-6"
        >
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
            <div className="min-w-0 flex-1">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="mb-4 inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:border-blue-200 hover:bg-slate-50 hover:text-blue-900"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <Breadcrumbs
                items={[
                  { label: 'Dashboard', path: '/ufp-dashboard' },
                  { label: campus.name, path: `/ufp/campus/${campusId}` },
                  { label: 'Faculties', path: `/ufp/campus/${campusId}/faculties` },
                  { label: faculty.name, path: `/ufp/campus/${campusId}/faculty/${facultyId}` },
                  { label: department.name }
                ]}
                className="mb-2 text-sm text-slate-500"
              />
              <div className="flex items-start gap-3">
                <div
                  className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600/22 to-blue-700/12 text-blue-700 shadow-sm ring-1 ring-blue-300/55"
                  aria-hidden
                >
                  <Building2 className="h-5 w-5" strokeWidth={2} />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="mb-1 text-2xl font-bold tracking-tight text-slate-900">{department.name}</h2>
                  {department.code && (
                    <span className="font-mono text-xs text-slate-600">{department.code}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="w-full shrink-0 lg:max-w-md lg:w-[400px]">
              <UfpLeadershipPanel
                roleLabel="Head of Department"
                displayName={department.head_of_department}
                emptyDisplayLabel="No HOD set"
                photoUrl={department.hod_photo_url}
                photoAlt={department.head_of_department || 'HOD'}
                photoInputId="hod-photo-upload-dept"
                letterInputId="hod-letter-upload-dept"
                letterUrl={department.hod_appointment_letter_url}
                uploadError={uploadError}
                uploadingPhoto={uploadingPhoto}
                uploadingLetter={uploadingLetter}
                onPhotoChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) uploadHodPhoto(f)
                  e.target.value = ''
                }}
                onLetterChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) uploadHodLetter(f)
                  e.target.value = ''
                }}
                photoChangeOverlay
                trailingSlot={<FileText className="h-4 w-4 shrink-0 text-blue-600/70" aria-hidden />}
                letterIdleLabel="No letter uploaded — click to upload"
                letterUploadingLabel="Uploading..."
              />
            </div>
          </div>
        </motion.div>

        <div className="min-w-0">

          <section className="mb-12 overflow-hidden rounded-xl border border-slate-200/90 bg-gradient-to-br from-slate-50/95 via-white to-violet-50/45 shadow-sm shadow-violet-900/[0.05] ring-1 ring-violet-950/[0.06] ring-slate-200/45">
            <div className="border-b border-violet-300/70 bg-gradient-to-r from-violet-100/85 via-violet-50/75 to-fuchsia-50/35 px-4 py-3.5 sm:px-5 sm:py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2.5">
                  <BookOpen className="h-6 w-6 shrink-0 text-violet-600" aria-hidden />
                  <h3 className="text-2xl font-bold tracking-tight text-slate-900">Programs</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddProgramModal(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-violet-700"
                >
                  <Plus className="h-4 w-4" />
                  Add Program
                </button>
              </div>
            </div>
            <div className="p-4 sm:p-5">
            {programs.length > 0 && (
              <div className="mb-5 space-y-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                  <div className="relative min-w-[min(100%,220px)] flex-1 sm:max-w-md">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search name, category, or degree level..."
                      value={programSearch}
                      onChange={(e) => setProgramSearch(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <SlidersHorizontal className="h-4 w-4 shrink-0 text-violet-600/80 max-sm:hidden" aria-hidden />
                    <select
                      value={programCategoryFilter}
                      onChange={(e) => setProgramCategoryFilter(e.target.value)}
                      className="min-w-[9.5rem] rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                      aria-label="Filter by category"
                    >
                      <option value="">All categories</option>
                      {programCategories.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                    <select
                      value={programDegreeFilter}
                      onChange={(e) => setProgramDegreeFilter(e.target.value)}
                      className="min-w-[9.5rem] rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                      aria-label="Filter by degree level"
                    >
                      <option value="">All degree levels</option>
                      {programDegreeLevelFilterOptions.map((lvl) => (
                        <option key={lvl} value={lvl}>{lvl}</option>
                      ))}
                    </select>
                    {programDurations.length > 0 && (
                      <select
                        value={programDurationFilter}
                        onChange={(e) => setProgramDurationFilter(e.target.value)}
                        className="min-w-[9.5rem] rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                        aria-label="Filter by program duration"
                      >
                        <option value="">All durations</option>
                        {programDurations.map((y) => (
                          <option key={y} value={y}>
                            {y} {y === '1' ? 'year' : 'years'}
                          </option>
                        ))}
                      </select>
                    )}
                    {programCreditOptions.length > 0 && (
                      <select
                        value={programCreditsFilter}
                        onChange={(e) => setProgramCreditsFilter(e.target.value)}
                        className="min-w-[10rem] rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                        aria-label="Filter by total credit hours"
                      >
                        <option value="">All credit hours</option>
                        {programCreditOptions.map((c) => (
                          <option key={c} value={c}>{c} credits</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              </div>
            )}
            {programs.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                <BookOpen className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                <p className="mb-4 text-sm text-slate-600">No programs yet.</p>
                <button
                  type="button"
                  onClick={() => setShowAddProgramModal(true)}
                  className="rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-violet-700"
                >
                  Add Program
                </button>
              </div>
            ) : filteredPrograms.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                <p className="text-sm text-slate-600">No programs match your search or filter.</p>
                <button
                  type="button"
                  onClick={() => {
                    setProgramSearch('')
                    setProgramCategoryFilter('')
                    setProgramDegreeFilter('')
                    setProgramDurationFilter('')
                    setProgramCreditsFilter('')
                  }}
                  className="mt-3 text-sm font-medium text-violet-700 hover:text-violet-900"
                >
                  Clear search & filters
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
                <table className="w-full min-w-[920px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b-2 border-violet-200/85 bg-gradient-to-r from-violet-100/90 via-fuchsia-50/90 to-violet-100/85">
                      <th className="px-4 py-3.5 text-xs font-bold uppercase tracking-wide text-slate-900">Program</th>
                      <th className="px-4 py-3.5 text-xs font-bold uppercase tracking-wide text-slate-900">Category</th>
                      <th className="px-4 py-3.5 text-xs font-bold uppercase tracking-wide text-slate-900">Degree</th>
                      <th className="whitespace-nowrap px-4 py-3.5 text-xs font-bold uppercase tracking-wide text-slate-900">Duration</th>
                      <th className="whitespace-nowrap px-4 py-3.5 text-xs font-bold uppercase tracking-wide text-slate-900">Credits</th>
                      <th className="px-4 py-3.5 text-xs font-bold uppercase tracking-wide text-slate-900">Enrollment</th>
                      <th className="w-14 px-3 py-3.5 text-center text-xs font-bold uppercase tracking-wide text-slate-900" aria-label="Actions" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/80">
                    {filteredPrograms.map((prog) => (
                      <tr
                        key={prog.id}
                        className="odd:bg-white even:bg-slate-50/70 transition-colors hover:bg-violet-50/60"
                      >
                        <td className="px-4 py-3.5 font-medium text-slate-900">{prog.name}</td>
                        <td className="px-4 py-3.5 text-slate-600">{prog.category || '—'}</td>
                        <td className="px-4 py-3.5 text-slate-700">{prog.degree_level || '—'}</td>
                        <td className="whitespace-nowrap px-4 py-3.5 text-slate-600">
                          {prog.duration_years != null && prog.duration_years !== ''
                            ? `${prog.duration_years} ${Number(prog.duration_years) === 1 ? 'yr' : 'yrs'}`
                            : '—'}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5 text-slate-600">
                          {prog.total_credit_hours != null && prog.total_credit_hours !== '' ? prog.total_credit_hours : '—'}
                        </td>
                        <td className="px-4 py-3.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              navigate(
                                `/ufp/students?campusId=${campusId}&programId=${prog.id}&returnTo=department&returnCampusId=${campusId}&returnFacultyId=${facultyId}&returnDeptId=${deptId}`
                              )
                            }}
                            className="inline-flex items-center gap-1 text-sm font-medium text-violet-700 hover:text-violet-900"
                          >
                            <GraduationCap className="h-4 w-4 shrink-0 text-violet-600" />
                            Add / view enrollment
                          </button>
                        </td>
                        <td className="px-2 py-3.5 text-center align-middle">
                          <button
                            type="button"
                            title="Delete program"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteProgram(prog.id)
                            }}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-600/90 bg-red-600 text-white shadow-sm transition-colors hover:border-red-700 hover:bg-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            </div>
          </section>

          <section className="mb-12 overflow-hidden rounded-xl border border-slate-200/90 bg-gradient-to-br from-slate-50/95 via-white to-blue-50/40 shadow-sm shadow-blue-900/[0.04] ring-1 ring-blue-950/[0.04] ring-slate-200/45">
            <div className="border-b border-blue-300/70 bg-gradient-to-r from-blue-100/85 via-blue-50/70 to-indigo-100/35 px-4 py-3.5 sm:px-5 sm:py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2.5">
                  <UserCheck className="h-6 w-6 shrink-0 text-blue-600" aria-hidden />
                  <h3 className="text-2xl font-bold tracking-tight text-slate-900">Teaching Staff</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddStaffModal(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  Add Teaching Staff
                </button>
              </div>
            </div>
            <div className="p-4 sm:p-5">
            {teachingStaff.length > 0 && (
              <div className="mb-5 space-y-3">
                <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
                  <div className="relative min-w-[min(100%,220px)] flex-1 lg:max-w-md">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search name, email, phone, qualification, specialization…"
                      value={staffSearch}
                      onChange={(e) => setStaffSearch(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <SlidersHorizontal className="h-4 w-4 shrink-0 text-blue-600/80 max-sm:hidden" aria-hidden />
                    <select
                      value={staffDesignationFilter}
                      onChange={(e) => setStaffDesignationFilter(e.target.value)}
                      className="min-w-[9.5rem] rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      aria-label="Filter by academic designation"
                    >
                      <option value="">All designations</option>
                      {staffDesignationFilterOptions.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                    <select
                      value={staffEmploymentFilter}
                      onChange={(e) => setStaffEmploymentFilter(e.target.value)}
                      className="min-w-[9.5rem] rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      aria-label="Filter by employment type"
                    >
                      <option value="">All employment</option>
                      {STAFF_EMPLOYMENT_TYPE_OPTIONS.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    <select
                      value={staffAdminRoleFilter}
                      onChange={(e) => setStaffAdminRoleFilter(e.target.value)}
                      className="min-w-[10.5rem] rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      aria-label="Filter by administrative role"
                    >
                      <option value="">All admin roles</option>
                      {STAFF_ADMINISTRATIVE_ROLE_OPTIONS.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                    <select
                      value={staffGenderFilter}
                      onChange={(e) => setStaffGenderFilter(e.target.value)}
                      className="min-w-[9rem] rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      aria-label="Filter by gender"
                    >
                      <option value="">All genders</option>
                      {STAFF_GENDER_OPTIONS.map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
            {teachingStaff.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                <UserCheck className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                <p className="mb-4 text-sm text-slate-600">No teaching staff yet.</p>
                <button
                  type="button"
                  onClick={() => setShowAddStaffModal(true)}
                  className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
                >
                  Add Teaching Staff
                </button>
              </div>
            ) : filteredTeachingStaff.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                <p className="text-sm text-slate-600">No staff match your search or filter.</p>
                <button
                  type="button"
                  onClick={() => {
                    setStaffSearch('')
                    setStaffDesignationFilter('')
                    setStaffEmploymentFilter('')
                    setStaffAdminRoleFilter('')
                    setStaffGenderFilter('')
                  }}
                  className="mt-3 text-sm font-medium text-blue-600 hover:text-blue-800"
                >
                  Clear search & filters
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
                <input
                  ref={staffTablePhotoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleStaffTablePhotoChange}
                  aria-hidden
                />
                <table className="w-full min-w-[940px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b-2 border-blue-200/80 bg-gradient-to-r from-blue-100/90 via-sky-50 to-blue-100/85">
                      <th className="w-14 px-3 py-3.5 text-xs font-bold uppercase tracking-wide text-slate-900" aria-label="Photo" />
                      <th className="min-w-[8rem] px-4 py-3.5 text-xs font-bold uppercase tracking-wide text-slate-900">Name</th>
                      <th className="min-w-[7rem] px-4 py-3.5 text-xs font-bold uppercase tracking-wide text-slate-900">Designation</th>
                      <th className="min-w-[9rem] px-4 py-3.5 text-xs font-bold uppercase tracking-wide text-slate-900">Email</th>
                      <th className="whitespace-nowrap px-4 py-3.5 text-xs font-bold uppercase tracking-wide text-slate-900">Phone</th>
                      <th className="min-w-[6rem] px-4 py-3.5 text-xs font-bold uppercase tracking-wide text-slate-900">Employment</th>
                      <th className="min-w-[7rem] px-4 py-3.5 text-xs font-bold uppercase tracking-wide text-slate-900">Admin role</th>
                      <th className="w-14 px-3 py-3.5 text-center text-xs font-bold uppercase tracking-wide text-slate-900" aria-label="Actions" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/80">
                    {filteredTeachingStaff.map((s) => (
                      <tr
                        key={s.id}
                        className="odd:bg-white even:bg-slate-50/70 transition-colors hover:bg-blue-50/50"
                      >
                        <td className="px-3 py-3.5 align-middle">
                          <button
                            type="button"
                            title="Change staff photo"
                            aria-label={`Upload photo for ${s.full_name || 'staff'}`}
                            disabled={!!staffProfilePhotoUploadingId}
                            onClick={() => openStaffTablePhotoPicker(s.id)}
                            className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-slate-50 text-left ring-offset-1 transition hover:ring-2 hover:ring-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                          >
                            {s.profile_photo_url ? (
                              <img
                                src={s.profile_photo_url}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <User className="h-5 w-5 text-slate-400" aria-hidden />
                            )}
                            {staffProfilePhotoUploadingId === s.id && (
                              <span className="absolute inset-0 flex items-center justify-center bg-white/80">
                                <Loader2 className="h-4 w-4 animate-spin text-blue-600" aria-hidden />
                              </span>
                            )}
                          </button>
                        </td>
                        <td className="px-4 py-3.5 align-middle font-medium text-slate-900">{s.full_name}</td>
                        <td className="px-4 py-3.5 align-middle text-slate-600">{displayDesignation(s) || '—'}</td>
                        <td className="max-w-[11rem] px-4 py-3.5 align-middle text-slate-600">
                          {s.email ? (
                            <a
                              href={`mailto:${s.email}`}
                              className="break-all text-sm font-medium text-blue-600 hover:text-blue-800"
                            >
                              {s.email}
                            </a>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5 align-middle text-slate-600">{s.phone || '—'}</td>
                        <td className="px-4 py-3.5 align-middle text-slate-600">{s.employment_type || '—'}</td>
                        <td className="max-w-[9rem] px-4 py-3.5 align-middle text-slate-600" title={s.administrative_role || 'No Additional Role'}>
                          <span className="line-clamp-2">{s.administrative_role || 'No Additional Role'}</span>
                        </td>
                        <td className="px-2 py-3.5 text-center align-middle">
                          <button
                            type="button"
                            title="Delete staff member"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteTeachingStaff(s.id)
                            }}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-600/90 bg-red-600 text-white shadow-sm transition-colors hover:border-red-700 hover:bg-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-slate-200/90 bg-gradient-to-br from-slate-50/95 via-white to-amber-50/30 shadow-sm shadow-amber-900/[0.04] ring-1 ring-amber-950/[0.04] ring-slate-200/45">
            <div className="border-b border-amber-200/80 bg-gradient-to-r from-amber-100/70 via-slate-50/80 to-amber-50/50 px-4 py-3.5 sm:px-5 sm:py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2.5">
                  <Briefcase className="h-6 w-6 shrink-0 text-amber-700" aria-hidden />
                  <h3 className="text-2xl font-bold tracking-tight text-slate-900">Non-Teaching Staff</h3>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      `/ufp/staff?campusId=${encodeURIComponent(campusId)}&staffType=${encodeURIComponent('Non-Teaching')}&departmentId=${encodeURIComponent(deptId)}&returnPath=${encodeURIComponent(`/ufp/campus/${campusId}/faculty/${facultyId}/department/${deptId}`)}&returnTo=department&facultyId=${encodeURIComponent(facultyId)}&openForm=1`
                    )
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-700 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-amber-800"
                >
                  <Plus className="h-4 w-4" />
                  Add Non-Teaching Staff
                </button>
              </div>
            </div>
            <div className="p-4 sm:p-5">
              {nonTeachingStaff.length > 0 && (
                <div className="mb-5 space-y-3">
                  <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
                    <div className="relative min-w-[min(100%,220px)] flex-1 lg:max-w-md">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search name, email, phone, category, designation…"
                        value={ntStaffSearch}
                        onChange={(e) => setNtStaffSearch(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                      <SlidersHorizontal className="h-4 w-4 shrink-0 text-amber-700/80 max-sm:hidden" aria-hidden />
                      <select
                        value={ntStaffCategoryFilter}
                        onChange={(e) => setNtStaffCategoryFilter(e.target.value)}
                        className="min-w-[10rem] rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                        aria-label="Filter by staff category"
                      >
                        <option value="">All categories</option>
                        {ntCategoryFilterOptions.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                      <select
                        value={ntStaffEmploymentFilter}
                        onChange={(e) => setNtStaffEmploymentFilter(e.target.value)}
                        className="min-w-[9.5rem] rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                        aria-label="Filter by employment type"
                      >
                        <option value="">All employment</option>
                        {STAFF_EMPLOYMENT_TYPE_OPTIONS.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}
              {nonTeachingStaff.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                  <Briefcase className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                  <p className="mb-4 text-sm text-slate-600">No non-teaching staff assigned to this department yet.</p>
                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        `/ufp/staff?campusId=${encodeURIComponent(campusId)}&staffType=${encodeURIComponent('Non-Teaching')}&departmentId=${encodeURIComponent(deptId)}&returnPath=${encodeURIComponent(`/ufp/campus/${campusId}/faculty/${facultyId}/department/${deptId}`)}&returnTo=department&facultyId=${encodeURIComponent(facultyId)}&openForm=1`
                      )
                    }
                    className="rounded-lg bg-amber-700 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-amber-800"
                  >
                    Add Non-Teaching Staff
                  </button>
                </div>
              ) : filteredNonTeachingStaff.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                  <p className="text-sm text-slate-600">No staff match your search or filter.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setNtStaffSearch('')
                      setNtStaffEmploymentFilter('')
                      setNtStaffCategoryFilter('')
                    }}
                    className="mt-3 text-sm font-medium text-amber-800 hover:text-amber-950"
                  >
                    Clear search & filters
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
                  <input
                    ref={ntStaffTablePhotoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleNtStaffTablePhotoChange}
                    aria-hidden
                  />
                  <table className="w-full min-w-[860px] border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b-2 border-amber-200/80 bg-gradient-to-r from-amber-100/90 via-amber-50/80 to-amber-100/85">
                        <th className="w-14 px-3 py-3.5 text-xs font-bold uppercase tracking-wide text-slate-900" aria-label="Photo" />
                        <th className="min-w-[8rem] px-4 py-3.5 text-xs font-bold uppercase tracking-wide text-slate-900">Name</th>
                        <th className="min-w-[7rem] px-4 py-3.5 text-xs font-bold uppercase tracking-wide text-slate-900">Category</th>
                        <th className="min-w-[7rem] px-4 py-3.5 text-xs font-bold uppercase tracking-wide text-slate-900">Designation</th>
                        <th className="min-w-[9rem] px-4 py-3.5 text-xs font-bold uppercase tracking-wide text-slate-900">Email</th>
                        <th className="whitespace-nowrap px-4 py-3.5 text-xs font-bold uppercase tracking-wide text-slate-900">Phone</th>
                        <th className="min-w-[6rem] px-4 py-3.5 text-xs font-bold uppercase tracking-wide text-slate-900">Employment</th>
                        <th className="w-14 px-3 py-3.5 text-center text-xs font-bold uppercase tracking-wide text-slate-900" aria-label="Actions" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/80">
                      {filteredNonTeachingStaff.map((s) => (
                        <tr
                          key={s.id}
                          className="odd:bg-white even:bg-slate-50/70 transition-colors hover:bg-amber-50/40"
                        >
                          <td className="px-3 py-3.5 align-middle">
                            <button
                              type="button"
                              title="Change staff photo"
                              aria-label={`Upload photo for ${s.full_name || 'staff'}`}
                              disabled={!!ntStaffProfilePhotoUploadingId}
                              onClick={() => openNtStaffTablePhotoPicker(s.id)}
                              className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-slate-50 text-left ring-offset-1 transition hover:ring-2 hover:ring-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-600 disabled:opacity-60"
                            >
                              {s.profile_photo_url ? (
                                <img src={s.profile_photo_url} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <User className="h-5 w-5 text-slate-400" aria-hidden />
                              )}
                              {ntStaffProfilePhotoUploadingId === s.id && (
                                <span className="absolute inset-0 flex items-center justify-center bg-white/80">
                                  <Loader2 className="h-4 w-4 animate-spin text-amber-700" aria-hidden />
                                </span>
                              )}
                            </button>
                          </td>
                          <td className="px-4 py-3.5 align-middle font-medium text-slate-900">{s.full_name}</td>
                          <td className="px-4 py-3.5 align-middle text-slate-600">{s.category || '—'}</td>
                          <td className="px-4 py-3.5 align-middle text-slate-600">{s.designation || '—'}</td>
                          <td className="max-w-[11rem] px-4 py-3.5 align-middle text-slate-600">
                            {s.email ? (
                              <a
                                href={`mailto:${s.email}`}
                                className="break-all text-sm font-medium text-amber-800 hover:text-amber-950"
                              >
                                {s.email}
                              </a>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3.5 align-middle text-slate-600">{s.phone || '—'}</td>
                          <td className="px-4 py-3.5 align-middle text-slate-600">{s.employment_type || '—'}</td>
                          <td className="px-2 py-3.5 text-center align-middle">
                            <button
                              type="button"
                              title="Delete staff member"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteNonTeachingStaff(s.id)
                              }}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-600/90 bg-red-600 text-white shadow-sm transition-colors hover:border-red-700 hover:bg-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        </div>
      </UfpAdminContainer>

      <AddProgramInlineModal
        open={showAddProgramModal}
        onClose={() => setShowAddProgramModal(false)}
        universityId={user?.university_id}
        campusId={campusId}
        facultyId={facultyId}
        departmentId={deptId}
        departmentName={department?.name}
        onSaved={async () => {
          await fetchPrograms()
          showToast('Program added successfully.')
        }}
        onError={(m) => showToast(m, 'error')}
      />
      <AddTeachingStaffInlineModal
        open={showAddStaffModal}
        onClose={() => setShowAddStaffModal(false)}
        universityId={user?.university_id}
        campusId={campusId}
        facultyId={facultyId}
        departmentId={deptId}
        departmentName={department?.name}
        onSaved={async () => {
          await fetchTeachingStaff()
          showToast('Teaching staff added successfully.')
        }}
        onError={(m) => showToast(m, 'error')}
      />

      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`fixed bottom-4 right-4 z-[80] max-w-sm rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg ${
            toast.type === 'error' ? 'bg-red-600' : 'bg-emerald-600'
          }`}
        >
          {toast.message}
        </motion.div>
      )}
    </UfpAdminShell>
  )
}

export default DepartmentDetailView
