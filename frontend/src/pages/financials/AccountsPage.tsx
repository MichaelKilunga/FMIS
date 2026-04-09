import { useEffect, useState, useCallback } from 'react'
import { accountsApi, transactionsApi, categoriesApi } from '../../services/api'
import type { Account, TransactionCategory } from '../../types'
import { Plus, Building2, Wallet, Smartphone, CreditCard, Loader2, Edit2, Trash2, CheckCircle2, XCircle, ArrowLeftRight, FileText, Calendar, Search, ArrowUpCircle, ArrowDownCircle } from 'lucide-react'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import Modal from '../../components/Modal'
import { useForm } from 'react-hook-form'
import DataTable from '../../components/DataTable'
import { useCurrency } from '../../hooks/useCurrency'

const typeIcons: Record<string, any> = {
  bank: Building2,
  cash: Wallet,
  mobile_money: Smartphone,
  credit: CreditCard,
}

const typeColors: Record<string, string> = {
  bank: 'text-blue-400 bg-blue-900/30',
  cash: 'text-emerald-400 bg-emerald-900/30',
  mobile_money: 'text-amber-400 bg-amber-900/30',
  credit: 'text-rose-400 bg-rose-900/30',
}

interface AccountFormData {
  name: string
  type: 'bank' | 'cash' | 'mobile_money' | 'credit'
  balance: number
  currency: string
  bank_name?: string
  account_number?: string
  color?: string
  is_active: boolean
  allowed_transaction_types: ('income' | 'expense' | 'transfer')[]
}

interface TransferFormData {
  from_account_id: string
  to_account_id: string
  amount: number
  description: string
  transaction_date: string
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const { formatCurrency, defaultCurrency } = useCurrency()
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [statementAccount, setStatementAccount] = useState<Account | null>(null)
  const [categories, setCategories] = useState<TransactionCategory[]>([])

  const { register, handleSubmit, reset, setValue } = useForm<AccountFormData>({
    defaultValues: {
      type: 'bank',
      currency: defaultCurrency,
      is_active: true,
      balance: 0,
      allowed_transaction_types: ['income', 'expense', 'transfer']
    }
  })

