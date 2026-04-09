import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { createPortal } from 'react-dom'
import { approvalsApi } from '../../services/api'
import { useAuthStore } from '../../store'
import type { Approval, PaginatedResponse } from '../../types'
import {
  CheckCircle, XCircle, Loader2, Clock, User, DollarSign,
  FileText, GitBranch, ArrowRight, Filter, Calendar, RefreshCw,
  AlertCircle, ChevronDown, ChevronUp, MessageSquare, ShieldCheck, ShieldOff,
  SquareCheck, Square, Settings, ShieldAlert
} from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import clsx from 'clsx'
import Pagination from '../../components/Pagination'
import { useCurrency } from '../../hooks/useCurrency'

// ─── Types ───────────────────────────────────────────────────────────────────

type ActionModal = {
  id?: number
  ids?: number[]
  action: 'approve' | 'reject' | 'resolve'
}

type MyActionTab = 'all' | 'pending_my_action' | 'i_acted'

const MY_ACTION_TABS: { key: MyActionTab; label: string }[] = [
  { key: 'all',               label: 'All' },
  { key: 'pending_my_action', label: 'Need My Action' },
  { key: 'i_acted',           label: 'I Already Acted' },
]

// ─── Component ───────────────────────────────────────────────────────────────

export default function ApprovalsPage() {
  const { t } = useTranslation()
  const { formatCurrency } = useCurrency()
  const { user } = useAuthStore()

  // List state
  const [data, setData] = useState<PaginatedResponse<Approval> | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)

  // Filtering
  const [myActionTab, setMyActionTab] = useState<MyActionTab>('pending_my_action')
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFrom, setDateFrom]         = useState('')
  const [dateTo, setDateTo]             = useState('')
  const [stepFilter, setStepFilter]     = useState('')
  const [showFilters, setShowFilters]   = useState(false)

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

  // Modal & Progress
  const [modal, setModal]             = useState<ActionModal | null>(null)
  const [comment, setComment]         = useState('')
  const [resolveAction, setResolveAction] = useState<'approved' | 'rejected'>('approved')
  const [acting, setActing]           = useState(false)
  const [progress, setProgress]       = useState({ current: 0, total: 0 })
  const [actionError, setActionError] = useState<string | null>(null)

  // Expanded audit logs
  const [expandedLogs, setExpandedLogs] = useState<Set<number>>(new Set())

  const isAdmin = !!(user?.roles?.includes('admin') || user?.permissions?.includes('manage-workflows'))

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const someSelected = selectedIds.size > 0
  const advancedFiltersCount = [statusFilter, dateFrom, dateTo, stepFilter].filter(Boolean).length

  // ── Data loading ────────────────────────────────────────────────────────────

  const load = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const params: Record<string, unknown> = { page }
      if (statusFilter)              params.status    = statusFilter
      if (dateFrom)                  params.from      = dateFrom
      if (dateTo)                    params.to        = dateTo
      if (stepFilter)                params.step      = Number(stepFilter)
      if (myActionTab !== 'all')     params.my_action = myActionTab
      const res = await approvalsApi.list(params)
      setData(res.data)
      setCurrentPage(page)
      setSelectedIds(new Set())
    } catch {
      toast.error('Failed to load approvals')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, dateFrom, dateTo, stepFilter, myActionTab])

  useEffect(() => { load(1) }, [load])

  // ── Modal helpers ───────────────────────────────────────────────────────────

  const openModal = (action: ActionModal['action'], id?: number, ids?: number[]) => {
    setModal({ id, ids, action })
    setComment('')
    setActionError(null)
    setActing(false)
    setResolveAction('approved')
    setProgress({ current: 0, total: ids?.length || 1 })
  }

  const closeModal = () => {
    if (acting) return
    setModal(null)
    setComment('')
  }

  // ── Action handler ──────────────────────────────────────────────────────────

  const handleAction = async () => {
    if (!modal) return
    setActing(true)
    setActionError(null)

    const isBulk    = !!modal.ids?.length
    const targetIds = isBulk ? modal.ids! : [modal.id!]
    
    setProgress({ current: 0, total: targetIds.length })
    const succeededIds: number[] = []

    try {
      if (modal.action === 'resolve') {
        const id = targetIds[0]
        await approvalsApi.resolve(id, resolveAction, comment)
        succeededIds.push(id)
        toast.success(`Request administratively ${resolveAction}`)
      } else if (isBulk) {
        // --- Enhanced Bulk API Integration ---
        try {
          const resp = await approvalsApi.bulk(targetIds, modal.action === 'approve' ? 'approve' : 'reject', comment)
          const { succeeded, failed } = resp.data.results
          succeededIds.push(...succeeded)
          
          if (succeeded.length > 0) {
            toast.success(`${succeeded.length} items processed successfully`)
          }
          if (failed.length > 0) {
            toast.error(`${failed.length} items failed to process`)
          }
        } catch (err: any) {
          setActionError(err.response?.data?.message || 'Bulk action failed')
          setActing(false)
          return
        }
      } else {
        // Single Approve/Reject logic
        try {
          if (modal.action === 'approve') await approvalsApi.approve(targetIds[0], comment || undefined)
          else await approvalsApi.reject(targetIds[0], comment)
          succeededIds.push(targetIds[0])
          toast.success('Item processed')
        } catch (e) {
          console.error(`ID #${targetIds[0]} failed:`, e)
        }
      }

      // Update Local Table State
      if (succeededIds.length > 0) {
        setData(prev => {
          if (!prev) return prev
          if (myActionTab === 'pending_my_action') {
            return {
              ...prev,
              data: prev.data.filter(a => !succeededIds.includes(a.id)),
              total: Math.max(0, prev.total - succeededIds.length)
            }
          }
          return {
            ...prev,
            data: prev.data.map(a =>
              succeededIds.includes(a.id)
                ? ({
                    ...a,
                    has_user_acted: true,
                    user_action: modal.action === 'resolve' ? (resolveAction === 'approved' ? 'approved' : 'rejected') : (modal.action === 'approve' ? 'approved' : 'rejected'),
                    user_acted_at: new Date().toISOString(),
                    status: modal.action === 'resolve' ? resolveAction : a.status
                  } as Approval)
                : a
            ),
          }
        })
        setSelectedIds(prev => {
          const next = new Set(prev)
          succeededIds.forEach(id => next.delete(id))
          return next
        })
      }

      setActing(false)
      setModal(null)
    } catch (e: any) {
      setActionError(e?.response?.data?.message || 'Action failed.')
      setActing(false)
    }
  }

  const toggleLogs = (id: number) => {
    setExpandedLogs(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const fmt = (n: number, currency?: string) => formatCurrency(n, currency)

  return (
    <div className="space-y-5 pb-32">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tighter">Workflow Approvals</h1>
          <p className="text-slate-500 text-sm font-medium">Verify balances and authorize financial movements</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => load(currentPage)} disabled={loading} className="p-2.5 rounded-xl border border-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-800 transition-all">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setShowFilters(v => !v)} className={clsx('flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-bold transition-all', showFilters ? 'bg-blue-600/10 border-blue-500 text-blue-400' : 'border-slate-700/50 text-slate-400 hover:border-slate-600')}>
            <Filter size={15} /> Filters {advancedFiltersCount > 0 && `(${advancedFiltersCount})`}
          </button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="glass-card p-1 flex gap-1 bg-slate-900/40 border-slate-800/60">
        {MY_ACTION_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => { setMyActionTab(tab.key); setStatusFilter(''); setSelectedIds(new Set()) }}
            className={clsx(
              'flex-1 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2',
              myActionTab === tab.key ? 'bg-blue-600 shadow-lg shadow-blue-900/30 text-white' : 'text-slate-500 hover:bg-slate-800/40 hover:text-slate-300'
            )}
          >
            {tab.key === 'pending_my_action' ? <Clock size={16} /> : <ShieldCheck size={16} />}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      {loading && !data ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-500" size={32} /></div>
      ) : (
        <div className="space-y-4">
          {(data?.data ?? []).map(approval => {
            const approvable = approval.approvable as any
            const isSelected = selectedIds.has(approval.id)
            const canAct     = approval.status === 'pending' && !approval.has_user_acted

            return (
              <div key={approval.id} className={clsx(
                'glass-card p-6 transition-all group border-slate-800/40',
                isSelected && 'ring-2 ring-blue-500 bg-blue-900/5',
                approval.has_user_acted && 'border-emerald-500/20'
              )}>
                <div className="flex gap-5">
                   {canAct && (
                     <button onClick={() => toggleSelect(approval.id)} className="mt-1">
                        {isSelected ? <SquareCheck size={22} className="text-blue-500" /> : <Square size={22} className="text-slate-800 group-hover:text-slate-600 transition-colors" />}
                     </button>
                   )}
                   <div className="flex-1 space-y-5">
                      <div className="flex flex-wrap justify-between items-start gap-3">
                         <div className="flex gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
                               <FileText size={22} className="text-slate-500" />
                            </div>
                            <div>
                               <h3 className="font-bold text-lg text-white leading-tight">{approvable?.description || 'Approval Request'}</h3>
                               <p className="text-[10px] text-slate-500 mt-1.5 uppercase font-black tracking-widest flex items-center gap-2">
                                  Ref #{approval.id} · {format(new Date(approval.created_at), 'dd MMM yyyy')}
                                  {isAdmin && (
                                     <button onClick={() => openModal('resolve', approval.id)} title="Resolve Stuck Case" className="p-1 text-slate-600 hover:text-amber-500 transition-colors">
                                        <Settings size={14} />
                                     </button>
                                  )}
                               </p>
                            </div>
                         </div>
                         <div className="flex items-center gap-2">
                            <span className={clsx(
                               'px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border',
                               approval.status === 'pending' ? 'bg-amber-900/20 text-amber-500 border-amber-900/30' : 
                               approval.status === 'approved' ? 'bg-emerald-900/20 text-emerald-500 border-emerald-900/30' : 'bg-red-900/20 text-red-500 border-red-900/30'
                            )}>
                               {approval.status}
                            </span>
                         </div>
                      </div>

                      {/* Mini Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="space-y-1">
                           <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Amount</span>
                           <p className="text-base font-black text-white">{fmt(approvable?.amount, approvable?.currency)}</p>
                        </div>
                        <div className="space-y-1">
                           <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Requester</span>
                           <p className="text-sm font-bold text-slate-300 truncate">{approvable?.createdBy?.name || 'Staff'}</p>
                        </div>
                        <div className="space-y-1">
                           <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Step Progress</span>
                           <div className="flex items-center gap-2 text-sm font-black text-blue-500">
                              <span className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                                 <div className="h-full bg-blue-500" style={{ width: `${(approval.current_step / (approval.workflow?.steps?.length || 1)) * 100}%` }} />
                              </span>
                              Step {approval.current_step}
                           </div>
                        </div>
                        <div className="space-y-1">
                           <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Created At</span>
                           <p className="text-sm font-bold text-slate-300">{format(new Date(approval.created_at), 'HH:mm')}</p>
                        </div>
                      </div>

                      {/* Acted Banner */}
                      {approval.has_user_acted && (
                        <div className={clsx(
                          'flex items-center gap-3 p-3.5 rounded-2xl border text-sm font-black',
                          approval.user_action === 'approved' ? 'bg-emerald-900/10 border-emerald-900/20 text-emerald-500' : 'bg-red-900/10 border-red-900/20 text-red-500'
                        )}>
                          {approval.user_action === 'approved' ? <ShieldCheck size={18} /> : <ShieldOff size={18} />}
                          Authorized {approval.user_action} {approval.user_acted_at && `· ${format(new Date(approval.user_acted_at), 'dd MMM')}`}
                        </div>
                      )}

                      {/* Manual Resolution Info */}
                      {(approval as any).logs?.some((l: any) => l.action.startsWith('resolved')) && (
                         <div className="bg-amber-900/10 border border-amber-900/30 p-3.5 rounded-2xl flex items-center gap-3 text-sm font-bold text-amber-500">
                            <ShieldAlert size={18} /> Forced Resolution (Administrative Bypass Active)
                         </div>
                      )}

                      {/* Individual Actions */}
                      {canAct && !isSelected && (
                        <div className="flex justify-end gap-3 pt-5 border-t border-slate-800/60">
                           <button onClick={() => openModal('reject', approval.id)} className="px-6 py-2 text-sm font-bold text-red-500 hover:bg-red-900/10 rounded-xl transition-all">Reject</button>
                           <button onClick={() => openModal('approve', approval.id)} className="px-8 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-black rounded-xl shadow-lg shadow-blue-900/30 transition-all">Approve Request</button>
                        </div>
                      )}
                   </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Floating Bulk Bar */}
      {someSelected && createPortal(
         <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[9000] animate-in slide-in-from-bottom-5">
            <div className="bg-slate-900 border border-slate-600 shadow-2xl rounded-3xl p-5 flex items-center gap-8 backdrop-blur-3xl bg-opacity-80">
               <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Queue Size</p>
                  <p className="text-xl font-black text-white">{selectedIds.size} Requests</p>
               </div>
               <div className="flex gap-2.5">
                  <button onClick={() => openModal('reject', undefined, Array.from(selectedIds))} className="px-6 py-3 bg-red-600/10 border border-red-600/30 text-red-600 hover:bg-red-600 hover:text-white transition-all text-xs font-black rounded-2xl">Reject All</button>
                  <button onClick={() => openModal('approve', undefined, Array.from(selectedIds))} className="px-10 py-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black rounded-2xl shadow-xl shadow-blue-900/20 transition-all">Approve Selected</button>
               </div>
            </div>
         </div>,
         document.body
      )}

      {/* Unified Action Modal */}
      {modal && createPortal(
         <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center z-[10000] p-4">
            <div className="glass-card p-10 w-full max-w-xl shadow-2xl animate-in zoom-in-95 border border-slate-700/50">
               <div className="flex items-center gap-3 mb-6">
                  <div className={clsx('w-12 h-12 rounded-2xl flex items-center justify-center', 
                    modal.action === 'resolve' ? 'bg-amber-900/20 text-amber-500' : 
                    modal.action === 'approve' ? 'bg-blue-900/20 text-blue-500' : 'bg-red-900/20 text-red-500'
                  )}>
                    {modal.action === 'resolve' ? <ShieldAlert size={24} /> : modal.action === 'approve' ? <CheckCircle size={24} /> : <XCircle size={24} />}
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white uppercase tracking-tighter">
                      {modal.action === 'resolve' ? 'Admin Resolution' : modal.action === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
                    </h3>
                    <p className="text-slate-500 font-bold text-sm tracking-tight">
                      {modal.action === 'resolve' ? 'Force state manual override' : `Processing ${progress.total} request(s)`}
                    </p>
                  </div>
               </div>

               {modal.action === 'resolve' && (
                  <div className="mb-6 space-y-3">
                     <p className="text-sm font-bold text-amber-500/80 bg-amber-900/10 border border-amber-900/30 p-4 rounded-2xl leading-relaxed">
                        ⚠️ <span className="underline">Warning:</span> Administrative Resolution bypasses all workflow rules and role requirements. 
                        Use this only for technical glitches or "stuck" transactions.
                     </p>
                     <div className="flex gap-4 p-1 bg-slate-900/60 rounded-2xl border border-slate-800">
                        {(['approved', 'rejected'] as const).map(act => (
                           <button key={act} onClick={() => setResolveAction(act)} className={clsx(
                             'flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all',
                             resolveAction === act ? (act === 'approved' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-red-600 text-white shadow-lg') : 'text-slate-500 hover:text-slate-300'
                           )}>
                             {act}
                           </button>
                        ))}
                     </div>
                  </div>
               )}

               {acting && (
                 <div className="mb-10 bg-slate-900/50 border border-slate-800 p-6 rounded-3xl">
                    <div className="flex justify-between items-end mb-4 font-black">
                       <span className="text-[10px] text-blue-500 uppercase tracking-widest">Global Progress</span>
                       <span className="text-lg text-white">{progress.current} / {progress.total}</span>
                    </div>
                    <div className="h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700/40">
                       <div className="h-full bg-blue-500 transition-all duration-700" style={{ width: `${(progress.current / progress.total) * 100}%` }} />
                    </div>
                 </div>
               )}

               <textarea
                 value={comment}
                 onChange={e => setComment(e.target.value)}
                 placeholder={modal.action === 'resolve' ? "Detailed explanation for resolution record..." : "Optional comment..."}
                 className="fmis-input min-h-[140px] mb-8 p-5 text-base border-slate-800 hover:border-slate-700 focus:border-blue-500/50"
                 disabled={acting}
               />

               {actionError && (
                 <div className="flex gap-3 p-4 mb-8 bg-red-950/40 border border-red-900/50 rounded-2xl text-sm text-red-300 font-bold">
                    <AlertCircle size={20} className="shrink-0" /> <p>{actionError}</p>
                 </div>
               )}

               <div className="flex gap-4 justify-end">
                  <button onClick={closeModal} className="px-6 py-4 font-black text-slate-500 hover:text-slate-300 uppercase text-xs tracking-widest transition-all" disabled={acting}>Cancel</button>
                  <button onClick={handleAction} disabled={acting || (modal.action === 'reject' && !comment.trim()) || (modal.action === 'resolve' && !comment.trim())} className={clsx(
                    'px-12 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl transition-all active:scale-95',
                    modal.action === 'resolve' ? 'bg-amber-600 text-white shadow-amber-900/30' : 
                    modal.action === 'approve' ? 'bg-blue-600 text-white shadow-blue-900/30' : 'bg-red-600 text-white shadow-red-900/30'
                  )}>
                    {acting ? <Loader2 className="animate-spin" size={18} /> : `Confirm ${modal.action}`}
                  </button>
               </div>
            </div>
         </div>,
         document.body
      )}

      {data && <Pagination currentPage={currentPage} lastPage={data.last_page} total={data.total} perPage={data.per_page} loading={loading} onPageChange={load} />}
    </div>
  )
}
