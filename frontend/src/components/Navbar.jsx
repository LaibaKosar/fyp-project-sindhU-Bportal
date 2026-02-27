import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { LogOut } from 'lucide-react'

function Navbar() {
  const navigate = useNavigate()
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userRole, setUserRole] = useState(null)

  useEffect(() => {
    checkSession()
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkSession()
    })

    return () => subscription.unsubscribe()
  }, [])

  const checkSession = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()
      
      setIsLoggedIn(!!session)
      setUserRole(profile?.role || null)
    } else {
      setIsLoggedIn(false)
      setUserRole(null)
    }
  }

  const handleLoginClick = (e) => {
    e.preventDefault()
    // Always go to login page - let the login page handle redirects
    navigate('/login')
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    // Refresh the page to clear any cached state
    window.location.href = '/'
  }

  const handleGoToDashboard = () => {
    if (userRole === 'U&B_ADMIN') {
      navigate('/ub-admin')
    } else {
      navigate('/login')
    }
  }

  const handleSmoothScroll = (e, targetId) => {
    e.preventDefault()
    const element = document.getElementById(targetId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="sticky top-0 z-50 w-full"
    >
      <div className="bg-white/5 backdrop-blur-xl relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Left Side - Logo and Title */}
            <div className="flex items-center gap-4 flex-shrink-0">
              {/* Sindh Government Logo */}
              <img 
                src="/sindh-logo.jpg.jpg" 
                alt="Sindh Govt Logo" 
                className="h-12 w-auto object-contain"
              />
              
              {/* Title */}
              <div className="hidden sm:block">
                <h2 className="text-white font-semibold text-base lg:text-lg">
                  Universities & Boards Department
                </h2>
                <p className="text-gray-400 text-xs lg:text-sm">
                  Government of Sindh
                </p>
              </div>
            </div>

            {/* Center - Navigation Links */}
            <div className="hidden md:flex items-center justify-center flex-1 gap-8">
              <a
                href="#home"
                onClick={(e) => handleSmoothScroll(e, 'home')}
                className="text-gray-400 hover:text-white transition-colors duration-200 text-sm font-medium"
              >
                Home
              </a>
              <a
                href="#about"
                onClick={(e) => handleSmoothScroll(e, 'about')}
                className="text-gray-400 hover:text-white transition-colors duration-200 text-sm font-medium"
              >
                About
              </a>
              <a
                href="#statistics"
                onClick={(e) => handleSmoothScroll(e, 'statistics')}
                className="text-gray-400 hover:text-white transition-colors duration-200 text-sm font-medium"
              >
                Statistics
              </a>
              <a
                href="#institutions"
                onClick={(e) => handleSmoothScroll(e, 'institutions')}
                className="text-gray-400 hover:text-white transition-colors duration-200 text-sm font-medium"
              >
                Institutions
              </a>
              <a
                href="#updates"
                onClick={(e) => handleSmoothScroll(e, 'updates')}
                className="text-gray-400 hover:text-white transition-colors duration-200 text-sm font-medium"
              >
                Updates
              </a>
            </div>

            {/* Right Side - Login/Logout Buttons */}
            <div className="flex items-center gap-3 flex-shrink-0">
              {/* Always show Login button */}
              <motion.button
                onClick={handleLoginClick}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="relative bg-emerald-800 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 overflow-hidden"
                style={{
                  boxShadow: '0 4px 14px 0 rgba(22, 101, 52, 0.4)'
                }}
              >
                {/* Pulse Animation Glow */}
                <motion.span
                  animate={{
                    opacity: [0.3, 0.6, 0.3],
                  }}
                  transition={{
                    duration: 2.5,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="absolute inset-0 bg-emerald-500 rounded-lg blur-sm"
                />
                <span className="relative z-10">Departmental Login</span>
              </motion.button>

              {/* Show Dashboard and Logout buttons when logged in */}
              {isLoggedIn && (
                <>
                  <motion.button
                    onClick={handleGoToDashboard}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 border border-white/10"
                  >
                    Go to Dashboard
                  </motion.button>
                  <motion.button
                    onClick={handleLogout}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center gap-2 bg-red-900/30 hover:bg-red-900/50 text-red-300 hover:text-red-200 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 border border-red-500/30"
                    title="Logout"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </motion.button>
                </>
              )}

              {/* Mobile Menu Button */}
              <button className="md:hidden text-gray-400 hover:text-white">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M4 6h16M4 12h16M4 18h16"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>
        
        {/* Accent Line - Emerald Gradient at the very bottom */}
        <div className="h-[1px] bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent"></div>
      </div>
    </motion.nav>
  )
}

export default Navbar
