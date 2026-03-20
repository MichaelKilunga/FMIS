import { useState, useEffect } from 'react'
import { X, Send, CheckCircle2, AlertCircle, Clock, History, User as UserIcon, Calendar, Type, FileText, BarChart } from 'lucide-react'
import { tasksApi } from '../../services/api'
import type { Task, User } from '../../types'
import { useAuthStore } from '../../store'
import Modal from '../Modal'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import { format } from 'date-fns'

interface TaskModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  task?: Task
  users?: User[]
  startInReportMode?: boolean
}

export default function TaskModal({ isOpen, onClose, onSuccess, task, users = [], startInReportMode }: TaskModalProps) {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState<'details' | 'history' | 'progress'>(startInReportMode ? 'progress' : 'details')
  const [fullTask, setFullTask] = useState<Task | null>(null)
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assigned_to: '',
    priority: 'medium',
    due_date: '',
    recurrence: 'none'
  })

  const [progressData, setProgressData] = useState({
    progress: 0,
    comment: '',
    status: ''
  })

  const isManagement = user?.roles.some(r => ['director', 'manager', 'tenant-admin'].includes(r))
  const isAssignee = task?.assigned_to === user?.id
  const canEdit = isManagement
  const canReport = isAssignee || isManagement

  const filteredUsers = users.filter(u => {
    if (!user) return false
    // Always show the current assignee if editing
    if (task?.assigned_to === u.id) return true
    
    const myLevel = user.seniority_level || 0
    const targetLevel = u.seniority_level || 0
    
    return targetLevel <= myLevel
  })

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title,
        description: task.description || '',
        assigned_to: task.assigned_to?.toString() || '',
        priority: task.priority,
        due_date: task.due_date ? task.due_date.substring(0, 16) : '',
        recurrence: task.recurrence || 'none'
      })
      setProgressData({
        progress: task.progress,
        comment: '',
        status: task.status
      })
      fetchFullTask(task.id)
    } else {
      setFormData({
        title: '',
        description: '',
        assigned_to: '',
        priority: 'medium',
        due_date: '',
        recurrence: 'none'
      })
      setFullTask(null)
      setActiveTab('details')
    }
  }, [task])

  const fetchFullTask = async (id: number) => {
    try {
      const response = await tasksApi.get(id)
      setFullTask(response.data)
    } catch (error) {}
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      if (task) {
        await tasksApi.update(task.id, formData)
        toast.success('Task updated')
      } else {
        await tasksApi.create(formData)
        toast.success('Task created')
      }
      onSuccess()
    } catch (error) {
      toast.error('Failed to save task')
    } finally {
      setSubmitting(false)
    }
  }

  const handleReportProgress = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!task) return
    setSubmitting(true)
    try {
      await tasksApi.reportProgress(task.id, progressData)
      toast.success('Progress reported')
      onSuccess()
    } catch (error) {
      toast.error('Failed to report progress')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={task ? 'Edit Task' : 'New Task'}>
      <div className="flex flex-col min-h-[400px] max-h-[80vh] w-full max-w-2xl mx-auto">
        {task && (
          <div className="flex border-b border-slate-700/50 mb-4">
            <button 
              onClick={() => setActiveTab('details')}
              className={clsx('px-4 py-2 text-sm font-medium transition-colors border-b-2', activeTab === 'details' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200')}
            >
              Details
            </button>
            <button 
              onClick={() => setActiveTab('progress')}
              className={clsx('px-4 py-2 text-sm font-medium transition-colors border-b-2', activeTab === 'progress' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200')}
            >
              Update Progress
            </button>
            <button 
              onClick={() => setActiveTab('history')}
              className={clsx('px-4 py-2 text-sm font-medium transition-colors border-b-2', activeTab === 'history' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200')}
            >
              History
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-1">
          {activeTab === 'details' && (
            <form id="task-form" onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="label">Task Title</label>
                  <div className="relative">
                    <Type className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input 
                      required
                      type="text" 
                      className="fmis-input pl-10" 
                      placeholder="e.g. Monthly financial report"
                      value={formData.title}
                      onChange={e => setFormData(d => ({ ...d, title: e.target.value }))}
                      disabled={!canEdit}
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="label">Description</label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-3 text-slate-500" size={18} />
                    <textarea 
                      className="fmis-input pl-10 h-32 py-2" 
                      placeholder="Briefly describe the task..."
                      value={formData.description}
                      onChange={e => setFormData(d => ({ ...d, description: e.target.value }))}
                      disabled={!canEdit}
                    />
                  </div>
                </div>

                <div>
                  <label className="label">Assigned To</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <select 
                      className="fmis-select pl-10"
                      value={formData.assigned_to}
                      onChange={e => setFormData(d => ({ ...d, assigned_to: e.target.value }))}
                      disabled={!canEdit}
                    >
                      <option value="" className="bg-slate-900">Unassigned</option>
                      {filteredUsers.map(u => (
                        <option key={u.id} value={u.id} className="bg-slate-900">{u.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="label">Priority</label>
                  <div className="relative">
                    <BarChart className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <select 
                      className="fmis-select pl-10"
                      value={formData.priority}
                      onChange={e => setFormData(d => ({ ...d, priority: e.target.value as any }))}
                      disabled={!canEdit}
                    >
                      <option value="low" className="bg-slate-900">Low</option>
                      <option value="medium" className="bg-slate-900">Medium</option>
                      <option value="high" className="bg-slate-900">High</option>
                      <option value="urgent" className="bg-slate-900">Urgent</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="label">Due Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input 
                      type="datetime-local" 
                      className="fmis-input pl-10" 
                      value={formData.due_date}
                      onChange={e => setFormData(d => ({ ...d, due_date: e.target.value }))}
                      disabled={!canEdit}
                    />
                  </div>
                </div>

                <div>
                  <label className="label">Recurrence</label>
                  <div className="relative">
                    <History className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <select 
                      className="fmis-select pl-10"
                      value={formData.recurrence}
                      onChange={e => setFormData(d => ({ ...d, recurrence: e.target.value as any }))}
                      disabled={!canEdit}
                    >
                      <option value="none" className="bg-slate-900">One-time</option>
                      <option value="daily" className="bg-slate-900">Daily</option>
                      <option value="weekly" className="bg-slate-900">Weekly</option>
                      <option value="monthly" className="bg-slate-900">Monthly</option>
                    </select>
                  </div>
                </div>
              </div>
            </form>
          )}

          {activeTab === 'progress' && (
            <form id="progress-form" onSubmit={handleReportProgress} className="space-y-6">
              <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50">
                <div className="flex items-center justify-between mb-4">
                  <label className="label !mb-0">Overall Progress</label>
                  <span className="text-2xl font-bold text-blue-400">{progressData.progress}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  step="5"
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  value={progressData.progress}
                  onChange={e => setProgressData(d => ({ ...d, progress: parseInt(e.target.value) }))}
                  disabled={!canReport}
                />
                <div className="flex justify-between mt-2 text-[10px] text-slate-500 font-medium tracking-wider uppercase">
                  <span>Start</span>
                  <span>50%</span>
                  <span>Complete</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="label">Status</label>
                  <select 
                    className="fmis-select"
                    value={progressData.status}
                    onChange={e => setProgressData(d => ({ ...d, status: e.target.value }))}
                    disabled={!canReport}
                  >
                    <option value="pending" className="bg-slate-900">Pending</option>
                    <option value="in_progress" className="bg-slate-900">In Progress</option>
                    <option value="completed" className="bg-slate-900">Completed</option>
                    <option value="cancelled" className="bg-slate-900">Cancelled</option>
                  </select>
                </div>
                
                {progressData.status !== 'completed' && (
                  <div className="md:col-span-2 flex justify-end">
                    <button 
                      type="button"
                      onClick={() => setProgressData(d => ({ ...d, status: 'completed', progress: 100 }))}
                      className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors"
                    >
                      <CheckCircle2 size={14} />
                      Set as Finished
                    </button>
                  </div>
                )}
                <div className="md:col-span-2">
                  <label className="label">Progress Comment</label>
                  <textarea 
                    className="fmis-input h-24 py-2" 
                    placeholder="What has been done? Any obstacles?"
                    value={progressData.comment}
                    onChange={e => setProgressData(d => ({ ...d, comment: e.target.value }))}
                    disabled={!canReport}
                    required
                  />
                </div>
              </div>
            </form>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4">
              {fullTask?.histories?.length ? (
                <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
                  {fullTask.histories.map((log, i) => (
                    <div key={log.id} className="relative">
                      <div className="absolute -left-6 top-1.5 h-3 w-3 rounded-full bg-slate-700 border-2 border-slate-900" />
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-sm font-bold text-slate-200">{log.user?.name}</span>
                        <span className="text-[10px] text-slate-500 font-medium">
                          {format(new Date(log.created_at), 'MMM d, p')}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400">
                        {log.action === 'status_change' && (
                          <span>Changed status from <b className="text-slate-300">{log.old_value}</b> to <b className="text-blue-400">{log.new_value}</b></span>
                        )}
                        {log.action === 'progress_update' && (
                          <span>Updated progress from <b className="text-slate-300">{log.old_value}%</b> to <b className="text-blue-400">{log.new_value}%</b></span>
                        )}
                        {log.action === 'created' && <span>Created the task</span>}
                      </div>
                      {log.comment && (
                        <div className="mt-2 text-xs italic text-slate-500 bg-slate-800/30 p-2 rounded-lg border border-slate-700/30">
                          "{log.comment}"
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10">
                  <Clock className="mx-auto text-slate-700 mb-2" size={32} />
                  <p className="text-slate-500">No history available for this task</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-6 mt-4 border-t border-slate-700/50">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          {activeTab === 'details' && canEdit && (
            <button 
              form="task-form"
              type="submit" 
              className="btn-primary flex items-center gap-2"
              disabled={submitting}
            >
              {submitting ? 'Saving...' : (task ? 'Update Task' : 'Create Task')}
              {!submitting && <Send size={16} />}
            </button>
          )}
          {activeTab === 'progress' && canReport && (
            <button 
              form="progress-form"
              type="submit" 
              className="btn-primary flex items-center gap-2"
              disabled={submitting}
            >
              {submitting ? 'Reporting...' : 'Save Progress'}
              {!submitting && <CheckCircle2 size={16} />}
            </button>
          )}
        </div>
      </div>
    </Modal>
  )
}
