import { useForm } from 'react-hook-form'
import { useEffect, useState } from 'react'
import { debtsApi, accountsApi } from '../../services/api'
import type { Debt } from '../../types/debt'
import Modal from '../Modal'
import toast from 'react-hot-toast'
import { Loader2 } from 'lucide-react'

interface DebtFormData {
  [key: string]: any
  name: string
  type: 'payable' | 'receivable'
  total_amount: number
  interest_rate: number
  issue_date: string
  due_date?: string
  account_id?: string
  description?: string
}

export default function DebtModal({
  isOpen, onClose, onSuccess, debt
}: {
  isOpen: boolean; onClose: () => void; onSuccess: () => void; debt: Debt | null;
}) {
  const [loading, setLoading] = useState(false)
  const [accounts, setAccounts] = useState<any[]>([])
  
  const { register, handleSubmit, reset, setValue } = useForm<DebtFormData>({
    defaultValues: {
      type: 'payable',
      issue_date: new Date().toISOString().split('T')[0],
      total_amount: 0,
      interest_rate: 0
    }
  })

  useEffect(() => {
    if (isOpen) {
      accountsApi.list().then(res => setAccounts(res.data)).catch(() => {})
      if (debt) {
        setValue('name', debt.name)
        setValue('type', debt.type)
        setValue('total_amount', Number(debt.total_amount))
        setValue('interest_rate', Number(debt.interest_rate))
        setValue('issue_date', debt.issue_date)
        setValue('due_date', debt.due_date || '')
        setValue('account_id', debt.account_id?.toString() || '')
        setValue('description', debt.description || '')
      } else {
        reset({
          type: 'payable',
          issue_date: new Date().toISOString().split('T')[0],
          total_amount: 0,
          interest_rate: 0
        })
      }
    }
  }, [isOpen, debt, setValue, reset])

  const onSubmit = async (data: DebtFormData) => {
    setLoading(true)
    try {
      if (debt) {
        await debtsApi.update(debt.id, data)
        toast.success('Debt record updated')
      } else {
        await debtsApi.create(data)
        toast.success('Debt record created')
      }
      onSuccess()
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={debt ? 'Edit Debt Record' : 'New Debt Record'}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="fmis-label">Title / Name <span className="text-red-400">*</span></label>
          <input {...register('name', { required: true })} className="fmis-input" placeholder="e.g. Bank Loan, Client Advance" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="fmis-label">Type</label>
            <select {...register('type')} className="fmis-select" disabled={!!debt}>
              <option value="payable">Payable (Liabilities)</option>
              <option value="receivable">Receivable (Assets)</option>
            </select>
          </div>
          <div>
            <label className="fmis-label">Associated Account</label>
            <select {...register('account_id')} className="fmis-select">
              <option value="">No Account</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="fmis-label">Total Amount <span className="text-red-400">*</span></label>
            <input type="number" step="0.01" {...register('total_amount', { required: true, min: 0.01 })} className="fmis-input" />
          </div>
          <div>
            <label className="fmis-label">Interest Rate (%)</label>
            <input type="number" step="0.01" {...register('interest_rate')} className="fmis-input" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="fmis-label">Issue Date</label>
            <input type="date" {...register('issue_date', { required: true })} className="fmis-input" />
          </div>
          <div>
            <label className="fmis-label">Due Date</label>
            <input type="date" {...register('due_date')} className="fmis-input" />
          </div>
        </div>

        <div>
          <label className="fmis-label">Description</label>
          <textarea {...register('description')} rows={3} className="fmis-input" placeholder="Notes about this debt..." />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? <Loader2 size={16} className="animate-spin" /> : (debt ? 'Update Record' : 'Create Record')}
          </button>
        </div>
      </form>
    </Modal>
  )
}
