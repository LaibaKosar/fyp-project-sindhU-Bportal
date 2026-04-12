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
  Users,
  Camera,
  Edit2,
  MapPin,
  GraduationCap,
  Briefcase
} from 'lucide-react'
import Breadcrumbs from '../components/Breadcrumbs'
import { UfpAdminShell, UfpAdminContainer, UfpAdminLoadingCenter } from '../components/UfpAdminShell'
import { recordSystemLog } from '../utils/systemLogs'

// Academic Designations for Teaching Staff
const ACADEMIC_DESIGNATIONS = [
  'Professor',
  'Associate Professor',
  'Assistant Professor',
  'Lecturer',
  'Instructor',
  'Lab Instructor'
]

// Administrative Roles for Teaching Staff
const ADMINISTRATIVE_ROLES = [
  'No Additional Role',
  'Dean',
  'Head of Department',
  'Director',
  'Chairperson',
  'Program Coordinator'
]

// Categories for Non-Teaching Staff
const NON_TEACHING_CATEGORIES = [
  'Administrative',
  'Technical',
  'Library',
  'Finance & Accounts',
  'Support Staff'
]

// Designations/Offices for Non-Teaching Staff
const NON_TEACHING_DESIGNATIONS = [
  'Registrar Office',
  'Finance Dept',
  'IT Dept',
  'HR Dept',
  'Library',
  'Exam Cell',
  'Student Affairs',
  'Security',
  'Transport',
  'Maintenance',
  'Procurement'
]

// Employment Types
const EMPLOYMENT_TYPES = [
  'Permanent',
  'Contract',
  'Visiting',
  'Daily Wages'
]

const GENDER_OPTIONS = ['Male', 'Female', 'Prefer not to say']

