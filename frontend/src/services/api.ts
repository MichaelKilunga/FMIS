import type { RecurringBill, CreateBillData, UpdateBillData } from '../types/bill';
import type { ProductivityStats, ForecastDataPoint, FinancialHealth, TransferFundsData } from '../types';
import axios from 'axios'

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})
import { enqueueOfflineAction, getPendingChanges } from './db'

// Attach token on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('fmis_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Handle 401 and Offline state globally
// Handle 401 and Offline state globally
api.interceptors.response.use(
  async (res) => {
    // Intercept successful GET requests (or cached responses) to merge pending offline creations
    if (res.config.method?.toLowerCase() === 'get') {
      try {
        const cleanUrl = res.config.url?.split('?')[0] || '';
        const sanitizedUrl = cleanUrl.startsWith('/') ? cleanUrl.substring(1) : cleanUrl;
        const urlParts = sanitizedUrl.split('/').filter(Boolean);
        const endpoint = urlParts[0];

        if (['transactions', 'invoices', 'clients', 'budgets', 'accounts', 'transaction-categories', 'attendances'].includes(endpoint) && urlParts.length === 1) {
          const pending = await getPendingChanges();
          
          if (pending && pending.length > 0) {
            const relevantPending = pending.filter(p => p.entity_type === endpoint && p.action === 'created');
            
            if (relevantPending.length > 0) {
              const newItems = relevantPending.map(p => ({
                ...(p.payload as any),
                id: -parseInt(p.id?.toString() || '0'), // Negative ID for offline temp items
                status: 'draft',
                isOffline: true,
                created_at: new Date(p.client_ts || Date.now()).toISOString(),
                amount: Number((p.payload as any).amount || 0),
                total: Number((p.payload as any).total || 0),
              }));
              
              if (res.data && Array.isArray(res.data.data)) {
                res.data.data = [...newItems, ...res.data.data];
              } else if (res.data && Array.isArray(res.data)) {
                res.data = [...newItems, ...res.data];
              }
            }
          }
        }
      } catch (err) {
        console.error('Error merging offline data:', err);
      }
    }
    return res;
  },
  async (error) => {
    const { config, response } = error

    // Handle 401 Unauthorized
    if (response?.status === 401) {
      // Clear both individual token and store state
      localStorage.removeItem('fmis_token')
      try {
        const { logout } = (await import('../store')).useAuthStore.getState()
        logout()
      } catch (e) {
        console.error('Failed to logout from store:', e)
      }

      // Only redirect if we are on a protected route
      if (window.location.pathname.startsWith('/app')) {
        window.location.href = '/login'
      }
    }

    // Handle Offline Mutations (POST, PUT, DELETE)
    // Avoid queueing auth requests or GET requests
    const isMutation = config && ['post', 'put', 'delete'].includes(config.method?.toLowerCase() || '')
    const isAuthRequest = config?.url?.includes('/auth/')
    const isOffline = !window.navigator.onLine || error.code === 'ERR_NETWORK' || !response

    if (isMutation && !isAuthRequest && isOffline) {
      console.warn('Network error detected. Queueing request for offline sync:', config.url)
      
      const cleanUrl = config.url?.split('?')[0] || '';
      const sanitizedUrl = cleanUrl.startsWith('/') ? cleanUrl.substring(1) : cleanUrl;
      const urlParts = sanitizedUrl.split('/').filter(Boolean) || []
      
      const entityType = urlParts[0] || 'unknown'
      const entityId = urlParts.length > 1 ? urlParts[1] : 'new'

      const action = config.method?.toLowerCase() === 'post' ? 'created' 
                   : config.method?.toLowerCase() === 'put' ? 'updated' 
                   : 'deleted'

      try {
        await enqueueOfflineAction(
          entityType,
          entityId,
          action as any,
          config.data && typeof config.data === 'string' ? JSON.parse(config.data) : (config.data || {})
        )
        // Return a mock success response so the UI doesn't break
        return { data: { message: 'Action queued for offline sync' }, status: 202 }
      } catch (dbError) {
        console.error('Failed to queue offline action:', dbError)
      }
    }

    // Attempt to return ONLY offline data if we failed a GET request completely
    if (config?.method?.toLowerCase() === 'get' && isOffline && !isAuthRequest) {
      const cleanUrl = config.url?.split('?')[0] || '';
      const sanitizedUrl = cleanUrl.startsWith('/') ? cleanUrl.substring(1) : cleanUrl;
      const urlParts = sanitizedUrl.split('/').filter(Boolean) || [];
      const endpoint = urlParts[0];

      if (['transactions', 'invoices', 'clients', 'budgets', 'accounts', 'transaction-categories', 'attendances'].includes(endpoint) && urlParts.length === 1) {
          try {
            const pending = await getPendingChanges();
            const relevantPending = pending.filter(p => p.entity_type === endpoint && p.action === 'created');
            
            const newItems = relevantPending.map(p => ({
              ...(p.payload as any),
              id: -parseInt(p.id?.toString() || '0'),
              status: 'draft',
              isOffline: true,
              created_at: new Date(p.client_ts || Date.now()).toISOString(),
              amount: Number((p.payload as any).amount || 0),
              total: Number((p.payload as any).total || 0),
            }));
            
            return {
              data: ['accounts', 'transaction-categories'].includes(endpoint) ? newItems : {
                data: newItems, current_page: 1, last_page: 1, total: newItems.length, per_page: 15
              },
              status: 200,
              config,
              headers: {}
            };
          } catch(err) { }
      }
    }

    return Promise.reject(error)
  }
)

