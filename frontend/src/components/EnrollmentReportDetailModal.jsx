import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { X, MapPin, Building2, GraduationCap, CalendarRange, Users, UserPlus, School } from 'lucide-react'
import { DualGenderRings, AdmissionsMixBar, GenderLegend } from './EnrollmentReportCharts'

function buildSummary({
  programName,
  departmentName,
  campusName,
  semester,
  academicYear,
  total,
  male,
  female,
  newAdmissions
}) {
  const tenure = `${semester} ${academicYear}`.trim()
  const loc = [campusName, departmentName].filter(Boolean).join(' · ')
  const genderNote =
    total > 0
      ? `Women make up about ${Math.round((female / total) * 100)}% of the cohort and men about ${Math.round((male / total) * 100)}%.`
      : 'Gender breakdown was not recorded for this cohort.'

  const intake =
    newAdmissions > 0 && total > 0
      ? `${newAdmissions} students (${Math.round((newAdmissions / total) * 100)}% of the total) are recorded as new admissions for this session.`
      : newAdmissions > 0
        ? `${newAdmissions} students are recorded as new admissions for this session.`
        : 'No separate new-admissions count was entered for this session; figures reflect total enrollment only.'

  return `This enrollment snapshot covers ${programName} for ${tenure}${loc ? ` (${loc})` : ''}. Total headcount stands at ${total}. ${genderNote} ${intake}`
}

/**
 * Full-screen style overlay: blurred backdrop + enlarged report with charts and narrative.
 */
export default function EnrollmentReportDetailModal({ enrollment, onClose, campusContextName }) {
  useEffect(() => {
    if (!enrollment) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [enrollment, onClose])

  if (typeof document === 'undefined' || !enrollment) return null

  const programName = enrollment.programs?.name || 'Unknown program'
  const departmentName = enrollment.programs?.departments?.name || null
  const campusName = enrollment.campuses?.name || campusContextName || null

  const male = enrollment.male_students || 0
  const female = enrollment.female_students || 0
  const displayTotalRaw =
    enrollment.total_enrolled != null && enrollment.total_enrolled !== ''
      ? Number(enrollment.total_enrolled)
      : male + female
  const displayTotal = Number.isFinite(displayTotalRaw) ? displayTotalRaw : male + female
  const newAdmissions = Math.max(0, Number(enrollment.new_admissions) || 0)
  const continuing = Math.max(0, displayTotal - newAdmissions)

  const summary = buildSummary({
    programName,
    departmentName,
    campusName,
    semester: enrollment.semester || '',
    academicYear: enrollment.academic_year || '',
    total: displayTotal,
    male,
    female,
    newAdmissions
  })

  const tenureLabel = [enrollment.semester, enrollment.academic_year].filter(Boolean).join(' · ')

  return createPortal(
    <>
      <motion.button
        type="button"
        aria-label="Close report detail"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[60] bg-slate-900/45 backdrop-blur-md"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-[61] flex items-center justify-center p-4 sm:p-6 pointer-events-none">
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="enrollment-report-detail-title"
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          className="pointer-events-auto max-h-[min(92vh,880px)] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white via-slate-50/50 to-blue-50/40 shadow-2xl shadow-slate-900/20 ring-1 ring-white/60"
          onClick={(e) => e.stopPropagation()}
        >
              <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-slate-200/80 bg-white/90 px-5 py-4 backdrop-blur-md sm:px-6">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-700">Enrollment report</p>
                  <h2
                    id="enrollment-report-detail-title"
                    className="mt-1 text-lg font-bold leading-snug text-slate-900 sm:text-xl"
                  >
                    {programName}
                  </h2>
                  {tenureLabel && (
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-600/10 px-2.5 py-0.5 text-xs font-semibold text-blue-900 ring-1 ring-blue-200/70">
                        <CalendarRange className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        {tenureLabel}
                      </span>
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-5 p-5 sm:p-6">
                <div className="flex flex-wrap gap-2">
                  {campusName && (
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-800 shadow-sm">
                      <MapPin className="h-3.5 w-3.5 text-blue-600" aria-hidden />
                      {campusName}
                    </span>
                  )}
                  {departmentName && (
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-800 shadow-sm">
                      <Building2 className="h-3.5 w-3.5 text-violet-600" aria-hidden />
                      {departmentName}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-800 shadow-sm">
                    <GraduationCap className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
                    Program cohort
                  </span>
                </div>

                <p className="rounded-xl border border-slate-200/80 bg-white/80 p-4 text-sm leading-relaxed text-slate-700 shadow-sm">
                  {summary}
                </p>

                <div className="grid gap-6 lg:grid-cols-[1.05fr_1fr] lg:items-start">
                  <div className="rounded-2xl border border-slate-200/90 bg-white/90 p-5 shadow-sm">
                    <p className="mb-4 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Gender composition
                    </p>
                    <DualGenderRings male={male} female={female} displayTotal={displayTotal} size={200} />
                    <GenderLegend male={male} female={female} className="mt-5" />
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      <StatTile icon={Users} label="Total enrolled" value={displayTotal} accent="text-blue-700" />
                      <StatTile icon={UserPlus} label="New admissions" value={newAdmissions > 0 ? `+${newAdmissions}` : '—'} accent="text-emerald-700" />
                      <StatTile icon={School} label="Continuing" value={continuing} accent="text-slate-700" />
                      <StatTile label="Male students" value={male} accent="text-violet-700" />
                      <StatTile label="Female students" value={female} accent="text-orange-700" />
                      <StatTile
                        label="New intake share"
                        value={displayTotal > 0 ? `${Math.round((newAdmissions / displayTotal) * 100)}%` : '—'}
                        accent="text-teal-700"
                      />
                    </div>
                    <div className="rounded-2xl border border-slate-200/90 bg-white/90 p-4 shadow-sm">
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Admissions mix</p>
                      <AdmissionsMixBar newAdmissions={newAdmissions} total={displayTotal} />
                    </div>
                  </div>
                </div>
              </div>
        </motion.div>
      </div>
    </>,
    document.body
  )
}

function StatTile({ icon: Icon, label, value, accent }) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm">
      {Icon && (
        <Icon className={`mb-1.5 h-4 w-4 ${accent}`} aria-hidden />
      )}
      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-0.5 text-lg font-bold tabular-nums sm:text-xl ${accent || 'text-slate-900'}`}>{value}</p>
    </div>
  )
}
