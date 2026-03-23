import { useEffect, useState } from 'react'
import { clientsApi } from '../../services/api'
import type { Client, PaginatedResponse } from '../../types'
import { Plus, Search, User, Mail, Phone, MapPin, MoreHorizontal, Edit2, Trash2, ExternalLink } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import DataTable from '../../components/DataTable'
import Modal from '../../components/Modal'
import { useForm } from 'react-hook-form'
import { useAuthStore } from '../../store'

interface ClientFormData {
  [key: string]: any
  name: string
  email?: string
  phone?: string
  address?: string
}

export default function ClientsPage() {
  const { user } = useAuthStore()
  const [data, setData] = useState<PaginatedResponse<Client> | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  
  const [showForm, setShowForm] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { register, handleSubmit, reset, setValue } = useForm<ClientFormData>()

  const load = async (page = 1) => {
    setLoading(true)
    try {
      const res = await clientsApi.list({ page, search: search || undefined })
      setData(res.data)
      setCurrentPage(page)
    } catch {
      toast.error('Failed to load clients')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => load(1), 300)
    return () => clearTimeout(timer)
  }, [search])

  const onSubmit = async (formData: ClientFormData) => {
    setIsSubmitting(true)
    try {
      if (selectedClient) {
        await clientsApi.update(selectedClient.id, formData)
        toast.success('Client updated successfully')
      } else {
        await clientsApi.create(formData)
        toast.success('Client created successfully')
      }
      setShowForm(false)
      load(currentPage)
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to save client')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this client?')) return
    try {
      await clientsApi.delete(id)
      toast.success('Client deleted')
      load(currentPage)
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to delete client')
    }
  }

  const openForm = (client?: Client) => {
    setSelectedClient(client || null)
    if (client) {
      setValue('name', client.name)
      setValue('email', client.email || '')
      setValue('phone', client.phone || '')
      setValue('address', client.address || '')
    } else {
      reset({ name: '', email: '', phone: '', address: '' })
    }
    setShowForm(true)
  }

  const columns = [
    {
      header: 'Client Name',
      accessor: (client: Client) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-900/30 flex items-center justify-center text-blue-400">
            <User size={16} />
          </div>
          <div>
            <span className="font-medium text-slate-200">{client.name}</span>
            <p className="text-xs text-slate-500">Added {format(new Date(client.created_at), 'dd MMM yyyy')}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Contact Info',
      priority: 'mobile-hidden',
      accessor: (client: Client) => (
        <div className="space-y-1">
          {client.email && (
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Mail size={12} /> {client.email}
            </div>
          )}
          {client.phone && (
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Phone size={12} /> {client.phone}
            </div>
          )}
        </div>
      )
    },
    {
      header: 'Address',
      priority: 'mobile-hidden',
      accessor: (client: Client) => (
        <div className="flex items-center gap-1.5 text-xs text-slate-400 max-w-[200px] truncate">
          <MapPin size={12} className="shrink-0" />
          {client.address || 'No address'}
        </div>
      )
    },
    {
      header: 'Summary',
      accessor: (client: Client) => (
        <div className="flex gap-4 text-xs font-semibold">
          <div className="text-center">
            <p className="text-slate-500 uppercase tracking-tighter text-[10px]">Invoices</p>
            <p className="text-blue-400">{client.invoices_count || 0}</p>
          </div>
          <div className="text-center">
            <p className="text-slate-500 uppercase tracking-tighter text-[10px]">Debts</p>
            <p className="text-emerald-400">{client.debts_count || 0}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Actions',
      accessor: (client: Client) => (
        <div className="flex gap-1">
          <button onClick={() => openForm(client)} className="p-1.5 rounded text-slate-400 hover:text-blue-400 hover:bg-blue-900/20 transition-colors">
            <Edit2 size={14} />
          </button>
          <button onClick={() => handleDelete(client.id)} className="p-1.5 rounded text-slate-400 hover:text-red-400 hover:bg-red-900/20 transition-colors">
            <Trash2 size={14} />
          </button>
        </div>
      )
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Client Management</h1>
          <p className="text-slate-400 text-sm">Manage your business clients and contact details</p>
        </div>
        <button onClick={() => openForm()} className="btn-primary w-fit">
          <Plus size={18} /> Add Client
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
        <input 
          type="text" 
          placeholder="Search clients..." 
          className="w-full bg-slate-900/50 border-slate-700 text-white pl-10 h-11 rounded-lg focus:ring-blue-500"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <DataTable 
        columns={columns as any}
        data={data}
        loading={loading}
        onPageChange={load}
        emptyMessage="No clients found"
      />

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={selectedClient ? 'Edit Client' : 'Add New Client'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="fmis-label">Client Name / Company <span className="text-red-400">*</span></label>
            <input {...register('name', { required: true })} className="fmis-input" placeholder="e.g. Acme Corp" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="fmis-label">Email Address</label>
              <input type="email" {...register('email')} className="fmis-input" placeholder="client@example.com" />
            </div>
            <div>
              <label className="fmis-label">Phone Number</label>
              <input {...register('phone')} className="fmis-input" placeholder="+255..." />
            </div>
          </div>
          <div>
            <label className="fmis-label">Physical Address</label>
            <textarea {...register('address')} rows={3} className="fmis-input" placeholder="City, Street, Building..." />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-700/50">
            <button type="button" onClick={() => setShowForm(false)} className="btn-ghost">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary">
              {isSubmitting ? 'Saving...' : (selectedClient ? 'Update Client' : 'Create Client')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
