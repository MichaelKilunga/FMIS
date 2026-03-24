import { useEffect, useState } from 'react'
import { workflowsApi } from '../../services/api'
import type { ApprovalWorkflow } from '../../types'
import { GitBranch, Plus, Trash2, Loader2, ArrowRight, Settings } from 'lucide-react'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import Modal from '../../components/Modal'
import { useForm } from 'react-hook-form'

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<ApprovalWorkflow[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [isSubmittingForm, setIsSubmittingForm] = useState(false)
  const [selectedWorkflow, setSelectedWorkflow] = useState<ApprovalWorkflow | null>(null)
  const [steps, setSteps] = useState<any[]>([{ step_order: 1, role_name: 'director' }])

  const { register, handleSubmit: handleFormSubmit, reset, setValue } = useForm<{
    name: string; module: string;
  }>({
    defaultValues: { module: 'transaction' }
  })

  const load = () => {
    setLoading(true)
    workflowsApi.list().then(res => setWorkflows(res.data)).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleOpenForm = (workflow: ApprovalWorkflow | null = null) => {
    setSelectedWorkflow(workflow)
    if (workflow) {
      setValue('name', workflow.name)
      setValue('module', workflow.module)
      setSteps(workflow.steps.map(s => ({ 
        step_order: s.step_order, 
        role_name: s.role_name,
        threshold_min: s.threshold_min,
        threshold_max: s.threshold_max,
        require_all: s.require_all,
        sla_hours: s.sla_hours
      })))
    } else {
      reset({ name: '', module: 'transaction' })
      setSteps([{ step_order: 1, role_name: 'director' }])
    }
    setShowForm(true)
  }

  const handleAddStep = () => {
    setSteps([...steps, { step_order: steps.length + 1, role_name: 'admin' }])
  }

  const handleRemoveStep = (index: number) => {
    const newSteps = steps.filter((_, i) => i !== index)
    // Reorder step numbers
    setSteps(newSteps.map((s, i) => ({ ...s, step_order: i + 1 })))
  }

  const handleStepChange = (index: number, field: string, val: any) => {
    const newSteps = [...steps]
    newSteps[index] = { ...newSteps[index], [field]: val }
    setSteps(newSteps)
  }

  const onSubmitForm = async (formData: any) => {
    if (steps.length === 0) {
        toast.error('At least one step is required')
        return
    }

    setIsSubmittingForm(true)
    try {
      if (selectedWorkflow) {
        await workflowsApi.update(selectedWorkflow.id, { ...formData, steps })
        toast.success('Workflow updated successfully')
      } else {
        await workflowsApi.create({ ...formData, is_active: true, steps })
        toast.success('Workflow created successfully')
      }
      setShowForm(false)
      load()
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to save workflow')
    } finally {
      setIsSubmittingForm(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this workflow?')) return
    try {
      await workflowsApi.delete(id)
      toast.success('Workflow deleted')
      load()
    } catch {
      toast.error('Failed to delete workflow')
    }
  }

  const toggleActive = async (wf: ApprovalWorkflow) => {
    try {
      await workflowsApi.update(wf.id, { is_active: !wf.is_active })
      toast.success(`Workflow ${wf.is_active ? 'deactivated' : 'activated'}`)
      load()
    } catch {
      toast.error('Failed to update workflow status')
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Approval Workflows</h1>
          <p className="text-slate-400 text-sm">Configure multi-level approval rules</p>
        </div>
        <button onClick={() => handleOpenForm()} className="btn-primary">
          <Plus size={16} /> New Workflow
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-blue-500" size={28} /></div>
      ) : (
        <div className="space-y-3">
          {workflows.map(wf => (
            <div key={wf.id} className="glass-card p-5 group">
              <div className="flex items-start justify-between">
                <div className="flex gap-3">
                  <GitBranch size={20} className="text-blue-400 mt-0.5 shrink-0" />
                  <div>
                    <h3 className="font-semibold text-white">{wf.name}</h3>
                    <p className="text-sm text-slate-400 mt-0.5">Module: <span className="capitalize text-slate-300">{wf.module}</span> · {wf.steps.length} steps</p>
                    {wf.conditions && Object.keys(wf.conditions).length > 0 && (
                      <p className="text-xs text-slate-500 mt-1 font-mono">Conditions: {JSON.stringify(wf.conditions)}</p>
                    )}
                    <div className="flex gap-2 mt-3 flex-wrap">
                      {wf.steps.map((s, idx) => (
                        <div key={s.id || idx} className="flex flex-wrap items-center gap-1.5 bg-slate-800/80 px-2 py-1.5 rounded-md border border-slate-700">
                          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-900/50 text-blue-400 text-xs font-bold border border-blue-500/30">
                            {s.step_order}
                          </span>
                          <span className="text-sm text-slate-300 font-medium capitalize">{s.role_name}</span>
                          {idx < wf.steps.length - 1 && <ArrowRight size={14} className="text-slate-500 ml-1" />}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleOpenForm(wf)}
                    className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-400/10 rounded transition-all"
                    title="Edit Workflow"
                  >
                    <Settings size={16} />
                  </button>
                  <button 
                    onClick={() => handleDelete(wf.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-400/10 rounded transition-all"
                    title="Delete Workflow"
                  >
                    <Trash2 size={16} />
                  </button>
                  <button 
                    onClick={() => toggleActive(wf)}
                    className={clsx(
                      'text-xs px-2 py-0.5 rounded-full font-medium transition-colors hover:opacity-80',
                      wf.is_active ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-500/20' : 'bg-slate-700 text-slate-400 border border-slate-600'
                    )}>
                    {wf.is_active ? 'Active' : 'Inactive'}
                  </button>
                </div>
              </div>
            </div>
          ))}
          {workflows.length === 0 && (
            <div className="glass-card p-12 text-center text-slate-500">
              <GitBranch size={40} className="mx-auto mb-3 opacity-30" />
              No workflows configured. Create your first approval workflow.
            </div>
          )}
        </div>
      )}

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={selectedWorkflow ? "Edit Workflow" : "New Workflow"}>
        <form onSubmit={handleFormSubmit(onSubmitForm)} className="space-y-4">
          <div>
            <label className="fmis-label">Workflow Name</label>
            <input {...register('name', { required: true })} className="fmis-input" placeholder="e.g., Expense Approval" />
          </div>
          <div>
            <label className="fmis-label">Target Module</label>
            <select {...register('module')} className="fmis-select">
              <option value="transaction">Transactions</option>
              <option value="invoice">Invoices</option>
              <option value="budget">Budgets</option>
            </select>
          </div>
          
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
               <label className="fmis-label mb-0">Approval Steps</label>
               <button type="button" onClick={handleAddStep} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                 <Plus size={14} /> Add Step
               </button>
            </div>
            
            <div className="space-y-2">
               {steps.map((step, idx) => (
                 <div key={idx} className="flex items-center gap-2 bg-slate-800/50 p-2 rounded-lg border border-slate-700">
                    <div className="w-8 h-8 rounded-full bg-blue-900/30 font-bold text-blue-400 flex flex-shrink-0 items-center justify-center text-sm border border-blue-800/50">
                       {step.step_order}
                    </div>
                    <div className="flex-1">
                       <select
                         value={step.role_name}
                         onChange={(e) => handleStepChange(idx, 'role_name', e.target.value)}
                         className="fmis-select !py-1.5"
                         required
                       >
                         <option value="director">Director</option>
                         <option value="manager">Manager</option>
                         <option value="staff">Staff</option>
                         <option value="super-admin">Super Admin</option>
                       </select>
                    </div>
                    {steps.length > 1 && (
                      <button type="button" onClick={() => handleRemoveStep(idx)} className="p-1.5 text-rose-400 hover:bg-rose-400/10 rounded-md transition-colors">
                         <Trash2 size={16} />
                      </button>
                    )}
                 </div>
               ))}
               {steps.length === 0 && (
                 <p className="text-sm text-rose-400 text-center py-2">At least one step is required</p>
               )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-700/50">
            <button type="button" onClick={() => setShowForm(false)} className="btn-ghost">Cancel</button>
            <button type="submit" disabled={isSubmittingForm || steps.length === 0} className="btn-primary">
              {isSubmittingForm ? <Loader2 size={16} className="animate-spin" /> : (selectedWorkflow ? 'Update Workflow' : 'Create Workflow')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

