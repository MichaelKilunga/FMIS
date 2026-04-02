import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { analyticsApi } from '../../services/api'
import { systemAdminService, type SystemStats, type SystemHealth } from '../../services/systemAdminService'
import type { AnalyticsSummary, CashFlowDataPoint } from '../../types'
import { useSettingsStore, useAuthStore } from '../../store'
import { useCurrency } from '../../hooks/useCurrency'
import { 
  TrendingUp, TrendingDown, Clock, AlertTriangle, PieChart, CheckCircle, 
  Loader2, Plus, FileText, Users, Activity, Sparkles, Building, ArrowRight,
  ShieldAlert, Vote, Wallet, Calendar, CheckSquare, ListChecks
} from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import clsx from 'clsx'
import AttendanceWidget from '../../components/AttendanceWidget'

function KpiCard({ label, value, icon: Icon, trend, color, delay = 0 }: { label: string; value: string | number; icon: React.ElementType; trend?: string; color: string; delay?: number }) {
  const bgGlow = color.replace('text-', 'bg-').replace('400', '500/10')
  const iconColor = color.replace('text-', 'text-').replace('400', '400')
  const borderColor = color.replace('text-', 'border-').replace('400', '500/20')

  return (
    <div 
      className={clsx(
        "glass-card animate-fade-in relative overflow-hidden group transition-all duration-300 hover:-translate-y-1 hover:shadow-lg", 
        `hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:${borderColor}`
      )}
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}
    >
      <div className={clsx("absolute -right-6 -top-6 w-24 h-24 rounded-full blur-2xl transition-opacity duration-300 opacity-0 group-hover:opacity-100", bgGlow)} />
      
      <div className="relative z-10 p-6 flex items-start justify-between">
        <div className="space-y-2">
          <p className="kpi-label uppercase tracking-wider text-xs font-semibold text-slate-400">{label}</p>
          <div className="flex items-baseline gap-2">
            <p className={clsx('text-3xl font-extrabold tracking-tight', color)}>{value}</p>
          </div>
          {trend && (
            <div className="inline-flex items-center gap-1 mt-2">
              <span className={clsx("text-xs font-medium px-2 py-0.5 rounded-full", bgGlow, color)}>
                {trend}
              </span>
            </div>
          )}
        </div>
        <div className={clsx('p-3 rounded-xl transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-inner', bgGlow)}>
          <Icon size={24} className={iconColor} />
        </div>
      </div>
    </div>
  )
}

function QuickAction({ icon: Icon, label, to, colorClass }: { icon: React.ElementType; label: string; to: string; colorClass: string }) {
  return (
    <Link 
      to={to}
      className="glass-card flex flex-col items-center justify-center p-4 gap-3 transition-all duration-200 hover:scale-105 hover:bg-slate-800/80 group"
    >
      <div className={clsx("p-3 rounded-full transition-transform group-hover:rotate-6", colorClass)}>
        <Icon size={20} className="text-white" />
      </div>
      <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">{label}</span>
      <ArrowRight size={14} className="opacity-0 -mt-2 group-hover:mt-0 group-hover:opacity-100 transition-all text-slate-400" />
    </Link>
  )
}

