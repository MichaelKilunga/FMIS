import { useEffect, useState } from 'react'
import { categoriesApi } from '../../services/api'
import type { TransactionCategory } from '../../types'
import { Plus, Tag, ArrowDownCircle, ArrowUpCircle, Loader2, Edit2, Trash2, CheckCircle2, XCircle } from 'lucide-react'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import Modal from '../../components/Modal'
import { useForm } from 'react-hook-form'
import DataTable from '../../components/DataTable'

interface CategoryFormData {
  name: string
  type: 'income' | 'expense'
  color?: string
  icon?: string
  description?: string
  parent_id?: number
  is_active: boolean
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<TransactionCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<TransactionCategory | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { register, handleSubmit, reset, setValue } = useForm<CategoryFormData>({
    defaultValues: {
      type: 'expense',
      is_active: true,
      color: '#3B82F6'
    }
  })

  const loadCategories = async () => {
    setLoading(true)
    try {
      const res = await categoriesApi.list()
      setCategories(Array.isArray(res.data) ? res.data : [])
    } catch (error) {
      toast.error('Failed to load categories')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCategories()
  }, [])

  const handleEdit = (category: TransactionCategory) => {
    setEditingCategory(category)
    setValue('name', category.name)
    setValue('type', category.type)
    setValue('color', category.color || '#3B82F6')
    setValue('icon', category.icon || '')
    setValue('description', (category as any).description || '')
    setValue('parent_id', category.parent_id)
    setValue('is_active', (category as any).is_active ?? true)
    setShowModal(true)
  }

  const handleAddNew = () => {
    setEditingCategory(null)
    reset({
      type: 'expense',
      is_active: true,
      color: '#3B82F6'
    })
    setShowModal(true)
  }

  const onSubmit = async (data: CategoryFormData) => {
    setIsSubmitting(true)
    try {
      if (editingCategory) {
        await categoriesApi.update(editingCategory.id, data as any)
        toast.success('Category updated successfully')
      } else {
        await categoriesApi.create(data as any)
        toast.success('Category created successfully')
      }
      setShowModal(false)
      loadCategories()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Operation failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this category?')) return
    try {
      await categoriesApi.delete(id)
      toast.success('Category deleted')
      loadCategories()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete category')
    }
  }

  const columns = [
    {
      header: 'Category Name',
      accessor: (cat: TransactionCategory) => (
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: cat.color }} />
          <div>
            <p className="font-medium text-slate-200">{cat.name}</p>
            <p className="text-xs text-slate-500 capitalize">{cat.type}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Type',
      accessor: (cat: TransactionCategory) => (
        <div className={clsx(
          'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold inline-flex w-fit',
          cat.type === 'income' ? 'bg-emerald-900/40 text-emerald-400' : 'bg-rose-900/40 text-rose-400'
        )}>
          {cat.type === 'income' ? <ArrowDownCircle size={12} /> : <ArrowUpCircle size={12} />}
          {cat.type === 'income' ? 'Income' : 'Expense'}
        </div>
      )
    },
    {
      header: 'Description',
      accessor: (cat: any) => (
        <span className="text-slate-400 text-sm">{cat.description || '—'}</span>
      )
    },
    {
      header: 'Status',
      accessor: (cat: any) => (
        <div className="flex items-center gap-1.5">
          {(cat.is_active ?? true) ? (
            <CheckCircle2 size={14} className="text-emerald-400" />
          ) : (
            <XCircle size={14} className="text-slate-500" />
          )}
          <span className={clsx('text-xs font-medium', (cat.is_active ?? true) ? 'text-emerald-400' : 'text-slate-500')}>
            {(cat.is_active ?? true) ? 'Active' : 'Inactive'}
          </span>
        </div>
      )
    },
    {
      header: 'Actions',
      accessor: (cat: TransactionCategory) => (
        <div className="flex items-center gap-2">
          <button onClick={() => handleEdit(cat)} className="p-1.5 text-blue-400 hover:bg-blue-900/30 rounded-lg transition-colors" title="Edit">
            <Edit2 size={14} />
          </button>
          <button onClick={() => handleDelete(cat.id)} className="p-1.5 text-rose-400 hover:bg-rose-900/30 rounded-lg transition-colors" title="Delete">
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
          <h1 className="text-2xl font-bold text-white">Transaction Categories</h1>
          <p className="text-slate-400 text-sm">Classify your income and expenses for better reporting</p>
        </div>
        <button onClick={handleAddNew} className="btn-primary self-start sm:self-center">
          <Plus size={16} /> Add Category
        </button>
      </div>

      <DataTable
        columns={columns as any}
        data={{ data: categories, current_page: 1, last_page: 1, per_page: categories.length, total: categories.length }}
        loading={loading}
        emptyMessage="No categories found. Create one to get started."
      />

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingCategory ? 'Edit Category' : 'New Category'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="fmis-label">Category Name</label>
            <input {...register('name', { required: true })} className="fmis-input" placeholder="e.g. Office Supplies" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="fmis-label">Type</label>
              <select {...register('type', { required: true })} className="fmis-select">
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>
            <div>
              <label className="fmis-label">Status</label>
              <select {...register('is_active')} className="fmis-select">
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
          </div>

          <div>
            <label className="fmis-label">Theme Color</label>
            <div className="flex items-center gap-3">
              <input type="color" {...register('color')} className="h-10 w-16 rounded cursor-pointer bg-transparent border-0" />
              <input {...register('color')} className="fmis-input font-mono uppercase" placeholder="#3B82F6" maxLength={7} />
            </div>
          </div>

          <div>
            <label className="fmis-label">Description (Optional)</label>
            <textarea {...register('description')} className="fmis-input" rows={3} placeholder="Briefly describe what this category covers..." />
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-700/50 mt-4">
            <button type="button" onClick={() => setShowModal(false)} className="btn-ghost">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary">
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : (editingCategory ? 'Update Category' : 'Create Category')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
