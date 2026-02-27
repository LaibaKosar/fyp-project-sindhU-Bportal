import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { supabase } from './lib/supabaseClient'
import LandingPage from './pages/LandingPage'
import Login from './pages/Login'
import UBAdminDashboard from './pages/UBAdminDashboard'
import UFPSetupWizard from './pages/UFPSetupWizard'
import UFPDashboard from './pages/UFPDashboard'
import FacultyManagement from './pages/FacultyManagement'
import CampusManagement from './pages/CampusManagement'
import CampusLandingView from './pages/CampusLandingView'
import CampusDetailView from './pages/CampusDetailView'
import FacultyDetailView from './pages/FacultyDetailView'
import DepartmentDetailView from './pages/DepartmentDetailView'
import DepartmentManagement from './pages/DepartmentManagement'
import StaffManagement from './pages/StaffManagement'
import ProgramManagement from './pages/ProgramManagement'
import StudentEnrollment from './pages/StudentEnrollment'
import CommitteeManagement from './pages/CommitteeManagement'
import MeetingManagement from './pages/MeetingManagement'
import ReportArchive from './pages/ReportArchive'
import BoardManagement from './pages/BoardManagement'
import InstitutionalIntelligence from './pages/InstitutionalIntelligence'
import TSADashboard from './pages/TSADashboard'
import AdminLayout from './components/AdminLayout'
import LoadingScreen from './components/LoadingScreen'

// Protected Route Component
function ProtectedRoute({ children, requiredRole }) {
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const [redirectTo, setRedirectTo] = useState(null)

  useEffect(() => {
    let mounted = true;
    
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        if (mounted) {
          setAuthorized(false)
          setLoading(false)
        }
        return
      }

      // Fresh query to check role/setup status without polluting global filters
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, is_setup_complete')
        .eq('id', session.user.id)
        .maybeSingle()

      if (!mounted) return;

      if (profileError || !profile) {
        setAuthorized(false)
        setLoading(false)
        return
      }

      // Check role authorization
      if (requiredRole && profile.role !== requiredRole) {
        setAuthorized(false)
        setLoading(false)
        return
      }

      // TSA Bypass: Admin is always authorized for their dashboard
      if (profile.role === 'TSA') {
        setAuthorized(true)
        setRedirectTo(null)
        setLoading(false)
        return
      }

      // UFP Setup Flow Enforcement
      if (profile.role === 'UFP') {
        const currentPath = window.location.pathname
        if (!profile.is_setup_complete) {
          if (currentPath === '/ufp-setup') {
            setAuthorized(true)
          } else {
            setAuthorized(false)
            setRedirectTo('/ufp-setup')
          }
        } else {
          if (currentPath === '/ufp-setup') {
            setAuthorized(false)
            setRedirectTo('/ufp-dashboard')
          } else {
            setAuthorized(true)
          }
        }
      } else {
        setAuthorized(true)
      }
      
      setLoading(false)
    }

    checkAuth()
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        checkAuth()
      } else if (event === 'SIGNED_OUT') {
        if (mounted) {
          setAuthorized(false)
          setLoading(false)
        }
      }
    })

    return () => {
      mounted = false;
      subscription.unsubscribe()
    }
  }, [requiredRole]) // dependency is now stable

  if (loading) return <LoadingScreen />
  if (redirectTo) return <Navigate to={redirectTo} replace />
  return authorized ? children : <Navigate to="/login" replace />
}

// Route Guard for Login
function LoginRoute() {
  const [loading, setLoading] = useState(true)
  const [shouldRedirect, setShouldRedirect] = useState(null)

  useEffect(() => {
    let mounted = true;
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session && mounted) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, is_setup_complete')
          .eq('id', session.user.id)
          .maybeSingle()

        if (profile?.role === 'TSA') setShouldRedirect('/tsa-dashboard')
        else if (profile?.role === 'U&B_ADMIN') setShouldRedirect('/ub-admin')
        else if (profile?.role === 'UFP') {
          setShouldRedirect(profile.is_setup_complete ? '/ufp-dashboard' : '/ufp-setup')
        }
      }
      if (mounted) setLoading(false)
    }
    checkAuth()
    return () => { mounted = false }
  }, [])

  if (loading) return <LoadingScreen />
  return shouldRedirect ? <Navigate to={shouldRedirect} replace /> : <Login />
}

