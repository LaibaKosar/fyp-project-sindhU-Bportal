import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabaseClient'
import { useNavigate, useLocation } from 'react-router-dom'
import { 
  Trash2, 
  Plus, 
  Loader2,
  X,
  Users,
  Gavel,
  Briefcase,
  Calendar,
  CheckCircle2,
  XCircle,
  Camera,
  Landmark,
} from 'lucide-react'
import { UfpAdminShell, UfpAdminPageWide, UfpAdminLoadingCenter } from '../components/UfpAdminShell'
import { UfpManagementPageHeader } from '../components/UfpManagementPageHeader'
import { recordSystemLog } from '../utils/systemLogs'
import { normalizeText } from '../utils/validation/commonValidators'
import {
  FIELD_LIMITS,
  validateDateRangeField,
  validateRequiredField,
} from '../utils/validation/formRules'

// Roles in Committee
const OFFICIAL_SEAT_OPTIONS = [
  'Vice Chancellor',
  'Pro- Chancellor',
  'Pro Vice Chancellor',
  'Registrar',
  'Controller of Examinations',
  'Treasurer / Director Finance',
  'Dean',
  'Director (Institute / Center)',
  'Chairperson / Head of Department',
  'Professor (Elected Representative)',
  'Associate Professor (Elected Representative)',
  'Assistant Professor (Elected Representative)',
  'Government Nominee',
  'Chancellor’s Nominee',
  'HEC Nominee',
  'Industry Representative',
  'External Academic Expert',
  'Syndicate Nominee',
  'Senate Member',
  'Board of Studies Representative',
  'Academic Council Nominee',
  'Alumni Representative',
  'Student Representative',
  'Co-opted Member',
  'Observer'
]
const OTHER_OFFICIAL_SEAT_OPTION = '__OTHER_OFFICIAL_SEAT__'

const COMMITTEE_ROLES = [
  'Chairperson',
  'Vice Chairperson',
  'Member',
  'Secretary',
  'Joint Secretary',
  'Convener',
  'Co-Convener',
  'Rapporteur',
  'Coordinator',
  'Observer',
  'Invitee',
  'Guest Member',
  'External Advisor',
  'Recording Secretary',
  'Minute Taker'
]

