import { useState, useEffect } from 'react'
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
  FileText,
  User,
  Search,
  SlidersHorizontal
} from 'lucide-react'
import Breadcrumbs from '../components/Breadcrumbs'
import { UfpAdminShell, UfpAdminContainer, UfpAdminLoadingCenter } from '../components/UfpAdminShell'
import UfpLeadershipPanel from '../components/UfpLeadershipPanel'

/** Must match `DEGREE_LEVELS` in ProgramManagement.jsx (add program form). */
const PROGRAM_DEGREE_LEVEL_FILTER_OPTIONS = [
  'Undergraduate',
  'Graduate (MS/M.Phil)',
  'Postgraduate (PhD)'
]

/** Align with StaffManagement.jsx teaching-staff form options. */
const ACADEMIC_DESIGNATION_OPTIONS = [
  'Professor',
  'Associate Professor',
  'Assistant Professor',
  'Lecturer',
  'Instructor',
  'Lab Instructor'
]

const STAFF_EMPLOYMENT_TYPE_OPTIONS = ['Permanent', 'Contract', 'Visiting', 'Daily Wages']

const STAFF_ADMINISTRATIVE_ROLE_OPTIONS = [
  'No Additional Role',
  'Dean',
  'Head of Department',
  'Director',
  'Chairperson',
  'Program Coordinator'
]

const STAFF_GENDER_OPTIONS = ['Male', 'Female', 'Prefer not to say']

