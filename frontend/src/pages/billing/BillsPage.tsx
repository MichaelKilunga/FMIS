import { useEffect, useState, useCallback } from 'react';
import { billsApi, categoriesApi, accountsApi } from '../../services/api';
import type { RecurringBill, BillStatus, BillType } from '../../types/bill';
import type { TransactionCategory, Account, PaginatedResponse } from '../../types';
import { 
  Plus, Search, Loader2, Pencil, Trash2, Pause, Play, 
  Calendar, CreditCard, ArrowUpCircle, ArrowDownCircle,
  Clock, AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import clsx from 'clsx';
import BillModal from '../../components/billing/BillModal';

export default function BillsPage() {
  const [data, setData] = useState<PaginatedResponse<RecurringBill> | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<BillType | ''>('');
  const [statusFilter, setStatusFilter] = useState<BillStatus | ''>('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState<RecurringBill | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [categories, setCategories] = useState<TransactionCategory[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [billsRes, catsRes, accountsRes] = await Promise.all([
        billsApi.list({ 
          search: search || undefined, 
          type: typeFilter || undefined, 
          status: statusFilter || undefined 
        }),
        categoriesApi.list(),
        accountsApi.list()
      ]);
      setData(billsRes.data);
      setCategories(catsRes.data);
      setAccounts(accountsRes.data);
    } catch (error) {
      toast.error('Failed to load billing data');
    } finally {
      setLoading(false);
    }
  }, [search, typeFilter, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateOrUpdate = async (formData: any) => {
    setIsSubmitting(true);
    try {
      if (selectedBill) {
        await billsApi.update(selectedBill.id, formData);
        toast.success('Bill updated successfully');
      } else {
        await billsApi.create(formData);
        toast.success('Recurring bill created');
      }
      setIsModalOpen(false);
      setSelectedBill(null);
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Action failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this recurring bill?')) return;
    try {
      await billsApi.delete(id);
      toast.success('Bill deleted');
      loadData();
    } catch (error) {
      toast.error('Failed to delete bill');
    }
  };

  const handleToggleStatus = async (bill: RecurringBill) => {
    try {
      if (bill.status === 'active') {
        await billsApi.pause(bill.id);
        toast.success('Bill paused');
      } else {
        await billsApi.resume(bill.id);
        toast.success('Bill resumed');
      }
      loadData();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const getStatusBadge = (status: BillStatus) => {
    switch (status) {
      case 'active': return <span className="badge-approved">Active</span>;
      case 'paused': return <span className="badge-draft">Paused</span>;
      case 'completed': return <span className="badge-posted">Completed</span>;
      default: return <span className="badge-draft">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Recurring Bills</h1>
          <p className="text-slate-400 text-sm">Automate your recurring income and expenses</p>
        </div>
        <button 
          onClick={() => { setSelectedBill(null); setIsModalOpen(true); }}
          className="btn-primary"
        >
          <Plus size={16} /> New Bill
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-4 flex items-center gap-4">
          <div className="p-3 bg-blue-900/30 text-blue-400 rounded-xl">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-400">Total Active Bills</p>
            <p className="text-xl font-bold text-white">{data?.total || 0}</p>
          </div>
        </div>
        <div className="glass-card p-4 flex items-center gap-4">
          <div className="p-3 bg-emerald-900/30 text-emerald-400 rounded-xl">
            <ArrowUpCircle size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-400">Monthly Est. Income</p>
            <p className="text-xl font-bold text-emerald-400">
              {/* This would need real calculation, but let's show a placeholder or basic sum */}
              {data?.data.filter(b => b.type === 'income' && b.status === 'active')
                .reduce((acc, b) => acc + Number(b.amount), 0).toLocaleString()} TZS
            </p>
          </div>
        </div>
        <div className="glass-card p-4 flex items-center gap-4">
          <div className="p-3 bg-rose-900/30 text-rose-400 rounded-xl">
            <ArrowDownCircle size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-400">Monthly Est. Expenses</p>
            <p className="text-xl font-bold text-rose-400">
              {data?.data.filter(b => b.type === 'expense' && b.status === 'active')
                .reduce((acc, b) => acc + Number(b.amount), 0).toLocaleString()} TZS
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            placeholder="Search bills..."
            className="fmis-input pl-9" 
          />
        </div>
        <select 
          value={typeFilter} 
          onChange={e => setTypeFilter(e.target.value as any)}
          className="fmis-select w-40"
        >
          <option value="">All Types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
        <select 
          value={statusFilter} 
          onChange={e => setStatusFilter(e.target.value as any)}
          className="fmis-select w-40"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="completed">Completed</option>
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
                <th>Bill Description</th>
                <th>Amount</th>
                <th>Frequency</th>
                <th>Next Due</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.data.map(bill => (
                <tr key={bill.id}>
                  <td>
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-200">{bill.description}</span>
                      <span className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                        {bill.type === 'income' ? <ArrowUpCircle size={10} className="text-emerald-500" /> : <ArrowDownCircle size={10} className="text-rose-500" />}
                        {bill.type} · {bill.category?.name || 'Uncategorized'}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className={clsx("font-semibold", bill.type === 'income' ? 'text-emerald-400' : 'text-rose-400')}>
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: bill.currency }).format(bill.amount)}
                    </span>
                  </td>
                  <td className="capitalize text-slate-300 transform scale-90 origin-left">
                    <span className="px-2 py-0.5 bg-slate-800 rounded text-xs">{bill.frequency}</span>
                  </td>
                  <td>
                    <div className="flex flex-col">
                      <span className="text-slate-200 text-sm">{format(new Date(bill.next_due_date), 'dd MMM yyyy')}</span>
                      {bill.last_processed_at && (
                        <span className="text-[10px] text-slate-500">Last: {format(new Date(bill.last_processed_at), 'dd MMM')}</span>
                      )}
                    </div>
                  </td>
                  <td>{getStatusBadge(bill.status)}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleToggleStatus(bill)}
                        className={clsx(
                          "p-2 rounded-lg transition-colors",
                          bill.status === 'active' ? "text-amber-400 hover:bg-amber-900/20" : "text-emerald-400 hover:bg-emerald-900/20"
                        )}
                        title={bill.status === 'active' ? 'Pause' : 'Resume'}
                      >
                        {bill.status === 'active' ? <Pause size={16} /> : <Play size={16} />}
                      </button>
                      <button 
                        onClick={() => { setSelectedBill(bill); setIsModalOpen(true); }}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Pencil size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(bill.id)}
                        className="p-2 text-rose-400 hover:bg-rose-900/20 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {data?.data.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-500">
                    <div className="flex flex-col items-center gap-2">
                      <AlertCircle size={24} />
                      <p>No recurring bills found</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {isModalOpen && (
        <BillModal
          isOpen={isModalOpen}
          onClose={() => { setIsModalOpen(false); setSelectedBill(null); }}
          onSubmit={handleCreateOrUpdate}
          initialData={selectedBill}
          categories={categories}
          accounts={accounts}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
}
