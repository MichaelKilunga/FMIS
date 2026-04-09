import { useEffect, useState, useCallback } from 'react'
import { transactionsApi, budgetsApi, categoriesApi, accountsApi } from '../../services/api'
import type { Transaction, PaginatedResponse, Budget, TransactionCategory, Account } from '../../types'
import { useOnlineStore, useSettingsStore, useAuthStore } from '../../store'
import { useCurrency } from '../../hooks/useCurrency'
import Modal from '../../components/Modal'
import { RotateCcw, Plus, Search, Send, Loader2, Pencil, Trash2, Tag, Building2, Wallet, PieChart, Calendar, Filter, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react'
import { useForm, type UseFormReturn } from 'react-hook-form'
import DataTable from '../../components/DataTable'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import clsx from 'clsx'

const statusMeta: Record<string, { label: string; cls: string }> = {
  draft:        { label: 'Draft',       cls: 'badge-draft' },
  submitted:    { label: 'Submitted',   cls: 'badge-submitted' },
  under_review: { label: 'Under Review',cls: 'badge-under_review' },
  approved:     { label: 'Approved',    cls: 'badge-approved' },
  rejected:     { label: 'Rejected',    cls: 'badge-rejected' },
  posted:       { label: 'Posted',      cls: 'badge-posted' },
}

type TxFormData = {
  description: string
  amount: number
  type: string
  currency: string
  transaction_date: string
  notes?: string
  category_id?: number
  account_id?: number
  budget_id?: number
  department?: string
}

export default function TransactionsPage() {
  const { isOnline } = useOnlineStore()
  const { settings } = useSettingsStore()
  const { user } = useAuthStore()
  const { formatCurrency, defaultCurrency } = useCurrency()
  const isAdmin = user?.roles.includes('admin') || user?.permissions.includes('manage-workflows')
  const multiEnabled = settings['currency.multi_enabled'] === 'true'
  const manualRatesStr = (settings['currency.manual_rates'] as string) || '{}'

  let availableCurrencies: string[] = [defaultCurrency]
  if (multiEnabled) {
    try {
      const rates = JSON.parse(manualRatesStr)
      availableCurrencies = Array.from(new Set([defaultCurrency, ...Object.keys(rates)]))
    } catch { /* ignore */ }
  }

  // List state
  const [data, setData] = useState<PaginatedResponse<Transaction> | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)

  // Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  // Modals
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [isSubmittingForm, setIsSubmittingForm] = useState(false)
  const [editTx, setEditTx] = useState<Transaction | null>(null)
  const [deleteTx, setDeleteTx] = useState<Transaction | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Integration Data
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [categories, setCategories] = useState<TransactionCategory[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false)

  const createForm = useForm<TxFormData>({
    defaultValues: {
      type: 'expense',
      currency: defaultCurrency,
      transaction_date: format(new Date(), 'yyyy-MM-dd'),
    },
  })

  const editForm = useForm<TxFormData>()

  const load = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const params: Record<string, unknown> = { page }
      if (search) params.search = search
      if (statusFilter) params.status = statusFilter
      if (typeFilter) params.type = typeFilter
      if (dateFrom) params.from = dateFrom
      if (dateTo) params.to = dateTo

      const [resTx, resBudgets, resCats, resAccounts] = await Promise.all([
        transactionsApi.list(params),
        budgetsApi.list({ status: 'active' }),
        categoriesApi.list(),
        accountsApi.list(),
      ])
      setData(resTx.data)
      setCurrentPage(page)
      setBudgets(resBudgets.data.data)
      setCategories(resCats.data)
      setAccounts(resAccounts.data)
    } catch {
      toast.error('Failed to load transactions')
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter, typeFilter, dateFrom, dateTo])

  useEffect(() => {
    load()
    const handleSyncComplete = () => load()
    window.addEventListener('fmis-sync-completed', handleSyncComplete)
    return () => window.removeEventListener('fmis-sync-completed', handleSyncComplete)
  }, [load])

  const openEdit = (tx: Transaction) => {
    setEditTx(tx)
    editForm.reset({
      description: tx.description,
      amount: tx.amount,
      type: tx.type,
      currency: tx.currency || defaultCurrency,
      transaction_date: tx.transaction_date?.substring(0, 10),
      notes: tx.notes || '',
      category_id: tx.category_id,
      account_id: tx.account_id,
      budget_id: tx.budget_id,
      department: tx.department,
    })
  }

  const handleSubmitForApproval = async (tx: Transaction) => {
    // Optimistic status update so the row feedback is immediate
    setData(prev => {
      if (!prev) return prev
      return {
        ...prev,
        data: prev.data.map(t => t.id === tx.id ? { ...t, status: 'submitted' } : t),
      }
    })
    try {
      await transactionsApi.submit(tx.id)
      toast.success('Transaction submitted for approval')
      load(currentPage) // refresh to get actual status from server
    } catch (e: unknown) {
      // Revert optimistic update on error
      setData(prev => {
        if (!prev) return prev
        return {
          ...prev,
          data: prev.data.map(t => t.id === tx.id ? { ...t, status: 'draft' } : t),
        }
      })
      const msg = (e as any)?.response?.data?.message || 'Failed to submit transaction'
      toast.error(msg)
    }
  }

  const handleRevert = async (tx: Transaction) => {
    if (!window.confirm('Are you sure you want to revert this transaction to draft? Existing approvals will be cleared.')) return
    
    try {
      const res = await transactionsApi.revert(tx.id)
      toast.success(res.data.message)
      load(currentPage)
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Rollback failed')
    }
  }

  const onCreateSubmit = async (formData: TxFormData) => {
    setIsSubmittingForm(true)
    try {
      await transactionsApi.create({
        ...formData,
        amount: Number(formData.amount),
        category_id: formData.category_id ? Number(formData.category_id) : null,
        account_id: formData.account_id ? Number(formData.account_id) : null,
        budget_id: formData.budget_id ? Number(formData.budget_id) : null,
      })
      toast.success('Transaction created successfully')
      setShowCreateForm(false)
      createForm.reset({ type: 'expense', currency: defaultCurrency, transaction_date: format(new Date(), 'yyyy-MM-dd') })
      load(currentPage)
    } catch (e: any) {
      const errors = e.response?.data?.errors
      if (errors) {
        // Show field-level errors
        Object.entries(errors).forEach(([field, msgs]) => {
          const fieldName = field as keyof TxFormData
          createForm.setError(fieldName, { message: (msgs as string[])[0] })
        })
        toast.error('Please fix the highlighted errors')
      } else {
        toast.error(e.response?.data?.message || 'Failed to create transaction')
      }
    } finally {
      setIsSubmittingForm(false)
    }
  }

  const onEditSubmit = async (formData: TxFormData) => {
    if (!editTx) return
    setIsSubmittingForm(true)
    try {
      await transactionsApi.update(editTx.id, {
        ...formData,
        amount: Number(formData.amount),
        category_id: formData.category_id ? Number(formData.category_id) : null,
        account_id: formData.account_id ? Number(formData.account_id) : null,
        budget_id: formData.budget_id ? Number(formData.budget_id) : null,
      })
      toast.success('Transaction updated')
      setEditTx(null)
      load(currentPage)
    } catch (e: any) {
      const errors = e.response?.data?.errors
      if (errors) {
        Object.entries(errors).forEach(([field, msgs]) => {
          editForm.setError(field as keyof TxFormData, { message: (msgs as string[])[0] })
        })
        toast.error('Please fix the highlighted errors')
      } else {
        toast.error(e.response?.data?.message || 'Failed to update transaction')
      }
    } finally {
      setIsSubmittingForm(false)
    }
  }

  const onDelete = async () => {
    if (!deleteTx) return
    setIsDeleting(true)
    try {
      await transactionsApi.delete(deleteTx.id)
      toast.success('Transaction deleted')
      setDeleteTx(null)
      load(currentPage)
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to delete transaction')
    } finally {
      setIsDeleting(false)
    }
  }

  const fmt = (n: number, currency?: string) => formatCurrency(n, currency)
  const isEditable = (status: string) => ['draft', 'rejected'].includes(status)

  const handleBulkSubmit = async () => {
    if (selectedIds.length === 0) return
    if (!window.confirm(`Are you sure you want to submit ${selectedIds.length} transactions for approval?`)) return
    
    setIsBulkSubmitting(true)
    try {
      const resp = await transactionsApi.bulkSubmit(selectedIds)
      const { succeeded, failed } = resp.data.results
      if (succeeded.length > 0) {
        toast.success(`${succeeded.length} transactions submitted successfully.`)
      }
      if (failed.length > 0) {
        toast.error(`${failed.length} submissions failed.`)
      }
      setSelectedIds([])
      load(currentPage)
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to submit transactions')
    } finally {
      setIsBulkSubmitting(false)
    }
  }

  const toggleSelect = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    if (!data?.data) return
    const draftIds = data.data
      .filter(tx => tx.status === 'draft')
      .map(tx => tx.id)
    
    if (draftIds.length > 0 && selectedIds.length === draftIds.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(draftIds)
    }
  }

  const activeFiltersCount = [statusFilter, typeFilter, dateFrom, dateTo].filter(Boolean).length

  const columns = [
    {
      header: (
        <input
          type="checkbox"
          className="fmis-checkbox"
          checked={data?.data ? (data.data.filter(tx => tx.status === 'draft').length > 0 && selectedIds.length === data.data.filter(tx => tx.status === 'draft').length) : false}
          onChange={toggleSelectAll}
        />
      ),
      accessor: (tx: Transaction) => (
        <input
          type="checkbox"
          className="fmis-checkbox"
          checked={selectedIds.includes(tx.id)}
          onChange={() => toggleSelect(tx.id)}
          disabled={tx.status !== 'draft'}
        />
      ),
      priority: 1,
    },
    {
      header: 'Reference',
      priority: 4,
      accessor: (tx: Transaction) => (
        <span className="font-mono text-[11px] text-slate-400 bg-slate-800/60 px-1.5 py-0.5 rounded">
          {tx.reference}
        </span>
      ),
    },
    {
      header: 'Description',
      accessor: (tx: Transaction) => (
        <div className="max-w-[140px] md:max-w-none">
          <div className="font-medium text-slate-200 truncate">{tx.description}</div>
          {tx.category && (
            <span className="text-[10px] text-slate-500 flex items-center gap-1 uppercase tracking-wider truncate">
              <Tag size={10} /> {tx.category.name}
            </span>
          )}
          {(tx as any).budget && (
            <span className="text-[10px] text-blue-500/70 flex items-center gap-1 truncate">
              <PieChart size={10} /> {(tx as any).budget.name}
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Type',
      priority: 3,
      accessor: (tx: Transaction) => (
        <span className={clsx(
          'text-xs font-semibold px-2 py-0.5 rounded-full capitalize',
          tx.type === 'income' ? 'bg-emerald-900/50 text-emerald-400' : 'bg-red-900/50 text-red-400'
        )}>
          {tx.type}
        </span>
      ),
    },
    {
      header: 'Amount',
      priority: 2,
      accessor: (tx: Transaction) => (
        <span className={clsx(
          'font-bold tabular-nums',
          tx.type === 'income' ? 'text-emerald-400' : 'text-red-400'
        )}>
          {tx.type === 'income' ? '+' : '-'}{fmt(tx.amount, tx.currency)}
        </span>
      ),
    },
    {
      header: 'Date',
      priority: 3,
      accessor: (tx: Transaction) => (
        <span className="text-slate-400 text-xs whitespace-nowrap">
          {format(new Date(tx.transaction_date), 'dd MMM yyyy')}
        </span>
      ),
    },
    {
      header: 'Status',
      priority: 2,
      accessor: (tx: Transaction) => {
        const meta = statusMeta[tx.status] || { label: tx.status, cls: 'badge-draft' }
        return <span className={meta.cls}>{meta.label}</span>
      },
    },
    {
      header: 'Actions',
      accessor: (tx: Transaction) => (
        <div className="flex items-center gap-1">
          {tx.status === 'draft' && (
            <button
              onClick={() => handleSubmitForApproval(tx)}
              title="Submit for Approval"
              className="p-1.5 rounded-md text-blue-400 hover:bg-blue-900/30 transition-colors group relative"
            >
              <Send size={14} />
            </button>
          )}
          {isEditable(tx.status) && (
            <button
              onClick={() => openEdit(tx)}
              title="Edit"
              className="p-1.5 rounded-md text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
            >
              <Pencil size={14} />
            </button>
          )}
          {tx.status === 'draft' && (
            <button
              onClick={() => setDeleteTx(tx)}
              title="Delete"
              className="p-1.5 rounded-md text-rose-400 hover:bg-rose-900/30 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          )}
          {isAdmin && tx.status !== 'draft' && (
            <button
              onClick={() => handleRevert(tx)}
              title="Admin: Revert to Draft"
              className="p-1.5 rounded-md text-amber-500 hover:bg-amber-900/30 transition-colors"
            >
              <RotateCcw size={14} />
            </button>
          )}
        </div>
      ),
    },
  ]

  const txFormFields = (form: UseFormReturn<TxFormData>) => {
    const errors = form.formState.errors
    return (
      <div className="space-y-4">
        <div>
          <label className="fmis-label">Description *</label>
          <input
            {...form.register('description', { required: 'Description is required' })}
            className={clsx('fmis-input', errors.description && 'border-red-500/50')}
            placeholder="e.g., Office Supplies"
          />
          {errors.description && <p className="text-xs text-red-400 mt-1">{errors.description.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="fmis-label flex items-center gap-1.5"><Wallet size={14} /> Account *</label>
            <select
              {...form.register('account_id', { required: 'Please select an account' })}
              className={clsx('fmis-select', errors.account_id && 'border-red-500/50')}
            >
              <option value="">Select Account</option>
              {accounts
                .filter(acc => {
                  const txType = form.watch('type')
                  if (!acc.allowed_transaction_types || acc.allowed_transaction_types.length === 0) return true
                  return acc.allowed_transaction_types.includes(txType as any)
                })
                .map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({fmt(acc.balance, acc.currency)})
                  </option>
                ))
              }
            </select>
            {errors.account_id && <p className="text-xs text-red-400 mt-1">{errors.account_id.message}</p>}
          </div>
          <div>
            <label className="fmis-label flex items-center gap-1.5"><Tag size={14} /> Category</label>
            <select {...form.register('category_id')} className="fmis-select">
              <option value="">Select Category</option>
              {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="fmis-label">Amount *</label>
            <input
              type="number" step="0.01"
              {...form.register('amount', { required: 'Amount is required', min: { value: 0.01, message: 'Must be > 0' } })}
              className={clsx('fmis-input', errors.amount && 'border-red-500/50')}
              placeholder="0.00"
            />
            {errors.amount && <p className="text-xs text-red-400 mt-1">{errors.amount.message}</p>}
          </div>
          <div>
            <label className="fmis-label">Currency</label>
            <select {...form.register('currency')} className="fmis-select">
              {availableCurrencies.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="fmis-label">Type *</label>
            <select {...form.register('type')} className="fmis-select">
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </div>
          <div>
            <label className="fmis-label flex items-center gap-1.5"><Calendar size={14} /> Transaction Date *</label>
            <input
              type="date"
              {...form.register('transaction_date', { required: 'Date is required' })}
              className={clsx('fmis-input', errors.transaction_date && 'border-red-500/50')}
            />
            {errors.transaction_date && <p className="text-xs text-red-400 mt-1">{errors.transaction_date.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="fmis-label flex items-center gap-1.5">
              <PieChart size={14} />
              Link to Budget
              <span className="text-slate-500 text-[10px]">(optional)</span>
            </label>
            <select {...form.register('budget_id')} className="fmis-select">
              <option value="">Auto-match / None</option>
              {budgets.map(b => (
                <option key={b.id} value={b.id}>
                  {b.name} ({fmt(b.variance ?? 0)} remaining)
                </option>
              ))}
            </select>
            <p className="text-[10px] text-slate-500 mt-1">
              Linking updates budget spending immediately on save.
            </p>
          </div>
          <div>
            <label className="fmis-label flex items-center gap-1.5">
              <Building2 size={14} />
              Department
              <span className="text-slate-500 text-[10px]">(optional)</span>
            </label>
            <input {...form.register('department')} className="fmis-input" placeholder="e.g., Marketing" />
          </div>
        </div>

        <div>
          <label className="fmis-label">Notes <span className="text-slate-500 text-[10px]">(optional)</span></label>
          <textarea
            {...form.register('notes')}
            className="fmis-input min-h-[70px]"
            placeholder="Additional details..."
          />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Transactions</h1>
          <p className="text-slate-400 text-sm">Manage all financial transactions</p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 mr-4 px-3 py-1.5 bg-blue-900/20 border border-blue-800/40 rounded-lg animate-in slide-in-from-right-4">
              <span className="text-blue-300 text-sm font-medium">{selectedIds.length} selected</span>
              <button
                onClick={handleBulkSubmit}
                disabled={isBulkSubmitting}
                className="flex items-center gap-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold transition-all disabled:opacity-50"
              >
                {isBulkSubmitting ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                Submit Selected
              </button>
              <button
                onClick={() => setSelectedIds([])}
                className="text-slate-400 hover:text-white transition-colors"
                title="Clear selection"
              >
                <RefreshCw size={12} />
              </button>
            </div>
          )}
          <button
            onClick={() => load(currentPage)}
            disabled={loading}
            title="Refresh"
            className="p-2 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:border-slate-600 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setShowCreateForm(true)} className="btn-primary">
            <Plus size={16} /> New Transaction
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 space-y-3">
        <div className="flex gap-3 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-48">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by description..."
              className="fmis-input pl-9"
            />
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="fmis-select w-40"
          >
            <option value="">All statuses</option>
            {Object.entries(statusMeta).map(([val, meta]) => (
              <option key={val} value={val}>{meta.label}</option>
            ))}
          </select>

          {/* Advanced filter toggle */}
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
            More
            {activeFiltersCount > 0 && (
              <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-700/40 animate-fade-in">
            <div>
              <label className="fmis-label">Type</label>
              <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="fmis-select">
                <option value="">All types</option>
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>
            <div>
              <label className="fmis-label flex items-center gap-1"><Calendar size={11} /> From</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="fmis-input" />
            </div>
            <div>
              <label className="fmis-label flex items-center gap-1"><Calendar size={11} /> To</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="fmis-input" />
            </div>
            <div className="sm:col-span-3 flex justify-end">
              <button
                onClick={() => { setTypeFilter(''); setDateFrom(''); setDateTo(''); setStatusFilter('') }}
                className="btn-ghost text-xs"
              >
                Reset all filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Offline notice */}
      {!isOnline && (
        <div className="glass-card p-3 border-yellow-500/30 text-yellow-400 text-sm flex items-center gap-2">
          <AlertTriangle size={15} /> You're offline. New transactions will sync when connection is restored.
        </div>
      )}

      {/* Table with proper pagination */}
      <DataTable
        columns={columns as any}
        data={data}
        loading={loading}
        onPageChange={(page) => load(page)}
        emptyMessage="No transactions found"
      />

      {/* ─── Create Modal ─── */}
      <Modal isOpen={showCreateForm} onClose={() => { setShowCreateForm(false); createForm.clearErrors() }} title="New Transaction">
        <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
          {txFormFields(createForm)}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-700/50">
            <button type="button" onClick={() => setShowCreateForm(false)} className="btn-ghost">Cancel</button>
            <button type="submit" disabled={isSubmittingForm} className="btn-primary">
              {isSubmittingForm ? <Loader2 size={16} className="animate-spin" /> : <><CheckCircle size={16} /> Create Transaction</>}
            </button>
          </div>
        </form>
      </Modal>

      {/* ─── Edit Modal ─── */}
      <Modal isOpen={!!editTx} onClose={() => { setEditTx(null); editForm.clearErrors() }} title="Edit Transaction">
        <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
          {txFormFields(editForm)}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-700/50">
            <button type="button" onClick={() => setEditTx(null)} className="btn-ghost">Cancel</button>
            <button type="submit" disabled={isSubmittingForm} className="btn-primary">
              {isSubmittingForm ? <Loader2 size={16} className="animate-spin" /> : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ─── Delete Confirm Modal ─── */}
      <Modal isOpen={!!deleteTx} onClose={() => setDeleteTx(null)} title="Delete Transaction">
        <div className="space-y-4">
          <p className="text-slate-300">
            Are you sure you want to delete{' '}
            <span className="text-white font-semibold">{deleteTx?.description}</span>?
            This action cannot be undone.
          </p>
          <div className="flex items-center gap-3 p-3 bg-rose-950/30 border border-rose-800/40 rounded-lg">
            <Trash2 size={16} className="text-rose-400 shrink-0" />
            <p className="text-sm text-rose-400">
              {deleteTx && fmt(deleteTx.amount, deleteTx.currency)} ·{' '}
              {deleteTx?.transaction_date ? format(new Date(deleteTx.transaction_date), 'dd MMM yyyy') : ''} ·{' '}
              {deleteTx?.status}
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-700/50">
            <button onClick={() => setDeleteTx(null)} className="btn-ghost">Cancel</button>
            <button
              onClick={onDelete}
              disabled={isDeleting}
              className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
            >
              {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
