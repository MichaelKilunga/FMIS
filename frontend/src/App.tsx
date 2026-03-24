import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'

import { useAuthStore, useOnlineStore, useSettingsStore, applyBranding, usePwaStore } from './store'
import { authApi, settingsApi } from './services/api'
import { setupNetworkListeners, syncOfflineRequests } from './services/syncService'

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
import ClientsPage from './pages/clients/ClientsPage'
import LandingPage from './pages/LandingPage'
import RegisterPage from './pages/auth/RegisterPage'
import PrivacyPage from './pages/public/PrivacyPage'
import TermsPage from './pages/public/TermsPage'
import AttendancePage from './pages/attendance/AttendancePage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import ResetPasswordPage from './pages/auth/ResetPasswordPage'
import VerifyEmailPage from './pages/auth/VerifyEmailPage'
import ProfilePage from './pages/profile/ProfilePage'
import SystemDashboardPage from './pages/dashboard/SystemDashboardPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  const { isAuthenticated, tenant, setAuth, logout } = useAuthStore()
  const { setSettings } = useSettingsStore()
  const { setOnline, setPendingCount } = useOnlineStore()

  const { setDeferredPrompt, setIsInstalled } = usePwaStore()

  // Sync online/offline status and PWA install prompt
  useEffect(() => {
    setupNetworkListeners()
    
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }

    const handleAppInstalled = () => {
      setDeferredPrompt(null)
      setIsInstalled(true)
    }

    window.addEventListener('online', () => {}) // Handled in syncService but keeping for effect
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
    }

    // Initial sync check on mount if online
    if (navigator.onLine) {
      syncOfflineRequests()
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [setDeferredPrompt, setIsInstalled])

  // Restore session and load settings on mount
  useEffect(() => {
    // Always fetch global settings for branding/content (publicly available keys)
    settingsApi.getSystemSettings().then(res => {
        // Merge into settings store or handle specifically
        setSettings(res.data)
        // Apply initial branding with these global settings
        applyBranding(tenant, res.data)
    }).catch(() => {})

    const token = localStorage.getItem('fmis_token')
    if (token) {
      // If we have a token, load all settings (including private ones)
      settingsApi.all().then(res => {
        setSettings(res.data)
        applyBranding(tenant, res.data)
      }).catch(() => {})
    }
  }, [isAuthenticated, tenant])


  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{
        style: { background: '#1E293B', color: '#F1F5F9', border: '1px solid #334155' },
      }} />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify-email/:id/:hash" element={<VerifyEmailPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        
        <Route path="/app" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/app/dashboard" replace />} />
          <Route path="dashboard"    element={<DashboardPage />} />
          <Route path="transactions" element={<TransactionsPage />} />
          <Route path="approvals"    element={<ApprovalsPage />} />
          <Route path="invoices"     element={<InvoicesPage />} />
          <Route path="clients"      element={<ClientsPage />} />
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
          <Route path="attendance"   element={<AttendancePage />} />
          <Route path="profile"      element={<ProfilePage />} />
          <Route path="system-dashboard" element={<SystemDashboardPage />} />
        </Route>
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
