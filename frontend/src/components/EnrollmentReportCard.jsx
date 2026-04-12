import { motion } from 'framer-motion'
import { MapPin, Trash2, UsersRound } from 'lucide-react'
import { DualGenderRings, AdmissionsMixBar, GenderLegend } from './EnrollmentReportCharts'

/**
 * Rich enrollment “report” tile — gender ratio rings + admissions mix bar (UI only).
 * Click the card (except delete) to open the enlarged detail view.
 */
export default function EnrollmentReportCard({
  enrollment,
  showCampusBadge,
  index,
  onDelete,
  onOpenDetail
}) {
  const male = enrollment.male_students || 0
  const female = enrollment.female_students || 0
  const displayTotalRaw =
    enrollment.total_enrolled != null && enrollment.total_enrolled !== ''
      ? Number(enrollment.total_enrolled)
      : male + female
  const displayTotal = Number.isFinite(displayTotalRaw) ? displayTotalRaw : male + female
  const newAdmissions = enrollment.new_admissions || 0

  const open = () => onOpenDetail?.(enrollment)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: (index + 1) * 0.08 }}
      role={onOpenDetail ? 'button' : undefined}
      tabIndex={onOpenDetail ? 0 : undefined}
      onClick={onOpenDetail ? open : undefined}
      onKeyDown={
        onOpenDetail
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                open()
              }
            }
          : undefined
      }
      className={`relative flex w-full flex-col overflow-hidden rounded-2xl border border-slate-200/90 border-l-4 border-l-blue-600 bg-gradient-to-br from-white via-slate-50/40 to-blue-50/35 text-left shadow-md shadow-slate-300/20 ring-1 ring-slate-200/50 transition-shadow hover:shadow-lg ${onOpenDetail ? 'cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2' : ''}`}
    >
      {showCampusBadge && enrollment.campuses?.name && (
        <div className="absolute left-3 top-3 z-10 flex items-center gap-1 rounded-md border border-blue-100 bg-blue-50/90 px-2.5 py-1 text-xs font-medium text-blue-900">
          <MapPin className="h-3 w-3 shrink-0 text-blue-600" aria-hidden />
          <span>{enrollment.campuses.name}</span>
        </div>
      )}

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onDelete(enrollment.id)
        }}
        className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-lg border border-red-600/90 bg-red-600 text-white shadow-sm backdrop-blur-sm transition-colors hover:border-red-700 hover:bg-red-700"
        title="Delete report"
      >
        <Trash2 className="h-4 w-4" />
      </button>

      <div className="border-b border-slate-200/70 bg-gradient-to-r from-blue-50/80 via-white to-indigo-50/30 px-4 pb-4 pt-12 sm:pt-10">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/90 text-blue-600 shadow-sm ring-1 ring-blue-100">
            <UsersRound className="h-5 w-5" strokeWidth={2} aria-hidden />
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <h3 className="line-clamp-2 text-base font-bold leading-snug text-slate-900 sm:text-lg">
              {enrollment.programs?.name || 'Unknown Program'}
            </h3>
            <span className="mt-1.5 inline-flex rounded-full bg-blue-600/10 px-2.5 py-0.5 text-[11px] font-semibold text-blue-800 ring-1 ring-blue-200/60">
              {enrollment.semester} · {enrollment.academic_year}
            </span>
          </div>
        </div>
      </div>

      <div className="grid flex-1 gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] sm:items-center">
        <div className="flex flex-col items-center justify-center border-b border-slate-100 pb-4 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-4">
          <DualGenderRings male={male} female={female} displayTotal={displayTotal} />
          <GenderLegend male={male} female={female} className="mt-3 max-w-[220px]" />
        </div>

        <div className="flex flex-col justify-center space-y-4">
          <div className="rounded-xl border border-slate-200/80 bg-white/90 p-3 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Enrollment mix</p>
            <AdmissionsMixBar newAdmissions={newAdmissions} total={displayTotal} />
          </div>
        </div>
      </div>
    </motion.div>
  )
}
