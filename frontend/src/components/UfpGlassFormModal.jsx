import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'

/**
 * Blurred backdrop + scrollable panel for quick-add forms from hierarchy pages.
 */
export default function UfpGlassFormModal({
  open,
  onClose,
  title,
  subtitle,
  children,
  maxWidthClass = 'max-w-2xl',
  zBackdrop = 64,
  zPanel = 65
}) {
  useEffect(() => {
    if (!open) return
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
  }, [open, onClose])

  if (typeof document === 'undefined' || !open) return null

  return createPortal(
    <>
      <motion.button
        type="button"
        aria-label="Close"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 bg-slate-900/45 backdrop-blur-md"
        style={{ zIndex: zBackdrop }}
        onClick={onClose}
      />
      <div
        className="fixed inset-0 flex items-center justify-center p-4 sm:p-6 pointer-events-none"
        style={{ zIndex: zPanel }}
      >
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="ufp-glass-modal-title"
          initial={{ opacity: 0, scale: 0.97, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          className={`pointer-events-auto max-h-[min(92vh,900px)] w-full ${maxWidthClass} overflow-y-auto rounded-2xl border border-slate-200/90 bg-white shadow-2xl shadow-slate-900/15`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur-sm sm:px-6">
            <div className="min-w-0">
              <h2 id="ufp-glass-modal-title" className="text-lg font-bold text-slate-900 sm:text-xl">
                {title}
              </h2>
              {subtitle && <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="p-5 sm:p-6">{children}</div>
        </motion.div>
      </div>
    </>,
    document.body
  )
}
