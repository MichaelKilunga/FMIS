import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'

import { useAuthStore, useOnlineStore, useSettingsStore, applyBranding } from './store'
import { authApi, settingsApi } from './services/api'
import { getPendingChanges, markAsSynced } from './services/db'
import { syncApi } from './services/api'

import Layout from './components/layout/Layout'
import LoginPage from './pages/auth/LoginPage'
import DashboardPage from './pages/dashboard/DashboardPage'
import TransactionsPage from './pages/transactions/TransactionsPage'
import ApprovalsPage from './pages/approvals/ApprovalsPage'
import InvoicesPage from './pages/invoices/InvoicesPage'
import BudgetsPage from './pages/budgets/BudgetsPage'
import ReportsPage from './pages/reports/ReportsPage'
import SettingsPage from './pages/settings/SettingsPage'
import AuditLogsPage from './pages/audit/AuditLogsPage'
import FraudPage from './pages/fraud/FraudPage'
import UsersPage from './pages/users/UsersPage'
import WorkflowsPage from './pages/workflows/WorkflowsPage'
import TenantsPage from './pages/tenants/TenantsPage'
import ElectionPage from './pages/elections/ElectionPage'
import DebtsPage from './pages/DebtsPage'
import BillsPage from './pages/billing/BillsPage'
import AccountsPage from './pages/financials/AccountsPage'
import CategoriesPage from './pages/financials/CategoriesPage'
import AnalyticsPage from './pages/dashboard/AnalyticsPage'
import TasksPage from './pages/tasks/TasksPage'
import LandingPage from './pages/LandingPage'
import RegisterPage from './pages/auth/RegisterPage'
import PrivacyPage from './pages/public/PrivacyPage'
import TermsPage from './pages/public/TermsPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  const { isAuthenticated, tenant, setAuth, logout } = useAuthStore()
  const { setSettings } = useSettingsStore()
  const { setOnline, setPendingCount } = useOnlineStore()

  // Sync online/offline status
  useEffect(() => {
    const handleOnline = async () => {
      setOnline(true)
      await processSyncQueue()
    }
    const handleOffline = () => setOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [setOnline])

  // Restore session and load settings on mount
  useEffect(() => {
    const token = localStorage.getItem('fmis_token')
    if (token) {
      // If we have a token but aren't "authenticated" in the store (e.g. refresh)
      // we should load settings and re-apply branding
      settingsApi.all().then(res => {
        setSettings(res.data)
      }).catch(() => {})

      if (tenant) {
        applyBranding(tenant)
      }
    }
  }, [isAuthenticated, tenant])

  async function processSyncQueue(): Promise<void> {
    const pending = await getPendingChanges()
    if (pending.length === 0) return
    setPendingCount(pending.length)
    try {
      await syncApi.pushChanges(pending)
      const ids = pending.map(p => p.id!).filter(Boolean)
      await markAsSynced(ids)
      setPendingCount(0)
    } catch { /* will retry next online event */ }
  }

  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{
        style: { background: '#1E293B', color: '#F1F5F9', border: '1px solid #334155' },
      }} />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        
        <Route path="/app" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/app/dashboard" replace />} />
          <Route path="dashboard"    element={<DashboardPage />} />
          <Route path="transactions" element={<TransactionsPage />} />
          <Route path="approvals"    element={<ApprovalsPage />} />
          <Route path="invoices"     element={<InvoicesPage />} />
          <Route path="budgets"      element={<BudgetsPage />} />
          <Route path="reports"      element={<ReportsPage />} />
          <Route path="settings"     element={<SettingsPage />} />
          <Route path="audit-logs"   element={<AuditLogsPage />} />
          <Route path="fraud"        element={<FraudPage />} />
          <Route path="users"        element={<UsersPage />} />
          <Route path="tenants"      element={<TenantsPage />} />
          <Route path="workflows"    element={<WorkflowsPage />} />
          <Route path="elections"    element={<ElectionPage />} />
          <Route path="debts"        element={<DebtsPage />} />
          <Route path="billing"      element={<BillsPage />} />
          <Route path="accounts"     element={<AccountsPage />} />
          <Route path="categories"   element={<CategoriesPage />} />
          <Route path="analytics"    element={<AnalyticsPage />} />
          <Route path="tasks"        element={<TasksPage />} />
        </Route>
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
