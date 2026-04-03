import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Building, Plus, MoreVertical, Edit, Trash, Check, X, Search, Activity, Globe, Zap, Shield, Mail, ArrowUpRight } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import type { Tenant } from '../../types'
import DataTable from '../../components/DataTable'
import clsx from 'clsx'

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [formData, setFormData] = useState<Partial<Tenant>>({ plan: 'basic', is_active: true } as any)

  const fetchTenants = async () => {
    try {
      const { data } = await api.get('/tenants')
      setTenants(data.data || data)
    } catch (err) {
      toast.error('Failed to load tenants')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTenants()
  }, [])

  const filteredTenants = tenants.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    t.slug.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (formData.id) {
        await api.put(`/tenants/${formData.id}`, formData)
        toast.success('Tenant configuration updated')
      } else {
        await api.post('/tenants', formData)
        toast.success('New tenant provisioned successfully')
      }
      setIsModalOpen(false)
      fetchTenants()
    } catch (err) {
      toast.error('Provisioning failed. Please check slug uniqueness.')
    }
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('CRITICAL: This will delete all tenant data. Proceed?')) return
    try {
      await api.delete(`/tenants/${id}`)
      toast.success('Tenant removed')
      fetchTenants()
    } catch (err) {
      toast.error('Decommissioning failed')
    }
  }

  const planColors: Record<string, string> = {
    basic: 'bg-slate-700/50 text-slate-300 border-slate-600/50',
    pro: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    enterprise: 'bg-purple-500/10 text-purple-400 border-purple-500/20'
  }

  const columns = [
    {
      header: 'Organization',
      accessor: (t: Tenant) => (
        <div className="flex items-center gap-3">
          {t.logo ? (
            <img src={t.logo} alt={t.name} className="h-9 w-9 rounded-lg object-contain bg-slate-800 border border-slate-700 p-1" />
          ) : (
            <div className="h-9 w-9 rounded-lg flex items-center justify-center text-white font-bold text-xs bg-gradient-to-br from-blue-600 to-blue-400 border border-blue-500/30">
              {t.name.substring(0, 1)}
            </div>
          )}
          <div className="flex flex-col">
            <span className="font-bold text-white text-sm">{t.name}</span>
            <span className="text-[10px] font-mono text-slate-500 tracking-wider">SLUG: {t.slug}</span>
          </div>
        </div>
      )
    },
    {
      header: 'Environment',
      priority: 4,
      accessor: (t: Tenant) => (
        <div className="flex flex-col gap-1">
          <span className={clsx("px-2 py-0.5 rounded-full text-xs font-bold border w-fit capitalize", planColors[t.plan])}>
            {t.plan}
          </span>
          <span className="text-[10px] text-slate-500 flex items-center gap-1"><Globe size={10} /> {t.timezone || 'UTC'}</span>
        </div>
      )
    },
    {
        header: 'Health',
        accessor: (t: Tenant) => (
          /* @ts-ignore */
          t.is_active ? (
            <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
                <span className="text-emerald-400 text-xs font-semibold">Healthy</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-slate-500 opacity-60">
                <div className="h-2 w-2 rounded-full bg-slate-500" />
                <span className="text-xs font-semibold">Suspended</span>
            </div>
          )
        )
      },
      {
        header: 'Resources',
        priority: 5,
        accessor: (t: Tenant) => (
          <div className="flex flex-col text-[11px] text-slate-400">
            <span className="flex items-center gap-1"><Zap size={10} className="text-yellow-500" /> Active Modules</span>
            <span className="text-slate-500 font-mono">Standard Stack</span>
          </div>
        )
      },
    {
      header: 'Actions',
      className: 'text-right',
      accessor: (t: Tenant) => (
        <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={() => { setFormData(t); setIsModalOpen(true); }} 
            className="p-2 text-slate-400 hover:text-blue-400 rounded-lg hover:bg-blue-400/10 transition-all active:scale-95"
            title="Edit Configuration"
          >
            <Edit size={16} />
          </button>
          <button 
            onClick={() => handleDelete(t.id)} 
            className="p-2 text-slate-400 hover:text-red-400 rounded-lg hover:bg-red-400/10 transition-all active:scale-95"
            title="Decommission Tenant"
          >
            <Trash size={16} />
          </button>
          <button 
            className="p-2 text-slate-400 hover:text-emerald-400 rounded-lg hover:bg-emerald-400/10 transition-all active:scale-95"
            onClick={() => window.open(`https://${t.slug}.fmis.com`, '_blank')}
            title="Launch Organization Portal"
          >
            <ArrowUpRight size={16} />
          </button>
        </div>
      )
    }
  ]

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
            <Building className="text-blue-500" size={32} /> Organizations & Multi-Tenancy
          </h1>
          <p className="text-slate-400 mt-2 max-w-2xl leading-relaxed">
            Provision and decommission system entities, manage global subscription tiers, and monitor sandbox health.
          </p>
        </div>
        <button 
          onClick={() => { setFormData({ plan: 'basic', is_active: true } as any); setIsModalOpen(true); }} 
          className="btn-primary flex items-center justify-center gap-2 py-3 px-6 shadow-xl shadow-blue-600/20 self-start"
        >
          <Plus size={18} /> Provision Tenant
        </button>
      </div>

      {/* Global Context Tooltip / Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pb-2">
        <div className="glass-card p-4 flex items-center gap-3 border-l-4 border-l-blue-500">
            <Shield size={20} className="text-blue-400" />
            <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Global Status</p>
                <p className="text-white font-bold">{tenants.length} Active Environments</p>
            </div>
        </div>
        <div className="glass-card p-4 flex items-center gap-3 border-l-4 border-l-emerald-500">
            <Activity size={20} className="text-emerald-400" />
            <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Traffic Trend</p>
                <p className="text-white font-bold">Stable Operational Load</p>
            </div>
        </div>
        <div className="glass-card p-4 flex items-center gap-3 border-l-4 border-l-purple-500 md:col-span-2">
            <Search size={20} className="text-slate-400" />
            <input 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Lookup tenant by name or URI slug..." 
                className="bg-transparent border-none text-white focus:ring-0 placeholder:text-slate-600 w-full text-sm font-medium"
            />
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <DataTable 
          columns={columns as any}
          data={{
            data: filteredTenants,
            current_page: 1,
            last_page: 1,
            per_page: constants.MAX_PAGE_SIZE,
            total: filteredTenants.length
          }}
          loading={loading}
          emptyMessage="System vacuum: No valid tenant environments detected."
        />
      </div>

      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-fade-in shadow-2xl">
          <div className="glass-card max-w-xl w-full p-8 shadow-2xl relative border-slate-700/80 group overflow-y-auto max-h-[90vh]">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-600 via-blue-400 to-blue-600 rounded-t-xl" />
            
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">{formData.id ? 'Modify Provisioning' : 'New System Entity'}</h2>
                <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-bold">Infrastructure Control Layer</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-xl transition-all"><X size={24} /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="fmis-label">Organization Name</label>
                  <input required value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} className="fmis-input" placeholder="e.g. Acme Corp" />
                </div>
                {!formData.id && (
                  <div>
                    <label className="fmis-label">Platform Slug (Unique)</label>
                    <input required value={formData.slug || ''} onChange={e => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })} className="fmis-input font-mono lowercase" placeholder="e.g. acme" />
                  </div>
                )}
              </div>

              <div>
                <label className="fmis-label flex items-center gap-2"><Mail size={14} className="text-slate-500" /> Administrative Contact Email</label>
                <input type="email" required value={formData.email || ''} onChange={e => setFormData({ ...formData, email: e.target.value })} className="fmis-input" placeholder="admin@tenant.com" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                <div>
                  <label className="fmis-label">Service Plan (Global Tier)</label>
                  <select required value={formData.plan || 'basic'} onChange={e => setFormData({ ...formData, plan: e.target.value as any })} className="fmis-select">
                    <option value="basic">Basic Tier (Free)</option>
                    <option value="pro">Pro Workspace (Paid)</option>
                    <option value="enterprise">Enterprise Logic (Complex)</option>
                  </select>
                </div>
                <div className="flex items-center gap-3 bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
                    <label className="text-sm font-medium text-slate-400 flex-1">Active Status</label>
                    <button 
                        type="button"
                        onClick={() => setFormData(f => ({ ...f, is_active: !f.is_active } as any))}
                        className={clsx(
                            "w-12 h-6 rounded-full relative transition-all duration-300",
                            /* @ts-ignore */
                            formData.is_active ? "bg-blue-600" : "bg-slate-700"
                        )}
                    >
                        {/* @ts-ignore */}
                        <div className={clsx("absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300", formData.is_active ? "left-7" : "left-1")} />
                    </button>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-4 border-t border-slate-700/50 mt-8">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-slate-400 hover:text-white font-medium transition-colors">Discard</button>
                <button type="submit" className="px-8 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all">
                  {formData.id ? 'Commit Upgrades' : 'Deploy Organization'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

const constants = {
    MAX_PAGE_SIZE: 50
}