export default function DashboardPage() {
  const { user } = useAuthStore()
  const { isModuleEnabled, settings } = useSettingsStore()
  const { formatCurrency } = useCurrency()
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null)
  const [cashFlow, setCashFlow] = useState<CashFlowDataPoint[]>([])
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null)
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null)
  const [systemActivity, setSystemActivity] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const isSystemAdmin = !user?.tenant_id && user?.permissions?.includes('manage-tenants')

  useEffect(() => {
    const load = async () => {
      try {
        if (isSystemAdmin) {
          const [statsRes, healthRes, activityRes] = await Promise.all([
            systemAdminService.getStats(),
            systemAdminService.getHealth(),
            systemAdminService.getActivity()
          ])
          setSystemStats(statsRes.data)
          setSystemHealth(healthRes.data)
          setSystemActivity((activityRes.data as any).data || [])
        } else {
          await fetchData()
        }
      } catch (err) {
        console.error('Unexpected error loading dashboard:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [isSystemAdmin])

  const fetchData = async (refresh = false) => {
    const [summaryRes, cashFlowRes] = await Promise.allSettled([
      analyticsApi.summary(refresh),
      analyticsApi.cashFlow(6, refresh),
    ])
    
    if (summaryRes.status === 'fulfilled') {
      setSummary(summaryRes.value.data)
    }
    if (cashFlowRes.status === 'fulfilled') {
      setCashFlow(cashFlowRes.value.data)
    }
  }

  const handleRefresh = async () => {
    setLoading(true)
    await fetchData(true)
    setLoading(false)
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
      <div className="relative">
        <div className="absolute inset-0 bg-blue-500 blur-xl opacity-20 rounded-full animate-pulse-slow"></div>
        <Loader2 className="animate-spin text-blue-500 relative z-10" size={48} />
      </div>
      <p className="text-slate-400 font-medium animate-pulse-slow">Loading your financial insights...</p>
    </div>
  )

  const fmt = (n: any) => formatCurrency(n, undefined, true)

  return (
    <div className="space-y-8 animate-fade-in max-w-7xl mx-auto">
      {/* Page header area */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 glass-card p-6 md:p-8 rounded-2xl relative overflow-hidden border-slate-700/50">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Sparkles size={120} className="text-blue-400" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-semibold tracking-wide border border-blue-500/20">
              {isSystemAdmin ? 'System Admin' : 'Financial Overview'}
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
            Good {getGreeting()}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">{user?.name?.split(' ')[0]}</span>
          </h1>
          <p className="text-slate-400 text-base md:text-lg mt-2 max-w-2xl">
            {isSystemAdmin 
              ? 'Manage system configuration, monitor global metrics, and oversee tenants.' 
              : 'Here is your personalized financial snapshot and actionable insights for today.'}
          </p>
        </div>
        {!isSystemAdmin && (
          <button 
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 rounded-xl border border-slate-700/50 transition-all group shrink-0"
          >
            <Activity size={18} className={clsx(loading && "animate-spin text-blue-400")} />
            <span className="text-sm font-bold">Refresh Intelligence</span>
          </button>
        )}
      </div>

      {/* System Admin Dashboard */}
      {isSystemAdmin && systemStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="glass-card p-8 rounded-2xl border-t-4 border-t-blue-500 hover:shadow-lg transition-all">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500/10 rounded-xl"><Building className="text-blue-400" size={28} /></div>
                <h2 className="text-xl font-bold text-white">Tenants</h2>
              </div>
              <span className="text-3xl font-black text-blue-400">{systemStats.total_tenants}</span>
            </div>
            <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Active Organizations</span>
                    <span className="text-emerald-400 font-bold">{systemStats.active_tenants}</span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500" style={{ width: `${(systemStats.active_tenants / systemStats.total_tenants) * 100}%` }}></div>
                </div>
            </div>
            <Link to="/app/tenants" className="btn-primary w-full justify-center">Manage Organizations</Link>
          </div>

          <div className="glass-card p-8 rounded-2xl border-t-4 border-t-emerald-500 hover:shadow-lg transition-all">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-500/10 rounded-xl"><Users className="text-emerald-400" size={28} /></div>
                <h2 className="text-xl font-bold text-white">Global Users</h2>
              </div>
              <span className="text-3xl font-black text-emerald-400">{systemStats.total_users}</span>
            </div>
            <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Total System Active</span>
                    <span className="text-white font-bold">{systemStats.active_users}</span>
                </div>
                <p className="text-xs text-slate-500">Managing accounts across {systemStats.total_tenants} tenants.</p>
            </div>
            <Link to="/app/users" className="btn-primary w-full justify-center !bg-emerald-600 hover:!bg-emerald-500">Global User Directory</Link>
          </div>

          <div className="glass-card p-8 rounded-2xl border-t-4 border-t-purple-500 hover:shadow-lg transition-all">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-purple-500/10 rounded-xl"><Activity className="text-purple-400" size={28} /></div>
              <h2 className="text-xl font-bold text-white">System Health</h2>
            </div>
            
            {systemHealth && (
              <div className="space-y-4 mb-6">
                <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl border border-slate-700/50">
                    <div className="flex items-center gap-2">
                        <div className={clsx("w-2 h-2 rounded-full", systemHealth.database.status === 'healthy' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500')}></div>
                        <span className="text-sm font-medium text-slate-300">Database</span>
                    </div>
                    <span className="text-xs text-slate-500 uppercase font-bold">{systemHealth.database.status}</span>
                </div>
                <div className="space-y-2">
                    <div className="flex justify-between text-xs text-slate-400">
                        <span>Storage ({systemHealth.storage.used} / {systemHealth.storage.total})</span>
                        <span>{systemHealth.storage.usage_percentage}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div className={clsx("h-full transition-all", systemHealth.storage.usage_percentage > 90 ? 'bg-red-500' : 'bg-purple-500')} style={{ width: `${systemHealth.storage.usage_percentage}%` }}></div>
                    </div>
                </div>
                <p className="text-[10px] text-slate-500 text-center uppercase tracking-widest pt-2">
                    Laravel v{systemHealth.laravel_version} • PHP {systemHealth.php_version}
                </p>
              </div>
            )}
            <button className="btn-primary w-full justify-center !bg-purple-600 hover:!bg-purple-500">View Monitoring</button>
          </div>
        </div>
      )}

      {isSystemAdmin && systemActivity && systemActivity.length > 0 && (
        <div className="glass-card p-8 rounded-2xl border border-slate-700/50 animate-slide-in" style={{ animationDelay: '200ms', animationFillMode: 'both' }}>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-xl font-bold text-white tracking-tight">Recent System Activity</h2>
                    <p className="text-sm text-slate-400 mt-1">Real-time global audit trail across all tenants.</p>
                </div>
                <Link to="/app/audit-logs" className="text-blue-400 hover:text-blue-300 text-sm font-medium flex items-center gap-1">
                    View Full Trail <ArrowRight size={14} />
                </Link>
            </div>
            
            <div className="space-y-4">
                {systemActivity.slice(0, 5).map((log: any) => (
                    <div key={log.id} className="flex items-start gap-4 p-4 bg-slate-900/40 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors">
                        <div className="p-2 bg-slate-800 rounded-lg">
                            <Activity size={16} className="text-slate-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                                <p className="text-sm font-semibold text-slate-200 truncate capitalize">{log.action.replace(/_/g, ' ')}</p>
                                <span className="text-[10px] font-mono text-slate-500">{new Date(log.created_at).toLocaleTimeString()}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-400 font-medium">By {log.user?.name || 'System'}</span>
                                {log.tenant && (
                                    <>
                                        <span className="text-slate-600">•</span>
                                        <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-[10px] font-bold text-blue-400 uppercase tracking-tighter">
                                            {log.tenant.name}
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      )}

      {/* Standard User Dashboard */}
      {!isSystemAdmin && (
        <>
          {!summary && !loading ? (
             <div className="glass-card p-12 text-center animate-fade-in shadow-xl border-slate-700/50">
               <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-slate-800/50 mb-6 border border-slate-700">
                 <Activity size={40} className="text-slate-500" />
               </div>
               <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">Initializing Your Dashboard</h2>
               <p className="text-slate-400 max-w-md mx-auto leading-relaxed text-sm">
                 We're gathering your latest financial data. This usually takes just a moment. 
                 If you've just joined, your first transactions will appear here shortly.
               </p>
               <button 
                 onClick={() => window.location.reload()}
                 className="mt-8 px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-sm font-bold transition-all border border-slate-700"
               >
                 Refresh Dashboard
               </button>
             </div>
          ) : summary ? (
            <>
              {/* Quick Actions Row */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 animate-slide-in" style={{ animationDelay: '100ms', animationFillMode: 'both' }}>
                <QuickAction icon={Plus} label="New Transaction" to="/app/transactions" colorClass="bg-gradient-to-br from-emerald-500 to-emerald-700" />
                <QuickAction icon={Clock} label="Attendance" to="/app/attendance" colorClass="bg-gradient-to-br from-indigo-500 to-indigo-700" />
                <QuickAction icon={FileText} label="Create Invoice" to="/app/invoices" colorClass="bg-gradient-to-br from-blue-500 to-blue-700" />
                <QuickAction icon={ListChecks} label="Add Task" to="/app/tasks" colorClass="bg-gradient-to-br from-indigo-500 to-indigo-700" />
                <QuickAction icon={Calendar} label="Manage Billing" to="/app/billing" colorClass="bg-gradient-to-br from-purple-500 to-purple-700" />
                <QuickAction icon={Clock} label="Pending Approvals" to="/app/approvals" colorClass="bg-gradient-to-br from-amber-500 to-amber-700" />
                <QuickAction icon={AlertTriangle} label="Review Fraud" to="/app/fraud" colorClass="bg-gradient-to-br from-red-500 to-red-700" />
              </div>

              {/* Duty & Productivity Center */}
              <div className="flex items-center gap-3 mb-4">
                <div className="h-8 w-1 bg-indigo-500 rounded-full"></div>
                <h2 className="text-xl font-bold text-white tracking-tight">Personal Duty Center</h2>
              </div>

              {/* KPI Cards and Attendance */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <AttendanceWidget />
                <KpiCard 
                  label="Tasks Pending" 
                  value={summary.tasksCount} 
                  icon={CheckSquare} 
                  color="text-indigo-400" 
                  delay={100} 
                  trend={summary.overdueTasksCount > 0 ? `${summary.overdueTasksCount} overdue` : 'On track'} 
                />
                <KpiCard 
                  label="Pending Approvals" 
                  value={summary.pendingApprovals} 
                  icon={Clock} 
                  color="text-amber-400" 
                  delay={150} 
                  trend={summary.pendingApprovals > 0 ? 'Requires action' : 'All clear'} 
                />
              </div>

              <div className="flex items-center gap-3 mb-4 mt-12">
                <div className="h-8 w-1 bg-emerald-500 rounded-full"></div>
                <h2 className="text-xl font-bold text-white tracking-tight">Financial Intelligence</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <KpiCard 
                  label="Total Income"         
                  value={fmt(summary?.totalIncome)}      
                  icon={TrendingUp}    
                  color="text-emerald-400" 
                  delay={200} 
                  trend={(summary?.pendingIncome || 0) > 0 ? `+ ${fmt(summary?.pendingIncome)} pending` : "+12.5% from last month"} 
                />
                <KpiCard 
                  label="Total Expenses"       
                  value={fmt(summary?.totalExpense)}     
                  icon={TrendingDown}  
                  color="text-red-400"     
                  delay={300} 
                  trend={(summary?.pendingExpense || 0) > 0 ? `+ ${fmt(summary?.pendingExpense)} pending` : "-2.1% from last month"} 
                />
                <KpiCard label="Net Position" value={fmt((summary?.totalIncome || 0) - (summary?.totalExpense || 0))} icon={CheckCircle} color={(summary?.totalIncome || 0) >= (summary?.totalExpense || 0) ? 'text-emerald-400' : 'text-red-400'} delay={400} />
                
                {user?.roles?.includes('director') && (
                  <>
                    <KpiCard 
                      label="Election Status" 
                      value={summary.activeElection ? 'Active' : 'None'} 
                      icon={Vote} 
                      color={summary.activeElection ? 'text-purple-400' : 'text-slate-500'} 
                      delay={800} 
                      trend={summary.activeElection ? 'Voting in progress' : 'No active election'} 
                    />
                    <KpiCard 
                      label="High Risk Fraud" 
                      value={summary.highSeverityFraudAlerts} 
                      icon={ShieldAlert} 
                      color={summary.highSeverityFraudAlerts > 0 ? 'text-red-500' : 'text-emerald-400'} 
                      delay={900} 
                      trend={summary.highSeverityFraudAlerts > 0 ? 'Immediate action required' : 'No high risk alerts'} 
                    />
                    <KpiCard 
                      label="Pending Funds" 
                      value={fmt(summary.totalPendingValue)} 
                      icon={Wallet} 
                      color="text-indigo-400" 
                      delay={1000} 
                      trend="Awaiting final posting" 
                    />
                    <KpiCard 
                      label="Budgets at Risk" 
                      value={summary.budgetAtRisk} 
                      icon={Activity} 
                      color={summary.budgetAtRisk > 0 ? 'text-orange-400' : 'text-emerald-400'} 
                      delay={1100} 
                      trend={summary.budgetAtRisk > 0 ? 'Approaching limits (>80%)' : 'All within healthy limits'} 
                    />
                    
                    {/* Debt Module Metrics */}
                    <KpiCard 
                      label="Total Payables" 
                      value={fmt(summary.totalPayable)} 
                      icon={TrendingDown} 
                      color="text-rose-400" 
                      delay={1200} 
                      trend="Money owed to others" 
                    />
                    <KpiCard 
                      label="Total Receivables" 
                      value={fmt(summary.totalReceivable)} 
                      icon={TrendingUp} 
                      color="text-emerald-400" 
                      delay={1300} 
                      trend="Money owed to us" 
                    />
                    <KpiCard 
                      label="Overdue Debts" 
                      value={summary.overdueDebtsCount} 
                      icon={AlertTriangle} 
                      color={summary.overdueDebtsCount > 0 ? 'text-red-500' : 'text-slate-500'} 
                      delay={1400} 
                      trend={summary.overdueDebtsCount > 0 ? 'Immediate action required' : 'No overdue records'} 
                    />
                    <KpiCard 
                      label="Est. Recurring Income" 
                      value={fmt(summary.monthlyRecurringIncome)} 
                      icon={TrendingUp} 
                      color="text-emerald-400" 
                      delay={1500} 
                      trend="Monthly forecast" 
                    />
                    <KpiCard 
                      label="Est. Recurring Expense" 
                      value={fmt(summary.monthlyRecurringExpense)} 
                      icon={TrendingDown} 
                      color="text-rose-400" 
                      delay={1600} 
                      trend="Monthly forecast" 
                    />
                    <KpiCard 
                      label="Active Bills" 
                      value={summary.activeBillsCount} 
                      icon={Calendar} 
                      color="text-purple-400" 
                      delay={1700} 
                      trend={summary.upcomingBillsCount > 0 ? `${summary.upcomingBillsCount} due this week` : 'No bills due soon'} 
                    />
                  </>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Cash Flow Chart */}
                {isModuleEnabled('analytics') && cashFlow.length > 0 && (
                  <div className="glass-card p-6 lg:p-8 rounded-2xl lg:col-span-2 animate-slide-in" style={{ animationDelay: '800ms', animationFillMode: 'both' }}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                      <div>
                        <h2 className="text-xl font-bold text-white tracking-tight">Cash Flow Trends</h2>
                        <p className="text-sm text-slate-400">Income vs. Expenses over the last 6 months</p>
                      </div>
                      <div className="flex gap-3">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-300 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div> Income
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-300 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
                          <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></div> Expense
                        </span>
                      </div>
                    </div>
                    
                    <div className="w-full h-[320px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={cashFlow} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                            </linearGradient>
                            <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#EF4444" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="#EF4444" stopOpacity={0.0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="4 4" stroke="#1E293B" vertical={false} />
                          <XAxis dataKey="period" stroke="#475569" tick={{ fill: '#94A3B8', fontSize: 12, fontWeight: 500 }} axisLine={false} tickLine={false} dy={10} />
                          <YAxis stroke="#475569" tick={{ fill: '#94A3B8', fontSize: 12, fontWeight: 500 }} axisLine={false} tickLine={false} tickFormatter={(v) => fmt(v)} />
                          <Tooltip 
                            contentStyle={{ background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(8px)', border: '1px solid rgba(71, 85, 105, 0.4)', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }} 
                            labelStyle={{ color: '#F1F5F9', fontWeight: 600, marginBottom: '8px' }} 
                            itemStyle={{ fontWeight: 500, padding: '4px 0' }}
                            formatter={(v) => [fmt(Number(v ?? 0)), '']} 
                            cursor={{ stroke: '#475569', strokeWidth: 1, strokeDasharray: '4 4' }}
                          />
                          <Area type="monotone" dataKey="income"  name="Income"  stroke="#10B981" fill="url(#incomeGrad)"  strokeWidth={3} activeDot={{ r: 6, fill: '#10B981', stroke: '#0F172A', strokeWidth: 2 }} dot={false} />
                          <Area type="monotone" dataKey="expense" name="Expense" stroke="#EF4444" fill="url(#expenseGrad)" strokeWidth={3} activeDot={{ r: 6, fill: '#EF4444', stroke: '#0F172A', strokeWidth: 2 }} dot={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Health / Summary Panel */}
                <div className="flex flex-col gap-6 animate-slide-in" style={{ animationDelay: '900ms', animationFillMode: 'both' }}>
                  <div className="glass-card p-6 rounded-2xl flex-1 border-t-4 border-t-blue-500">
                    <h3 className="text-lg font-bold text-white mb-4">Budget Health</h3>
                    <div className="space-y-5">
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-slate-300 font-medium">Departments within budget</span>
                          <span className="text-blue-400 font-bold">{summary.activeBudgets - summary.exceededBudgets} / {summary.activeBudgets}</span>
                        </div>
                        <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full" 
                            style={{ width: `${summary.activeBudgets ? ((summary.activeBudgets - summary.exceededBudgets) / summary.activeBudgets) * 100 : 0}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      {summary.exceededBudgets > 0 && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex gap-3 items-start">
                          <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-red-400">Attention Required</p>
                            <p className="text-xs text-slate-400 mt-1">{summary.exceededBudgets} budgets have exceeded their allocated limits for this period.</p>
                          </div>
                        </div>
                      )}

                      {summary.upcomingBillsCount > 0 && (
                        <div className="pt-4 border-t border-slate-700/50">
                           <p className="text-sm font-medium text-slate-300 mb-3">Upcoming Payments</p>
                           <Link to="/app/billing" className="flex items-center justify-between p-3 bg-purple-950/20 border border-purple-500/20 rounded-xl transition-colors group">
                              <div className="flex items-center gap-3">
                                <Calendar size={18} className="text-purple-400" />
                                <span className="text-sm text-slate-200 uppercase tracking-tight font-semibold">{summary.upcomingBillsCount} Bills Due This Week</span>
                              </div>
                              <ArrowRight size={16} className="text-slate-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
                           </Link>
                        </div>
                      )}

                       {summary.pendingApprovals > 0 && (
                        <div className="pt-4 border-t border-slate-700/50">
                           <p className="text-sm font-medium text-slate-300 mb-3">Pending Action</p>
                           <Link to="/app/approvals" className="flex items-center justify-between p-3 bg-slate-800/50 hover:bg-slate-700/50 rounded-xl transition-colors group">
                              <div className="flex items-center gap-3">
                                <Clock size={18} className="text-amber-400" />
                                <span className="text-sm text-slate-200">{summary.pendingApprovals} requests to review</span>
                              </div>
                              <ArrowRight size={16} className="text-slate-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
                           </Link>
                        </div>
                      )}

                      <div className="pt-4 border-t border-slate-700/50">
                        <p className="text-sm font-medium text-slate-300 mb-3">Staff Productivity</p>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center bg-slate-800/50 p-3 rounded-xl border border-slate-700/30">
                            <div className="flex items-center gap-3">
                              <CheckSquare size={18} className="text-indigo-400" />
                              <span className="text-sm text-slate-200">{summary.tasksCount} Active Tasks</span>
                            </div>
                            <Link to="/app/tasks" className="text-xs text-blue-400 hover:text-blue-300 font-medium">View All</Link>
                          </div>
                          {summary.overdueTasksCount > 0 && (
                            <div className="flex justify-between items-center bg-red-950/20 p-3 rounded-xl border border-red-500/20">
                              <div className="flex items-center gap-3">
                                <AlertTriangle size={18} className="text-red-400" />
                                <span className="text-sm text-red-400">{summary.overdueTasksCount} Overdue Duties</span>
                              </div>
                              <Link to="/app/tasks?status=overdue" className="text-xs text-red-400 hover:text-red-300 font-medium font-bold underline">Fix Now</Link>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </>
      )}
    </div>
  )
}

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}
