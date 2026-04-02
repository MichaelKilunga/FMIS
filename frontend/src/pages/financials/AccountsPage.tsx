import { useEffect, useState } from 'react'
import { accountsApi } from '../../services/api'
import type { Account } from '../../types'
import { Plus, Building2, Wallet, Smartphone, CreditCard, Loader2, Edit2, Trash2, CheckCircle2, XCircle } from 'lucide-react'
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

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const { formatCurrency, defaultCurrency } = useCurrency()
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { register, handleSubmit, reset, setValue } = useForm<AccountFormData>({
    defaultValues: {
      type: 'bank',
      currency: defaultCurrency,
      is_active: true,
      balance: 0,
      allowed_transaction_types: ['income', 'expense', 'transfer']
    }
  })

  const loadAccounts = async () => {
    setLoading(true)
    try {
      const res = await accountsApi.list()
      // Accounts list is not paginated based on the controller
      setAccounts(Array.isArray(res.data) ? res.data : [])
    } catch (error) {
      toast.error('Failed to load accounts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAccounts()

    const handleSyncComplete = () => {
      console.log('Sync completed, reloading accounts data...')
      loadAccounts()
    }

    window.addEventListener('fmis-sync-completed', handleSyncComplete)
    return () => window.removeEventListener('fmis-sync-completed', handleSyncComplete)
  }, [])

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
      loadAccounts()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Operation failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this account?')) return
    try {
      await accountsApi.delete(id)
      toast.success('Account deleted')
      loadAccounts()
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
        <button onClick={handleAddNew} className="btn-primary self-start sm:self-center">
          <Plus size={16} /> Add Account
        </button>
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
    </div>
  )
}
