import { Camera, Download, Loader2, User } from 'lucide-react'

/**
 * Dean / HOD appointment block — same layout for faculty and department detail.
 * All upload logic stays in the parent via callbacks and ids.
 */
export default function UfpLeadershipPanel({
  roleLabel,
  displayName,
  emptyDisplayLabel = 'Not set',
  photoUrl,
  photoAlt,
  photoInputId,
  letterInputId,
  letterUrl,
  uploadError,
  uploadingPhoto,
  uploadingLetter,
  onPhotoChange,
  onLetterChange,
  /** When true, existing photo is wrapped in a label with hover overlay (HOD). */
  photoChangeOverlay = false,
  /** Optional icon shown at end of the name row (e.g. FileText for HOD). */
  trailingSlot = null,
  /** Show "Official Dean Record" style badge when displayName is set. */
  showOfficialRecordBadge = false,
  letterIdleLabel = 'No letter uploaded — upload signed appointment letter',
  letterUploadingLabel = 'Uploading…'
}) {
  const name = displayName || emptyDisplayLabel

  return (
    <>
      {uploadError && (
        <p className="mb-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {uploadError}
        </p>
      )}
      <div className="rounded-xl border border-slate-200/95 border-l-4 border-l-blue-600 bg-gradient-to-br from-slate-50 via-white to-blue-50/50 p-4 shadow-md shadow-blue-900/10 shadow-slate-300/12 ring-1 ring-blue-200/30 ring-slate-200/40">
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-slate-200/90 bg-gradient-to-r from-white to-blue-50/35 p-3 shadow-sm">
          <input
            type="file"
            accept="image/*"
            id={photoInputId}
            className="hidden"
            disabled={uploadingPhoto}
            onChange={onPhotoChange}
          />
          {photoUrl ? (
            photoChangeOverlay ? (
              <label
                htmlFor={photoInputId}
                className="group/avatar relative block h-20 w-20 shrink-0 cursor-pointer"
                title="Click to change photo"
              >
                <img src={photoUrl} alt={photoAlt || name} className="h-full w-full rounded-lg border border-slate-200 object-cover" />
                <span className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/40 opacity-0 transition-opacity group-hover/avatar:opacity-100">
                  <Camera className="h-5 w-5 text-white" aria-hidden />
                </span>
              </label>
            ) : (
              <img
                src={photoUrl}
                alt={photoAlt || name}
                className="h-20 w-20 shrink-0 rounded-lg border border-slate-200 object-cover"
              />
            )
          ) : (
            <label
              htmlFor={photoInputId}
              className="flex h-20 w-20 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 transition-colors hover:border-slate-400 hover:bg-slate-100"
              title="Click to upload photo"
            >
              {uploadingPhoto ? (
                <Loader2 className="h-7 w-7 animate-spin text-slate-500" aria-hidden />
              ) : (
                <Camera className="h-7 w-7 text-slate-400" aria-hidden />
              )}
            </label>
          )}
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
              <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500/75" aria-hidden />
              {roleLabel}
            </p>
            <p
              className="mt-0.5 line-clamp-4 break-words text-base font-semibold leading-snug text-slate-900"
              title={displayName || undefined}
            >
              {name}
            </p>
            {showOfficialRecordBadge && displayName ? (
              <span className="mt-2 inline-flex items-center rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800">
                <User className="mr-1 h-3.5 w-3.5" aria-hidden />
                Official Dean Record
              </span>
            ) : null}
          </div>
          {trailingSlot}
        </div>
        <div>
            <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
              <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500/80" aria-hidden />
              Appointment Letter
            </p>
          {letterUrl ? (
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={letterUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
              >
                View letter
              </a>
              <a
                href={letterUrl}
                download
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
              >
                <Download className="h-4 w-4" aria-hidden />
                Download
              </a>
            </div>
          ) : (
            <label htmlFor={letterInputId} className="group block cursor-pointer text-sm text-slate-600 hover:text-blue-600">
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                id={letterInputId}
                className="hidden"
                disabled={uploadingLetter}
                onChange={onLetterChange}
              />
              {uploadingLetter ? (
                <span className="inline-flex items-center gap-1 text-slate-700">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  {letterUploadingLabel}
                </span>
              ) : (
                <span className="group-hover:underline">{letterIdleLabel}</span>
              )}
            </label>
          )}
        </div>
      </div>
    </>
  )
}
