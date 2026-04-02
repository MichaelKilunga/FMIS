import { useEffect, useState } from 'react'
import { usersApi } from '../../services/api'
import type { User, PaginatedData } from '../../types'
import { Plus, UserCheck, UserX, Loader2, Shield, Pencil, X, Check } from 'lucide-react'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import Modal from '../../components/Modal'
import { useForm } from 'react-hook-form'
import DataTable from '../../components/DataTable'
import { useAuthStore } from '../../store'
import api from '../../services/api'

const ROLES = ['staff', 'manager', 'director', 'tenant-admin']

const roleColor: Record<string, string> = {
  director:     'bg-purple-900/50 text-purple-400',
  manager:      'bg-blue-900/50 text-blue-400',
  staff:        'bg-slate-700 text-slate-300',
  'tenant-admin': 'bg-amber-900/50 text-amber-400',
}

// Inline row editor state
interface EditState {
  userId: number
  role: string
  is_active: boolean
  saving: boolean
}

export default function UsersPage() {
  const { user } = useAuthStore()
  const isSystemAdmin = !user?.tenant_id && user?.permissions?.includes('manage-tenants')
  const canManageUsers = user?.permissions?.includes('manage-users')

  const { register, handleSubmit: handleFormSubmit, reset } = useForm<{
    name: string; email: string; password: string; department: string; role: string; tenant_id?: number | string;
  }>({
    defaultValues: { role: 'staff' }
  })

  const [data, setData]                     = useState<PaginatedData<User> | null>(null)
  const [loading, setLoading]               = useState(true)
  const [showForm, setShowForm]             = useState(false)
  const [isSubmittingForm, setIsSubmittingForm] = useState(false)
  const [currentPage, setCurrentPage]       = useState(1)
  const [tenants, setTenants]               = useState<any[]>([])
  const [editState, setEditState]           = useState<EditState | null>(null)

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

  const startEdit = (u: User) => {
    setEditState({
      userId: u.id,
      role: u.roles?.[0] || 'staff',
      is_active: u.is_active,
      saving: false,
    })
  }

  const cancelEdit = () => setEditState(null)

  const saveEdit = async () => {
    if (!editState) return
    setEditState(s => s ? { ...s, saving: true } : null)
    try {
      await usersApi.update(editState.userId, {
        role: editState.role,
        is_active: editState.is_active,
      })
      toast.success('User updated')
      setEditState(null)
      load(currentPage)
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to update user')
      setEditState(s => s ? { ...s, saving: false } : null)
    }
  }

  const toggleStatus = async (u: User) => {
    if (!canManageUsers) return
    try {
      await usersApi.update(u.id, { is_active: !u.is_active })
      toast.success(`User ${!u.is_active ? 'activated' : 'deactivated'}`)
      load(currentPage)
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to update status')
    }
  }

  const columns = [
    {
      header: 'User',
      accessor: (u: User) => (
        <div className="flex items-center gap-3">
          <img src={u.avatar_url} alt={u.name} className="h-8 w-8 rounded-full" />
          <div>
            <p className="font-medium text-slate-200">{u.name}</p>
            <p className="text-xs text-slate-500">{u.email}</p>
            {u.department && <p className="text-[10px] text-slate-600">{u.department}</p>}
          </div>
        </div>
      )
    },
    {
      header: 'Role',
      priority: 3,
      accessor: (u: User) => {
        const isEditing = editState?.userId === u.id
        if (isEditing && canManageUsers) {
          return (
            <select
              id={`role-select-${u.id}`}
              value={editState.role}
              onChange={e => setEditState(s => s ? { ...s, role: e.target.value } : null)}
              className="bg-slate-800 border border-slate-600 text-white text-xs rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
              autoFocus
            >
              {ROLES.map(r => (
                <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
              ))}
              {isSystemAdmin && <option value="super-admin">Super Admin</option>}
            </select>
          )
        }
        return (
          <div className="flex gap-1.5 flex-wrap">
            {u.roles.map(role => (
              <span key={role} className={clsx('text-xs font-semibold px-2 py-0.5 rounded-full capitalize', roleColor[role] || 'bg-slate-700 text-slate-300')}>
                {role}
              </span>
            ))}
          </div>
        )
      }
    },
    {
      header: 'Status',
      priority: 2,
      accessor: (u: User) => {
        const isEditing = editState?.userId === u.id
        const activeVal = isEditing ? editState.is_active : u.is_active
        if (isEditing && canManageUsers) {
          return (
            <button
              id={`status-toggle-${u.id}`}
              onClick={() => setEditState(s => s ? { ...s, is_active: !s.is_active } : null)}
              className={clsx(
                'flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full border transition-all',
                activeVal
                  ? 'bg-emerald-900/30 text-emerald-400 border-emerald-500/30 hover:bg-emerald-900/50'
                  : 'bg-red-900/30 text-red-400 border-red-500/30 hover:bg-red-900/50'
              )}
            >
              {activeVal ? <UserCheck size={12} /> : <UserX size={12} />}
              {activeVal ? 'Active' : 'Inactive'}
            </button>
          )
        }
        return (
          <div className="flex items-center gap-1.5">
            {u.is_active
              ? <UserCheck size={14} className="text-emerald-400" />
              : <UserX size={14} className="text-red-400" />
            }
            <span className={clsx('text-xs', u.is_active ? 'text-emerald-400' : 'text-red-400')}>
              {u.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
        )
      }
    },
    {
      header: 'Tenant',
      hidden: !isSystemAdmin,
      accessor: (u: any) => (
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-blue-400 uppercase tracking-tighter">{u.tenant_name || 'System'}</span>
          <span className="text-[10px] text-slate-500">ID: {u.tenant_id || 'Global'}</span>
        </div>
      )
    },
    {
      header: 'Actions',
      accessor: (u: User) => {
        if (!canManageUsers) return null
        const isEditing = editState?.userId === u.id
        if (isEditing) {
          return (
            <div className="flex items-center gap-2">
              <button
                id={`save-user-${u.id}`}
                onClick={saveEdit}
                disabled={editState.saving}
                className="p-1.5 rounded text-emerald-400 hover:bg-emerald-900/20 transition-colors border border-emerald-500/20"
                title="Save changes"
              >
                {editState.saving
                  ? <Loader2 size={14} className="animate-spin" />
                  : <Check size={14} />
                }
              </button>
              <button
                id={`cancel-edit-${u.id}`}
                onClick={cancelEdit}
                className="p-1.5 rounded text-slate-400 hover:bg-slate-700 transition-colors"
                title="Cancel"
              >
                <X size={14} />
              </button>
            </div>
          )
        }
        return (
          <div className="flex items-center gap-2">
            <button
              id={`edit-user-${u.id}`}
              onClick={() => startEdit(u)}
              className="p-1.5 rounded text-blue-400 hover:bg-blue-900/20 transition-colors border border-blue-500/20"
              title="Edit role & status"
            >
              <Pencil size={14} />
            </button>
            <button
              id={`toggle-status-${u.id}`}
              onClick={() => toggleStatus(u)}
              className={clsx(
                'p-1.5 rounded transition-colors border',
                u.is_active
                  ? 'text-red-400 hover:bg-red-900/20 border-red-500/20'
                  : 'text-emerald-400 hover:bg-emerald-900/20 border-emerald-500/20'
              )}
              title={u.is_active ? 'Deactivate user' : 'Activate user'}
            >
              {u.is_active ? <UserX size={14} /> : <UserCheck size={14} />}
            </button>
          </div>
        )
      }
    }
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Users</h1>
          <p className="text-slate-400 text-sm">Manage team members, roles and access</p>
        </div>
        {canManageUsers && (
          <button id="add-user-btn" onClick={() => setShowForm(true)} className="btn-primary">
            <Plus size={16} /> Add User
          </button>
        )}
      </div>

      {canManageUsers && (
        <div className="glass-card p-3 flex items-center gap-2 text-xs text-slate-400 border-l-2 border-blue-500">
          <Shield size={14} className="text-blue-400 shrink-0" />
          Click the <Pencil size={11} className="inline mx-0.5" /> icon on any user to change their role or toggle their active status.
        </div>
      )}

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
                <option value="tenant-admin">Tenant Admin</option>
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
