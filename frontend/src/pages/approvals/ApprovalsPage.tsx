import { useEffect, useState } from 'react'
import { approvalsApi } from '../../services/api'
import type { Approval, PaginatedResponse } from '../../types'
import { CheckCircle, XCircle, Loader2, Clock, User, DollarSign, FileText, GitBranch, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import clsx from 'clsx'
import Pagination from '../../components/Pagination'
import { useCurrency } from '../../hooks/useCurrency'

export default function ApprovalsPage() {
  const { formatCurrency } = useCurrency()
  const [data, setData] = useState<PaginatedResponse<Approval> | null>(null)
  const [loading, setLoading] = useState(true)
  const [commenting, setCommenting] = useState<{ id: number; action: 'approve' | 'reject' } | null>(null)
  const [comment, setComment] = useState('')
  const [acting, setActing] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  const load = async (page = 1) => {
    setLoading(true)
    try {
      const res = await approvalsApi.list({ status: 'pending', page })
      setData(res.data)
      setCurrentPage(page)
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { load(1) }, [])

  const handleAction = async () => {
    if (!commenting) return
    setActing(true)
    try {
      if (commenting.action === 'approve') await approvalsApi.approve(commenting.id, comment)
      else await approvalsApi.reject(commenting.id, comment)
      toast.success(commenting.action === 'approve' ? '✅ Approved successfully' : '❌ Rejected')
      setCommenting(null); setComment(''); load()
    } catch (e: unknown) {
      toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Action failed')
    } finally {
      setActing(false)
    }
  }

  const fmt = (n: number, currency?: string) =>
    formatCurrency(n, currency)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">Approvals</h1>
        <p className="text-slate-400 text-sm">Review and act on pending approval requests</p>
      </div>

      {/* Summary badge */}
      {!loading && (data?.data.length ?? 0) > 0 && (
        <div className="flex items-center gap-2 text-sm text-amber-400 bg-amber-900/20 border border-amber-800/40 rounded-lg px-4 py-2.5">
          <Clock size={15} className="shrink-0" />
          <span><strong>{data?.data.length}</strong> pending approval{data!.data.length !== 1 ? 's' : ''} require{data!.data.length === 1 ? 's' : ''} your attention.</span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-blue-500" size={28} /></div>
      ) : (
        <div className="space-y-4">
          {data?.data.map(approval => {
            const approvable = approval.approvable as Record<string, any> | null
            const amount = approvable?.amount
            const currency = approvable?.currency
            const description = approvable?.description
            const txType = approvable?.type
            const txDate = approvable?.transaction_date
            
            // Robust requester name extraction
            const requesterData = approvable?.created_by_user ?? approvable?.createdBy ?? approvable?.created_by
            let requesterName = 'Unknown User'
            
            if (typeof requesterData === 'object' && requesterData !== null) {
              requesterName = requesterData.name || `User #${requesterData.id || '?'}`
            } else if (requesterData) {
              requesterName = `User #${requesterData}`
            }
            
            const steps = approval.workflow?.steps ?? []
            const currentStepInfo = steps.find((s: any) => s.step_order === approval.current_step)

            return (
              <div key={approval.id} className="glass-card p-5 space-y-4">
                {/* Header row */}
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-900/30 border border-blue-800/50 flex items-center justify-center shrink-0">
                      <FileText size={18} className="text-blue-400" />
                    </div>
                    <div>
                      <p className="text-white font-semibold text-base">
                        {description || `Approval Request #${approval.id}`}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Approval #{approval.id} · {format(new Date((approval as any).created_at), 'dd MMM yyyy, HH:mm')}
                      </p>
                    </div>
                  </div>
                  {/* Status badge */}
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-900/30 text-amber-400 border border-amber-800/40 flex items-center gap-1.5">
                    <Clock size={11} /> Pending
                  </span>
                </div>

                {/* Details grid */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {/* Amount */}
                  {amount != null && (
                    <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
                      <p className="text-xs text-slate-500 flex items-center gap-1 mb-1"><DollarSign size={11} /> Amount</p>
                      <p className={clsx('text-sm font-bold', txType === 'income' ? 'text-emerald-400' : 'text-red-400')}>
                        {txType === 'income' ? '+' : '-'}{fmt(amount, currency)}
                      </p>
                    </div>
                  )}
                  {/* Type */}
                  {txType && (
                    <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
                      <p className="text-xs text-slate-500 mb-1">Type</p>
                      <span className={clsx('text-xs font-semibold px-2 py-0.5 rounded-full capitalize',
                        txType === 'income' ? 'bg-emerald-900/50 text-emerald-400' : 'bg-red-900/50 text-red-400')}>
                        {txType}
                      </span>
                    </div>
                  )}
                  {/* Requested by */}
                  <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
                    <p className="text-xs text-slate-500 flex items-center gap-1 mb-1"><User size={11} /> Requested by</p>
                    <p className="text-sm text-slate-200 font-medium truncate">{requesterName}</p>
                  </div>
                  {/* Date */}
                  {txDate && (
                    <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
                      <p className="text-xs text-slate-500 flex items-center gap-1 mb-1"><Clock size={11} /> Transaction Date</p>
                      <p className="text-sm text-slate-200">{format(new Date(txDate), 'dd MMM yyyy')}</p>
                    </div>
                  )}
                </div>

                {/* Workflow steps indicator */}
                <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/40">
                  <div className="flex items-center gap-2 mb-2">
                    <GitBranch size={13} className="text-blue-400" />
                    <p className="text-xs text-slate-400">
                      Workflow: <span className="text-blue-400 font-medium">{approval.workflow?.name}</span>
                      {' · '}Step {approval.current_step} of {steps.length}
                    </p>
                  </div>
                  {steps.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {steps.map((s: any, idx: number) => {
                        const isPast = s.step_order < approval.current_step
                        const isCurrent = s.step_order === approval.current_step
                        return (
                          <div key={s.id ?? idx} className="flex items-center gap-1.5">
                            <div className={clsx(
                              'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border',
                              isPast ? 'bg-emerald-900/30 text-emerald-400 border-emerald-800/50' :
                              isCurrent ? 'bg-blue-900/40 text-blue-300 border-blue-700/60 ring-1 ring-blue-500/40' :
                              'bg-slate-800 text-slate-500 border-slate-700'
                            )}>
                              {isPast && <CheckCircle size={10} />}
                              {isCurrent && <Clock size={10} />}
                              <span className="capitalize">{s.role_name}</span>
                            </div>
                            {idx < steps.length - 1 && <ArrowRight size={12} className="text-slate-600" />}
                          </div>
                        )
                      })}
                    </div>
                  )}
                  {currentStepInfo && (
                    <p className="text-xs text-slate-500 mt-2">
                      Awaiting action from: <span className="text-slate-300 capitalize font-medium">{currentStepInfo.role_name}</span>
                    </p>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 justify-end pt-1 border-t border-slate-700/30">
                  <button
                    onClick={() => setCommenting({ id: approval.id, action: 'reject' })}
                    className="flex items-center gap-1.5 px-4 py-2 bg-red-900/30 text-red-400 hover:bg-red-900/60 border border-red-800/40 rounded-lg text-sm font-medium transition-colors">
                    <XCircle size={15} /> Reject
                  </button>
                  <button
                    onClick={() => setCommenting({ id: approval.id, action: 'approve' })}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-900/30 text-emerald-400 hover:bg-emerald-900/60 border border-emerald-800/40 rounded-lg text-sm font-medium transition-colors">
                    <CheckCircle size={15} /> Approve
                  </button>
                </div>
              </div>
            )
          })}

          {(data?.data.length ?? 0) === 0 && (
            <div className="glass-card p-12 text-center">
              <CheckCircle size={44} className="mx-auto mb-3 text-emerald-500/40" />
              <p className="text-slate-400 font-medium">All caught up!</p>
              <p className="text-slate-600 text-sm mt-1">No pending approvals at this time.</p>
            </div>
          )}

          {data && (
            <Pagination 
              currentPage={data.current_page}
              lastPage={data.last_page}
              total={data.total}
              perPage={data.per_page}
              loading={loading}
              onPageChange={load}
            />
          )}
        </div>
      )}

      {/* Comment / Confirm Modal */}
      {commenting && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-[10000] p-4">
          <div className="glass-card p-6 w-full max-w-md animate-fade-in">
            <h3 className={clsx('text-lg font-semibold mb-1', commenting.action === 'approve' ? 'text-emerald-400' : 'text-red-400')}>
              {commenting.action === 'approve' ? '✅ Confirm Approval' : '❌ Confirm Rejection'}
            </h3>
            <p className="text-slate-400 text-sm mb-4">
              {commenting.action === 'approve'
                ? 'Optionally leave a comment before approving.'
                : 'Please provide a reason for rejection.'}
            </p>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder={commenting.action === 'reject' ? 'Rejection reason (required)...' : 'Optional comment...'}
              className="fmis-input h-24 resize-none mb-4"
            />
            <div className="flex gap-3 justify-end">
              <button onClick={() => { setCommenting(null); setComment('') }} className="btn-ghost">Cancel</button>
              <button
                onClick={handleAction}
                disabled={acting || (commenting.action === 'reject' && !comment.trim())}
                className={clsx(
                  'flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors disabled:opacity-50',
                  commenting.action === 'approve'
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-red-600 hover:bg-red-700 text-white'
                )}>
                {acting ? <Loader2 size={14} className="animate-spin" /> : commenting.action === 'approve' ? <CheckCircle size={14} /> : <XCircle size={14} />}
                Confirm {commenting.action === 'approve' ? 'Approval' : 'Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
