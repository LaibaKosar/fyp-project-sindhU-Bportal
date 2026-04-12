import { Loader2 } from 'lucide-react'

/**
 * Shared UFP admin page chrome — presentation only (no data).
 * Outer: full viewport neutral background. Inner: full-width content + responsive padding.
 */
export function UfpAdminShell({ children, className = '' }) {
  return (
    <div
      className={`min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-blue-50/60 ${className}`.trim()}
    >
      {children}
    </div>
  )
}

export function UfpAdminContainer({ children, className = '' }) {
  return (
    <div
      className={`w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-8 xl:px-10 ${className}`.trim()}
    >
      {children}
    </div>
  )
}

export function UfpAdminLoadingCenter() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-slate-50 to-blue-50/60">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
        <Loader2 className="h-5 w-5 animate-spin text-blue-600" aria-hidden />
        <span>Loading...</span>
      </div>
    </div>
  )
}
