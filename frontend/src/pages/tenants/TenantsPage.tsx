import { useState, useEffect } from 'react'
import { Building, Plus, MoreVertical, Edit, Trash, Check, X } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import type { Tenant } from '../../types'
import DataTable from '../../components/DataTable'

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (formData.id) {
        await api.put(`/tenants/${formData.id}`, formData)
        toast.success('Tenant updated')
      } else {
        await api.post('/tenants', formData)
        toast.success('Tenant created')
      }
      setIsModalOpen(false)
      fetchTenants()
    } catch (err) {
      toast.error('Operation failed')
    }
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this tenant?')) return
    try {
      await api.delete(`/tenants/${id}`)
      toast.success('Tenant deleted')
      fetchTenants()
    } catch (err) {
      toast.error('Delete failed')
    }
  }

  const columns = [
    {
      header: 'Tenant Name',
      accessor: (t: Tenant) => <span className="font-medium text-white">{t.name}</span>
    },
    {
      header: 'Slug',
      accessor: (t: Tenant) => <span className="text-slate-400">{t.slug}</span>
    },
    {
      header: 'Plan',
      accessor: (t: Tenant) => <span className="px-2.5 py-1 bg-slate-700 rounded-md text-xs capitalize">{t.plan}</span>
    },
    {
      header: 'Status',
      accessor: (t: Tenant) => (
        /* @ts-ignore */
        t.is_active ? (
          <span className="inline-flex items-center gap-1 text-emerald-400 text-xs">
            <Check size={14} /> Active
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-red-400 text-xs">
            <X size={14} /> Inactive
          </span>
        )
      )
    },
    {
      header: 'Actions',
      className: 'text-right',
      accessor: (t: Tenant) => (
        <div className="flex justify-end gap-2">
          <button onClick={() => { setFormData(t); setIsModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-blue-400 rounded-lg hover:bg-blue-400/10 transition">
            <Edit size={16} />
          </button>
          <button onClick={() => handleDelete(t.id)} className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-red-400/10 transition">
            <Trash size={16} />
          </button>
        </div>
      )
    }
  ]

  if (loading) return <div className="text-white">Loading...</div>

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Building className="text-blue-400" /> Tenants
          </h1>
          <p className="text-slate-400 text-sm mt-1">Manage system tenants and organizations.</p>
        </div>
        <button onClick={() => { setFormData({ plan: 'basic', is_active: true } as any); setIsModalOpen(true); }} className="btn-primary">
          <Plus size={16} /> Add Tenant
        </button>
      </div>

      <DataTable 
        columns={columns as any}
        data={{
          data: tenants,
          current_page: 1,
          last_page: 1,
          per_page: tenants.length,
          total: tenants.length
        }}
        loading={loading}
        emptyMessage="No tenants found."
      />

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl max-w-md w-full p-6 animate-fade-in shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">{formData.id ? 'Edit Tenant' : 'New Tenant'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white transition"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Name</label>
                <input required value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              </div>
              {!formData.id && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Slug (Unique)</label>
                  <input required value={formData.slug || ''} onChange={e => setFormData({ ...formData, slug: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Admin Email</label>
                <input type="email" required value={formData.email || ''} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Plan</label>
                <select required value={formData.plan || 'basic'} onChange={e => setFormData({ ...formData, plan: e.target.value as any })} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none">
                  <option value="basic">Basic</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 mt-8">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-300 hover:bg-slate-700 rounded-lg transition">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
