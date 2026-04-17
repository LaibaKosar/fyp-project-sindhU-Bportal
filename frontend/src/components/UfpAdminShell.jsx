import { Loader2 } from 'lucide-react'

/**
 * Shared UFP page backdrop: darker slate tint at the top easing to a light neutral floor
 * (same treatment as Report Archive / Campus Management for visual coherence).
 */
export const UFP_PAGE_GRADIENT_CLASS = 'min-h-screen bg-gradient-to-b from-slate-800/10 to-[#f8fafc]'

/**
 * Shared UFP admin page chrome — presentation only (no data).
 */
export function UfpAdminShell({ children, className = '' }) {
  return (
    <div className={`w-full ${UFP_PAGE_GRADIENT_CLASS} ${className}`.trim()}>
      {children}
    </div>
  )
}

/**
 * Centered content column (max width) — faculty/campus list pages.
 */
export function UfpAdminContainer({ children, className = '' }) {
  return (
    <div
      className={`mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 xl:px-10 ${className}`.trim()}
    >
      {children}
    </div>
  )
}

/**
 * Full-width dashboard body (Report Archive / Campus Management style): left-aligned content,
 * horizontal padding only — no page-level max-width or mx-auto column.
 */
export function UfpAdminPageWide({ children, className = '' }) {
  return (
    <div className={`w-full px-6 py-6 sm:py-8 lg:px-8 lg:pb-10 ${className}`.trim()}>
      {children}
    </div>
  )
}

export function UfpAdminLoadingCenter() {
  return (
    <div className={`flex min-h-screen items-center justify-center ${UFP_PAGE_GRADIENT_CLASS}`}>
      <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
        <Loader2 className="h-5 w-5 animate-spin text-blue-600" aria-hidden />
        <span>Loading...</span>
      </div>
    </div>
  )
}