function CommitteeManagement() {
  const navigate = useNavigate()
  const location = useLocation()
  
  // Determine committee type from URL path
  const isAcademicCouncil = location.pathname.includes('academic-council')
  const isSenate = location.pathname.includes('senate')
  const committeeType = isAcademicCouncil ? 'Academic Council' : isSenate ? 'Senate' : 'Syndicate'
  const committeeTitle = isAcademicCouncil
    ? 'Academic Council'
    : isSenate
      ? 'University Senate'
      : 'University Syndicate'
  const memberNoun = isAcademicCouncil ? 'council member' : 'committee member'
  const EntityIcon = isAcademicCouncil ? Landmark : isSenate ? Gavel : Briefcase
  const emptyStateTitle = isAcademicCouncil
    ? 'No Academic Council members added yet'
    : isSenate
      ? 'No Senate members added yet'
      : 'No Syndicate members added yet'
  const emptyStateSubtitle = isAcademicCouncil
    ? 'Record the statutory composition (seats, roles, terms) so it stays verifiable for U&B and audits.'
    : isSenate
      ? 'Add senators and officers to reflect your University Act and current term.'
      : 'Add syndicate members to reflect executive governance and statutory roles.'
  
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
  const [acDuplicateCommittees, setAcDuplicateCommittees] = useState(false)
  const [selectedMemberId, setSelectedMemberId] = useState(null)

  // Form state
  const [memberName, setMemberName] = useState('')
  const [designation, setDesignation] = useState('')
  const [roleInCommittee, setRoleInCommittee] = useState('')
  const [termStart, setTermStart] = useState('')
  const [termEnd, setTermEnd] = useState('')
  const [statusAsPerAct, setStatusAsPerAct] = useState('')
  const [customStatusAsPerAct, setCustomStatusAsPerAct] = useState('')
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

  const resolvedMemberId = useMemo(() => {
    if (members.length === 0) return null
    if (selectedMemberId != null && members.some((m) => m.id === selectedMemberId)) {
      return selectedMemberId
    }
    return members[0].id
  }, [members, selectedMemberId])

  const selectedMember = useMemo(
    () =>
      resolvedMemberId != null ? members.find((m) => m.id === resolvedMemberId) ?? null : null,
    [members, resolvedMemberId]
  )

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
      if (committeeType === 'Academic Council') {
        const { data: rows, error } = await supabase
          .from('committees')
          .select('id, name, type, created_at')
          .eq('university_id', user.university_id)
          .eq('type', committeeType)
          .order('created_at', { ascending: true })

        if (error) throw error

        const list = rows || []
        setAcDuplicateCommittees(list.length > 1)

        if (list.length > 0) {
          const primary = list[0]
          setCommitteeId(primary.id)
          setCommittees([primary])
        } else {
          const { data: newCommittee, error: createError } = await supabase
            .from('committees')
            .insert({
              university_id: user.university_id,
              name: committeeTitle,
              type: committeeType,
            })
            .select()
            .single()

          if (createError) throw createError

          if (newCommittee) {
            setCommitteeId(newCommittee.id)
            setCommittees([newCommittee])
            await recordSystemLog({
              universityId: user.university_id,
              actionType: 'COMMITTEE_ADDED',
              details: `Created statutory body record: ${committeeTitle}`,
            })
          }
        }
        return
      }

      // Senate / Syndicate: single committee per type
      const { data, error } = await supabase
        .from('committees')
        .select('id, name, type')
        .eq('university_id', user.university_id)
        .eq('type', committeeType)
        .maybeSingle()

      if (error) throw error
      setAcDuplicateCommittees(false)

      if (data) {
        setCommitteeId(data.id)
        setCommittees([data])
      } else {
        const { data: newCommittee, error: createError } = await supabase
          .from('committees')
          .insert({
            university_id: user.university_id,
            name: committeeTitle,
            type: committeeType,
          })
          .select()
          .single()

        if (createError) throw createError

        if (newCommittee) {
          setCommitteeId(newCommittee.id)
          setCommittees([newCommittee])
          await recordSystemLog({
            universityId: user.university_id,
            actionType: 'COMMITTEE_ADDED',
            details: `Created committee: ${committeeTitle}`,
          })
        }
      }
    } catch (error) {
      console.error('Error fetching/creating committee:', error)
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
        .from('staff-profiles')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) throw uploadError

      const { data: publicUrlData } = supabase.storage
        .from('staff-profiles')
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

      const updatedMember = members.find((member) => member.id === memberId)
      await recordSystemLog({
        universityId: user.university_id,
        actionType: 'COMMITTEE_MEMBER_UPDATED',
        details: `Updated profile photo for ${updatedMember?.full_name || memberNoun} (${committeeType}).`,
      })

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

    const normalizedMemberName = normalizeText(memberName)
    const normalizedDesignation = normalizeText(designation)
    const normalizedRole = normalizeText(roleInCommittee)
    const normalizedCustomStatus = normalizeText(customStatusAsPerAct)

    const memberNameError = validateRequiredField(normalizedMemberName, 'member name')
    if (memberNameError) return showToast(memberNameError, 'error')
    if (normalizedMemberName.length > FIELD_LIMITS.name) {
      return showToast(`Member name is too long (max ${FIELD_LIMITS.name} characters)`, 'error')
    }
    const roleError = validateRequiredField(normalizedRole, 'role in committee')
    if (roleError) return showToast(roleError, 'error')

    if (!termStart || !termEnd) {
      showToast('Please select term start and end dates', 'error')
      return
    }

    const dateError = validateDateRangeField(termStart, termEnd)
    if (dateError) {
      showToast('Term end date must be after term start date', 'error')
      return
    }

    const finalStatusAsPerAct =
      statusAsPerAct === OTHER_OFFICIAL_SEAT_OPTION ? normalizedCustomStatus : statusAsPerAct

    if (statusAsPerAct === OTHER_OFFICIAL_SEAT_OPTION && !finalStatusAsPerAct) {
      showToast('Please enter official seat / status as per act', 'error')
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
        full_name: normalizedMemberName,
        designation: normalizedDesignation || null,
        role_in_committee: normalizedRole,
        term_start: termStart,
        term_end: termEnd,
        status_as_per_act: finalStatusAsPerAct || null,
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

      await recordSystemLog({
        universityId: user.university_id,
        actionType: 'COMMITTEE_MEMBER_ADDED',
        details: `Added ${committeeType} member: ${normalizedMemberName} (${normalizedRole}).`,
      })

      // Show the new member card immediately without requiring a page reload.
      if (data) {
        setMembers((prev) => [data, ...prev])
        if (data.id) setSelectedMemberId(data.id)
      }

      showToast(
        isAcademicCouncil ? 'Academic Council member added successfully!' : 'Committee member added successfully!',
        'success'
      )
      
      // Clear form
      setMemberName('')
      setDesignation('')
      setRoleInCommittee('')
      setTermStart('')
      setTermEnd('')
      setStatusAsPerAct('')
      setCustomStatusAsPerAct('')
      setProfilePhotoFile(null)
      setProfilePhotoPreview(null)
      
      const fileInput = document.getElementById('member-photo-upload')
      if (fileInput) fileInput.value = ''
      
      if (committeeId) {
        await fetchMembers()
      } else {
        await fetchMembersByType()
      }
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
      const memberToDelete = members.find((member) => member.id === memberId)
      const { error } = await supabase
        .from('committee_members')
        .delete()
        .eq('id', memberId)

      if (error) throw error

      await recordSystemLog({
        universityId: user?.university_id,
        actionType: 'COMMITTEE_MEMBER_DELETED',
        details: `Deleted ${committeeType} member: ${memberToDelete?.full_name || 'Unnamed member'}.`,
      })

      await fetchMembers()
      showToast(
        isAcademicCouncil ? 'Academic Council member removed' : 'Committee member deleted successfully',
        'success'
      )
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

  const detailPanelStatus =
    selectedMember != null ? getStatus(selectedMember.term_start, selectedMember.term_end) : null
  const DetailStatusIcon = detailPanelStatus?.icon ?? CheckCircle2

  if (loading) {
    return <UfpAdminLoadingCenter />
  }

  return (
    <UfpAdminShell>
      <UfpAdminPageWide>
        <UfpManagementPageHeader
          breadcrumbItems={[
            { label: 'Dashboard', path: '/ufp-dashboard' },
            { label: committeeTitle },
          ]}
          title={committeeTitle}
          description={
            isAcademicCouncil
              ? 'Maintain the single statutory Academic Council for your university: membership, roles, and terms.'
              : `Manage members of the ${committeeTitle.toLowerCase()}.`
          }
          icon={<EntityIcon className="h-5 w-5 shrink-0" strokeWidth={2} aria-hidden />}
        />
      {acDuplicateCommittees && isAcademicCouncil && (
        <div
          className="mb-4 rounded-lg border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-950"
          role="status"
        >
          Multiple Academic Council records were found for this university. The oldest record is used for member
          management. Consider consolidating data outside the portal if this is unintended.
        </div>
      )}

      {/* Member list — same shell when empty or populated */}
      {members.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/90 px-4 py-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <EntityIcon className="h-4 w-4 text-slate-500 shrink-0" aria-hidden />
              <span className="text-sm font-semibold text-slate-800 truncate">Members (0)</span>
            </div>
          </div>
          <div className="flex flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-4 sm:py-4">
            <div className="flex min-w-0 gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                <EntityIcon className="h-5 w-5" aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">{emptyStateTitle}</p>
                <p className="mt-1 max-w-lg text-xs leading-relaxed text-slate-600">{emptyStateSubtitle}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 transition-colors sm:w-auto"
            >
              <Plus className="h-4 w-4" />
              Add First Member
            </button>
          </div>
        </motion.div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/90 px-4 py-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <EntityIcon className="h-4 w-4 text-slate-500 shrink-0" aria-hidden />
              <span className="text-sm font-semibold text-slate-800 truncate">
                Members ({members.length})
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              {isAcademicCouncil ? 'Add council member' : 'Add member'}
            </button>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-start">
            <aside className="min-h-0 shrink-0 border-slate-200 lg:w-[42%] lg:border-r xl:w-[45%]">
              <div className="max-h-[min(70vh,720px)] divide-y divide-slate-100 overflow-y-auto">
                {members.map((member) => {
                  const status = getStatus(member.term_start, member.term_end)
                  const StatusIcon = status.icon
                  const isSelected = member.id === resolvedMemberId

                  return (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => setSelectedMemberId(member.id)}
                      aria-selected={isSelected}
                      className={`flex w-full gap-3 px-3 py-3 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                        isSelected
                          ? 'border-l-4 border-l-blue-600 bg-blue-50 ring-2 ring-inset ring-blue-500/30'
                          : 'border-l-4 border-l-transparent hover:bg-slate-50/80'
                      }`}
                    >
                      <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
                        {member.profile_pic_url ? (
                          <img
                            src={member.profile_pic_url}
                            alt=""
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              e.target.onerror = null
                              e.target.style.display = 'none'
                            }}
                          />
                        ) : (
                          <Users className="absolute inset-0 m-auto h-5 w-5 text-slate-400" aria-hidden />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`truncate text-sm text-slate-900 ${isSelected ? 'font-bold' : 'font-semibold'}`}
                          >
                            {member.full_name}
                          </span>
                          <span
                            className={`inline-flex shrink-0 items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${status.color}`}
                          >
                            <StatusIcon className="h-3 w-3" aria-hidden />
                            {status.label}
                          </span>
                        </div>
                        {member.designation ? (
                          <p className="mt-0.5 truncate text-xs text-slate-600">{member.designation}</p>
                        ) : null}
                        {member.role_in_committee ? (
                          <p className="mt-1 truncate text-[11px] font-medium text-blue-800/90">
                            <span className="rounded bg-blue-50 px-1.5 py-0.5">{member.role_in_committee}</span>
                          </p>
                        ) : null}
                      </div>
                    </button>
                  )
                })}
              </div>
            </aside>

            <section className="min-h-0 min-w-0 flex-1 border-t border-slate-200 p-4 lg:sticky lg:top-6 lg:max-h-[calc(100vh-8rem)] lg:self-start lg:overflow-y-auto lg:border-t-0 lg:p-6">
              {!selectedMember ? (
                <div className="flex min-h-[240px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-12 text-center">
                  <Users className="mb-3 h-10 w-10 text-slate-300" aria-hidden />
                  <p className="text-sm font-medium text-slate-700">Select a member</p>
                  <p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-500">
                    Choose someone from the list to view their full record, term dates, and actions.
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200/90 bg-slate-50/70 p-5 shadow-sm ring-1 ring-slate-200/50 sm:p-6">
                  <div className="flex flex-col gap-5 border-b border-slate-200/80 pb-5 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 gap-4">
                      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-white bg-slate-100 shadow-sm ring-1 ring-slate-200">
                        {selectedMember.profile_pic_url ? (
                          <img
                            src={selectedMember.profile_pic_url}
                            alt={selectedMember.full_name || 'Member'}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              e.target.onerror = null
                              e.target.style.display = 'none'
                            }}
                          />
                        ) : (
                          <Users className="absolute inset-0 m-auto h-9 w-9 text-slate-400" aria-hidden />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                          {selectedMember.full_name}
                        </h3>
                        <div className="mt-2">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${detailPanelStatus.color}`}
                          >
                            <DetailStatusIcon className="h-3.5 w-3.5" aria-hidden />
                            {detailPanelStatus.label}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
                      <label
                        htmlFor={`edit-photo-detail-${selectedMember.id}`}
                        className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                      >
                        <Camera className="h-4 w-4 text-slate-500" aria-hidden />
                        {uploadingPhoto && editingPhotoFor === selectedMember.id ? 'Uploading…' : 'Update photo'}
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleEditPhoto(selectedMember.id, file)
                          e.target.value = ''
                        }}
                        className="hidden"
                        id={`edit-photo-detail-${selectedMember.id}`}
                        disabled={uploadingPhoto && editingPhotoFor === selectedMember.id}
                      />
                      <button
                        type="button"
                        onClick={() => handleDelete(selectedMember.id)}
                        className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800 hover:bg-red-100"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                        Remove
                      </button>
                    </div>
                  </div>

                  <dl className="mt-5 space-y-4">
                    <div className="grid gap-1 sm:grid-cols-[minmax(0,11rem)_1fr] sm:gap-x-4 sm:gap-y-1">
                      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Designation</dt>
                      <dd className="text-sm text-slate-900">
                        {selectedMember.designation?.trim() || '—'}
                      </dd>
                    </div>
                    <div className="grid gap-1 sm:grid-cols-[minmax(0,11rem)_1fr] sm:gap-x-4 sm:gap-y-1">
                      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Official seat / status as per act
                      </dt>
                      <dd className="text-sm leading-relaxed text-slate-900">
                        {selectedMember.status_as_per_act?.trim() || '—'}
                      </dd>
                    </div>
                    <div className="grid gap-1 sm:grid-cols-[minmax(0,11rem)_1fr] sm:gap-x-4 sm:gap-y-1">
                      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Role in committee
                      </dt>
                      <dd className="text-sm text-slate-900">
                        {selectedMember.role_in_committee?.trim() || '—'}
                      </dd>
                    </div>
                    <div className="grid gap-1 sm:grid-cols-[minmax(0,11rem)_1fr] sm:items-center sm:gap-x-4 sm:gap-y-1">
                      <dt className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <Calendar className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                        Term start
                      </dt>
                      <dd className="text-sm font-medium text-slate-900">
                        {formatDate(selectedMember.term_start)}
                      </dd>
                    </div>
                    <div className="grid gap-1 sm:grid-cols-[minmax(0,11rem)_1fr] sm:items-center sm:gap-x-4 sm:gap-y-1">
                      <dt className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <Calendar className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                        Term end
                      </dt>
                      <dd className="text-sm font-medium text-slate-900">
                        {formatDate(selectedMember.term_end)}
                      </dd>
                    </div>
                    <div className="grid gap-1 sm:grid-cols-[minmax(0,11rem)_1fr] sm:gap-x-4 sm:gap-y-1">
                      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Term status</dt>
                      <dd>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${detailPanelStatus.color}`}
                        >
                          <DetailStatusIcon className="h-3.5 w-3.5" aria-hidden />
                          {detailPanelStatus.label}
                        </span>
                        <span className="ml-2 text-xs text-slate-500">
                          {detailPanelStatus.label === 'Current'
                            ? 'Within term dates.'
                            : detailPanelStatus.label === 'Expired'
                              ? 'Term has ended.'
                              : 'Term has not started yet.'}
                        </span>
                      </dd>
                    </div>
                  </dl>
                </div>
              )}
            </section>
          </div>
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
                    <h3 className="text-xl font-semibold text-slate-900">
                      {isAcademicCouncil ? 'Add Academic Council member' : 'Add committee member'}
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
                    {/* Member Name */}
                    <div>
                      <label className="block text-sm font-medium text-slate-900 mb-2">
                        {isAcademicCouncil ? 'Full name' : 'Member name'} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={memberName}
                        onChange={(e) => setMemberName(e.target.value)}
                        placeholder="e.g., Dr. John Smith"
                        maxLength={120}
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
                        maxLength={120}
                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm"
                      />
                    </div>

                    {/* Official Seat / Status As Per Act */}
                    <div>
                      <label className="block text-sm font-medium text-slate-900 mb-2">
                        Official Seat / Status As Per Act
                      </label>
                      <select
                        value={statusAsPerAct}
                        onChange={(e) => {
                          setStatusAsPerAct(e.target.value)
                          if (e.target.value !== OTHER_OFFICIAL_SEAT_OPTION) {
                            setCustomStatusAsPerAct('')
                          }
                        }}
                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm"
                      >
                        <option value="">Select Official Seat / Status</option>
                        {OFFICIAL_SEAT_OPTIONS.map((seat) => (
                          <option key={seat} value={seat}>
                            {seat}
                          </option>
                        ))}
                        <option value={OTHER_OFFICIAL_SEAT_OPTION}>Other (Add your own)</option>
                      </select>
                      {statusAsPerAct === OTHER_OFFICIAL_SEAT_OPTION && (
                        <input
                          type="text"
                          value={customStatusAsPerAct}
                          onChange={(e) => setCustomStatusAsPerAct(e.target.value)}
                          placeholder="Enter official seat / status"
                          maxLength={180}
                          className="mt-2 w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm"
                        />
                      )}
                      <p className="mt-1 text-xs text-slate-500 italic">
                        {isAcademicCouncil
                          ? 'Statutory seat or status under the University Act (used for U&B verification).'
                          : 'This field helps the U&B Department verify that the committee composition follows the University Act.'}
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
                        {isAcademicCouncil ? 'Role in council' : 'Role in committee'}{' '}
                        <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={roleInCommittee}
                        onChange={(e) => setRoleInCommittee(e.target.value)}
                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm"
                        required
                      >
                        <option value="">Select role</option>
                        {COMMITTEE_ROLES.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-xs text-slate-500 italic">
                        {isAcademicCouncil
                          ? 'Functional responsibility of this person within the Academic Council (e.g. Secretary, Member).'
                          : "This field captures the member's functional responsibility within the committee."}
                      </p>
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
                          <span>{isAcademicCouncil ? 'Save council member' : 'Save member'}</span>
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
      </UfpAdminPageWide>
    </UfpAdminShell>
  )
}

export default CommitteeManagement
