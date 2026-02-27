import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabaseClient'
import { useNavigate, useLocation } from 'react-router-dom'
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
  School,
  Briefcase,
  Settings,
  Upload,
  Image as ImageIcon,
  X,
  Palette,
  ChevronDown,
  ChevronRight,
  FileText,
  Calendar,
  BarChart3,
  Gavel,
  Scale,
  LayoutGrid,
  ClipboardList
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
      
      alert('Dashboard background removed successfully!')
    } catch (error) {
      console.error('Error removing background:', error)
      alert('Error removing background: ' + error.message)
    }
  }

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
          <div className="fixed inset-0 z-0 bg-black/40 backdrop-blur-[2px]"></div>
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
        className="w-72 flex-shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col shadow-lg"
      >
        {/* Logo Section */}
        <div className="flex items-center gap-5 p-8">
          <div className="w-16 h-16 rounded-xl border-2 border-white overflow-hidden bg-white relative shadow-md flex-shrink-0">
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
                  <Upload className="w-8 h-8 text-white mb-1" />
                  <span className="text-xs text-white text-center px-1">Upload</span>
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
                  <div className="text-xl font-bold text-white tracking-tight leading-tight">
                    {mainName}
                  </div>
                  {suffix && (
                    <div className="text-sm font-semibold text-slate-400 uppercase tracking-[0.2em] mt-1 leading-tight">
                      {suffix}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>

        {/* Divider */}
        <div className="border-b border-white/10 my-5 mx-5"></div>

        {/* Navigation */}
        <nav className="flex-1 space-y-2 px-5 overflow-y-auto">
          {/* 1. Dashboard */}
          <button
            onClick={() => navigate('/ufp-dashboard')}
            className={`w-full flex items-center gap-4 px-5 py-4 transition-all text-base tracking-wide font-medium ${
              activeSection === 'overview'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 rounded-full'
                : 'text-slate-300 hover:bg-white/10 hover:text-white rounded-lg'
            }`}
          >
            <LayoutDashboard className="w-6 h-6" />
            <span>Dashboard</span>
          </button>

          {/* Divider */}
          <div className="border-b border-white/10 my-3"></div>

          {/* 2. Campuses Section */}
          <div className="space-y-1">
            <button
              onClick={toggleCampusesSection}
              className={`w-full flex items-center justify-between px-5 py-4 transition-all text-base tracking-wide font-medium ${
                showCampusesDropdown || activeSection === 'campus-detail' || activeSection === 'campuses'
                  ? 'bg-slate-800 text-white rounded-lg'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white rounded-lg'
              }`}
            >
              <div className="flex items-center gap-4">
                <Building2 className="w-6 h-6" />
                <span>Campuses</span>
              </div>
              {showCampusesDropdown ? (
                <ChevronDown className="w-5 h-5" />
              ) : (
                <ChevronRight className="w-5 h-5" />
              )}
            </button>

            {/* Campus List */}
            {(showCampusesDropdown || activeSection === 'campus-detail') && (
              <div className="space-y-1 ml-4 border-l-2 border-slate-700 pl-2">
                {campuses.length === 0 ? (
                  <div className="px-5 py-2 text-sm text-slate-400">
                    No campuses yet
                  </div>
                ) : (
                  // TEMPORARY FOCUS MODE for supervisor demo:
                  // Original mapping (restore after 1 PM):
                  //
                  // campuses.map((campus) => {
                  //   const isActive = location.pathname === `/ufp/campus/${campus.id}`
                  //   return (
                  //     <button
                  //       key={campus.id}
                  //       onClick={() => navigate(`/ufp/campus/${campus.id}`)}
                  //       className={`w-full flex items-center justify-between px-5 py-3 transition-all text-sm tracking-wide font-medium rounded-lg ${
                  //         isActive
                  //           ? 'bg-slate-800 text-white'
                  //           : 'text-slate-300 hover:bg-white/10 hover:text-white'
                  //       }`}
                  //     >
                  //       <div className="flex items-center gap-3">
                  //         <div className="w-2 h-2 rounded-full bg-slate-500"></div>
                  //         <span className="truncate">{campus.name}</span>
                  //         {campus.is_main_campus && (
                  //           <span className="px-2 py-0.5 bg-emerald-500 text-white text-xs rounded-full">
                  //             Main
                  //           </span>
                  //         )}
                  //       </div>
                  //       <ChevronRight className="w-4 h-4" />
                  //     </button>
                  //   )
                  // })
                  //
                  // Focus Mode: only show the Sukkur IBA main campus in this list.
                  campuses
                    .filter((campus) => {
                      const name = (campus.name || '').toLowerCase()
                      return name.includes('sukkur iba')
                    })
                    .map((campus) => {
                      const isActive = location.pathname === `/ufp/campus/${campus.id}`
                      return (
                        <button
                          key={campus.id}
                          onClick={() => navigate(`/ufp/campus/${campus.id}`)}
                          className={`w-full flex items-center justify-between px-5 py-3 transition-all text-sm tracking-wide font-medium rounded-lg ${
                            isActive
                              ? 'bg-slate-800 text-white'
                              : 'text-slate-300 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-slate-500"></div>
                            <span className="truncate">{campus.name}</span>
                            {campus.is_main_campus && (
                              <span className="px-2 py-0.5 bg-emerald-500 text-white text-xs rounded-full">
                                Main
                              </span>
                            )}
                          </div>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      )
                    })
                )}
                {/* Manage Campuses Button (inside dropdown) */}
                <button
                  onClick={() => navigate('/ufp/campuses')}
                  className={`w-full flex items-center gap-3 px-5 py-3 transition-all text-sm tracking-wide font-medium rounded-lg ${
                    activeSection === 'campuses' && !location.pathname.includes('/campus/')
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                      : 'text-slate-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  <span>Manage Campuses</span>
                </button>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="border-b border-white/10 my-3"></div>

          {/* 3. Meetings */}
          <button
            onClick={() => navigate('/ufp/meetings')}
            className={`w-full flex items-center gap-4 px-5 py-4 transition-all text-base tracking-wide font-medium ${
              activeSection === 'meetings'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 rounded-full'
                : 'text-slate-300 hover:bg-white/10 hover:text-white rounded-lg'
            }`}
          >
            <Calendar className="w-6 h-6" />
            <span>Meetings</span>
          </button>

          {/* 4. Reports */}
          <button
            onClick={() => navigate('/ufp/reports')}
            className={`w-full flex items-center gap-4 px-5 py-4 transition-all text-base tracking-wide font-medium ${
              activeSection === 'reports'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 rounded-full'
                : 'text-slate-300 hover:bg-white/10 hover:text-white rounded-lg'
            }`}
          >
            <BarChart3 className="w-6 h-6" />
            <span>Reports</span>
          </button>

          {/* Divider */}
          <div className="border-b border-white/10 my-3"></div>

          {/* 5. Governance Section */}
          <div className="space-y-1">
            <div className="px-5 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Governance
            </div>
            <button
              onClick={() => navigate('/ufp/senate')}
              className={`w-full flex items-center gap-4 px-5 py-4 transition-all text-base tracking-wide font-medium ${
                location.pathname.includes('/senate')
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 rounded-full'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white rounded-lg'
              }`}
            >
              <Gavel className="w-6 h-6" />
              <span>Senate</span>
            </button>
            <button
              onClick={() => navigate('/ufp/syndicate')}
              className={`w-full flex items-center gap-4 px-5 py-4 transition-all text-base tracking-wide font-medium ${
                location.pathname.includes('/syndicate')
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 rounded-full'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white rounded-lg'
              }`}
            >
              <Briefcase className="w-6 h-6" />
              <span>Syndicate</span>
            </button>
            <button
              onClick={() => navigate('/ufp/boards')}
              className={`w-full flex items-center gap-4 px-5 py-4 transition-all text-base tracking-wide font-medium ${
                location.pathname.includes('/boards')
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 rounded-full'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white rounded-lg'
              }`}
            >
              <LayoutGrid className="w-6 h-6" />
              <span>Boards</span>
            </button>
          </div>
        </nav>

        {/* Logout */}
        <div className="px-5 pb-8">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-4 px-5 py-4 rounded-lg text-slate-300 hover:bg-white/10 hover:text-white transition-all text-base tracking-wide font-medium"
          >
            <LogOut className="w-6 h-6" />
            <span>Logout</span>
          </button>
        </div>
      </motion.aside>

      {/* Main Content - only this area scrolls */}
      <main className="flex-1 min-h-0 overflow-y-auto">
        {/* Top Header */}
        <div className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200/50 sticky top-0 z-20 flex items-center justify-between px-8 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">
            {university?.name || 'University Dashboard'}
          </h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCustomize(!showCustomize)}
              className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all"
              title="University Branding"
            >
              <Palette className="w-5 h-5" />
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all text-sm font-medium shadow-md hover:shadow-lg"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out</span>
            </button>
          </div>
        </div>

        {/* Side Drawer - University Branding */}
        {showCustomize && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black/20 z-40"
              onClick={() => setShowCustomize(false)}
            ></div>
            
            {/* Side Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-50 flex flex-col"
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between p-6 border-b border-slate-200">
                <h2 className="text-xl font-bold text-slate-900">University Branding</h2>
                <button
                  onClick={() => setShowCustomize(false)}
                  className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="w-5 h-5" />
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
        <div className="p-8">
          {activeSection === 'overview' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-8"
            >
              {/* Welcome Section - High Contrast Dark Glass */}
              <div className="bg-slate-900/75 backdrop-blur-lg border border-slate-700/50 rounded-3xl p-8">
                <h2 className="text-4xl font-bold text-white mb-2">
                  Welcome back, {user?.full_name || 'User'}!
                </h2>
                <p className="text-white/90 text-lg">
                  Manage your university's academic structure and resources
                </p>
              </div>

              {/* Stat Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
                {/* Total Campuses */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0 }}
                  onClick={() => navigate('/ufp/campuses')}
                  className="bg-white/90 rounded-[2rem] px-3 py-4 shadow-lg shadow-blue-500/10 border border-white/20 hover:scale-105 transition-transform cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-blue-600" />
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-slate-900 mb-1">{campusCount}</div>
                  <div className="text-xs text-slate-500">Total Campuses</div>
                </motion.div>

                {/* Total Faculties */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  onClick={() => navigate('/ufp/faculties')}
                  className={`rounded-[2rem] px-3 py-4 shadow-lg border hover:scale-105 transition-transform cursor-pointer ${
                    facultyCount > 0
                      ? 'bg-emerald-600 border-emerald-500/20 shadow-emerald-500/20'
                      : 'bg-white/90 border-white/20 shadow-emerald-500/10'
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      facultyCount > 0
                        ? 'bg-white/20'
                        : 'bg-emerald-100'
                    }`}>
                      <GraduationCap className={`w-5 h-5 ${
                        facultyCount > 0
                          ? 'text-white'
                          : 'text-emerald-600'
                      }`} />
                    </div>
                  </div>
                  <div className={`text-3xl font-bold mb-1 ${
                    facultyCount > 0
                      ? 'text-white'
                      : 'text-slate-900'
                  }`}>
                    {facultyCount}
                  </div>
                  <div className={`text-xs ${
                    facultyCount > 0
                      ? 'text-white/90'
                      : 'text-slate-500'
                  }`}>
                    Total Faculties
                  </div>
                </motion.div>

                {/* Total Departments */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  onClick={() => navigate('/ufp/departments')}
                  className="bg-white/90 rounded-[2rem] px-3 py-4 shadow-lg shadow-blue-500/10 border border-white/20 hover:scale-105 transition-transform cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-600" />
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-slate-900 mb-1">{departmentCount}</div>
                  <div className="text-xs text-slate-500">Total Departments</div>
                </motion.div>

                {/* Total Programs */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  onClick={() => navigate('/ufp/programs')}
                  className="bg-white/90 rounded-[2rem] px-3 py-4 shadow-lg shadow-purple-500/10 border border-white/20 hover:scale-105 transition-transform cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-purple-600" />
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-slate-900 mb-1">{programCount}</div>
                  <div className="text-xs text-slate-500">Total Programs</div>
                </motion.div>

                {/* Total Staff */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                  onClick={() => navigate('/ufp/staff')}
                  className="bg-white/90 rounded-[2rem] px-3 py-4 shadow-lg shadow-purple-500/10 border border-white/20 hover:scale-105 transition-transform cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                      <UserCheck className="w-5 h-5 text-purple-600" />
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-slate-900 mb-1">{staffCount}</div>
                  <div className="text-xs text-slate-500">Total Staff</div>
                </motion.div>

                {/* Students Enrolled */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  onClick={() => navigate('/ufp/students')}
                  className="bg-white/90 rounded-[2rem] px-3 py-4 shadow-lg shadow-amber-500/10 border border-white/20 hover:scale-105 transition-transform cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                      <UsersRound className="w-5 h-5 text-amber-600" />
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-slate-900 mb-1">{studentCount}</div>
                  <div className="text-xs text-slate-500">Total Students</div>
                </motion.div>
              </div>

              {/* Quick Actions */}
              <div>
                <div className="mb-4 inline-block">
                  <h3 className="text-xl font-bold text-white px-4 py-2 bg-slate-900/80 backdrop-blur-md rounded-lg border border-white/30 shadow-lg">
                    Quick Actions
                  </h3>
                </div>
                <div className="flex flex-wrap gap-4">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate('/ufp/campuses')}
                    className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white rounded-full font-semibold transition-all shadow-lg border-2 border-cyan-400/30"
                  >
                    <Building2 className="w-5 h-5" />
                    <span>Add Campus</span>
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate('/ufp/faculties')}
                    className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-full font-semibold transition-all shadow-lg border-2 border-emerald-400/30"
                  >
                    <Plus className="w-5 h-5" />
                    <span>Add Faculty</span>
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate('/ufp/departments')}
                    className="flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-semibold transition-all shadow-lg border-2 border-blue-400/30"
                  >
                    <Plus className="w-5 h-5" />
                    <span>Add Department</span>
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate('/ufp/programs')}
                    className="flex items-center gap-2 px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-full font-semibold transition-all shadow-lg border-2 border-purple-400/30"
                  >
                    <Plus className="w-5 h-5" />
                    <span>Add Program</span>
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate('/ufp/staff')}
                    className="flex items-center gap-2 px-8 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-full font-semibold transition-all shadow-lg border-2 border-amber-400/30"
                  >
                    <Plus className="w-5 h-5" />
                    <span>Add Staff Member</span>
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Placeholder for other sections */}
          {activeSection !== 'overview' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-white rounded-xl p-8 shadow-md"
            >
              <h2 className="text-2xl font-bold text-slate-900 mb-4 capitalize">
                {activeSection.replace(/([A-Z])/g, ' $1').trim()}
              </h2>
              <p className="text-slate-600">
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
