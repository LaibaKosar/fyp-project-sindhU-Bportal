import { useState, useEffect } from 'react'
import { Loader2, Camera, Users } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import UfpGlassFormModal from './UfpGlassFormModal'
import { recordSystemLog } from '../utils/systemLogs'

const ACADEMIC_DESIGNATIONS = [
  'Professor',
  'Associate Professor',
  'Assistant Professor',
  'Lecturer',
  'Instructor',
  'Lab Instructor'
]

const ADMINISTRATIVE_ROLES = [
  'No Additional Role',
  'Dean',
  'Head of Department',
  'Director',
  'Chairperson',
  'Program Coordinator'
]

const EMPLOYMENT_TYPES = ['Permanent', 'Contract', 'Visiting', 'Daily Wages']
const GENDER_OPTIONS = ['Male', 'Female', 'Prefer not to say']

async function uploadStaffPhoto(file, universityId) {
  const fileName = `staff-photo-${universityId}-${Date.now()}-${file.name}`
  const { error: uploadError } = await supabase.storage
    .from('staff-profiles')
    .upload(fileName, file, { cacheControl: '3600', upsert: false })
  if (uploadError) throw uploadError
  const { data } = supabase.storage.from('staff-profiles').getPublicUrl(fileName)
  return data?.publicUrl || null
}

export default function AddTeachingStaffInlineModal({
  open,
  onClose,
  universityId,
  campusId,
  facultyId,
  departmentId,
  departmentName,
  onSaved,
  onError
}) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [gender, setGender] = useState('Prefer not to say')
  const [cnic, setCnic] = useState('')
  const [employmentType, setEmploymentType] = useState('Permanent')
  const [academicDesignation, setAcademicDesignation] = useState('')
  const [administrativeRole, setAdministrativeRole] = useState('No Additional Role')
  const [qualification, setQualification] = useState('')
  const [specialization, setSpecialization] = useState('')
  const [profilePhotoFile, setProfilePhotoFile] = useState(null)
  const [profilePhotoPreview, setProfilePhotoPreview] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setFullName('')
    setEmail('')
    setPhone('')
    setGender('Prefer not to say')
    setCnic('')
    setEmploymentType('Permanent')
    setAcademicDesignation('')
    setAdministrativeRole('No Additional Role')
    setQualification('')
    setSpecialization('')
    setProfilePhotoFile(null)
    setProfilePhotoPreview(null)
  }, [open])

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setProfilePhotoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => setProfilePhotoPreview(reader.result)
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!universityId || !campusId || !facultyId || !departmentId) return
    if (!fullName || !email || !phone) {
      onError?.('Please fill name, email, and phone.')
      return
    }
    if (!academicDesignation) {
      onError?.('Please select academic designation.')
      return
    }
    setSaving(true)
    try {
      let publicUrl = null
      if (profilePhotoFile) {
        publicUrl = await uploadStaffPhoto(profilePhotoFile, universityId)
      }
      const staffData = {
        university_id: universityId,
        campus_id: campusId,
        type: 'Teaching',
        full_name: fullName,
        email,
        phone,
        gender,
        cnic: cnic || null,
        employment_type: employmentType,
        profile_photo_url: publicUrl,
        faculty_id: facultyId,
        department_id: departmentId,
        academic_designation: academicDesignation,
        administrative_role: administrativeRole,
        qualification: qualification || null,
        specialization: specialization || null
      }
      const { error } = await supabase.from('staff').insert(staffData).select().single()
      if (error) throw error
      await recordSystemLog({
        universityId,
        actionType: 'STAFF_UPDATED',
        details: `Registered teaching staff: ${fullName}`
      })
      await onSaved?.()
      onClose()
    } catch (err) {
      onError?.(err.message || 'Could not save staff member.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <UfpGlassFormModal
      open={open}
      onClose={onClose}
      title="Add teaching staff"
      subtitle={departmentName ? `${departmentName} · teaching` : undefined}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2 text-xs text-slate-600">
          Campus, faculty, and department are fixed for this page. Only teaching staff can be added here.
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-900">
            Full name <span className="text-red-500">*</span>
          </label>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
            required
          />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-900">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-900">
              Phone <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
              required
            />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-900">Gender</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
            >
              {GENDER_OPTIONS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-900">Employment type</label>
            <select
              value={employmentType}
              onChange={(e) => setEmploymentType(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
            >
              {EMPLOYMENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-900">CNIC</label>
          <input
            value={cnic}
            onChange={(e) => setCnic(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-900">
            Academic designation <span className="text-red-500">*</span>
          </label>
          <select
            value={academicDesignation}
            onChange={(e) => setAcademicDesignation(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
            required
          >
            <option value="">Select designation</option>
            {ACADEMIC_DESIGNATIONS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-900">Administrative role</label>
          <select
            value={administrativeRole}
            onChange={(e) => setAdministrativeRole(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
          >
            {ADMINISTRATIVE_ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-900">Qualification</label>
            <input
              value={qualification}
              onChange={(e) => setQualification(e.target.value)}
              placeholder="e.g. PhD"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-900">Specialization</label>
            <input
              value={specialization}
              onChange={(e) => setSpecialization(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
            />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-900">
            Profile photo <span className="text-slate-500">(optional)</span>
          </label>
          <div className="flex items-center gap-4">
            {profilePhotoPreview ? (
              <img src={profilePhotoPreview} alt="" className="h-20 w-20 rounded-lg border object-cover" />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-slate-200 bg-slate-100">
                <Users className="h-8 w-8 text-slate-400" />
              </div>
            )}
            <div className="flex-1">
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
                id="inline-staff-photo"
              />
              <label
                htmlFor="inline-staff-photo"
                className="flex cursor-pointer items-center gap-2 rounded-lg border-2 border-dashed border-slate-300 px-3 py-2.5 text-sm hover:border-blue-500"
              >
                <Camera className="h-4 w-4" />
                {profilePhotoPreview ? 'Change photo' : 'Upload photo'}
              </label>
            </div>
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-slate-200 bg-slate-50 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Saving…
              </>
            ) : (
              'Save staff'
            )}
          </button>
        </div>
      </form>
    </UfpGlassFormModal>
  )
}
