import { useState, useEffect } from 'react'
import { Loader2, Camera, Upload, Users } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import UfpGlassFormModal from './UfpGlassFormModal'
import { DEPARTMENT_MAPPING, generateDepartmentCode } from '../data/departmentFormPresets'
import { recordSystemLog } from '../utils/systemLogs'
import { normalizeEmail, normalizePhone, normalizeText } from '../utils/validation/commonValidators'
import { FIELD_LIMITS, validateEmailField, validatePhoneField } from '../utils/validation/formRules'

async function uploadHodPhoto(file, universityId) {
  const fileName = `hod-photo-${universityId}-${Date.now()}-${file.name}`
  const { error: uploadError } = await supabase.storage
    .from('official_photos')
    .upload(fileName, file, { cacheControl: '3600', upsert: false })
  if (uploadError) throw new Error('Failed to upload photo: ' + uploadError.message)
  const { data } = supabase.storage.from('official_photos').getPublicUrl(fileName)
  if (!data?.publicUrl) throw new Error('Failed to get public URL for photo')
  return data.publicUrl
}

async function uploadHodAppointmentLetter(file, universityId) {
  const ext = file.name.split('.').pop() || 'pdf'
  const fileName = `hod-letter-${universityId}-${Date.now()}.${ext}`
  const { error: uploadError } = await supabase.storage
    .from('appointment_letters')
    .upload(fileName, file, { cacheControl: '3600', upsert: true })
  if (uploadError) throw new Error('Failed to upload letter: ' + uploadError.message)
  const { data } = supabase.storage.from('appointment_letters').getPublicUrl(fileName)
  return data?.publicUrl || null
}

