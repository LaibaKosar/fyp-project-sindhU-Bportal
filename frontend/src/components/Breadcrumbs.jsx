import { useNavigate } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

/**
 * File-explorer style breadcrumbs.
 * @param {Array<{ label: string, path?: string }>} items - Each item: label and optional path (last item usually has no path = current page).
 * @param {string} className - Optional wrapper class (e.g. for light/dark text).
 */
export default function Breadcrumbs({ items = [], className = '' }) {
  const navigate = useNavigate()
  if (!items?.length) return null

  return (
    <nav aria-label="Breadcrumb" className={`flex flex-wrap items-center gap-1 text-sm ${className}`}>
      {items.map((item, i) => {
        const isLast = i === items.length - 1
        const isClickable = !isLast && item.path
        return (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="w-4 h-4 opacity-60 flex-shrink-0" />}
            {isClickable ? (
              <button
                type="button"
                onClick={() => navigate(item.path)}
                className="hover:underline focus:outline-none focus:underline"
              >
                {item.label}
              </button>
            ) : (
              <span className={isLast ? 'font-medium' : ''}>{item.label}</span>
            )}
          </span>
        )
      })}
    </nav>
  )
}
