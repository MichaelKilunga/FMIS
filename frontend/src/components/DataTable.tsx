import { type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
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
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto min-w-full inline-block align-middle">
          <div className="overflow-hidden">
            <table className="fmis-table min-w-full divide-y divide-slate-700/50 text-nowrap">
              <thead>
                <tr>
                  {columns.map((col, i) => (
                    <th key={i} className={col.className}>
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
                        <td key={i} className={col.className}>
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
