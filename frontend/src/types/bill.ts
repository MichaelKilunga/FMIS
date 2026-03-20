import type { User, TransactionCategory, Account } from './index';

export type BillFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
export type BillStatus = 'active' | 'paused' | 'completed';
export type BillType = 'income' | 'expense';

export interface RecurringBill {
  id: number;
  tenant_id: number;
  description: string;
  amount: number;
  currency: string;
  type: BillType;
  frequency: BillFrequency;
  start_date: string;
  next_due_date: string;
  end_date: string | null;
  status: BillStatus;
  category_id: number | null;
  account_id: number | null;
  created_by: number;
  metadata: any | null;
  last_processed_at: string | null;
  created_at: string;
  updated_at: string;
  
  // Relations
  category?: TransactionCategory;
  account?: Account;
  createdBy?: User;
}

export interface CreateBillData {
  description: string;
  amount: number;
  currency?: string;
  type: BillType;
  frequency: BillFrequency;
  start_date: string;
  next_due_date: string;
  end_date?: string | null;
  category_id?: number | null;
  account_id?: number | null;
  metadata?: any;
}

export interface UpdateBillData extends Partial<CreateBillData> {
  status?: BillStatus;
}
