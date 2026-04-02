import { useForm } from 'react-hook-form'
import { useEffect, useState } from 'react'
import { debtsApi, accountsApi } from '../../services/api'
import { useCurrency } from '../../hooks/useCurrency'
import type { Debt } from '../../types/debt'
import Modal from '../Modal'
import toast from 'react-hot-toast'
import { Loader2 } from 'lucide-react'

interface PaymentFormData {
  amount: number
  account_id: string
  payment_date: string
  notes: string
}

export default function DebtPaymentModal({
  isOpen, onClose, onSuccess, debt
}: {
  isOpen: boolean; onClose: () => void; onSuccess: () => void; debt: Debt | null;
}) {
  const { formatCurrency } = useCurrency()
  const [loading, setLoading] = useState(false)
  const [accounts, setAccounts] = useState<any[]>([])
  
  const { register, handleSubmit, reset } = useForm<PaymentFormData>({
    defaultValues: {
      payment_date: new Date().toISOString().split('T')[0],
      amount: 0
    }
  })

  useEffect(() => {
    if (isOpen) {
      accountsApi.list().then(res => setAccounts(res.data)).catch(() => {})
      if (debt) {
        reset({
          amount: Number(debt.remaining_amount),
          payment_date: new Date().toISOString().split('T')[0],
          account_id: debt.account_id?.toString() || '',
          notes: `Payment for ${debt.name}`
        })
      }
    }
  }, [isOpen, debt, reset])

  const onSubmit = async (data: PaymentFormData) => {
    if (!debt) return
    setLoading(true)
    try {
      await debtsApi.recordPayment(debt.id, {
        ...data,
        amount: Number(data.amount),
        account_id: data.account_id ? Number(data.account_id) : undefined
      })
      toast.success('Payment recorded successfully')
      onSuccess()
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to record payment')
    } finally {
      setLoading(false)
    }
  }

  if (!debt) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Record Payment: ${debt.name}`}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50 mb-4">
          <p className="text-xs text-slate-400">Remaining Balance</p>
          <p className="text-xl font-bold text-white">
            {formatCurrency(Number(debt.remaining_amount))}
          </p>
        </div>

        <div>
          <label className="fmis-label">Payment Amount <span className="text-red-400">*</span></label>
          <input 
            type="number" 
            step="0.01" 
            max={Number(debt.remaining_amount)}
            {...register('amount', { required: true, min: 0.01, max: Number(debt.remaining_amount) })} 
            className="fmis-input" 
          />
        </div>

        <div>
          <label className="fmis-label">Payment Account <span className="text-red-400">*</span></label>
          <select {...register('account_id', { required: true })} className="fmis-select">
            <option value="">Select Account</option>
            {accounts.map(acc => (
              <option key={acc.id} value={acc.id}>{acc.name} (Balance: {acc.balance})</option>
            ))}
          </select>
        </div>

        <div>
          <label className="fmis-label">Payment Date</label>
          <input type="date" {...register('payment_date', { required: true })} className="fmis-input" />
        </div>

        <div>
          <label className="fmis-label">Notes</label>
          <textarea {...register('notes')} rows={2} className="fmis-input" placeholder="Optional payment notes..." />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? <Loader2 size={16} className="animate-spin" /> : 'Confirm Payment'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
