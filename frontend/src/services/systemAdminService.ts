import api from './api'

export interface SystemStats {
  total_tenants: number
  active_tenants: number
  total_users: number
  active_users: number
  total_transactions: number
  total_revenue: number
  tenants_by_plan: Array<{ plan: string; count: number }>
}

export interface SystemHealth {
  database: {
    status: string
    connection?: string
    error?: string
  }
  storage: {
    total: string
    free: string
    used: string
    usage_percentage: number
  }
  laravel_version: string
  php_version: string
  os: string
  server: string
}

export const systemAdminService = {
  getStats: () => api.get<SystemStats>('/system-admin/stats'),
  getHealth: () => api.get<SystemHealth>('/system-admin/health'),
  getActivity: (page = 1) => api.get(`/system-admin/activity?page=${page}`),
}

export default systemAdminService
