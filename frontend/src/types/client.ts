export interface Client {
  id: number;
  tenant_id: number;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
  updated_at: string;
  invoices_count?: number;
  debts_count?: number;
}
