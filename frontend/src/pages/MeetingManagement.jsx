import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabaseClient'
import { useNavigate } from 'react-router-dom'
import { 
  Trash2, 
  Plus, 
  Loader2,
  X,
  ArrowLeft,
  Calendar,
  FileText,
  Download,
  Eye,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  MapPin,
  Users,
  FileCheck
} from 'lucide-react'
import Breadcrumbs from '../components/Breadcrumbs'

// Body Types
const BODY_TYPES = [
  'Senate',
  'Syndicate',
  'Academic Council',
  'Board of Faculty',
  'Board of Studies'
]

// Body Type Colors
const BODY_COLORS = {
  'Senate': 'bg-red-100 text-red-700 border-red-300',
  'Syndicate': 'bg-blue-100 text-blue-700 border-blue-300',
  'Academic Council': 'bg-emerald-100 text-emerald-700 border-emerald-300',
  'Board of Faculty': 'bg-purple-100 text-purple-700 border-purple-300',
  'Board of Studies': 'bg-amber-100 text-amber-700 border-amber-300'
}

function MeetingManagement() {
  const navigate = useNavigate()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState(null)
  const [meetings, setMeetings] = useState([])
  const [filteredMeetings, setFilteredMeetings] = useState([])
  const [toast, setToast] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [selectedMeeting, setSelectedMeeting] = useState(null)
  const [uploadingNotification, setUploadingNotification] = useState(false)
  const [uploadingMinutes, setUploadingMinutes] = useState(false)

  // Form state
  const [bodyType, setBodyType] = useState('')
  const [meetingDate, setMeetingDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [venue, setVenue] = useState('')
  const [subject, setSubject] = useState('')
  const [attendance, setAttendance] = useState('')
  const [decisionsSummary, setDecisionsSummary] = useState('')
  const [status, setStatus] = useState('Draft')
  const [notificationFile, setNotificationFile] = useState(null)
  const [minutesFile, setMinutesFile] = useState(null)

  // Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [filterYear, setFilterYear] = useState('')
  const [filterBodyType, setFilterBodyType] = useState('')

  useEffect(() => {
    loadUserData()
  }, [])

  useEffect(() => {
    if (user?.university_id) {
      fetchMeetings()
    }
  }, [user])

  useEffect(() => {
    applyFilters()
  }, [meetings, searchQuery, filterYear, filterBodyType])

  const loadUserData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        navigate('/login')
        return
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('university_id, role')
        .eq('id', session.user.id)
        .single()

      if (profileError || !profile) {
        console.error('Error fetching profile:', profileError)
        navigate('/login')
        return
      }

      if (profile.role !== 'UFP') {
        navigate('/ufp-dashboard')
        return
      }

      setUser(profile)
      setLoading(false)
    } catch (error) {
      console.error('Error loading user data:', error)
      navigate('/login')
    }
  }

  const fetchMeetings = async () => {
    if (!user?.university_id) return

    try {
      const { data, error } = await supabase
        .from('meetings')
        .select('*')
        .eq('university_id', user.university_id)
        .order('meeting_date', { ascending: false })
        .order('start_time', { ascending: false })

      if (error) throw error
      setMeetings(data || [])
    } catch (error) {
      console.error('Error fetching meetings:', error)
      showToast('Error loading meetings: ' + error.message, 'error')
    }
  }

  const applyFilters = () => {
    let filtered = [...meetings]

    // Filter by search query (subject, venue)
    if (searchQuery) {
      filtered = filtered.filter(meeting =>
        meeting.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        meeting.venue?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Filter by year
    if (filterYear) {
      filtered = filtered.filter(meeting => {
        const meetingYear = new Date(meeting.meeting_date).getFullYear()
        return meetingYear.toString() === filterYear
      })
    }

    // Filter by body type
    if (filterBodyType) {
      filtered = filtered.filter(meeting => meeting.body_type === filterBodyType)
    }

    setFilteredMeetings(filtered)
  }

  const uploadDocument = async (file, type) => {
    if (!file || !user?.university_id) return null

    try {
      const fileExtension = file.name.split('.').pop()
      const fileName = `${type}-${user.university_id}-${Date.now()}.${fileExtension}`
      
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) throw uploadError

      const { data: publicUrlData } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName)
      
      return publicUrlData.publicUrl
    } catch (error) {
      console.error(`Error uploading ${type}:`, error)
      throw error
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!user?.university_id) {
      showToast('University ID not found. Please log in again.', 'error')
      return
    }

    if (!bodyType || !meetingDate || !startTime || !venue || !subject) {
      showToast('Please fill in all required fields', 'error')
      return
    }

    setSaving(true)
    setUploadingNotification(false)
    setUploadingMinutes(false)

    try {
      // Upload notification/agenda if provided
      let notificationUrl = null
      if (notificationFile) {
        setUploadingNotification(true)
        notificationUrl = await uploadDocument(notificationFile, 'notification')
        setUploadingNotification(false)
      }

      // Upload minutes if provided
      let minutesUrl = null
      if (minutesFile) {
        setUploadingMinutes(true)
        minutesUrl = await uploadDocument(minutesFile, 'minutes')
        setUploadingMinutes(false)
      }

      const meetingData = {
        university_id: user.university_id,
        body_type: bodyType,
        meeting_date: meetingDate,
        start_time: startTime,
        venue: venue,
        subject: subject,
        attendance: attendance || null,
        decisions_summary: decisionsSummary || null,
        status: status,
        notification_url: notificationUrl,
        minutes_url: minutesUrl
      }

      const { data, error } = await supabase
        .from('meetings')
        .insert(meetingData)
        .select()
        .single()

      if (error) throw error

      try {
        console.log("LOGGING DEBUG: Attempting fetch to Port 5000...");
        await fetch('http://localhost:5000/api/logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uni_id: user?.university_id || '1',
            uni_name: 'Sukkur IBA University',
            action: 'BOARD_MEETING',
            details: `Recorded ${bodyType} meeting: ${subject}`
          })
        });
        console.log("LOGGING DEBUG: Success!");
      } catch (logErr) {
        console.warn("Log server offline, but record saved to Supabase.");
      }

      showToast('Meeting record added successfully!', 'success')
      
      // Clear form
      setBodyType('')
      setMeetingDate('')
      setStartTime('')
      setVenue('')
      setSubject('')
      setAttendance('')
      setDecisionsSummary('')
      setStatus('Draft')
      setNotificationFile(null)
      setMinutesFile(null)
      
      const notificationInput = document.getElementById('notification-upload')
      const minutesInput = document.getElementById('minutes-upload')
      if (notificationInput) notificationInput.value = ''
      if (minutesInput) minutesInput.value = ''
      
      await fetchMeetings()
      setShowForm(false)
    } catch (error) {
      console.error('Error saving meeting:', error)
      showToast(error.message || 'Error saving meeting', 'error')
    } finally {
      setSaving(false)
      setUploadingNotification(false)
      setUploadingMinutes(false)
    }
  }

  const handleDelete = async (meetingId) => {
    if (!confirm('Are you sure you want to delete this meeting record? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('meetings')
        .delete()
        .eq('id', meetingId)

      if (error) throw error

      await fetchMeetings()
      showToast('Meeting record deleted successfully', 'success')
    } catch (error) {
      console.error('Error deleting meeting:', error)
      showToast(error.message || 'Error deleting meeting', 'error')
    }
  }

  const handleViewDetails = (meeting) => {
    setSelectedMeeting(meeting)
    setShowDetails(true)
  }

  const handleDownloadMinutes = (meeting) => {
    if (meeting.minutes_url) {
      window.open(meeting.minutes_url, '_blank')
    } else {
      showToast('Minutes document not available', 'error')
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  const formatTime = (timeString) => {
    if (!timeString) return 'N/A'
    return timeString
  }

  const getAvailableYears = () => {
    const years = new Set()
    meetings.forEach(meeting => {
      if (meeting.meeting_date) {
        const year = new Date(meeting.meeting_date).getFullYear()
        years.add(year)
      }
    })
    return Array.from(years).sort((a, b) => b - a)
  }

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 5000)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-800/10 to-[#f8fafc] flex items-center justify-center">
        <div className="text-cyan-600 text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-800/10 to-[#f8fafc] p-8">
      {/* Glass Header Container */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="bg-white/5 backdrop-blur-md border-b border-white/10 p-8 mb-8 rounded-t-3xl"
      >
        {/* Back Button */}
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-full font-semibold transition-all shadow-lg shadow-cyan-400/30 mb-6 group"
        >
          <ArrowLeft className="w-5 h-5 text-white group-hover:-translate-x-1 transition-transform" />
          <span className="text-white">Back</span>
        </motion.button>

        <Breadcrumbs
          items={[
            { label: 'Dashboard', path: '/ufp-dashboard' },
            { label: 'Meeting Management' }
          ]}
          className="text-white/80 mb-2"
        />

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">Meeting Management</h2>
            <p className="text-white/90">
              Official records and audit trail for all university meetings
            </p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-full font-semibold transition-all shadow-lg"
          >
            <Plus className="w-5 h-5" />
            <span>Add Meeting</span>
          </button>
        </div>
      </motion.div>

      {/* Search and Filters */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-slate-200 overflow-visible relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 overflow-visible">
          {/* Search */}
          <div className="relative overflow-visible">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Subject or Committee..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 bg-white text-slate-900"
            />
          </div>

          {/* Year Filter */}
          <div className="relative overflow-visible">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 appearance-none bg-white text-slate-900 cursor-pointer [&>option]:bg-white [&>option]:text-slate-900"
            >
              <option value="">Select Academic Year...</option>
              {getAvailableYears().map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          {/* Body Type Filter */}
          <div className="relative overflow-visible">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
            <select
              value={filterBodyType}
              onChange={(e) => setFilterBodyType(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 appearance-none bg-white text-slate-900 cursor-pointer [&>option]:bg-white [&>option]:text-slate-900"
            >
              <option value="">Select Body Type (Senate, etc.)</option>
              {BODY_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* Clear Filters */}
          {(searchQuery || filterYear || filterBodyType) && (
            <button
              onClick={() => {
                setSearchQuery('')
                setFilterYear('')
                setFilterBodyType('')
              }}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-all"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Meetings List */}
      {filteredMeetings.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-16 border border-slate-100 text-center max-w-2xl mx-auto"
        >
          <Calendar className="w-24 h-24 mx-auto mb-6 text-slate-300" />
          <h3 className="text-2xl font-bold text-slate-900 mb-3">No Meetings Recorded</h3>
          <p className="text-slate-600 mb-8 text-lg">Get started by adding your first meeting record.</p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-8 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-full font-semibold transition-all shadow-md hover:shadow-lg text-lg"
          >
            <Plus className="w-6 h-6" />
            <span>Add First Meeting</span>
          </button>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {filteredMeetings.map((meeting, index) => (
            <motion.div
              key={meeting.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.05 }}
              className="bg-white rounded-2xl shadow-lg border border-slate-300 p-6 hover:shadow-xl transition-all"
            >
              <div className="flex items-start justify-between gap-6">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-3">
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${BODY_COLORS[meeting.body_type] || 'bg-slate-100 text-slate-700 border-slate-300'}`}>
                      {meeting.body_type}
                    </span>
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                      meeting.status === 'Official'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {meeting.status === 'Official' ? (
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Official
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Draft
                        </span>
                      )}
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-6 mb-4">
                    <h3 className="text-xl font-bold text-slate-900 line-clamp-2 flex-1 min-w-0">{meeting.subject}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 flex-shrink-0 justify-items-center text-center">
                      <div>
                        <p className="text-xs text-slate-500 mb-1 flex items-center justify-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          Date
                        </p>
                        <p className="text-sm font-medium text-slate-800">{formatDate(meeting.meeting_date)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1 flex items-center justify-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          Time
                        </p>
                        <p className="text-sm font-medium text-slate-800">{formatTime(meeting.start_time)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1 flex items-center justify-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          Venue
                        </p>
                        <p className="text-sm font-medium text-slate-800 truncate max-w-[180px] mx-auto" title={meeting.venue}>{meeting.venue || 'N/A'}</p>
                      </div>
                    </div>
                  </div>

                  {meeting.decisions_summary && (
                    <p className="text-sm text-slate-600 line-clamp-2">
                      {meeting.decisions_summary}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleViewDetails(meeting)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all flex items-center gap-2 text-sm whitespace-nowrap"
                  >
                    <Eye className="w-4 h-4" />
                    <span>View Details</span>
                  </button>
                  {meeting.minutes_url && (
                    <button
                      onClick={() => handleDownloadMinutes(meeting)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-all flex items-center gap-2 text-sm whitespace-nowrap"
                    >
                      <Download className="w-4 h-4" />
                      <span>Minutes</span>
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(meeting.id)}
                    className="p-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-all"
                    title="Delete meeting"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add Meeting Modal */}
      <AnimatePresence>
        {showForm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowForm(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-slate-200">
                {/* Modal Header */}
                <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-3xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-cyan-100 flex items-center justify-center">
                      <Plus className="w-5 h-5 text-cyan-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-900">Add Meeting Record</h3>
                  </div>
                  <button
                    onClick={() => setShowForm(false)}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-600" />
                  </button>
                </div>

                {/* Modal Content */}
                <div className="p-6">
                  <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Body Type and Status */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-900 mb-2">
                          Body Type <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={bodyType}
                          onChange={(e) => setBodyType(e.target.value)}
                          className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm"
                          required
                        >
                          <option value="">Select Body</option>
                          {BODY_TYPES.map((type) => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-900 mb-2">
                          Status <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={status}
                          onChange={(e) => setStatus(e.target.value)}
                          className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm"
                          required
                        >
                          <option value="Draft">Draft</option>
                          <option value="Official">Official</option>
                        </select>
                      </div>
                    </div>

                    {/* Subject */}
                    <div>
                      <label className="block text-sm font-medium text-slate-900 mb-2">
                        Subject <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="e.g., 7th Syndicate Meeting - Budget 2026"
                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm"
                        required
                      />
                    </div>

                    {/* Date, Time, and Venue */}
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-900 mb-2">
                          Meeting Date <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          value={meetingDate}
                          onChange={(e) => setMeetingDate(e.target.value)}
                          className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-900 mb-2">
                          Start Time <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="time"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-900 mb-2">
                          Venue <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={venue}
                          onChange={(e) => setVenue(e.target.value)}
                          placeholder="e.g., Vice Chancellor's Conference Room"
                          className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm"
                          required
                        />
                      </div>
                    </div>

                    {/* Attendance */}
                    <div>
                      <label className="block text-sm font-medium text-slate-900 mb-2">
                        Attendance
                      </label>
                      <textarea
                        value={attendance}
                        onChange={(e) => setAttendance(e.target.value)}
                        placeholder="Members Present: [List names]&#10;Members Absent: [List names]"
                        rows={4}
                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm resize-none"
                      />
                    </div>

                    {/* Executive Summary */}
                    <div>
                      <label className="block text-sm font-medium text-slate-900 mb-2">
                        Executive Summary / Key Decisions
                      </label>
                      <textarea
                        value={decisionsSummary}
                        onChange={(e) => setDecisionsSummary(e.target.value)}
                        placeholder="Summarize the key decisions and conclusions from this meeting..."
                        rows={4}
                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm resize-none"
                      />
                    </div>

                    {/* File Uploads */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-900 mb-2">
                          Meeting Notification/Agenda (PDF)
                        </label>
                        <input
                          type="file"
                          id="notification-upload"
                          accept=".pdf"
                          onChange={(e) => setNotificationFile(e.target.files[0])}
                          className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm"
                        />
                        {notificationFile && (
                          <p className="mt-2 text-xs text-slate-600 flex items-center gap-1">
                            <FileCheck className="w-3 h-3" />
                            {notificationFile.name}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-900 mb-2">
                          Final Minutes (PDF)
                        </label>
                        <input
                          type="file"
                          id="minutes-upload"
                          accept=".pdf"
                          onChange={(e) => setMinutesFile(e.target.files[0])}
                          className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm"
                        />
                        {minutesFile && (
                          <p className="mt-2 text-xs text-slate-600 flex items-center gap-1">
                            <FileCheck className="w-3 h-3" />
                            {minutesFile.name}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Submit Button */}
                    <div className="flex gap-4 pt-4">
                      <button
                        type="button"
                        onClick={() => setShowForm(false)}
                        className="flex-1 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={saving || uploadingNotification || uploadingMinutes}
                        className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {saving || uploadingNotification || uploadingMinutes ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>
                              {uploadingNotification ? 'Uploading Notification...' :
                               uploadingMinutes ? 'Uploading Minutes...' :
                               'Saving...'}
                            </span>
                          </>
                        ) : (
                          <span>Save Meeting Record</span>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* View Details Modal */}
      <AnimatePresence>
        {showDetails && selectedMeeting && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDetails(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-slate-200">
                {/* Modal Header */}
                <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-3xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-900">Meeting Details</h3>
                  </div>
                  <button
                    onClick={() => setShowDetails(false)}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-600" />
                  </button>
                </div>

                {/* Modal Content */}
                <div className="p-6 space-y-6">
                  {/* Header Info */}
                  <div className="flex items-center gap-3 mb-4">
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${BODY_COLORS[selectedMeeting.body_type] || 'bg-slate-100 text-slate-700 border-slate-300'}`}>
                      {selectedMeeting.body_type}
                    </span>
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                      selectedMeeting.status === 'Official' 
                        ? 'bg-emerald-100 text-emerald-700' 
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {selectedMeeting.status}
                    </span>
                  </div>

                  <h3 className="text-2xl font-bold text-slate-900 mb-4">{selectedMeeting.subject}</h3>

                  {/* Meeting Details */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-slate-500 mb-1">Meeting Date</p>
                      <p className="text-base text-slate-900">{formatDate(selectedMeeting.meeting_date)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-500 mb-1">Start Time</p>
                      <p className="text-base text-slate-900">{formatTime(selectedMeeting.start_time)}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm font-medium text-slate-500 mb-1">Venue</p>
                      <p className="text-base text-slate-900">{selectedMeeting.venue}</p>
                    </div>
                  </div>

                  {/* Attendance */}
                  {selectedMeeting.attendance && (
                    <div>
                      <p className="text-sm font-medium text-slate-500 mb-2 flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Attendance
                      </p>
                      <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                        <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans">
                          {selectedMeeting.attendance}
                        </pre>
                      </div>
                    </div>
                  )}

                  {/* Executive Summary */}
                  {selectedMeeting.decisions_summary && (
                    <div>
                      <p className="text-sm font-medium text-slate-500 mb-2">Executive Summary</p>
                      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">
                          {selectedMeeting.decisions_summary}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Documents */}
                  <div className="flex gap-4">
                    {selectedMeeting.notification_url && (
                      <a
                        href={selectedMeeting.notification_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-all"
                      >
                        <FileText className="w-4 h-4" />
                        <span>View Notification</span>
                      </a>
                    )}
                    {selectedMeeting.minutes_url && (
                      <a
                        href={selectedMeeting.minutes_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-all"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download Minutes</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className={`fixed bottom-4 right-4 px-6 py-4 rounded-lg shadow-lg z-50 ${
            toast.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'
          } text-white`}
        >
          {toast.message}
        </motion.div>
      )}
    </div>
  )
}

export default MeetingManagement
