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
 * Full-width UFP admin body: left-aligned content, horizontal padding only (no max-width column).
 */
export function UfpAdminPageWide({ children, className = '' }) {
  return (
    <div className={`w-full px-6 py-6 sm:py-8 lg:px-8 lg:pb-10 ${className}`.trim()}>
      {children}
    </div>
  )
}

/**
 * Same layout as {@link UfpAdminPageWide} — kept for existing imports (campus/faculty/detail flows).
 */
export function UfpAdminContainer({ children, className = '' }) {
  return <UfpAdminPageWide className={className}>{children}</UfpAdminPageWide>
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
