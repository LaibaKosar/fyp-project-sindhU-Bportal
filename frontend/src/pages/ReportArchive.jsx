import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabaseClient'
import { useNavigate } from 'react-router-dom'
import { 
  Trash2, 
  Plus, 
  Loader2,
  X,
  FileText,
  Download,
  Search,
  Filter,
  FileCheck,
  Upload
} from 'lucide-react'
import { UfpManagementPageHeader } from '../components/UfpManagementPageHeader'
import { UFP_PAGE_GRADIENT_CLASS } from '../components/UfpAdminShell'
import { recordSystemLog } from '../utils/systemLogs'
import { normalizeText } from '../utils/validation/commonValidators'
import { FIELD_LIMITS, validateFiscalYearField, validateRequiredField } from '../utils/validation/formRules'

// Report Types
const REPORT_TYPES = [
  'Financial Audit',
  'QEC Quality Report',
  'ORIC Research Report',
  'Annual Progress Report',
  'Admission Summary'
]

/** Fiscal year suggestions (July–June style: start year–start year+1). Shown in datalist; users may type any value. */
function generateFiscalYearSuggestions(fromStartYear, toStartYear) {
  const out = []
  for (let y = fromStartYear; y <= toStartYear; y += 1) {
    out.push(`${y}-${y + 1}`)
  }
  return out
}

const FISCAL_YEAR_SUGGESTIONS = generateFiscalYearSuggestions(1985, 2045)

/** Filter value: reports whose type is not one of the predefined REPORT_TYPES */
const FILTER_CUSTOM_REPORT_TYPES = '__custom_report_types__'

// Report Type Colors
const REPORT_TYPE_COLORS = {
  'Financial Audit': 'bg-emerald-100 text-emerald-700 border-emerald-300',
  'QEC Quality Report': 'bg-blue-100 text-blue-700 border-blue-300',
  'ORIC Research Report': 'bg-violet-100 text-violet-700 border-violet-300',
  'Annual Progress Report': 'bg-amber-100 text-amber-700 border-amber-300',
  'Admission Summary': 'bg-cyan-100 text-cyan-700 border-cyan-300'
}

