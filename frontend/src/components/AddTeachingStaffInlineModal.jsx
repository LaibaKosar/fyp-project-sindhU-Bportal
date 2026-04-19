import { useState, useEffect } from 'react'
import { Loader2, Camera, Users } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import UfpGlassFormModal from './UfpGlassFormModal'
import { recordSystemLog } from '../utils/systemLogs'
import { normalizeEmail, normalizePhone, normalizeText } from '../utils/validation/commonValidators'
import {
  FIELD_LIMITS,
  validateEmailField,
  validatePhoneField,
  validateRequiredField,
} from '../utils/validation/formRules'

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
const OTHER_TEACHING_DESIGNATION_OPTION = '__OTHER_TEACHING_DESIGNATION__'
const OTHER_ADMIN_ROLE_OPTION = '__OTHER_ADMIN_ROLE__'

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
  const [academicDesignationCustom, setAcademicDesignationCustom] = useState('')
  const [administrativeRole, setAdministrativeRole] = useState('No Additional Role')
  const [administrativeRoleCustom, setAdministrativeRoleCustom] = useState('')
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
    setAcademicDesignationCustom('')
    setAdministrativeRole('No Additional Role')
    setAdministrativeRoleCustom('')
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
    const normalizedFullName = normalizeText(fullName)
    const normalizedEmail = normalizeEmail(email)
    const normalizedPhone = normalizePhone(phone)
    const normalizedCnic = normalizeText(cnic)
    const normalizedQualification = normalizeText(qualification)
    const normalizedSpecialization = normalizeText(specialization)
    const fullNameError = validateRequiredField(normalizedFullName, 'full name')
    if (fullNameError) return onError?.(fullNameError)
    if (normalizedFullName.length > FIELD_LIMITS.name) {
      return onError?.(`Full name is too long (max ${FIELD_LIMITS.name} characters).`)
    }
    const emailError = validateEmailField(normalizedEmail)
    if (emailError) return onError?.(emailError)
    const phoneError = validatePhoneField(normalizedPhone)
    if (phoneError) return onError?.(phoneError)
    if (normalizedCnic && !/^\d{5}-\d{7}-\d$/.test(normalizedCnic)) {
      return onError?.('Please enter CNIC in format 12345-1234567-1.')
    }
    if (!academicDesignation) {
      onError?.('Please select academic designation.')
      return
    }
    const finalAcademicDesignation =
      academicDesignation === OTHER_TEACHING_DESIGNATION_OPTION
        ? normalizeText(academicDesignationCustom)
        : academicDesignation
    const finalAdministrativeRole =
      administrativeRole === OTHER_ADMIN_ROLE_OPTION
        ? normalizeText(administrativeRoleCustom)
        : administrativeRole
    if (academicDesignation === OTHER_TEACHING_DESIGNATION_OPTION && !finalAcademicDesignation) {
      onError?.('Please enter a custom academic designation.')
      return
    }
    if (administrativeRole === OTHER_ADMIN_ROLE_OPTION && !finalAdministrativeRole) {
      onError?.('Please enter a custom administrative role.')
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
        full_name: normalizedFullName,
        email: normalizedEmail,
        phone: normalizedPhone,
        gender,
        cnic: normalizedCnic || null,
        employment_type: employmentType,
        profile_photo_url: publicUrl,
        faculty_id: facultyId,
        department_id: departmentId,
        academic_designation: finalAcademicDesignation,
        administrative_role: finalAdministrativeRole,
        qualification: normalizedQualification || null,
        specialization: normalizedSpecialization || null
      }
      const { error } = await supabase.from('staff').insert(staffData).select().single()
      if (error) throw error
      await recordSystemLog({
        universityId,
        actionType: 'STAFF_UPDATED',
        details: `Registered teaching staff: ${normalizedFullName}`
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
            maxLength={120}
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
              maxLength={120}
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
              inputMode="tel"
              pattern="[0-9+\-() ]{10,30}"
              maxLength={30}
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
            inputMode="numeric"
            pattern="[0-9]{5}-[0-9]{7}-[0-9]{1}"
            maxLength={15}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-900">
            Academic designation <span className="text-red-500">*</span>
          </label>
          <select
            value={academicDesignation}
            onChange={(e) => {
              setAcademicDesignation(e.target.value)
              if (e.target.value !== OTHER_TEACHING_DESIGNATION_OPTION) {
                setAcademicDesignationCustom('')
              }
            }}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
            required
          >
            <option value="">Select designation</option>
            {ACADEMIC_DESIGNATIONS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
            <option value={OTHER_TEACHING_DESIGNATION_OPTION}>Other (custom)</option>
          </select>
          {academicDesignation === OTHER_TEACHING_DESIGNATION_OPTION && (
            <input
              type="text"
              value={academicDesignationCustom}
              onChange={(e) => setAcademicDesignationCustom(e.target.value)}
              placeholder="Enter custom academic designation"
              maxLength={120}
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
              required
            />
          )}
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-900">Administrative role</label>
          <select
            value={administrativeRole}
            onChange={(e) => {
              setAdministrativeRole(e.target.value)
              if (e.target.value !== OTHER_ADMIN_ROLE_OPTION) {
                setAdministrativeRoleCustom('')
              }
            }}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
          >
            {ADMINISTRATIVE_ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
            <option value={OTHER_ADMIN_ROLE_OPTION}>Other (custom)</option>
          </select>
          {administrativeRole === OTHER_ADMIN_ROLE_OPTION && (
            <input
              type="text"
              value={administrativeRoleCustom}
              onChange={(e) => setAdministrativeRoleCustom(e.target.value)}
              placeholder="Enter custom administrative role"
              maxLength={120}
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
              required
            />
          )}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-900">Qualification</label>
            <input
              value={qualification}
              onChange={(e) => setQualification(e.target.value)}
              placeholder="e.g. PhD"
              maxLength={120}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-900">Specialization</label>
            <input
              value={specialization}
              onChange={(e) => setSpecialization(e.target.value)}
              maxLength={120}
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
