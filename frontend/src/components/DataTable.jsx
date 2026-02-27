import { useState, useEffect } from 'react'
import { Search, Loader2 } from 'lucide-react'

/**
 * Reusable DataTable for UB Admin command centers (Staff Directory, Meetings & Reports).
 * Props: columns [{ key, label, render? }], data, loading, emptyMessage,
 *        optional searchPlaceholder, searchValue, onSearchChange,
 *        optional filterSlot (React node above table), optional pagination (pageSize).
 */
function DataTable({
  columns = [],
  data = [],
  loading = false,
  emptyMessage = 'No data available',
  searchPlaceholder,
  searchValue = '',
  onSearchChange,
  filterSlot,
  pageSize = 25
}) {
  const [page, setPage] = useState(1)

  useEffect(() => {
    setPage(1)
  }, [data.length])

  const totalPages = pageSize > 0 ? Math.max(1, Math.ceil(data.length / pageSize)) : 1
  const start = (page - 1) * pageSize
  const paginatedData = pageSize > 0 ? data.slice(start, start + pageSize) : data

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      {(searchPlaceholder != null || filterSlot) && (
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center gap-4">
          {searchPlaceholder != null && onSearchChange && (
            <div className="relative flex-1 min-w-[200px]">
              <label className="block text-xs font-medium text-slate-500 mb-1">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchValue}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          )}
          {filterSlot}
        </div>
      )}

      <div className="overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : data.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-sm">
            {emptyMessage}
          </div>
        ) : (
          <>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      className="px-4 py-3 font-semibold text-slate-700 whitespace-nowrap"
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((row, idx) => (
                  <tr
                    key={row.id ?? idx}
                    className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors"
                  >
                    {columns.map((col) => (
                      <td key={col.key} className="px-4 py-3 text-slate-700">
                        {col.render ? col.render(row) : (row[col.key] ?? '—')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>

            {pageSize > 0 && data.length > pageSize && (
              <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>
                  Showing {start + 1}–{Math.min(start + pageSize, data.length)} of {data.length}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="px-2 py-1 rounded border border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
                  >
                    Previous
                  </button>
                  <span className="px-2 py-1">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="px-2 py-1 rounded border border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default DataTable
