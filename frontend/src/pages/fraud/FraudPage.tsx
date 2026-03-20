import { useEffect, useState } from 'react'
import { fraudApi } from '../../services/api'
import type { FraudAlert } from '../../types'
import { Shield, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import { format } from 'date-fns'

const severityColor: Record<string, string> = {
  low: 'text-blue-400 bg-blue-900/30', medium: 'text-yellow-400 bg-yellow-900/30',
  high: 'text-orange-400 bg-orange-900/30', critical: 'text-red-400 bg-red-900/30',
}

export default function FraudPage() {
  const [alerts, setAlerts] = useState<{ data: FraudAlert[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('open')

  const load = async () => {
    setLoading(true)
    try { const res = await fraudApi.listAlerts({ status: statusFilter }); setAlerts(res.data) }
    catch {} finally { setLoading(false) }
  }

  useEffect(() => { load() }, [statusFilter])

  const resolve = async (id: number, status: string) => {
    try {
      await fraudApi.resolveAlert(id, { status })
      toast.success('Alert status updated')
      load()
    } catch { toast.error('Failed to update alert') }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Fraud Detection</h1>
          <p className="text-slate-400 text-sm">Monitor and resolve fraud alerts</p>
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="fmis-select w-40">
          <option value="open">Open alerts</option>
          <option value="investigating">Investigating</option>
          <option value="resolved">Resolved</option>
          <option value="false_positive">False positive</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-blue-500" size={28} /></div>
      ) : (
        <div className="space-y-3">
          {alerts?.data.map((alert: FraudAlert) => (
            <div key={alert.id} className="glass-card p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-3">
                  <div className={clsx('p-2 rounded-lg shrink-0', severityColor[alert.severity])}>
                    <Shield size={18} />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-200">{alert.rule?.name}</p>
                    <p className="text-sm text-slate-400 mt-0.5">{alert.details}</p>
                    <p className="text-xs text-slate-500 mt-1">{format(new Date(alert.created_at), 'dd MMM yyyy HH:mm')}</p>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  {alert.status === 'open' && <>
                    <button onClick={() => resolve(alert.id, 'false_positive')} className="btn-ghost text-xs">False positive</button>
                    <button onClick={() => resolve(alert.id, 'resolved')} className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-900/40 text-emerald-400 hover:bg-emerald-900 rounded text-xs font-medium transition-colors">
                      <CheckCircle size={12} /> Resolve
                    </button>
                  </>}
                  {alert.status !== 'open' && <span className="text-xs text-slate-500 capitalize">{alert.status.replace('_', ' ')}</span>}
                </div>
              </div>
            </div>
          ))}
          {(alerts?.data.length ?? 0) === 0 && (
            <div className="glass-card p-12 text-center text-slate-500">
              <Shield size={40} className="mx-auto mb-3 text-emerald-500/30" />
              No {statusFilter} alerts found
            </div>
          )}
        </div>
      )}
    </div>
  )
}
