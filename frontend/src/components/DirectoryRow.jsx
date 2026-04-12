import React from 'react'
import { ChevronRight, ChevronDown } from 'lucide-react'

function getIndentClass(level) {
  switch (level) {
    case 1:
      return 'pl-6'
    case 2:
      return 'pl-12'
    case 3:
      return 'pl-16'
    default:
      return 'pl-0'
  }
}

function getStatusClasses(tone) {
  if (tone === 'danger') {
    return 'bg-red-50 text-red-700 border border-red-200'
  }
  if (tone === 'stem') {
    return 'bg-blue-50 text-blue-700 border border-blue-200'
  }
  if (tone === 'nonstem') {
    return 'bg-slate-100 text-slate-700 border border-slate-200'
  }
  return 'bg-slate-100 text-slate-700 border border-slate-200'
}

export default function DirectoryRow({
  level = 0,
  type,
  name,
  code,
  focalPerson,
  totalLabel,
  isExpandable = false,
  isExpanded = false,
  onToggle,
  stemBadge, // { label, tone: 'stem' | 'nonstem' }
  status, // string like 'Missing report'
  statusTone, // 'danger' | 'muted'
  disabledReason
}) {
  const indentClass = getIndentClass(level)

  const canToggle = isExpandable && typeof onToggle === 'function'

  const circleClasses = (() => {
    switch (type) {
      case 'faculty':
        return 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
      case 'department':
        return 'border-sky-300 bg-sky-50 text-sky-700 hover:bg-sky-100'
      case 'program':
        return 'border-violet-300 bg-violet-50 text-violet-700 hover:bg-violet-100'
      case 'report':
        return 'border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100'
      default:
        return 'border-slate-300 bg-white text-slate-600 hover:bg-slate-100'
    }
  })()

  const circleStateClasses = canToggle ? 'cursor-pointer' : 'cursor-default opacity-60'

  return (
    <div
      className={`flex items-center border-b border-slate-200/80 bg-white hover:bg-slate-50 transition-colors text-sm`}
    >
      {/* Name column with ladder indent + caret */}
      <div className={`flex items-center gap-2 py-2.5 pr-3 flex-1 min-w-0 ${indentClass}`}>
        <button
          type="button"
          onClick={canToggle ? onToggle : undefined}
          aria-disabled={canToggle ? 'false' : 'true'}
          title={disabledReason || undefined}
          className={`mr-1 inline-flex items-center justify-center w-5 h-5 rounded-full border flex-shrink-0 text-[10px] ${circleClasses} ${circleStateClasses}`}
        >
          {isExpanded ? (
            <ChevronDown className="w-3 h-3" />
          ) : (
            <ChevronRight className="w-3 h-3" />
          )}
        </button>
        <div className="flex flex-col min-w-0">
          <span className="font-medium text-slate-800 truncate">{name || '—'}</span>
          {totalLabel && (
            <span className="text-xs text-slate-500 truncate">{totalLabel}</span>
          )}
        </div>
      </div>

      {/* Code / STEM badge column */}
      <div className="w-52 px-3 py-2.5 flex items-center gap-2">
        {code && <span className="text-slate-700 text-xs sm:text-sm truncate">{code}</span>}
        {stemBadge && (
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${getStatusClasses(
              stemBadge.tone
            )}`}
          >
            {stemBadge.label}
          </span>
        )}
      </div>

      {/* Focal / status column */}
      <div className="w-64 px-3 py-2.5 flex items-center justify-between gap-2">
        {status ? (
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${getStatusClasses(
              statusTone || 'muted'
            )}`}
          >
            {status}
          </span>
        ) : (
          <span className="text-xs sm:text-sm text-slate-700 truncate">
            {focalPerson || (type === 'report' ? '' : '—')}
          </span>
        )}
      </div>
    </div>
  )
}

