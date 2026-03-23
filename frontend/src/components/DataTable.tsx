import { useState, useEffect, type ReactNode, Fragment } from 'react'
import { Loader2, Plus, Minus, ChevronRight, ChevronDown } from 'lucide-react'
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
  /**
   * 1: Always visible
   * 2: Hidden on < 640px (sm)
   * 3: Hidden on < 768px (md)
   * 4: Hidden on < 1024px (lg)
   * 5: Hidden on < 1280px (xl)
   */
  priority?: number
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
  const [expandedRows, setExpandedRows] = useState<Set<string | number>>(new Set())
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200)

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const isColumnHidden = (priority?: number) => {
    if (!priority || priority <= 1) return false
    if (priority >= 2 && windowWidth < 640) return true
    if (priority >= 3 && windowWidth < 768) return true
    if (priority >= 4 && windowWidth < 1024) return true
    if (priority >= 5 && windowWidth < 1280) return true
    return false
  }

  const visibleColumns = columns.filter(col => !isColumnHidden(col.priority))
  const hiddenColumns = columns.filter(col => isColumnHidden(col.priority))
  const hasHiddenColumns = hiddenColumns.length > 0
  
  const toggleRow = (id: string | number) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedRows(newExpanded)
  }
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
            <table className="fmis-table min-w-full divide-y divide-slate-700/50">
              <thead>
                <tr>
                  {hasHiddenColumns && (
                    <th className="w-10"></th>
                  )}
                  {visibleColumns.map((col, i) => (
                    <th 
                      key={i} 
                      className={col.className}
                    >
                      {col.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30">
                {loading ? (
                  <tr>
                    <td colSpan={visibleColumns.length + (hasHiddenColumns ? 1 : 0)} className="text-center py-12">
                      <div className="flex justify-center">
                        <Loader2 className="animate-spin text-blue-500" size={24} />
                      </div>
                    </td>
                  </tr>
                ) : items.length > 0 ? (
                  items.map((item, index) => {
                    if (!item) return null
                    const isExpanded = expandedRows.has(item.id)
                    return (
                      <Fragment key={item.id || index}>
                        <tr className={clsx(isExpanded && 'bg-slate-800/50')}>
                          {hasHiddenColumns && (
                            <td>
                              <button 
                                onClick={() => toggleRow(item.id)}
                                className="p-1 rounded bg-slate-700/50 text-blue-400 hover:bg-slate-700 transition-colors"
                              >
                                {isExpanded ? <Minus size={14} /> : <Plus size={14} />}
                              </button>
                            </td>
                          )}
                          {visibleColumns.map((col, i) => (
                            <td 
                              key={i} 
                              className={col.className}
                            >
                              {typeof col.accessor === 'function'
                                ? (() => {
                                    try { return col.accessor(item) }
                                    catch (e) { 
                                      console.error('Error in column accessor:', e)
                                      return <span className="text-red-500 text-[10px]">Error</span> 
                                    }
                                  })()
                                : (item[col.accessor] as ReactNode)}
                            </td>
                          ))}
                        </tr>
                        {isExpanded && hasHiddenColumns && (
                          <tr className="bg-slate-800/30">
                            <td colSpan={visibleColumns.length + 1} className="py-4 px-6 scale-in-center">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {hiddenColumns.map((col, i) => (
                                  <div key={i} className="flex flex-col gap-1 border-l-2 border-slate-700 pl-3">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{col.header}</span>
                                    <div className="text-sm text-slate-300">
                                      {typeof col.accessor === 'function'
                                        ? (() => {
                                            try { return col.accessor(item) }
                                            catch (e) { return <span className="text-red-500 text-[10px]">Error</span> }
                                          })()
                                        : (item[col.accessor] as ReactNode)}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={visibleColumns.length + (hasHiddenColumns ? 1 : 0)} className="text-center py-12 text-slate-500 italic">
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