export default function AddDepartmentInlineModal({
  open,
  onClose,
  universityId,
  campusId,
  facultyId,
  facultyName,
  onSaved,
  onError
}) {
  const [departmentName, setDepartmentName] = useState('')
  const [departmentCode, setDepartmentCode] = useState('')
  const [customDepartmentName, setCustomDepartmentName] = useState('')
  const [hodName, setHodName] = useState('')
  const [hodEmail, setHodEmail] = useState('')
  const [hodPhone, setHodPhone] = useState('')
  const [status, setStatus] = useState('Active')
  const [hodPhotoFile, setHodPhotoFile] = useState(null)
  const [hodPhotoPreview, setHodPhotoPreview] = useState(null)
  const [hodAppointmentLetterFile, setHodAppointmentLetterFile] = useState(null)
  const [saving, setSaving] = useState(false)

  const availableDepartments =
    facultyName && DEPARTMENT_MAPPING[facultyName] ? DEPARTMENT_MAPPING[facultyName] : []

  useEffect(() => {
    if (!open) return
    setDepartmentName('')
    setDepartmentCode('')
    setCustomDepartmentName('')
    setHodName('')
    setHodEmail('')
    setHodPhone('')
    setStatus('Active')
    setHodPhotoFile(null)
    setHodPhotoPreview(null)
    setHodAppointmentLetterFile(null)
  }, [open])

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

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setHodPhotoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => setHodPhotoPreview(reader.result)
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!universityId || !campusId || !facultyId) return

    const noPresetDepartments = availableDepartments.length === 0
    let finalDepartmentName = ''
    if (noPresetDepartments) {
      const manual = customDepartmentName?.trim()
      if (!manual) {
        onError?.('Please enter the department name.')
        return
      }
      finalDepartmentName = manual
    } else {
      finalDepartmentName = departmentName
      if (departmentName === 'Other') {
        if (!customDepartmentName?.trim()) {
          onError?.('Please enter a custom department name.')
          return
        }
        finalDepartmentName = customDepartmentName.trim()
      }
    }

    if (!finalDepartmentName) {
      onError?.('Please select or enter department name.')
      return
    }
    const normalizedDepartmentName = normalizeText(finalDepartmentName)
    const normalizedDepartmentCode = normalizeText(departmentCode).toUpperCase()
    const normalizedHodName = normalizeText(hodName)
    const normalizedHodEmail = normalizeEmail(hodEmail)
    const normalizedHodPhone = normalizePhone(hodPhone)

    if (!normalizedDepartmentName) {
      onError?.('Please select or enter department name.')
      return
    }
    if (normalizedDepartmentName.length > FIELD_LIMITS.name) {
      onError?.(`Department name is too long (max ${FIELD_LIMITS.name} characters).`)
      return
    }
    if (!normalizedDepartmentCode) {
      onError?.('Please enter department code.')
      return
    }
    if (normalizedDepartmentCode.length > FIELD_LIMITS.shortCode) {
      onError?.(`Department code is too long (max ${FIELD_LIMITS.shortCode} characters).`)
      return
    }
    if (!normalizedHodName || !normalizedHodEmail || !normalizedHodPhone) {
      onError?.('Please enter HoD name, email, and phone.')
      return
    }
    const hodEmailError = validateEmailField(normalizedHodEmail, 'a valid HoD email')
    if (hodEmailError) return onError?.(hodEmailError)
    const hodPhoneError = validatePhoneField(normalizedHodPhone, 'a valid HoD phone number')
    if (hodPhoneError) return onError?.(hodPhoneError)

    setSaving(true)
    try {
      let publicUrl = null
      if (hodPhotoFile) {
        publicUrl = await uploadHodPhoto(hodPhotoFile, universityId)
      }
      let appointmentLetterUrl = null
      if (hodAppointmentLetterFile) {
        appointmentLetterUrl = await uploadHodAppointmentLetter(hodAppointmentLetterFile, universityId)
      }

      const { data, error } = await supabase
        .from('departments')
        .insert({
          university_id: universityId,
          campus_id: campusId,
          faculty_id: facultyId,
          name: normalizedDepartmentName,
          code: normalizedDepartmentCode,
          head_of_department: normalizedHodName || null,
          hod_email: normalizedHodEmail || null,
          hod_phone: normalizedHodPhone || null,
          hod_photo_url: publicUrl,
          hod_appointment_letter_url: appointmentLetterUrl || null,
          status: status || null
        })
        .select()
        .single()

      if (error) throw new Error(error.message)

      await recordSystemLog({
        universityId,
        actionType: 'DEPARTMENT_ADDED',
        details: `Added department: ${normalizedDepartmentName} (from faculty page)`
      })

      await onSaved?.()
      onClose()
    } catch (err) {
      onError?.(err.message || 'Could not save department.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <UfpGlassFormModal
      open={open}
      onClose={onClose}
      title="Add department"
      subtitle={facultyName ? `Faculty: ${facultyName}` : undefined}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-900">
            Department name <span className="text-red-500">*</span>
          </label>
          {availableDepartments.length === 0 ? (
            <div className="space-y-2">
              <p className="text-xs text-slate-600">No preset list for this faculty — enter the name.</p>
              <input
                value={customDepartmentName}
                onChange={(e) => setCustomDepartmentName(e.target.value)}
                placeholder="e.g., Department of Islamic Studies"
                maxLength={120}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                required
              />
            </div>
          ) : (
            <select
              value={departmentName}
              onChange={(e) => setDepartmentName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
              required
            >
              <option value="">Select department</option>
              {availableDepartments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
              <option value="Other">Other (custom)</option>
            </select>
          )}
        </div>
        {departmentName === 'Other' && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-900">Custom name</label>
            <input
              value={customDepartmentName}
              onChange={(e) => setCustomDepartmentName(e.target.value)}
              maxLength={120}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
              required
            />
          </div>
        )}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-900">
            Department code <span className="text-red-500">*</span>
          </label>
          <input
            value={departmentCode}
            onChange={(e) => setDepartmentCode(e.target.value.toUpperCase())}
            maxLength={20}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-mono"
            required
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-900">
            Head of department <span className="text-red-500">*</span>
          </label>
          <input
            value={hodName}
            onChange={(e) => setHodName(e.target.value)}
            maxLength={120}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
            required
          />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-900">
              HoD email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={hodEmail}
              onChange={(e) => setHodEmail(e.target.value)}
              maxLength={120}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-900">
              HoD phone <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={hodPhone}
              onChange={(e) => setHodPhone(e.target.value)}
              inputMode="tel"
              pattern="[0-9+\-() ]{10,30}"
              maxLength={30}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
              required
            />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-900">HoD photo (optional)</label>
          <div className="flex items-center gap-3">
            {hodPhotoPreview ? (
              <img src={hodPhotoPreview} alt="" className="h-16 w-16 rounded-full border object-cover" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full border bg-slate-100">
                <Users className="h-7 w-7 text-slate-400" />
              </div>
            )}
            <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" id="inline-hod-photo" />
            <label
              htmlFor="inline-hod-photo"
              className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:border-blue-500 hover:text-blue-700"
            >
              <Camera className="h-4 w-4" />
              Upload
            </label>
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-900">Appointment letter (optional)</label>
          <input
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={(e) => setHodAppointmentLetterFile(e.target.files?.[0] || null)}
            className="hidden"
            id="inline-hod-letter"
          />
          <label
            htmlFor="inline-hod-letter"
            className="flex min-h-10 w-full cursor-pointer items-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:border-blue-500 hover:text-blue-700"
          >
            <Upload className="h-4 w-4" />
            {hodAppointmentLetterFile ? hodAppointmentLetterFile.name : 'PDF / document'}
          </label>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-900">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
          >
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
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
              'Save department'
            )}
          </button>
        </div>
      </form>
    </UfpGlassFormModal>
  )
}
