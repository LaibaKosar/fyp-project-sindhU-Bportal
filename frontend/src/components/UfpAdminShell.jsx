import { Loader2 } from 'lucide-react'

/**
 * Soft page backdrop: very light blue at top and bottom, neutral / white center.
 * (Single linear gradient — readable, not dramatic.)
 */
export const UFP_PAGE_GRADIENT_CLASS =
  'min-h-screen bg-[linear-gradient(180deg,rgb(239_246_255/0.92)_0%,rgb(255_255_255)_22%,rgb(248_250_252)_50%,rgb(255_255_255)_78%,rgb(239_246_255/0.88)_100%)]'

/**
 * Shared UFP admin page chrome — presentation only (no data).
 */
export function UfpAdminShell({ children, className = '' }) {
  return (
    <div className={`${UFP_PAGE_GRADIENT_CLASS} ${className}`.trim()}>
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
    <div className={`flex min-h-screen items-center justify-center ${UFP_PAGE_GRADIENT_CLASS}`}>
      <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
        <Loader2 className="h-5 w-5 animate-spin text-blue-600" aria-hidden />
        <span>Loading...</span>
      </div>
    </div>
  )
}