function DepartmentDetailView() {
  const navigate = useNavigate()
  const { id: campusId, facultyId, deptId } = useParams()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [campus, setCampus] = useState(null)
  const [faculty, setFaculty] = useState(null)
  const [department, setDepartment] = useState(null)
  const [programs, setPrograms] = useState([])
  const [teachingStaff, setTeachingStaff] = useState([])
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [uploadingLetter, setUploadingLetter] = useState(false)
  const [uploadError, setUploadError] = useState(null)
  const [programSearch, setProgramSearch] = useState('')
  const [programCategoryFilter, setProgramCategoryFilter] = useState('')
  const [programDegreeFilter, setProgramDegreeFilter] = useState('')
  const [programDurationFilter, setProgramDurationFilter] = useState('')
  const [programCreditsFilter, setProgramCreditsFilter] = useState('')
  const [staffSearch, setStaffSearch] = useState('')
  const [staffDesignationFilter, setStaffDesignationFilter] = useState('')
  const [staffEmploymentFilter, setStaffEmploymentFilter] = useState('')
  const [staffAdminRoleFilter, setStaffAdminRoleFilter] = useState('')
  const [staffGenderFilter, setStaffGenderFilter] = useState('')

  useEffect(() => {
    loadUserData()
  }, [])

  useEffect(() => {
    if (!user?.university_id || !campusId || !facultyId || !deptId) return
    let cancelled = false
    setLoading(true)
    const run = async () => {
      try {
        await fetchCampus()
        if (cancelled) return
        await fetchFaculty()
        if (cancelled) return
        await fetchDepartment()
        if (cancelled) return
        fetchPrograms()
        fetchTeachingStaff()
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [user, campusId, facultyId, deptId])

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
      if (!campusId || !facultyId || !deptId) setLoading(false)
    } catch (e) {
      console.error(e)
      navigate('/login')
    }
  }

  const fetchCampus = async () => {
    if (!campusId || !user?.university_id) return
    const { data, error } = await supabase
      .from('campuses')
      .select('id, name')
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
      .select('id, name, code')
      .eq('id', facultyId)
      .eq('university_id', user.university_id)
      .single()
    if (error || !data) {
      navigate(`/ufp/campus/${campusId}`)
      return
    }
    setFaculty(data)
  }

  const fetchDepartment = async () => {
    if (!deptId || !user?.university_id) return
    const { data, error } = await supabase
      .from('departments')
      .select('*')
      .eq('id', deptId)
      .eq('university_id', user.university_id)
      .eq('faculty_id', facultyId)
      .single()
    if (error || !data) {
      navigate(`/ufp/campus/${campusId}/faculty/${facultyId}`)
      return
    }
    setDepartment(data)
  }

  const fetchPrograms = async () => {
    if (!deptId || !user?.university_id) return
    const { data, error } = await supabase
      .from('programs')
      .select('id, name, category, degree_level, duration_years, total_credit_hours')
      .eq('university_id', user.university_id)
      .eq('department_id', deptId)
      .order('name', { ascending: true })
    if (error) {
      console.error('Error fetching programs:', error)
      return
    }
    setPrograms(data || [])
  }

  const fetchTeachingStaff = async () => {
    if (!deptId || !user?.university_id) return
    const { data, error } = await supabase
      .from('staff')
      .select(
        'id, full_name, academic_designation, designation, profile_photo_url, qualification, specialization, email, phone, gender, employment_type, administrative_role'
      )
      .eq('university_id', user.university_id)
      .eq('department_id', deptId)
      .eq('type', 'Teaching')
      .order('full_name', { ascending: true })
    if (error) {
      console.error('Error fetching teaching staff:', error)
      return
    }
    setTeachingStaff(data || [])
  }

  const uploadHodPhoto = async (file) => {
    if (!file || !user?.university_id || !deptId) return
    setUploadError(null)
    setUploadingPhoto(true)
    try {
      const fileName = `hod-photo-${user.university_id}-${Date.now()}-${file.name.replace(/\s/g, '-')}`
      const { error: upErr } = await supabase.storage.from('official_photos').upload(fileName, file, { cacheControl: '3600', upsert: true })
      if (upErr) throw new Error(upErr.message || 'Upload failed')
      const { data: urlData } = supabase.storage.from('official_photos').getPublicUrl(fileName)
      const url = urlData?.publicUrl
      if (!url) throw new Error('Failed to get URL')
      const { error: dbErr } = await supabase.from('departments').update({ hod_photo_url: url }).eq('id', deptId).eq('university_id', user.university_id)
      if (dbErr) throw new Error(dbErr.message || 'Database update failed')
      setDepartment((d) => (d ? { ...d, hod_photo_url: url } : d))
      await fetchDepartment()
    } catch (e) {
      console.error('HOD photo upload error:', e)
      setUploadError(e.message || 'Failed to upload photo')
    } finally {
      setUploadingPhoto(false)
    }
  }

  const uploadHodLetter = async (file) => {
    if (!file || !user?.university_id || !deptId) return
    setUploadError(null)
    setUploadingLetter(true)
    try {
      const ext = file.name.split('.').pop() || 'pdf'
      const fileName = `hod-letter-${user.university_id}-${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('appointment_letters').upload(fileName, file, { cacheControl: '3600', upsert: true })
      if (upErr) throw new Error(upErr.message || 'Upload failed')
      const { data: urlData } = supabase.storage.from('appointment_letters').getPublicUrl(fileName)
      const url = urlData?.publicUrl
      if (!url) throw new Error('Failed to get URL')
      const { error: dbErr } = await supabase.from('departments').update({ hod_appointment_letter_url: url }).eq('id', deptId).eq('university_id', user.university_id)
      if (dbErr) throw new Error(dbErr.message || 'Database update failed')
      setDepartment((d) => (d ? { ...d, hod_appointment_letter_url: url } : d))
      await fetchDepartment()
    } catch (e) {
      console.error('HOD letter upload error:', e)
      setUploadError(e.message || 'Failed to upload letter')
    } finally {
      setUploadingLetter(false)
    }
  }

  if (loading) {
    return <UfpAdminLoadingCenter />
  }

  if (!campus || !faculty || !department) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
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
    )
  }

  const displayDesignation = (s) => s.academic_designation || s.designation || null

  const programCategories = [...new Set(programs.map((p) => p.category).filter(Boolean))].sort()
  const degreeLevelsFromData = [...new Set(programs.map((p) => p.degree_level).filter(Boolean))]
  const extraDegreeLevels = degreeLevelsFromData
    .filter((l) => !PROGRAM_DEGREE_LEVEL_FILTER_OPTIONS.includes(l))
    .sort((a, b) => a.localeCompare(b))
  const programDegreeLevelFilterOptions = [...PROGRAM_DEGREE_LEVEL_FILTER_OPTIONS, ...extraDegreeLevels]
  const programDurations = [
    ...new Set(
      programs
        .map((p) => p.duration_years)
        .filter((y) => y != null && y !== '')
        .map((y) => String(y))
    )
  ].sort((a, b) => Number(a) - Number(b))
  const programCreditOptions = [
    ...new Set(
      programs
        .map((p) => p.total_credit_hours)
        .filter((c) => c != null && c !== '')
        .map((c) => String(c))
    )
  ].sort((a, b) => Number(a) - Number(b))
  const staffDesignationsFromData = [...new Set(teachingStaff.map((s) => displayDesignation(s)).filter(Boolean))]
  const staffDesignationFilterOptions = [
    ...ACADEMIC_DESIGNATION_OPTIONS,
    ...staffDesignationsFromData
      .filter((d) => !ACADEMIC_DESIGNATION_OPTIONS.includes(d))
      .sort((a, b) => a.localeCompare(b))
  ]
  const filteredPrograms = programs.filter((p) => {
    const q = programSearch.trim().toLowerCase()
    const matchSearch =
      !q ||
      (p.name || '').toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q) ||
      (p.degree_level || '').toLowerCase().includes(q)
    const matchCategory = !programCategoryFilter || (p.category || '') === programCategoryFilter
    const matchDegree = !programDegreeFilter || (p.degree_level || '') === programDegreeFilter
    const matchDuration =
      !programDurationFilter || String(p.duration_years ?? '') === programDurationFilter
    const matchCredits =
      !programCreditsFilter || String(p.total_credit_hours ?? '') === programCreditsFilter
    return matchSearch && matchCategory && matchDegree && matchDuration && matchCredits
  })

  const filteredTeachingStaff = teachingStaff.filter((s) => {
    const q = staffSearch.trim().toLowerCase()
    const matchSearch =
      !q ||
      (s.full_name || '').toLowerCase().includes(q) ||
      (s.email || '').toLowerCase().includes(q) ||
      (s.phone || '').toLowerCase().replace(/\s/g, '').includes(q.replace(/\s/g, '')) ||
      (s.qualification || '').toLowerCase().includes(q) ||
      (s.specialization || '').toLowerCase().includes(q) ||
      (s.administrative_role || '').toLowerCase().includes(q)
    const designation = displayDesignation(s)
    const matchDesignation = !staffDesignationFilter || designation === staffDesignationFilter
    const matchEmployment =
      !staffEmploymentFilter || (s.employment_type || '') === staffEmploymentFilter
    const adminRole = s.administrative_role || 'No Additional Role'
    const matchAdminRole = !staffAdminRoleFilter || adminRole === staffAdminRoleFilter
    const matchGender = !staffGenderFilter || (s.gender || '') === staffGenderFilter
    return (
      matchSearch &&
      matchDesignation &&
      matchEmployment &&
      matchAdminRole &&
      matchGender
    )
  })

  return (
    <UfpAdminShell>
      <UfpAdminContainer>
        <motion.div
          initial={{ y: -12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="mb-10 rounded-xl border border-slate-200/90 border-t-2 border-t-blue-600 bg-gradient-to-br from-white via-blue-50/[0.07] to-slate-50 p-5 shadow-md shadow-slate-300/25 ring-1 ring-slate-200/50 sm:mb-12 sm:p-6"
        >
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
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
                  { label: faculty.name, path: `/ufp/campus/${campusId}/faculty/${facultyId}` },
                  { label: department.name }
                ]}
                className="mb-2 text-sm text-slate-500"
              />
              <h2 className="mb-1 text-2xl font-bold tracking-tight text-slate-900">{department.name}</h2>
              {department.code && (
                <span className="font-mono text-xs text-slate-600">{department.code}</span>
              )}
            </div>

            <div className="w-full shrink-0 lg:max-w-md lg:w-[400px]">
              <UfpLeadershipPanel
                roleLabel="Head of Department"
                displayName={department.head_of_department}
                emptyDisplayLabel="No HOD set"
                photoUrl={department.hod_photo_url}
                photoAlt={department.head_of_department || 'HOD'}
                photoInputId="hod-photo-upload-dept"
                letterInputId="hod-letter-upload-dept"
                letterUrl={department.hod_appointment_letter_url}
                uploadError={uploadError}
                uploadingPhoto={uploadingPhoto}
                uploadingLetter={uploadingLetter}
                onPhotoChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) uploadHodPhoto(f)
                  e.target.value = ''
                }}
                onLetterChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) uploadHodLetter(f)
                  e.target.value = ''
                }}
                photoChangeOverlay
                trailingSlot={<FileText className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />}
                letterIdleLabel="No letter uploaded — click to upload"
                letterUploadingLabel="Uploading..."
              />
            </div>
          </div>
        </motion.div>

        <div className="min-w-0">

          <section className="mb-12 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-sm">
            <div className="border-b border-blue-200/70 bg-blue-50/60 px-4 py-3.5 sm:px-5 sm:py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2.5">
                  <BookOpen className="h-6 w-6 shrink-0 text-blue-600" aria-hidden />
                  <h3 className="text-2xl font-bold tracking-tight text-slate-900">Programs</h3>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      `/ufp/programs?campusId=${campusId}&departmentId=${deptId}&returnTo=department`
                    )
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  Add Program
                </button>
              </div>
            </div>
            <div className="p-4 sm:p-5">
            {programs.length > 0 && (
              <div className="mb-5 space-y-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                  <div className="relative min-w-[min(100%,220px)] flex-1 sm:max-w-md">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search name, category, or degree level..."
                      value={programSearch}
                      onChange={(e) => setProgramSearch(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <SlidersHorizontal className="h-4 w-4 shrink-0 text-blue-600/80 max-sm:hidden" aria-hidden />
                    <select
                      value={programCategoryFilter}
                      onChange={(e) => setProgramCategoryFilter(e.target.value)}
                      className="min-w-[9.5rem] rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      aria-label="Filter by category"
                    >
                      <option value="">All categories</option>
                      {programCategories.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                    <select
                      value={programDegreeFilter}
                      onChange={(e) => setProgramDegreeFilter(e.target.value)}
                      className="min-w-[9.5rem] rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      aria-label="Filter by degree level"
                    >
                      <option value="">All degree levels</option>
                      {programDegreeLevelFilterOptions.map((lvl) => (
                        <option key={lvl} value={lvl}>{lvl}</option>
                      ))}
                    </select>
                    {programDurations.length > 0 && (
                      <select
                        value={programDurationFilter}
                        onChange={(e) => setProgramDurationFilter(e.target.value)}
                        className="min-w-[9.5rem] rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        aria-label="Filter by program duration"
                      >
                        <option value="">All durations</option>
                        {programDurations.map((y) => (
                          <option key={y} value={y}>
                            {y} {y === '1' ? 'year' : 'years'}
                          </option>
                        ))}
                      </select>
                    )}
                    {programCreditOptions.length > 0 && (
                      <select
                        value={programCreditsFilter}
                        onChange={(e) => setProgramCreditsFilter(e.target.value)}
                        className="min-w-[10rem] rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        aria-label="Filter by total credit hours"
                      >
                        <option value="">All credit hours</option>
                        {programCreditOptions.map((c) => (
                          <option key={c} value={c}>{c} credits</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              </div>
            )}
            {programs.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                <BookOpen className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                <p className="mb-4 text-sm text-slate-600">No programs yet.</p>
                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      `/ufp/programs?campusId=${campusId}&departmentId=${deptId}&returnTo=department`
                    )
                  }
                  className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
                >
                  Add Program
                </button>
              </div>
            ) : filteredPrograms.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                <p className="text-sm text-slate-600">No programs match your search or filter.</p>
                <button
                  type="button"
                  onClick={() => {
                    setProgramSearch('')
                    setProgramCategoryFilter('')
                    setProgramDegreeFilter('')
                    setProgramDurationFilter('')
                    setProgramCreditsFilter('')
                  }}
                  className="mt-3 text-sm font-medium text-blue-600 hover:text-blue-800"
                >
                  Clear search & filters
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
                <table className="w-full min-w-[860px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b-2 border-slate-300 bg-slate-100">
                      <th className="px-4 py-3.5 text-xs font-bold uppercase tracking-wide text-slate-900">Program</th>
                      <th className="px-4 py-3.5 text-xs font-bold uppercase tracking-wide text-slate-900">Category</th>
                      <th className="px-4 py-3.5 text-xs font-bold uppercase tracking-wide text-slate-900">Degree</th>
                      <th className="whitespace-nowrap px-4 py-3.5 text-xs font-bold uppercase tracking-wide text-slate-900">Duration</th>
                      <th className="whitespace-nowrap px-4 py-3.5 text-xs font-bold uppercase tracking-wide text-slate-900">Credits</th>
                      <th className="px-4 py-3.5 text-xs font-bold uppercase tracking-wide text-slate-900">Enrollment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/80">
                    {filteredPrograms.map((prog) => (
                      <tr
                        key={prog.id}
                        className="odd:bg-white even:bg-slate-50/70 transition-colors hover:bg-blue-50/50"
                      >
                        <td className="px-4 py-3.5 font-medium text-slate-900">{prog.name}</td>
                        <td className="px-4 py-3.5 text-slate-600">{prog.category || '—'}</td>
                        <td className="px-4 py-3.5 text-slate-700">{prog.degree_level || '—'}</td>
                        <td className="whitespace-nowrap px-4 py-3.5 text-slate-600">
                          {prog.duration_years != null && prog.duration_years !== ''
                            ? `${prog.duration_years} ${Number(prog.duration_years) === 1 ? 'yr' : 'yrs'}`
                            : '—'}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5 text-slate-600">
                          {prog.total_credit_hours != null && prog.total_credit_hours !== '' ? prog.total_credit_hours : '—'}
                        </td>
                        <td className="px-4 py-3.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              navigate(
                                `/ufp/students?campusId=${campusId}&programId=${prog.id}&returnTo=department&returnCampusId=${campusId}&returnFacultyId=${facultyId}&returnDeptId=${deptId}`
                              )
                            }}
                            className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800"
                          >
                            <GraduationCap className="h-4 w-4 shrink-0 text-blue-600" />
                            Add / view enrollment
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-sm ring-1 ring-slate-200/70">
            <div className="border-b border-blue-200/70 bg-blue-50/60 px-4 py-3.5 sm:px-5 sm:py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2.5">
                  <UserCheck className="h-6 w-6 shrink-0 text-blue-600" aria-hidden />
                  <h3 className="text-2xl font-bold tracking-tight text-slate-900">Teaching Staff</h3>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      `/ufp/staff?campusId=${campusId}&departmentId=${deptId}&staffType=Teaching&returnTo=department&returnFacultyId=${facultyId}`
                    )
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  Add Teaching Staff
                </button>
              </div>
            </div>
            <div className="p-4 sm:p-5">
            {teachingStaff.length > 0 && (
              <div className="mb-5 space-y-3">
                <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
                  <div className="relative min-w-[min(100%,220px)] flex-1 lg:max-w-md">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search name, email, phone, qualification, specialization…"
                      value={staffSearch}
                      onChange={(e) => setStaffSearch(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <SlidersHorizontal className="h-4 w-4 shrink-0 text-blue-600/80 max-sm:hidden" aria-hidden />
                    <select
                      value={staffDesignationFilter}
                      onChange={(e) => setStaffDesignationFilter(e.target.value)}
                      className="min-w-[9.5rem] rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      aria-label="Filter by academic designation"
                    >
                      <option value="">All designations</option>
                      {staffDesignationFilterOptions.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                    <select
                      value={staffEmploymentFilter}
                      onChange={(e) => setStaffEmploymentFilter(e.target.value)}
                      className="min-w-[9.5rem] rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      aria-label="Filter by employment type"
                    >
                      <option value="">All employment</option>
                      {STAFF_EMPLOYMENT_TYPE_OPTIONS.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    <select
                      value={staffAdminRoleFilter}
                      onChange={(e) => setStaffAdminRoleFilter(e.target.value)}
                      className="min-w-[10.5rem] rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      aria-label="Filter by administrative role"
                    >
                      <option value="">All admin roles</option>
                      {STAFF_ADMINISTRATIVE_ROLE_OPTIONS.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                    <select
                      value={staffGenderFilter}
                      onChange={(e) => setStaffGenderFilter(e.target.value)}
                      className="min-w-[9rem] rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      aria-label="Filter by gender"
                    >
                      <option value="">All genders</option>
                      {STAFF_GENDER_OPTIONS.map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
            {teachingStaff.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                <UserCheck className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                <p className="mb-4 text-sm text-slate-600">No teaching staff yet.</p>
                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      `/ufp/staff?campusId=${campusId}&departmentId=${deptId}&staffType=Teaching&returnTo=department&returnFacultyId=${facultyId}`
                    )
                  }
                  className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
                >
                  Add Teaching Staff
                </button>
              </div>
            ) : filteredTeachingStaff.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                <p className="text-sm text-slate-600">No staff match your search or filter.</p>
                <button
                  type="button"
                  onClick={() => {
                    setStaffSearch('')
                    setStaffDesignationFilter('')
                    setStaffEmploymentFilter('')
                    setStaffAdminRoleFilter('')
                    setStaffGenderFilter('')
                  }}
                  className="mt-3 text-sm font-medium text-blue-600 hover:text-blue-800"
                >
                  Clear search & filters
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
                <table className="w-full min-w-[880px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b-2 border-slate-300 bg-slate-100">
                      <th className="w-14 px-3 py-3.5 text-xs font-bold uppercase tracking-wide text-slate-900" aria-label="Photo" />
                      <th className="min-w-[8rem] px-4 py-3.5 text-xs font-bold uppercase tracking-wide text-slate-900">Name</th>
                      <th className="min-w-[7rem] px-4 py-3.5 text-xs font-bold uppercase tracking-wide text-slate-900">Designation</th>
                      <th className="min-w-[9rem] px-4 py-3.5 text-xs font-bold uppercase tracking-wide text-slate-900">Email</th>
                      <th className="whitespace-nowrap px-4 py-3.5 text-xs font-bold uppercase tracking-wide text-slate-900">Phone</th>
                      <th className="min-w-[6rem] px-4 py-3.5 text-xs font-bold uppercase tracking-wide text-slate-900">Employment</th>
                      <th className="min-w-[7rem] px-4 py-3.5 text-xs font-bold uppercase tracking-wide text-slate-900">Admin role</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/80">
                    {filteredTeachingStaff.map((s) => (
                      <tr
                        key={s.id}
                        className="odd:bg-white even:bg-slate-50/70 transition-colors hover:bg-blue-50/50"
                      >
                        <td className="px-3 py-3.5 align-middle">
                          {s.profile_photo_url ? (
                            <img
                              src={s.profile_photo_url}
                              alt=""
                              className="h-10 w-10 rounded-md border border-slate-200 object-cover"
                            />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 bg-slate-100">
                              <User className="h-5 w-5 text-slate-400" />
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3.5 align-middle font-medium text-slate-900">{s.full_name}</td>
                        <td className="px-4 py-3.5 align-middle text-slate-600">{displayDesignation(s) || '—'}</td>
                        <td className="max-w-[11rem] px-4 py-3.5 align-middle text-slate-600">
                          {s.email ? (
                            <a
                              href={`mailto:${s.email}`}
                              className="break-all text-sm font-medium text-blue-600 hover:text-blue-800"
                            >
                              {s.email}
                            </a>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5 align-middle text-slate-600">{s.phone || '—'}</td>
                        <td className="px-4 py-3.5 align-middle text-slate-600">{s.employment_type || '—'}</td>
                        <td className="max-w-[9rem] px-4 py-3.5 align-middle text-slate-600" title={s.administrative_role || 'No Additional Role'}>
                          <span className="line-clamp-2">{s.administrative_role || 'No Additional Role'}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            </div>
          </section>
        </div>
      </UfpAdminContainer>
    </UfpAdminShell>
  )
}

export default DepartmentDetailView
