import { motion } from 'framer-motion'
import { ArrowLeft, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Breadcrumbs from './Breadcrumbs'

/** Outer shell for UFP admin hero blocks — keep in sync with detail-page headers that import these tokens. */
export const UFP_ADMIN_HERO_SURFACE_CLASS =
  'rounded-xl border border-white/10 border-t-[3px] border-t-cyan-400/85 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-5 shadow-lg shadow-slate-950/40 ring-1 ring-white/[0.08] sm:p-6'

/** Back control row (add your own vertical margin, e.g. `mb-4` or `mb-6`). */
export const UFP_ADMIN_HERO_BACK_BUTTON_ROW_CLASS =
  'inline-flex items-center gap-2 rounded-full border border-white/15 bg-slate-950/90 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-cyan-500/20 transition-all hover:border-cyan-400/45 hover:bg-slate-900'

export const UFP_ADMIN_HERO_BACK_BUTTON_CLASS = `mb-4 ${UFP_ADMIN_HERO_BACK_BUTTON_ROW_CLASS}`

export const UFP_ADMIN_HERO_ICON_WRAP_CLASS =
  'mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-cyan-200 ring-1 ring-white/15 shadow-inner'

const PRIMARY_ACTION_CLASS =
  'inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-white/10 bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/25 transition-all hover:border-cyan-400/40 hover:bg-slate-900'

/**
 * Shared UFP admin list/detail page hero — dark navy surface with light foreground for consistency across admin routes.
 *
 * @param {Array<{ label: string, path?: string }>} breadcrumbItems
 * @param {string} title
 * @param {string} [description]
 * @param {import('react').ReactNode} [icon] — e.g. <Calendar className="h-5 w-5" strokeWidth={2} />
 * @param {{ label: string, onClick: () => void, icon?: import('react').ReactNode }} [primaryAction]
 * @param {string} [className] — merged onto the outer motion wrapper (after default mb-6)
 * @param {string} [breadcrumbClassName]
 */
export function UfpManagementPageHeader({
  breadcrumbItems,
  title,
  description,
  icon = null,
  primaryAction = null,
  className = '',
  breadcrumbClassName = 'mb-4 text-sm',
}) {
  const navigate = useNavigate()

  return (
    <motion.div
      initial={{ y: -12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className={`mb-6 ${UFP_ADMIN_HERO_SURFACE_CLASS} ${className}`.trim()}
    >
      <motion.button
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        type="button"
        onClick={() => navigate(-1)}
        className={`group/back ${UFP_ADMIN_HERO_BACK_BUTTON_CLASS}`}
      >
        <ArrowLeft
          className="h-4 w-4 transition-transform group-hover/back:-translate-x-0.5"
          aria-hidden
        />
        Back
      </motion.button>

      <Breadcrumbs items={breadcrumbItems} variant="onDark" className={breadcrumbClassName} />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          {icon ? (
            <div className="flex items-start gap-3">
              <div className={UFP_ADMIN_HERO_ICON_WRAP_CLASS} aria-hidden>
                {icon}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="mb-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">{title}</h2>
                {description ? <p className="text-sm text-slate-300 sm:text-base">{description}</p> : null}
              </div>
            </div>
          ) : (
            <div>
              <h2 className="mb-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">{title}</h2>
              {description ? <p className="text-sm text-slate-300 sm:text-base">{description}</p> : null}
            </div>
          )}
        </div>
        {primaryAction ? (
          <button type="button" onClick={primaryAction.onClick} className={PRIMARY_ACTION_CLASS}>
            {primaryAction.icon != null ? primaryAction.icon : <Plus className="h-4 w-4" aria-hidden />}
            <span>{primaryAction.label}</span>
          </button>
        ) : null}
      </div>
    </motion.div>
  )
}
