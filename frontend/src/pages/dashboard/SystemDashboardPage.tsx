import { useEffect, useState } from 'react'
import { systemAdminApi } from '../../services/api'
import { 
  Building, Users, ArrowLeftRight, Activity, 
  Server, Database, Cpu, HardDrive, RefreshCw,
  TrendingUp, Shield, Zap, Globe
} from 'lucide-react'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import { format } from 'date-fns'

interface SystemStats {
  total_tenants: number
  active_tenants: number
  total_users: number
  active_users: number
  total_transactions: number
  total_revenue: number
  tenants_by_plan: { plan: string; count: number }[]
}

interface SystemHealth {
  database: { status: string; connection: string; error?: string }
  storage: { total: string; free: string; used: string; usage_percentage: number }
  laravel_version: string
  php_version: string
  os: string
  server: string
}

export default function SystemDashboardPage() {
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [health, setHealth] = useState<SystemHealth | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadData = async () => {
    setRefreshing(true)
    try {
      const [statsRes, healthRes] = await Promise.all([
        systemAdminApi.stats(),
        systemAdminApi.health()
      ])
      setStats(statsRes.data)
      setHealth(healthRes.data)
    } catch (err) {
      toast.error('Failed to load system metrics')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <RefreshCw className="animate-spin text-blue-500" size={32} />
        <p className="text-slate-400 animate-pulse">Initializing System Intelligence...</p>
      </div>
    )
  }

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Shield className="text-blue-500" size={32} /> System Overview
          </h1>
          <p className="text-slate-400 mt-1">Global infrastructure monitor and business intelligence</p>
        </div>
        <button 
          onClick={loadData} 
          disabled={refreshing}
          className="btn-secondary flex items-center gap-2 self-start"
        >
          <RefreshCw size={16} className={clsx(refreshing && "animate-spin")} />
          {refreshing ? 'Refreshing...' : 'Refresh Metrics'}
        </button>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          icon={Building} 
          label="Total Tenants" 
          value={stats?.total_tenants || 0} 
          subValue={`${stats?.active_tenants} Active`} 
          color="blue" 
        />
        <StatCard 
          icon={Users} 
          label="System Users" 
          value={stats?.total_users || 0} 
          subValue={`${stats?.active_users} Engaged`} 
          color="emerald" 
        />
        <StatCard 
          icon={ArrowLeftRight} 
          label="Total Transactions" 
          value={stats?.total_transactions || 0} 
          subValue="Cross-tenant" 
          color="amber" 
        />
        <StatCard 
          icon={TrendingUp} 
          label="Global Volume" 
          value={new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact' }).format(stats?.total_revenue || 0)} 
          subValue="Posted Income" 
          color="purple" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Plan Distribution */}
        <div className="lg:col-span-1 glass-card p-6 flex flex-col">
          <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <Globe size={18} className="text-blue-400" /> Subscription Mix
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats?.tenants_by_plan || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="count"
                  nameKey="plan"
                >
                  {stats?.tenants_by_plan.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #334155', borderRadius: '8px' }}
                  itemStyle={{ color: '#F8FAFC' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {stats?.tenants_by_plan.map((item, i) => (
              <div key={item.plan} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-slate-300 capitalize">{item.plan}</span>
                </div>
                <span className="text-white font-medium">{item.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* System Health Area */}
        <div className="lg:col-span-2 space-y-8">
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
              <Zap size={18} className="text-yellow-400" /> Infrastructure Health
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Database Status */}
              <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                      <Database size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">Database Cluster</p>
                      <p className="text-xs text-slate-500">{health?.database.connection}</p>
                    </div>
                  </div>
                  <span className={clsx(
                    "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                    health?.database.status === 'healthy' ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"
                  )}>
                    {health?.database.status}
                  </span>
                </div>
                {health?.database.error && (
                  <p className="text-xs text-red-400 mt-2 p-2 bg-red-900/20 rounded border border-red-900/30 font-mono truncate">
                    {health.database.error}
                  </p>
                )}
              </div>

              {/* Server Environment */}
              <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
                    <Server size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Server Softstack</p>
                    <p className="text-xs text-slate-500">PHP {health?.php_version} - Laravel {health?.laravel_version}</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-4 text-xs font-mono text-slate-400">
                  <span className="flex items-center gap-1.5"><Globe size={12} /> {health?.os}</span>
                  <span className="flex items-center gap-1.5 truncate"><Cpu size={12} /> {health?.server}</span>
                </div>
              </div>

              {/* Storage Usage */}
              <div className="md:col-span-2 bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400">
                      <HardDrive size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">System Storage</p>
                      <p className="text-xs text-slate-500">{health?.storage.used} of {health?.storage.total} used</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-white">{health?.storage.usage_percentage}%</span>
                </div>
                <div className="w-full h-2 bg-slate-700/50 rounded-full overflow-hidden">
                  <div 
                    className="h-full transition-all duration-1000" 
                    style={{ 
                      width: `${health?.storage.usage_percentage}%`, 
                      background: `linear-gradient(90deg, #3B82F6, #8B5CF6)` 
                    }} 
                  />
                </div>
                <div className="flex justify-between mt-2 text-[10px] text-slate-500 font-medium">
                    <span>{health?.storage.free} AVAILABLE</span>
                    <span>100% CAPACITY</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, subValue, color }: { icon: any, label: string, value: string | number, subValue: string, color: string }) {
  const colorClasses: Record<string, string> = {
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    red: 'text-red-400 bg-red-500/10 border-red-500/20'
  }

  return (
    <div className="glass-card p-6 flex items-start gap-4">
      <div className={clsx("p-3 rounded-2xl border", colorClasses[color])}>
        <Icon size={24} />
      </div>
      <div>
        <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-bold text-white mt-1">{value}</p>
        <p className="text-slate-500 text-xs mt-1 font-medium">{subValue}</p>
      </div>
    </div>
  )
}
