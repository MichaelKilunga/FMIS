import { useEffect, useState } from 'react'
import { debtsApi, accountsApi } from '../services/api'
import type { Debt, DebtType, DebtStatus } from '../types/debt'
import type { PaginatedResponse } from '../types'
import { Plus, Search, Filter, DollarSign, ArrowUpRight, ArrowDownLeft, Calendar, MoreHorizontal, CheckCircle, AlertCircle, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import DataTable from '../components/DataTable'
import DebtModal from '../components/debts/DebtModal'
import DebtPaymentModal from '../components/debts/DebtPaymentModal'
import { useAuthStore } from '../store'

export default function DebtsPage() {
  const { user } = useAuthStore()
  const [data, setData] = useState<PaginatedResponse<Debt> | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [type, setType] = useState<DebtType | ''>('')
  const [status, setStatus] = useState<DebtStatus | ''>('')
  const [currentPage, setCurrentPage] = useState(1)

  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showPayModal, setShowPayModal] = useState(false)

  const load = async (page = 1) => {
    setLoading(true)
    try {
      const res = await debtsApi.list({ 
        page, 
        search: search || undefined, 
        type: type || undefined, 
        status: status || undefined 
      })
      setData(res.data)
      setCurrentPage(page)
    } catch {
      toast.error('Failed to load debts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => load(1), 300)
    return () => clearTimeout(timer)
  }, [search, type, status])

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this debt record?')) return
    try {
      await debtsApi.delete(id)
      toast.success('Debt record deleted')
      load(currentPage)
    } catch {
      toast.error('Failed to delete debt')
    }
  }

  const columns = [
    {
      header: 'Name',
      accessor: (debt: Debt) => (
        <div>
          <span className="font-medium text-slate-200">{debt.name}</span>
          <p className="text-xs text-slate-500 truncate max-w-[200px]">{debt.description || 'No description'}</p>
        </div>
      )
    },
    {
      header: 'Type',
      accessor: (debt: Debt) => (
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
          debt.type === 'payable' ? 'bg-red-900/30 text-red-400' : 'bg-emerald-900/30 text-emerald-400'
        }`}>
          {debt.type === 'payable' ? <ArrowUpRight size={12} /> : <ArrowDownLeft size={12} />}
          {debt.type.charAt(0).toUpperCase() + debt.type.slice(1)}
        </span>
      )
    },
    {
      header: 'Amount',
      accessor: (debt: Debt) => (
        <div>
          <span className="font-semibold text-slate-200">
            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'TZS' }).format(Number(debt.total_amount))}
          </span>
          <p className="text-[10px] text-slate-500">Remaining: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'TZS' }).format(Number(debt.remaining_amount))}</p>
        </div>
      )
    },
    {
      header: 'Due Date',
      accessor: (debt: Debt) => (
        <div className="flex items-center gap-1.5 text-slate-400 text-xs">
          <Calendar size={12} />
          {debt.due_date ? format(new Date(debt.due_date), 'dd MMM yyyy') : 'No due date'}
        </div>
      )
    },
    {
      header: 'Status',
      accessor: (debt: Debt) => {
        const styles: Record<DebtStatus, string> = {
          active: 'bg-blue-900/30 text-blue-400',
          paid: 'bg-emerald-900/30 text-emerald-400',
          overdue: 'bg-red-900/30 text-red-400',
          defaulted: 'bg-slate-800 text-slate-400',
        }
        return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${styles[debt.status]}`}>{debt.status}</span>
      }
    },
    {
      header: 'Actions',
      accessor: (debt: Debt) => (
        <div className="flex gap-2">
          {debt.status !== 'paid' && user?.permissions.includes('manage-debts') && (
            <button 
              onClick={() => { setSelectedDebt(debt); setShowPayModal(true) }}
              className="p-1.5 rounded text-emerald-400 hover:bg-emerald-900/20 transition-colors"
              title="Record Payment"
            >
              <DollarSign size={16} />
            </button>
          )}
          {user?.permissions.includes('manage-debts') && (
            <button 
              onClick={() => { setSelectedDebt(debt); setShowAddModal(true) }}
              className="p-1.5 rounded text-blue-400 hover:bg-blue-900/20 transition-colors"
              title="Edit"
            >
              <MoreHorizontal size={16} />
            </button>
          )}
          {user?.permissions.includes('manage-debts') && (
            <button 
              onClick={() => handleDelete(debt.id)}
              className="p-1.5 rounded text-slate-500 hover:text-red-400 hover:bg-red-900/20 transition-colors"
              title="Delete"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      )
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Debts & Receivables</h1>
          <p className="text-slate-400 text-sm">Manage what you owe and what is owed to you</p>
        </div>
        {user?.permissions.includes('manage-debts') && (
          <button onClick={() => { setSelectedDebt(null); setShowAddModal(true) }} className="btn-primary w-fit">
            <Plus size={18} /> New Debt Record
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-4 flex items-center gap-4">
          <div className="p-3 bg-red-900/20 text-red-400 rounded-lg">
            <ArrowUpRight size={24} />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Total Payable</p>
            <p className="text-xl font-bold text-white">
              {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'TZS' }).format(
                data?.data.filter(d => d.type === 'payable').reduce((acc, d) => acc + Number(d.remaining_amount), 0) || 0
              )}
            </p>
          </div>
        </div>
        <div className="glass-card p-4 flex items-center gap-4">
          <div className="p-3 bg-emerald-900/20 text-emerald-400 rounded-lg">
            <ArrowDownLeft size={24} />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Total Receivable</p>
            <p className="text-xl font-bold text-white">
              {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'TZS' }).format(
                data?.data.filter(d => d.type === 'receivable').reduce((acc, d) => acc + Number(d.remaining_amount), 0) || 0
              )}
            </p>
          </div>
        </div>
        <div className="glass-card p-4 flex items-center gap-4">
          <div className="p-3 bg-blue-900/20 text-blue-400 rounded-lg">
            <AlertCircle size={24} />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Overdue count</p>
            <p className="text-xl font-bold text-white">{data?.data.filter(d => d.status === 'overdue').length || 0}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center bg-slate-800/40 p-3 rounded-lg border border-slate-700/50">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <input 
            type="text" 
            placeholder="Search by name..." 
            className="w-full bg-slate-900/50 border-slate-700 text-white pl-10 h-10 rounded-md focus:ring-blue-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select 
          className="bg-slate-900/50 border-slate-700 text-white h-10 rounded-md px-3 focus:ring-blue-500 min-w-[140px]"
          value={type}
          onChange={(e) => setType(e.target.value as DebtType | '')}
        >
          <option value="">All Types</option>
          <option value="payable">Payable</option>
          <option value="receivable">Receivable</option>
        </select>
        <select 
          className="bg-slate-900/50 border-slate-700 text-white h-10 rounded-md px-3 focus:ring-blue-500 min-w-[140px]"
          value={status}
          onChange={(e) => setStatus(e.target.value as DebtStatus | '')}
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="overdue">Overdue</option>
          <option value="paid">Paid</option>
          <option value="defaulted">Defaulted</option>
        </select>
      </div>

      <DataTable 
        columns={columns as any}
        data={data}
        loading={loading}
        onPageChange={load}
        emptyMessage="No debt records found"
      />

      <DebtModal 
        isOpen={showAddModal} 
        onClose={() => setShowAddModal(false)} 
        onSuccess={() => { setShowAddModal(false); load(currentPage) }}
        debt={selectedDebt}
      />

      <DebtPaymentModal 
        isOpen={showPayModal} 
        onClose={() => setShowPayModal(false)} 
        onSuccess={() => { setShowPayModal(false); load(currentPage) }}
        debt={selectedDebt}
      />
    </div>
  )
}
