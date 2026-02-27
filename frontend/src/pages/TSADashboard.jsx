import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Users,
  Settings,
  LogOut,
  RefreshCw,
  Loader2,
  CheckCircle,
  X,
} from 'lucide-react'

const ROLES = ['TSA', 'U&B_ADMIN', 'UFP']

const MOCK_CONFIG = {
  hecSocialScience: 30,
  hecScience: 20,
  maintenanceMode: false,
}

function TSADashboard() {
  const navigate = useNavigate()
  const [activeModule, setActiveModule] = useState('health')
  const [hecSocial, setHecSocial] = useState(MOCK_CONFIG.hecSocialScience)
  const [hecScience, setHecScience] = useState(MOCK_CONFIG.hecScience)
  const [maintenanceOn, setMaintenanceOn] = useState(MOCK_CONFIG.maintenanceMode)

  // User Management (Phase 2) – no current-user profile fetch; only list of profiles for table
  const [users, setUsers] = useState([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [usersError, setUsersError] = useState(null)
  const [resettingUserId, setResettingUserId] = useState(null)
  const [updatingRoleUserId, setUpdatingRoleUserId] = useState(null)
  const [lockingUserId, setLockingUserId] = useState(null)
  const [toast, setToast] = useState(null)

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type })
    const t = setTimeout(() => setToast(null), 5000)
    return () => clearTimeout(t)
  }, [])

  // Call RPC to bypass session/RLS filters; get_all_users_admin returns all users for TSA admin.
  const fetchUsers = useCallback(async () => {
    setUsersLoading(true)
    setUsersError(null)
    try {
      const { data, error } = await supabase.rpc('get_all_users_admin')

      if (error) throw error

      console.log('[TSA RPC Success]', { rowCount: data?.length ?? 0 })

      const mapped = (Array.isArray(data) ? data : []).map((row) => ({
        id: row.id,
        full_name: row.full_name ?? '',
        email: row.email ?? '—',
        role: row.role ?? '—',
        university_id: row.university_id ?? null,
        university_name: row.university_name ?? '—',
        is_setup_complete: Boolean(row.is_setup_complete),
        is_locked: Boolean(row.is_locked),
      }))

      setUsers(mapped)
      setUsersError(null)
    } catch (err) {
      console.error('Fetch Error:', err)
      setUsersError(err?.message ?? 'Something went wrong')
      showToast('Admin override failed. Check SQL function.', 'error')
      setUsers([])
    } finally {
      setUsersLoading(false)
    }
  }, [showToast])

  // Single initial load only – no re-run on error to avoid recursion/loops; Refresh is manual
  const hasFetchedUsers = useRef(false)
  useEffect(() => {
    if (hasFetchedUsers.current) return
    hasFetchedUsers.current = true
    fetchUsers()
  }, [fetchUsers])

  const handleResetSetup = useCallback(async (user) => {
    if (resettingUserId) return
    setResettingUserId(user.id)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_setup_complete: false })
        .eq('id', user.id)

      if (error) throw error
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, is_setup_complete: false } : u)))
      showToast('Setup reset successfully.', 'success')
    } catch (err) {
      showToast(err?.message || 'Failed to reset setup.', 'error')
    } finally {
      setResettingUserId(null)
    }
  }, [resettingUserId, showToast])

  const handleRoleChange = useCallback(async (userId, newRole) => {
    if (!ROLES.includes(newRole)) return
    if (updatingRoleUserId) return
    setUpdatingRoleUserId(userId)
    try {
      const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId)

      if (error) throw error
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)))
      showToast('Role updated.', 'success')
    } catch (err) {
      showToast(err?.message || 'Failed to update role.', 'error')
    } finally {
      setUpdatingRoleUserId(null)
    }
  }, [updatingRoleUserId, showToast])

  const handleLockToggle = useCallback(async (user) => {
    if (lockingUserId) return
    setLockingUserId(user.id)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_locked: !user.is_locked })
        .eq('id', user.id)

      if (error) throw error
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, is_locked: !u.is_locked } : u)))
      showToast(user.is_locked ? 'User unlocked.' : 'User locked.', 'success')
    } catch (err) {
      showToast(err?.message || 'Failed to update lock.', 'error')
    } finally {
      setLockingUserId(null)
    }
  }, [lockingUserId, showToast])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const navItems = [
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'config', label: 'Environment Config', icon: Settings },
  ]

  const roleBadgeClass = (role) => {
    if (role === 'TSA') return 'bg-purple-500/20 text-purple-400 border border-purple-500/40'
    if (role === 'U&B_ADMIN') return 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
    return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
  }

  return (
    <div className="h-screen overflow-hidden flex bg-[#0f172a]">
      {/* Sidebar - fixed in view; only main content scrolls */}
      <aside className="w-64 flex-shrink-0 bg-[#0f172a] border-r border-slate-700/50 flex flex-col">
        <div className="flex flex-col items-center pt-8 pb-6 px-4">
          <div className="text-white font-bold text-lg text-center">Technical Superadmin</div>
          <span className="mt-2 px-2 py-0.5 rounded text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/40">
            Cyber Ops
          </span>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveModule(id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                activeModule === id
                  ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                  : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'
              }`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-slate-700/50">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-700/50 hover:text-white transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span>Log out</span>
          </button>
        </div>
      </aside>

      {/* Main content - only this area scrolls */}
      <main className="flex-1 min-h-0 overflow-auto">
        {activeModule === 'users' && (
          <div className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <h1 className="text-2xl font-bold text-white">User Management</h1>
              <button
                type="button"
                onClick={() => fetchUsers()}
                disabled={usersLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/40 hover:bg-blue-500/30 disabled:opacity-50 text-sm font-medium"
              >
                {usersLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Refresh
              </button>
            </div>
            {usersError && (
              <p className="mb-4 text-amber-400 text-sm">Failed to load users. Use Refresh to try again.</p>
            )}
            <div className="rounded-lg border border-slate-700/50 overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-800 text-slate-300 text-sm">
                    <th className="px-4 py-3 font-medium">Full name</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Role</th>
                    <th className="px-4 py-3 font-medium">University</th>
                    <th className="px-4 py-3 font-medium">Setup complete</th>
                    <th className="px-4 py-3 font-medium">Locked</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {usersLoading && users.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                        Loading users…
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                        No users found.
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => (
                      <tr key={u.id} className="bg-slate-800/50 border-t border-slate-700/50 hover:bg-slate-700/30">
                        <td className="px-4 py-3 text-slate-200">{u.full_name || '—'}</td>
                        <td className="px-4 py-3 text-white font-medium">{u.email}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${roleBadgeClass(u.role)}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-300">{u.university_name}</td>
                        <td className="px-4 py-3 text-slate-300">{u.is_setup_complete ? 'Yes' : 'No'}</td>
                        <td className="px-4 py-3 text-slate-300">{u.is_locked ? 'Yes' : 'No'}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2 items-center">
                            <select
                              value={u.role}
                              onChange={(e) => handleRoleChange(u.id, e.target.value)}
                              disabled={updatingRoleUserId === u.id}
                              className="px-2 py-1 text-xs rounded bg-slate-700 border border-slate-600 text-slate-200 focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                            >
                              {ROLES.map((r) => (
                                <option key={r} value={r}>
                                  {r}
                                </option>
                              ))}
                            </select>
                            {u.role === 'UFP' && (
                              <button
                                type="button"
                                onClick={() => handleResetSetup(u)}
                                disabled={resettingUserId === u.id}
                                className="px-2 py-1 text-xs rounded bg-slate-600 text-slate-300 hover:bg-slate-500 border border-slate-500 disabled:opacity-50 flex items-center gap-1"
                              >
                                {resettingUserId === u.id ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                                Reset setup
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleLockToggle(u)}
                              disabled={lockingUserId === u.id}
                              className="px-2 py-1 text-xs rounded bg-slate-600 text-slate-300 hover:bg-slate-500 border border-slate-500 disabled:opacity-50 flex items-center gap-1"
                            >
                              {lockingUserId === u.id ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                              {u.is_locked ? 'Unlock' : 'Lock'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeModule === 'config' && (
          <div className="p-6 space-y-6">
            <h1 className="text-2xl font-bold text-white">Environment Config</h1>

            <div className="rounded-lg border border-slate-700/50 bg-slate-800/50 p-6 max-w-xl">
              <h2 className="text-lg font-semibold text-slate-200 mb-4">Threshold settings</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-slate-400 text-sm mb-1">HEC Social Science ratio (e.g. 30:1)</label>
                  <input
                    type="number"
                    value={hecSocial}
                    onChange={(e) => setHecSocial(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-600 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-sm mb-1">HEC Science ratio (e.g. 20:1)</label>
                  <input
                    type="number"
                    value={hecScience}
                    onChange={(e) => setHecScience(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-600 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <button
                  onClick={() => alert('Save Changes (mock)')}
                  className="px-4 py-2 rounded-lg bg-blue-500 text-white font-medium hover:bg-blue-600 hover:scale-[1.02] transition-all"
                >
                  Save Changes
                </button>
              </div>
            </div>

            <div className="rounded-lg border border-slate-700/50 bg-slate-800/50 p-6 max-w-xl">
              <h2 className="text-lg font-semibold text-slate-200 mb-4">Maintenance mode</h2>
              <div className="flex items-center gap-4">
                <span className="text-slate-300">Maintenance mode: {maintenanceOn ? 'ON' : 'OFF'}</span>
                <button
                  onClick={() => setMaintenanceOn(!maintenanceOn)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    maintenanceOn
                      ? 'bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30'
                      : 'bg-slate-600 text-slate-300 border border-slate-500 hover:bg-slate-500'
                  }`}
                >
                  {maintenanceOn ? 'Turn OFF' : 'Big Red Button (mock)'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Toast – Cyber Ops styling; no auth/profile re-fetch on dismiss */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-4 right-4 bg-slate-800 border border-slate-600 rounded-lg shadow-xl p-4 z-50 min-w-[280px] flex items-center gap-3"
          >
            {toast.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            ) : (
              <X className="w-5 h-5 text-red-400 flex-shrink-0" />
            )}
            <p className="text-slate-200 text-sm flex-1">{toast.message}</p>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="text-slate-400 hover:text-white p-1"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default TSADashboard
