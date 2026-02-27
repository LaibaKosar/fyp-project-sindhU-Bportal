import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabaseClient'
import { useNavigate } from 'react-router-dom'
import { Upload, X, CheckCircle, ArrowRight, ArrowLeft } from 'lucide-react'

function UFPSetupWizard() {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [user, setUser] = useState(null)
  const [university, setUniversity] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)
  const [logoFile, setLogoFile] = useState(null)

  // Step 1 Form State
  const [viceChancellorName, setViceChancellorName] = useState('')
  const [focalPersonName, setFocalPersonName] = useState('')
  const [mobileNumber, setMobileNumber] = useState('')
  const [officePhone, setOfficePhone] = useState('')
  const [officialEmail, setOfficialEmail] = useState('')

  // Step 2 Form State
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [address, setAddress] = useState('')
  const [region, setRegion] = useState('')

  useEffect(() => {
    loadUserData()
  }, [])

  const loadUserData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        navigate('/login')
        return
      }

      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*, universities(*)')
        .eq('id', session.user.id)
        .single()

      if (profileError) {
        console.error('Error fetching profile:', profileError)
        navigate('/login')
        return
      }

      // Check if user is UFP
      if (profile.role !== 'UFP') {
        navigate('/')
        return
      }

      // Check if setup is already complete
      if (profile.is_setup_complete) {
        navigate('/ufp-dashboard')
        return
      }

      setUser(profile)
      setOfficialEmail(session.user.email || '')
      
      // Get university data
      if (profile.university_id) {
        const { data: uniData, error: uniError } = await supabase
          .from('universities')
          .select('*')
          .eq('id', profile.university_id)
          .single()

        if (!uniError && uniData) {
          setUniversity(uniData)
          // Pre-fill if already exists
          setWebsiteUrl(uniData.website_url || '')
          setAddress(uniData.address || '')
          setRegion(uniData.region || '')
        }
      }

      // Pre-fill profile data if exists
      if (profile.full_name) setFocalPersonName(profile.full_name)
      if (profile.phone_number) setMobileNumber(profile.phone_number)
      if (profile.office_phone) setOfficePhone(profile.office_phone)

      setLoading(false)
    } catch (error) {
      console.error('Error loading user data:', error)
      navigate('/login')
    }
  }

  const handleLogoUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      // Store the actual file for upload
      setLogoFile(file)
      
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoPreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleNext = () => {
    // Validate Step 1
    if (!viceChancellorName.trim() || !focalPersonName.trim() || !mobileNumber.trim()) {
      alert('Please fill in all required fields')
      return
    }
    setCurrentStep(2)
  }

  const handleBack = () => {
    setCurrentStep(1)
  }

  const handleCancel = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const handleSubmit = async () => {
    // Validate Step 2
    if (!websiteUrl.trim() || !address.trim() || !region.trim()) {
      alert('Please fill in all required fields')
      return
    }

    setSubmitting(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        navigate('/login')
        return
      }

      // Get current user profile to ensure we have university_id
      const { data: currentProfile, error: profileFetchError } = await supabase
        .from('profiles')
        .select('university_id')
        .eq('id', session.user.id)
        .single()

      if (profileFetchError) {
        console.error('Error fetching profile for university_id:', profileFetchError)
        throw new Error('Failed to fetch user profile: ' + profileFetchError.message)
      }

      if (!currentProfile?.university_id) {
        throw new Error('University ID not found in profile. Please contact administrator.')
      }

      // Upload logo to storage if file is selected
      let logoUrl = null
      if (logoFile) {
        console.log('Starting logo upload to storage...')
        console.log('File details:', {
          name: logoFile.name,
          type: logoFile.type,
          size: logoFile.size
        })

        const fileName = `logo-${currentProfile.university_id}`
        console.log('Uploading file as:', fileName)

        // Upload file to university-logos bucket
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('university-logos')
          .upload(fileName, logoFile, {
            cacheControl: '3600',
            upsert: true // Replace existing file if it exists
          })

        if (uploadError) {
          console.error('Error uploading logo to storage:', uploadError)
          throw new Error('Failed to upload logo: ' + uploadError.message)
        }

        console.log('Logo uploaded successfully to storage:', uploadData)

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('university-logos')
          .getPublicUrl(fileName)

        logoUrl = urlData.publicUrl
        console.log('Logo public URL generated:', logoUrl)
      } else {
        console.log('No logo file selected, skipping upload')
      }

      // Update profiles table - explicitly set all fields
      console.log('Updating profiles table with:', {
        id: session.user.id,
        full_name: focalPersonName,
        phone_number: mobileNumber,
        office_phone: officePhone || null,
        is_setup_complete: true
      })

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: focalPersonName,
          phone_number: mobileNumber,
          office_phone: officePhone || null,
          designation: 'Focal Person',
          is_setup_complete: true
        })
        .eq('id', session.user.id)
        .select()

      if (profileError) {
        console.error('Error updating profiles table:', profileError)
        throw new Error('Failed to update profile: ' + profileError.message)
      }

      console.log('Profiles table updated successfully:', profileData)

      // Update universities table using university_id from profile
      const universityUpdateData = {
        website_url: websiteUrl,
        address: address,
        region: region,
        vice_chancellor_name: viceChancellorName
      }

      // Add logo_url if logo was uploaded
      if (logoUrl) {
        universityUpdateData.logo_url = logoUrl
      }

      console.log('Updating universities table with:', {
        id: currentProfile.university_id,
        ...universityUpdateData
      })

      const { data: uniData, error: uniError } = await supabase
        .from('universities')
        .update(universityUpdateData)
        .eq('id', currentProfile.university_id)
        .select()

      if (uniError) {
        console.error('Error updating universities table:', uniError)
        throw new Error('Failed to update university: ' + uniError.message)
      }

      console.log('Universities table updated successfully:', uniData)

      // Redirect to UFP dashboard
      navigate('/ufp-dashboard')
    } catch (error) {
      console.error('Error submitting setup:', error)
      alert('Error completing setup: ' + error.message)
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50/50 to-emerald-100/50 flex items-center justify-center">
        <div className="text-emerald-600 text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50/50 to-emerald-100/50 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Cancel & Logout Link */}
        <div className="flex justify-end mb-4">
          <button
            onClick={handleCancel}
            className="text-slate-600 hover:text-slate-900 text-sm font-medium transition-colors"
          >
            Cancel & Logout
          </button>
        </div>

        {/* Main Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-2xl shadow-xl p-8"
        >
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className={`flex items-center gap-2 ${currentStep === 1 ? 'text-blue-600' : 'text-slate-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                  currentStep === 1 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                  {currentStep > 1 ? <CheckCircle className="w-5 h-5" /> : '1'}
                </div>
                <span className="font-medium">University Details</span>
              </div>
              <div className="flex-1 h-0.5 bg-slate-200 mx-4"></div>
              <div className={`flex items-center gap-2 ${currentStep === 2 ? 'text-blue-600' : 'text-slate-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                  currentStep === 2 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                  2
                </div>
                <span className="font-medium">Address & Region</span>
              </div>
            </div>
          </div>

          {/* Step 1: University Details */}
          <AnimatePresence mode="wait">
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Left Column: Institution Information */}
                  <div className="space-y-6">
                    <h3 className="text-xl font-semibold text-slate-900 mb-6">Institution Information</h3>
                    
                    {/* University Name (Read-only) */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        University <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={university?.name || ''}
                        readOnly
                        className="w-full px-4 py-2.5 bg-slate-100 border border-slate-300 rounded-lg text-slate-600 cursor-not-allowed"
                      />
                    </div>

                    {/* Vice Chancellor Name */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Vice Chancellor Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={viceChancellorName}
                        onChange={(e) => setViceChancellorName(e.target.value)}
                        placeholder="Enter Vice Chancellor's name"
                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all"
                        required
                      />
                    </div>

                    {/* University Emblem/Logo */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        University Emblem/Logo <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                          id="logo-upload"
                        />
                        <label
                          htmlFor="logo-upload"
                          className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-blue-600 hover:bg-blue-50/50 transition-all"
                        >
                          {logoPreview ? (
                            <img src={logoPreview} alt="Logo preview" className="w-full h-full object-cover rounded-lg" />
                          ) : (
                            <>
                              <Upload className="w-8 h-8 text-slate-400 mb-2" />
                              <span className="text-sm text-slate-600">Click to upload</span>
                            </>
                          )}
                        </label>
                        {logoPreview && (
                          <button
                            onClick={() => {
                              setLogoPreview(null)
                              setLogoFile(null)
                            }}
                            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Focal Person Details */}
                  <div className="space-y-6">
                    <h3 className="text-xl font-semibold text-slate-900 mb-6">Focal Person Details</h3>
                    
                    {/* Focal Person Name */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Focal Person Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={focalPersonName}
                        onChange={(e) => setFocalPersonName(e.target.value)}
                        placeholder="Enter your full name"
                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all"
                        required
                      />
                    </div>

                    {/* Mobile Number */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Mobile Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        value={mobileNumber}
                        onChange={(e) => setMobileNumber(e.target.value)}
                        placeholder="Enter mobile number"
                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all"
                        required
                      />
                    </div>

                    {/* Official Email (Read-only) */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Official Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        value={officialEmail}
                        readOnly
                        className="w-full px-4 py-2.5 bg-slate-100 border border-slate-300 rounded-lg text-slate-600 cursor-not-allowed"
                      />
                      <p className="mt-1 text-xs text-slate-500">This email is locked and cannot be changed</p>
                    </div>

                    {/* Office Phone (Optional) */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Office Phone <span className="text-slate-400">(Optional)</span>
                      </label>
                      <input
                        type="tel"
                        value={officePhone}
                        onChange={(e) => setOfficePhone(e.target.value)}
                        placeholder="Enter office phone number"
                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Next Button */}
                <div className="flex justify-end mt-8">
                  <button
                    onClick={handleNext}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all shadow-md hover:shadow-lg"
                  >
                    Next Step
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 2: Address & Region */}
            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="space-y-6 max-w-2xl">
                  <h3 className="text-xl font-semibold text-slate-900 mb-6">Address & Region</h3>
                  
                  {/* University Website URL */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      University Website URL <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="url"
                      value={websiteUrl}
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                      placeholder="https://www.university.edu.pk"
                      className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all"
                      required
                    />
                  </div>

                  {/* Full Office Address */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Full Office Address <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Enter complete office address"
                      rows={4}
                      className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all resize-none"
                      required
                    />
                  </div>

                  {/* Region/City */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Region/City <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={region}
                      onChange={(e) => setRegion(e.target.value)}
                      placeholder="Enter region or city"
                      className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all"
                      required
                    />
                  </div>
                </div>

                {/* Navigation Buttons */}
                <div className="flex justify-between mt-8">
                  <button
                    onClick={handleBack}
                    className="flex items-center gap-2 px-6 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium transition-all"
                  >
                    <ArrowLeft className="w-5 h-5" />
                    Back
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || !logoFile}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all shadow-md hover:shadow-lg"
                  >
                    {submitting ? 'Submitting...' : 'Complete Setup'}
                    <CheckCircle className="w-5 h-5" />
                  </button>
                </div>
                {!logoFile && (
                  <p className="text-sm text-red-500 mt-2 text-center">
                    Please upload a university logo to continue
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  )
}

export default UFPSetupWizard
