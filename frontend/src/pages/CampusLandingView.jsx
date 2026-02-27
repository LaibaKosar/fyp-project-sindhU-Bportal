import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabaseClient'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Building2, Loader2, Plus, List } from 'lucide-react'
import Breadcrumbs from '../components/Breadcrumbs'

function CampusLandingView() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [loading, setLoading] = useState(true)
  const [campus, setCampus] = useState(null)
  const [user, setUser] = useState(null)

  useEffect(() => {
    loadUserData()
  }, [])

  useEffect(() => {
    if (!user?.university_id || !id) return
    let cancelled = false
    setLoading(true)
    const run = async () => {
      try {
        await fetchCampusDetails()
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [user, id])

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
      if (!id) setLoading(false)
    } catch (e) {
      console.error(e)
      navigate('/login')
    }
  }

  const fetchCampusDetails = async () => {
    if (!id || !user?.university_id) return
    try {
      const { data, error } = await supabase
        .from('campuses')
        .select('*')
        .eq('id', id)
        .eq('university_id', user.university_id)
        .single()
      if (error) {
        navigate('/ufp/campuses')
        return
      }
      setCampus(data)
    } catch (e) {
      console.error(e)
      navigate('/ufp/campuses')
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

  if (!campus) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-800/10 to-[#f8fafc] flex items-center justify-center">
        <div className="text-center">
          <Building2 className="w-16 h-16 mx-auto mb-4 text-slate-400" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Campus Not Found</h2>
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
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="bg-white/5 backdrop-blur-md border-b border-white/10 p-8 mb-8 rounded-t-3xl"
      >
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-full font-semibold transition-all shadow-lg shadow-cyan-400/30 mb-6 group"
        >
          <ArrowLeft className="w-5 h-5 text-white group-hover:-translate-x-1 transition-transform" />
          <span className="text-white">Back</span>
        </motion.button>
        <Breadcrumbs
          items={[
            { label: 'Dashboard', path: '/ufp-dashboard' },
            { label: campus.name }
          ]}
          className="text-white/80 mb-2"
        />
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">{campus.name}</h2>
          <div className="flex items-center gap-4 text-white/90">
            <span className="text-sm">{campus.city}</span>
            {campus.is_main_campus && (
              <span className="px-3 py-1 bg-emerald-500 text-white text-xs font-semibold rounded-full">
                Main Campus
              </span>
            )}
            {campus.code && (
              <span className="px-3 py-1 bg-white/10 text-white text-xs font-mono rounded-full">
                {campus.code}
              </span>
            )}
          </div>
        </div>
      </motion.div>

      {/* Two large action blocks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl">
        {/* Block A – The Builder: Add New Faculty */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          onClick={() => navigate(`/ufp/faculties?campusId=${id}`)}
          className="bg-white rounded-3xl shadow-xl shadow-blue-900/10 border-x border-b border-slate-200 border-t-[10px] border-t-blue-600 p-10 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col items-center justify-center min-h-[280px]"
        >
          <div className="w-24 h-24 rounded-full bg-cyan-100 flex items-center justify-center mb-6">
            <Plus className="w-14 h-14 text-cyan-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Add New Faculty</h3>
          <p className="text-slate-600 text-center text-sm mb-6">Start the data entry process by adding your first faculty for this campus.</p>
          <span className="px-8 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-full font-semibold transition-all">
            Add Faculty
          </span>
        </motion.div>

        {/* Block B – The Explorer: View Faculty Directory */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          onClick={() => navigate(`/ufp/campus/${id}/faculties`)}
          className="bg-white rounded-3xl shadow-xl shadow-blue-900/10 border-x border-b border-slate-200 border-t-[10px] border-t-slate-600 p-10 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col items-center justify-center min-h-[280px]"
        >
          <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center mb-6">
            <List className="w-14 h-14 text-slate-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">View Faculty Directory</h3>
          <p className="text-slate-600 text-center text-sm mb-6">See all faculties, add departments, programs, and staff for this campus.</p>
          <span className="px-8 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-full font-semibold transition-all">
            View Directory
          </span>
        </motion.div>
      </div>
    </div>
  )
}

export default CampusLandingView
