import { useEffect, useState } from 'react'
import { usersApi } from '../../services/api'
import type { User, PaginatedData } from '../../types'
import { Plus, UserCheck, UserX, Loader2, Shield } from 'lucide-react'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import Modal from '../../components/Modal'
import { useForm } from 'react-hook-form'
import DataTable from '../../components/DataTable'
import { useAuthStore } from '../../store'
import api from '../../services/api'

const roleColor: Record<string, string> = {
  director: 'bg-purple-900/50 text-purple-400',
  manager:  'bg-blue-900/50 text-blue-400',
  staff:    'bg-slate-700 text-slate-300',
}

export default function UsersPage() {
  const { user } = useAuthStore()
  const isSystemAdmin = !user?.tenant_id && user?.permissions?.includes('manage-tenants')

  const { register, handleSubmit: handleFormSubmit, reset, setValue } = useForm<{
    name: string; email: string; password: string; department: string; role: string; tenant_id?: number | string;
  }>({
    defaultValues: { role: 'staff' }
  })

  const [data, setData] = useState<PaginatedData<User> | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [isSubmittingForm, setIsSubmittingForm] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [tenants, setTenants] = useState<any[]>([])

  const load = (page = 1) => {
    setLoading(true)
    usersApi.list({ page }).then(res => {
      setData(res.data)
      setCurrentPage(page)
    }).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => { 
    load(1)
    if (isSystemAdmin) {
      api.get('/tenants').then(res => setTenants(res.data.data || res.data)).catch(() => {})
    }
  }, [isSystemAdmin])

  const onSubmitForm = async (formData: any) => {
    setIsSubmittingForm(true)
    try {
      await usersApi.create({ ...formData, roles: [formData.role] })
      toast.success('User created successfully')
      setShowForm(false)
      reset()
      load(1)
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to create user')
    } finally {
      setIsSubmittingForm(false)
    }
  }

  const columns = [
    {
      header: 'User',
      accessor: (user: User) => (
        <div className="flex items-center gap-3">
          <img src={user.avatar_url} alt={user.name} className="h-8 w-8 rounded-full" />
          <div>
            <p className="font-medium text-slate-200">{user.name}</p>
            <p className="text-xs text-slate-500">{user.email}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Department',
      priority: 'mobile-hidden' as const,
      accessor: (user: User) => <span className="text-slate-400">{user.department || '—'}</span>
    },
    {
      header: 'Role',
      accessor: (user: User) => (
        <div className="flex gap-1.5 flex-wrap">
          {user.roles.map(role => (
            <span key={role} className={clsx('text-xs font-semibold px-2 py-0.5 rounded-full capitalize', roleColor[role] || 'bg-slate-700 text-slate-300')}>
              {role}
            </span>
          ))}
        </div>
      )
    },
    {
      header: 'Tenant',
      hidden: !isSystemAdmin,
      accessor: (user: any) => (
        <div className="flex flex-col">
            <span className="text-xs font-semibold text-blue-400 uppercase tracking-tighter">{user.tenant_name || 'System'}</span>
            <span className="text-[10px] text-slate-500">ID: {user.tenant_id || 'Global'}</span>
        </div>
      )
    },
    {
      header: 'Status',
      priority: 'mobile-hidden' as const,
      accessor: (user: User) => (
        <div className="flex items-center gap-1.5">
          {user.is_active ? <UserCheck size={14} className="text-emerald-400" /> : <UserX size={14} className="text-red-400" />}
          <span className={clsx('text-xs', user.is_active ? 'text-emerald-400' : 'text-red-400')}>{user.is_active ? 'Active' : 'Inactive'}</span>
        </div>
      )
    }
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Users</h1>
          <p className="text-slate-400 text-sm">Manage team members and their roles</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <Plus size={16} /> Add User
        </button>
      </div>

      <DataTable 
        columns={columns as any}
        data={data}
        loading={loading}
        onPageChange={load}
        emptyMessage="No users found"
      />

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Add User">
        <form onSubmit={handleFormSubmit(onSubmitForm)} className="space-y-4">
          <div>
            <label className="fmis-label">Full Name</label>
            <input {...register('name', { required: true })} className="fmis-input" placeholder="John Doe" />
          </div>
          <div>
            <label className="fmis-label">Email Address</label>
            <input type="email" {...register('email', { required: true })} className="fmis-input" placeholder="john@example.com" />
          </div>
          <div>
            <label className="fmis-label">Password</label>
            <input type="password" {...register('password', { required: true, minLength: 8 })} className="fmis-input" placeholder="••••••••" />
          </div>
          <div className={clsx("grid gap-4", isSystemAdmin ? "grid-cols-3" : "grid-cols-2")}>
            <div>
              <label className="fmis-label">Department</label>
              <input {...register('department')} className="fmis-input" placeholder="e.g., Finance" />
            </div>
            <div>
              <label className="fmis-label">Role</label>
              <select {...register('role')} className="fmis-select">
                <option value="staff">Staff</option>
                <option value="manager">Manager</option>
                <option value="director">Director</option>
                {isSystemAdmin && <option value="super-admin">Super Admin</option>}
              </select>
            </div>
            {isSystemAdmin && (
              <div>
                <label className="fmis-label">Tenant</label>
                <select {...register('tenant_id')} className="fmis-select">
                  <option value="">System (No Tenant)</option>
                  {tenants.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-700/50">
            <button type="button" onClick={() => setShowForm(false)} className="btn-ghost">Cancel</button>
            <button type="submit" disabled={isSubmittingForm} className="btn-primary">
              {isSubmittingForm ? <Loader2 size={16} className="animate-spin" /> : 'Create User'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