  const { register: registerTransfer, handleSubmit: handleTransferSubmit, reset: resetTransfer, watch: watchTransfer } = useForm<TransferFormData>({
    defaultValues: {
      transaction_date: new Date().toISOString().split('T')[0],
      description: ''
    }
  })

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [accRes, catRes] = await Promise.all([
        accountsApi.list(),
        categoriesApi.list()
      ])
      setAccounts(Array.isArray(accRes.data) ? accRes.data : [])
      setCategories(catRes.data)
    } catch (error) {
      toast.error('Failed to load accounts or categories')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()

    const handleSyncComplete = () => {
      console.log('Sync completed, reloading accounts data...')
      loadData()
    }

    window.addEventListener('fmis-sync-completed', handleSyncComplete)
    return () => window.removeEventListener('fmis-sync-completed', handleSyncComplete)
  }, [loadData])

  const handleEdit = (account: Account) => {
    setEditingAccount(account)
    setValue('name', account.name)
    setValue('type', account.type)
    setValue('balance', account.balance)
    setValue('currency', account.currency)
    setValue('bank_name', account.bank_name || '')
    setValue('account_number', (account as any).account_number || '')
    setValue('color', account.color || '')
    setValue('is_active', account.is_active)
    setValue('allowed_transaction_types', account.allowed_transaction_types || ['income', 'expense', 'transfer'])
    setShowModal(true)
  }

  const handleAddNew = () => {
    setEditingAccount(null)
    reset({
      type: 'bank',
      currency: defaultCurrency,
      is_active: true,
      balance: 0,
      allowed_transaction_types: ['income', 'expense', 'transfer']
    })
    setShowModal(true)
  }

  const handleOpenTransfer = () => {
    resetTransfer({
      transaction_date: new Date().toISOString().split('T')[0],
      description: '',
      amount: 0,
    })
    setShowTransferModal(true)
  }

  const onSubmit = async (data: AccountFormData) => {
    setIsSubmitting(true)
    try {
      if (editingAccount) {
        await accountsApi.update(editingAccount.id, data as any)
        toast.success('Account updated successfully')
      } else {
        await accountsApi.create(data as any)
        toast.success('Account created successfully')
      }
      setShowModal(false)
      loadData()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Operation failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  const onTransferSubmit = async (data: TransferFormData) => {
    setIsSubmitting(true)
    try {
      await accountsApi.transfer(data)
      toast.success('Funds transferred successfully')
      setShowTransferModal(false)
      loadData()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Transfer failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this account?')) return
    try {
      await accountsApi.delete(id)
      toast.success('Account deleted')
      loadData()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete account')
    }
  }

  const columns = [
    {
      header: 'Account Name',
      accessor: (acc: Account) => {
        const Icon = typeIcons[acc.type] || Wallet
        return (
          <div className="flex items-center gap-3">
            <div className={clsx('p-2 rounded-lg', typeColors[acc.type] || 'bg-slate-800 text-slate-400')}>
              <Icon size={18} />
            </div>
            <div>
              <p className="font-medium text-slate-200">{acc.name}</p>
              <p className="text-xs text-slate-500 uppercase">{acc.type.replace('_', ' ')}</p>
            </div>
          </div>
        )
      }
    },
    {
      header: 'Usage Restrictions',
      priority: 3,
      accessor: (acc: Account) => (
        <div className="flex flex-wrap gap-1">
          {(!acc.allowed_transaction_types || acc.allowed_transaction_types.length === 0 || acc.allowed_transaction_types.length === 3) ? (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 uppercase">Unrestricted</span>
          ) : (
            acc.allowed_transaction_types.map(t => (
              <span key={t} className={clsx(
                "text-[10px] px-1.5 py-0.5 rounded border uppercase",
                t === 'income' ? "bg-emerald-900/30 text-emerald-400 border-emerald-800/50" :
                t === 'expense' ? "bg-rose-900/30 text-rose-400 border-rose-800/50" :
                "bg-blue-900/30 text-blue-400 border-blue-800/50"
              )}>
                {t}
              </span>
            ))
          )}
        </div>
      )
    },
    {
      header: 'Bank/Provider',
      priority: 4,
      accessor: (acc: Account) => (
        <span className="text-slate-400">{acc.bank_name || '—'}</span>
      )
    },
    {
      header: 'Balance',
      priority: 2,
      accessor: (acc: Account) => (
        <div className="text-right">
          <p className="font-bold text-slate-100">
            {formatCurrency(acc.balance, acc.currency)}
          </p>
        </div>
      ),
      className: 'text-right'
    },
    {
      header: 'Status',
      priority: 2,
      accessor: (acc: Account) => (
        <div className="flex items-center gap-1.5">
          {acc.is_active ? (
            <CheckCircle2 size={14} className="text-emerald-400" />
          ) : (
            <XCircle size={14} className="text-slate-500" />
          )}
          <span className={clsx('text-xs font-medium', acc.is_active ? 'text-emerald-400' : 'text-slate-500')}>
            {acc.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>
      )
    },
    {
      header: 'Actions',
      accessor: (acc: Account) => (
        <div className="flex items-center gap-2">
          <button onClick={() => setStatementAccount(acc)} className="p-1.5 text-emerald-400 hover:bg-emerald-900/30 rounded-lg transition-colors" title="View Statement">
            <FileText size={14} />
          </button>
          <button onClick={() => handleEdit(acc)} className="p-1.5 text-blue-400 hover:bg-blue-900/30 rounded-lg transition-colors" title="Edit">
            <Edit2 size={14} />
          </button>
          <button onClick={() => handleDelete(acc.id)} className="p-1.5 text-rose-400 hover:bg-rose-900/30 rounded-lg transition-colors" title="Delete">
            <Trash2 size={14} />
          </button>
        </div>
      ),
      className: 'w-20'
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Financial Accounts</h1>
          <p className="text-slate-400 text-sm">Manage your bank accounts, cash, and mobile money wallets</p>
        </div>
        <div className="flex gap-2 self-start sm:self-center">
          <button onClick={handleOpenTransfer} className="btn-secondary">
            <ArrowLeftRight size={16} /> Transfer
          </button>
          <button onClick={handleAddNew} className="btn-primary">
            <Plus size={16} /> Add Account
          </button>
        </div>
      </div>

      <DataTable
        columns={columns as any}
        data={{ data: accounts, current_page: 1, last_page: 1, per_page: accounts.length, total: accounts.length }}
        loading={loading}
        emptyMessage="No accounts found. Create one to get started."
      />

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingAccount ? 'Edit Account' : 'New Account'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="fmis-label">Account Name</label>
              <input {...register('name', { required: true })} className="fmis-input" placeholder="e.g. CRDB Corporate" />
            </div>

            <div>
              <label className="fmis-label">Account Type</label>
              <select {...register('type', { required: true })} className="fmis-select">
                <option value="bank">Bank Account</option>
                <option value="cash">Petty Cash</option>
                <option value="mobile_money">Mobile Money</option>
                <option value="credit">Credit Card / Loan</option>
              </select>
            </div>

            <div>
              <label className="fmis-label">Currency</label>
              <input {...register('currency', { required: true })} className="fmis-input uppercase" placeholder="TZS" maxLength={3} />
            </div>

            <div>
              <label className="fmis-label">Current Balance</label>
              <input type="number" step="0.01" {...register('balance', { required: true })} className="fmis-input" placeholder="0.00" />
            </div>

            <div>
              <label className="fmis-label">Status</label>
              <select {...register('is_active')} className="fmis-select">
                <option value="true">Active</option>
                <option value="false">Inactive / Hidden</option>
              </select>
            </div>

            <div className="sm:col-span-2 pt-2 border-t border-slate-700/50 mt-2">
              <p className="text-xs font-semibold text-slate-500 uppercase mb-3">Optional Details</p>
            </div>

            <div className="sm:col-span-2 space-y-2">
              <label className="fmis-label">Allowed Usage (Restrictions)</label>
              <div className="grid grid-cols-3 gap-2">
                {['income', 'expense', 'transfer'].map(type => (
                  <label key={type} className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/50 border border-slate-700/50 cursor-pointer hover:bg-slate-800 transition-colors">
                    <input
                      type="checkbox"
                      value={type}
                      {...register('allowed_transaction_types')}
                      className="rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-800"
                    />
                    <span className="text-xs font-medium text-slate-300 uppercase">{type}</span>
                  </label>
                ))}
              </div>
              <p className="text-[10px] text-slate-500 italic">Uncheck types to restrict this account from being used for those purposes.</p>
            </div>

            <div>
              <label className="fmis-label">Bank Name</label>
              <input {...register('bank_name')} className="fmis-input" placeholder="e.g. CRDB Bank" />
            </div>

            <div>
              <label className="fmis-label">Account Number</label>
              <input {...register('account_number')} className="fmis-input" placeholder="e.g. 01XXXXXXXX" />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-700/50 mt-4">
            <button type="button" onClick={() => setShowModal(false)} className="btn-ghost">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary">
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : (editingAccount ? 'Update Account' : 'Create Account')}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showTransferModal} onClose={() => setShowTransferModal(false)} title="Transfer Funds">
        <form onSubmit={handleTransferSubmit(onTransferSubmit)} className="space-y-4">
          <div className="space-y-4">
            <div>
              <label className="fmis-label">Source Account</label>
              <select {...registerTransfer('from_account_id', { required: true })} className="fmis-select">
                <option value="">Select source account</option>
                {accounts.filter(acc => acc.is_active).map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({formatCurrency(acc.balance, acc.currency)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="fmis-label">Destination Account</label>
              <select {...registerTransfer('to_account_id', { required: true })} className="fmis-select">
                <option value="">Select destination account</option>
                {accounts.filter(acc => acc.is_active && acc.id.toString() !== watchTransfer('from_account_id')).map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({formatCurrency(acc.balance, acc.currency)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="fmis-label">Amount</label>
              <div className="relative">
                <input 
                  type="number" 
                  step="0.01" 
                  {...registerTransfer('amount', { required: true, min: 0.01 })} 
                  className="fmis-input pr-12" 
                  placeholder="0.00" 
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <span className="text-slate-500 text-sm">
                    {accounts.find(a => a.id.toString() === watchTransfer('from_account_id'))?.currency || defaultCurrency}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <label className="fmis-label">Transfer Date</label>
              <input type="date" {...registerTransfer('transaction_date', { required: true })} className="fmis-input" />
            </div>

            <div>
              <label className="fmis-label">Description (Optional)</label>
              <input {...registerTransfer('description')} className="fmis-input" placeholder="e.g. Internal funds transfer" />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-700/50 mt-4">
            <button type="button" onClick={() => setShowTransferModal(false)} className="btn-ghost">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary">
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'Execute Transfer'}
            </button>
          </div>
        </form>
      </Modal>

      <AccountStatementModal 
        account={statementAccount} 
        onClose={() => setStatementAccount(null)} 
        categories={categories}
      />
    </div>
  )
}

function AccountStatementModal({ account, onClose, categories }: { account: Account | null, onClose: () => void, categories: TransactionCategory[] }) {
  const { formatCurrency } = useCurrency()
  const [loading, setLoading] = useState(false)
  const [transactions, setTransactions] = useState<any[]>([])
  const [categoryFilter, setCategoryFilter] = useState('')
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date()
    d.setDate(1) // Start of month
    return d.toISOString().split('T')[0]
  })
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0])

  const loadStatement = async () => {
    if (!account) return
    setLoading(true)
    try {
      const res = await transactionsApi.list({
        account_id: account.id,
        category_id: categoryFilter,
        from: dateFrom,
        to: dateTo,
        per_page: 100, // Load a good amount for the statement
        status: 'posted', // Usually statements show finalized transactions
      })
      setTransactions(res.data.data)
    } catch {
      toast.error('Failed to load statement transactions')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (account) loadStatement()
  }, [account, dateFrom, dateTo, categoryFilter])

  if (!account) return null

  const totalIn = transactions
    .filter(t => t.type === 'income' || (t.type === 'transfer' && t.to_account_id === account.id))
    .reduce((sum, t) => sum + Number(t.amount), 0)
  
  const totalOut = transactions
    .filter(t => t.type === 'expense' || (t.type === 'transfer' && t.account_id === account.id))
    .reduce((sum, t) => sum + Number(t.amount), 0)

  return (
    <Modal isOpen={!!account} onClose={onClose} title={`Account Statement: ${account.name}`} size="xl">
      <div className="space-y-6">
        {/* Period Selector & Summary */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">From</label>
              <input 
                type="date" 
                value={dateFrom} 
                onChange={e => setDateFrom(e.target.value)} 
                className="fmis-input py-1 text-sm w-36" 
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">To</label>
              <input 
                type="date" 
                value={dateTo} 
                onChange={e => setDateTo(e.target.value)} 
                className="fmis-input py-1 text-sm w-36" 
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Category</label>
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="fmis-select py-1 text-sm w-40"
              >
                <option value="">All Categories</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <button 
              onClick={loadStatement}
              className="mt-5 p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              <Search size={16} />
            </button>
          </div>

          <div className="flex gap-6">
            <div className="text-right">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Inflow</p>
              <p className="text-emerald-400 font-bold text-lg">{formatCurrency(totalIn, account.currency)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Outflow</p>
              <p className="text-rose-400 font-bold text-lg">{formatCurrency(totalOut, account.currency)}</p>
            </div>
          </div>
        </div>

        {/* Transactions list */}
        <div className="max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-500">
              <Loader2 className="animate-spin" size={32} />
              <p>Fetching transaction history...</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12 text-slate-500 bg-slate-900/20 rounded-xl border border-dashed border-slate-800">
              <p>No posted transactions found for this period.</p>
            </div>
          ) : (
            <table className="w-full text-left border-separate border-spacing-y-2">
              <thead className="sticky top-0 bg-slate-950 z-10">
                <tr className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-4 py-2">Date</th>
                  <th className="px-4 py-2">Details</th>
                  <th className="px-4 py-2 text-right">Inflow</th>
                  <th className="px-4 py-2 text-right">Outflow</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(t => {
                  const isInflow = t.type === 'income' || (t.type === 'transfer' && t.to_account_id === account.id)
                  return (
                    <tr key={t.id} className="bg-slate-900/40 hover:bg-slate-800/60 transition-colors group">
                      <td className="px-4 py-3 rounded-l-xl border-y border-l border-slate-800/40 group-hover:border-slate-700/60">
                        <span className="text-sm text-slate-400 whitespace-nowrap">
                          {new Date(t.transaction_date).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
                        </span>
                      </td>
                      <td className="px-4 py-3 border-y border-slate-800/40 group-hover:border-slate-700/60">
                        <p className="text-sm font-medium text-slate-200 line-clamp-1">{t.description}</p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-tight">{t.reference} · {t.type}</p>
                      </td>
                      <td className="px-4 py-3 border-y border-slate-800/40 group-hover:border-slate-700/60 text-right">
                        {isInflow ? (
                          <div className="flex items-center justify-end gap-1.5 text-emerald-400 font-bold tabular-nums">
                            <span>{formatCurrency(t.amount, account.currency)}</span>
                            <ArrowUpCircle size={14} className="opacity-50" />
                          </div>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 rounded-r-xl border-y border-r border-slate-800/40 group-hover:border-slate-700/60 text-right">
                        {!isInflow ? (
                          <div className="flex items-center justify-end gap-1.5 text-rose-400 font-bold tabular-nums">
                            <span>{formatCurrency(t.amount, account.currency)}</span>
                            <ArrowDownCircle size={14} className="opacity-50" />
                          </div>
                        ) : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-700/50">
          <button onClick={onClose} className="btn-primary px-8">Close</button>
        </div>
      </div>
    </Modal>
  )
}
