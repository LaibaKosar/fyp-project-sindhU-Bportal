import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabaseClient'
import { useNavigate, useLocation } from 'react-router-dom'
import { recordSystemLog } from '../utils/systemLogs'
import { 
  LayoutDashboard, 
  Building2, 
  GraduationCap, 
  Users, 
  BookOpen, 
  UserCheck, 
  UsersRound,
  LogOut,
  Plus,
  Briefcase,
  Upload,
  Image as ImageIcon,
  X,
  Palette,
  ChevronDown,
  ChevronRight,
  Calendar,
  BarChart3,
  Gavel,
  LayoutGrid,
} from 'lucide-react'

function UFPDashboard() {
  const navigate = useNavigate()
  const location = useLocation()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [university, setUniversity] = useState(null)
  const [backgroundUrl, setBackgroundUrl] = useState(null)
  const [showCustomize, setShowCustomize] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingBackground, setUploadingBackground] = useState(false)
  const [facultyCount, setFacultyCount] = useState(0)
  const [departmentCount, setDepartmentCount] = useState(0)
  const [campusCount, setCampusCount] = useState(0)
  const [staffCount, setStaffCount] = useState(0)
  const [programCount, setProgramCount] = useState(0)
  const [studentCount, setStudentCount] = useState(0)
  const [campuses, setCampuses] = useState([])
  const [showCampusesDropdown, setShowCampusesDropdown] = useState(false)

  // Determine active section from current route
  const activeSection = location.pathname.includes('/faculties') ? 'faculties' :
                       location.pathname.includes('/campus/') ? 'campus' :
                       location.pathname.includes('/campuses') ? 'campuses' :
                       location.pathname.includes('/departments') ? 'departments' :
                       location.pathname.includes('/programs') ? 'programs' :
                       location.pathname.includes('/staff') ? 'staff' :
                       location.pathname.includes('/students') ? 'students' :
                       location.pathname.includes('/meetings') ? 'meetings' :
                       location.pathname.includes('/reports') ? 'reports' :
                       location.pathname.includes('/boards') ? 'governance' :
                       location.pathname.includes('/senate') ? 'governance' :
                       location.pathname.includes('/syndicate') ? 'governance' :
                       location.pathname.includes('/governance') ? 'governance' :
                       'overview'

  useEffect(() => {
    loadUserData()
  }, [])

  useEffect(() => {
    if (user?.university_id) {
      fetchFacultyCount()
      fetchDepartmentCount()
      fetchCampuses()
      fetchCampusCount()
      fetchStaffCount()
      fetchProgramCount()
      fetchStudentCount()
    }
  }, [user])

  const loadUserData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        navigate('/login')
        return
      }

      // Fetch user profile with full_name
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, university_id')
        .eq('id', session.user.id)
        .single()

      if (profileError) {
        console.error('Error fetching profile:', profileError)
        navigate('/login')
        return
      }

      // Check if user is UFP
      if (!profile) {
        navigate('/login')
        return
      }

      setUser(profile)

      // Fetch university data if university_id exists
      if (profile.university_id) {
        const { data: uniData, error: uniError } = await supabase
          .from('universities')
          .select('name, logo_url, dashboard_bg_url')
          .eq('id', profile.university_id)
          .single()

        if (!uniError && uniData) {
          setUniversity(uniData)
          setBackgroundUrl(uniData.dashboard_bg_url)
        }
      }

      setLoading(false)
    } catch (error) {
      console.error('Error loading user data:', error)
      navigate('/login')
    }
  }

  const fetchFacultyCount = async () => {
    if (!user?.university_id) return

    try {
      // Fetch all faculty names to count unique names across campuses
      const { data, error } = await supabase
        .from('faculties')
        .select('name')
        .eq('university_id', user.university_id)

      if (error) {
        console.error('Error fetching faculty count:', error)
        return
      }

      // Count unique faculty names
      const uniqueNames = [...new Set(data.map(f => f.name))]
      setFacultyCount(uniqueNames.length)
    } catch (error) {
      console.error('Error in fetchFacultyCount:', error)
    }
  }

  const fetchDepartmentCount = async () => {
    if (!user?.university_id) return

    try {
      // Fetch all department names to count unique names across campuses
      const { data, error } = await supabase
        .from('departments')
        .select('name')
        .eq('university_id', user.university_id)

      if (error) {
        console.error('Error fetching department count:', error)
        return
      }

      // Count unique department names
      const uniqueNames = [...new Set(data.map(d => d.name))]
      setDepartmentCount(uniqueNames.length)
    } catch (error) {
      console.error('Error in fetchDepartmentCount:', error)
    }
  }

  const fetchCampuses = async () => {
    if (!user?.university_id) return

    try {
      const { data, error } = await supabase
        .from('campuses')
        .select('*')
        .eq('university_id', user.university_id)
        .order('is_main_campus', { ascending: false })
        .order('name', { ascending: true })

      if (error) {
        console.error('Error fetching campuses:', error)
        return
      }

      setCampuses(data || [])
    } catch (error) {
      console.error('Error in fetchCampuses:', error)
    }
  }

  const fetchCampusCount = async () => {
    if (!user?.university_id) return

    try {
      const { count, error } = await supabase
        .from('campuses')
        .select('*', { count: 'exact', head: true })
        .eq('university_id', user.university_id)

      if (error) {
        console.error('Error fetching campus count:', error)
        return
      }

      setCampusCount(count || 0)
    } catch (error) {
      console.error('Error in fetchCampusCount:', error)
    }
  }

  const fetchStaffCount = async () => {
    if (!user?.university_id) return

    try {
      const { count, error } = await supabase
        .from('staff')
        .select('*', { count: 'exact', head: true })
        .eq('university_id', user.university_id)

      if (error) {
        console.error('Error fetching staff count:', error)
        return
      }

      setStaffCount(count || 0)
    } catch (error) {
      console.error('Error in fetchStaffCount:', error)
    }
  }

  const fetchProgramCount = async () => {
    if (!user?.university_id) return

    try {
      const { count, error } = await supabase
        .from('programs')
        .select('*', { count: 'exact', head: true })
        .eq('university_id', user.university_id)

      if (error) {
        console.error('Error fetching program count:', error)
        return
      }

      setProgramCount(count || 0)
    } catch (error) {
      console.error('Error in fetchProgramCount:', error)
    }
  }

  const fetchStudentCount = async () => {
    if (!user?.university_id) return

    try {
      // Sum total_enrolled from enrollment_reports
      const { data, error } = await supabase
        .from('enrollment_reports')
        .select('total_enrolled, male_students, female_students')
        .eq('university_id', user.university_id)

      if (error) {
        console.error('Error fetching student count:', error)
        return
      }

      // Calculate sum: use total_enrolled if available, otherwise sum male + female
      const total = data?.reduce((sum, report) => {
        if (report.total_enrolled !== null && report.total_enrolled !== undefined) {
          return sum + (report.total_enrolled || 0)
        }
        // Fallback to manual calculation if total_enrolled is not available
        return sum + ((report.male_students || 0) + (report.female_students || 0))
      }, 0) || 0

      setStudentCount(total)
    } catch (error) {
      console.error('Error in fetchStudentCount:', error)
    }
  }

  const toggleCampusesSection = () => {
    setShowCampusesDropdown(!showCampusesDropdown)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0]
    if (!file || !user?.university_id) return

    setUploadingLogo(true)
    try {
      const fileName = `logo-${user.university_id}`
      
      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('university-logos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('university-logos')
        .getPublicUrl(fileName)

      // Update database
      const { error: updateError } = await supabase
        .from('universities')
        .update({ logo_url: urlData.publicUrl })
        .eq('id', user.university_id)

      if (updateError) throw updateError

      // Update local state
      setUniversity(prev => ({ ...prev, logo_url: urlData.publicUrl }))
      await recordSystemLog({
        universityId: user.university_id,
        universityName: university?.name,
        actionType: 'UNIVERSITY_LOGO_UPDATED',
        details: 'Updated university logo from dashboard.',
      })
      alert('Logo updated successfully!')
    } catch (error) {
      console.error('Error uploading logo:', error)
      alert('Error uploading logo: ' + error.message)
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleBackgroundUpload = async (e) => {
    const file = e.target.files[0]
    if (!file || !user?.university_id) return

    setUploadingBackground(true)
    try {
      const fileName = `dashboard-bg-${user.university_id}`
      
      console.log('Uploading background to storage:', fileName)
      
      // Upload to storage with upsert to overwrite existing file
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('university-logos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true // Overwrite existing file
        })

      if (uploadError) {
        console.error('Storage upload error:', uploadError)
        throw uploadError
      }

      console.log('Background uploaded successfully:', uploadData)

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('university-logos')
        .getPublicUrl(fileName)

      console.log('Background public URL:', urlData.publicUrl)

      // Update database immediately
      const { error: updateError } = await supabase
        .from('universities')
        .update({ dashboard_bg_url: urlData.publicUrl })
        .eq('id', user.university_id)

      if (updateError) {
        console.error('Database update error:', updateError)
        throw updateError
      }

      // Update local state immediately for instant UI update
      setBackgroundUrl(urlData.publicUrl)
      console.log('Background state updated, UI refreshed')
      await recordSystemLog({
        universityId: user.university_id,
        universityName: university?.name,
        actionType: 'DASHBOARD_BACKGROUND_UPDATED',
        details: 'Updated dashboard background image.',
      })
      
      alert('Dashboard background updated successfully!')
    } catch (error) {
      console.error('Error uploading background:', error)
      alert('Error uploading background: ' + error.message)
    } finally {
      setUploadingBackground(false)
    }
  }

  const handleRemoveBackground = async () => {
    if (!user?.university_id) return

    if (!confirm('Are you sure you want to remove the dashboard background? This action cannot be undone.')) {
      return
    }

    try {
      // Update database to set dashboard_bg_url to null
      const { error: updateError } = await supabase
        .from('universities')
        .update({ dashboard_bg_url: null })
        .eq('id', user.university_id)

      if (updateError) {
        console.error('Database update error:', updateError)
        throw updateError
      }

      // Update local state immediately
      setBackgroundUrl(null)
      await recordSystemLog({
        universityId: user.university_id,
        universityName: university?.name,
        actionType: 'DASHBOARD_BACKGROUND_REMOVED',
        details: 'Removed dashboard background image.',
      })
      
      alert('Dashboard background removed successfully!')
    } catch (error) {
      console.error('Error removing background:', error)
      alert('Error removing background: ' + error.message)
    }
  }

  // Sidebar nav chrome (presentation only — same routes/handlers)
  const navPillActive =
    'w-full flex items-center gap-4 px-5 py-4 text-left text-base font-semibold tracking-wide text-white transition-all rounded-full bg-blue-600 shadow-lg shadow-blue-600/25'
  const navPillInactive =
    'w-full flex items-center gap-4 px-5 py-4 text-left text-base font-medium tracking-wide text-slate-300 transition-all rounded-lg hover:bg-white/10 hover:text-white'
  const navCampusToggleActive =
    'w-full flex items-center justify-between gap-4 px-5 py-4 text-left text-base font-medium tracking-wide text-white transition-all rounded-lg bg-slate-800'
  const navCampusToggleInactive =
    'w-full flex items-center justify-between gap-4 px-5 py-4 text-left text-base font-medium tracking-wide text-slate-300 transition-all rounded-lg hover:bg-white/10 hover:text-white'
  const navSubInactive =
    'w-full flex items-center justify-between gap-3 px-5 py-3 text-left text-sm font-medium tracking-wide text-slate-300 transition-all rounded-lg hover:bg-white/10 hover:text-white'
  const navSubActive =
    'w-full flex items-center justify-between gap-3 px-5 py-3 text-left text-sm font-semibold tracking-wide text-white transition-all rounded-lg bg-slate-800'
  const navManageActive =
    'w-full flex items-center gap-3 px-5 py-3 text-left text-sm font-semibold tracking-wide text-white transition-all rounded-lg bg-blue-600 shadow-lg shadow-blue-600/20'
  const navManageInactive =
    'w-full flex items-center gap-3 px-5 py-3 text-left text-sm font-medium tracking-wide text-slate-300 transition-all rounded-lg hover:bg-white/10 hover:text-white'
  const campusesSectionOpen =
    showCampusesDropdown || activeSection === 'campus-detail' || activeSection === 'campuses'
  const campusesListVisible = showCampusesDropdown || activeSection === 'campus-detail'

  /** TEMP (restore tomorrow): show only main campus in sidebar — no DB change; other campuses still exist. */
  const campusesNavList =
    campuses.filter((c) => c.is_main_campus).length > 0
      ? campuses.filter((c) => c.is_main_campus)
      : campuses

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50/50 to-emerald-100/50 flex items-center justify-center">
        <div className="text-emerald-600 text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex relative">
      {/* Full-Screen Background Image */}
      {backgroundUrl && (
        <>
          <img 
            src={backgroundUrl} 
            alt="Dashboard Background" 
            className="fixed inset-0 w-full h-full object-cover z-0 brightness-75"
          />
          {/* Overlay for contrast - makes image sharp and visible with good contrast */}
          <div className="fixed inset-0 z-0 bg-black/45 backdrop-blur-[2px]"></div>
        </>
      )}
      {!backgroundUrl && (
        <div className="fixed inset-0 z-0 bg-slate-950"></div>
      )}
      
      <div className="relative z-10 flex w-full h-screen overflow-hidden">
      {/* Sidebar - fixed in view; only main content scrolls */}
      <motion.aside
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="w-64 flex-shrink-0 bg-slate-900 border-r border-slate-800/80 flex flex-col shadow-lg sm:w-72"
      >
        {/* Identity */}
        <div className="flex items-center gap-4 p-5 sm:gap-5 sm:p-6 sm:pb-5">
          <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl border-2 border-white/25 bg-white shadow-md sm:h-16 sm:w-16">
            {university?.logo_url ? (
              <img 
                src={university.logo_url} 
                alt="University Logo" 
                className="w-full h-full object-cover"
              />
            ) : (
              <>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                  id="logo-upload-sidebar"
                  disabled={uploadingLogo}
                />
                <label
                  htmlFor="logo-upload-sidebar"
                  className="w-full h-full flex flex-col items-center justify-center bg-slate-700 hover:bg-slate-600 cursor-pointer transition-colors"
                >
                  <Upload className="mb-1 h-8 w-8 text-white" />
                  <span className="px-1 text-center text-xs text-white">Upload</span>
                </label>
              </>
            )}
          </div>
          <div className="flex-1 min-w-0">
            {(() => {
              const name = university?.name || 'University';
              const parts = name.split(' University');
              const mainName = parts[0] || name;
              const suffix = parts.length > 1 ? 'University' : (name.includes('University') ? 'University' : '');
              
              return (
                <>
                  <div className="text-lg font-bold leading-snug tracking-tight text-white sm:text-xl">
                    {mainName}
                  </div>
                  {suffix && (
                    <div className="mt-1 text-xs font-semibold uppercase leading-tight tracking-wider text-slate-400 sm:text-sm">
                      {suffix}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>

        {/* Breathing room + separation before nav (matches earlier sidebar) */}
        <div
          className="mx-4 my-5 border-b border-white/10 sm:mx-5 sm:my-6"
          role="presentation"
        />

        <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-4 pb-4 sm:px-5" aria-label="UFP dashboard">
          {/* Primary */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => navigate('/ufp-dashboard')}
              className={activeSection === 'overview' ? navPillActive : navPillInactive}
              aria-current={location.pathname === '/ufp-dashboard' ? 'page' : undefined}
            >
              <LayoutDashboard className="h-6 w-6 flex-shrink-0" aria-hidden />
              <span>Dashboard</span>
            </button>
          </div>

          {/* Structure — campuses */}
          <div className="space-y-2">
            <p id="ufp-nav-campuses-label" className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Structure
            </p>
            <button
              type="button"
              onClick={toggleCampusesSection}
              className={campusesSectionOpen ? navCampusToggleActive : navCampusToggleInactive}
              aria-expanded={campusesListVisible}
              aria-controls="ufp-nav-campuses-panel"
              id="ufp-nav-campuses-trigger"
            >
              <div className="flex min-w-0 flex-1 items-center gap-4">
                <Building2 className="h-6 w-6 flex-shrink-0" aria-hidden />
                <span className="truncate">Campuses</span>
              </div>
              {showCampusesDropdown ? (
                <ChevronDown className="h-5 w-5 flex-shrink-0 text-slate-400" aria-hidden />
              ) : (
                <ChevronRight className="h-5 w-5 flex-shrink-0 text-slate-400" aria-hidden />
              )}
            </button>

            {campusesListVisible && (
              <div
                id="ufp-nav-campuses-panel"
                role="group"
                aria-labelledby="ufp-nav-campuses-trigger"
                className="mt-1 ml-2 space-y-1 border-l border-slate-700/80 pl-3"
              >
                {campuses.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-slate-500">
                    No campuses yet
                  </div>
                ) : (
                  campusesNavList.map((campus) => {
                    const isActive = location.pathname === `/ufp/campus/${campus.id}`
                    return (
                      <button
                        type="button"
                        key={campus.id}
                        onClick={() => navigate(`/ufp/campus/${campus.id}`)}
                        className={isActive ? navSubActive : navSubInactive}
                        aria-current={isActive ? 'page' : undefined}
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <span className="h-2 w-2 flex-shrink-0 rounded-full bg-slate-500" aria-hidden />
                          <span className="truncate">{campus.name}</span>
                          {campus.is_main_campus && (
                            <span className="flex-shrink-0 rounded-full bg-emerald-500 px-2 py-0.5 text-xs font-semibold text-white">
                              Main
                            </span>
                          )}
                        </div>
                        <ChevronRight className="h-4 w-4 flex-shrink-0 text-slate-500" aria-hidden />
                      </button>
                    )
                  })
                )}
                <button
                  type="button"
                  onClick={() => navigate('/ufp/campuses')}
                  className={
                    activeSection === 'campuses' && !location.pathname.includes('/campus/')
                      ? navManageActive
                      : navManageInactive
                  }
                  aria-current={
                    activeSection === 'campuses' && !location.pathname.includes('/campus/')
                      ? 'page'
                      : undefined
                  }
                >
                  <Plus className="h-5 w-5 flex-shrink-0" aria-hidden />
                  <span>Manage Campuses</span>
                </button>
              </div>
            )}
          </div>

          {/* Operations */}
          <div className="space-y-2">
            <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Operations
            </p>
            <button
              type="button"
              onClick={() => navigate('/ufp/meetings')}
              className={activeSection === 'meetings' ? navPillActive : navPillInactive}
              aria-current={activeSection === 'meetings' ? 'page' : undefined}
            >
              <Calendar className="h-6 w-6 flex-shrink-0" aria-hidden />
              <span>Meetings</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/ufp/reports')}
              className={activeSection === 'reports' ? navPillActive : navPillInactive}
              aria-current={activeSection === 'reports' ? 'page' : undefined}
            >
              <BarChart3 className="h-6 w-6 flex-shrink-0" aria-hidden />
              <span>Reports</span>
            </button>
          </div>

          {/* Governance */}
          <div className="space-y-2">
            <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Governance
            </p>
            <button
              type="button"
              onClick={() => navigate('/ufp/senate')}
              className={location.pathname.includes('/senate') ? navPillActive : navPillInactive}
              aria-current={location.pathname.includes('/senate') ? 'page' : undefined}
            >
              <Gavel className="h-6 w-6 flex-shrink-0" aria-hidden />
              <span>Senate</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/ufp/syndicate')}
              className={location.pathname.includes('/syndicate') ? navPillActive : navPillInactive}
              aria-current={location.pathname.includes('/syndicate') ? 'page' : undefined}
            >
              <Briefcase className="h-6 w-6 flex-shrink-0" aria-hidden />
              <span>Syndicate</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/ufp/boards')}
              className={location.pathname.includes('/boards') ? navPillActive : navPillInactive}
              aria-current={location.pathname.includes('/boards') ? 'page' : undefined}
            >
              <LayoutGrid className="h-6 w-6 flex-shrink-0" aria-hidden />
              <span>Boards</span>
            </button>
          </div>
        </nav>

        <div className="border-t border-white/10 px-4 pb-6 pt-3">
          <button
            type="button"
            onClick={handleLogout}
            className={`${navPillInactive} text-slate-400 hover:text-white`}
          >
            <LogOut className="h-6 w-6 flex-shrink-0" aria-hidden />
            <span>Logout</span>
          </button>
        </div>
      </motion.aside>

      {/* Main Content - only this area scrolls */}
      <main className="flex-1 min-h-0 overflow-y-auto">
        {/* Top Header */}
        <div className="h-14 sm:h-16 bg-white/85 backdrop-blur-md border-b border-slate-200/60 sticky top-0 z-20 flex items-center justify-between gap-4 px-5 sm:px-8 shadow-sm">
          <h1 className="min-w-0 truncate text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
            {university?.name || 'University Dashboard'}
          </h1>
          <div className="flex flex-shrink-0 items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setShowCustomize(!showCustomize)}
              className="rounded-lg border border-slate-200/80 bg-white/90 p-2 text-slate-700 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
              title="University Branding"
              aria-expanded={showCustomize}
            >
              <Palette className="h-5 w-5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm transition-colors hover:border-slate-400 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            >
              <LogOut className="h-4 w-4" aria-hidden />
              <span>Log Out</span>
            </button>
          </div>
        </div>

        {/* Side Drawer - University Branding */}
        {showCustomize && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-40 bg-black/25"
              onClick={() => setShowCustomize(false)}
              aria-hidden
            />
            
            {/* Side Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-50 flex flex-col"
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-slate-200 p-5 sm:p-6">
                <h2 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">University Branding</h2>
                <button
                  type="button"
                  onClick={() => setShowCustomize(false)}
                  className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                  aria-label="Close branding panel"
                >
                  <X className="h-5 w-5" aria-hidden />
                </button>
              </div>
              
              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-6">
                  {/* Logo Upload */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-900 mb-3">
                      University Logo
                    </label>
                    {university?.logo_url && (
                      <div className="mb-3">
                        <img 
                          src={university.logo_url} 
                          alt="Current Logo" 
                          className="w-20 h-20 rounded-full border-2 border-slate-200 object-cover"
                        />
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                      id="logo-upload-customize"
                      disabled={uploadingLogo}
                    />
                    <label
                      htmlFor="logo-upload-customize"
                      className="flex items-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer transition-all text-sm font-medium w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {uploadingLogo ? (
                        <>Uploading...</>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          <span>Update Logo</span>
                        </>
                      )}
                    </label>
                  </div>

                  {/* Background Upload */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-900 mb-3">
                      Dashboard Background
                    </label>
                    {backgroundUrl && (
                      <div className="mb-3">
                        <img 
                          src={backgroundUrl} 
                          alt="Current Background" 
                          className="w-full h-32 rounded-lg border-2 border-slate-200 object-cover"
                        />
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleBackgroundUpload}
                      className="hidden"
                      id="background-upload"
                      disabled={uploadingBackground}
                    />
                    <label
                      htmlFor="background-upload"
                      className="flex items-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg cursor-pointer transition-all text-sm font-medium w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {uploadingBackground ? (
                        <>Uploading...</>
                      ) : (
                        <>
                          <ImageIcon className="w-4 h-4" />
                          <span>Set Background</span>
                        </>
                      )}
                    </label>
                    {backgroundUrl && (
                      <button
                        onClick={handleRemoveBackground}
                        className="mt-3 flex items-center gap-2 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all text-sm font-medium w-full justify-center"
                      >
                        <X className="w-4 h-4" />
                        <span>Remove Background</span>
                      </button>
                    )}
                    <p className="mt-2 text-xs text-slate-500">
                      Recommended: High-resolution landscape image (1920x1080 or larger)
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}

        {/* Main Content Area */}
        <div className="p-5 sm:p-8">
          {activeSection === 'overview' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="w-full space-y-5 sm:space-y-6"
            >
              <section aria-labelledby="ufp-overview-welcome-heading" className="rounded-xl border border-slate-700/40 bg-slate-900/78 px-5 py-4 shadow-lg backdrop-blur-lg sm:rounded-2xl sm:px-6 sm:py-5">
                <div className="max-w-3xl">
                  <h2 id="ufp-overview-welcome-heading" className="text-xl font-bold tracking-tight text-white sm:text-2xl lg:text-3xl">
                    Welcome back, {user?.full_name || 'User'}!
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-white/85 sm:text-base">
                    Manage your university's academic structure and resources
                  </p>
                </div>
              </section>

              <section aria-labelledby="ufp-overview-stats-heading">
                <h3 id="ufp-overview-stats-heading" className="sr-only">
                  Institution snapshot
                </h3>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                {/* Total Campuses */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0 }}
                  onClick={() => navigate('/ufp/campuses')}
                  className="group relative cursor-pointer overflow-hidden rounded-[2rem] border border-white/25 bg-white/92 px-4 py-4 shadow-md backdrop-blur-sm transition-all duration-200 ease-out hover:-translate-y-1 hover:border-blue-200/90 hover:bg-white hover:shadow-[0_22px_50px_-12px_rgba(59,130,246,0.32)] active:translate-y-0 active:shadow-md"
                >
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-1 scale-x-0 bg-gradient-to-r from-blue-400 to-blue-600 opacity-90 transition-transform duration-200 group-hover:scale-x-100" aria-hidden />
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 shadow-sm ring-0 transition-all duration-200 group-hover:scale-110 group-hover:shadow-md group-hover:ring-2 group-hover:ring-blue-400/40">
                      <Building2 className="h-5 w-5 text-blue-600" aria-hidden />
                    </div>
                  </div>
                  <div className="mb-1 text-3xl font-bold tabular-nums text-slate-900">{campusCount}</div>
                  <div className="text-xs font-medium text-slate-500">Total Campuses</div>
                </motion.div>

                {/* Total Faculties — same card chrome as other stats (icon tint only) */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  onClick={() => navigate('/ufp/faculties')}
                  className="group relative cursor-pointer overflow-hidden rounded-[2rem] border border-white/25 bg-white/92 px-4 py-4 shadow-md backdrop-blur-sm transition-all duration-200 ease-out hover:-translate-y-1 hover:border-emerald-200/90 hover:bg-white hover:shadow-[0_22px_50px_-12px_rgba(16,185,129,0.3)] active:translate-y-0 active:shadow-md"
                >
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-1 scale-x-0 bg-gradient-to-r from-emerald-400 to-teal-600 opacity-90 transition-transform duration-200 group-hover:scale-x-100" aria-hidden />
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 shadow-sm ring-0 transition-all duration-200 group-hover:scale-110 group-hover:shadow-md group-hover:ring-2 group-hover:ring-emerald-400/40">
                      <GraduationCap className="h-5 w-5 text-emerald-600" aria-hidden />
                    </div>
                  </div>
                  <div className="mb-1 text-3xl font-bold tabular-nums text-slate-900">{facultyCount}</div>
                  <div className="text-xs font-medium text-slate-500">Total Faculties</div>
                </motion.div>

                {/* Total Departments */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  onClick={() => navigate('/ufp/departments')}
                  className="group relative cursor-pointer overflow-hidden rounded-[2rem] border border-white/25 bg-white/92 px-4 py-4 shadow-md backdrop-blur-sm transition-all duration-200 ease-out hover:-translate-y-1 hover:border-cyan-200/90 hover:bg-white hover:shadow-[0_22px_50px_-12px_rgba(34,211,238,0.28)] active:translate-y-0 active:shadow-md"
                >
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-1 scale-x-0 bg-gradient-to-r from-cyan-400 to-blue-500 opacity-90 transition-transform duration-200 group-hover:scale-x-100" aria-hidden />
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 shadow-sm ring-0 transition-all duration-200 group-hover:scale-110 group-hover:shadow-md group-hover:ring-2 group-hover:ring-cyan-400/40">
                      <Users className="h-5 w-5 text-blue-600" aria-hidden />
                    </div>
                  </div>
                  <div className="mb-1 text-3xl font-bold tabular-nums text-slate-900">{departmentCount}</div>
                  <div className="text-xs font-medium text-slate-500">Total Departments</div>
                </motion.div>

                {/* Total Programs */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  onClick={() => navigate('/ufp/programs')}
                  className="group relative cursor-pointer overflow-hidden rounded-[2rem] border border-white/25 bg-white/92 px-4 py-4 shadow-md backdrop-blur-sm transition-all duration-200 ease-out hover:-translate-y-1 hover:border-purple-200/90 hover:bg-white hover:shadow-[0_22px_50px_-12px_rgba(168,85,247,0.3)] active:translate-y-0 active:shadow-md"
                >
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-1 scale-x-0 bg-gradient-to-r from-purple-400 to-violet-600 opacity-90 transition-transform duration-200 group-hover:scale-x-100" aria-hidden />
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 shadow-sm ring-0 transition-all duration-200 group-hover:scale-110 group-hover:shadow-md group-hover:ring-2 group-hover:ring-purple-400/40">
                      <BookOpen className="h-5 w-5 text-purple-600" aria-hidden />
                    </div>
                  </div>
                  <div className="mb-1 text-3xl font-bold tabular-nums text-slate-900">{programCount}</div>
                  <div className="text-xs font-medium text-slate-500">Total Programs</div>
                </motion.div>

                {/* Total Staff */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                  onClick={() => navigate('/ufp/staff')}
                  className="group relative cursor-pointer overflow-hidden rounded-[2rem] border border-white/25 bg-white/92 px-4 py-4 shadow-md backdrop-blur-sm transition-all duration-200 ease-out hover:-translate-y-1 hover:border-violet-200/90 hover:bg-white hover:shadow-[0_22px_50px_-12px_rgba(139,92,246,0.3)] active:translate-y-0 active:shadow-md"
                >
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-1 scale-x-0 bg-gradient-to-r from-violet-400 to-fuchsia-600 opacity-90 transition-transform duration-200 group-hover:scale-x-100" aria-hidden />
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 shadow-sm ring-0 transition-all duration-200 group-hover:scale-110 group-hover:shadow-md group-hover:ring-2 group-hover:ring-violet-400/40">
                      <UserCheck className="h-5 w-5 text-purple-600" aria-hidden />
                    </div>
                  </div>
                  <div className="mb-1 text-3xl font-bold tabular-nums text-slate-900">{staffCount}</div>
                  <div className="text-xs font-medium text-slate-500">Total Staff</div>
                </motion.div>

                {/* Students Enrolled */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  onClick={() => navigate('/ufp/students')}
                  className="group relative cursor-pointer overflow-hidden rounded-[2rem] border border-white/25 bg-white/92 px-4 py-4 shadow-md backdrop-blur-sm transition-all duration-200 ease-out hover:-translate-y-1 hover:border-amber-200/90 hover:bg-white hover:shadow-[0_22px_50px_-12px_rgba(245,158,11,0.32)] active:translate-y-0 active:shadow-md"
                >
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-1 scale-x-0 bg-gradient-to-r from-amber-400 to-orange-500 opacity-90 transition-transform duration-200 group-hover:scale-x-100" aria-hidden />
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 shadow-sm ring-0 transition-all duration-200 group-hover:scale-110 group-hover:shadow-md group-hover:ring-2 group-hover:ring-amber-400/45">
                      <UsersRound className="h-5 w-5 text-amber-600" aria-hidden />
                    </div>
                  </div>
                  <div className="mb-1 text-3xl font-bold tabular-nums text-slate-900">{studentCount}</div>
                  <div className="text-xs font-medium text-slate-500">Total Students</div>
                </motion.div>
                </div>
              </section>

              <section aria-labelledby="ufp-overview-quick-heading" className="rounded-2xl border border-white/15 bg-slate-900/40 p-5 sm:p-6 backdrop-blur-md">
                <h3 id="ufp-overview-quick-heading" className="text-base font-semibold tracking-tight text-white/95 sm:text-lg">
                  Quick Actions
                </h3>
                <div className="mt-4 flex flex-wrap gap-4">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate('/ufp/campuses')}
                    className="flex items-center gap-2 rounded-full border-2 border-cyan-400/30 bg-gradient-to-r from-cyan-500 to-blue-600 px-8 py-3 font-semibold text-white shadow-lg transition-all hover:from-cyan-600 hover:to-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  >
                    <Building2 className="h-5 w-5 flex-shrink-0" aria-hidden />
                    <span>Add Campus</span>
                  </motion.button>
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate('/ufp/faculties')}
                    className="flex items-center gap-2 rounded-full border-2 border-emerald-400/30 bg-gradient-to-r from-emerald-500 to-teal-600 px-8 py-3 font-semibold text-white shadow-lg transition-all hover:from-emerald-600 hover:to-teal-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  >
                    <Plus className="h-5 w-5 flex-shrink-0" aria-hidden />
                    <span>Add Faculty</span>
                  </motion.button>
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate('/ufp/departments')}
                    className="flex items-center gap-2 rounded-full border-2 border-blue-400/30 bg-blue-600 px-8 py-3 font-semibold text-white shadow-lg transition-all hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  >
                    <Plus className="h-5 w-5 flex-shrink-0" aria-hidden />
                    <span>Add Department</span>
                  </motion.button>
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate('/ufp/programs')}
                    className="flex items-center gap-2 rounded-full border-2 border-purple-400/30 bg-purple-600 px-8 py-3 font-semibold text-white shadow-lg transition-all hover:bg-purple-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  >
                    <Plus className="h-5 w-5 flex-shrink-0" aria-hidden />
                    <span>Add Program</span>
                  </motion.button>
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate('/ufp/staff')}
                    className="flex items-center gap-2 rounded-full border-2 border-amber-400/30 bg-amber-600 px-8 py-3 font-semibold text-white shadow-lg transition-all hover:bg-amber-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  >
                    <Plus className="h-5 w-5 flex-shrink-0" aria-hidden />
                    <span>Add Staff Member</span>
                  </motion.button>
                </div>
              </section>
            </motion.div>
          )}

          {/* Placeholder for other sections */}
          {activeSection !== 'overview' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="w-full max-w-3xl rounded-2xl border border-slate-200/80 bg-white/95 p-8 shadow-md backdrop-blur-sm"
            >
              <h2 className="mb-3 text-2xl font-bold capitalize tracking-tight text-slate-900">
                {activeSection.replace(/([A-Z])/g, ' $1').trim()}
              </h2>
              <p className="leading-relaxed text-slate-600">
                This section is coming soon. You'll be able to manage {activeSection} here.
              </p>
            </motion.div>
          )}
        </div>
      </main>
      </div>
    </div>
  )
}

export default UFPDashboard
