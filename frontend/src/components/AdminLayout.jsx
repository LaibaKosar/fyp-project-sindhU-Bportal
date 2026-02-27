import { motion } from 'framer-motion'
import { useNavigate, useLocation, Outlet } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { LayoutDashboard, University, LogOut, Users, BarChart3, Search, UserCheck, MapPin } from 'lucide-react'

function AdminLayout() {
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <div className="h-screen overflow-hidden bg-slate-50 flex">
      {/* Sidebar - fixed in view; only main content scrolls */}
      <motion.aside
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="w-64 flex-shrink-0 bg-[#0f172a] border-r border-slate-800 flex flex-col shadow-lg"
      >
        {/* Centered Branding Section */}
        <div className="flex flex-col items-center justify-center pt-8 pb-6 px-6">
          <div className="w-20 h-20 rounded-full border-2 border-white overflow-hidden mx-auto">
            <img 
              src="/sindh-logo.jpg.jpg" 
              alt="Sindh Government Logo" 
              className="w-full h-full object-cover"
            />
          </div>
          <div className="text-white text-lg font-bold mt-2 text-center whitespace-nowrap">
            Universities & Boards Dept
          </div>
          <span className="mx-auto mt-2 bg-emerald-500/20 text-emerald-400 text-[10px] px-2 py-0.5 rounded-full font-bold w-fit block">
            U&B Admin
          </span>
        </div>

        {/* Divider */}
        <div className="border-b border-white/10 my-6 mx-4"></div>

        {/* Navigation */}
        <nav className="flex-1 space-y-2 px-4">
          <button
            onClick={() => navigate('/ub-admin')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-sm font-medium ${
              location.pathname === '/ub-admin' && (!location.search || location.search.includes('section=home'))
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span>Home</span>
          </button>
          <button
            onClick={() => navigate('/ub-admin?section=overview')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-sm font-medium ${
              location.pathname === '/ub-admin' && location.search.includes('section=overview')
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <MapPin className="w-5 h-5" />
            <span>Governance Command Center</span>
          </button>
          <button
            onClick={() => navigate('/ub-admin?section=universities')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-sm font-medium ${
              location.pathname === '/ub-admin' && location.search.includes('section=universities')
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <University className="w-5 h-5" />
            <span>Universities</span>
          </button>
          <button
            onClick={() => navigate('/ub-admin?section=accounts')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-sm font-medium ${
              location.pathname === '/ub-admin' && location.search.includes('section=accounts')
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <UserCheck className="w-5 h-5" />
            <span>University Accounts</span>
          </button>
          <button
            onClick={() => navigate('/admin/intelligence-hub')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-sm font-medium ${
              location.pathname === '/admin/intelligence-hub'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Search className="w-5 h-5" />
            <span>Institutional Intelligence</span>
          </button>
          <button
            onClick={() => navigate('/ub-admin?section=staff')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-sm font-medium ${
              location.pathname === '/ub-admin' && location.search.includes('section=staff')
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Users className="w-5 h-5" />
            <span>Staff Directory</span>
          </button>
          <button
            onClick={() => navigate('/ub-admin?section=meetings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-sm font-medium ${
              location.pathname === '/ub-admin' && location.search.includes('section=meetings')
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            <span>Meetings</span>
          </button>
        </nav>

        {/* Logout */}
        <div className="px-4 pb-6">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:bg-white/5 hover:text-white transition-all text-sm"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </motion.aside>

      {/* Main Content - only this area scrolls */}
      <main className="flex-1 min-h-0 overflow-y-auto bg-slate-50">
        <Outlet />
      </main>
    </div>
  )
}

export default AdminLayout
