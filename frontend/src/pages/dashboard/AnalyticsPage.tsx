import { useEffect, useState } from 'react'
import { analyticsApi, systemAdminApi, settingsApi } from '../../services/api'
import { Link } from 'react-router-dom'
import type { 
  AnalyticsSummary, 
  CashFlowDataPoint, 
  ProductivityStats, 
  ForecastDataPoint, 
  FinancialHealth 
} from '../../types'
import { useSettingsStore, useAuthStore } from '../../store'
import { useCurrency } from '../../hooks/useCurrency'
import { 
  TrendingUp, TrendingDown, Clock, AlertTriangle, PieChart, CheckCircle, 
  Loader2, Activity, Sparkles, Brain, Target, BarChart3, LineChart,
  Calendar, ShieldCheck, Zap, Info, Building2, Users as UsersIcon, Database
} from 'lucide-react'
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Cell, Pie, PieChart as RePieChart, Legend, ComposedChart, Line
} from 'recharts'
import clsx from 'clsx'

export default function AnalyticsPage() {
  const { user } = useAuthStore()
  const { settings } = useSettingsStore()
  const { formatCurrency } = useCurrency()
  
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null)
  const [productivity, setProductivity] = useState<ProductivityStats | null>(null)
  const [forecast, setForecast] = useState<ForecastDataPoint[]>([])
  const [health, setHealth] = useState<FinancialHealth | null>(null)
  const [cashFlow, setCashFlow] = useState<CashFlowDataPoint[]>([])
  const [customerInsights, setCustomerInsights] = useState<{ at_risk: any[], top_clients: any[], is_system_admin?: boolean } | null>(null)
  const [systemStats, setSystemStats] = useState<any>(null)
  const [supportEmail, setSupportEmail] = useState('support@skylinksolutions.co')
  
  const [loadingStates, setLoadingStates] = useState({
    summary: true,
    productivity: true,
    forecast: true,
    health: true,
    cashFlow: true,
    customers: true,
    system: true,
  })

  const updateLoading = (key: keyof typeof loadingStates, val: boolean) => 
    setLoadingStates(prev => ({ ...prev, [key]: val }))

  useEffect(() => {
    const load = async () => {
      try {
        const isSystemAdmin = user?.permissions?.includes('manage-tenants')
        
        await fetchData()

        if (isSystemAdmin) {
          systemAdminApi.stats().then(res => setSystemStats(res.data)).catch(() => {})
        }

        settingsApi.getSystemSettings().then(res => {
          if (res.data['system.support_email']) setSupportEmail(res.data['system.support_email'])
        }).catch(() => {})
        
      } catch (err) {
        console.error('Failed to load analytics:', err)
      }
    }
    load()
  }, [user])

  const fetchData = async (refresh = false) => {
    // Reset loading if refreshing
    if (refresh) {
      setLoadingStates({
        summary: true, productivity: true, forecast: true, 
        health: true, cashFlow: true, customers: true, system: true
      })
    }

    const isSystemAdmin = user?.permissions?.includes('manage-tenants')

    // Fire all requests independently
    analyticsApi.summary(refresh).then(res => { setSummary(res.data); updateLoading('summary', false); }).catch(() => updateLoading('summary', false))
    analyticsApi.productivity(refresh).then(res => { setProductivity(res.data); updateLoading('productivity', false); }).catch(() => updateLoading('productivity', false))
    analyticsApi.forecasting(refresh).then(res => { setForecast(res.data); updateLoading('forecast', false); }).catch(() => updateLoading('forecast', false))
    analyticsApi.financialHealth(refresh).then(res => { setHealth(res.data); updateLoading('health', false); }).catch(() => updateLoading('health', false))
    analyticsApi.cashFlow(12, refresh).then(res => { setCashFlow(res.data); updateLoading('cashFlow', false); }).catch(() => updateLoading('cashFlow', false))
    analyticsApi.customerInsights(refresh).then(res => { setCustomerInsights(res.data); updateLoading('customers', false); }).catch(() => updateLoading('customers', false))

    if (isSystemAdmin) {
      systemAdminApi.stats().then(res => { setSystemStats(res.data); updateLoading('system', false); }).catch(() => updateLoading('system', false))
    } else {
      updateLoading('system', false)
    }
  }

  const handleRefresh = async () => {
    await fetchData(true)
  }

  const isLoadingAny = Object.values(loadingStates).some(v => v)

  const fmt = (n: any) => formatCurrency(n, undefined, true)

  const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6']

  const LoadingBox = ({ text = "Computing..." }) => (
    <div className="flex flex-col items-center justify-center p-12 text-slate-500 gap-3">
      <Loader2 className="animate-spin text-blue-500/50" size={24} />
      <span className="text-[10px] font-bold uppercase tracking-widest animate-pulse">{text}</span>
    </div>
  )

  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-card p-6 md:p-8 rounded-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
          <Brain size={160} className="text-blue-400" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
              <Sparkles size={20} />
            </div>
            <span className="text-blue-400 text-sm font-bold uppercase tracking-widest">Advanced Intelligence Executive Suite</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tighter">
            Strategic <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">Analytics</span>
          </h1>
          <p className="text-slate-400 text-lg mt-3 max-w-2xl font-medium">
            Cross-module intelligence engine analyzing financial health, team productivity, and predictive growth trends.
          </p>
        </div>
        <button 
          onClick={handleRefresh}
          className="relative z-10 flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/20 transition-all hover:-translate-y-1 active:scale-95 group"
        >
          <Zap size={20} className={clsx(isLoadingAny && "animate-pulse")} />
          <span>{isLoadingAny ? 'Refreshing...' : 'Refresh Intelligence'}</span>
        </button>
      </div>

      {/* Platform Overview for System Admins */}
      {systemStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="glass-card p-4 rounded-2xl border-l-4 border-l-blue-500 bg-blue-500/5">
            {loadingStates.system ? (
              <div className="h-10 animate-pulse bg-slate-800/50 rounded-lg"></div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400"><Building2 size={18} /></div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total Tenants</p>
                  <p className="text-xl font-black text-white">{systemStats.total_tenants}</p>
                </div>
              </div>
            )}
          </div>
          <div className="glass-card p-4 rounded-2xl border-l-4 border-l-emerald-500 bg-emerald-500/5">
            {loadingStates.system ? (
              <div className="h-10 animate-pulse bg-slate-800/50 rounded-lg"></div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400"><UsersIcon size={18} /></div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total Users</p>
                  <p className="text-xl font-black text-white">{systemStats.total_users}</p>
                </div>
              </div>
            )}
          </div>
          <div className="glass-card p-4 rounded-2xl border-l-4 border-l-amber-500 bg-amber-500/5">
            {loadingStates.system ? (
              <div className="h-10 animate-pulse bg-slate-800/50 rounded-lg"></div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400"><LineChart size={18} /></div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Active Plans</p>
                  <p className="text-xl font-black text-white">{systemStats.active_tenants}</p>
                </div>
              </div>
            )}
          </div>
          <div className="glass-card p-4 rounded-2xl border-l-4 border-l-purple-500 bg-purple-500/5">
            {loadingStates.system ? (
              <div className="h-10 animate-pulse bg-slate-800/50 rounded-lg"></div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400"><Database size={18} /></div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Platform Rev</p>
                  <p className="text-xl font-black text-white">{fmt(systemStats?.total_revenue)}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Financial Health Score Column */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-card p-8 rounded-3xl border-t-8 border-t-indigo-500 flex flex-col items-center text-center group">
            <h3 className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-6">Financial Health Index</h3>
            {loadingStates.health ? (
              <LoadingBox text="Assessing Health..." />
            ) : (
              <>
                <div className="relative mb-6">
                  <svg className="w-40 h-40 transform -rotate-90">
                    <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-slate-800" />
                    <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-indigo-500 transition-all duration-1000 ease-out"
                      strokeDasharray={440} strokeDashoffset={440 - (440 * (health?.score || 0)) / 100} strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-5xl font-black text-white">{health?.score}</span>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Stability Score</span>
                  </div>
                </div>
                <div className="space-y-4 w-full">
                  <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-semibold uppercase">Budget Discipline</span>
                      <span className="text-indigo-400 font-bold">{health?.indices?.budget}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${health?.indices?.budget || 0}%` }}></div>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-semibold uppercase">Debt Management</span>
                      <span className="text-emerald-400 font-bold">{health?.indices?.debt}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${health?.indices?.debt || 0}%` }}></div>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-semibold uppercase">Cash Flow Velocity</span>
                      <span className="text-blue-400 font-bold">{health?.indices?.cash_flow}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${health?.indices?.cash_flow || 0}%` }}></div>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="glass-card p-6 rounded-3xl bg-gradient-to-br from-indigo-900/20 to-slate-900 border border-indigo-500/20">
            <div className="flex items-center gap-2 mb-4 text-indigo-400">
              <Zap size={18} />
              <h4 className="text-sm font-black uppercase tracking-widest">AI Strategic Insights</h4>
            </div>
            {loadingStates.health ? (
              <div className="space-y-2">
                <div className="h-8 bg-slate-800/50 animate-pulse rounded-lg"></div>
                <div className="h-8 bg-slate-800/50 animate-pulse rounded-lg opacity-60"></div>
              </div>
            ) : (
              <div className="space-y-3">
                {health?.insights?.map((insight, idx) => (
                  <div key={idx} className="flex gap-3 p-3 bg-slate-900/50 rounded-xl border border-slate-800 hover:border-indigo-500/30 transition-colors">
                    <div className="mt-1 flex-shrink-0 animate-pulse"><Info size={14} className="text-indigo-400"/></div>
                    <p className="text-xs text-slate-300 leading-relaxed font-medium">{insight}</p>
                  </div>
                )) || (
                  <p className="text-slate-500 text-xs text-center py-4 italic">No critical insights at this time.</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Predictive & Distribution Column */}
        <div className="lg:col-span-3 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-card p-8 rounded-3xl">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-xl font-black text-white tracking-tight">Financial Forecasting</h3>
                  <p className="text-sm text-slate-500 mt-1">Projected balance & cash flow (Next 3 Months)</p>
                </div>
                <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-500">
                   <LineChart size={24} />
                </div>
              </div>
              <div className="h-[280px]">
                {loadingStates.forecast ? (
                  <LoadingBox text="Calculating Projection..." />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={Array.isArray(forecast) ? forecast : []}>
                      <defs>
                        <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                      <XAxis dataKey="period" stroke="#475569" axisLine={false} tickLine={false} dy={10} fontSize={12} />
                      <YAxis stroke="#475569" axisLine={false} tickLine={false} tickFormatter={fmt} fontSize={12} />
                      <Tooltip contentStyle={{ background: '#0F172A', border: '1px solid #334155', borderRadius: '12px' }} />
                      <Area type="monotone" dataKey="balance" fill="url(#colorBalance)" stroke="#3B82F6" strokeWidth={4} name="Projected Balance" />
                      <Bar dataKey="income" fill="#10B981" radius={[4, 4, 0, 0]} barSize={20} name="Est. Income" />
                      <Bar dataKey="expense" fill="#EF4444" radius={[4, 4, 0, 0]} barSize={20} name="Est. Expense" />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="glass-card p-8 rounded-3xl">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-xl font-black text-white tracking-tight">Team Productivity</h3>
                  <p className="text-sm text-slate-500 mt-1">Velocity and Task Distribution</p>
                </div>
                <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-500">
                   <Target size={24} />
                </div>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="p-4 bg-slate-900/50 rounded-2xl border border-slate-800 flex flex-col items-center">
                  <span className="text-2xl font-black text-emerald-400">{loadingStates.productivity ? '--' : productivity?.completion_rate}%</span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1 text-center">Task Completion</span>
                </div>
                <div className="p-4 bg-slate-900/50 rounded-2xl border border-slate-800 flex flex-col items-center">
                  <span className="text-2xl font-black text-blue-400">{loadingStates.productivity ? '--' : productivity?.velocity}</span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1 text-center">Monthly Tasks</span>
                </div>
                <div className="p-4 bg-slate-900/50 rounded-2xl border border-slate-800 flex flex-col items-center">
                  <span className="text-2xl font-black text-emerald-400">{loadingStates.productivity ? '--' : productivity?.attendance_rate}%</span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1 text-center">Daily Attendance</span>
                </div>
                <div className="p-4 bg-slate-900/50 rounded-2xl border border-slate-800 flex flex-col items-center">
                  <span className="text-2xl font-black text-amber-400">{loadingStates.productivity ? '--' : productivity?.on_time_rate}%</span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1 text-center">On-Time Arrival</span>
                </div>
                <div className="p-4 bg-slate-900/50 rounded-2xl border border-slate-800 flex flex-col items-center col-span-2 lg:col-span-4 mt-2">
                  <span className="text-3xl font-black text-indigo-400">{loadingStates.productivity ? '--' : productivity?.weighted_impact}</span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1 text-center">Total Team Impact (Weighted)</span>
                  {productivity?.staff_expected !== undefined && (
                    <span className="text-xs text-slate-400 font-medium mt-2">{productivity.staff_present} of {productivity.staff_expected} staff active today</span>
                  )}
                </div>
              </div>
              <div className="h-[200px]">
                {loadingStates.productivity ? (
                  <LoadingBox text="Analyzing Velocity..." />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                      <Pie
                        data={Array.isArray(productivity?.by_priority) ? productivity.by_priority : []}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="count"
                        nameKey="priority"
                      >
                        {productivity?.by_priority?.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        )) || null}
                      </Pie>
                      <Tooltip contentStyle={{ background: '#0F172A', border: '1px solid #334155', borderRadius: '12px' }} />
                      <Legend iconType="circle" />
                    </RePieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          <div className="glass-card p-8 rounded-3xl overflow-hidden relative">
            <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-xl font-black text-white tracking-tight">Full Lifecycle Cash Flow</h3>
                  <p className="text-sm text-slate-500 mt-1">Historical 12-month performance analysis</p>
                </div>
                <div className="flex gap-2">
                   <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-bold uppercase">Income</span>
                   <span className="px-3 py-1 rounded-full bg-rose-500/10 text-rose-500 text-[10px] font-bold uppercase">Expense</span>
                </div>
            </div>
            <div className="h-[300px]">
               {loadingStates.cashFlow ? (
                 <LoadingBox text="Processing History..." />
               ) : (
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={Array.isArray(cashFlow) ? cashFlow : []}>
                      <defs>
                        <linearGradient id="gradInc" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gradExp" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                      <XAxis dataKey="period" stroke="#475569" axisLine={false} tickLine={false} fontSize={10} />
                      <YAxis stroke="#475569" axisLine={false} tickLine={false} tickFormatter={fmt} fontSize={10} />
                      <Tooltip contentStyle={{ background: '#0F172A', border: '1px solid #334155', borderRadius: '12px' }} />
                      <Area type="monotone" dataKey="income" stroke="#10B981" fill="url(#gradInc)" strokeWidth={3} />
                      <Area type="monotone" dataKey="expense" stroke="#EF4444" fill="url(#gradExp)" strokeWidth={3} />
                    </AreaChart>
                </ResponsiveContainer>
               )}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4">
            <div className="glass-card p-8 rounded-3xl border border-rose-500/20 bg-rose-500/5">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-rose-500/20 rounded-lg text-rose-500">
                  <ShieldCheck size={20} />
                </div>
                <h3 className="text-xl font-black text-white tracking-tight">
                  {customerInsights?.is_system_admin ? 'At-Risk Tenants' : 'Significant Expenses'}
                </h3>
              </div>
              <div className="space-y-4">
                {loadingStates.customers ? <LoadingBox text="Scanning Risk..." /> : customerInsights?.at_risk?.length ? customerInsights.at_risk.map((risk: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-slate-900/80 rounded-2xl border border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white leading-none mb-1">{risk.client_name}</p>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                          {customerInsights?.is_system_admin ? 'No recent activity (7d)' : 'Large Outflow'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                       <p className="text-sm font-black text-rose-400">{fmt(risk.total_overdue)}</p>
                    </div>
                  </div>
                )) : <p className="text-slate-500 text-sm italic text-center py-8">
                  {customerInsights?.is_system_admin ? 'All tenants show recent activity.' : 'No significant expenses detected.'}
                </p>}
              </div>
            </div>

            <div className="glass-card p-8 rounded-3xl border border-emerald-500/20 bg-emerald-500/5">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400">
                  <Activity size={20} />
                </div>
                <h3 className="text-xl font-black text-white tracking-tight">
                  {customerInsights?.is_system_admin ? 'Top Value Tenants' : 'Top Spending Categories'}
                </h3>
              </div>
              <div className="space-y-4">
                {loadingStates.customers ? <LoadingBox text="Analyzing Value..." /> : customerInsights?.top_clients?.length ? customerInsights.top_clients.map((payer: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-slate-900/80 rounded-2xl border border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white leading-none mb-1">{payer.client_name}</p>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                          {customerInsights?.is_system_admin ? 'Platform Revenue Source' : 'Category Volume'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                       <p className="text-sm font-black text-emerald-400">{fmt(payer.total_paid)}</p>
                    </div>
                  </div>
                )) : <p className="text-slate-500 text-sm italic text-center py-8">Gathering payment history...</p>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-12 pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-6 opacity-60 hover:opacity-100 transition-opacity">
        <div className="text-slate-500 text-sm font-medium">
          Integrated Financial Management Suite &copy; 2026
        </div>
        <div className="flex gap-6 items-center">
           <Link to="/app/settings" className="text-slate-400 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors">System Settings</Link>
           <Link to="/app/reports" className="text-slate-400 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors">Report Center</Link>
           <a href={`mailto:${supportEmail}`} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-full text-xs font-bold hover:bg-slate-700 transition-colors">
             Contact Support
           </a>
        </div>
      </footer>
    </div>
  )
}