function AppContent() {
  const location = useLocation()
  const [isRedirecting, setIsRedirecting] = useState(false)

  useEffect(() => {
    const shouldShowSplash = sessionStorage.getItem('showSplashScreen') === 'true'
    const dashboardRoutes = ['/ub-admin', '/ufp-dashboard', '/ufp-setup', '/tsa-dashboard']
    const isDashboard = dashboardRoutes.some(route => location.pathname.startsWith(route))

    if (shouldShowSplash && isDashboard) {
      sessionStorage.removeItem('showSplashScreen')
      setIsRedirecting(true)
      const timer = setTimeout(() => setIsRedirecting(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [location.pathname])

  return (
    <>
      <AnimatePresence mode="wait">
        {isRedirecting && <LoadingScreen key="loading-screen" />}
      </AnimatePresence>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginRoute />} />
        <Route path="/tsa-dashboard" element={<ProtectedRoute requiredRole="TSA"><TSADashboard /></ProtectedRoute>} />
        <Route element={<ProtectedRoute requiredRole="U&B_ADMIN"><AdminLayout /></ProtectedRoute>}>
          <Route path="/ub-admin" element={<UBAdminDashboard />} />
          <Route path="/admin/intelligence-hub" element={<InstitutionalIntelligence />} />
        </Route>
        <Route path="/ufp-setup" element={<ProtectedRoute requiredRole="UFP"><UFPSetupWizard /></ProtectedRoute>} />
        <Route path="/ufp-dashboard" element={<ProtectedRoute requiredRole="UFP"><UFPDashboard /></ProtectedRoute>} />
        <Route path="/ufp/faculties" element={<ProtectedRoute requiredRole="UFP"><FacultyManagement /></ProtectedRoute>} />
        <Route path="/ufp/departments" element={<ProtectedRoute requiredRole="UFP"><DepartmentManagement /></ProtectedRoute>} />
        <Route path="/ufp/campuses" element={<ProtectedRoute requiredRole="UFP"><CampusManagement /></ProtectedRoute>} />
        <Route path="/ufp/campus/:id/faculties" element={<ProtectedRoute requiredRole="UFP"><CampusDetailView /></ProtectedRoute>} />
        <Route path="/ufp/campus/:id" element={<ProtectedRoute requiredRole="UFP"><CampusLandingView /></ProtectedRoute>} />
        <Route path="/ufp/campus/:id/faculty/:facultyId" element={<ProtectedRoute requiredRole="UFP"><FacultyDetailView /></ProtectedRoute>} />
        <Route path="/ufp/campus/:id/faculty/:facultyId/department/:deptId" element={<ProtectedRoute requiredRole="UFP"><DepartmentDetailView /></ProtectedRoute>} />
        <Route path="/ufp/staff" element={<ProtectedRoute requiredRole="UFP"><StaffManagement /></ProtectedRoute>} />
        <Route path="/ufp/programs" element={<ProtectedRoute requiredRole="UFP"><ProgramManagement /></ProtectedRoute>} />
        <Route path="/ufp/students" element={<ProtectedRoute requiredRole="UFP"><StudentEnrollment /></ProtectedRoute>} />
        <Route path="/ufp/senate" element={<ProtectedRoute requiredRole="UFP"><CommitteeManagement /></ProtectedRoute>} />
        <Route path="/ufp/syndicate" element={<ProtectedRoute requiredRole="UFP"><CommitteeManagement /></ProtectedRoute>} />
        <Route path="/ufp/meetings" element={<ProtectedRoute requiredRole="UFP"><MeetingManagement /></ProtectedRoute>} />
        <Route path="/ufp/reports" element={<ProtectedRoute requiredRole="UFP"><ReportArchive /></ProtectedRoute>} />
        <Route path="/ufp/boards" element={<ProtectedRoute requiredRole="UFP"><BoardManagement /></ProtectedRoute>} />
      </Routes>
    </>
  )
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  )
}

export default App