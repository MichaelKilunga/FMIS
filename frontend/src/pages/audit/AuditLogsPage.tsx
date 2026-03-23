import { useEffect, useState } from 'react'
import { auditLogsApi } from '../../services/api'
import type { AuditLog } from '../../types'
import { Activity, Loader2, Search } from 'lucide-react'
import { format } from 'date-fns'
import clsx from 'clsx'

import DataTable from '../../components/DataTable'
import type { PaginatedData } from '../../types'
import { useAuthStore } from '../../store'

const actionColors: Record<string, string> = {
  user_login: 'text-blue-400', user_logout: 'text-slate-400',
  transaction_created: 'text-emerald-400', transaction_updated: 'text-yellow-400',
  transaction_deleted: 'text-red-400', approval_completed: 'text-emerald-400',
  approval_rejected: 'text-red-400', invoice_created: 'text-blue-400',
  branding_updated: 'text-purple-400',
}

export default function AuditLogsPage() {
  const { user } = useAuthStore()
  const isSystemAdmin = !user?.tenant_id && user?.permissions?.includes('manage-tenants')

  const [data, setData] = useState<PaginatedData<AuditLog> | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  const load = (page = 1) => {
    setLoading(true)
    auditLogsApi.list({ action: search || undefined, page }).then(res => {
      setData(res.data)
      setCurrentPage(page)
    }).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => { load(1) }, [search])

  const columns = [
    {
      header: 'Action',
      accessor: (log: AuditLog) => <span className={clsx('text-xs font-mono font-semibold', actionColors[log.action] || 'text-slate-300')}>{log.action}</span>
    },
    {
      header: 'User',
      accessor: (log: AuditLog) => (
        <div className="flex flex-col">
            <span className="text-slate-300 font-medium">{log.user?.name || 'System'}</span>
            {isSystemAdmin && log.tenant && (
                <span className="text-[10px] text-blue-400 uppercase font-bold tracking-tighter">{log.tenant.name}</span>
            )}
        </div>
      )
    },
    {
      header: 'Model',
      priority: 'mobile-hidden' as const,
      accessor: (log: AuditLog) => (
        <span className="text-slate-500 text-xs">
          {log.model_type ? `${log.model_type.split('\\').pop()} #${log.model_id}` : '—'}
        </span>
      )
    },
    {
      header: 'IP',
      priority: 'mobile-hidden' as const,
      accessor: (log: AuditLog) => <span className="text-slate-500 text-xs font-mono">{log.ip_address || '—'}</span>
    },
    {
      header: 'Timestamp',
      accessor: (log: AuditLog) => <span className="text-slate-500 text-xs">{format(new Date(log.created_at), 'dd MMM yy HH:mm:ss')}</span>
    }
  ]

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">Audit Trail</h1>
        <p className="text-slate-400 text-sm">Immutable log of all system actions</p>
      </div>

      <div className="glass-card p-4 flex gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter by action..." className="fmis-input pl-9" />
        </div>
      </div>

      <DataTable 
        columns={columns as any}
        data={data}
        loading={loading}
        onPageChange={load}
        emptyMessage="No audit logs found"
      />

      <p className="text-xs text-slate-600 text-center">Audit logs are immutable and cannot be modified or deleted.</p>
    </div>
  )
}
