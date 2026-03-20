import { useEffect, useState } from 'react'
import { budgetsApi, categoriesApi } from '../../services/api'
import type { Budget, PaginatedResponse, TransactionCategory } from '../../types'
import { Plus, Loader2, AlertTriangle, Calendar, Building2, Tag, Pencil, Trash2 } from 'lucide-react'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import Modal from '../../components/Modal'
import { useForm, type UseFormReturn } from 'react-hook-form'
import { useSettingsStore, useAuthStore } from '../../store'

import Pagination from '../../components/Pagination'

type BudgetFormData = {
  name: string; amount: number; alert_threshold: number; period: string;
  start_date: string; end_date: string; category_id?: number | string; department?: string;
  notes?: string;
}

export default function BudgetsPage() {
  const { user } = useAuthStore()
  const { settings } = useSettingsStore()
  const defaultCurrency = (settings['currency.default'] as string) || 'USD'

  const [data, setData] = useState<PaginatedResponse<Budget> | null>(null)
  const [categories, setCategories] = useState<TransactionCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [isSubmittingForm, setIsSubmittingForm] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  
  const [editBudget, setEditBudget] = useState<Budget | null>(null)
  const [deleteBudget, setDeleteBudget] = useState<Budget | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const createForm = useForm<BudgetFormData>({
    defaultValues: { 
      period: 'monthly', 
      alert_threshold: 80,
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0],
    }
  })

  const editForm = useForm<BudgetFormData>()

  const load = (page = 1) => {
    setLoading(true)
    Promise.all([
      budgetsApi.list({ page }),
      categoriesApi.list({ type: 'expense' })
    ]).then(([resBudgets, resCats]) => {
      setData(resBudgets.data)
      setCategories(resCats.data)
      setCurrentPage(page)
    }).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => {
    load(1)
  }, [])

  const openEdit = (budget: Budget) => {
    setEditBudget(budget)
    editForm.reset({
      name: budget.name,
      amount: budget.amount,
      alert_threshold: budget.alert_threshold,
      period: budget.period,
      start_date: budget.start_date,
      end_date: budget.end_date,
      category_id: budget.category?.id || '',
      department: budget.department || '',
      notes: (budget as any).notes || '',
    })
  }

  const onSubmitForm = async (formData: BudgetFormData) => {
    setIsSubmittingForm(true)
    try {
      await budgetsApi.create({ 
        ...formData, 
        amount: Number(formData.amount), 
        alert_threshold: Number(formData.alert_threshold),
        category_id: formData.category_id ? Number(formData.category_id) : null
      })
      toast.success('Budget created successfully')
      setShowForm(false)
      createForm.reset()
      load(1)
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to create budget')
    } finally {
      setIsSubmittingForm(false)
    }
  }

  const onEditSubmit = async (formData: BudgetFormData) => {
    if (!editBudget) return
    setIsSubmittingForm(true)
    try {
      await budgetsApi.update(editBudget.id, { 
        ...formData, 
        amount: Number(formData.amount), 
        alert_threshold: Number(formData.alert_threshold),
        category_id: formData.category_id ? Number(formData.category_id) : null
      })
      toast.success('Budget updated successfully')
      setEditBudget(null)
      load(currentPage)
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to update budget')
    } finally {
      setIsSubmittingForm(false)
    }
  }

  const onDelete = async () => {
    if (!deleteBudget) return
    setIsDeleting(true)
    try {
      await budgetsApi.delete(deleteBudget.id)
      toast.success('Budget deleted')
      setDeleteBudget(null)
      load(currentPage)
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to delete budget')
    } finally {
      setIsDeleting(false)
    }
  }

  const fmt = (n: number) => {
    const symbol = (settings['currency.symbol'] as string) || ''
    if (symbol) {
      return `${symbol} ${new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, notation: 'compact', maximumFractionDigits: 1 }).format(n)}`
    }
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: defaultCurrency, notation: 'compact', maximumFractionDigits: 1 }).format(n)
  }

  const budgetFormFields = (form: UseFormReturn<BudgetFormData>) => (
    <>
      <div>
        <label className="fmis-label">Budget Name</label>
        <input {...form.register('name', { required: true })} className="fmis-input" placeholder="e.g., Q3 Marketing" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="fmis-label">Target Amount</label>
          <input type="number" step="0.01" {...form.register('amount', { required: true })} className="fmis-input" placeholder="0.00" />
        </div>
        <div>
          <label className="fmis-label">Alert Threshold (%)</label>
          <input type="number" {...form.register('alert_threshold', { required: true, min: 1, max: 100 })} className="fmis-input" placeholder="80" />
        </div>
      </div>

      <div>
        <label className="fmis-label">Period</label>
        <select {...form.register('period')} className="fmis-select">
          <option value="monthly">Monthly</option>
          <option value="quarterly">Quarterly</option>
          <option value="yearly">Yearly</option>
          <option value="custom">Custom</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="fmis-label flex items-center gap-1.5"><Calendar size={14} /> Start Date</label>
          <input type="date" {...form.register('start_date', { required: true })} className="fmis-input" />
        </div>
        <div>
          <label className="fmis-label flex items-center gap-1.5"><Calendar size={14} /> End Date</label>
          <input type="date" {...form.register('end_date', { required: true })} className="fmis-input" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="fmis-label flex items-center gap-1.5"><Tag size={14} /> Category (Optional)</label>
          <select {...form.register('category_id')} className="fmis-select">
            <option value="">Full Department / General</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
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
        <textarea {...form.register('notes')} className="fmis-input min-h-[80px]" placeholder="Budget notes..." />
      </div>
    </>
  )

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Budgets</h1>
          <p className="text-slate-400 text-sm">Track spending against budgeted amounts</p>
        </div>
        {user?.roles.includes('tenant-admin') && (
          <button onClick={() => setShowForm(true)} className="btn-primary">
            <Plus size={16} /> New Budget
          </button>
        )}
      </div>

      {loading && !data ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-blue-500" size={28} /></div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {data?.data.map((budget: Budget) => {
              const usage = budget.usage_percentage ?? 0
              const exceeded = usage >= 100
              const warning = usage >= (budget.alert_threshold ?? 80)
              return (
                <div key={budget.id} className={clsx('glass-card p-5 space-y-3 relative overflow-hidden group transition-all', exceeded && 'border-red-500/30', warning && !exceeded && 'border-yellow-500/30')}>
                  {exceeded && <div className="absolute top-0 right-0 bg-red-500 text-[10px] font-bold text-white px-2 py-0.5 rounded-bl-md uppercase">Over Budget</div>}
                  
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-white">{budget.name}</h3>
                      <div className="flex gap-2 mt-0.5">
                        {budget.category && (
                          <span className="flex items-center gap-1 text-[10px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/20">
                             <Tag size={10} /> {budget.category.name}
                          </span>
                        )}
                        {budget.department && (
                          <span className="flex items-center gap-1 text-[10px] bg-purple-500/10 text-purple-400 px-1.5 py-0.5 rounded border border-purple-500/20">
                             <Building2 size={10} /> {budget.department}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                       {warning && !exceeded && <AlertTriangle size={16} className="text-yellow-400" />}
                       {user?.roles.includes('tenant-admin') && (
                         <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                           <button onClick={() => openEdit(budget)} className="p-1.5 hover:bg-slate-700 rounded-md text-slate-400 hover:text-white transition-colors">
                             <Pencil size={14} />
                           </button>
                           <button onClick={() => setDeleteBudget(budget)} className="p-1.5 hover:bg-rose-900/30 rounded-md text-slate-400 hover:text-rose-400 transition-colors">
                             <Trash2 size={14} />
                           </button>
                         </div>
                       )}
                    </div>
                  </div>
                  {/* Progress */}
                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-slate-400">Spent: <strong className={clsx('text-slate-200')}>{fmt(budget.spent)}</strong></span>
                      <span className="text-slate-400">Budget: <strong className="text-slate-200">{fmt(budget.amount)}</strong></span>
                    </div>
                    <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
                      <div className={clsx('h-full rounded-full transition-all duration-700 ease-out', exceeded ? 'bg-red-500' : warning ? 'bg-yellow-500' : 'bg-emerald-500')}
                        style={{ width: `${Math.min(usage, 100)}%` }} />
                    </div>
                    <div className="flex justify-between text-xs mt-1.5">
                      <span className={clsx('font-medium', exceeded ? 'text-red-400' : warning ? 'text-yellow-400' : 'text-slate-400')}>{usage.toFixed(1)}% used</span>
                      <span className={clsx('font-medium', (budget.variance ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                        {(budget.variance ?? 0) >= 0 ? '+' : ''}{fmt(budget.variance ?? 0)} {(budget.variance ?? 0) >= 0 ? 'remaining' : 'over'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-700/30">
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 uppercase tracking-wider">
                      <Calendar size={10} /> {budget.period} · {budget.start_date} to {budget.end_date}
                    </div>
                  </div>
                </div>
              )
            })}
            {(data?.data.length ?? 0) === 0 && !loading && (
              <div className="col-span-full glass-card p-12 text-center text-slate-500">No budgets configured</div>
            )}
          </div>

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
        </>
      )}

      {/* Create Modal */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="New Budget">
        <form onSubmit={createForm.handleSubmit(onSubmitForm)} className="space-y-4">
          {budgetFormFields(createForm)}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-700/50">
            <button type="button" onClick={() => setShowForm(false)} className="btn-ghost">Cancel</button>
            <button type="submit" disabled={isSubmittingForm} className="btn-primary">
              {isSubmittingForm ? <Loader2 size={16} className="animate-spin" /> : 'Create Budget'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!editBudget} onClose={() => setEditBudget(null)} title="Edit Budget">
        <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
          {budgetFormFields(editForm)}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-700/50">
            <button type="button" onClick={() => setEditBudget(null)} className="btn-ghost">Cancel</button>
            <button type="submit" disabled={isSubmittingForm} className="btn-primary">
              {isSubmittingForm ? <Loader2 size={16} className="animate-spin" /> : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={!!deleteBudget} onClose={() => setDeleteBudget(null)} title="Delete Budget">
        <div className="space-y-4">
          <p className="text-slate-300">
            Are you sure you want to delete <span className="text-white font-semibold">{deleteBudget?.name}</span>?
            This action cannot be undone and will stop tracking spending for this budget.
          </p>
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-700/50">
            <button onClick={() => setDeleteBudget(null)} className="btn-ghost">Cancel</button>
            <button onClick={onDelete} disabled={isDeleting} className="btn-primary bg-rose-600 hover:bg-rose-700">
              {isDeleting ? <Loader2 size={16} className="animate-spin" /> : 'Delete Budget'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
