import { useEffect, useState, useCallback } from 'react'
import { transactionsApi, budgetsApi, categoriesApi, accountsApi } from '../../services/api'
import type { Transaction, PaginatedResponse, Budget, TransactionCategory, Account } from '../../types'
import { Plus, Search, Send, Loader2, Pencil, Trash2, Tag, Building2, Wallet, PieChart } from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import clsx from 'clsx'
import { useOnlineStore, useSettingsStore } from '../../store'
import Modal from '../../components/Modal'
import { useForm, type UseFormReturn } from 'react-hook-form'

const statusColors: Record<string, string> = {
  draft: 'badge-draft', submitted: 'badge-submitted', under_review: 'badge-under_review',
  approved: 'badge-approved', rejected: 'badge-rejected', posted: 'badge-posted',
}

type TxFormData = {
  description: string; amount: number; type: string; currency: string;
  transaction_date: string; notes?: string;
  category_id?: number; account_id?: number; budget_id?: number; department?: string;
}

export default function TransactionsPage() {
  const { isOnline } = useOnlineStore()
  const { settings } = useSettingsStore()

  const defaultCurrency = (settings['currency.default'] as string) || 'USD'
  const multiEnabled = settings['currency.multi_enabled'] === 'true'
  const manualRatesStr = (settings['currency.manual_rates'] as string) || '{}'

  let availableCurrencies: string[] = [defaultCurrency]
  if (multiEnabled) {
    try {
      const rates = JSON.parse(manualRatesStr)
      availableCurrencies = Array.from(new Set([defaultCurrency, ...Object.keys(rates)]))
    } catch { /* ignore */ }
  }

  const [data, setData] = useState<PaginatedResponse<Transaction> | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [isSubmittingForm, setIsSubmittingForm] = useState(false)
  const [editTx, setEditTx] = useState<Transaction | null>(null)
  const [deleteTx, setDeleteTx] = useState<Transaction | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Integration Data
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [categories, setCategories] = useState<TransactionCategory[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])

  const createForm = useForm<TxFormData>({
    defaultValues: { type: 'expense', currency: defaultCurrency, transaction_date: format(new Date(), 'yyyy-MM-dd') }
  })

  const editForm = useForm<TxFormData>()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [resTx, resBudgets, resCats, resAccounts] = await Promise.all([
        transactionsApi.list({ search, status: statusFilter || undefined }),
        budgetsApi.list({ status: 'active' }),
        categoriesApi.list(),
        accountsApi.list()
      ])
      setData(resTx.data)
      setBudgets(resBudgets.data.data)
      setCategories(resCats.data)
      setAccounts(resAccounts.data)
    } catch {} finally { setLoading(false) }
  }, [search, statusFilter])

  useEffect(() => { load() }, [load])

  // Open edit modal and pre-fill form
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

  const handleSubmitForApproval = async (id: number) => {
    try {
      await transactionsApi.submit(id)
      toast.success('Transaction submitted for approval')
      load()
    } catch (e: unknown) {
      toast.error((e as any)?.response?.data?.message || 'Error')
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
      createForm.reset()
      load()
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to create transaction')
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
      load()
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to update transaction')
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
      load()
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to delete transaction')
    } finally {
      setIsDeleting(false)
    }
  }

  const fmt = (n: number, currency?: string) => {
    const symbol = (settings['currency.symbol'] as string) || ''
    if (symbol) {
      return `${symbol} ${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2 }).format(n)}`
    }
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || defaultCurrency }).format(n)
  }

  // Statuses where editing/deleting is allowed
  const isEditable = (status: string) => ['draft', 'rejected'].includes(status)

  const txFormFields = (form: UseFormReturn<TxFormData>) => (
    <div className="space-y-4">
      <div>
        <label className="fmis-label">Description</label>
        <input {...form.register('description', { required: true })} className="fmis-input" placeholder="e.g., Office Supplies" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="fmis-label flex items-center gap-1.5"><Wallet size={14} /> Account</label>
          <select {...form.register('account_id', { required: true })} className="fmis-select">
            <option value="">Select Account</option>
            {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name} ({fmt(acc.balance, acc.currency)})</option>)}
          </select>
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
          <label className="fmis-label">Amount</label>
          <input type="number" step="0.01" {...form.register('amount', { required: true })} className="fmis-input" placeholder="0.00" />
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
          <label className="fmis-label">Type</label>
          <select {...form.register('type')} className="fmis-select">
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
        </div>
        <div>
          <label className="fmis-label">Transaction Date</label>
          <input type="date" {...form.register('transaction_date', { required: true })} className="fmis-input" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="fmis-label flex items-center gap-1.5"><PieChart size={14} /> Link to Budget (Optional)</label>
          <select {...form.register('budget_id')} className="fmis-select">
            <option value="">Auto-match / None</option>
            {budgets.map(b => (
              <option key={b.id} value={b.id}>{b.name} ({fmt(b.variance)})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="fmis-label flex items-center gap-1.5"><Building2 size={14} /> Department (Optional)</label>
          <input {...form.register('department')} className="fmis-input" placeholder="e.g., Marketing" />
        </div>
      </div>

      <div>
        <label className="fmis-label">Notes (Optional)</label>
        <textarea {...form.register('notes')} className="fmis-input min-h-[80px]" placeholder="Additional details..." />
      </div>
    </div>
  )

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Transactions</h1>
          <p className="text-slate-400 text-sm">Manage all financial transactions</p>
        </div>
        <button onClick={() => setShowCreateForm(true)} className="btn-primary">
          <Plus size={16} /> New Transaction
        </button>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search transactions..."
            className="fmis-input pl-9" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="fmis-select w-40">
          <option value="">All statuses</option>
          {['draft','submitted','under_review','approved','rejected','posted'].map(s => (
            <option key={s} value={s}>{s.replace('_', ' ')}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin text-blue-500" size={28} /></div>
        ) : (
          <table className="fmis-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Description</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.data.map(tx => (
                <tr key={tx.id}>
                  <td><span className="font-mono text-xs text-slate-400">{tx.reference}</span></td>
                  <td>
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-200">{tx.description}</span>
                      {tx.category && <span className="text-[10px] text-slate-500 flex items-center gap-1 uppercase tracking-wider"><Tag size={10}/> {tx.category.name}</span>}
                    </div>
                  </td>
                  <td>
                    <span className={clsx('text-xs font-semibold px-2 py-0.5 rounded-full',
                      tx.type === 'income' ? 'bg-emerald-900/50 text-emerald-400' : 'bg-red-900/50 text-red-400')}>
                      {tx.type}
                    </span>
                  </td>
                  <td>
                    <span className={tx.type === 'income' ? 'text-emerald-400 font-semibold' : 'text-red-400 font-semibold'}>
                      {tx.type === 'income' ? '+' : '-'}{fmt(tx.amount, tx.currency)}
                    </span>
                  </td>
                  <td className="text-slate-400 text-xs">{format(new Date(tx.transaction_date), 'dd MMM yyyy')}</td>
                  <td><span className={statusColors[tx.status] || 'badge-draft'}>{tx.status.replace('_', ' ')}</span></td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      {/* Submit for approval — draft only */}
                      {tx.status === 'draft' && (
                        <button onClick={() => handleSubmitForApproval(tx.id)} title="Submit for Approval"
                          className="p-1.5 rounded-md text-blue-400 hover:bg-blue-900/30 transition-colors">
                          <Send size={14} />
                        </button>
                      )}
                      {/* Edit — draft or rejected */}
                      {isEditable(tx.status) && (
                        <button onClick={() => openEdit(tx)} title="Edit"
                          className="p-1.5 rounded-md text-slate-400 hover:bg-slate-700 hover:text-white transition-colors">
                          <Pencil size={14} />
                        </button>
                      )}
                      {/* Delete — draft only */}
                      {tx.status === 'draft' && (
                        <button onClick={() => setDeleteTx(tx)} title="Delete"
                          className="p-1.5 rounded-md text-rose-400 hover:bg-rose-900/30 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {(data?.data.length ?? 0) === 0 && (
                <tr><td colSpan={7} className="text-center py-12 text-slate-500">No transactions found</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {!isOnline && (
        <div className="glass-card p-3 border-yellow-500/30 text-yellow-400 text-sm flex items-center gap-2">
          ⚡ You're offline. New transactions will sync automatically when the connection is restored.
        </div>
      )}

      {/* Create Modal */}
      <Modal isOpen={showCreateForm} onClose={() => setShowCreateForm(false)} title="New Transaction">
        <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
          {txFormFields(createForm)}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-700/50">
            <button type="button" onClick={() => setShowCreateForm(false)} className="btn-ghost">Cancel</button>
            <button type="submit" disabled={isSubmittingForm} className="btn-primary">
              {isSubmittingForm ? <Loader2 size={16} className="animate-spin" /> : 'Create Transaction'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!editTx} onClose={() => setEditTx(null)} title="Edit Transaction">
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

      {/* Delete Confirm Modal */}
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
              {deleteTx && fmt(deleteTx.amount, deleteTx.currency)} · {deleteTx?.status}
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-700/50">
            <button onClick={() => setDeleteTx(null)} className="btn-ghost">Cancel</button>
            <button onClick={onDelete} disabled={isDeleting}
              className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50">
              {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
