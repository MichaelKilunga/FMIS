export type DebtType = 'payable' | 'receivable';
export type DebtStatus = 'active' | 'paid' | 'overdue' | 'defaulted';

export interface Debt {
    id: number;
    tenant_id: number;
    account_id: number | null;
    name: string;
    type: DebtType;
    total_amount: string | number;
    remaining_amount: string | number;
    interest_rate: string | number;
    issue_date: string;
    due_date: string | null;
    status: DebtStatus;
    description: string | null;
    created_at: string;
    updated_at: string;
    account?: {
        id: number;
        name: string;
    };
    payments?: DebtPayment[];
}

export interface DebtPayment {
    id: number;
    debt_id: number;
    transaction_id: number | null;
    amount: string | number;
    payment_date: string;
    notes: string | null;
    created_at: string;
    transaction?: any; // Can be typed properly if Transaction type is available
}

export interface RecordPaymentRequest {
    amount: number;
    account_id?: number;
    payment_date?: string;
    notes?: string;
}
