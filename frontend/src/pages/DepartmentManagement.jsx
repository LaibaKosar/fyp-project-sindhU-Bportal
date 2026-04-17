import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabaseClient'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { 
  Trash2, 
  Plus, 
  Loader2,
  CheckCircle,
  X,
  Building2,
  ArrowLeft,
  Users,
  GraduationCap,
  Camera,
  Upload,
  Edit2,
  MapPin
} from 'lucide-react'
import Breadcrumbs from '../components/Breadcrumbs'
import { UfpAdminShell, UfpAdminContainer, UfpAdminLoadingCenter } from '../components/UfpAdminShell'
import { recordSystemLog } from '../utils/systemLogs'
import { DEPARTMENT_MAPPING, generateDepartmentCode } from '../data/departmentFormPresets'

function DepartmentManagement() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const campusId = searchParams.get('campusId')
  const facultyIdParam = searchParams.get('facultyId')
  const returnTo = searchParams.get('returnTo')
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState(null)
  const [departments, setDepartments] = useState([])
  const [faculties, setFaculties] = useState([])
  const [toast, setToast] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [campusName, setCampusName] = useState(null)

  // Form state (facultyId pre-filled from URL when opening from Faculty Detail)
  const [departmentName, setDepartmentName] = useState('')
  const [departmentCode, setDepartmentCode] = useState('')
  const [facultyId, setFacultyId] = useState(facultyIdParam || '')
  const [selectedFacultyName, setSelectedFacultyName] = useState('')
  const [customDepartmentName, setCustomDepartmentName] = useState('')
  const [hodName, setHodName] = useState('')
  const [hodEmail, setHodEmail] = useState('')
  const [hodPhone, setHodPhone] = useState('')
  const [status, setStatus] = useState('Active')
  const [hodPhotoFile, setHodPhotoFile] = useState(null)
  const [hodPhotoPreview, setHodPhotoPreview] = useState(null)
  const [hodAppointmentLetterFile, setHodAppointmentLetterFile] = useState(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [editingPhotoFor, setEditingPhotoFor] = useState(null)
  const [uploadingLetterFor, setUploadingLetterFor] = useState(null)
  
  // Get available departments based on selected faculty
  const availableDepartments = selectedFacultyName && DEPARTMENT_MAPPING[selectedFacultyName] 
    ? DEPARTMENT_MAPPING[selectedFacultyName] 
    : []

  useEffect(() => {
    loadUserData()
  }, [])

  useEffect(() => {
    if (user?.university_id) {
      if (campusId) {
        fetchFaculties()
        fetchCampusName()
      }
      fetchDepartments()
    }
  }, [user, campusId, facultyIdParam])

  // When opened from Faculty Detail, open add form directly with faculty locked
  useEffect(() => {
    if (facultyIdParam && returnTo === 'faculty' && campusId) {
      setShowForm(true)
    }
  }, [facultyIdParam, returnTo, campusId])

  // When opened from hierarchy with facultyId, keep faculty locked
  useEffect(() => {
    if (facultyIdParam) {
      setFacultyId(facultyIdParam)
    }
  }, [facultyIdParam])

  // Reset department selection when faculty changes
  useEffect(() => {
    if (facultyId) {
      const faculty = faculties.find(f => f.id === facultyId)
      if (faculty) {
        setSelectedFacultyName(faculty.name)
      } else {
        setSelectedFacultyName('')
      }
    } else {
      setSelectedFacultyName('')
    }
    // Reset department fields when faculty changes
    setDepartmentName('')
    setDepartmentCode('')
    setCustomDepartmentName('')
  }, [facultyId, faculties])

  // Auto-generate code when department name changes
  useEffect(() => {
    const noPresetList = facultyId && availableDepartments.length === 0
    if (noPresetList) {
      if (customDepartmentName.trim()) {
        setDepartmentCode(generateDepartmentCode(customDepartmentName))
      } else {
        setDepartmentCode('')
      }
      return
    }
    if (departmentName && departmentName !== 'Other') {
      setDepartmentCode(generateDepartmentCode(departmentName))
    } else if (departmentName === 'Other' && customDepartmentName) {
      setDepartmentCode(generateDepartmentCode(customDepartmentName))
    } else {
      setDepartmentCode('')
    }
  }, [facultyId, availableDepartments.length, departmentName, customDepartmentName])

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
    if (!user?.university_id || !campusId) return

    try {
      const { data, error } = await supabase
        .from('faculties')
        .select('*')
        .eq('university_id', user.university_id)
        .eq('campus_id', campusId)
        .order('name', { ascending: true })

      if (error) {
        console.error('Error fetching faculties:', error)
        showToast('Error loading faculties: ' + error.message, 'error')
        return
      }

      setFaculties(data || [])
    } catch (error) {
      console.error('Error in fetchFaculties:', error)
      showToast('Error loading faculties: ' + error.message, 'error')
    }
  }

  const fetchDepartments = async () => {
    if (!user?.university_id) return

    try {
      let query = supabase
        .from('departments')
        .select(`
          *,
          faculties:faculty_id (
            id,
            name,
            code
          ),
          campuses:campus_id (
            name
          )
        `)
        .eq('university_id', user.university_id)
      
      // If campusId is present, filter by it. Otherwise, show all departments (global view)
      if (campusId) {
        query = query.eq('campus_id', campusId)
      }
      // When opened from Faculty Detail, show only that faculty's departments
      if (facultyIdParam) {
        query = query.eq('faculty_id', facultyIdParam)
      }
      
      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching departments:', error)
        showToast('Error loading departments: ' + error.message, 'error')
        return
      }

      setDepartments(data || [])
    } catch (error) {
      console.error('Error in fetchDepartments:', error)
      showToast('Error loading departments: ' + error.message, 'error')
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

  // Upload HOD photo to official_photos bucket (HOD/Dean photos only; never avatars)
  const uploadHodPhoto = async (file) => {
    if (!file || !user?.university_id) return null

    try {
      const fileName = `hod-photo-${user.university_id}-${Date.now()}-${file.name}`
      
      const { error: uploadError } = await supabase.storage
        .from('official_photos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        throw new Error('Failed to upload photo: ' + uploadError.message)
      }

      const { data: publicUrlData } = supabase.storage
        .from('official_photos')
        .getPublicUrl(fileName)
      
      // Ensure this is a string
      const publicUrl = publicUrlData.publicUrl

      if (!publicUrlData || !publicUrl) {
        throw new Error('Failed to get public URL for uploaded photo')
      }

      console.log('Photo uploaded successfully. Full Public URL:', publicUrl)
      return publicUrl // Ensure this is a string
    } catch (error) {
      console.error('Error uploading HOD photo:', error)
      throw error
    }
  }

  // Upload HOD appointment letter to appointment_letters bucket
  const uploadHodAppointmentLetter = async (file) => {
    if (!file || !user?.university_id) return null
    try {
      const ext = file.name.split('.').pop() || 'pdf'
      const fileName = `hod-letter-${user.university_id}-${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('appointment_letters')
        .upload(fileName, file, { cacheControl: '3600', upsert: true })
      if (uploadError) throw new Error('Failed to upload letter: ' + uploadError.message)
      const { data } = supabase.storage.from('appointment_letters').getPublicUrl(fileName)
      return data?.publicUrl || null
    } catch (error) {
      console.error('Error uploading HOD appointment letter:', error)
      throw error
    }
  }

  const handlePhotoChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setHodPhotoFile(file)
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setHodPhotoPreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleEditPhoto = async (departmentId, file) => {
    if (!file || !user?.university_id) return

    setUploadingPhoto(true)
    setEditingPhotoFor(departmentId)

    try {
      const publicUrl = await uploadHodPhoto(file)
      
      if (!publicUrl) {
        return
      }

      // Verify URL before saving
      console.log('Saving to DB:', publicUrl)
      
      // Update department with new photo URL (save full public URL)
      const { error: updateError } = await supabase
        .from('departments')
        .update({ hod_photo_url: publicUrl })
        .eq('id', departmentId)

      if (updateError) {
        throw updateError
      }

      console.log('Department photo URL updated in database:', publicUrl)

      // Add cache buster to force browser refresh
      const urlWithCache = publicUrl + '?t=' + Date.now()

      // Update local state immediately for instant UI update
      setDepartments(prevDepartments => 
        prevDepartments.map(dept => 
          dept.id === departmentId 
            ? { ...dept, hod_photo_url: urlWithCache }
            : dept
        )
      )

      // Also refresh from database to ensure consistency
      await fetchDepartments()
      const updatedDepartment = departments.find((dept) => dept.id === departmentId)
      await recordSystemLog({
        universityId: user.university_id,
        actionType: 'DEPARTMENT_UPDATED',
        details: `Updated HoD photo for department: ${updatedDepartment?.name || 'Unnamed department'}`,
      })
      showToast('HOD photo updated successfully!', 'success')
    } catch (error) {
      console.error('Error updating HOD photo:', error)
      showToast(error.message || 'Error updating photo', 'error')
    } finally {
      setUploadingPhoto(false)
      setEditingPhotoFor(null)
    }
  }

  const handleEditLetter = async (departmentId, file) => {
    if (!file || !user?.university_id) return
    setUploadingLetterFor(departmentId)
    try {
      const publicUrl = await uploadHodAppointmentLetter(file)
      if (!publicUrl) return
      const { error } = await supabase
        .from('departments')
        .update({ hod_appointment_letter_url: publicUrl })
        .eq('id', departmentId)
      if (error) throw error
      setDepartments(prev => prev.map(d => d.id === departmentId ? { ...d, hod_appointment_letter_url: publicUrl } : d))
      await fetchDepartments()
      const updatedDepartment = departments.find((dept) => dept.id === departmentId)
      await recordSystemLog({
        universityId: user.university_id,
        actionType: 'DEPARTMENT_UPDATED',
        details: `Updated HoD appointment letter for department: ${updatedDepartment?.name || 'Unnamed department'}`,
      })
      showToast('Appointment letter updated.', 'success')
    } catch (err) {
      console.error(err)
      showToast(err.message || 'Failed to update letter', 'error')
    } finally {
      setUploadingLetterFor(null)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!user?.university_id || !campusId) {
      showToast('University ID or Campus ID not found. Please log in again.', 'error')
      return
    }

    // Validation
    if (!facultyId) {
      showToast('Please select a faculty', 'error')
      return
    }
    
    const noPresetDepartments = availableDepartments.length === 0

    let finalDepartmentName = ''
    if (noPresetDepartments) {
      const manual = customDepartmentName?.trim()
      if (!manual) {
        showToast('Please enter the department name', 'error')
        return
      }
      finalDepartmentName = manual
    } else {
      finalDepartmentName = departmentName
      if (departmentName === 'Other') {
        if (!customDepartmentName?.trim()) {
          showToast('Please enter a custom department name', 'error')
          return
        }
        finalDepartmentName = customDepartmentName.trim()
      }
    }

    if (!finalDepartmentName) {
      showToast('Please select or enter department name', 'error')
      return
    }
    
    if (!departmentCode) {
      showToast('Please enter department code', 'error')
      return
    }
    if (!hodName) {
      showToast('Please enter Head of Department name', 'error')
      return
    }
    if (!hodEmail) {
      showToast('Please enter HoD email address', 'error')
      return
    }
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(hodEmail)) {
      showToast('Please enter a valid email address', 'error')
      return
    }
    if (!hodPhone) {
      showToast('Please enter HoD phone number', 'error')
      return
    }

    setSaving(true)

    try {
      // Upload HOD photo if provided and get full public URL
      let publicUrl = null
      if (hodPhotoFile) {
        publicUrl = await uploadHodPhoto(hodPhotoFile)
        console.log('HOD photo uploaded. Full Public URL to save:', publicUrl)
      }

      // Upload HOD appointment letter if provided
      let appointmentLetterUrl = null
      if (hodAppointmentLetterFile) {
        appointmentLetterUrl = await uploadHodAppointmentLetter(hodAppointmentLetterFile)
      }

      // Insert into departments table (save full public URL)
      const { data, error } = await supabase
        .from('departments')
        .insert({
          university_id: user.university_id,
          campus_id: campusId,
          faculty_id: facultyId,
          name: finalDepartmentName,
          code: departmentCode,
          head_of_department: hodName || null,
          hod_email: hodEmail || null,
          hod_phone: hodPhone || null,
          hod_photo_url: publicUrl,
          hod_appointment_letter_url: appointmentLetterUrl || null,
          status: status || null
        })
        .select()
        .single()

      if (error) {
        throw new Error('Failed to save department: ' + error.message)
      }

      // Only proceed if insert was successful
      if (data) {
        console.log('Department saved successfully:', data)

        const facultyRow = faculties.find((f) => f.id === facultyId)
        const facultyLabel = facultyRow ? `${facultyRow.name} (${facultyRow.code})` : 'faculty'
        await recordSystemLog({
          universityId: user.university_id,
          actionType: 'DEPARTMENT_ADDED',
          details: `Added department: ${finalDepartmentName} under ${facultyLabel}${campusName ? ` — ${campusName}` : ''}`,
        })

        const navigateFacultyId = facultyId

        // Clear form
        setDepartmentName('')
        setDepartmentCode('')
        setFacultyId('')
        setSelectedFacultyName('')
        setCustomDepartmentName('')
        setHodName('')
        setHodEmail('')
        setHodPhone('')
        setStatus('Active')
        setHodPhotoFile(null)
        setHodPhotoPreview(null)
        setHodAppointmentLetterFile(null)
        
        // Reset file inputs
        const fileInput = document.getElementById('hod-photo-upload')
        if (fileInput) fileInput.value = ''
        const letterInput = document.getElementById('hod-letter-upload')
        if (letterInput) letterInput.value = ''
        
        // Refresh departments list
        await fetchDepartments()
        
        // Add cache buster to photo URL in state if photo was uploaded
        if (publicUrl) {
          const urlWithCache = publicUrl + '?t=' + Date.now()
          setDepartments(prevDepartments => 
            prevDepartments.map(dept => 
              dept.id === data.id 
                ? { ...dept, hod_photo_url: urlWithCache }
                : dept
            )
          )
        }

        // Close modal form
        setShowForm(false)

        // Show success message only after successful insert
        showToast('Department added successfully!', 'success')

        // If opened from hierarchy, return to Faculty Detail
        if (returnTo === 'faculty' && campusId && navigateFacultyId) {
          navigate(`/ufp/campus/${campusId}/faculty/${navigateFacultyId}`)
        }
      }
    } catch (error) {
      console.error('Error saving department:', error)
      showToast(error.message || 'Error saving department', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this department? This action cannot be undone.')) {
      return
    }

    try {
      const departmentToDelete = departments.find((dept) => dept.id === id)
      const { error } = await supabase
        .from('departments')
        .delete()
        .eq('id', id)

      if (error) {
        throw new Error('Failed to delete department: ' + error.message)
      }

      await recordSystemLog({
        universityId: user.university_id,
        actionType: 'DEPARTMENT_DELETED',
        details: `Deleted department: ${departmentToDelete?.name || 'Unnamed department'}`,
      })

      await fetchDepartments()
      showToast('Department deleted successfully!', 'success')
    } catch (error) {
      console.error('Error deleting department:', error)
      showToast(error.message || 'Error deleting department', 'error')
    }
  }

  const showToast = (message, type) => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 5000)
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
        className="mb-6 rounded-xl border border-slate-200/90 border-t-[3px] border-t-blue-600 bg-gradient-to-br from-white via-blue-50/25 to-blue-50/20 p-5 shadow-md shadow-blue-900/5 shadow-slate-300/20 ring-1 ring-blue-950/[0.05] ring-slate-200/45 sm:p-6"
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
            { label: campusId ? `Departments - ${campusName || 'Loading...'}` : 'Department Management' }
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
            <h2 className="mb-1 text-2xl font-bold tracking-tight text-slate-900">
              {campusId ? `Departments - ${campusName || 'Loading...'}` : 'Department Management'}
            </h2>
            <p className="text-sm text-slate-600">
              {campusId ? `Manage departments for ${campusName || 'this campus'}` : `Manage your university's departments`}
            </p>
          </div>
        </div>
      </motion.div>

      {departments.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-2xl rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm sm:p-14"
        >
          <Users className="mx-auto mb-4 h-14 w-14 text-slate-300" />
          <h3 className="mb-2 text-lg font-semibold text-slate-900">No Departments Yet</h3>
          <p className="mb-6 text-sm text-slate-600">Get started by adding your first department to begin organizing your faculty structure.</p>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
          >
            <Plus className="h-5 w-5" />
            <span>Add First Department</span>
          </button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            onClick={() => setShowForm(true)}
            className="flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 border-l-4 border-l-blue-600 bg-white p-6 shadow-sm transition-shadow hover:border-slate-400 hover:shadow-md"
          >
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Plus className="h-7 w-7" />
            </div>
            <span className="text-sm font-medium text-slate-700">Add Department</span>
          </motion.div>

          {departments.map((department) => {
            const faculty = department.faculties || {}
            
            return (
                <motion.div
                  key={department.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="relative flex w-full flex-col rounded-xl border border-slate-200 border-l-4 border-l-blue-600 bg-white p-5 shadow-sm transition-shadow hover:border-slate-300 hover:shadow-md"
                >
                  <div className="mb-3 flex flex-shrink-0 items-center justify-between gap-2">
                    {!campusId && department.campuses?.name ? (
                      <div className="flex max-w-[200px] items-center gap-1 truncate rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-600">
                        <MapPin className="h-3 w-3 shrink-0 text-slate-500" />
                        <span className="truncate">{department.campuses.name}</span>
                      </div>
                    ) : (
                      <div />
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(department.id)
                      }}
                      className="ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                      title="Delete department"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mb-4 flex flex-shrink-0 gap-4">
                    <div className="relative shrink-0">
                      <div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50 shadow-sm">
                        {department.hod_photo_url ? (
                          <img
                            src={department.hod_photo_url}
                            alt={department.head_of_department}
                            className="block h-full w-full object-cover"
                            onError={(e) => {
                              e.target.onerror = null
                              e.target.src = ''
                              e.target.classList.add('hidden')
                              if (e.target.nextSibling) {
                                e.target.nextSibling.classList.remove('hidden')
                              }
                            }}
                          />
                        ) : null}
                        <div className={`flex h-full w-full items-center justify-center ${department.hod_photo_url ? 'absolute inset-0 hidden' : ''}`}>
                          <Users className="h-8 w-8 text-slate-400" />
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors hover:bg-black/25 group">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files[0]
                              if (file) handleEditPhoto(department.id, file)
                            }}
                            className="hidden"
                            id={`edit-photo-${department.id}`}
                            disabled={uploadingPhoto && editingPhotoFor === department.id}
                          />
                          <label
                            htmlFor={`edit-photo-${department.id}`}
                            className={`absolute inset-0 flex cursor-pointer items-center justify-center ${uploadingPhoto && editingPhotoFor === department.id ? 'cursor-wait opacity-50' : ''}`}
                            title="Edit HOD Photo"
                          >
                            {uploadingPhoto && editingPhotoFor === department.id ? (
                              <Loader2 className="h-5 w-5 animate-spin text-white" />
                            ) : (
                              <Edit2 className="h-5 w-5 text-white opacity-0 transition-opacity group-hover:opacity-100" />
                            )}
                          </label>
                        </div>
                      </div>
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <h3 className="line-clamp-2 text-base font-semibold leading-snug text-slate-900">
                        {department.name}
                      </h3>
                      <span className="mt-1 inline-block rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-xs text-slate-600">
                        {department.code}
                      </span>
                    </div>
                  </div>

                  <div className="flex min-h-0 flex-1 flex-col gap-2 border-t border-slate-200 pt-3">
                    <div>
                      <p className="mb-0.5 text-xs font-medium text-slate-500">Head of Department</p>
                      <p className="truncate text-sm font-medium text-slate-800">{department.head_of_department || '—'}</p>
                    </div>
                    <div>
                      <p className="mb-0.5 text-xs font-medium text-slate-500">Parent Faculty</p>
                      <p className="truncate text-sm font-medium text-slate-800">{faculty.name || 'N/A'}</p>
                    </div>
                    {department.hod_appointment_letter_url ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <a href={department.hod_appointment_letter_url} target="_blank" rel="noopener noreferrer" className="max-w-[140px] truncate text-xs font-medium text-blue-600 hover:underline">View letter</a>
                        <input type="file" accept=".pdf,.doc,.docx" className="hidden" id={`edit-letter-${department.id}`} disabled={uploadingLetterFor === department.id} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleEditLetter(department.id, f); e.target.value = '' }} />
                        <label htmlFor={`edit-letter-${department.id}`} className="cursor-pointer text-xs font-medium text-slate-600 hover:text-slate-900">{uploadingLetterFor === department.id ? 'Uploading...' : 'Replace'}</label>
                      </div>
                    ) : (
                      <div>
                        <input type="file" accept=".pdf,.doc,.docx" className="hidden" id={`edit-letter-${department.id}`} disabled={uploadingLetterFor === department.id} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleEditLetter(department.id, f); e.target.value = '' }} />
                        <label htmlFor={`edit-letter-${department.id}`} className="cursor-pointer text-xs text-slate-500 hover:text-blue-600">{uploadingLetterFor === department.id ? 'Uploading...' : 'Upload appointment letter'}</label>
                      </div>
                    )}
                  </div>

                  {department.status && (
                    <div className="mt-auto flex-shrink-0 border-t border-slate-100 pt-3">
                      <span className={`inline-block rounded-md border px-2 py-0.5 text-xs font-medium ${department.status === 'Active' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
                        {department.status}
                      </span>
                    </div>
                  )}
                </motion.div>
            )
          })}
        </div>
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
              <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl">
                {/* Modal Header */}
                <div className="sticky top-0 flex items-center justify-between rounded-t-2xl border-b border-slate-200 bg-white px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                      <Plus className="h-5 w-5 text-blue-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-900">Add New Department</h3>
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
                  {faculties.length === 0 ? (
                    <div className="text-center py-8">
                      <GraduationCap className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                      <h4 className="text-lg font-semibold text-slate-900 mb-2">No Faculties Found</h4>
                      <p className="text-slate-600 mb-6">Please add a faculty first before creating departments.</p>
                      <button
                        onClick={() => {
                          setShowForm(false)
                          navigate(`/ufp/faculties?campusId=${campusId}`)
                        }}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all"
                      >
                        Go to Faculties
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-5">
                      {/* Faculty Dropdown */}
                      <div>
                        <label className="block text-sm font-medium text-slate-900 mb-2">
                          Faculty <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={facultyId}
                          onChange={(e) => {
                            if (facultyIdParam) return
                            const selectedId = e.target.value
                            setFacultyId(selectedId)
                            const faculty = faculties.find(f => f.id === selectedId)
                            if (faculty) {
                              setSelectedFacultyName(faculty.name)
                            }
                          }}
                          disabled={!!facultyIdParam}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm disabled:bg-slate-100 disabled:cursor-not-allowed"
                          required
                        >
                          <option value="">{facultyIdParam ? 'Faculty pre-selected' : '-- Select Faculty --'}</option>
                          {faculties.map((faculty) => (
                            <option key={faculty.id} value={faculty.id}>
                              {faculty.name} ({faculty.code})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Department Name Dropdown */}
                      <div>
                        <label className="block text-sm font-medium text-slate-900 mb-2">
                          Department Name <span className="text-red-500">*</span>
                        </label>
                        {!facultyId ? (
                          <div className="w-full px-4 py-2.5 bg-slate-100 border border-slate-300 rounded-lg text-slate-500 text-sm">
                            Please select a faculty first
                          </div>
                        ) : availableDepartments.length === 0 ? (
                          <div className="space-y-2">
                            <p className="text-xs leading-relaxed text-slate-600">
                              No preset departments for this faculty — enter the name below.
                            </p>
                            <input
                              type="text"
                              value={customDepartmentName}
                              onChange={(e) => setCustomDepartmentName(e.target.value)}
                              placeholder="e.g., Department of Islamic Studies"
                              className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm"
                              required
                            />
                          </div>
                        ) : (
                          <select
                            value={departmentName}
                            onChange={(e) => setDepartmentName(e.target.value)}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm"
                            required
                          >
                            <option value="">-- Select Department --</option>
                            {availableDepartments.map((dept) => (
                              <option key={dept} value={dept}>
                                {dept}
                              </option>
                            ))}
                            <option value="Other">Other (Custom Department)</option>
                          </select>
                        )}
                      </div>

                      {/* Custom Department Name (shown when "Other" is selected) */}
                      {departmentName === 'Other' && (
                        <div>
                          <label className="block text-sm font-medium text-slate-900 mb-2">
                            Custom Department Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={customDepartmentName}
                            onChange={(e) => setCustomDepartmentName(e.target.value)}
                            placeholder="Enter custom department name"
                            className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm"
                            required
                          />
                        </div>
                      )}

                      {/* Department Code */}
                      <div>
                        <label className="block text-sm font-medium text-slate-900 mb-2">
                          Department Code/Abbreviation <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={departmentCode}
                          onChange={(e) => setDepartmentCode(e.target.value.toUpperCase())}
                          placeholder="e.g., CS"
                          className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm"
                          required
                        />
                      </div>

                      {/* HoD Name */}
                      <div>
                        <label className="block text-sm font-medium text-slate-900 mb-2">
                          Head of Department (HoD) Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={hodName}
                          onChange={(e) => setHodName(e.target.value)}
                          placeholder="Enter HoD's full name"
                          className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm"
                          required
                        />
                      </div>

                      {/* HoD Email */}
                      <div>
                        <label className="block text-sm font-medium text-slate-900 mb-2">
                          HoD Email Address <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="email"
                          value={hodEmail}
                          onChange={(e) => setHodEmail(e.target.value)}
                          placeholder="hod@university.edu.pk"
                          className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm"
                          required
                        />
                      </div>

                      {/* HoD Phone */}
                      <div>
                        <label className="block text-sm font-medium text-slate-900 mb-2">
                          HoD Phone Number <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="tel"
                          value={hodPhone}
                          onChange={(e) => setHodPhone(e.target.value)}
                          placeholder="+92-XXX-XXXXXXX"
                          className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm"
                          required
                        />
                      </div>

                      {/* HOD Photo Upload */}
                      <div>
                        <label className="block text-sm font-medium text-slate-900 mb-2">
                          HOD Photo <span className="text-slate-500 text-xs">(Optional)</span>
                        </label>
                        <div className="flex items-center gap-4">
                          {hodPhotoPreview ? (
                            <div className="w-20 h-20 rounded-full border-4 border-slate-200 overflow-hidden bg-white flex-shrink-0">
                              <img
                                src={hodPhotoPreview}
                                alt="HOD preview"
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-20 h-20 rounded-full border-4 border-slate-200 bg-slate-100 flex items-center justify-center flex-shrink-0">
                              <Users className="w-10 h-10 text-slate-400" />
                            </div>
                          )}
                          <div className="flex-1">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handlePhotoChange}
                              className="hidden"
                              id="hod-photo-upload"
                            />
                            <label
                              htmlFor="hod-photo-upload"
                              className="flex items-center gap-2 px-4 py-3 bg-white border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-blue-600 transition-colors text-sm text-slate-700 hover:text-blue-600"
                            >
                              <Camera className="w-5 h-5" />
                              <span>{hodPhotoPreview ? 'Change Photo' : 'Upload Photo'}</span>
                            </label>
                            {hodPhotoPreview && (
                              <button
                                type="button"
                                onClick={() => {
                                  setHodPhotoFile(null)
                                  setHodPhotoPreview(null)
                                  const fileInput = document.getElementById('hod-photo-upload')
                                  if (fileInput) fileInput.value = ''
                                }}
                                className="mt-2 text-xs text-red-600 hover:text-red-700"
                              >
                                Remove Photo
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* HOD Appointment Letter */}
                      <div>
                        <label className="block text-sm font-medium text-slate-900 mb-2">
                          HOD Appointment Letter <span className="text-slate-500 text-xs">(Optional)</span>
                        </label>
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx"
                          onChange={(e) => setHodAppointmentLetterFile(e.target.files?.[0] || null)}
                          className="hidden"
                          id="hod-letter-upload"
                        />
                        <label
                          htmlFor="hod-letter-upload"
                          className="flex items-center gap-2 px-4 py-3 bg-white border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-blue-600 transition-colors text-sm text-slate-700 hover:text-blue-600"
                        >
                          <Upload className="w-5 h-5" />
                          <span>{hodAppointmentLetterFile ? hodAppointmentLetterFile.name : 'Upload PDF or document'}</span>
                        </label>
                        {hodAppointmentLetterFile && (
                          <button
                            type="button"
                            onClick={() => {
                              setHodAppointmentLetterFile(null)
                              const letterInput = document.getElementById('hod-letter-upload')
                              if (letterInput) letterInput.value = ''
                            }}
                            className="mt-2 text-xs text-red-600 hover:text-red-700"
                          >
                            Remove letter
                          </button>
                        )}
                      </div>

                      {/* Status */}
                      <div>
                        <label className="block text-sm font-medium text-slate-900 mb-2">
                          Status <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={status}
                          onChange={(e) => setStatus(e.target.value)}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm"
                          required
                        >
                          <option value="Active">Active</option>
                          <option value="Inactive">Inactive</option>
                        </select>
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
                          <span>Save Department</span>
                        )}
                      </motion.button>
                    </form>
                  )}
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
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}
            >
              {toast.type === 'success' ? (
                <CheckCircle className="w-5 h-5 text-emerald-600" />
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

export default DepartmentManagement
