import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Lock, Mail, Eye, EyeOff, User } from 'lucide-react'
import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden">
      {/* Background - Same as Hero */}
      <div className="absolute inset-0 bg-slate-950"></div>
      
      {/* Enhanced geometric grid pattern */}
      <div className="absolute inset-0 opacity-[0.03]">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(rgba(16, 185, 129, 0.15) 1px, transparent 1px),
            linear-gradient(90deg, rgba(16, 185, 129, 0.15) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }}></div>
      </div>
      
      {/* Diagonal pattern overlay */}
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: `repeating-linear-gradient(
          45deg,
          transparent,
          transparent 10px,
          rgba(16, 185, 129, 0.1) 10px,
          rgba(16, 185, 129, 0.1) 20px
        )`
      }}></div>

      {/* Back to Home Button */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="absolute top-6 left-6 z-50"
      >
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors duration-200 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-medium">Back to Home</span>
        </Link>
      </motion.div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="w-full max-w-md"
        >
          {/* Login Card */}
          <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl p-8 shadow-2xl"
            style={{
              boxShadow: '0 0 20px rgba(16, 185, 129, 0.2)'
            }}
          >
            {/* Sindh Government Logo */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex justify-center mb-8"
            >
              <img 
                src="/sindh-logo.jpg.jpg" 
                alt="Sindh Government Logo" 
                className="h-20 w-auto object-contain"
              />
            </motion.div>

            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-3xl font-bold text-white text-center mb-2"
            >
              Authorized Sign In
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="text-gray-400 text-center text-sm mb-8"
            >
              Access your role-based dashboard for the Sindh Universities & Boards portal.
            </motion.p>

            {/* Login Form */}
            <motion.form
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="space-y-6"
              onSubmit={async (e) => {
                e.preventDefault()
                setLoading(true)
                setError('')

                try {
                  // Clear any existing partial/invalid sessions first
                  const { data: { session: existingSession } } = await supabase.auth.getSession()
                  if (existingSession) {
                    // Check if this session has a valid profile
                    const { data: profile } = await supabase
                      .from('profiles')
                      .select('*')
                      .eq('id', existingSession.user.id)
                      .single()
                    
                    // If profile doesn't exist or is invalid, sign out
                    if (!profile) {
                      await supabase.auth.signOut()
                    }
                  }

                  // Sign in with Supabase Auth (username is actually email)
                  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                    email: username,
                    password: password
                  })

                  if (authError) throw authError

                  if (authData.user) {
                    // Fetch user profile to get role and is_setup_complete
                    const { data: profile, error: profileError } = await supabase
                      .from('profiles')
                      .select('role, is_setup_complete')
                      .eq('id', authData.user.id)
                      .single()

                    if (profileError) throw profileError

                    // Set flag to show splash screen
                    sessionStorage.setItem('showSplashScreen', 'true')
                    
                    // Redirect based on role and setup completion status
                    if (profile.role === 'U&B_ADMIN') {
                      navigate('/ub-admin', { replace: true })
                    } else if (profile.role === 'UFP') {
                      // Check if setup is complete - enforce setup wizard flow
                      if (profile.is_setup_complete) {
                        navigate('/ufp-dashboard', { replace: true })
                      } else {
                        navigate('/ufp-setup', { replace: true })
                      }
                    } else if (profile.role === 'TSA') {
                      navigate('/tsa-dashboard', { replace: true })
                    } else {
                      navigate('/', { replace: true })
                    }
                  }
                } catch (err) {
                  console.error('Login error:', err)
                  setError(err.message || 'Invalid credentials. Please try again.')
                } finally {
                  setLoading(false)
                }
              }}
            >
              {/* Username Input */}
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
                  Username
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all duration-200"
                    style={{
                      boxShadow: username ? '0 0 20px rgba(16, 185, 129, 0.2)' : 'none'
                    }}
                    placeholder="Enter your email address"
                    required
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-12 py-3 bg-slate-900/50 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all duration-200"
                    style={{
                      boxShadow: password ? '0 0 20px rgba(16, 185, 129, 0.2)' : 'none'
                    }}
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: loading ? 1 : 1.02 }}
                whileTap={{ scale: loading ? 1 : 0.98 }}
                className="w-full bg-emerald-800 hover:bg-emerald-700 disabled:bg-emerald-800/50 disabled:cursor-not-allowed text-white py-3 rounded-lg font-semibold transition-all duration-300 relative overflow-hidden"
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
                <span className="relative z-10">{loading ? 'Signing in...' : 'Access Portal'}</span>
              </motion.button>
            </motion.form>

            {/* Security Notice */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="mt-6 text-center"
            >
              <p className="text-xs text-gray-500">
                This is a restricted access portal for managing university data and departmental coordination. Unauthorized access is prohibited.
              </p>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default Login
