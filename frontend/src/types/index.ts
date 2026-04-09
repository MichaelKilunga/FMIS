// ============================================
// FMIS TypeScript Type Definitions
// ============================================

export interface Tenant {
  id: number
  name: string
  slug: string
  email?: string
  phone?: string
  address?: string
  logo?: string
  favicon?: string
  primary_color: string
  secondary_color: string
  accent_color: string
  currency: string
  timezone: string
  plan: 'basic' | 'pro' | 'enterprise'
  is_active: boolean
}

export interface User {
  id: number
  name: string
  email: string
  phone?: string
  department?: string
  locale?: string
  avatar_url: string
  is_active: boolean
  is_verified: boolean
  tenant_id: number
  roles: string[]
  permissions: string[]
  seniority_level: number
}

export interface TransactionCategory {
  id: number
  tenant_id: number
  parent_id?: number
  name: string
  type: 'income' | 'expense'
  color: string
  icon?: string
}

export interface Account {
  id: number
  tenant_id: number
  name: string
  type: 'bank' | 'cash' | 'mobile_money' | 'credit'
  balance: number
  currency: string
  bank_name?: string
  color?: string
  is_active: boolean
  allowed_transaction_types?: ('income' | 'expense' | 'transfer')[]
}

export interface TransferFundsData {
  from_account_id: string | number
  to_account_id: string | number
  amount: number
  description?: string
  transaction_date: string
}

export type TransactionStatus = 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'posted'

export interface Transaction {
  id: number
  tenant_id: number
  reference: string
  amount: number
  type: 'income' | 'expense' | 'transfer'
  category?: TransactionCategory
  category_id?: number
  account?: Account
  account_id?: number
  budget?: Budget
  budget_id?: number
  department?: string
  created_by: number
  description: string
  notes?: string
  attachments?: string[]
  status: TransactionStatus
  transaction_date: string
  currency: string
  created_at: string
  updated_at: string
}

export * from './bill'
export * from './debt'
export * from './task'
export * from './client'

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'

export interface InvoiceItem {
  id: number
  description: string
  quantity: number
  unit?: string
  unit_price: number
  subtotal: number
}

export interface Invoice {
  id: number
  number: string
  tenant_id: number
  client_name: string
  client_email?: string
  client_phone?: string
  client_address?: string
  status: InvoiceStatus
  issue_date: string
  due_date?: string
  subtotal: number
  tax_rate: number
  tax_amount: number
  discount: number
  total: number
  currency: string
  notes?: string
  terms?: string
  items: InvoiceItem[]
  pdf_url?: string
  created_at: string
}

export interface Budget {
  id: number
  name: string
  department?: string
  amount: number
  spent: number
  alert_threshold: number
  period: 'monthly' | 'quarterly' | 'yearly' | 'custom'
  start_date: string
  end_date: string
  status: 'active' | 'exceeded' | 'completed'
  category?: TransactionCategory
  variance: number
  usage_percentage: number
}

export interface ApprovalWorkflow {
  id: number
  name: string
  module: 'transaction' | 'invoice' | 'budget'
  conditions?: Record<string, unknown>
  is_active: boolean
  steps: ApprovalStep[]
}

export interface ApprovalStep {
  id: number
  workflow_id: number
  step_order: number
  role_name: string
  threshold_min?: number
  threshold_max?: number
  sla_hours: number
  require_all?: boolean
}

export interface Approval {
  id: number
  approvable: Transaction
  workflow: ApprovalWorkflow
  current_step: number
  status: 'pending' | 'approved' | 'rejected'
  logs: ApprovalLog[]
  /** Injected by API: has the currently authenticated user already acted on this? */
  has_user_acted?: boolean
  /** The action the current user took: 'approved' | 'rejected' | null */
  user_action?: 'approved' | 'rejected' | null
  /** ISO timestamp of when the current user acted */
  user_acted_at?: string | null
  created_at: string
  updated_at: string
}

export interface ApprovalLog {
  id: number
  step_id: number
  user: User
  action: 'approved' | 'rejected' | 'escalated' | 'commented'
  comment?: string
  created_at: string
}

export interface AuditLog {
  id: number
  user?: User
  tenant?: Tenant
  action: string
  model_type?: string
  model_id?: number
  before?: Record<string, unknown>
  after?: Record<string, unknown>
  ip_address?: string
  created_at: string
}

export interface FraudRule {
  id: number
  name: string
  type: 'duplicate' | 'abnormal_amount' | 'suspicious_timing' | 'velocity'
  conditions: Record<string, unknown>
  severity: 'low' | 'medium' | 'high' | 'critical'
  is_active: boolean
}

export interface FraudAlert {
  id: number
  transaction?: Transaction
  rule: FraudRule
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: 'open' | 'investigating' | 'resolved' | 'false_positive'
  details?: string
  created_at: string
}

export interface AnalyticsSummary {
  totalIncome: number
  totalExpense: number
  pendingIncome: number
  pendingExpense: number
  pendingApprovals: number
  openFraudAlerts: number
  highSeverityFraudAlerts: number
  activeBudgets: number
  exceededBudgets: number
  budgetAtRisk: number
  totalPendingValue: number
  activeElection: boolean
  totalPayable: number
  totalReceivable: number
  overdueDebtsCount: number
  activeBillsCount: number
  upcomingBillsCount: number
  monthlyRecurringIncome: number
  monthlyRecurringExpense: number
  tasksCount: number
  overdueTasksCount: number
}

export interface CashFlowDataPoint {
  period: string
  income: number
  expense: number
}

export interface ProductivityStats {
  total: number
  completed: number
  overdue: number
  completion_rate: number
  overdue_rate: number
  velocity: number
  weighted_impact: number
  by_priority: { priority: string; count: number }[]
  attendance_rate?: number
  on_time_rate?: number
  staff_present?: number
  staff_expected?: number
}

export interface ForecastDataPoint {
  period: string
  income: number
  expense: number
  balance: number
}

export interface FinancialHealth {
  score: number
  indices: {
    budget: number
    debt: number
    cash_flow: number
  }
  insights: string[]
}

export interface PaginatedData<T> {
  data: T[]
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export type PaginatedResponse<T> = PaginatedData<T>

// Settings schema
export interface Settings {
  [key: string]: string | boolean | number
}

// Offline sync types
export interface OfflineQueueItem {
  id?: number
  entity_type: string
  entity_id: string
  action: 'created' | 'updated' | 'deleted'
  payload: Record<string, unknown>
  client_ts: number
  synced: boolean
  attempts: number
}
