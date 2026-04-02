import { useForm } from 'react-hook-form';
import { Loader2, Calendar, Tag, Wallet, Hash } from 'lucide-react';
import type { CreateBillData, RecurringBill } from '../../types/bill';
import type { TransactionCategory, Account } from '../../types';
import Modal from '../Modal';
import { useCurrency } from '../../hooks/useCurrency';

interface BillModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  initialData?: RecurringBill | null;
  categories: TransactionCategory[];
  accounts: Account[];
  isSubmitting: boolean;
}

export default function BillModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  categories,
  accounts,
  isSubmitting
}: BillModalProps) {
  const { defaultCurrency } = useCurrency();
  const { register, handleSubmit, formState: { errors }, reset } = useForm<CreateBillData>({
    defaultValues: initialData ? {
      description: initialData.description,
      amount: initialData.amount,
      type: initialData.type,
      frequency: initialData.frequency,
      start_date: initialData.start_date.substring(0, 10),
      next_due_date: initialData.next_due_date.substring(0, 10),
      end_date: initialData.end_date?.substring(0, 10) || null,
      category_id: initialData.category_id,
      account_id: initialData.account_id,
      currency: initialData.currency,
    } : {
      type: 'expense',
      frequency: 'monthly',
      start_date: new Date().toISOString().substring(0, 10),
      next_due_date: new Date().toISOString().substring(0, 10),
      currency: defaultCurrency,
    }
  });

  const onFormSubmit = async (data: CreateBillData) => {
    await onSubmit(data);
    if (!initialData) reset();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Recurring Bill' : 'New Recurring Bill'}
    >
      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
        <div>
          <label className="fmis-label">Description</label>
          <input
            {...register('description', { required: 'Description is required' })}
            className="fmis-input"
            placeholder="e.g., Monthly Rent, Internet Subscription"
          />
          {errors.description && <span className="text-red-400 text-xs">{errors.description.message}</span>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="fmis-label flex items-center gap-1.5"><Hash size={14} /> Amount</label>
            <input
              type="number"
              step="0.01"
              {...register('amount', { required: 'Amount is required', min: 0.01 })}
              className="fmis-input"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="fmis-label">Currency</label>
            <select {...register('currency')} className="fmis-select">
              <option value="TZS">TZS</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="fmis-label">Type</label>
            <select {...register('type')} className="fmis-select">
              <option value="expense">Expense (We pay)</option>
              <option value="income">Income (Customer pays us)</option>
            </select>
          </div>
          <div>
            <label className="fmis-label">Frequency</label>
            <select {...register('frequency')} className="fmis-select">
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="fmis-label flex items-center gap-1.5"><Calendar size={14} /> Start Date</label>
            <input
              type="date"
              {...register('start_date', { required: 'Start date is required' })}
              className="fmis-input"
            />
          </div>
          <div>
            <label className="fmis-label flex items-center gap-1.5"><Calendar size={14} /> Next Due Date</label>
            <input
              type="date"
              {...register('next_due_date', { required: 'Next due date is required' })}
              className="fmis-input"
            />
          </div>
        </div>

        <div>
          <label className="fmis-label flex items-center gap-1.5"><Calendar size={14} /> End Date (Optional)</label>
          <input
            type="date"
            {...register('end_date')}
            className="fmis-input"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="fmis-label flex items-center gap-1.5"><Tag size={14} /> Category</label>
            <select {...register('category_id')} className="fmis-select">
              <option value="">Select Category</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="fmis-label flex items-center gap-1.5"><Wallet size={14} /> Default Account</label>
            <select {...register('account_id')} className="fmis-select">
              <option value="">Select Account</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-700/50">
          <button type="button" onClick={onClose} className="btn-ghost" disabled={isSubmitting}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : (initialData ? 'Save Changes' : 'Create Bill')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
