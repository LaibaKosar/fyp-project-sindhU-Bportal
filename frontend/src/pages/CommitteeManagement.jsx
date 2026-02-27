import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabaseClient'
import { useNavigate, useLocation } from 'react-router-dom'
import { 
  Trash2, 
  Plus, 
  Loader2,
  X,
  ArrowLeft,
  Users,
  Gavel,
  Briefcase,
  Calendar,
  CheckCircle2,
  XCircle,
  Camera,
  Edit2
} from 'lucide-react'
import Breadcrumbs from '../components/Breadcrumbs'

// Roles in Committee
const COMMITTEE_ROLES = [
  'Chairman',
  'Secretary',
  'Member',
  'Alumnus Representative'
]

function CommitteeManagement() {
  const navigate = useNavigate()
  const location = useLocation()
  
  // Determine committee type from URL path
  const isSenate = location.pathname.includes('senate')
  const committeeType = isSenate ? 'Senate' : 'Syndicate'
  const committeeTitle = isSenate ? 'University Senate' : 'University Syndicate'
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState(null)
  const [members, setMembers] = useState([])
  const [committees, setCommittees] = useState([])
  const [committeeId, setCommitteeId] = useState(null)
  const [toast, setToast] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [editingPhotoFor, setEditingPhotoFor] = useState(null)

  // Form state
  const [memberName, setMemberName] = useState('')
  const [designation, setDesignation] = useState('')
  const [roleInCommittee, setRoleInCommittee] = useState('')
  const [termStart, setTermStart] = useState('')
  const [termEnd, setTermEnd] = useState('')
  const [statusAsPerAct, setStatusAsPerAct] = useState('')
  const [profilePhotoFile, setProfilePhotoFile] = useState(null)
  const [profilePhotoPreview, setProfilePhotoPreview] = useState(null)

  useEffect(() => {
    loadUserData()
  }, [])

  useEffect(() => {
    if (user?.university_id) {
      fetchCommittees()
    }
  }, [user, committeeType])

  useEffect(() => {
    if (committeeId && user?.university_id) {
      fetchMembers()
    }
  }, [committeeId, user])

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

  const fetchCommittees = async () => {
    if (!user?.university_id) return

    try {
      // Fetch committees for this university, matching the type
      const { data, error } = await supabase
        .from('committees')
        .select('id, name, type')
        .eq('university_id', user.university_id)
        .eq('type', committeeType)
        .maybeSingle()

      if (error) throw error

      if (data) {
        setCommitteeId(data.id)
        setCommittees([data])
      } else {
        // If committee doesn't exist, create it
        const { data: newCommittee, error: createError } = await supabase
          .from('committees')
          .insert({
            university_id: user.university_id,
            name: committeeTitle,
            type: committeeType
          })
          .select()
          .single()

        if (createError) throw createError

        if (newCommittee) {
          setCommitteeId(newCommittee.id)
          setCommittees([newCommittee])
        }
      }
    } catch (error) {
      console.error('Error fetching/creating committee:', error)
      // Fallback: try to fetch members directly by type if committees table structure is different
      // This allows flexibility if the schema uses committee_type directly in committee_members
      fetchMembersByType()
    }
  }

  const fetchMembersByType = async () => {
    if (!user?.university_id) return

    try {
      // Alternative: fetch members directly if committee_members has committee_type column
      const { data, error } = await supabase
        .from('committee_members')
        .select('*')
        .eq('university_id', user.university_id)
        .eq('committee_type', committeeType)
        .order('term_start', { ascending: false })

      if (error) {
        // If this fails, try with committee_id approach
        console.error('Error fetching members by type:', error)
        return
      }

      setMembers(data || [])
    } catch (error) {
      console.error('Error in fetchMembersByType:', error)
    }
  }

  const fetchMembers = async () => {
    if (!user?.university_id || !committeeId) return

    try {
      const { data, error } = await supabase
        .from('committee_members')
        .select('*')
        .eq('university_id', user.university_id)
        .eq('committee_id', committeeId)
        .order('term_start', { ascending: false })

      if (error) throw error
      setMembers(data || [])
    } catch (error) {
      console.error('Error fetching members:', error)
      showToast('Error loading committee members: ' + error.message, 'error')
    }
  }

  const uploadMemberPhoto = async (file) => {
    if (!file || !user?.university_id) return null

    try {
      const fileName = `committee-photo-${user.university_id}-${Date.now()}-${file.name}`
      
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

  const handleEditPhoto = async (memberId, file) => {
    if (!file || !user?.university_id) return

    setUploadingPhoto(true)
    setEditingPhotoFor(memberId)

    try {
      const publicUrl = await uploadMemberPhoto(file)
      
      if (!publicUrl) return

      const { error: updateError } = await supabase
        .from('committee_members')
        .update({ profile_pic_url: publicUrl + '?t=' + Date.now() })
        .eq('id', memberId)

      if (updateError) throw updateError

      // Update local state
      setMembers(prevMembers => 
        prevMembers.map(member => 
          member.id === memberId 
            ? { ...member, profile_pic_url: publicUrl + '?t=' + Date.now() }
            : member
        )
      )

      showToast('Profile picture updated successfully!', 'success')
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

    if (!memberName || !roleInCommittee) {
      showToast('Please fill in all required fields', 'error')
      return
    }

    if (!termStart || !termEnd) {
      showToast('Please select term start and end dates', 'error')
      return
    }

    if (new Date(termEnd) < new Date(termStart)) {
      showToast('Term end date must be after term start date', 'error')
      return
    }

    setSaving(true)

    try {
      // Upload profile photo if provided
      let publicUrl = null
      if (profilePhotoFile) {
        publicUrl = await uploadMemberPhoto(profilePhotoFile)
      }

      const memberData = {
        university_id: user.university_id,
        member_name: memberName,
        designation: designation || null,
        role_in_committee: roleInCommittee,
        term_start: termStart,
        term_end: termEnd,
        status_as_per_act: statusAsPerAct || null,
        profile_pic_url: publicUrl
      }

      // Add committee_id if available, otherwise use committee_type
      if (committeeId) {
        memberData.committee_id = committeeId
      } else {
        memberData.committee_type = committeeType
      }

      const { data, error } = await supabase
        .from('committee_members')
        .insert(memberData)
        .select()
        .single()

      if (error) throw error

      showToast('Committee member added successfully!', 'success')
      
      // Clear form
      setMemberName('')
      setDesignation('')
      setRoleInCommittee('')
      setTermStart('')
      setTermEnd('')
      setStatusAsPerAct('')
      setProfilePhotoFile(null)
      setProfilePhotoPreview(null)
      
      const fileInput = document.getElementById('member-photo-upload')
      if (fileInput) fileInput.value = ''
      
      await fetchMembers()
      setShowForm(false)
    } catch (error) {
      console.error('Error saving committee member:', error)
      showToast(error.message || 'Error saving committee member', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (memberId) => {
    if (!confirm('Are you sure you want to delete this committee member? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('committee_members')
        .delete()
        .eq('id', memberId)

      if (error) throw error

      await fetchMembers()
      showToast('Committee member deleted successfully', 'success')
    } catch (error) {
      console.error('Error deleting committee member:', error)
      showToast(error.message || 'Error deleting committee member', 'error')
    }
  }

  const getStatus = (termStart, termEnd) => {
    const today = new Date()
    const start = new Date(termStart)
    const end = new Date(termEnd)
    
    if (today >= start && today <= end) {
      return { label: 'Current', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 }
    } else if (today > end) {
      return { label: 'Expired', color: 'bg-red-100 text-red-700', icon: XCircle }
    } else {
      return { label: 'Upcoming', color: 'bg-blue-100 text-blue-700', icon: Calendar }
    }
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
            { label: committeeTitle }
          ]}
          className="text-white/80 mb-2"
        />

        {/* Header */}
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">{committeeTitle}</h2>
          <p className="text-white/90">
            Manage members of the {committeeTitle.toLowerCase()}
          </p>
        </div>
      </motion.div>

      {/* Gallery Grid */}
      {members.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-16 border border-slate-100 text-center max-w-2xl mx-auto"
        >
          {isSenate ? (
            <Gavel className="w-24 h-24 mx-auto mb-6 text-slate-300" />
          ) : (
            <Briefcase className="w-24 h-24 mx-auto mb-6 text-slate-300" />
          )}
          <h3 className="text-2xl font-bold text-slate-900 mb-3">No Members Yet</h3>
          <p className="text-slate-600 mb-8 text-lg">Get started by adding your first committee member.</p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-8 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-full font-semibold transition-all shadow-md hover:shadow-lg text-lg"
          >
            <Plus className="w-6 h-6" />
            <span>Add First Member</span>
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
              Add Member
            </button>
          </motion.div>

          {/* Member Cards */}
          {members.map((member, index) => {
            const status = getStatus(member.term_start, member.term_end)
            const StatusIcon = status.icon

            return (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: (index + 1) * 0.1 }}
                className="bg-white rounded-3xl shadow-xl shadow-blue-900/10 border-x border-b border-slate-200 border-t-[8px] border-t-blue-600 p-8 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 relative max-w-[380px] w-full flex flex-col items-center text-center"
              >
                {/* Status Badge */}
                <div className={`absolute top-4 left-4 px-3 py-1 text-xs font-semibold rounded-full flex items-center gap-1 z-10 ${status.color}`}>
                  <StatusIcon className="w-3 h-3" />
                  <span>{status.label}</span>
                </div>

                {/* Delete Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(member.id)
                  }}
                  className="absolute top-4 right-4 w-10 h-10 rounded-full bg-slate-900 hover:bg-red-600 hover:scale-110 flex items-center justify-center shadow-md transition-all duration-200 z-10"
                  title="Delete member"
                >
                  <Trash2 className="w-[18px] h-[18px] text-white" />
                </button>

                {/* Member Photo */}
                <div className="mb-6 relative">
                  <div className="w-32 h-32 rounded-full border-4 border-slate-200 overflow-hidden bg-white flex items-center justify-center mx-auto shadow-sm relative">
                    {member.profile_pic_url ? (
                      <img
                        src={member.profile_pic_url}
                        alt={member.member_name}
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
                    <div className={`w-full h-full bg-slate-100 flex items-center justify-center rounded-full ${member.profile_pic_url ? 'hidden absolute inset-0' : ''}`}>
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

                {/* Member Info */}
                <div className="text-center w-full">
                  <h3 className="text-lg font-bold text-slate-900 mb-2 line-clamp-2">
                    {member.member_name}
                  </h3>
                  {member.designation && (
                    <p className="text-sm text-slate-600 mb-2">
                      {member.designation}
                    </p>
                  )}
                  {member.status_as_per_act && (
                    <p className="text-xs text-slate-500 italic mb-2">
                      {member.status_as_per_act}
                    </p>
                  )}
                  <div className="mb-3">
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                      {member.role_in_committee}
                    </span>
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-200 space-y-2">
                    <div className="flex items-center justify-center gap-2 text-xs text-slate-600">
                      <Calendar className="w-4 h-4" />
                      <span className="font-semibold">Term:</span>
                      <span>{formatDate(member.term_start)} - {formatDate(member.term_end)}</span>
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
                    <h3 className="text-xl font-semibold text-slate-900">Add Committee Member</h3>
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
                    {/* Member Name */}
                    <div>
                      <label className="block text-sm font-medium text-slate-900 mb-2">
                        Member Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={memberName}
                        onChange={(e) => setMemberName(e.target.value)}
                        placeholder="e.g., Dr. John Smith"
                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm"
                        required
                      />
                    </div>

                    {/* Designation */}
                    <div>
                      <label className="block text-sm font-medium text-slate-900 mb-2">
                        Designation
                      </label>
                      <input
                        type="text"
                        value={designation}
                        onChange={(e) => setDesignation(e.target.value)}
                        placeholder="e.g., Vice Chancellor, Dean, Government Representative"
                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm"
                      />
                    </div>

                    {/* Official Seat / Status As Per Act */}
                    <div>
                      <label className="block text-sm font-medium text-slate-900 mb-2">
                        Official Seat / Status As Per Act
                      </label>
                      <input
                        type="text"
                        value={statusAsPerAct}
                        onChange={(e) => setStatusAsPerAct(e.target.value)}
                        placeholder="e.g., Nominee of the Commission, The Commissioner Sukkur Division"
                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm"
                      />
                      <p className="mt-1 text-xs text-slate-500 italic">
                        This field helps the U&B Department verify that the committee composition follows the University Act.
                      </p>
                    </div>

                    {/* Profile Picture Upload */}
                    <div>
                      <label className="block text-sm font-medium text-slate-900 mb-2">
                        Profile Picture
                      </label>
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <div className="w-24 h-24 rounded-full border-4 border-slate-200 overflow-hidden bg-slate-100 flex items-center justify-center">
                            {profilePhotoPreview ? (
                              <img
                                src={profilePhotoPreview}
                                alt="Preview"
                                className="w-full h-full object-cover rounded-full"
                              />
                            ) : (
                              <Camera className="w-10 h-10 text-slate-400" />
                            )}
                          </div>
                        </div>
                        <div className="flex-1">
                          <input
                            type="file"
                            id="member-photo-upload"
                            accept="image/*"
                            onChange={handlePhotoChange}
                            className="hidden"
                          />
                          <label
                            htmlFor="member-photo-upload"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-all cursor-pointer text-sm"
                          >
                            <Camera className="w-4 h-4" />
                            <span>{profilePhotoFile ? 'Change Photo' : 'Upload Photo'}</span>
                          </label>
                          {profilePhotoFile && (
                            <button
                              type="button"
                              onClick={() => {
                                setProfilePhotoFile(null)
                                setProfilePhotoPreview(null)
                                const fileInput = document.getElementById('member-photo-upload')
                                if (fileInput) fileInput.value = ''
                              }}
                              className="ml-2 text-sm text-red-600 hover:text-red-700"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Role in Committee */}
                    <div>
                      <label className="block text-sm font-medium text-slate-900 mb-2">
                        Role in Committee <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={roleInCommittee}
                        onChange={(e) => setRoleInCommittee(e.target.value)}
                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm"
                        required
                      >
                        <option value="">Select Role</option>
                        {COMMITTEE_ROLES.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                    </div>

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
                          <span>Save Member</span>
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

export default CommitteeManagement
