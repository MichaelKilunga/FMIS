import { useState, type ReactNode } from 'react'
import { Loader2, Eye, EyeOff, Columns } from 'lucide-react'
import clsx from 'clsx'

import Pagination from './Pagination'

interface PaginatedData<T> {
  data: T[]
  current_page: number
  last_page: number
  per_page: number
  total: number
}

interface Column<T> {
  header: string
  accessor: keyof T | ((item: T) => ReactNode)
  className?: string
  priority?: 'always' | 'mobile-hidden'
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: PaginatedData<T> | null
  loading?: boolean
  onPageChange?: (page: number) => void
  emptyMessage?: string
}

export default function DataTable<T extends { id: string | number }>({
  columns,
  data,
  loading,
  onPageChange,
  emptyMessage = 'No records found'
}: DataTableProps<T>) {
  const [showHiddenColumns, setShowHiddenColumns] = useState(false)

  const hasHiddenColumns = columns.some(col => col.priority === 'mobile-hidden')
  if (loading && !data) {
    return (
      <div className="glass-card flex justify-center py-16">
        <Loader2 className="animate-spin text-blue-500" size={28} />
      </div>
    )
  }

  const items = data?.data || []

  return (
    <div className="space-y-4">
      {hasHiddenColumns && (
        <div className="flex justify-end">
          <button
            onClick={() => setShowHiddenColumns(!showHiddenColumns)}
            className="btn-ghost text-xs py-1 px-2 flex items-center gap-2"
            title={showHiddenColumns ? "Hide extra columns" : "Show all columns"}
          >
            {showHiddenColumns ? <EyeOff size={14} /> : <Eye size={14} />}
            <span>{showHiddenColumns ? 'Show Less' : 'Show All Columns'}</span>
          </button>
        </div>
      )}

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto min-w-full inline-block align-middle">
          <div className="overflow-hidden">
            <table className="fmis-table min-w-full divide-y divide-slate-700/50">
              <thead>
                <tr>
                  {columns.map((col, i) => (
                    <th 
                      key={i} 
                      className={clsx(
                        col.className,
                        col.priority === 'mobile-hidden' && !showHiddenColumns && 'hidden md:table-cell'
                      )}
                    >
                      {col.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30">
                {loading ? (
                  <tr>
                    <td colSpan={columns.length} className="text-center py-12">
                      <div className="flex justify-center">
                        <Loader2 className="animate-spin text-blue-500" size={24} />
                      </div>
                    </td>
                  </tr>
                ) : items.length > 0 ? (
                  items.map((item) => (
                    <tr key={item.id}>
                      {columns.map((col, i) => (
                        <td 
                          key={i} 
                          className={clsx(
                            col.className,
                            col.priority === 'mobile-hidden' && !showHiddenColumns && 'hidden md:table-cell'
                          )}
                        >
                          {typeof col.accessor === 'function'
                            ? col.accessor(item)
                            : (item[col.accessor] as ReactNode)}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={columns.length} className="text-center py-12 text-slate-500 italic">
                      {emptyMessage}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {data && onPageChange && (
        <Pagination 
          currentPage={data.current_page}
          lastPage={data.last_page}
          total={data.total}
          perPage={data.per_page}
          loading={loading}
          onPageChange={onPageChange}
        />
      )}
    </div>
  )
}
