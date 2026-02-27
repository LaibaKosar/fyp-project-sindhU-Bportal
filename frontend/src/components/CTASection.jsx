import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

function CTASection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })
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

  return (
    <section ref={ref} className="relative py-16 px-4 sm:px-6 lg:px-8 bg-slate-950">
      <div className="max-w-4xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.8 }}
          className="space-y-8"
        >
          {/* Title */}
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 tracking-tight" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            Access the Unified <span className="text-emerald-400">Information System</span>
          </h2>
          
          {/* Description */}
          <p className="text-sm text-gray-400 max-w-2xl mx-auto">
            Authorized departmental personnel can securely access comprehensive university data, analytics, and administrative tools through our protected portal.
          </p>

          {/* CTA Button - Always shows login, regardless of session */}
          <motion.button
            onClick={handleLoginClick}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="relative bg-emerald-800 hover:bg-emerald-700 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-colors duration-200 shadow-2xl shadow-emerald-800/30"
          >
            {/* Pulse Animation */}
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
                opacity: [0.5, 0, 0.5],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="absolute inset-0 rounded-lg bg-emerald-600 blur-xl -z-10"
            />
            Proceed to Secure Departmental Login
          </motion.button>
        </motion.div>
      </div>
    </section>
  )
}

export default CTASection
