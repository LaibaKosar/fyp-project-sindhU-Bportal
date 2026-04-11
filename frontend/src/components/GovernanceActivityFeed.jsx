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

function GovernanceActivityFeed({ isPresentationMode = false, showTitle = true }) {
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
    return <div className="p-5 text-slate-400 text-xs italic">Syncing governance logs...</div>
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
      {showTitle && (
        <h3 className="text-base font-semibold text-slate-900 mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-600" />
          System Logs
        </h3>
      )}
      
      <div className="space-y-2.5">
        {logs.length > 0 ? logs.map((log, index) => {
          const IconComponent = ICON_MAP[log.action_type] || ICON_MAP.DEFAULT
          const detailText = formatLogDetails(log.details)
          const uniLabel =
            log.university_name == null || log.university_name === ''
              ? '—'
              : typeof log.university_name === 'string'
                ? log.university_name
                : String(log.university_name)

          return (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition-colors"
            >
              {/* KEPT YOUR GLASSMORPHISM STYLE */}
              <div
                className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
                style={{
                  background: 'rgba(15, 23, 42, 0.75)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              >
                <IconComponent className="w-4 h-4 text-white" />
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-900 font-medium leading-tight">
                  <span className="font-semibold text-slate-700">{uniLabel}:</span>
                  {' '}
                  <span className="text-slate-600">{detailText}</span>
                </p>
                <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(log.created_at).toLocaleString(undefined, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </p>
              </div>
            </motion.div>
          )
        }) : (
          <div className="text-xs text-slate-400 p-4 text-center italic">
            System idle: No recent activity
          </div>
        )}
      </div>
    </div>
  )
}

export default GovernanceActivityFeed