import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { createPortal } from 'react-dom'
import { approvalsApi } from '../../services/api'
import type { Approval, PaginatedResponse } from '../../types'
import {
  CheckCircle, XCircle, Loader2, Clock, User, DollarSign,
  FileText, GitBranch, ArrowRight, Filter, Calendar, RefreshCw,
  AlertCircle, ChevronDown, ChevronUp, MessageSquare, ShieldCheck, ShieldOff,
  SquareCheck, Square, Minus,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import clsx from 'clsx'
import Pagination from '../../components/Pagination'
import { useCurrency } from '../../hooks/useCurrency'

// ─── Types ───────────────────────────────────────────────────────────────────

type ActionModal = {
  /** Single-item mode: id is set, ids is [] */
  id?: number
  /** Bulk mode: ids has multiple items, id is undefined */
  ids?: number[]
  action: 'approve' | 'reject'
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

  // List state
  const [data, setData] = useState<PaginatedResponse<Approval> | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)

  // Tab
  const [myActionTab, setMyActionTab] = useState<MyActionTab>('pending_my_action')

  // Advanced filters
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFrom, setDateFrom]         = useState('')
  const [dateTo, setDateTo]             = useState('')
  const [stepFilter, setStepFilter]     = useState('')
  const [showFilters, setShowFilters]   = useState(false)

  // Selection (bulk)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

  // Modal
  const [modal, setModal]             = useState<ActionModal | null>(null)
  const [comment, setComment]         = useState('')
  const [acting, setActing]           = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  // Expanded audit logs per card
  const [expandedLogs, setExpandedLogs] = useState<Set<number>>(new Set())

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
      setSelectedIds(new Set()) // clear selection on page change
    } catch {
      toast.error('Failed to load approvals')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, dateFrom, dateTo, stepFilter, myActionTab])

  useEffect(() => { load(1) }, [load])

  // ── Selection helpers ───────────────────────────────────────────────────────

  // Actionable = pending overall AND user hasn't acted yet
  const actionableItems = (data?.data ?? []).filter(
    a => a.status === 'pending' && !a.has_user_acted
  )

  const allActionableSelected =
    actionableItems.length > 0 &&
    actionableItems.every(a => selectedIds.has(a.id))

  const someSelected = selectedIds.size > 0

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (allActionableSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(actionableItems.map(a => a.id)))
    }
  }

  // ── Modal helpers ───────────────────────────────────────────────────────────

  const openSingleModal = (id: number, action: 'approve' | 'reject') => {
    setModal({ id, action })
    setComment('')
    setActionError(null)
  }

  const openBulkModal = (action: 'approve' | 'reject') => {
    setModal({ ids: Array.from(selectedIds), action })
    setComment('')
    setActionError(null)
  }

  const closeModal = () => {
    if (acting) return
    setModal(null)
    setComment('')
    setActionError(null)
  }

  // ── Action handler ──────────────────────────────────────────────────────────

  const handleAction = async () => {
    if (!modal) return
    setActing(true)
    setActionError(null)

    const isBulk = !!modal.ids?.length
    const targetIds = isBulk ? modal.ids! : [modal.id!]

    try {
      if (isBulk) {
        // ── Bulk ──
        const res = await approvalsApi.bulkAction(targetIds, modal.action, comment || undefined)
        const succeededIds: number[] = res.data.succeeded ?? []
        toast.success(res.data.message)

        if (myActionTab === 'pending_my_action') {
          // Remove succeeded items from list
          setData(prev => {
            if (!prev) return prev
            const filtered = prev.data.filter(a => !succeededIds.includes(a.id))
            return { ...prev, data: filtered, total: Math.max(0, prev.total - succeededIds.length) }
          })
        } else {
          // Mark acted on
          setData(prev => {
            if (!prev) return prev
            return {
              ...prev,
              data: prev.data.map(a =>
                succeededIds.includes(a.id)
                  ? ({
                      ...a,
                      has_user_acted: true,
                      user_action: modal.action === 'approve' ? 'approved' : 'rejected',
                      user_acted_at: new Date().toISOString(),
                    } satisfies Approval)
                  : a
              ),
            }
          })
        }
        setSelectedIds(new Set())
      } else {
        // ── Single ──
        const id = modal.id!
        if (modal.action === 'approve') {
          await approvalsApi.approve(id, comment || undefined)
        } else {
          await approvalsApi.reject(id, comment)
        }
        toast.success(modal.action === 'approve' ? 'Approved successfully' : 'Rejected successfully')

        if (myActionTab === 'pending_my_action') {
          setData(prev => {
            if (!prev) return prev
            return { ...prev, data: prev.data.filter(a => a.id !== id), total: Math.max(0, prev.total - 1) }
          })
        } else {
          setData(prev => {
            if (!prev) return prev
            return {
              ...prev,
              data: prev.data.map(a =>
                a.id === id
                  ? ({
                      ...a,
                      has_user_acted: true,
                      user_action: modal.action === 'approve' ? 'approved' : 'rejected',
                      user_acted_at: new Date().toISOString(),
                    } satisfies Approval)
                  : a
              ),
            }
          })
        }
        setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n })
      }

      setModal(null)
      setComment('')
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Action failed. Please try again.'
      setActionError(msg)
    } finally {
      setActing(false)
    }
  }

  // ── Misc helpers ────────────────────────────────────────────────────────────

  const toggleLogs = (id: number) => {
    setExpandedLogs(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const fmt = (n: number, currency?: string) => formatCurrency(n, currency)
  const advancedFiltersCount = [statusFilter, dateFrom, dateTo, stepFilter].filter(Boolean).length

  const isBulkModal = modal && !!modal.ids?.length
  const targetCount = isBulkModal ? modal.ids!.length : 1

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5 pb-28"> {/* pb-28 leaves room for the floating bulk bar */}

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {t('approvals.title', { defaultValue: 'Approvals' })}
          </h1>
          <p className="text-slate-400 text-sm">
            {t('approvals.description', { defaultValue: 'Review and act on approval requests' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => load(currentPage)}
            disabled={loading}
            title="Refresh"
            className="p-2 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:border-slate-600 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setShowFilters(v => !v)}
            className={clsx(
              'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors',
              showFilters
                ? 'bg-blue-900/30 border-blue-700/60 text-blue-300'
                : 'border-slate-700 text-slate-400 hover:text-white hover:border-slate-600'
            )}
          >
            <Filter size={14} />
            Filters
            {advancedFiltersCount > 0 && (
              <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {advancedFiltersCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── Tab Strip ── */}
      <div className="glass-card p-1.5 flex gap-1">
        {MY_ACTION_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => { setMyActionTab(tab.key); setStatusFilter(''); setSelectedIds(new Set()) }}
            className={clsx(
              'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
              myActionTab === tab.key
                ? tab.key === 'pending_my_action'
                  ? 'bg-amber-600/20 text-amber-300 border border-amber-600/40 shadow-inner'
                  : tab.key === 'i_acted'
                    ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-600/40 shadow-inner'
                    : 'bg-blue-600/20 text-blue-300 border border-blue-600/40 shadow-inner'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/40'
            )}
          >
            {tab.key === 'pending_my_action' && <Clock size={13} />}
            {tab.key === 'i_acted' && <ShieldCheck size={13} />}
            {tab.label}
            {myActionTab === tab.key && !loading && data && (
              <span className={clsx(
                'text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-0.5',
                tab.key === 'pending_my_action' ? 'bg-amber-600/30 text-amber-300' :
                tab.key === 'i_acted' ? 'bg-emerald-600/30 text-emerald-300' :
                'bg-blue-600/30 text-blue-300'
              )}>
                {data.total}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Advanced Filter Panel ── */}
      {showFilters && (
        <div className="glass-card p-4 space-y-3 animate-fade-in">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Advanced Filters</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="fmis-label">Overall Status</label>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="fmis-select">
                <option value="">All</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div>
              <label className="fmis-label">Step #</label>
              <input type="number" min="1" value={stepFilter} onChange={e => setStepFilter(e.target.value)} placeholder="Any" className="fmis-input" />
            </div>
            <div>
              <label className="fmis-label flex items-center gap-1"><Calendar size={11} /> From</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="fmis-input" />
            </div>
            <div>
              <label className="fmis-label flex items-center gap-1"><Calendar size={11} /> To</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="fmis-input" />
            </div>
          </div>
          <div className="flex justify-end">
            <button onClick={() => { setStatusFilter(''); setDateFrom(''); setDateTo(''); setStepFilter('') }} className="btn-ghost text-xs">
              Reset
            </button>
          </div>
        </div>
      )}

      {/* ── Select-All bar (only when there are actionable items in the current view) ── */}
      {actionableItems.length > 1 && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm">
          <button onClick={toggleSelectAll} className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors">
            {allActionableSelected
              ? <SquareCheck size={17} className="text-blue-400" />
              : someSelected
                ? <Minus size={17} className="text-blue-400 border border-blue-500 rounded" />
                : <Square size={17} className="text-slate-500" />
            }
            <span>
              {allActionableSelected
                ? 'Deselect all'
                : `Select all ${actionableItems.length} actionable`}
            </span>
          </button>
          {someSelected && (
            <span className="ml-auto text-xs text-slate-400">
              {selectedIds.size} selected
            </span>
          )}
        </div>
      )}

      {/* ── Contextual summary ── */}
      {!loading && data && data.total > 0 && myActionTab === 'pending_my_action' && (
        <div className="flex items-center gap-2 text-sm text-amber-400 bg-amber-900/20 border border-amber-800/40 rounded-lg px-4 py-2.5">
          <Clock size={15} className="shrink-0" />
          <span>{data.total} request{data.total !== 1 ? 's' : ''} still require your action</span>
        </div>
      )}

      {/* ── Cards ── */}
      {loading && !data ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-blue-500" size={28} />
        </div>
      ) : (
        <div className="space-y-4">
          {(data?.data ?? []).map(approval => {
            const approvable   = approval.approvable as Record<string, any> | null
            const amount       = approvable?.amount
            const currency     = approvable?.currency
            const description  = approvable?.description
            const txType       = approvable?.type
            const txDate       = approvable?.transaction_date

            const requesterData = approvable?.created_by_user ?? approvable?.createdBy ?? approvable?.created_by
            let requesterName = 'Unknown User'
            if (typeof requesterData === 'object' && requesterData !== null) {
              requesterName = requesterData.name || `User #${requesterData.id || '?'}`
            } else if (requesterData) {
              requesterName = `User #${requesterData}`
            }

            const steps          = approval.workflow?.steps ?? []
            const currentStep    = steps.find((s: any) => s.step_order === approval.current_step)
            const logs           = (approval as any).logs ?? []
            const isLogsExpanded = expandedLogs.has(approval.id)
            const isOverallPending      = approval.status === 'pending'
            const { has_user_acted, user_action, user_acted_at } = approval
            const canAct       = isOverallPending && !has_user_acted
            const isSelected   = selectedIds.has(approval.id)

            return (
              <div
                key={approval.id}
                className={clsx(
                  'glass-card p-5 space-y-4 transition-all duration-200',
                  isSelected && 'ring-2 ring-blue-500/60',
                  has_user_acted && !isSelected && 'ring-1 ring-emerald-700/30',
                  !isOverallPending && 'opacity-70'
                )}
              >
                {/* ── Card header ── */}
                <div className="flex items-start gap-3">
                  {/* Checkbox for actionable items */}
                  {canAct && (
                    <button
                      onClick={() => toggleSelect(approval.id)}
                      className="mt-0.5 shrink-0 text-slate-400 hover:text-blue-400 transition-colors"
                      title={isSelected ? 'Deselect' : 'Select'}
                    >
                      {isSelected
                        ? <SquareCheck size={18} className="text-blue-400" />
                        : <Square size={18} />
                      }
                    </button>
                  )}

                  <div className={clsx(
                    'w-10 h-10 rounded-full border flex items-center justify-center shrink-0',
                    has_user_acted ? 'bg-emerald-900/30 border-emerald-800/50' :
                    isOverallPending ? 'bg-blue-900/30 border-blue-800/50' :
                    approval.status === 'approved' ? 'bg-emerald-900/30 border-emerald-800/50' :
                    'bg-red-900/30 border-red-800/50'
                  )}>
                    <FileText size={18} className={clsx(
                      has_user_acted ? 'text-emerald-400' :
                      isOverallPending ? 'text-blue-400' :
                      approval.status === 'approved' ? 'text-emerald-400' : 'text-red-400'
                    )} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <p className="text-white font-semibold text-base">
                          {description || `Approval #${approval.id}`}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          #{approval.id} · {format(new Date((approval as any).created_at), 'dd MMM yyyy, HH:mm')}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 shrink-0">
                        {/* Overall status */}
                        <span className={clsx(
                          'px-2.5 py-1 rounded-full text-xs font-semibold border flex items-center gap-1.5 capitalize',
                          approval.status === 'pending' ? 'bg-amber-900/30 text-amber-400 border-amber-800/40' :
                          approval.status === 'approved' ? 'bg-emerald-900/30 text-emerald-400 border-emerald-800/40' :
                          'bg-red-900/30 text-red-400 border-red-800/40'
                        )}>
                          {approval.status === 'pending' ? <Clock size={10} /> :
                           approval.status === 'approved' ? <CheckCircle size={10} /> : <XCircle size={10} />}
                          {approval.status}
                        </span>
                        {/* My action badge */}
                        {has_user_acted && user_action && (
                          <span className={clsx(
                            'px-2.5 py-1 rounded-full text-xs font-semibold border flex items-center gap-1.5',
                            user_action === 'approved'
                              ? 'bg-emerald-900/40 text-emerald-300 border-emerald-700/50'
                              : 'bg-red-900/40 text-red-300 border-red-700/50'
                          )}>
                            {user_action === 'approved' ? <ShieldCheck size={10} /> : <ShieldOff size={10} />}
                            You {user_action}
                            {user_acted_at && (
                              <span className="opacity-70 ml-0.5">· {format(new Date(user_acted_at), 'dd MMM')}</span>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Details grid ── */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {amount != null && (
                    <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
                      <p className="text-xs text-slate-500 flex items-center gap-1 mb-1"><DollarSign size={11} /> Amount</p>
                      <p className={clsx('text-sm font-bold', txType === 'income' ? 'text-emerald-400' : 'text-red-400')}>
                        {txType === 'income' ? '+' : '-'}{fmt(amount, currency)}
                      </p>
                    </div>
                  )}
                  {txType && (
                    <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
                      <p className="text-xs text-slate-500 mb-1">Type</p>
                      <span className={clsx('text-xs font-semibold px-2 py-0.5 rounded-full capitalize',
                        txType === 'income' ? 'bg-emerald-900/50 text-emerald-400' : 'bg-red-900/50 text-red-400')}>
                        {txType}
                      </span>
                    </div>
                  )}
                  <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
                    <p className="text-xs text-slate-500 flex items-center gap-1 mb-1"><User size={11} /> Requested by</p>
                    <p className="text-sm text-slate-200 font-medium truncate">{requesterName}</p>
                  </div>
                  {txDate && (
                    <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
                      <p className="text-xs text-slate-500 flex items-center gap-1 mb-1"><Clock size={11} /> Tx Date</p>
                      <p className="text-sm text-slate-200">{format(new Date(txDate), 'dd MMM yyyy')}</p>
                    </div>
                  )}
                </div>

                {/* ── Workflow steps ── */}
                <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/40">
                  <div className="flex items-center gap-2 mb-2">
                    <GitBranch size={13} className="text-blue-400" />
                    <p className="text-xs text-slate-400">
                      {approval.workflow?.name && (
                        <><span className="text-blue-400 font-medium">{approval.workflow.name}</span> · </>
                      )}
                      Step {approval.current_step} of {steps.length}
                    </p>
                  </div>
                  {steps.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {steps.map((s: any, idx: number) => {
                        const isPast    = s.step_order < approval.current_step
                        const isCurrent = s.step_order === approval.current_step
                        return (
                          <div key={s.id ?? idx} className="flex items-center gap-1.5">
                            <div className={clsx(
                              'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border',
                              isPast    ? 'bg-emerald-900/30 text-emerald-400 border-emerald-800/50' :
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
                  {currentStep && isOverallPending && (
                    <p className="text-xs text-slate-500 mt-2">
                      Awaiting: <span className="text-slate-300 capitalize font-medium">{currentStep.role_name}</span>
                    </p>
                  )}
                </div>

                {/* ── Already-acted info bar ── */}
                {has_user_acted && isOverallPending && (
                  <div className={clsx(
                    'flex items-center gap-3 px-4 py-2.5 rounded-lg border text-sm',
                    user_action === 'approved'
                      ? 'bg-emerald-900/20 border-emerald-800/40 text-emerald-300'
                      : 'bg-red-900/20 border-red-800/40 text-red-300'
                  )}>
                    {user_action === 'approved' ? <ShieldCheck size={15} className="shrink-0" /> : <ShieldOff size={15} className="shrink-0" />}
                    <span className="font-medium">You already {user_action} this</span>
                    {user_acted_at && (
                      <span className="text-xs opacity-70 ml-1">on {format(new Date(user_acted_at), 'dd MMM yyyy, HH:mm')}</span>
                    )}
                    <span className="ml-auto text-xs opacity-60">Waiting for other steps</span>
                  </div>
                )}

                {/* ── Audit log toggle ── */}
                {logs.length > 0 && (
                  <button
                    onClick={() => toggleLogs(approval.id)}
                    className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    <MessageSquare size={12} />
                    {logs.length} audit log{logs.length !== 1 ? 's' : ''}
                    {isLogsExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                )}
                {isLogsExpanded && (
                  <div className="space-y-2 animate-fade-in">
                    {logs.map((log: any) => (
                      <div key={log.id} className={clsx(
                        'flex gap-3 p-2.5 rounded-lg text-xs border',
                        log.action === 'approved' ? 'bg-emerald-900/10 border-emerald-800/30' : 'bg-red-900/10 border-red-800/30'
                      )}>
                        <div className={clsx('mt-0.5 shrink-0', log.action === 'approved' ? 'text-emerald-400' : 'text-red-400')}>
                          {log.action === 'approved' ? <CheckCircle size={13} /> : <XCircle size={13} />}
                        </div>
                        <div className="min-w-0">
                          <span className="font-medium text-slate-300">{log.user?.name ?? 'Unknown'}</span>
                          <span className="text-slate-500"> · {log.action} · Step {log.step?.step_order ?? '?'}</span>
                          {log.comment && <p className="mt-1 text-slate-400 italic">"{log.comment}"</p>}
                        </div>
                        <span className="text-slate-600 shrink-0 ml-auto">
                          {log.created_at ? format(new Date(log.created_at), 'dd MMM HH:mm') : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* ── Single-item action buttons (only if canAct and NOT selected for bulk) ── */}
                {canAct && !isSelected && (
                  <div className="flex gap-2 justify-end pt-1 border-t border-slate-700/30">
                    <button
                      onClick={() => openSingleModal(approval.id, 'reject')}
                      className="flex items-center gap-1.5 px-4 py-2 bg-red-900/30 text-red-400 hover:bg-red-900/60 border border-red-800/40 rounded-lg text-sm font-medium transition-colors"
                    >
                      <XCircle size={15} /> Reject
                    </button>
                    <button
                      onClick={() => openSingleModal(approval.id, 'approve')}
                      className="flex items-center gap-1.5 px-4 py-2 bg-emerald-900/30 text-emerald-400 hover:bg-emerald-900/60 border border-emerald-800/40 rounded-lg text-sm font-medium transition-colors"
                    >
                      <CheckCircle size={15} /> Approve
                    </button>
                  </div>
                )}
                {canAct && isSelected && (
                  <p className="text-xs text-blue-400 text-right pt-1 border-t border-slate-700/30">
                    ✓ Selected for bulk action
                  </p>
                )}
              </div>
            )
          })}

          {/* ── Empty state ── */}
          {!loading && (data?.data.length ?? 0) === 0 && (
            <div className="glass-card p-12 text-center">
              {myActionTab === 'pending_my_action' ? (
                <>
                  <ShieldCheck size={44} className="mx-auto mb-3 text-emerald-500/40" />
                  <p className="text-slate-400 font-medium">All caught up!</p>
                  <p className="text-slate-600 text-sm mt-1">No requests currently need your action.</p>
                </>
              ) : myActionTab === 'i_acted' ? (
                <>
                  <ShieldCheck size={44} className="mx-auto mb-3 text-blue-500/30" />
                  <p className="text-slate-400 font-medium">No history yet</p>
                  <p className="text-slate-600 text-sm mt-1">You haven't acted on any approvals yet.</p>
                </>
              ) : (
                <>
                  <CheckCircle size={44} className="mx-auto mb-3 text-emerald-500/40" />
                  <p className="text-slate-400 font-medium">No approvals found</p>
                  <p className="text-slate-600 text-sm mt-1">Try adjusting your filters.</p>
                </>
              )}
            </div>
          )}

          {/* Pagination */}
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

      {/* ── Floating Bulk Action Bar ── */}
      {someSelected && createPortal(
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9000] animate-fade-in">
          <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-slate-900 border border-slate-600/60 shadow-2xl shadow-black/60 backdrop-blur-md">
            <span className="text-sm font-semibold text-white">
              {selectedIds.size} selected
            </span>
            <div className="w-px h-5 bg-slate-600" />
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-xs text-slate-400 hover:text-white transition-colors"
            >
              Clear
            </button>
            <button
              onClick={() => openBulkModal('reject')}
              className="flex items-center gap-1.5 px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-red-900/30"
            >
              <XCircle size={15} /> Reject {selectedIds.size}
            </button>
            <button
              onClick={() => openBulkModal('approve')}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-emerald-900/30"
            >
              <CheckCircle size={15} /> Approve {selectedIds.size}
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* ── Action Modal (single + bulk) ── */}
      {modal && createPortal(
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-[10000] p-4">
          <div
            className="glass-card p-6 w-full max-w-md animate-fade-in shadow-2xl border border-slate-700/50"
            onClick={e => e.stopPropagation()}
          >
            <h3 className={clsx('text-lg font-semibold mb-1', modal.action === 'approve' ? 'text-emerald-400' : 'text-red-400')}>
              {modal.action === 'approve' ? '✅' : '❌'}{' '}
              {isBulkModal
                ? `${modal.action === 'approve' ? 'Approve' : 'Reject'} ${targetCount} Requests`
                : `Confirm ${modal.action === 'approve' ? 'Approval' : 'Rejection'}`}
            </h3>
            {isBulkModal && (
              <p className="text-xs text-slate-500 mb-2">
                This action will be applied to <span className="text-slate-300 font-medium">{targetCount} approval requests</span> at once.
              </p>
            )}
            <p className="text-slate-400 text-sm mb-4">
              {modal.action === 'approve'
                ? 'Add an optional comment for all requesters.'
                : 'Please provide a reason for rejection (required).'}
            </p>

            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder={modal.action === 'reject' ? 'Reason for rejection...' : 'Optional comment...'}
              className="fmis-input h-24 resize-none mb-3"
              autoFocus
            />

            {actionError && (
              <div className="flex items-start gap-2 p-3 mb-3 bg-red-950/40 border border-red-800/50 rounded-lg text-sm text-red-400">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <p>{actionError}</p>
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button onClick={closeModal} className="btn-ghost" disabled={acting}>Cancel</button>
              <button
                onClick={handleAction}
                disabled={acting || (modal.action === 'reject' && !comment.trim())}
                className={clsx(
                  'flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none',
                  modal.action === 'approve'
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20'
                    : 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/20'
                )}
              >
                {acting ? <Loader2 size={16} className="animate-spin" /> :
                 modal.action === 'approve' ? <CheckCircle size={16} /> : <XCircle size={16} />}
                Confirm {modal.action === 'approve' ? 'Approval' : 'Rejection'}
                {isBulkModal && ` (${targetCount})`}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
