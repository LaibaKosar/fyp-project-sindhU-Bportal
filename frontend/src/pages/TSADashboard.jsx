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
  Search,
  Filter,
  ShieldCheck,
  Database,
  HardDrive,
  Clock3,
} from 'lucide-react'

const ROLES = ['TSA', 'U&B_ADMIN', 'UFP']

const MOCK_CONFIG = {
  hecSocialScience: 30,
  hecScience: 20,
  maintenanceMode: false,
}

function TSADashboard() {
  const navigate = useNavigate()
  const [activeModule, setActiveModule] = useState('users')
  const [hecSocial, setHecSocial] = useState(MOCK_CONFIG.hecSocialScience)
  const [hecScience, setHecScience] = useState(MOCK_CONFIG.hecScience)
  const [maintenanceOn, setMaintenanceOn] = useState(MOCK_CONFIG.maintenanceMode)

  // User Management (Phase 2) – no current-user profile fetch; only list of profiles for table
  const [users, setUsers] = useState([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [usersError, setUsersError] = useState(null)
  const [resettingUserId, setResettingUserId] = useState(null)
  const [lockingUserId, setLockingUserId] = useState(null)
  const [toast, setToast] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [accessFilter, setAccessFilter] = useState('all')
  const [setupFilter, setSetupFilter] = useState('all')
  const [recentActivity, setRecentActivity] = useState([])

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type })
    const t = setTimeout(() => setToast(null), 5000)
    return () => clearTimeout(t)
  }, [])

  const appendRecentActivity = useCallback((message) => {
    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      message,
      timestamp: new Date().toISOString(),
    }
    setRecentActivity((prev) => [entry, ...prev].slice(0, 5))
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
      appendRecentActivity(`Loaded ${mapped.length} account${mapped.length === 1 ? '' : 's'} from admin source.`)
    } catch (err) {
      console.error('Fetch Error:', err)
      setUsersError(err?.message ?? 'Something went wrong')
      showToast('Admin override failed. Check SQL function.', 'error')
      setUsers([])
    } finally {
      setUsersLoading(false)
    }
  }, [appendRecentActivity, showToast])

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
      appendRecentActivity(`Setup reset for ${user.email || user.full_name || 'user account'}.`)
    } catch (err) {
      showToast(err?.message || 'Failed to reset setup.', 'error')
    } finally {
      setResettingUserId(null)
    }
  }, [appendRecentActivity, resettingUserId, showToast])

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
      appendRecentActivity(
        `${user.is_locked ? 'Unlocked' : 'Locked'} ${user.email || user.full_name || 'user account'}.`
      )
    } catch (err) {
      showToast(err?.message || 'Failed to update lock.', 'error')
    } finally {
      setLockingUserId(null)
    }
  }, [appendRecentActivity, lockingUserId, showToast])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const navItems = [
    { id: 'users', label: 'System Account Management', icon: Users },
  ]

  const totalUsers = users.length
  const ufpAccounts = users.filter((u) => u.role === 'UFP').length
  const lockedAccounts = users.filter((u) => u.is_locked).length
  const pendingSetupAccounts = users.filter((u) => u.role === 'UFP' && !u.is_setup_complete).length
  const normalizedSearch = searchTerm.trim().toLowerCase()
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      normalizedSearch.length === 0 ||
      u.full_name?.toLowerCase().includes(normalizedSearch) ||
      u.email?.toLowerCase().includes(normalizedSearch)
    const matchesRole = roleFilter === 'all' || u.role === roleFilter
    const matchesAccess =
      accessFilter === 'all' ||
      (accessFilter === 'locked' && u.is_locked) ||
      (accessFilter === 'unlocked' && !u.is_locked)
    const matchesSetup =
      setupFilter === 'all' ||
      (setupFilter === 'complete' && u.is_setup_complete) ||
      (setupFilter === 'incomplete' && !u.is_setup_complete)
    return matchesSearch && matchesRole && matchesAccess && matchesSetup
  })

  const StatusPill = ({ ok, okLabel, badLabel, okClass, badClass }) => (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
        ok ? okClass : badClass
      }`}
    >
      {ok ? okLabel : badLabel}
    </span>
  )

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
          <div className="p-6 space-y-8">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl font-bold text-white">System Account Management</h1>
                <p className="mt-1 text-sm text-slate-400">
                  Platform-level control for account setup and access status.
                </p>
              </div>
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
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-slate-700/60 bg-slate-800/55 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Total Users</p>
                <p className="mt-2 text-3xl font-bold tabular-nums text-white">{totalUsers}</p>
              </div>
              <div className="rounded-xl border border-emerald-500/25 bg-slate-800/55 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">UFP Accounts</p>
                <p className="mt-2 text-3xl font-bold tabular-nums text-emerald-300">{ufpAccounts}</p>
              </div>
              <div className="rounded-xl border border-amber-500/25 bg-slate-800/55 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Locked Accounts</p>
                <p className="mt-2 text-3xl font-bold tabular-nums text-amber-300">{lockedAccounts}</p>
              </div>
              <div className="rounded-xl border border-violet-500/25 bg-slate-800/55 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Pending Setup</p>
                <p className="mt-2 text-3xl font-bold tabular-nums text-violet-300">{pendingSetupAccounts}</p>
              </div>
            </section>
            {usersError && (
              <p className="mb-4 text-amber-400 text-sm">Failed to load users. Use Refresh to try again.</p>
            )}
            <section className="rounded-xl border border-slate-700/60 bg-slate-900/25 p-4">
              <div className="mb-3 flex items-center gap-2 text-slate-300">
                <Filter className="h-4 w-4" />
                <h2 className="text-sm font-semibold uppercase tracking-wide">Search and filters</h2>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="md:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-slate-400">Search account</label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Name or email"
                      className="w-full rounded-lg border border-slate-600 bg-slate-800 py-2 pl-8 pr-3 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">Role</label>
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="all">All Roles</option>
                    {ROLES.map((role) => (
                      <option key={role} value={role}>
                        {role === 'U&B_ADMIN' ? 'U&B Admin' : role}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">Access status</label>
                  <select
                    value={accessFilter}
                    onChange={(e) => setAccessFilter(e.target.value)}
                    className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="all">All</option>
                    <option value="locked">Locked</option>
                    <option value="unlocked">Unlocked</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">Setup status</label>
                  <select
                    value={setupFilter}
                    onChange={(e) => setSetupFilter(e.target.value)}
                    className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="all">All</option>
                    <option value="complete">Complete</option>
                    <option value="incomplete">Incomplete</option>
                  </select>
                </div>
              </div>
            </section>
            <section className="rounded-xl border border-slate-700/60 bg-slate-900/30 overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-800/90 text-slate-300 text-xs uppercase tracking-wide">
                    <th className="px-3 py-2.5 font-semibold">Account</th>
                    <th className="px-3 py-2.5 font-semibold">Role</th>
                    <th className="px-3 py-2.5 font-semibold">University</th>
                    <th className="px-3 py-2.5 font-semibold">Setup</th>
                    <th className="px-3 py-2.5 font-semibold">Access</th>
                    <th className="px-3 py-2.5 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {usersLoading && users.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                        Loading users…
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                        {users.length === 0 ? 'No users found.' : 'No users match the selected filters.'}
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => (
                      <tr key={u.id} className="bg-slate-800/40 border-t border-slate-700/60 hover:bg-slate-700/25">
                        <td className="px-3 py-2.5">
                          <div className="text-sm font-medium text-white">{u.full_name || '—'}</div>
                          <div className="mt-0.5 text-xs text-slate-400">{u.email}</div>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${roleBadgeClass(u.role)}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-sm text-slate-300">{u.university_name}</td>
                        <td className="px-3 py-2.5">
                          <StatusPill
                            ok={u.is_setup_complete}
                            okLabel="Complete"
                            badLabel="Incomplete"
                            okClass="bg-emerald-500/20 text-emerald-300 border border-emerald-500/35"
                            badClass="bg-violet-500/20 text-violet-300 border border-violet-500/35"
                          />
                        </td>
                        <td className="px-3 py-2.5">
                          <StatusPill
                            ok={!u.is_locked}
                            okLabel="Unlocked"
                            badLabel="Locked"
                            okClass="bg-sky-500/20 text-sky-300 border border-sky-500/35"
                            badClass="bg-amber-500/20 text-amber-300 border border-amber-500/35"
                          />
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex flex-wrap justify-end gap-1.5 items-center">
                            {u.role === 'UFP' && (
                              <button
                                type="button"
                                onClick={() => handleResetSetup(u)}
                                disabled={resettingUserId === u.id}
                                className="px-2.5 py-1 text-xs rounded-md bg-slate-700 text-slate-200 hover:bg-slate-600 border border-slate-500/70 disabled:opacity-50 flex items-center gap-1"
                              >
                                {resettingUserId === u.id ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                                Reset
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleLockToggle(u)}
                              disabled={lockingUserId === u.id}
                              className="px-2.5 py-1 text-xs rounded-md bg-blue-600/20 text-blue-300 hover:bg-blue-600/30 border border-blue-500/40 disabled:opacity-50 flex items-center gap-1"
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
            </section>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <section className="rounded-xl border border-slate-700/60 bg-slate-900/25 p-4">
                <h2 className="text-base font-semibold text-white">System Status</h2>
                <p className="mt-1 text-xs text-slate-400">Operational indicators for this environment.</p>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2">
                    <div className="flex items-center gap-2 text-sm text-emerald-300">
                      <ShieldCheck className="h-4 w-4" />
                      Authentication
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-wide text-emerald-200">Active</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2">
                    <div className="flex items-center gap-2 text-sm text-emerald-300">
                      <Database className="h-4 w-4" />
                      Database
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-wide text-emerald-200">Connected</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2">
                    <div className="flex items-center gap-2 text-sm text-emerald-300">
                      <HardDrive className="h-4 w-4" />
                      Storage
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-wide text-emerald-200">Operational</span>
                  </div>
                  <div className="pt-2 text-sm text-slate-300">
                    Mode:{' '}
                    <span className="rounded-md border border-blue-500/30 bg-blue-500/15 px-2 py-0.5 text-xs font-semibold text-blue-300">
                      Demo / Production
                    </span>
                  </div>
                </div>
              </section>
              <section className="rounded-xl border border-slate-700/60 bg-slate-900/25 p-4">
                <div className="flex items-center gap-2">
                  <Clock3 className="h-4 w-4 text-slate-300" />
                  <h2 className="text-base font-semibold text-white">Recent Activity</h2>
                </div>
                <p className="mt-1 text-xs text-slate-400">Latest administrative actions for quick audit visibility.</p>
                <div className="mt-4 space-y-2">
                  {recentActivity.length === 0 ? (
                    <div className="rounded-lg border border-slate-700 bg-slate-800/40 px-3 py-2 text-sm text-slate-400">
                      No recent actions in this session yet.
                    </div>
                  ) : (
                    recentActivity.map((entry) => (
                      <div key={entry.id} className="rounded-lg border border-slate-700 bg-slate-800/40 px-3 py-2">
                        <p className="text-sm text-slate-200">{entry.message}</p>
                        <p className="mt-1 text-xs text-slate-400">
                          {new Date(entry.timestamp).toLocaleString()}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>

            <section className="pt-2 space-y-4">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-slate-300" />
                <h2 className="text-xl font-semibold text-white">Environment Config</h2>
              </div>
              <p className="text-sm text-slate-400">Secondary operational controls for platform behavior.</p>

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
            </section>
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
