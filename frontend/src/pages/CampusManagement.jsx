import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabaseClient'
import { useNavigate } from 'react-router-dom'
import { 
  Trash2, 
  Plus, 
  Loader2,
  CheckCircle,
  X,
  Building2,
  MapPin,
  Search,
  Camera,
  Upload,
  Edit2
} from 'lucide-react'
import { UfpManagementPageHeader } from '../components/UfpManagementPageHeader'
import { UFP_PAGE_GRADIENT_CLASS } from '../components/UfpAdminShell'
import { recordSystemLog } from '../utils/systemLogs'

const CITIES = [
  'Karachi',
  'Hyderabad',
  'Sukkur',
  'Larkana',
  'Nawabshah (Shaheed Benazirabad)',
  'Mirpurkhas',
  'Jacobabad',
  'Shikarpur',
  'Khairpur',
  'Dadu',
  'Badin',
  'Thatta',
  'Matiari',
  'Sanghar',
  'Naushahro Feroze',
  'Ghotki',
  'Kashmore',
  'Jamshoro',
  'Umerkot',
  'Tharparkar',
  'Sujawal'
]

function CampusManagement() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState(null)
  const [campuses, setCampuses] = useState([])
  const [toast, setToast] = useState(null)
  const [showForm, setShowForm] = useState(false)

  // Form state
  const [campusName, setCampusName] = useState('')
  const [campusCode, setCampusCode] = useState('')
  const [proVcName, setProVcName] = useState('')
  const [establishmentYear, setEstablishmentYear] = useState('')
  const [city, setCity] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [completeAddress, setCompleteAddress] = useState('')
  const [isMainCampus, setIsMainCampus] = useState(false)
  const [campusPhotoFile, setCampusPhotoFile] = useState(null)
  const [campusPhotoPreview, setCampusPhotoPreview] = useState(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [editingPhotoFor, setEditingPhotoFor] = useState(null)
  
  // City search state
  const [citySearch, setCitySearch] = useState('')
  const [showCityDropdown, setShowCityDropdown] = useState(false)

  useEffect(() => {
    loadUserData()
  }, [])

  useEffect(() => {
    if (user?.university_id) {
      fetchCampuses()
    }
  }, [user])

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

  const fetchCampuses = async () => {
    if (!user?.university_id) return

    try {
      const { data, error } = await supabase
        .from('campuses')
        .select('*')
        .eq('university_id', user.university_id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching campuses:', error)
        showToast('Error loading campuses: ' + error.message, 'error')
        return
      }

      setCampuses(data || [])
    } catch (error) {
      console.error('Error in fetchCampuses:', error)
      showToast('Error loading campuses: ' + error.message, 'error')
    }
  }

  const filteredCities = CITIES.filter(cityName =>
    cityName.toLowerCase().includes(citySearch.toLowerCase())
  )

  // Upload campus photo to campus-media bucket
  const uploadCampusPhoto = async (file) => {
    if (!file || !user?.university_id) return null

    try {
      const fileName = `campus-photo-${user.university_id}-${Date.now()}-${file.name}`
      
      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('campus-media')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        throw new Error('Failed to upload photo: ' + uploadError.message)
      }

      // Get full public URL after successful upload
      const { data: publicUrlData } = supabase.storage
        .from('campus-media')
        .getPublicUrl(fileName)
      
      const publicUrl = publicUrlData.publicUrl

      if (!publicUrlData || !publicUrl) {
        throw new Error('Failed to get public URL for uploaded photo')
      }

      console.log('Campus photo uploaded successfully. Full Public URL:', publicUrl)
      return publicUrl // Ensure this is a string
    } catch (error) {
      console.error('Error uploading campus photo:', error)
      throw error
    }
  }

  const handlePhotoChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setCampusPhotoFile(file)
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setCampusPhotoPreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleEditPhoto = async (campusId, file) => {
    if (!file || !user?.university_id) return

    setUploadingPhoto(true)
    setEditingPhotoFor(campusId)

    try {
      const publicUrl = await uploadCampusPhoto(file)
      
      if (!publicUrl) {
        return
      }

      // Verify URL before saving
      console.log('Saving to DB:', publicUrl)
      
      // Update campus with new photo URL (save full public URL)
      const { error: updateError } = await supabase
        .from('campuses')
        .update({ campus_photo_url: publicUrl })
        .eq('id', campusId)

      if (updateError) {
        throw updateError
      }

      console.log('Campus photo URL updated in database:', publicUrl)

      // Add cache buster to force browser refresh
      const urlWithCache = publicUrl + '?t=' + Date.now()

      // Update local state immediately for instant UI update
      setCampuses(prevCampuses => 
        prevCampuses.map(campus => 
          campus.id === campusId 
            ? { ...campus, campus_photo_url: urlWithCache }
            : campus
        )
      )

      // Also refresh from database to ensure consistency
      await fetchCampuses()
      const updatedCampus = campuses.find((campus) => campus.id === campusId)
      await recordSystemLog({
        universityId: user.university_id,
        actionType: 'CAMPUS_UPDATED',
        details: `Updated campus photo for: ${updatedCampus?.name || 'Unnamed campus'}`,
      })
      showToast('Campus photo updated successfully!', 'success')
    } catch (error) {
      console.error('Error updating campus photo:', error)
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

    // Validation
    if (!campusName) {
      showToast('Please enter sub-campus name', 'error')
      return
    }
    if (!campusCode) {
      showToast('Please enter campus code', 'error')
      return
    }
    if (!proVcName) {
      showToast(`Please enter ${isMainCampus ? 'Vice Chancellor' : 'Pro Vice Chancellor'} name`, 'error')
      return
    }
    if (!establishmentYear) {
      showToast('Please enter establishment year', 'error')
      return
    }
    if (!city) {
      showToast('Please select a city', 'error')
      return
    }
    if (websiteUrl && !isValidUrl(websiteUrl)) {
      showToast('Please enter a valid website URL', 'error')
      return
    }

    setSaving(true)

    try {
      // Upload campus photo if provided and get full public URL
      let publicUrl = null
      if (campusPhotoFile) {
        publicUrl = await uploadCampusPhoto(campusPhotoFile)
        console.log('Campus photo uploaded. Full Public URL to save:', publicUrl)
      }

      // Verify URL before saving
      if (publicUrl) {
        console.log('Saving to DB:', publicUrl)
      }

      // Log submission data before insert
      console.log('Submission data:', { 
        university_id: user.university_id, 
        name: campusName, 
        code: campusCode, 
        isMainCampus 
      })

      // Insert into campuses table
      const { data, error } = await supabase
        .from('campuses')
        .insert({
          university_id: user.university_id,
          name: campusName,
          code: campusCode,
          pro_vice_chancellor: proVcName,
          establishment_year: establishmentYear,
          city: city,
          website_url: websiteUrl === '' ? null : websiteUrl,
          address: completeAddress || null,
          campus_photo_url: publicUrl, // Save full public URL
          is_main_campus: isMainCampus
        })
        .select()
        .single()

      if (error) {
        throw new Error('Failed to save campus: ' + error.message)
      }

      // Success confirmation
      console.log('Inserted Data:', data)
      alert('CAMPUS SAVED!')

      await recordSystemLog({
        universityId: user.university_id,
        actionType: 'CAMPUS_ADDED',
        details: `Added campus: ${campusName}${isMainCampus ? ' (Main Campus)' : ''}`,
      })

      // Data Migration: If this is the main campus, link existing faculties with null campus_id
      if (isMainCampus && data?.id) {
        try {
          const { error: updateError } = await supabase
            .from('faculties')
            .update({ campus_id: data.id })
            .eq('university_id', user.university_id)
            .is('campus_id', null)

          if (updateError) {
            console.warn('Warning: Could not update existing faculties:', updateError)
            // Don't throw error - campus was created successfully, migration is secondary
          } else {
            console.log('Successfully linked existing faculties to main campus')
            await recordSystemLog({
              universityId: user.university_id,
              actionType: 'FACULTY_UPDATED',
              details: `Linked existing faculties to newly created main campus: ${campusName}.`,
            })
          }
        } catch (migrationError) {
          console.warn('Warning: Error during faculty migration:', migrationError)
          // Don't throw error - campus was created successfully
        }
      }

      // Clear form
      setCampusName('')
      setCampusCode('')
      setProVcName('')
      setEstablishmentYear('')
      setCity('')
      setCitySearch('')
      setWebsiteUrl('')
      setCompleteAddress('')
      setIsMainCampus(false)
      setCampusPhotoFile(null)
      setCampusPhotoPreview(null)
      
      // Reset file input
      const fileInput = document.getElementById('campus-photo-upload')
      if (fileInput) fileInput.value = ''

      // Refresh campuses list
      await fetchCampuses()

      // Close modal form
      setShowForm(false)

      showToast('Campus added successfully!', 'success')
    } catch (error) {
      console.error('Error saving campus:', error)
      alert('SAVE FAILED: ' + error.message)
      showToast(error.message || 'Error saving campus', 'error')
    } finally {
      setSaving(false)
    }
  }

  const isValidUrl = (string) => {
    try {
      new URL(string)
      return true
    } catch (_) {
      return false
    }
  }

  const handleDelete = async (campusId) => {
    if (!confirm('Are you sure you want to delete this campus? This action cannot be undone.')) {
      return
    }

    try {
      const campusToDelete = campuses.find((campus) => campus.id === campusId)
      const { error } = await supabase
        .from('campuses')
        .delete()
        .eq('id', campusId)

      if (error) {
        throw new Error('Failed to delete campus: ' + error.message)
      }

      await recordSystemLog({
        universityId: user?.university_id,
        actionType: 'CAMPUS_DELETED',
        details: `Deleted campus: ${campusToDelete?.name || 'Unnamed campus'}`,
      })

      // Refresh campuses list
      await fetchCampuses()
      showToast('Campus deleted successfully', 'success')
    } catch (error) {
      console.error('Error deleting campus:', error)
      showToast(error.message || 'Error deleting campus', 'error')
    }
  }

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 5000)
  }

  if (loading) {
    return (
      <div className={`${UFP_PAGE_GRADIENT_CLASS} flex items-center justify-center`}>
        <div className="text-cyan-600 text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className={`${UFP_PAGE_GRADIENT_CLASS} p-8`}>
      <UfpManagementPageHeader
        className="mb-8"
        breadcrumbItems={[
          { label: 'Dashboard', path: '/ufp-dashboard' },
          { label: 'Campus Management' },
        ]}
        title="Campus Management"
        description="Manage your university's campuses and locations"
        icon={<Building2 className="h-5 w-5" strokeWidth={2} />}
      />

      {/* Gallery Grid */}
      {campuses.length === 0 ? (
        /* Empty State */
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-16 border border-slate-100 text-center max-w-2xl mx-auto"
        >
          <Building2 className="w-24 h-24 mx-auto mb-6 text-slate-300" />
          <h3 className="text-2xl font-bold text-slate-900 mb-3">No Campuses Yet</h3>
          <p className="text-slate-600 mb-8 text-lg">Get started by adding your first campus to begin organizing your university locations.</p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-8 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-full font-semibold transition-all shadow-md hover:shadow-lg text-lg"
          >
            <Plus className="w-6 h-6" />
            <span>Add First Campus</span>
          </button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Quick Add Card - Always First */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            onClick={() => setShowForm(true)}
            className="bg-white rounded-3xl shadow-xl shadow-blue-900/10 border-x border-b border-slate-200 border-t-[8px] border-t-blue-600 p-6 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col items-center justify-center min-h-[280px]"
          >
            <div className="w-20 h-20 rounded-full bg-cyan-100 flex items-center justify-center mb-4">
              <Plus className="w-10 h-10 text-cyan-600" />
            </div>
            <button className="px-8 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-full font-semibold transition-all shadow-md hover:shadow-lg">
              Add Campus
            </button>
          </motion.div>

          {/* Campus Cards */}
          {campuses.map((campus, index) => {
            return (
              <motion.div
                key={campus.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: (index + 1) * 0.1 }}
                className="bg-white shadow-xl shadow-blue-900/10 border-x border-b border-slate-200 border-t-[8px] border-t-blue-600 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 relative grid grid-cols-12 w-full h-auto min-h-[220px] overflow-hidden rounded-3xl"
              >
                {/* Main Campus Badge */}
                {campus.is_main_campus && (
                  <div className="absolute top-4 left-4 px-3 py-1 bg-emerald-500 text-white text-xs font-semibold rounded-full z-10">
                    Main Campus
                  </div>
                )}

                {/* Delete Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(campus.id)
                  }}
                  className="absolute top-4 right-4 w-10 h-10 rounded-full bg-slate-900 hover:bg-red-600 hover:scale-110 flex items-center justify-center shadow-md transition-all duration-200 z-10"
                  title="Delete campus"
                >
                  <Trash2 className="w-[18px] h-[18px] text-white" />
                </button>

                {/* Left Side - Campus Info (Col 1-7) */}
                <div className="col-span-7 flex flex-col gap-1 p-6 overflow-hidden">
                  <h3 className="text-xl font-bold text-slate-900 mb-2 line-clamp-2">
                    {campus.name}
                  </h3>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-3 py-1 bg-slate-100 text-slate-700 text-sm font-mono rounded-full">
                      {campus.code}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 mb-2 text-slate-600">
                    <MapPin className="w-4 h-4" />
                    <span className="text-sm">{campus.city}</span>
                  </div>
                  {campus.address && (
                    <p className="text-xs text-slate-500 line-clamp-2 mb-2">
                      {campus.address}
                    </p>
                  )}
                  <p className="text-sm text-slate-600 font-medium">
                    <span>{campus.is_main_campus ? 'VC' : 'Pro-VC'}: {campus.pro_vice_chancellor}</span>
                  </p>
                  {campus.establishment_year && (
                    <p className="text-xs text-slate-500">Est. {campus.establishment_year}</p>
                  )}
                </div>

                {/* Right Side - Campus Photo (Col 8-12) */}
                <div className="col-span-5 relative bg-slate-100 border-l border-slate-100 min-h-[220px] overflow-hidden rounded-r-3xl">
                  <div className="absolute inset-0 w-full h-full group">
                    {campus.campus_photo_url && campus.campus_photo_url.trim() !== '' ? (
                      <>
                        <img
                          src={campus.campus_photo_url}
                          alt={campus.name}
                          className="w-full h-full object-cover rounded-r-3xl"
                          onError={(e) => {
                            e.target.onerror = null; 
                            e.target.src = ''; 
                            e.target.classList.add('hidden');
                            if (e.target.nextSibling) {
                              e.target.nextSibling.classList.remove('hidden');
                            }
                          }}
                        />
                        <div className="w-full h-full bg-slate-100 flex items-center justify-center absolute inset-0 hidden">
                          <Building2 className="w-16 h-16 text-slate-400" />
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full bg-slate-100 flex items-center justify-center absolute inset-0">
                        <Building2 className="w-16 h-16 text-slate-400" />
                      </div>
                    )}
                    {/* Edit Photo Button - Centered Overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-200 flex items-center justify-center pointer-events-none">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files[0]
                          if (file) {
                            handleEditPhoto(campus.id, file)
                          }
                        }}
                        className="hidden"
                        id={`edit-campus-photo-${campus.id}`}
                        disabled={uploadingPhoto && editingPhotoFor === campus.id}
                      />
                      <label
                        htmlFor={`edit-campus-photo-${campus.id}`}
                        className={`flex items-center justify-center cursor-pointer pointer-events-auto ${
                          uploadingPhoto && editingPhotoFor === campus.id ? 'opacity-50 cursor-wait' : ''
                        }`}
                        title="Edit Campus Photo"
                      >
                        {uploadingPhoto && editingPhotoFor === campus.id ? (
                          <Loader2 className="w-6 h-6 text-white animate-spin opacity-100" />
                        ) : (
                          <Camera className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </label>
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
                    <h3 className="text-xl font-semibold text-slate-900">Add New Campus</h3>
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
                    {/* Sub-Campus Name */}
                    <div>
                      <label className="block text-sm font-medium text-slate-900 mb-2">
                        Sub-Campus Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={campusName}
                        onChange={(e) => setCampusName(e.target.value)}
                        placeholder="Enter sub-campus name"
                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm"
                        required
                      />
                    </div>

                    {/* Campus Code */}
                    <div>
                      <label className="block text-sm font-medium text-slate-900 mb-2">
                        Campus Code <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={campusCode}
                        onChange={(e) => setCampusCode(e.target.value.toUpperCase())}
                        placeholder="e.g., KHI, HYD"
                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm"
                        required
                      />
                    </div>

                    {/* Pro Vice Chancellor Name / Vice Chancellor Name */}
                    <div>
                      <label className="block text-sm font-medium text-slate-900 mb-2">
                        {isMainCampus ? 'Vice Chancellor Name' : 'Pro Vice Chancellor Name'} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={proVcName}
                        onChange={(e) => setProVcName(e.target.value)}
                        placeholder={isMainCampus ? "Enter VC's full name" : "Enter Pro-VC's full name"}
                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm"
                        required
                      />
                    </div>

                    {/* Establishment Year */}
                    <div>
                      <label className="block text-sm font-medium text-slate-900 mb-2">
                        Establishment Year <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={establishmentYear}
                        onChange={(e) => setEstablishmentYear(e.target.value)}
                        placeholder="e.g., 2020"
                        min="1900"
                        max={new Date().getFullYear()}
                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm"
                        required
                      />
                    </div>

                    {/* City Selection - Searchable Dropdown */}
                    <div className="relative">
                      <label className="block text-sm font-medium text-slate-900 mb-2">
                        City <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={citySearch || city}
                          onChange={(e) => {
                            setCitySearch(e.target.value)
                            setShowCityDropdown(true)
                            if (!e.target.value) {
                              setCity('')
                            }
                          }}
                          onFocus={() => setShowCityDropdown(true)}
                          placeholder="Search or select city"
                          className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm"
                          required
                        />
                        <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                      </div>
                      {showCityDropdown && filteredCities.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {filteredCities.map((cityName) => (
                            <button
                              key={cityName}
                              type="button"
                              onClick={() => {
                                setCity(cityName)
                                setCitySearch(cityName)
                                setShowCityDropdown(false)
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-slate-900 hover:bg-slate-100 transition-colors"
                            >
                              {cityName}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Website URL */}
                    <div>
                      <label className="block text-sm font-medium text-slate-900 mb-2">
                        Website URL
                      </label>
                      <input
                        type="url"
                        value={websiteUrl}
                        onChange={(e) => setWebsiteUrl(e.target.value)}
                        placeholder="https://campus.example.edu.pk"
                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm"
                      />
                    </div>

                    {/* Complete Address */}
                    <div>
                      <label className="block text-sm font-medium text-slate-900 mb-2">
                        Complete Address
                      </label>
                      <textarea
                        value={completeAddress}
                        onChange={(e) => setCompleteAddress(e.target.value)}
                        placeholder="Enter complete address"
                        rows={3}
                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm resize-none"
                      />
                    </div>

                    {/* Campus Photo Upload */}
                    <div>
                      <label className="block text-sm font-medium text-slate-900 mb-2">
                        Campus Photo <span className="text-slate-500 text-xs">(Optional)</span>
                      </label>
                      <div className="flex items-center gap-4">
                        {campusPhotoPreview ? (
                          <div className="w-32 h-32 rounded-xl border-4 border-slate-200 overflow-hidden bg-white flex-shrink-0">
                            <img
                              src={campusPhotoPreview}
                              alt="Campus preview"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-32 h-32 rounded-xl border-4 border-slate-200 bg-slate-100 flex items-center justify-center flex-shrink-0">
                            <Building2 className="w-12 h-12 text-slate-400" />
                          </div>
                        )}
                        <div className="flex-1">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoChange}
                            className="hidden"
                            id="campus-photo-upload"
                          />
                          <label
                            htmlFor="campus-photo-upload"
                            className="flex items-center gap-2 px-4 py-3 bg-white border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-blue-600 transition-colors text-sm text-slate-700 hover:text-blue-600"
                          >
                            <Camera className="w-5 h-5" />
                            <span>{campusPhotoPreview ? 'Change Photo' : 'Upload Photo'}</span>
                          </label>
                          {campusPhotoPreview && (
                            <button
                              type="button"
                              onClick={() => {
                                setCampusPhotoFile(null)
                                setCampusPhotoPreview(null)
                                const fileInput = document.getElementById('campus-photo-upload')
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

                    {/* Main Campus Toggle */}
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <div>
                        <label className="block text-sm font-medium text-slate-900 mb-1">
                          Set as Main Campus
                        </label>
                        <p className="text-xs text-slate-500">Mark this campus as the main campus</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsMainCampus(!isMainCampus)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          isMainCampus ? 'bg-emerald-600' : 'bg-slate-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            isMainCampus ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
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
                        <span>Save Campus</span>
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
    </div>
  )
}

export default CampusManagement
