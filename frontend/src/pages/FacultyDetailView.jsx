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
  Users,
  User,
  FileText,
  Download,
  Camera
} from 'lucide-react'
import Breadcrumbs from '../components/Breadcrumbs'

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
      await fetchFaculty()
    } catch (e) {
      console.error('Dean letter upload error:', e)
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

  if (!campus || !faculty) {
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-800/10 to-[#f8fafc] p-8">
      <div className="w-full">
        <div>
        {/* Header + departments */}
        <div className="min-w-0">
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-white/5 backdrop-blur-md border-b border-white/10 px-6 py-6 lg:py-8 mb-8 rounded-t-3xl"
          >
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
              {/* Left: navigation + title */}
              <div className="min-w-0 flex-1">
                <button
                  onClick={() => navigate(-1)}
                  className="flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-full font-semibold text-sm mb-5"
                >
                  <ArrowLeft className="w-5 h-5" />
                  Back
                </button>
                <Breadcrumbs
                  items={[
                    { label: 'Dashboard', path: '/ufp-dashboard' },
                    { label: campus.name, path: `/ufp/campus/${campusId}` },
                    { label: 'Faculties', path: `/ufp/campus/${campusId}/faculties` },
                    { label: faculty.name }
                  ]}
                  className="text-white/80 text-sm mb-2"
                />
                <h2 className="text-2xl lg:text-3xl font-bold text-white mb-2 leading-tight">{faculty.name}</h2>
                <div className="flex flex-wrap gap-3 text-white/90">
                  <span className="px-3 py-1.5 bg-white/10 rounded-full font-mono text-sm">{faculty.code}</span>
                </div>
              </div>

              {/* Right: Dean corner card — wide horizontal pill, fixed width with vertical breathing space */}
              <div className="flex-shrink-0 w-full lg:w-[420px] py-2">
                {uploadError && (
                  <p className="text-amber-300 text-xs mb-2 bg-amber-900/40 px-3 py-1.5 rounded-lg border border-amber-500/40">
                    {uploadError}
                  </p>
                )}
                <div className="bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-3xl p-5 shadow-2xl shadow-slate-900/40">
                  <div className="flex items-center gap-4 rounded-2xl bg-slate-800/90 px-3.5 py-3 mb-4">
                    <input
                      type="file"
                      accept="image/*"
                      id="dean-photo-upload-faculty"
                      className="hidden"
                      disabled={uploadingPhoto}
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        if (f) uploadDeanPhoto(f)
                        e.target.value = ''
                      }}
                    />
                    {faculty.dean_photo_url ? (
                      <img
                        src={faculty.dean_photo_url}
                        alt={faculty.dean_name || 'Dean'}
                        className="w-24 h-24 rounded-2xl object-cover flex-shrink-0 border-2 border-white/30 shadow-lg"
                      />
                    ) : (
                      <label
                        htmlFor="dean-photo-upload-faculty"
                        className="w-24 h-24 rounded-2xl bg-slate-700 flex items-center justify-center flex-shrink-0 cursor-pointer hover:bg-slate-600 transition-colors group border-2 border-dashed border-slate-500/80"
                        title="Click to upload Dean photo"
                      >
                        {uploadingPhoto ? (
                          <Loader2 className="w-8 h-8 text-slate-200 animate-spin" />
                        ) : (
                          <Camera className="w-9 h-9 text-slate-300 group-hover:text-white" />
                        )}
                      </label>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold text-slate-300 uppercase tracking-[0.18em] whitespace-nowrap">
                        Dean / Focal Person
                      </p>
                      <p className="text-white font-semibold text-lg leading-snug mt-1 whitespace-nowrap">
                        {faculty.dean_name || 'No dean set'}
                      </p>
                      {faculty.dean_name && (
                        <span className="inline-flex items-center mt-2 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-200 text-xs font-medium border border-emerald-400/30">
                          <User className="w-3.5 h-3.5 mr-1" />
                          Official Dean Record
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-white/70 mb-1.5 uppercase tracking-[0.16em]">
                      Appointment Letter
                    </p>
                    {faculty.dean_appointment_letter_url ? (
                      <div className="flex flex-wrap items-center gap-2.5">
                        <a
                          href={faculty.dean_appointment_letter_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-cyan-300 hover:text-cyan-200 hover:underline break-all"
                        >
                          View letter
                        </a>
                        <a
                          href={faculty.dean_appointment_letter_url}
                          download
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs rounded-full transition-colors shadow-sm"
                        >
                          <Download className="w-4 h-4" />
                          Download
                        </a>
                      </div>
                    ) : (
                      <label
                        htmlFor="dean-letter-upload-faculty"
                        className="block text-sm text-white/50 hover:text-cyan-300 cursor-pointer transition-colors group"
                      >
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx"
                          id="dean-letter-upload-faculty"
                          className="hidden"
                          disabled={uploadingLetter}
                          onChange={(e) => {
                            const f = e.target.files?.[0]
                            if (f) uploadDeanLetter(f)
                            e.target.value = ''
                          }}
                        />
                        {uploadingLetter ? (
                          <span className="inline-flex items-center gap-1.5 text-sm text-white/80">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Uploading&hellip;
                          </span>
                        ) : (
                          <span className="group-hover:underline text-sm">
                            No letter uploaded — upload signed appointment letter
                          </span>
                        )}
                      </label>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">Departments</h3>
              <button
                onClick={() => navigate(`/ufp/departments?campusId=${campusId}&facultyId=${facultyId}&returnTo=faculty`)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-full font-semibold"
              >
                <Plus className="w-5 h-5" />
                Add Department
              </button>
            </div>

            {departments.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl border border-slate-200 p-12 text-center"
              >
                <Users className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <p className="text-slate-600 mb-4">No departments yet. Add the first one to get started.</p>
                <button
                  onClick={() => navigate(`/ufp/departments?campusId=${campusId}&facultyId=${facultyId}&returnTo=faculty`)}
                  className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-full font-semibold"
                >
                  Add Department
                </button>
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6 justify-items-stretch">
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
                      className="relative bg-white rounded-3xl border border-slate-200/80 border-t-[4px] border-t-blue-600/90 w-full cursor-pointer hover:shadow-xl hover:-translate-y-0.5 transition-all shadow-sm flex flex-col px-6 py-5"
                    >
                      {/* Top: HOD image + department identity */}
                      <div className="flex items-start gap-4 min-w-0 pb-4">
                        <div className="flex-shrink-0">
                          {dept.hod_photo_url ? (
                            <img
                              src={dept.hod_photo_url}
                              alt={dept.head_of_department || 'HOD'}
                              className="w-24 h-24 rounded-2xl object-cover border-2 border-slate-200 shadow-md"
                            />
                          ) : (
                            <div
                              className="w-24 h-24 rounded-2xl bg-slate-50 border-2 border-slate-200 flex items-center justify-center"
                              title="No HOD photo"
                            >
                              <User className="w-11 h-11 text-slate-400" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1 pt-0.5 space-y-1">
                          <h4 className="font-bold text-slate-950 text-xl leading-snug break-words">
                            {dept.name}
                          </h4>
                          {dept.code && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-mono">
                              {dept.code}
                            </span>
                          )}
                        </div>
                      </div>
                      {/* HOD name + status */}
                      <div className="flex flex-wrap items-center gap-2.5 min-w-0 pb-4">
                        {dept.head_of_department && (
                          <span
                            className="px-3.5 py-1.5 bg-slate-900 text-white text-sm font-semibold rounded-full whitespace-nowrap min-w-0 max-w-full truncate"
                            title={dept.head_of_department}
                          >
                            HOD: {dept.head_of_department}
                          </span>
                        )}
                        <span
                          className={`px-3 py-1.5 text-xs font-semibold rounded-full flex-shrink-0 border ${
                            isActive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-50 text-slate-600 border-slate-200'
                          }`}
                        >
                          {dept.status || 'Active'}
                        </span>
                      </div>
                      {/* Stats band */}
                      <div className="mt-auto pt-3 border-t border-slate-200/80">
                        <div className="mt-2 grid grid-cols-3 gap-2 bg-slate-50 rounded-2xl px-3 py-3">
                          <span className="flex flex-col items-center gap-0.5 text-center">
                            <BookOpen className="w-4 h-4 text-amber-600 shrink-0 mx-auto" />
                            <span className="text-sm font-semibold tabular-nums text-slate-900">
                              {summ.programs_count}
                            </span>
                            <span className="text-[11px] text-slate-500">Programs</span>
                          </span>
                          <span className="flex flex-col items-center gap-0.5 text-center">
                            <UserCheck className="w-4 h-4 text-emerald-600 shrink-0 mx-auto" />
                            <span className="text-sm font-semibold tabular-nums text-slate-900">
                              {summ.teaching_staff_count}
                            </span>
                            <span className="text-[11px] text-slate-500">Staff</span>
                          </span>
                          <span className="flex flex-col items-center gap-0.5 text-center">
                            <GraduationCap className="w-4 h-4 text-pink-500 shrink-0 mx-auto" />
                            <span className="text-sm font-semibold tabular-nums text-slate-900">
                              {summ.students_count}
                            </span>
                            <span className="text-[11px] text-slate-500">Students</span>
                          </span>
                        </div>
                      </div>
                      {/* Link */}
                      <div className="pt-3">
                        <p className="text-xs font-medium text-slate-500 hover:text-slate-700 flex items-center gap-1.5">
                          View programs & teaching staff
                          <ArrowLeft className="w-4 h-4 rotate-180 shrink-0" />
                        </p>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
        </div>
      </div>
    </div>
  )
}

export default FacultyDetailView
