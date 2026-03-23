import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import {
  LayoutDashboard, ArrowLeftRight, CheckSquare, FileText, PieChart,
  BarChart3, Settings, Shield, AlertTriangle, Users, GitBranch,
  LogOut, Menu, X, Wifi, WifiOff, Bell, ChevronDown, Building, Gavel, Coins,
  Wallet, Tag
} from 'lucide-react'
import { useAuthStore, useSettingsStore, useOnlineStore } from '../../store'
import { authApi } from '../../services/api'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import NotificationBell from '../notifications/NotificationBell'
import PwaInstallBanner from './PwaInstallBanner'

interface NavItem {
  to: string
  label: string
  icon: any
  module?: string
  adminOnly?: boolean
  tenantAdminOnly?: boolean
  systemAdminOnly?: boolean
}

const navItems: NavItem[] = [
  { to: '/app/dashboard',    label: 'Dashboard',       icon: LayoutDashboard },
  { to: '/app/analytics',    label: 'Analytics',       icon: BarChart3, adminOnly: true },
  { to: '/app/transactions', label: 'Transactions',     icon: ArrowLeftRight },
  { to: '/app/approvals',    label: 'Approvals',        icon: CheckSquare },
  { to: '/app/invoices',     label: 'Invoices',         icon: FileText },
  { to: '/app/clients',      label: 'Clients',          icon: Users },
  { to: '/app/billing',      label: 'Billing',          icon: FileText }, // Recurring bills
  { to: '/app/debts',        label: 'Debts',            icon: Coins },
  { to: '/app/accounts',     label: 'Accounts',         icon: Wallet },
  { to: '/app/categories',   label: 'Categories',       icon: Tag },
  { to: '/app/tasks',        label: 'Tasks',            icon: CheckSquare },
  { to: '/app/budgets',      label: 'Budgets',          icon: PieChart,   module: 'budgeting' },
  { to: '/app/reports',      label: 'Reports',          icon: BarChart3,  module: 'reporting' },
  { to: '/app/fraud',        label: 'Fraud Detection',  icon: Shield,     module: 'fraud_detection' },
  { to: '/app/audit-logs',   label: 'Audit Trail',      icon: AlertTriangle },
  { to: '/app/workflows',    label: 'Workflows',        icon: GitBranch, tenantAdminOnly: true },
  { to: '/app/elections',    label: 'Election Center',  icon: Gavel },
  { to: '/app/tenants',      label: 'Tenants',          icon: Building, systemAdminOnly: true },
  { to: '/app/users',        label: 'Users',            icon: Users, tenantAdminOnly: true },
  { to: '/app/settings',     label: 'Settings',         icon: Settings, tenantAdminOnly: true },
]

export default function Layout() {
  const { user, tenant, logout } = useAuthStore()
  const { isModuleEnabled } = useSettingsStore()
  const { isOnline, pendingSyncCount } = useOnlineStore()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [profileOpen, setProfileOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const isDirector = user?.roles.includes('director')
  const isManager  = user?.roles.includes('manager')
  const isSystemAdmin = user?.permissions.includes('manage-tenants')

  const handleLogout = async () => {
    try { await authApi.logout() } catch {}
    logout()
    navigate('/login')
    toast.success('Logged out successfully')
  }

  const visibleNavItems = navItems.filter(item => {
    if (isSystemAdmin) {
      return ['Dashboard', 'Tenants', 'Users', 'Settings'].includes(item.label)
    }
    // @ts-ignore
    if (item.systemAdminOnly && !isSystemAdmin) return false
    if (item.module && !isModuleEnabled(item.module)) return false
    if (item.tenantAdminOnly && !user?.roles.includes('tenant-admin')) return false
    if (item.adminOnly && !isDirector && !isManager) return false
    return true
  })

  return (
    <div className="flex h-screen overflow-hidden bg-slate-900">
      {/* Mobile Sidebar Backdrop */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 md:hidden animate-fade-in"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={clsx(
        'flex flex-col border-r border-slate-700/50 bg-slate-900/95 backdrop-blur-sm transition-all duration-300 z-[60]',
        // Desktop sizing
        'hidden md:flex',
        sidebarOpen ? 'w-64' : 'w-16',
        // Mobile sizing (drawer)
        'fixed inset-y-0 left-0 transform md:relative md:translate-x-0',
        mobileMenuOpen ? 'translate-x-0 flex w-64' : '-translate-x-full md:flex'
      )}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-700/50">
          {tenant?.logo
            ? <img src={tenant.logo} alt={tenant.name} className="h-8 w-auto object-contain" />
            : <div className="h-8 w-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                   style={{ background: `linear-gradient(135deg, var(--color-primary), var(--color-accent))` }}>F</div>
          }
          {sidebarOpen && (
            <div className="animate-fade-in overflow-hidden">
              <h1 className="text-white font-bold text-sm truncate">{tenant?.name || 'FMIS'}</h1>
              <p className="text-slate-400 text-xs capitalize">{tenant?.plan || 'Enterprise'}</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {visibleNavItems.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
              isActive
                ? 'sidebar-active text-blue-300'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-700/40'
            )}>
              <Icon className="shrink-0" size={18} />
              {sidebarOpen && <span className="truncate animate-fade-in">{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Collapse toggle (Desktop only) */}
        <button onClick={() => setSidebarOpen(s => !s)}
          className="hidden md:block m-3 p-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-700/40 transition-colors">
          {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </aside>

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden relative">
        {/* Header */}
        <header className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-sm z-[100] relative sticky top-0">
          <div className="flex items-center gap-3">
            {/* Mobile Menu Toggle */}
            <button 
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 -ml-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 md:hidden"
            >
              <Menu size={20} />
            </button>

            {/* Online indicator */}
            <div className={clsx('flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap', isOnline ? 'bg-emerald-900/50 text-emerald-400' : 'bg-yellow-900/50 text-yellow-400 animate-pulse-slow')}>
              {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
              <span className="hidden sm:inline">
                {isOnline ? 'Online' : `Offline${pendingSyncCount > 0 ? ` · ${pendingSyncCount} pending` : ''}`}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Notification bell */}
            <NotificationBell />

            {/* Profile */}
            <div className="relative">
              <button onClick={() => setProfileOpen(p => !p)}
                className="flex items-center gap-2 p-1 rounded-lg hover:bg-slate-700 transition-colors">
                <img src={user?.avatar_url || ''} alt={user?.name} className="h-8 w-8 rounded-full object-cover shrink-0" />
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium text-slate-200 truncate max-w-[100px]">{user?.name}</p>
                  <p className="text-xs text-slate-400 capitalize">{user?.roles[0]}</p>
                </div>
                <ChevronDown size={14} className="text-slate-400 shrink-0" />
              </button>
              {profileOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 glass-card py-1 z-[9000] animate-fade-in">
                  <button onClick={handleLogout}
                    className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-400 hover:bg-red-900/20 transition-colors">
                    <LogOut size={15} /> Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
      <PwaInstallBanner />
    </div>
  )
}
