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
  Download,
  User,
  Camera,
  Search,
  SlidersHorizontal
} from 'lucide-react'
import Breadcrumbs from '../components/Breadcrumbs'

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
  const [staffSearch, setStaffSearch] = useState('')
  const [staffDesignationFilter, setStaffDesignationFilter] = useState('')

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
      .select('id, name, category')
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
      .select('id, full_name, academic_designation, designation, profile_photo_url, qualification, specialization')
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
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-800/10 to-[#f8fafc] flex items-center justify-center">
        <div className="text-cyan-600 text-xl flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    )
  }

  if (!campus || !faculty || !department) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-800/10 to-[#f8fafc] flex items-center justify-center">
        <div className="text-center">
          <Building2 className="w-16 h-16 mx-auto mb-4 text-slate-400" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Not Found</h2>
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-full font-semibold"
          >
            Back
          </button>
        </div>
      </div>
    )
  }

  const displayDesignation = (s) => s.academic_designation || s.designation || null

  const programCategories = [...new Set(programs.map((p) => p.category).filter(Boolean))].sort()
  const staffDesignations = [...new Set(teachingStaff.map((s) => displayDesignation(s)).filter(Boolean))].sort()

  const filteredPrograms = programs.filter((p) => {
    const matchSearch = !programSearch || (p.name || '').toLowerCase().includes(programSearch.toLowerCase())
    const matchCategory = !programCategoryFilter || (p.category || '') === programCategoryFilter
    return matchSearch && matchCategory
  })

  const filteredTeachingStaff = teachingStaff.filter((s) => {
    const matchSearch = !staffSearch || (s.full_name || '').toLowerCase().includes(staffSearch.toLowerCase())
    const designation = displayDesignation(s)
    const matchDesignation = !staffDesignationFilter || designation === staffDesignationFilter
    return matchSearch && matchDesignation
  })

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-800/10 to-[#f8fafc] px-6 lg:px-10 py-8">
      <div className="w-full">
        {/* Header: left = nav + title, right = HOD corner card — centered grouping */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white/5 backdrop-blur-md border-b border-white/10 px-5 py-5 mb-6 rounded-t-3xl"
        >
          <div className="flex flex-col lg:flex-row lg:items-start gap-6 lg:gap-10">
            {/* Left: navigation + title */}
            <div className="min-w-0 flex-1">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-full font-semibold text-sm mb-4"
              >
                <ArrowLeft className="w-4 h-4" />
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
                className="text-white/80 text-xs mb-1.5"
              />
              <h2 className="text-2xl font-bold text-white mb-1">{department.name}</h2>
              {department.code && (
                <span className="text-white/80 font-mono text-xs">{department.code}</span>
              )}
            </div>

            {/* Right: HOD corner card — match dean card width and presence */}
            <div className="flex-shrink-0 w-full lg:w-[420px] py-2">
              {uploadError && (
                <p className="text-amber-300 text-xs mb-1.5 bg-amber-900/30 px-2 py-1 rounded">{uploadError}</p>
              )}
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-3">
                <div className="flex items-center gap-2 rounded-lg bg-slate-800/80 px-2.5 py-2 mb-2">
                  <input
                    type="file"
                    accept="image/*"
                    id="hod-photo-upload-dept"
                    className="hidden"
                    disabled={uploadingPhoto}
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) uploadHodPhoto(f)
                      e.target.value = ''
                    }}
                  />
                  {department.hod_photo_url ? (
                    <label
                      htmlFor="hod-photo-upload-dept"
                      className="relative w-12 h-12 rounded-lg flex-shrink-0 cursor-pointer group/avatar block"
                      title="Click to change HOD photo"
                    >
                      <img
                        src={department.hod_photo_url}
                        alt={department.head_of_department || 'HOD'}
                        className="w-full h-full rounded-lg object-cover border border-white/20"
                      />
                      <span className="absolute inset-0 rounded-lg bg-black/50 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity">
                        <Camera className="w-5 h-5 text-white" />
                      </span>
                    </label>
                  ) : (
                    <label
                      htmlFor="hod-photo-upload-dept"
                      className="w-12 h-12 rounded-lg bg-slate-600 flex items-center justify-center flex-shrink-0 cursor-pointer hover:bg-slate-500 transition-colors group border border-dashed border-slate-500"
                      title="Click to upload HOD photo"
                    >
                      {uploadingPhoto ? (
                        <Loader2 className="w-5 h-5 text-slate-300 animate-spin" />
                      ) : (
                        <Camera className="w-5 h-5 text-slate-400 group-hover:text-white" />
                      )}
                    </label>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-medium text-slate-300 uppercase tracking-wide leading-tight whitespace-nowrap">
                      Head of Department
                    </p>
                    <p className="text-white font-semibold text-sm leading-tight mt-0.5 whitespace-nowrap">
                      {department.head_of_department || 'No HOD set'}
                    </p>
                  </div>
                  <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                </div>
                <div>
                  <p className="text-[10px] font-medium text-white/70 mb-1">Appointment Letter</p>
                  {department.hod_appointment_letter_url ? (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <a
                        href={department.hod_appointment_letter_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-cyan-400 hover:underline break-all"
                      >
                        View letter
                      </a>
                      <a
                        href={department.hod_appointment_letter_url}
                        download
                        className="inline-flex items-center gap-1 px-2 py-1 bg-slate-700 hover:bg-slate-600 text-white text-[10px] rounded transition-colors"
                      >
                        <Download className="w-3 h-3" />
                        Download
                      </a>
                    </div>
                  ) : (
                    <label
                      htmlFor="hod-letter-upload-dept"
                      className="block text-xs text-white/50 hover:text-cyan-300 cursor-pointer transition-colors group hover:underline"
                    >
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        id="hod-letter-upload-dept"
                        className="hidden"
                        disabled={uploadingLetter}
                        onChange={(e) => {
                          const f = e.target.files?.[0]
                          if (f) uploadHodLetter(f)
                          e.target.value = ''
                        }}
                      />
                      {uploadingLetter ? (
                        <span className="inline-flex items-center gap-1"><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</span>
                      ) : (
                        <span>No letter uploaded — click to upload</span>
                      )}
                    </label>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Content: Programs + Teaching Staff (single column) */}
        <div className="min-w-0">

          {/* Programs section */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-purple-100">
                <BookOpen className="w-5 h-5 text-purple-600" />
              </div>
              <div className="flex-1 flex items-center justify-between flex-wrap gap-2">
                <h3 className="text-xl font-bold text-slate-900">Programs</h3>
          <button
            onClick={() =>
              navigate(
                `/ufp/programs?campusId=${campusId}&departmentId=${deptId}&returnTo=department`
              )
            }
            className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-full font-semibold"
          >
            <Plus className="w-5 h-5" />
                Add Program
              </button>
              </div>
            </div>
            {programs.length > 0 && (
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search programs..."
                    value={programSearch}
                    onChange={(e) => setProgramSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-slate-500" />
                  <select
                    value={programCategoryFilter}
                    onChange={(e) => setProgramCategoryFilter(e.target.value)}
                    className="py-2.5 px-4 rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500"
                  >
                    <option value="">All categories</option>
                    {programCategories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
            {programs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
            <BookOpen className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="text-slate-600 mb-4">No programs yet.</p>
            <button
              onClick={() =>
                navigate(
                  `/ufp/programs?campusId=${campusId}&departmentId=${deptId}&returnTo=department`
                )
              }
              className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-full font-semibold"
            >
              Add Program
            </button>
          </div>
        ) : filteredPrograms.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
            <p className="text-slate-600">No programs match your search or filter.</p>
            <button
              type="button"
              onClick={() => { setProgramSearch(''); setProgramCategoryFilter('') }}
              className="mt-3 text-sm text-purple-600 hover:text-purple-800 font-medium"
            >
              Clear search & filter
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredPrograms.map((prog) => (
              <motion.div
                key={prog.id}
                className="bg-white rounded-2xl border border-slate-200 border-t-4 border-t-purple-500 p-5 flex flex-col w-full min-w-0"
              >
                <h4 className="font-bold text-slate-900 text-lg mb-1">{prog.name}</h4>
                {prog.category && (
                  <span className="text-sm text-slate-500">{prog.category}</span>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    navigate(
                      `/ufp/students?campusId=${campusId}&programId=${prog.id}&returnTo=department&returnCampusId=${campusId}&returnFacultyId=${facultyId}&returnDeptId=${deptId}`
                    )
                  }}
                  className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                >
                  <GraduationCap className="w-4 h-4" />
                  Add / view enrollment
                </button>
              </motion.div>
            ))}
          </div>
            )}
          </div>

          {/* Teaching Staff section */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-blue-100">
                <UserCheck className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1 flex items-center justify-between flex-wrap gap-2">
                <h3 className="text-xl font-bold text-slate-900">Teaching Staff</h3>
                <button
            onClick={() =>
              navigate(
                `/ufp/staff?campusId=${campusId}&departmentId=${deptId}&staffType=Teaching&returnTo=department&returnFacultyId=${facultyId}`
              )
            }
            className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-full font-semibold"
          >
            <Plus className="w-5 h-5" />
                Add Teaching Staff
              </button>
              </div>
            </div>
            {teachingStaff.length > 0 && (
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search staff by name..."
                    value={staffSearch}
                    onChange={(e) => setStaffSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-slate-500" />
                  <select
                    value={staffDesignationFilter}
                    onChange={(e) => setStaffDesignationFilter(e.target.value)}
                    className="py-2.5 px-4 rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                  >
                    <option value="">All designations</option>
                    {staffDesignations.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
            {teachingStaff.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
            <UserCheck className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="text-slate-600 mb-4">No teaching staff yet.</p>
            <button
              onClick={() =>
                navigate(
                  `/ufp/staff?campusId=${campusId}&departmentId=${deptId}&staffType=Teaching&returnTo=department&returnFacultyId=${facultyId}`
                )
              }
              className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-full font-semibold"
            >
              Add Teaching Staff
            </button>
          </div>
            ) : filteredTeachingStaff.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
            <p className="text-slate-600">No staff match your search or filter.</p>
            <button
              type="button"
              onClick={() => { setStaffSearch(''); setStaffDesignationFilter('') }}
              className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Clear search & filter
            </button>
          </div>
            ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredTeachingStaff.map((s) => (
              <motion.div
                key={s.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-center gap-3 w-full min-w-0 hover:shadow-md transition-shadow"
              >
                <div className="flex-shrink-0">
                  {s.profile_photo_url ? (
                    <img
                      src={s.profile_photo_url}
                      alt=""
                      className="w-14 h-14 rounded-full object-cover border-2 border-slate-200"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-slate-100 border-2 border-slate-200 flex items-center justify-center">
                      <User className="w-7 h-7 text-slate-400" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900 text-base">{s.full_name}</p>
                  {displayDesignation(s) && (
                    <p className="text-sm text-slate-600">{displayDesignation(s)}</p>
                  )}
                  {(s.qualification || s.specialization) && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      {[s.qualification, s.specialization].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default DepartmentDetailView
