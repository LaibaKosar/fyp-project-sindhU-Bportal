import { useState, useEffect, useRef } from 'react'
import { Clock, FileText, Users, UserCheck, Gavel, Building2, Info, CheckCircle, AlertCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabaseClient'

// This maps the "action_type" from the DB to the correct Lucide icon
const ICON_MAP = {
  FACULTY_ADDED: Users,
  DEPARTMENT_ADDED: Building2,
  STAFF_UPDATED: UserCheck,
  BOARD_MEETING: FileText,
  SENATE_MEETING: Gavel,
  CAMPUS_SYNC: Building2,
  INFO: Info,
  SUCCESS: CheckCircle,
  UPDATE: AlertCircle,
  DEFAULT: Building2
}

// Presentation Mode Mock Logs
function formatLogDetails(details) {
  if (details == null) return ''
  if (typeof details === 'string') return details
  try {
    return JSON.stringify(details)
  } catch {
    return String(details)
  }
}

const PRESENTATION_LOGS = [
  { 
    id: 'mock-log-1', 
    action_type: 'INFO', 
    university_name: 'System', 
    details: 'Security handshake established with Sukkur IBA regional server.',
    created_at: new Date().toISOString()
  },
  { 
    id: 'mock-log-2', 
    action_type: 'SUCCESS', 
    university_name: 'HEC Compliance', 
    details: 'HEC Compliance Audit completed: 2 departments flagged for staffing review.',
    created_at: new Date(Date.now() - 300000).toISOString()
  },
  { 
    id: 'mock-log-3', 
    action_type: 'INFO', 
    university_name: 'Database', 
    details: 'Database sync: 12,000 student records verified across 5 campuses.',
    created_at: new Date(Date.now() - 600000).toISOString()
  },
  { 
    id: 'mock-log-4', 
    action_type: 'UPDATE', 
    university_name: 'Aror University', 
    details: 'New faculty profile added: Dean of Medicine appointed at Aror University.',
    created_at: new Date(Date.now() - 900000).toISOString()
  },
  { 
    id: 'mock-log-5', 
    action_type: 'SUCCESS', 
    university_name: 'System', 
    details: 'Demo environment initialized for executive presentation mode.',
    created_at: new Date(Date.now() - 1200000).toISOString()
  }
]

function GovernanceActivityFeed({
  isPresentationMode = false,
  showTitle = true,
  variant = 'default',
}) {
  const isCommandCenter = variant === 'commandCenter'
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const previousModeRef = useRef(isPresentationMode)

  // Fetch real logs from your Port 5000 Backend (only when not in presentation mode)
  useEffect(() => {
    if (isPresentationMode) {
      // Use mock logs in presentation mode
      const wasJustEnabled = !previousModeRef.current
      
      if (wasJustEnabled) {
        // Auto-Injection: Add a new log at the very top when flipping from false to true
        const newLog = {
          id: `demo-log-${Date.now()}`,
          action_type: 'SUCCESS',
          university_name: 'System',
          details: 'Demo environment initialized for executive presentation mode.',
          created_at: new Date().toISOString()
        }
        // Set logs with the new log at the top, followed by PRESENTATION_LOGS
        setLogs([newLog, ...PRESENTATION_LOGS])
      } else {
        // Already in presentation mode, just set the logs
        setLogs(PRESENTATION_LOGS)
      }
      
      previousModeRef.current = true
      setLoading(false)
      return
    }

    // Not in presentation mode - fetch real logs
    previousModeRef.current = false
    
    const fetchLogs = async () => {
      try {
        const { data, error } = await supabase
          .from('system_logs')
          .select('id, university_name, action_type, details, created_at')
          .order('created_at', { ascending: false })
          .limit(100)
        if (error) throw error
        setLogs(data || [])
      } catch (error) {
        console.error('Failed to fetch logs:', error)
        setLogs([])
      } finally {
        setLoading(false)
      }
    }
    fetchLogs()
    const interval = setInterval(fetchLogs, 10000); // Refresh every 10s for the demo
    return () => clearInterval(interval)
  }, [isPresentationMode])

  if (loading) {
    return (
      <div
        className={
          isCommandCenter
            ? 'flex items-center justify-center gap-3 rounded-xl border border-blue-200 bg-blue-50/80 py-8 text-sm font-medium text-blue-900'
            : 'p-5 text-slate-400 text-xs italic'
        }
      >
        {isCommandCenter && (
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-500 opacity-40" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-blue-600" />
          </span>
        )}
        Syncing governance logs…
      </div>
    )
  }

  const shellClass = isCommandCenter
    ? ''
    : 'bg-white border border-slate-200 rounded-xl p-5 shadow-sm'

  return (
    <div className={shellClass}>
      {showTitle && !isCommandCenter && (
        <h3 className="text-base font-semibold text-slate-900 mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-600" />
          System Logs
        </h3>
      )}

      <div className={isCommandCenter ? 'max-h-[min(420px,55vh)] space-y-2 overflow-y-auto pr-1' : 'space-y-2.5'}>
        {logs.length > 0 ? (
          logs.map((log, index) => {
            const IconComponent = ICON_MAP[log.action_type] || ICON_MAP.DEFAULT
            const detailText = formatLogDetails(log.details)
            const uniLabel =
              log.university_name == null || log.university_name === ''
                ? '—'
                : typeof log.university_name === 'string'
                  ? log.university_name
                  : String(log.university_name)

            const rowClass = isCommandCenter
              ? 'flex items-start gap-3 rounded-xl border border-blue-200/80 bg-white p-3 shadow-sm transition-shadow hover:border-blue-300 hover:shadow-md'
              : 'flex items-start gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition-colors'

            return (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(index * 0.04, 0.4) }}
                className={rowClass}
              >
                <div
                  className={
                    isCommandCenter
                      ? 'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-md shadow-blue-600/25 ring-1 ring-blue-500/30'
                      : 'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg'
                  }
                  style={
                    isCommandCenter
                      ? undefined
                      : {
                          background: 'rgba(15, 23, 42, 0.75)',
                          backdropFilter: 'blur(12px)',
                          WebkitBackdropFilter: 'blur(12px)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        }
                  }
                >
                  <IconComponent className={isCommandCenter ? 'h-5 w-5' : 'h-4 w-4 text-white'} />
                </div>

                <div className="flex-1 min-w-0">
                  <p
                    className={
                      isCommandCenter
                        ? 'text-sm font-medium leading-snug text-slate-900'
                        : 'text-xs text-slate-900 font-medium leading-tight'
                    }
                  >
                    <span
                      className={
                        isCommandCenter
                          ? 'font-bold text-blue-900'
                          : 'font-semibold text-slate-700'
                      }
                    >
                      {uniLabel}
                    </span>
                    {isCommandCenter ? <span className="text-slate-400"> · </span> : ': '}
                    <span className={isCommandCenter ? 'text-slate-700' : 'text-slate-600'}>{detailText}</span>
                  </p>
                  <p
                    className={
                      isCommandCenter
                        ? 'mt-1 flex items-center gap-1.5 text-xs font-medium text-blue-700/90'
                        : 'mt-0.5 flex items-center gap-1 text-xs text-slate-400'
                    }
                  >
                    <Clock className={isCommandCenter ? 'h-3.5 w-3.5 shrink-0' : 'h-3 w-3'} />
                    {new Date(log.created_at).toLocaleString(undefined, {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </p>
                </div>
              </motion.div>
            )
          })
        ) : (
          <div
            className={
              isCommandCenter
                ? 'rounded-xl border-2 border-dashed border-amber-300/80 bg-amber-50/90 py-10 text-center'
                : 'text-xs text-slate-400 p-4 text-center italic'
            }
          >
            <p
              className={
                isCommandCenter
                  ? 'text-sm font-semibold text-amber-950'
                  : undefined
              }
            >
              {isCommandCenter ? 'No recent activity in the log stream.' : 'System idle: No recent activity'}
            </p>
            {isCommandCenter && (
              <p className="mt-1 text-xs text-amber-900/80">Events from universities will appear here as they occur.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default GovernanceActivityFeed