function ReportArchive() {
  const navigate = useNavigate()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState(null)
  const [reports, setReports] = useState([])
  const [filteredReports, setFilteredReports] = useState([])
  const [toast, setToast] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)

  // Form state
  const [title, setTitle] = useState('')
  const [reportTypeSelect, setReportTypeSelect] = useState('')
  const [customReportType, setCustomReportType] = useState('')
  const [fiscalYear, setFiscalYear] = useState('')
  const [reportFile, setReportFile] = useState(null)
  const [fileName, setFileName] = useState('')

  // Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState('')

  useEffect(() => {
    loadUserData()
  }, [])

  useEffect(() => {
    if (user?.university_id) {
      fetchReports()
    }
  }, [user])

  useEffect(() => {
    applyFilters()
  }, [reports, searchQuery, filterType])

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

  const fetchReports = async () => {
    if (!user?.university_id) return

    try {
      const { data, error } = await supabase
        .from('university_reports')
        .select('*')
        .eq('university_id', user.university_id)
        .order('date_submitted', { ascending: false })

      if (error) throw error
      setReports(data || [])
    } catch (error) {
      console.error('Error fetching reports:', error)
      showToast('Error loading reports: ' + error.message, 'error')
    }
  }

  const applyFilters = () => {
    let filtered = [...reports]

    // Filter by search query (title)
    if (searchQuery) {
      filtered = filtered.filter(report =>
        report.title?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Filter by report type
    if (filterType === FILTER_CUSTOM_REPORT_TYPES) {
      filtered = filtered.filter((report) => !REPORT_TYPES.includes(report.report_type))
    } else if (filterType) {
      filtered = filtered.filter((report) => report.report_type === filterType)
    }

    setFilteredReports(filtered)
  }

  const uploadReport = async (file) => {
    if (!file || !user?.university_id) return null

    setIsUploading(true)
    setUploadProgress(0)

    try {
      // Simulate progress (Supabase doesn't provide real progress, so we simulate)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 200)

      const fileExtension = file.name.split('.').pop()
      const fileName = `report-${user.university_id}-${Date.now()}.${fileExtension}`
      
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (uploadError) throw uploadError

      const { data: publicUrlData } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName)
      
      setIsUploading(false)
      setUploadProgress(0)
      return publicUrlData.publicUrl
    } catch (error) {
      console.error('Error uploading report:', error)
      setIsUploading(false)
      setUploadProgress(0)
      throw error
    }
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      // Validate PDF
      if (file.type !== 'application/pdf') {
        showToast('Please select a PDF file', 'error')
        return
      }
      setReportFile(file)
      setFileName(file.name)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!user?.university_id) {
      showToast('University ID not found. Please log in again.', 'error')
      return
    }

    const normalizedTitle = normalizeText(title)
    const resolvedReportType =
      reportTypeSelect === 'Other' ? normalizeText(customReportType) : normalizeText(reportTypeSelect)
    const resolvedFiscalYear = normalizeText(fiscalYear)

    if (reportTypeSelect === 'Other' && !resolvedReportType) {
      showToast('Please enter a report type when "Other" is selected', 'error')
      return
    }

    const titleError = validateRequiredField(normalizedTitle, 'report title')
    if (titleError) return showToast(titleError, 'error')
    if (normalizedTitle.length > FIELD_LIMITS.title) {
      return showToast(`Report title is too long (max ${FIELD_LIMITS.title} characters)`, 'error')
    }

    if (!resolvedReportType) {
      return showToast('Please select report type', 'error')
    }
    if (resolvedReportType.length > FIELD_LIMITS.name) {
      return showToast(`Report type is too long (max ${FIELD_LIMITS.name} characters)`, 'error')
    }

    const fiscalYearError = validateFiscalYearField(resolvedFiscalYear)
    if (fiscalYearError) return showToast(fiscalYearError, 'error')

    if (!reportFile) {
      showToast('Please fill in all required fields and select a PDF file', 'error')
      return
    }

    setSaving(true)

    try {
      // Upload PDF
      const reportUrl = await uploadReport(reportFile)

      if (!reportUrl) {
        throw new Error('Failed to upload report file')
      }

      const reportData = {
        university_id: user.university_id,
        title: normalizedTitle,
        report_type: resolvedReportType,
        fiscal_year: resolvedFiscalYear,
        file_url: reportUrl,
        date_submitted: new Date().toISOString()
      }

      const { error } = await supabase
        .from('university_reports')
        .insert([reportData])

      if (error) throw error

      await recordSystemLog({
        universityId: user.university_id,
        actionType: 'REPORT_SUBMITTED',
        details: `Submitted report: ${normalizedTitle} (${resolvedReportType}, ${resolvedFiscalYear}).`,
      })

      showToast('Report uploaded successfully!', 'success')
      
      // Clear form
      setTitle('')
      setReportTypeSelect('')
      setCustomReportType('')
      setFiscalYear('')
      setReportFile(null)
      setFileName('')
      
      const fileInput = document.getElementById('report-upload')
      if (fileInput) fileInput.value = ''
      
      await fetchReports()
      setShowForm(false)
    } catch (error) {
      console.error('Error saving report:', error)
      showToast(error.message || 'Error uploading report', 'error')
    } finally {
      setSaving(false)
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const handleDelete = async (reportId) => {
    if (!confirm('Are you sure you want to delete this official report? This action cannot be undone and may affect audit compliance.')) {
      return
    }

    try {
      const reportToDelete = reports.find((report) => report.id === reportId)
      const { error } = await supabase
        .from('university_reports')
        .delete()
        .eq('id', reportId)

      if (error) throw error

      await recordSystemLog({
        universityId: user?.university_id,
        actionType: 'REPORT_DELETED',
        details: `Deleted report: ${reportToDelete?.title || 'Untitled report'}`,
      })

      await fetchReports()
      showToast('Report deleted successfully', 'success')
    } catch (error) {
      console.error('Error deleting report:', error)
      showToast(error.message || 'Error deleting report', 'error')
    }
  }

  const handleDownload = (report) => {
    if (report.file_url) {
      window.open(report.file_url, '_blank')
    } else {
      showToast('Report file not available', 'error')
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 5000)
  }

  if (loading) {
    return (
      <div className={`${UFP_PAGE_GRADIENT_CLASS} flex items-center justify-center`}>
        <div className="text-cyan-600 text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className={`${UFP_PAGE_GRADIENT_CLASS} p-8`}>
      <UfpManagementPageHeader
        className="mb-8"
        breadcrumbItems={[
          { label: 'Dashboard', path: '/ufp-dashboard' },
          { label: 'Report Archive' },
        ]}
        title="Report Archive"
        description="Official government audit reports and documentation"
        icon={<FileText className="h-5 w-5" strokeWidth={2} />}
        primaryAction={{ label: 'Add Report', onClick: () => setShowForm(true) }}
      />

      {/* Search and Filters */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by report title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 text-slate-900 placeholder:text-slate-500"
            />
          </div>

          {/* Report Type Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 appearance-none bg-white text-slate-700 cursor-pointer [&>option]:text-slate-900 [&>option]:bg-white"
            >
              <option value="">Filter by report type...</option>
              {REPORT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
              <option value={FILTER_CUSTOM_REPORT_TYPES}>Custom / other type</option>
            </select>
          </div>

          {/* Clear Filters */}
          {(searchQuery || filterType) && (
            <button
              onClick={() => {
                setSearchQuery('')
                setFilterType('')
              }}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-all"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Reports Grid */}
      {filteredReports.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-16 border border-slate-100 text-center max-w-2xl mx-auto"
        >
          <FileText className="w-24 h-24 mx-auto mb-6 text-slate-300" />
          <h3 className="text-2xl font-bold text-slate-900 mb-3">No Official Reports Found</h3>
          <p className="text-slate-600 mb-8 text-lg">Get started by uploading your first official report.</p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-8 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-full font-semibold transition-all shadow-md hover:shadow-lg text-lg"
          >
            <Plus className="w-6 h-6" />
            <span>Add First Report</span>
          </button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredReports.map((report, index) => (
            <motion.div
              key={report.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 hover:shadow-xl transition-all flex flex-col"
            >
              {/* PDF Icon */}
              <div className="flex justify-center mb-4">
                <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
                  <FileText className="w-10 h-10 text-red-600" />
                </div>
              </div>

              {/* Title */}
              <h3 className="text-lg font-bold text-slate-900 mb-2 text-center line-clamp-2">
                {report.title}
              </h3>

              {/* Fiscal Year */}
              <p className="text-sm text-slate-600 mb-3 text-center">
                Fiscal Year: <span className="font-semibold">{report.fiscal_year}</span>
              </p>

              {/* Type Badge */}
              <div className="flex justify-center mb-4">
                <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${
                  REPORT_TYPE_COLORS[report.report_type] || 'bg-slate-100 text-slate-700 border-slate-300'
                }`}>
                  {report.report_type}
                </span>
              </div>

              {/* Timestamp */}
              <p className="text-xs text-slate-500 mb-4 text-center">
                Submitted: {formatDate(report.date_submitted)}
              </p>

              {/* Actions */}
              <div className="flex items-center justify-center gap-2 mt-auto">
                <button
                  onClick={() => handleDownload(report)}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Download</span>
                </button>
                <button
                  onClick={() => handleDelete(report.id)}
                  className="p-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-all"
                  title="Delete report"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add Report Modal */}
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
              <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200">
                {/* Modal Header */}
                <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-3xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-cyan-100 flex items-center justify-center">
                      <Plus className="w-5 h-5 text-cyan-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-900">Upload Official Report</h3>
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
                    {/* Title */}
                    <div>
                      <label className="block text-sm font-medium text-slate-900 mb-2">
                        Report Title <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g., Annual Financial Audit 2024-2025"
                        maxLength={180}
                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm"
                        required
                      />
                    </div>

                    {/* Report Type and Fiscal Year */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-slate-900 mb-2">
                          Report Type <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={reportTypeSelect}
                          onChange={(e) => {
                            setReportTypeSelect(e.target.value)
                            if (e.target.value !== 'Other') setCustomReportType('')
                          }}
                          className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm"
                          required
                        >
                          <option value="">Select Type</option>
                          {REPORT_TYPES.map((type) => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                          <option value="Other">Other (specify below)</option>
                        </select>
                        {reportTypeSelect === 'Other' && (
                          <input
                            type="text"
                            value={customReportType}
                            onChange={(e) => setCustomReportType(e.target.value)}
                            placeholder="Enter your report type"
                            maxLength={120}
                            className="mt-2 w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm"
                            aria-label="Custom report type"
                          />
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-900 mb-2" htmlFor="fiscal-year-input">
                          Fiscal Year <span className="text-red-500">*</span>
                        </label>
                        <input
                          id="fiscal-year-input"
                          type="text"
                          list="fiscal-year-suggestions"
                          value={fiscalYear}
                          onChange={(e) => setFiscalYear(e.target.value)}
                          placeholder="e.g. 2024-2025 or choose from suggestions"
                          pattern="\\d{4}\\s*[-/]\\s*\\d{4}"
                          maxLength={9}
                          className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm"
                          required
                          autoComplete="off"
                        />
                        <datalist id="fiscal-year-suggestions">
                          {FISCAL_YEAR_SUGGESTIONS.map((fy) => (
                            <option key={fy} value={fy} />
                          ))}
                        </datalist>
                        <p className="mt-1.5 text-xs text-slate-500">
                          Type any fiscal year label, or pick a suggestion (1985–1986 through 2045–2046).
                        </p>
                      </div>
                    </div>

                    {/* File Upload */}
                    <div>
                      <label className="block text-sm font-medium text-slate-900 mb-2">
                        Report File (PDF Only) <span className="text-red-500">*</span>
                      </label>
                      <div className="space-y-3">
                        <input
                          type="file"
                          id="report-upload"
                          accept=".pdf"
                          onChange={handleFileChange}
                          className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm"
                          required
                        />
                        {fileName && (
                          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                            <FileCheck className="w-4 h-4 text-emerald-600" />
                            <span className="text-sm text-emerald-700 font-medium">{fileName}</span>
                          </div>
                        )}
                        {isUploading && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm text-slate-600">
                              <span className="flex items-center gap-2">
                                <Upload className="w-4 h-4 animate-pulse" />
                                Uploading...
                              </span>
                              <span>{uploadProgress}%</span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${uploadProgress}%` }}
                              />
                            </div>
                          </div>
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
                        disabled={saving || isUploading}
                        className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {saving || isUploading ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>
                              {isUploading ? `Uploading... ${uploadProgress}%` : 'Saving...'}
                            </span>
                          </>
                        ) : (
                          <span>Upload Report</span>
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

export default ReportArchive
