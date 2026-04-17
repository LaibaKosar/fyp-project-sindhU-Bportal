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
  Users,
  User,
  Trash2
} from 'lucide-react'
import Breadcrumbs from '../components/Breadcrumbs'
import { UfpAdminShell, UfpAdminContainer, UfpAdminLoadingCenter } from '../components/UfpAdminShell'
import UfpLeadershipPanel from '../components/UfpLeadershipPanel'
import AddDepartmentInlineModal from '../components/AddDepartmentInlineModal'
import UfpGlassFormModal from '../components/UfpGlassFormModal'
import { recordSystemLog } from '../utils/systemLogs'

function FacultyDetailView() {
  const navigate = useNavigate()
  const { id: campusId, facultyId } = useParams()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [campus, setCampus] = useState(null)
  const [faculty, setFaculty] = useState(null)
  const [summary, setSummary] = useState({
    departments_count: 0,
    programs_count: 0,
    teaching_staff_count: 0,
    students_count: 0
  })
  const [departments, setDepartments] = useState([])
  const [departmentSummaries, setDepartmentSummaries] = useState({})
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [uploadingLetter, setUploadingLetter] = useState(false)
  const [uploadError, setUploadError] = useState(null)
  const [showAddDepartmentModal, setShowAddDepartmentModal] = useState(false)
  const [showDeleteDepartmentModal, setShowDeleteDepartmentModal] = useState(false)
  const [deletingDepartment, setDeletingDepartment] = useState(false)
  const [selectedDepartmentForDelete, setSelectedDepartmentForDelete] = useState(null)
  const [toast, setToast] = useState(null)
  const hodPhotoInputRef = useRef(null)
  const pendingHodDeptIdRef = useRef(null)
  const [hodPhotoUploadingDeptId, setHodPhotoUploadingDeptId] = useState(null)

  useEffect(() => {
    loadUserData()
  }, [])

  useEffect(() => {
    if (!user?.university_id || !campusId || !facultyId) return
    let cancelled = false
    setLoading(true)
    const run = async () => {
      try {
        await fetchCampus()
        if (cancelled) return
        await fetchFaculty()
        if (cancelled) return
        await fetchSummary()
        await fetchDepartments()
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [user, campusId, facultyId])

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
      if (!campusId || !facultyId) setLoading(false)
    } catch (e) {
      console.error(e)
      navigate('/login')
    }
  }

  const fetchCampus = async () => {
    if (!campusId || !user?.university_id) return
    const { data, error } = await supabase
      .from('campuses')
      .select('id, name, city, is_main_campus, code')
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
      .select('*')
      .eq('id', facultyId)
      .eq('university_id', user.university_id)
      .single()
    if (error || !data) {
      navigate(`/ufp/campus/${campusId}`)
      return
    }
    if (data.campus_id !== campusId) {
      navigate(`/ufp/campus/${campusId}`)
      return
    }
    setFaculty(data)
  }

  const fetchSummary = async () => {
    if (!facultyId || !user?.university_id) return
    const { data, error } = await supabase
      .from('faculty_summary')
      .select('departments_count, programs_count, teaching_staff_count, students_count')
      .eq('faculty_id', facultyId)
      .maybeSingle()
    if (!error && data) {
      setSummary({
        departments_count: data.departments_count ?? 0,
        programs_count: data.programs_count ?? 0,
        teaching_staff_count: data.teaching_staff_count ?? 0,
        students_count: data.students_count ?? 0
      })
    } else if (error) {
      console.error('Error fetching faculty_summary in FacultyDetailView:', error)
    }
  }

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 5000)
  }

  const openDepartmentHodPhotoPicker = (deptId, e) => {
    e.stopPropagation()
    if (hodPhotoUploadingDeptId) return
    pendingHodDeptIdRef.current = deptId
    hodPhotoInputRef.current?.click()
  }

  const handleDepartmentHodPhotoChange = async (e) => {
    const file = e.target.files?.[0]
    const deptId = pendingHodDeptIdRef.current
    e.target.value = ''
    pendingHodDeptIdRef.current = null
    if (!file || !deptId || !user?.university_id || !facultyId) return
    if (!file.type.startsWith('image/')) {
      showToast('Please choose an image file', 'error')
      return
    }
    setHodPhotoUploadingDeptId(deptId)
    try {
      const fileName = `hod-photo-${user.university_id}-${Date.now()}-${file.name.replace(/\s/g, '-')}`
      const { error: upErr } = await supabase.storage
        .from('official_photos')
        .upload(fileName, file, { cacheControl: '3600', upsert: true })
      if (upErr) throw new Error(upErr.message || 'Upload failed')
      const { data: urlData } = supabase.storage.from('official_photos').getPublicUrl(fileName)
      const url = urlData?.publicUrl
      if (!url) throw new Error('Failed to get URL')
      const { error: dbErr } = await supabase
        .from('departments')
        .update({ hod_photo_url: url })
        .eq('id', deptId)
        .eq('university_id', user.university_id)
        .eq('faculty_id', facultyId)
      if (dbErr) throw new Error(dbErr.message || 'Database update failed')
      setDepartments((prev) => prev.map((d) => (d.id === deptId ? { ...d, hod_photo_url: url } : d)))
      const updatedDepartment = departments.find((d) => d.id === deptId)
      await recordSystemLog({
        universityId: user.university_id,
        actionType: 'DEPARTMENT_UPDATED',
        details: `Updated HoD photo for department: ${updatedDepartment?.name || 'Unnamed department'}`,
      })
      showToast('HOD photo updated')
    } catch (err) {
      console.error(err)
      showToast(err.message || 'Failed to upload photo', 'error')
    } finally {
      setHodPhotoUploadingDeptId(null)
    }
  }

  const fetchDepartments = async () => {
    if (!facultyId || !user?.university_id) return
    const { data, error } = await supabase
      .from('departments')
      .select('id, name, code, status, head_of_department, hod_photo_url')
      .eq('university_id', user.university_id)
      .eq('faculty_id', facultyId)
      .order('name', { ascending: true })
    if (error) {
      console.error('Error fetching departments:', error)
      return
    }
    const list = data || []
    setDepartments(list)
    if (list.length === 0) {
      setDepartmentSummaries({})
      return
    }
    const { data: summaryData, error: deptSummaryError } = await supabase
      .from('department_summary')
      .select('department_id, programs_count, teaching_staff_count, students_count')
      .in('department_id', list.map((d) => d.id))
    if (deptSummaryError) {
      console.error('Error fetching department_summary in FacultyDetailView:', deptSummaryError)
    }
    const byId = {}
    ;(summaryData || []).forEach((row) => {
      byId[row.department_id] = {
        programs_count: row.programs_count ?? 0,
        teaching_staff_count: row.teaching_staff_count ?? 0,
        students_count: Number(row.students_count) || 0
      }
    })
    setDepartmentSummaries(byId)
  }

  const openDeleteDepartmentModal = (dept, e) => {
    e.stopPropagation()
    setSelectedDepartmentForDelete(dept)
    setShowDeleteDepartmentModal(true)
  }

  const closeDeleteDepartmentModal = () => {
    if (deletingDepartment) return
    setShowDeleteDepartmentModal(false)
    setSelectedDepartmentForDelete(null)
  }

  const handleDeleteDepartmentCascade = async () => {
    if (!selectedDepartmentForDelete?.id || !user?.university_id) return
    setDeletingDepartment(true)
    try {
      const { error: rpcError } = await supabase.rpc('delete_department_cascade', {
        target_dept_id: selectedDepartmentForDelete.id
      })
      if (rpcError) throw new Error(rpcError.message || 'Failed to delete department')

      const { data: stillThere, error: verifyError } = await supabase
        .from('departments')
        .select('id')
        .eq('id', selectedDepartmentForDelete.id)
        .eq('university_id', user.university_id)
        .maybeSingle()
      if (verifyError) throw new Error(verifyError.message || 'Failed to verify deletion')
      if (stillThere) {
        throw new Error('Department is still present after delete attempt.')
      }

      await recordSystemLog({
        universityId: user.university_id,
        actionType: 'DEPARTMENT_DELETED',
        details: `Deleted department: ${selectedDepartmentForDelete.name || 'Unnamed department'} (cascade).`,
      })

      await fetchDepartments()
      await fetchSummary()
      closeDeleteDepartmentModal()
      showToast('Department deleted successfully.')
    } catch (err) {
      console.error('Department delete RPC error:', err)
      showToast(err.message || 'Error deleting department', 'error')
    } finally {
      setDeletingDepartment(false)
    }
  }

  const uploadDeanPhoto = async (file) => {
    if (!file || !user?.university_id || !facultyId) return
    setUploadError(null)
    setUploadingPhoto(true)
    try {
      const fileName = `dean-photo-${user.university_id}-${Date.now()}-${file.name.replace(/\s/g, '-')}`
      const { error: upErr } = await supabase.storage.from('official_photos').upload(fileName, file, { cacheControl: '3600', upsert: true })
      if (upErr) throw new Error(upErr.message || 'Upload failed')
      const { data: urlData } = supabase.storage.from('official_photos').getPublicUrl(fileName)
      const url = urlData?.publicUrl
      if (!url) throw new Error('Failed to get URL')
      const { error: dbErr } = await supabase.from('faculties').update({ dean_photo_url: url }).eq('id', facultyId).eq('university_id', user.university_id)
      if (dbErr) throw new Error(dbErr.message || 'Database update failed')
      setFaculty((f) => (f ? { ...f, dean_photo_url: url } : f))
      await recordSystemLog({
        universityId: user.university_id,
        actionType: 'FACULTY_UPDATED',
        details: `Updated dean photo for faculty: ${faculty?.name || 'Unnamed faculty'}`,
      })
      await fetchFaculty()
    } catch (e) {
      console.error('Dean photo upload error:', e)
      setUploadError(e.message || 'Failed to upload photo')
    } finally {
      setUploadingPhoto(false)
    }
  }

  const uploadDeanLetter = async (file) => {
    if (!file || !user?.university_id || !facultyId) return
    setUploadError(null)
    setUploadingLetter(true)
    try {
      const ext = file.name.split('.').pop() || 'pdf'
      const fileName = `dean-letter-${user.university_id}-${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('appointment_letters').upload(fileName, file, { cacheControl: '3600', upsert: true })
      if (upErr) throw new Error(upErr.message || 'Upload failed')
      const { data: urlData } = supabase.storage.from('appointment_letters').getPublicUrl(fileName)
      const url = urlData?.publicUrl
      if (!url) throw new Error('Failed to get URL')
      const { error: dbErr } = await supabase.from('faculties').update({ dean_appointment_letter_url: url }).eq('id', facultyId).eq('university_id', user.university_id)
      if (dbErr) throw new Error(dbErr.message || 'Database update failed')
      setFaculty((f) => (f ? { ...f, dean_appointment_letter_url: url } : f))
      await recordSystemLog({
        universityId: user.university_id,
        actionType: 'FACULTY_UPDATED',
        details: `Updated dean appointment letter for faculty: ${faculty?.name || 'Unnamed faculty'}`,
      })
      await fetchFaculty()
    } catch (e) {
      console.error('Dean letter upload error:', e)
      setUploadError(e.message || 'Failed to upload letter')
    } finally {
      setUploadingLetter(false)
    }
  }

  if (loading) {
    return <UfpAdminLoadingCenter />
  }

  if (!campus || !faculty) {
    return (
      <UfpAdminShell>
        <div className="flex min-h-screen items-center justify-center px-4">
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
      </UfpAdminShell>
    )
  }

  return (
    <UfpAdminShell>
      <UfpAdminContainer>
        <div className="min-w-0">
          <motion.div
            initial={{ y: -12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="mb-10 rounded-xl border border-slate-200/90 border-t-[3px] border-t-blue-600 bg-gradient-to-br from-white via-blue-50/25 to-blue-50/20 p-5 shadow-md shadow-blue-900/5 shadow-slate-300/20 ring-1 ring-blue-950/[0.05] ring-slate-200/45 sm:mb-12 sm:p-6"
          >
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
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
                    { label: faculty.name }
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
                    <h2 className="mb-2 text-2xl font-bold leading-tight tracking-tight text-slate-900 lg:text-3xl">
                      {faculty.name}
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-xs font-medium text-slate-700">
                        {faculty.code}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="w-full shrink-0 lg:max-w-md lg:w-[400px]">
                <UfpLeadershipPanel
                  roleLabel="Dean / Focal Person"
                  displayName={faculty.dean_name}
                  emptyDisplayLabel="No dean set"
                  photoUrl={faculty.dean_photo_url}
                  photoAlt={faculty.dean_name || 'Dean'}
                  photoInputId="dean-photo-upload-faculty"
                  letterInputId="dean-letter-upload-faculty"
                  letterUrl={faculty.dean_appointment_letter_url}
                  uploadError={uploadError}
                  uploadingPhoto={uploadingPhoto}
                  uploadingLetter={uploadingLetter}
                  onPhotoChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) uploadDeanPhoto(f)
                    e.target.value = ''
                  }}
                  onLetterChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) uploadDeanLetter(f)
                    e.target.value = ''
                  }}
                  showOfficialRecordBadge
                />
              </div>
            </div>
          </motion.div>

          <section className="overflow-hidden rounded-xl border border-slate-200/90 bg-gradient-to-br from-slate-50/95 via-white to-blue-50/40 shadow-sm shadow-blue-900/[0.04] ring-1 ring-blue-950/[0.04] ring-slate-200/45">
            <div className="border-b border-blue-300/70 bg-gradient-to-r from-blue-100/85 via-blue-50/70 to-indigo-100/35 px-4 py-3.5 sm:px-6 sm:py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="border-l-4 border-l-blue-600 pl-3 text-2xl font-bold tracking-tight text-slate-900">Departments</h3>
                <button
                  type="button"
                  onClick={() => setShowAddDepartmentModal(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  Add Department
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-5 p-4 sm:p-6">
            {departments.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm sm:p-12"
              >
                <Users className="mx-auto mb-4 h-12 w-12 text-slate-300" />
                <p className="mb-4 text-sm text-slate-600">No departments yet. Add the first one to get started.</p>
                <button
                  type="button"
                  onClick={() => setShowAddDepartmentModal(true)}
                  className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
                >
                  Add Department
                </button>
              </motion.div>
            ) : (
              <>
                <input
                  ref={hodPhotoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleDepartmentHodPhotoChange}
                  aria-hidden
                />
                <div className="grid grid-cols-1 justify-items-stretch gap-4 md:grid-cols-2 2xl:grid-cols-3">
                {departments.map((dept, i) => {
                  const summ = departmentSummaries[dept.id] || { programs_count: 0, teaching_staff_count: 0, students_count: 0 }
                  const isActive = (dept.status || '').toLowerCase() === 'active'
                  return (
                    <motion.div
                      key={dept.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      onClick={() => navigate(`/ufp/campus/${campusId}/faculty/${facultyId}/department/${dept.id}`)}
                      className="relative flex w-full cursor-pointer flex-col rounded-xl border border-slate-200 border-l-4 border-l-blue-600 bg-white p-4 shadow-sm transition-shadow hover:border-slate-300 hover:shadow-md"
                    >
                      <button
                        type="button"
                        title="Delete department"
                        onClick={(e) => openDeleteDepartmentModal(dept, e)}
                        className="absolute right-3 top-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-600/90 bg-red-600 text-white shadow-sm transition-colors hover:border-red-700 hover:bg-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <div className="flex min-w-0 items-start gap-3 pb-3">
                        <div className="shrink-0">
                          <button
                            type="button"
                            title="Change HOD photo"
                            aria-label={`Upload HOD photo for ${dept.name}`}
                            disabled={!!hodPhotoUploadingDeptId}
                            onClick={(e) => openDepartmentHodPhotoPicker(dept.id, e)}
                            className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50 text-left ring-offset-2 transition hover:ring-2 hover:ring-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                          >
                            {dept.hod_photo_url ? (
                              <img
                                src={dept.hod_photo_url}
                                alt={dept.head_of_department || 'HOD'}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <User className="h-8 w-8 text-slate-400" aria-hidden />
                            )}
                            {hodPhotoUploadingDeptId === dept.id && (
                              <span className="absolute inset-0 flex items-center justify-center bg-white/80">
                                <Loader2 className="h-6 w-6 animate-spin text-blue-600" aria-hidden />
                              </span>
                            )}
                          </button>
                        </div>
                        <div className="min-w-0 flex-1 space-y-1 pt-0.5">
                          <h4 className="break-words text-base font-semibold leading-snug text-slate-900">
                            {dept.name}
                          </h4>
                          {dept.code && (
                            <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-xs text-slate-600">
                              {dept.code}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex min-w-0 flex-wrap items-center gap-2 pb-3">
                        {dept.head_of_department && (
                          <span
                            className="max-w-full truncate rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-800"
                            title={dept.head_of_department}
                          >
                            HOD: {dept.head_of_department}
                          </span>
                        )}
                        <span
                          className={`shrink-0 rounded-md border px-2 py-1 text-xs font-medium ${
                            isActive
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                              : 'border-slate-200 bg-slate-50 text-slate-600'
                          }`}
                        >
                          {dept.status || 'Active'}
                        </span>
                      </div>
                      <div className="mt-auto border-t border-slate-200 pt-3">
                        <div className="flex items-stretch justify-between gap-3 rounded-2xl border border-slate-200/80 bg-slate-100/90 px-4 py-4 sm:gap-4">
                          <span className="flex min-w-0 flex-1 flex-col items-center gap-1.5 text-center">
                            <BookOpen className="mx-auto h-5 w-5 shrink-0 text-amber-500" strokeWidth={2} aria-hidden />
                            <span className="text-xl font-bold tabular-nums leading-none text-slate-900">{summ.programs_count}</span>
                            <span className="text-[11px] font-medium text-slate-500">Programs</span>
                          </span>
                          <span className="flex min-w-0 flex-1 flex-col items-center gap-1.5 text-center">
                            <UserCheck className="mx-auto h-5 w-5 shrink-0 text-emerald-600" strokeWidth={2} aria-hidden />
                            <span className="text-xl font-bold tabular-nums leading-none text-slate-900">{summ.teaching_staff_count}</span>
                            <span className="text-[11px] font-medium text-slate-500">Staff</span>
                          </span>
                          <span className="flex min-w-0 flex-1 flex-col items-center gap-1.5 text-center">
                            <GraduationCap className="mx-auto h-5 w-5 shrink-0 text-pink-600" strokeWidth={2} aria-hidden />
                            <span className="text-xl font-bold tabular-nums leading-none text-slate-900">{summ.students_count}</span>
                            <span className="text-[11px] font-medium text-slate-500">Students</span>
                          </span>
                        </div>
                      </div>
                      <div className="pt-2">
                        <p className="flex items-center gap-1 text-xs font-medium text-blue-600">
                          View programs & teaching staff
                          <ArrowLeft className="h-3.5 w-3.5 shrink-0 rotate-180" />
                        </p>
                      </div>
                    </motion.div>
                  )
                })}
                </div>
              </>
            )}
            </div>
          </section>
        </div>
      </UfpAdminContainer>

      <AddDepartmentInlineModal
        open={showAddDepartmentModal}
        onClose={() => setShowAddDepartmentModal(false)}
        universityId={user?.university_id}
        campusId={campusId}
        facultyId={facultyId}
        facultyName={faculty?.name}
        onSaved={async () => {
          await fetchDepartments()
          await fetchSummary()
          showToast('Department added successfully.')
        }}
        onError={(m) => showToast(m, 'error')}
      />

      <UfpGlassFormModal
        open={showDeleteDepartmentModal}
        onClose={closeDeleteDepartmentModal}
        title="Delete department?"
        subtitle={selectedDepartmentForDelete?.name || 'This action is permanent.'}
        maxWidthClass="max-w-lg"
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
            <p className="font-semibold">This action cannot be undone.</p>
            <p className="mt-1">
              Deleting this department will also remove linked records under this department, including programs and staff.
            </p>
          </div>
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={closeDeleteDepartmentModal}
              disabled={deletingDepartment}
              className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteDepartmentCascade}
              disabled={deletingDepartment}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-red-700 bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {deletingDepartment ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Department'
              )}
            </button>
          </div>
        </div>
      </UfpGlassFormModal>

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

export default FacultyDetailView
