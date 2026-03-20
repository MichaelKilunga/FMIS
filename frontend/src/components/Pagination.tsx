import { ChevronLeft, ChevronRight } from 'lucide-react'
import clsx from 'clsx'

interface PaginationProps {
  currentPage: number
  lastPage: number
  total: number
  perPage: number
  loading?: boolean
  onPageChange: (page: number) => void
}

export default function Pagination({
  currentPage,
  lastPage,
  total,
  perPage,
  loading,
  onPageChange
}: PaginationProps) {
  if (total === 0) return null

  const from = (currentPage - 1) * perPage + 1
  const to = Math.min(currentPage * perPage, total)

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2 mt-4">
      <div className="text-sm text-slate-400">
        Showing <span className="text-white font-medium">{from}</span> to{' '}
        <span className="text-white font-medium">{to}</span> of{' '}
        <span className="text-white font-medium">{total}</span> results
      </div>

      {lastPage > 1 && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1 || loading}
            className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Previous Page"
          >
            <ChevronLeft size={18} />
          </button>
          
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, lastPage) }, (_, i) => {
              let pageNum = 1
              if (lastPage <= 5) pageNum = i + 1
              else if (currentPage <= 3) pageNum = i + 1
              else if (currentPage >= lastPage - 2) pageNum = lastPage - 4 + i
              else pageNum = currentPage - 2 + i

              return (
                <button
                  key={pageNum}
                  onClick={() => onPageChange(pageNum)}
                  disabled={loading}
                  className={clsx(
                    'w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium transition-colors',
                    currentPage === pageNum
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                      : 'bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700'
                  )}
                >
                  {pageNum}
                </button>
              )
            })}
          </div>

          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === lastPage || loading}
            className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Next Page"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </div>
  )
}
