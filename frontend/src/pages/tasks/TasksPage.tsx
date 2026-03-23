import { useState, useEffect } from 'react'
import { Plus, Filter, Calendar, CheckCircle2, Clock, AlertCircle, Edit2, Trash2, LayoutGrid, List as ListIcon, RefreshCw, Play, CheckCircle, TrendingUp, Users, Target } from 'lucide-react'
import { tasksApi, usersApi } from '../../services/api'
import type { Task, User, PaginatedData } from '../../types'
import { useAuthStore } from '../../store'
import DataTable from '../../components/DataTable'
import Modal from '../../components/Modal'
import TaskModal from '../../components/tasks/TaskModal'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import { format } from 'date-fns'

export default function TasksPage() {
  const { user } = useAuthStore()
  const [tasks, setTasks] = useState<PaginatedData<Task> | null>(null)
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | undefined>(undefined)
  const [users, setUsers] = useState<User[]>([])
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    assigned_to: '',
  })
  const [stats, setStats] = useState<any>(null)

  const isManagement = user?.roles?.some(r => ['director', 'manager', 'tenant-admin'].includes(r))

  const fetchTasks = async (page = 1) => {
    setLoading(true)
    try {
      const response = await tasksApi.list({ ...filters, page })
      setTasks(response.data)
    } catch (error) {
      toast.error('Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await tasksApi.stats()
      setStats(response.data)
    } catch (error) {}
  }

  const fetchUsers = async () => {
    if (!isManagement) return
    try {
      const response = await usersApi.list()
      setUsers(response.data.data)
    } catch (error) {}
  }

  useEffect(() => {
    fetchTasks()
    fetchStats()
  }, [filters])

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleCreate = () => {
    setSelectedTask(undefined)
    setIsModalOpen(true)
  }

  const handleEdit = (task: Task) => {
    setSelectedTask(task)
    setIsModalOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this task?')) return
    try {
      await tasksApi.delete(id)
      toast.success('Task deleted')
      fetchTasks()
      fetchStats()
    } catch (error) {
      toast.error('Failed to delete task')
    }
  }

  const handleQuickStatus = async (task: Task, newStatus: string) => {
    try {
      await tasksApi.reportProgress(task.id, { 
        status: newStatus, 
        progress: newStatus === 'completed' ? 100 : task.progress,
        comment: `Quick update: Moved to ${newStatus.replace('_', ' ')}`
      })
      toast.success(`Task ${newStatus.replace('_', ' ')}`)
      fetchTasks()
      fetchStats()
    } catch (error) {
      toast.error('Failed to update task')
    }
  }

  const columns = [
    {
      header: 'Title',
      accessor: (task: Task) => (
        <div>
          <p className="font-medium text-slate-200">{task.title}</p>
          <p className="text-xs text-slate-400 truncate max-w-xs">{task.description}</p>
        </div>
      )
    },
    {
      header: 'Assigned To',
      priority: 3,
      accessor: (task: Task) => (
        <div className="flex items-center gap-2">
          {task.assignee ? (
            <>
              <img src={task.assignee.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(task.assignee.name)}`} 
                   className="h-6 w-6 rounded-full" alt="" />
              <span className="text-sm">{task.assignee.name}</span>
            </>
          ) : (
            <span className="text-sm text-slate-500 italic">Unassigned</span>
          )}
        </div>
      )
    },
    {
      header: 'Priority',
      priority: 2,
      accessor: (task: Task) => (
        <span className={clsx(
          'px-2 py-1 rounded-full text-xs font-medium uppercase tracking-wider',
          {
            'bg-slate-700 text-slate-300': task.priority === 'low',
            'bg-blue-900/40 text-blue-400': task.priority === 'medium',
            'bg-orange-900/40 text-orange-400': task.priority === 'high',
            'bg-red-900/40 text-red-400': task.priority === 'urgent',
          }
        )}>
          {task.priority}
        </span>
      )
    },
    {
      header: 'Status',
      priority: 2,
      accessor: (task: Task) => (
        <div className="flex flex-col gap-1">
          <span className={clsx(
            'px-2 py-1 rounded-full text-xs font-medium uppercase tracking-wider w-fit',
            {
              'bg-slate-800 text-slate-400': task.status === 'pending',
              'bg-blue-800/40 text-blue-300': task.status === 'in_progress',
              'bg-emerald-800/40 text-emerald-300': task.status === 'completed',
              'bg-red-800/40 text-red-300': task.status === 'overdue',
              'bg-slate-900 text-slate-600': task.status === 'cancelled',
            }
          )}>
            {task.status.replace('_', ' ')}
          </span>
          {task.status === 'in_progress' && (
            <div className="w-24 bg-slate-800 rounded-full h-1.5 mt-1 overflow-hidden">
              <div className="bg-blue-500 h-full" style={{ width: `${task.progress}%` }} />
            </div>
          )}
        </div>
      )
    },
    {
      header: 'Due Date',
      priority: 3,
      accessor: (task: Task) => (
        <div className="flex items-center gap-1.5 text-sm text-slate-300">
          <Calendar size={14} className="text-slate-500" />
          {task.due_date ? format(new Date(task.due_date), 'MMM d, yyyy') : 'No due date'}
        </div>
      )
    },
    {
      header: 'Actions',
      accessor: (task: Task) => (
        <div className="flex items-center gap-2">
          {task.status === 'pending' && task?.assigned_to === user?.id && (
            <button 
              onClick={(e) => { e.stopPropagation(); handleQuickStatus(task, 'in_progress'); }} 
              className="p-1.5 rounded-lg bg-blue-900/20 text-blue-400 hover:bg-blue-900/40 transition-colors"
              title="Start Task"
            >
              <Play size={16} />
            </button>
          )}
          {task.status !== 'completed' && task?.assigned_to === user?.id && (
            <button 
              onClick={(e) => { e.stopPropagation(); handleQuickStatus(task, 'completed'); }} 
              className="p-1.5 rounded-lg bg-emerald-900/20 text-emerald-400 hover:bg-emerald-900/40 transition-colors"
              title="Mark as Accomplished"
            >
              <CheckCircle2 size={16} />
            </button>
          )}
          <button onClick={() => handleEdit(task)} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-blue-400 transition-colors">
            <Edit2 size={16} />
          </button>
          {isManagement && (
            <button onClick={() => handleDelete(task.id)} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-red-400 transition-colors">
              <Trash2 size={16} />
            </button>
          )}
        </div>
      )
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Task Management</h1>
          <p className="text-slate-400">Assign, track, and monitor staff duties</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => { fetchTasks(); fetchStats(); }} 
            className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Refresh Tasks"
          >
            <RefreshCw size={18} className={clsx(loading && 'animate-spin')} />
          </button>
          <div className="flex bg-slate-800 p-1 rounded-lg">
            <button 
              onClick={() => setViewMode('list')}
              className={clsx('p-1.5 rounded-md transition-all', viewMode === 'list' ? 'bg-slate-700 text-blue-400 shadow-sm' : 'text-slate-400 hover:text-slate-200')}
            >
              <ListIcon size={18} />
            </button>
            <button 
              onClick={() => setViewMode('board')}
              className={clsx('p-1.5 rounded-md transition-all', viewMode === 'board' ? 'bg-slate-700 text-blue-400 shadow-sm' : 'text-slate-400 hover:text-slate-200')}
            >
              <LayoutGrid size={18} />
            </button>
          </div>
          {isManagement && (
            <button onClick={handleCreate} className="btn-primary flex items-center gap-2">
              <Plus size={18} />
              Create Task
            </button>
          )}
        </div>
      </div>

      {isManagement && stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="kpi-card bg-gradient-to-br from-slate-900 to-slate-800 border-blue-500/20">
            <div className="flex items-center justify-between">
              <span className="kpi-label">Productivity Score</span>
              <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400"><TrendingUp size={20} /></div>
            </div>
            <div className="flex items-end gap-2 mt-2">
              <span className="kpi-value text-blue-400">{stats.productivity_score}%</span>
              <span className="text-[10px] text-blue-500/60 font-bold mb-1 uppercase tracking-wider">Target: 85%+</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 mt-3 overflow-hidden">
              <div className="bg-blue-500 h-full" style={{ width: `${stats.productivity_score}%` }} />
            </div>
          </div>

          <div className="kpi-card">
            <div className="flex items-center justify-between">
              <span className="kpi-label">Active Tasks</span>
              <p className="p-2 bg-orange-500/10 rounded-lg text-orange-400"><Target size={20} /></p>
            </div>
            <span className="kpi-value mt-2">{stats.total - stats.completed}</span>
            <span className="text-xs text-slate-500 mt-1">{stats.pending} pending, {stats.in_progress} in progress</span>
          </div>

          <div className="kpi-card">
            <div className="flex items-center justify-between">
              <span className="kpi-label">Completed</span>
              <p className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400"><CheckCircle size={20} /></p>
            </div>
            <span className="kpi-value mt-2">{stats.completed}</span>
            <span className="text-xs text-slate-500 mt-1">Across all assignees</span>
          </div>

          <div className="kpi-card border-red-500/20">
            <div className="flex items-center justify-between">
              <span className="kpi-label">At Risk / Overdue</span>
              <p className="p-2 bg-red-500/10 rounded-lg text-red-400"><AlertCircle size={20} /></p>
            </div>
            <span className="kpi-value mt-2 text-red-400">{stats.overdue}</span>
            <span className="text-xs text-slate-500 mt-1">Requires immediate attention</span>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4 bg-slate-900 p-4 border border-slate-700/50 rounded-xl">
        <div className="flex items-center gap-2 text-slate-400 text-sm mr-2">
          <Filter size={16} />
          <span>Filters:</span>
        </div>
        
        <select 
          value={filters.status}
          onChange={(e) => setFilters(f => ({ ...f, status: e.target.value }))}
          className="bg-slate-800 border-slate-700 text-slate-200 rounded-lg text-sm px-3 py-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="overdue">Overdue</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <select 
          value={filters.priority}
          onChange={(e) => setFilters(f => ({ ...f, priority: e.target.value }))}
          className="bg-slate-800 border-slate-700 text-slate-200 rounded-lg text-sm px-3 py-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        >
          <option value="">All Priorities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>

        {isManagement && (
          <select 
            value={filters.assigned_to}
            onChange={(e) => setFilters(f => ({ ...f, assigned_to: e.target.value }))}
            className="bg-slate-800 border-slate-700 text-slate-200 rounded-lg text-sm px-3 py-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          >
            <option value="">All Staff</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        )}
      </div>

      {loading && !tasks ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3].map(i => <div key={i} className="h-48 bg-slate-800/50 rounded-xl border border-slate-700/50" />)}
        </div>
      ) : !tasks || tasks.data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-slate-900/50 rounded-2xl border border-dashed border-slate-700">
          <div className="h-16 w-16 bg-slate-800 rounded-full flex items-center justify-center text-slate-500 mb-4 text-2xl font-bold">!</div>
          <h3 className="text-xl font-semibold text-slate-300">No tasks found</h3>
          <p className="text-slate-500 mt-2">Try adjusting your filters or create a new task</p>
        </div>
      ) : viewMode === 'list' ? (
        <DataTable 
          data={tasks} 
          columns={columns} 
          loading={loading}
          onPageChange={fetchTasks}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {tasks.data.map((task: Task) => (
            <div key={task.id} 
                 onClick={() => handleEdit(task)}
                 className="group glass-card p-5 hover:border-blue-500/50 transition-all cursor-pointer relative overflow-hidden">
              <div className={clsx(
                'absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 rounded-full blur-3xl opacity-10 transition-opacity group-hover:opacity-20',
                {
                  'bg-blue-500': task.priority === 'medium',
                  'bg-orange-500': task.priority === 'high',
                  'bg-red-500': task.priority === 'urgent',
                  'bg-emerald-500': task.status === 'completed',
                }
              )} />
              
              <div className="flex items-start justify-between mb-4">
                <span className={clsx(
                  'px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest',
                  {
                    'text-slate-400 bg-slate-800': task.status === 'pending',
                    'text-blue-400 bg-blue-900/30': task.status === 'in_progress',
                    'text-emerald-400 bg-emerald-900/30': task.status === 'completed',
                    'text-red-400 bg-red-900/30': task.status === 'overdue',
                  }
                )}>
                  {task.status.replace('_', ' ')}
                </span>
                <span className={clsx(
                  'text-[10px] font-bold uppercase tracking-widest',
                  {
                    'text-slate-500': task.priority === 'low',
                    'text-blue-500': task.priority === 'medium',
                    'text-orange-500': task.priority === 'high',
                    'text-red-500': task.priority === 'urgent',
                  }
                )}>
                  {task.priority}
                </span>
              </div>

              <h3 className="text-lg font-bold text-slate-100 mb-2 truncate group-hover:text-blue-400 transition-colors">{task.title}</h3>
              <p className="text-sm text-slate-400 line-clamp-2 mb-6 h-10">{task.description}</p>
              
              {task.status === 'in_progress' && (
                <div className="mb-4">
                  <div className="flex justify-between text-[10px] font-medium text-slate-500 mb-1">
                    <span>Progress</span>
                    <span>{task.progress}%</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-blue-500 h-full transition-all duration-500" style={{ width: `${task.progress}%` }} />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-slate-800/50 mt-auto">
                <div className="flex items-center gap-2">
                  <img src={task.assignee?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(task.assignee?.name || 'U')}`} 
                       className="h-6 w-6 rounded-full border border-slate-700" alt="" />
                  <span className="text-xs text-slate-400 truncate max-w-[80px]">{task.assignee?.name || 'Unassigned'}</span>
                </div>
                <div className="flex items-center gap-1">
                  {task.status === 'pending' && task.assigned_to === user?.id && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleQuickStatus(task, 'in_progress'); }} 
                      className="p-1.5 rounded-md bg-blue-900/20 text-blue-400 hover:bg-blue-900/40 transition-colors"
                    >
                      <Play size={12} />
                    </button>
                  )}
                  {task.status !== 'completed' && task.assigned_to === user?.id && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleQuickStatus(task, 'completed'); }} 
                      className="p-1.5 rounded-md bg-emerald-900/20 text-emerald-400 hover:bg-emerald-900/40 transition-colors"
                    >
                      <CheckCircle2 size={12} />
                    </button>
                  )}
                  <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium ml-1">
                    <Clock size={10} />
                    {task.due_date ? format(new Date(task.due_date), 'MMM d') : 'No due'}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <TaskModal 
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => {
            setIsModalOpen(false)
            fetchTasks()
          }}
          task={selectedTask}
          users={users}
          startInReportMode={selectedTask?.assigned_to === user?.id}
        />
      )}
    </div>
  )
}