function StaffManagement() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const campusId = searchParams.get('campusId')
  const departmentIdParam = searchParams.get('departmentId')
  const staffTypeParam = searchParams.get('staffType') // 'Teaching' or 'Non-Teaching'
  const fullNameParam = searchParams.get('fullName')
  const emailParam = searchParams.get('email')
  const phoneParam = searchParams.get('phone')
  const returnPath = searchParams.get('returnPath')
  const returnTo = searchParams.get('returnTo')
  const returnFacultyId = searchParams.get('returnFacultyId') || searchParams.get('facultyId')
  const administrativeRoleParam = searchParams.get('administrativeRole')
  const academicDesignationParam = searchParams.get('academicDesignation')
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState(null)
  const [staff, setStaff] = useState([])
  const [campuses, setCampuses] = useState([])
  const [faculties, setFaculties] = useState([])
  const [departments, setDepartments] = useState([])
  const [toast, setToast] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [campusName, setCampusName] = useState(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [editingPhotoFor, setEditingPhotoFor] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Form state
  const [selectedCampusId, setSelectedCampusId] = useState(campusId || '')
  const [staffType, setStaffType] = useState(staffTypeParam || 'Teaching')
  const [fullName, setFullName] = useState(fullNameParam || '')
  const [email, setEmail] = useState(emailParam || '')
  const [phone, setPhone] = useState(phoneParam || '')
  const [gender, setGender] = useState('Prefer not to say')
  const [cnic, setCnic] = useState('')
  const [employmentType, setEmploymentType] = useState('Permanent')
  const [profilePhotoFile, setProfilePhotoFile] = useState(null)
  const [profilePhotoPreview, setProfilePhotoPreview] = useState(null)
  
  // Teaching Staff Fields (facultyId from URL when returning to department)
  const [facultyId, setFacultyId] = useState(returnTo === 'department' && returnFacultyId ? returnFacultyId : '')
  const [departmentId, setDepartmentId] = useState(departmentIdParam || '')
  const [academicDesignation, setAcademicDesignation] = useState(academicDesignationParam || '')
  const [administrativeRole, setAdministrativeRole] = useState(administrativeRoleParam || 'No Additional Role')
  const [qualification, setQualification] = useState('')
  const [specialization, setSpecialization] = useState('')
  
  // Non-Teaching Staff Fields
  const [category, setCategory] = useState('')
  const [designation, setDesignation] = useState('')

  useEffect(() => {
    loadUserData()
  }, [])

  useEffect(() => {
    if (user?.university_id) {
      if (campusId) {
        setSelectedCampusId(campusId)
        fetchCampusName()
        fetchFaculties()
        fetchDepartments()
      } else {
        fetchCampuses()
      }
      fetchStaff()
      
      // Auto-open form if fullName is provided (coming from Faculty Management)
      if (fullNameParam) {
        setShowForm(true)
      }
    }
  }, [user, campusId, staffType, fullNameParam, departmentIdParam])

  useEffect(() => {
    if (selectedCampusId && staffType === 'Teaching') {
      fetchFaculties()
      if (!departmentIdParam) {
        setFacultyId('')
        setDepartmentId('')
        setDepartments([])
      }
    } else {
      setFaculties([])
      setDepartments([])
    }
  }, [selectedCampusId, staffType])

  // When opened from Department Detail with departmentId, fetch department and lock Faculty/Department
  useEffect(() => {
    if (!departmentIdParam || !user?.university_id) return
    const fetchDepartmentForLock = async () => {
      const { data, error } = await supabase
        .from('departments')
        .select('id, faculty_id, campus_id')
        .eq('id', departmentIdParam)
        .eq('university_id', user.university_id)
        .single()
      if (!error && data) {
        setFacultyId(data.faculty_id)
        setDepartmentId(data.id)
        if (data.campus_id && !campusId) setSelectedCampusId(data.campus_id)
      }
    }
    fetchDepartmentForLock()
  }, [user?.university_id, departmentIdParam, campusId])

  useEffect(() => {
    if (facultyId && selectedCampusId && staffType === 'Teaching') {
      fetchDepartments()
    } else {
      setDepartmentId('')
      setDepartments([])
    }
  }, [facultyId, selectedCampusId, staffType])

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

  const fetchStaff = async () => {
    if (!user?.university_id) return

    try {
      let query = supabase
        .from('staff')
        .select('*, campuses:campus_id(name)')
        .eq('university_id', user.university_id)

      if (staffTypeParam) {
        query = query.eq('type', staffType)
      }

      if (campusId) {
        query = query.eq('campus_id', campusId)
      }
      if (departmentIdParam) {
        query = query.eq('department_id', departmentIdParam)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error
      setStaff(data || [])
    } catch (error) {
      console.error('Error fetching staff:', error)
      showToast('Error loading staff: ' + error.message, 'error')
    }
  }

  // Staff photos: staff_profiles bucket only (never avatars)
  const uploadStaffPhoto = async (file) => {
    if (!file || !user?.university_id) return null

    try {
      const fileName = `staff-photo-${user.university_id}-${Date.now()}-${file.name}`
      
      const { error: uploadError } = await supabase.storage
        .from('staff_profiles')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) throw uploadError

      const { data: publicUrlData } = supabase.storage
        .from('staff_profiles')
        .getPublicUrl(fileName)
      
      return publicUrlData.publicUrl
    } catch (error) {
      console.error('Error uploading photo:', error)
      throw error
    }
  }

  const handlePhotoChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setProfilePhotoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setProfilePhotoPreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleEditPhoto = async (staffId, file) => {
    if (!file || !user?.university_id) return

    setUploadingPhoto(true)
    setEditingPhotoFor(staffId)

    try {
      const publicUrl = await uploadStaffPhoto(file)
      
      if (!publicUrl) return

      const { error: updateError } = await supabase
        .from('staff')
        .update({ profile_photo_url: publicUrl })
        .eq('id', staffId)

      if (updateError) throw updateError

      const urlWithCache = publicUrl + '?t=' + Date.now()
      setStaff(prevStaff => 
        prevStaff.map(s => 
          s.id === staffId 
            ? { ...s, profile_photo_url: urlWithCache }
            : s
        )
      )

      await fetchStaff()
      showToast('Staff photo updated successfully!', 'success')
    } catch (error) {
      console.error('Error updating photo:', error)
      showToast(error.message || 'Error updating photo', 'error')
    } finally {
      setUploadingPhoto(false)
      setEditingPhotoFor(null)
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

    if (!fullName || !email || !phone) {
      showToast('Please fill in all required fields', 'error')
      return
    }

    if (!gender || !GENDER_OPTIONS.includes(gender)) {
      showToast('Please select a valid gender option', 'error')
      return
    }

    if (staffType === 'Teaching' && (!facultyId || !departmentId || !academicDesignation)) {
      showToast('Please fill in all teaching staff fields', 'error')
      return
    }

    if (staffType === 'Non-Teaching' && (!category || !designation)) {
      showToast('Please fill in all non-teaching staff fields', 'error')
      return
    }

    setSaving(true)

    try {
      let publicUrl = null
      if (profilePhotoFile) {
        publicUrl = await uploadStaffPhoto(profilePhotoFile)
      }

      const staffData = {
        university_id: user.university_id,
        campus_id: selectedCampusId,
        type: staffType,
        full_name: fullName,
        email: email,
        phone: phone,
        gender,
        cnic: cnic || null,
        employment_type: employmentType,
        profile_photo_url: publicUrl
      }

      if (staffType === 'Teaching') {
        staffData.faculty_id = facultyId
        staffData.department_id = departmentId
        staffData.academic_designation = academicDesignation
        staffData.administrative_role = administrativeRole
        staffData.qualification = qualification || null
        staffData.specialization = specialization || null
      } else {
        staffData.category = category
        staffData.designation = designation
      }

      const { data, error } = await supabase
        .from('staff')
        .insert(staffData)
        .select()
        .single()

      if (error) throw error

      await recordSystemLog({
        universityId: user.university_id,
        actionType: 'STAFF_UPDATED',
        details: `Registered ${staffType.toLowerCase()} staff: ${fullName}`,
      })

      showToast('Staff member added successfully!', 'success')
      
      // Clear form
      setFullName('')
      setEmail('')
      setPhone('')
      setGender('Prefer not to say')
      setCnic('')
      setEmploymentType('Permanent')
      setProfilePhotoFile(null)
      setProfilePhotoPreview(null)
      setFacultyId('')
      setDepartmentId('')
      setAcademicDesignation('')
      setAdministrativeRole('No Additional Role')
      setQualification('')
      setSpecialization('')
      setCategory('')
      setDesignation('')
      
      const fileInput = document.getElementById('staff-photo-upload')
      if (fileInput) fileInput.value = ''

      await fetchStaff()
      setShowForm(false)

      if (returnTo === 'department' && selectedCampusId && facultyId && departmentId) {
        navigate(`/ufp/campus/${selectedCampusId}/faculty/${facultyId}/department/${departmentId}`)
      } else if (returnPath) {
        setTimeout(() => {
          navigate(returnPath)
        }, 1000)
      }
    } catch (error) {
      console.error('Error saving staff:', error)
      showToast(error.message || 'Error saving staff', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (staffId) => {
    if (!confirm('Are you sure you want to delete this staff member? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('staff')
        .delete()
        .eq('id', staffId)

      if (error) throw error

      await fetchStaff()
      showToast('Staff member deleted successfully', 'success')
    } catch (error) {
      console.error('Error deleting staff:', error)
      showToast(error.message || 'Error deleting staff', 'error')
    }
  }

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 5000)
  }

  const filteredStaff = (staff || []).filter(s => {
    const name = s.full_name || '';
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

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
        className="mb-6 rounded-xl border border-slate-200 border-t-2 border-t-blue-600 bg-white p-5 shadow-sm sm:p-6"
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
            { label: staffTypeParam ? `${staffType} Staff` : 'Staff Management' }
          ]}
          className="mb-2 text-sm text-slate-500"
        />

        <div>
          <h2 className="mb-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {staffTypeParam ? `${staffType} Staff Management` : 'Staff Management'}
          </h2>
          <p className="text-sm text-slate-600 sm:text-base">
            {staffTypeParam
              ? (campusId ? `Manage ${staffType.toLowerCase()} staff for ${campusName || 'this campus'}` : `Manage your university's ${staffType.toLowerCase()} staff`)
              : 'Manage your university staff'}
          </p>
        </div>
      </motion.div>

      {/* Gallery Grid */}
      {filteredStaff.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-2xl rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm sm:p-16"
        >
          <Users className="mx-auto mb-6 h-16 w-16 text-slate-300 sm:h-24 sm:w-24" />
          <h3 className="mb-3 text-xl font-bold text-slate-900 sm:text-2xl">
            {staffTypeParam ? `No ${staffType} Staff Yet` : 'No Staff Yet'}
          </h3>
          <p className="mb-8 text-slate-600">
            {staffTypeParam
              ? `Get started by adding your first ${staffType.toLowerCase()} staff member.`
              : 'Get started by adding your first staff member.'}
          </p>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
          >
            <Plus className="h-5 w-5" />
            <span>{staffTypeParam ? `Add First ${staffType} Staff` : 'Add Staff Member'}</span>
          </button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
          {/* Quick Add Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            onClick={() => setShowForm(true)}
            className="flex min-h-[220px] w-full cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 border-l-4 border-l-blue-600 bg-white p-6 shadow-sm transition-shadow hover:border-slate-400 hover:shadow-md"
          >
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
              <Plus className="h-6 w-6 text-blue-600" />
            </div>
            <span className="text-sm font-semibold text-slate-800">{staffTypeParam ? `Add ${staffType} Staff` : 'Add Staff'}</span>
            <span className="mt-1 text-center text-xs text-slate-500">Register a new staff member</span>
          </motion.div>

          {/* Staff Cards */}
          {filteredStaff.map((member, index) => (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: (index + 1) * 0.1 }}
              className="relative flex w-full flex-col items-center rounded-xl border border-slate-200 border-l-4 border-l-blue-600 bg-white p-6 text-center shadow-sm transition-shadow hover:border-slate-300 hover:shadow-md"
            >
              {/* Staff Type Badge */}
              <div className="absolute top-4 left-4 flex flex-col gap-1.5 items-start z-10">
                <span
                  className={`px-3 py-1 text-xs font-semibold rounded-full ${
                    member.type === 'Teaching'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}
                >
                  {member.type}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
                  {member.gender || '—'}
                </span>
              </div>

              {/* Delete Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  handleDelete(member.id)
                }}
                className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                title="Delete staff member"
              >
                <Trash2 className="h-4 w-4" />
              </button>

              {/* Staff Photo */}
              <div className="mb-6 relative">
                <div className="w-32 h-32 rounded-full border-4 border-slate-200 overflow-hidden bg-white flex items-center justify-center mx-auto shadow-sm relative">
                  {member.profile_photo_url ? (
                    <img
                      src={member.profile_photo_url}
                      alt={member.full_name}
                      className="w-full h-full object-cover rounded-full block"
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
                  <div className={`w-full h-full bg-slate-100 flex items-center justify-center rounded-full ${member.profile_photo_url ? 'hidden absolute inset-0' : ''}`}>
                    <Users className="w-16 h-16 text-slate-400" />
                  </div>
                  {/* Edit Photo Button */}
                  <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-all duration-200 flex items-center justify-center group">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files[0]
                        if (file) {
                          handleEditPhoto(member.id, file)
                        }
                      }}
                      className="hidden"
                      id={`edit-photo-${member.id}`}
                      disabled={uploadingPhoto && editingPhotoFor === member.id}
                    />
                    <label
                      htmlFor={`edit-photo-${member.id}`}
                      className={`absolute inset-0 flex items-center justify-center cursor-pointer ${
                        uploadingPhoto && editingPhotoFor === member.id ? 'opacity-50 cursor-wait' : ''
                      }`}
                      title="Edit Photo"
                    >
                      {uploadingPhoto && editingPhotoFor === member.id ? (
                        <Loader2 className="w-6 h-6 text-white animate-spin opacity-100" />
                      ) : (
                        <Edit2 className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </label>
                  </div>
                </div>
              </div>

              {/* Staff Info */}
              <div className="text-center w-full">
                <h3 className="text-lg font-bold text-slate-900 mb-2 line-clamp-2">
                  {member.full_name}
                </h3>
                <p className="text-sm text-slate-600 mb-2">
                  {member.type === 'Teaching' 
                    ? member.academic_designation || 'N/A'
                    : member.designation || 'N/A'}
                </p>
                {/* Campus Location Badge (Only in Global View) */}
                {!campusId && member.campuses && member.campuses.name && (
                  <div className="mb-2">
                    <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
                      <MapPin className="h-3 w-3 shrink-0 text-slate-500" />
                      {member.campuses.name}
                    </span>
                  </div>
                )}
                {member.email && (
                  <p className="text-xs text-slate-500 mb-1">{member.email}</p>
                )}
                {member.phone && (
                  <p className="text-xs text-slate-500">{member.phone}</p>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      </UfpAdminContainer>

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
                    <h3 className="text-xl font-semibold text-slate-900">
                      {staffTypeParam ? `Add New ${staffType} Staff` : 'Add Staff Member'}
                    </h3>
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
                    {!staffTypeParam && (
                      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                        <div>
                          <label className="block text-sm font-medium text-slate-900 mb-1">
                            Staff Type
                          </label>
                          <p className="text-xs text-slate-500">Select the type of staff member</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setStaffType('Teaching')}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                              staffType === 'Teaching'
                                ? 'bg-emerald-600 text-white'
                                : 'bg-white text-slate-700 border border-slate-300'
                            }`}
                          >
                            Teaching
                          </button>
                          <button
                            type="button"
                            onClick={() => setStaffType('Non-Teaching')}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                              staffType === 'Non-Teaching'
                                ? 'bg-blue-600 text-white'
                                : 'bg-white text-slate-700 border border-slate-300'
                            }`}
                          >
                            Non-Teaching
                          </button>
                        </div>
                      </div>
                    )}

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

                    <div>
                      <label className="block text-sm font-medium text-slate-900 mb-2">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Enter full name"
                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-900 mb-2">
                          Email <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Enter email"
                          className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-900 mb-2">
                          Phone <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="Enter phone number"
                          className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-900 mb-2">
                        Gender <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm"
                        required
                      >
                        {GENDER_OPTIONS.map((g) => (
                          <option key={g} value={g}>
                            {g}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-900 mb-2">
                          CNIC
                        </label>
                        <input
                          type="text"
                          value={cnic}
                          onChange={(e) => setCnic(e.target.value)}
                          placeholder="Enter CNIC"
                          className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-900 mb-2">
                          Employment Type <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={employmentType}
                          onChange={(e) => setEmploymentType(e.target.value)}
                          className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm"
                          required
                        >
                          {EMPLOYMENT_TYPES.map((type) => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-900 mb-2">
                        Profile Photo <span className="text-slate-500 text-xs">(Optional)</span>
                      </label>
                      <div className="flex items-center gap-4">
                        {profilePhotoPreview ? (
                          <div className="w-32 h-32 rounded-xl border-4 border-slate-200 overflow-hidden bg-white flex-shrink-0">
                            <img
                              src={profilePhotoPreview}
                              alt="Preview"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-32 h-32 rounded-xl border-4 border-slate-200 bg-slate-100 flex items-center justify-center flex-shrink-0">
                            <Users className="w-12 h-12 text-slate-400" />
                          </div>
                        )}
                        <div className="flex-1">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoChange}
                            className="hidden"
                            id="staff-photo-upload"
                          />
                          <label
                            htmlFor="staff-photo-upload"
                            className="flex items-center gap-2 px-4 py-3 bg-white border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-blue-600 transition-colors text-sm text-slate-700 hover:text-blue-600"
                          >
                            <Camera className="w-5 h-5" />
                            <span>{profilePhotoPreview ? 'Change Photo' : 'Upload Photo'}</span>
                          </label>
                        </div>
                      </div>
                    </div>

                    {staffType === 'Teaching' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-slate-900 mb-2">
                            Select Faculty <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={facultyId}
                            onChange={(e) => {
                              if (departmentIdParam) return
                              setFacultyId(e.target.value)
                              setDepartmentId('')
                            }}
                            disabled={!!departmentIdParam}
                            className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm disabled:bg-slate-100 disabled:cursor-not-allowed"
                            required
                          >
                            <option value="">{departmentIdParam ? 'Faculty pre-selected' : 'Select Faculty'}</option>
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
                            onChange={(e) => departmentIdParam ? undefined : setDepartmentId(e.target.value)}
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

                        <div>
                          <label className="block text-sm font-medium text-slate-900 mb-2">
                            Academic Designation <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={academicDesignation}
                            onChange={(e) => setAcademicDesignation(e.target.value)}
                            className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm"
                            required
                          >
                            <option value="">Select Designation</option>
                            {ACADEMIC_DESIGNATIONS.map((designation) => (
                              <option key={designation} value={designation}>
                                {designation}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-900 mb-2">
                            Administrative Role
                          </label>
                          <select
                            value={administrativeRole}
                            onChange={(e) => setAdministrativeRole(e.target.value)}
                            className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm"
                          >
                            {ADMINISTRATIVE_ROLES.map((role) => (
                              <option key={role} value={role}>
                                {role}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-900 mb-2">
                            Qualification <span className="text-slate-500 text-xs">(Optional)</span>
                          </label>
                          <input
                            type="text"
                            value={qualification}
                            onChange={(e) => setQualification(e.target.value)}
                            placeholder="e.g. PhD, MS"
                            className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-900 mb-2">
                            Specialization <span className="text-slate-500 text-xs">(Optional)</span>
                          </label>
                          <input
                            type="text"
                            value={specialization}
                            onChange={(e) => setSpecialization(e.target.value)}
                            placeholder="e.g. Machine Learning"
                            className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm"
                          />
                        </div>
                      </>
                    )}

                    {staffType === 'Non-Teaching' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-slate-900 mb-2">
                            Category <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm"
                            required
                          >
                            <option value="">Select Category</option>
                            {NON_TEACHING_CATEGORIES.map((cat) => (
                              <option key={cat} value={cat}>
                                {cat}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-900 mb-2">
                            Designation/Office <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={designation}
                            onChange={(e) => setDesignation(e.target.value)}
                            className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm"
                            required
                          >
                            <option value="">Select Designation</option>
                            {NON_TEACHING_DESIGNATIONS.map((des) => (
                              <option key={des} value={des}>
                                {des}
                              </option>
                            ))}
                          </select>
                        </div>
                      </>
                    )}

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
                          <span>Save Staff Member</span>
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
    </UfpAdminShell>
  )
}

export default StaffManagement