export default api

// --- Module API helpers ---
export const authApi = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  register: (data: Record<string, unknown>) => api.post('/auth/register', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  updateProfile: (data: FormData) => api.post('/auth/profile', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  resetPassword: (data: Record<string, unknown>) => api.post('/auth/reset-password', data),
  changePassword: (data: Record<string, unknown>) => api.post('/auth/change-password', data),
  resendVerification: () => api.post('/auth/resend-verification'),
  verifyEmail: (id: string, hash: string) => api.get(`/auth/verify-email/${id}/${hash}`),
}

export const transactionsApi = {
  list: (params?: Record<string, unknown>) => api.get('/transactions', { params }),
  get: (id: number) => api.get(`/transactions/${id}`),
  create: (data: Record<string, unknown>) => api.post('/transactions', data),
  update: (id: number, data: Record<string, unknown>) => api.put(`/transactions/${id}`, data),
  delete: (id: number) => api.delete(`/transactions/${id}`),
  submit: (id: number) => api.post(`/transactions/${id}/submit`),
  bulkSubmit: (ids: number[]) => api.post('/transactions/bulk-submit', { ids }),
  post: (id: number) => api.post(`/transactions/${id}/post`),
  revert: (id: number, reason?: string) => api.post(`/transactions/${id}/revert`, { reason }),
}

export const categoriesApi = {
  list: (params?: Record<string, unknown>) => api.get('/transaction-categories', { params }),
  get: (id: number) => api.get(`/transaction-categories/${id}`),
  create: (data: Record<string, unknown>) => api.post('/transaction-categories', data),
  update: (id: number, data: Record<string, unknown>) => api.put(`/transaction-categories/${id}`, data),
  delete: (id: number) => api.delete(`/transaction-categories/${id}`),
}
export const accountsApi = {
  list: () => api.get('/accounts'),
  get: (id: number) => api.get(`/accounts/${id}`),
  create: (data: Record<string, unknown>) => api.post('/accounts', data),
  update: (id: number, data: Record<string, unknown>) => api.put(`/accounts/${id}`, data),
  delete: (id: number) => api.delete(`/accounts/${id}`),
  transfer: (data: TransferFundsData) => api.post('/accounts/transfer', data),
}

export const approvalsApi = {
  list: (params?: Record<string, unknown>) => api.get('/approvals', { params }),
  get: (id: number) => api.get(`/approvals/${id}`),
  approve: (id: number, comment?: string) => api.post(`/approvals/${id}/approve`, { comment }),
  reject: (id: number, comment: string) => api.post(`/approvals/${id}/reject`, { comment }),
  bulk: (ids: number[], action: 'approve' | 'reject', comment?: string) =>
    api.post('/approvals/bulk-action', { ids, action, comment }),
  resolve: (id: number, action: 'approved' | 'rejected', comment: string) =>
    api.post(`/approvals/${id}/resolve`, { action, comment }),
}

export const invoicesApi = {
  list: (params?: Record<string, unknown>) => api.get('/invoices', { params }),
  get: (id: number) => api.get(`/invoices/${id}`),
  create: (data: Record<string, unknown>) => api.post('/invoices', data),
  update: (id: number, data: Record<string, unknown>) => api.put(`/invoices/${id}`, data),
  delete: (id: number) => api.delete(`/invoices/${id}`),
  download: (id: number) => api.get(`/invoices/${id}/download`, { responseType: 'blob' }),
  send: (id: number) => api.post(`/invoices/${id}/send`),
  markAsPaid: (id: number) => api.post(`/invoices/${id}/pay`),
}

export const budgetsApi = {
  list: (params?: Record<string, unknown>) => api.get('/budgets', { params }),
  get: (id: number) => api.get(`/budgets/${id}`),
  create: (data: Record<string, unknown>) => api.post('/budgets', data),
  update: (id: number, data: Record<string, unknown>) => api.put(`/budgets/${id}`, data),
  delete: (id: number) => api.delete(`/budgets/${id}`),
  sync: () => api.post('/budgets/sync'),
}

export const analyticsApi = {
  summary: (refresh?: boolean) => api.get('/analytics/summary', { params: { refresh } }),
  cashFlow: (months?: number, refresh?: boolean) => api.get('/analytics/cash-flow', { params: { months, refresh } }),
  incomeVsExpenses: (from?: string, to?: string, refresh?: boolean) => api.get('/analytics/income-vs-expenses', { params: { from, to, refresh } }),
  trends: (weeks?: number, refresh?: boolean) => api.get('/analytics/trends', { params: { weeks, refresh } }),
  budgetOverview: () => api.get('/analytics/budget-overview'),
  productivity: (refresh?: boolean) => api.get<ProductivityStats>('/analytics/productivity', { params: { refresh } }),
  forecasting: (refresh?: boolean) => api.get<ForecastDataPoint[]>('/analytics/forecasting', { params: { refresh } }),
  financialHealth: (refresh?: boolean) => api.get<FinancialHealth>('/analytics/financial-health', { params: { refresh } }),
  customerInsights: (refresh?: boolean) => api.get('/analytics/customer-insights', { params: { refresh } }),
}

export const systemAdminApi = {
  stats: () => api.get('/system-admin/stats'),
  health: () => api.get('/system-admin/health'),
  activity: () => api.get('/system-admin/activity'),
}

export const settingsApi = {
  all: (group?: string, system?: boolean) => api.get('/settings', { params: { group, system: system ? 'true' : undefined } }),
  get: (key: string, system?: boolean) => api.get(`/settings/${key}`, { params: { system: system ? 'true' : undefined } }),
  set: (key: string, value: unknown, group?: string, type?: string, is_system_wide?: boolean) => api.post('/settings', { key, value, group, type, is_system_wide }),
  setBulk: (settings: Array<{ key: string; value: unknown; group?: string; type?: string }>, is_system_wide?: boolean) => api.post('/settings/bulk', { settings, is_system_wide }),
  updateBranding: (data: FormData) => api.post('/settings/branding', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getSystemSettings: () => api.get('/system-settings'),
}

export const workflowsApi = {
  list: () => api.get('/workflows'),
  create: (data: Record<string, unknown>) => api.post('/workflows', data),
  update: (id: number, data: Record<string, unknown>) => api.put(`/workflows/${id}`, data),
  delete: (id: number) => api.delete(`/workflows/${id}`),
}

export const fraudApi = {
  listRules: () => api.get('/fraud/rules'),
  createRule: (data: Record<string, unknown>) => api.post('/fraud/rules', data),
  updateRule: (id: number, data: Record<string, unknown>) => api.put(`/fraud/rules/${id}`, data),
  deleteRule: (id: number) => api.delete(`/fraud/rules/${id}`),
  listAlerts: (params?: Record<string, unknown>) => api.get('/fraud/alerts', { params }),
  resolveAlert: (id: number, data: Record<string, unknown>) => api.post(`/fraud/alerts/${id}/resolve`, data),
}

export const auditLogsApi = {
  list: (params?: Record<string, unknown>) => api.get('/audit-logs', { params }),
  get: (id: number) => api.get(`/audit-logs/${id}`),
}

export const usersApi = {
  list: (params?: Record<string, unknown>) => api.get('/users', { params }),
  get: (id: number) => api.get(`/users/${id}`),
  create: (data: Record<string, unknown>) => api.post('/users', data),
  update: (id: number, data: Record<string, unknown>) => api.put(`/users/${id}`, data),
  delete: (id: number) => api.delete(`/users/${id}`),
}

export const syncApi = {
  pushChanges: (changes: unknown[]) => api.post('/sync/push-changes', { changes }),
}

export const attendancesApi = {
  list: (params?: Record<string, unknown>) => api.get('/attendances', { params }),
  ping: (data: { latitude: number; longitude: number; recorded_at?: string }) => api.post('/attendances/ping', data),
  checkIn: (data: { latitude: number; longitude: number; notes?: string }) => api.post('/attendances/check-in', data),
  checkOut: (data: { latitude: number; longitude: number; notes?: string }) => api.post('/attendances/check-out', data),
}

export const notificationsApi = {
  list: () => api.get('/notifications'),
  markAsRead: (id: string) => api.post(`/notifications/${id}/read`),
  markAllAsRead: () => api.post('/notifications/read-all'),
}

export const reportsApi = {
  preview: (params: Record<string, unknown>) => api.get('/reports/preview', { params }),
  export: (params: Record<string, unknown>) => api.get('/reports/export', { params, responseType: 'blob' }),
}

export const electionsApi = {
  current: () => api.get('/elections/current'),
  initiate: () => api.post('/elections/initiate'),
  vote: (candidate_id: number) => api.post('/elections/vote', { candidate_id }),
  history: () => api.get('/elections/history'),
}

export const debtsApi = {
  list: (params?: Record<string, unknown>) => api.get('/debts', { params }),
  get: (id: number) => api.get(`/debts/${id}`),
  create: (data: Record<string, unknown>) => api.post('/debts', data),
  update: (id: number, data: Record<string, unknown>) => api.put(`/debts/${id}`, data),
  delete: (id: number) => api.delete(`/debts/${id}`),
  recordPayment: (id: number, data: Record<string, unknown>) => api.post(`/debts/${id}/pay`, data),
  remind: (id: number) => api.post(`/debts/${id}/remind`),
}

export const clientsApi = {
  list: (params?: Record<string, unknown>) => api.get('/clients', { params }),
  get: (id: number) => api.get(`/clients/${id}`),
  create: (data: Record<string, unknown>) => api.post('/clients', data),
  update: (id: number, data: Record<string, unknown>) => api.put(`/clients/${id}`, data),
  delete: (id: number) => api.delete(`/clients/${id}`),
}

export const billsApi = {
  list: (params?: Record<string, unknown>) => api.get('/recurring-bills', { params }),
  get: (id: number) => api.get(`/recurring-bills/${id}`),
  create: (data: CreateBillData) => api.post('/recurring-bills', data),
  update: (id: number, data: UpdateBillData) => api.put(`/recurring-bills/${id}`, data),
  delete: (id: number) => api.delete(`/recurring-bills/${id}`),
  pause: (id: number) => api.post(`/recurring-bills/${id}/pause`),
  resume: (id: number) => api.post(`/recurring-bills/${id}/resume`),
}

export const tasksApi = {
  list: (params?: Record<string, unknown>) => api.get('/tasks', { params }),
  get: (id: number) => api.get(`/tasks/${id}`),
  create: (data: Record<string, unknown>) => api.post('/tasks', data),
  update: (id: number, data: Record<string, unknown>) => api.put(`/tasks/${id}`, data),
  delete: (id: number) => api.delete(`/tasks/${id}`),
  reportProgress: (id: number, data: { progress: number; comment?: string; status?: string }) => api.post(`/tasks/${id}/progress`, data),
  stats: (params?: { user_id?: number }) => api.get('/tasks-stats', { params }),
}
