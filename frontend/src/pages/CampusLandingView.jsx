import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabaseClient'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Building2, Loader2, Plus, List } from 'lucide-react'
import Breadcrumbs from '../components/Breadcrumbs'
import {
  UFP_ADMIN_HERO_SURFACE_CLASS,
  UFP_ADMIN_HERO_BACK_BUTTON_ROW_CLASS,
} from '../components/UfpManagementPageHeader'
import { UfpAdminShell, UfpAdminContainer } from '../components/UfpAdminShell'

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
      <UfpAdminShell>
        <div className="flex min-h-screen items-center justify-center px-4">
          <div className="flex items-center gap-3 text-lg font-medium text-slate-600">
            <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
            <span>Loading...</span>
          </div>
        </div>
      </UfpAdminShell>
    )
  }

  if (!campus) {
    return (
      <UfpAdminShell>
        <div className="flex min-h-screen items-center justify-center px-4">
          <div className="text-center">
            <Building2 className="mx-auto mb-4 h-16 w-16 text-slate-300" />
            <h2 className="mb-3 text-2xl font-bold text-slate-900">Campus Not Found</h2>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="rounded-lg border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Back
            </button>
          </div>
        </div>
      </UfpAdminShell>
    )
  }

  return (
    <UfpAdminShell>
      <UfpAdminContainer className="pb-12">
        <motion.div
          initial={{ y: -12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className={`mb-8 ${UFP_ADMIN_HERO_SURFACE_CLASS}`}
        >
          <motion.button
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            type="button"
            onClick={() => navigate(-1)}
            className={`group/back mb-6 ${UFP_ADMIN_HERO_BACK_BUTTON_ROW_CLASS}`}
          >
            <ArrowLeft className="h-5 w-5 transition-transform group-hover/back:-translate-x-0.5" />
            Back
          </motion.button>
          <Breadcrumbs
            items={[
              { label: 'Dashboard', path: '/ufp-dashboard' },
              { label: campus.name }
            ]}
            variant="onDark"
            className="mb-2 text-sm"
          />
          <div>
            <h2 className="mb-2 text-3xl font-bold tracking-tight text-white">{campus.name}</h2>
            <div className="flex flex-wrap items-center gap-3 text-slate-300">
              <span className="text-sm">{campus.city}</span>
              {campus.is_main_campus && (
                <span className="rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-white shadow-sm">
                  Main Campus
                </span>
              )}
              {campus.code && (
                <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 font-mono text-xs text-slate-200">
                  {campus.code}
                </span>
              )}
            </div>
          </div>
        </motion.div>
        <div className="grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            role="button"
            tabIndex={0}
            onClick={() => navigate(`/ufp/faculties?campusId=${id}`)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                navigate(`/ufp/faculties?campusId=${id}`)
              }
            }}
            className="flex min-h-[280px] cursor-pointer flex-col items-center justify-center rounded-3xl border border-slate-200 border-t-[10px] border-t-blue-600 bg-white p-10 shadow-xl shadow-blue-900/10 shadow-slate-300/20 ring-1 ring-blue-950/[0.04] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl"
          >
            <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-blue-100 ring-2 ring-blue-200/70">
              <Plus className="h-14 w-14 text-blue-600" />
            </div>
            <h3 className="mb-2 text-xl font-bold text-slate-900">Add New Faculty</h3>
            <p className="mb-6 text-center text-sm text-slate-600">
              Start the data entry process by adding your first faculty for this campus.
            </p>
            <span className="rounded-full bg-slate-900 px-8 py-3 font-semibold text-white shadow-md transition-colors hover:bg-slate-800">
              Add Faculty
            </span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            role="button"
            tabIndex={0}
            onClick={() => navigate(`/ufp/campus/${id}/faculties`)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                navigate(`/ufp/campus/${id}/faculties`)
              }
            }}
            className="flex min-h-[280px] cursor-pointer flex-col items-center justify-center rounded-3xl border border-slate-200 border-t-[10px] border-t-blue-800 bg-white p-10 shadow-xl shadow-blue-900/10 shadow-slate-300/20 ring-1 ring-blue-950/[0.04] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl"
          >
            <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-indigo-50 ring-2 ring-blue-200/60">
              <List className="h-14 w-14 text-blue-800" />
            </div>
            <h3 className="mb-2 text-xl font-bold text-slate-900">View Faculty Directory</h3>
            <p className="mb-6 text-center text-sm text-slate-600">
              See all faculties, add departments, programs, and staff for this campus.
            </p>
            <span className="rounded-full bg-slate-900 px-8 py-3 font-semibold text-white shadow-md transition-colors hover:bg-slate-800">
              View Directory
            </span>
          </motion.div>
        </div>
      </UfpAdminContainer>
    </UfpAdminShell>
  )
}

export default CampusLandingView
