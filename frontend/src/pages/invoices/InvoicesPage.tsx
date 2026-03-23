import { useEffect, useState } from 'react'
import { invoicesApi, clientsApi } from '../../services/api'
import type { Invoice, PaginatedResponse, Client } from '../../types'
import { Plus, Download, Send, FileText, Loader2, Trash2, X, CheckCircle } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import Modal from '../../components/Modal'
import { useForm, useFieldArray } from 'react-hook-form'
import { useSettingsStore, useAuthStore } from '../../store'
import DataTable from '../../components/DataTable'

const statusBadge: Record<string, string> = {
  draft: 'badge-draft', sent: 'badge-submitted', paid: 'badge-approved',
  overdue: 'badge-rejected', cancelled: 'badge-under_review',
}

interface InvoiceFormItem {
  description: string
  quantity: number
  unit: string
  unit_price: number
}

interface InvoiceFormData {
  client_id?: number
  client_name: string
  client_email?: string
  client_phone?: string
  client_address?: string
  issue_date: string
  due_date?: string
  currency: string
  tax_rate?: number
  discount?: number
  notes?: string
  terms?: string
  items: InvoiceFormItem[]
}

export default function InvoicesPage() {
  const { user } = useAuthStore()
  const { settings } = useSettingsStore()

  const [clients, setClients] = useState<Client[]>([])
  
  const defaultCurrency = (settings['currency.default'] as string) || 'TZS'
  const multiEnabled = settings['currency.multi_enabled'] === 'true'
  const manualRatesStr = (settings['currency.manual_rates'] as string) || '{}'

  let availableCurrencies: string[] = [defaultCurrency]
  if (multiEnabled) {
    try {
      const rates = JSON.parse(manualRatesStr)
      const codes = Object.keys(rates)
      availableCurrencies = Array.from(new Set([defaultCurrency, ...codes])) as string[]
    } catch {
      // JSON format error
    }
  }

  const [data, setData] = useState<PaginatedResponse<Invoice> | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [isSubmittingForm, setIsSubmittingForm] = useState(false)

  const today = new Date().toISOString().split('T')[0]

  const { register, handleSubmit: handleFormSubmit, reset, control, watch, setValue } = useForm<InvoiceFormData>({
    defaultValues: {
      currency: defaultCurrency,
      issue_date: today,
      tax_rate: 0,
      discount: 0,
      terms: 'Payment For: services rendered\nContact: Sales\nPhone: +255 (0) 796 725 725',
      items: [{ description: '', quantity: 1, unit: '', unit_price: 0 }],
    }
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })

  const watchedItems = watch('items')
  const watchedTaxRate = watch('tax_rate') || 0
  const watchedDiscount = watch('discount') || 0
  const watchedCurrency = watch('currency')

  const subtotal = watchedItems.reduce((sum, item) => {
    return sum + (Number(item.quantity) || 0) * (Number(item.unit_price) || 0)
  }, 0)
  const taxAmount = subtotal * (Number(watchedTaxRate) / 100)
  const total = Math.max(0, subtotal - Number(watchedDiscount) + taxAmount)

  const [currentPage, setCurrentPage] = useState(1)

  const load = async (page = 1) => {
    setLoading(true)
    try { 
      const res = await invoicesApi.list({ page })
      setData(res.data)
      setCurrentPage(page)

      // Also load clients for the form
      const cRes = await clientsApi.list({ per_page: 100 })
      setClients(Array.isArray(cRes.data?.data) ? cRes.data.data : [])
    }
    catch { toast.error('Failed to load data') } finally { setLoading(false) }
  }

  useEffect(() => { load(1) }, [])

  const onClientSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const cid = Number(e.target.value)
    if (!cid) {
      setValue('client_id', undefined)
      setValue('client_name', '')
      setValue('client_email', '')
      setValue('client_phone', '')
      setValue('client_address', '')
      return
    }
    const client = clients.find(c => c.id === cid)
    if (client) {
      setValue('client_id', client.id)
      setValue('client_name', client.name)
      setValue('client_email', client.email || '')
      setValue('client_phone', client.phone || '')
      setValue('client_address', client.address || '')
    }
  }

  const downloadPdf = async (id: number, number: string) => {
    try {
      const res = await invoicesApi.download(id)
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const a = document.createElement('a'); a.href = url; a.download = `${number}.pdf`; a.click()
      URL.revokeObjectURL(url)
    } catch { toast.error('PDF download failed') }
  }

  const sendInvoice = async (id: number) => {
    try { await invoicesApi.send(id); toast.success('Invoice marked as sent'); load(currentPage) }
    catch { toast.error('Failed to send') }
  }

  const markAsPaid = async (id: number) => {
    if (!confirm('Mark this invoice as paid? This will automatically create an income transaction for approval.')) return
    try {
      await invoicesApi.markAsPaid(id)
      toast.success('Invoice marked as paid')
      load(currentPage)
    } catch {
      toast.error('Failed to mark as paid')
    }
  }

  const onSubmitForm = async (formData: InvoiceFormData) => {
    setIsSubmittingForm(true)
    try {
      await invoicesApi.create({
        ...formData,
        tax_rate: Number(formData.tax_rate) || 0,
        discount: Number(formData.discount) || 0,
        items: formData.items.map(item => ({
          description: item.description,
          quantity: Number(item.quantity),
          unit: item.unit || null,
          unit_price: Number(item.unit_price),
        })),
      })
      toast.success('Invoice created successfully')
      setShowForm(false)
      reset()
      load(1)
    } catch (e: any) {
      const errors = e.response?.data?.errors
      if (errors) {
        const messages = Object.values(errors).flat().join('\n')
        toast.error(messages)
      } else {
        toast.error(e.response?.data?.message || 'Failed to create invoice')
      }
    } finally {
      setIsSubmittingForm(false)
    }
  }

  const fmt = (n: number | null | undefined, cur = 'TZS') => {
    if (n === null || n === undefined || isNaN(Number(n))) return '—'
    n = Number(n)
    const symbol = (settings['currency.symbol'] as string) || ''
    if (symbol) {
      return `${symbol} ${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2 }).format(n)}`
    }
    try {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: cur }).format(n)
    } catch {
      return `${cur} ${n.toLocaleString()}`
    }
  }

  const columns = [
    {
      header: 'Number',
      priority: 4,
      accessor: (inv: Invoice) => <span className="font-mono text-blue-400 text-xs">{inv.number}</span>
    },
    {
      header: 'Client',
      accessor: (inv: Invoice) => (
        <div className="max-w-[120px] md:max-w-none">
          <div className="font-medium text-slate-200 truncate">{inv.client_name}</div>
          {inv.client_email && <p className="text-[10px] text-slate-500 truncate hidden md:block">{inv.client_email}</p>}
        </div>
      )
    },
    {
      header: 'Amount',
      priority: 2,
      accessor: (inv: Invoice) => <span className="font-semibold text-slate-200">{fmt(inv.total, inv.currency)}</span>
    },
    {
      header: 'Issue Date',
      priority: 3,
      accessor: (inv: Invoice) => {
        try {
          return <span className="text-slate-400 text-xs">{inv.issue_date ? format(new Date(inv.issue_date), 'dd MMM yyyy') : '—'}</span>
        } catch {
          return <span className="text-slate-400 text-xs">—</span>
        }
      }
    },
    {
      header: 'Due Date',
      priority: 3,
      accessor: (inv: Invoice) => {
        try {
          return <span className="text-slate-400 text-xs">{inv.due_date ? format(new Date(inv.due_date), 'dd MMM yyyy') : '—'}</span>
        } catch {
          return <span className="text-slate-400 text-xs">—</span>
        }
      }
    },
    {
      header: 'Status',
      priority: 2,
      accessor: (inv: Invoice) => <span className={statusBadge[inv.status] || 'badge-draft'}>{inv.status}</span>
    },
    {
      header: 'Actions',
      accessor: (inv: Invoice) => (
        <div className="flex gap-1.5">
          <button onClick={() => downloadPdf(inv.id, inv.number)} title="Download PDF"
            className="p-1.5 rounded text-slate-400 hover:text-blue-400 hover:bg-blue-900/20 transition-colors">
            <Download size={14} />
          </button>
          {inv.status === 'draft' && (
            <button onClick={() => sendInvoice(inv.id)} title="Mark as sent"
              className="p-1.5 rounded text-slate-400 hover:text-emerald-400 hover:bg-emerald-900/20 transition-colors">
              <Send size={14} />
            </button>
          )}
          {inv.status !== 'paid' && user?.roles?.includes('tenant-admin') && (
            <button onClick={() => markAsPaid(inv.id)} title="Mark as Paid"
              className="p-1.5 rounded text-slate-400 hover:text-emerald-400 hover:bg-emerald-900/20 transition-colors">
              <CheckCircle size={14} />
            </button>
          )}
        </div>
      )
    }
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Invoices</h1>
          <p className="text-slate-400 text-sm">Manage and track all invoices</p>
        </div>
        {user?.roles?.includes('tenant-admin') && (
          <button onClick={() => setShowForm(true)} className="btn-primary">
            <Plus size={16} /> New Invoice
          </button>
        )}
      </div>

      <DataTable 
        columns={columns as any}
        data={data}
        loading={loading}
        onPageChange={load}
        emptyMessage="No invoices found"
      />

      {/* ── Create Invoice Modal ── */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="New Invoice">
        <form onSubmit={handleFormSubmit(onSubmitForm)} className="space-y-5 max-h-[80vh] overflow-y-auto pr-1">

          {/* Client Info */}
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Client Information</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="fmis-label">Select Existing Client (Optional)</label>
                <select onChange={onClientSelect} className="fmis-select mb-2">
                  <option value="">-- New Client --</option>
                  {(clients || []).filter(Boolean).map(c => <option key={c.id} value={c.id}>{c.name} {c.email ? `(${c.email})` : ''}</option>)}
                </select>
                
                <label className="fmis-label">Client / Company Name <span className="text-red-400">*</span></label>
                <input {...register('client_name', { required: 'Client name is required' })} className="fmis-input" placeholder="e.g. MR GARSON JAMES" />
              </div>
              <div>
                <label className="fmis-label">Phone</label>
                <input {...register('client_phone')} className="fmis-input" placeholder="+255 6XX XXX XXX" />
              </div>
              <div>
                <label className="fmis-label">Email</label>
                <input type="email" {...register('client_email')} className="fmis-input" placeholder="email@example.com" />
              </div>
              <div className="col-span-2">
                <label className="fmis-label">Address</label>
                <input {...register('client_address')} className="fmis-input" placeholder="City, Region, Country" />
              </div>
            </div>
          </div>

          {/* Dates & Currency */}
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Invoice Details</h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="fmis-label">Issue Date <span className="text-red-400">*</span></label>
                <input type="date" {...register('issue_date', { required: 'Issue date is required' })} className="fmis-input" />
              </div>
              <div>
                <label className="fmis-label">Due Date</label>
                <input type="date" {...register('due_date')} className="fmis-input" />
              </div>
              <div>
                <label className="fmis-label">Currency</label>
                <select {...register('currency')} className="fmis-select">
                  {availableCurrencies.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Line Items <span className="text-red-400">*</span></h3>
              <button type="button"
                onClick={() => append({ description: '', quantity: 1, unit: '', unit_price: 0 })}
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                <Plus size={12} /> Add Item
              </button>
            </div>
            <div className="space-y-2">
              {fields.map((field, idx) => (
                <div key={field.id} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-5">
                    {idx === 0 && <label className="fmis-label text-xs">Description</label>}
                    <input {...register(`items.${idx}.description`, { required: true })}
                      className="fmis-input text-sm" placeholder="Item description" />
                  </div>
                  <div className="col-span-2">
                    {idx === 0 && <label className="fmis-label text-xs">Qty</label>}
                    <input type="number" step="0.01" min="0.01"
                      {...register(`items.${idx}.quantity`, { required: true, min: 0.01 })}
                      className="fmis-input text-sm" placeholder="1" />
                  </div>
                  <div className="col-span-2">
                    {idx === 0 && <label className="fmis-label text-xs">Unit</label>}
                    <input {...register(`items.${idx}.unit`)}
                      className="fmis-input text-sm" placeholder="pcs" />
                  </div>
                  <div className="col-span-2">
                    {idx === 0 && <label className="fmis-label text-xs">Unit Price</label>}
                    <input type="number" step="0.01" min="0"
                      {...register(`items.${idx}.unit_price`, { required: true, min: 0 })}
                      className="fmis-input text-sm" placeholder="0.00" />
                  </div>
                  <div className="col-span-1 flex justify-end">
                    {idx === 0 && <div className="fmis-label text-xs opacity-0">X</div>}
                    {fields.length > 1 && (
                      <button type="button" onClick={() => remove(idx)}
                        className="p-1.5 rounded text-slate-500 hover:text-red-400 hover:bg-red-900/20 transition-colors">
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Taxes & Discount */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="fmis-label">Tax Rate (%)</label>
              <input type="number" step="0.01" min="0" max="100" {...register('tax_rate')} className="fmis-input" placeholder="0" />
            </div>
            <div>
              <label className="fmis-label">Discount ({watchedCurrency})</label>
              <input type="number" step="0.01" min="0" {...register('discount')} className="fmis-input" placeholder="0.00" />
            </div>
          </div>

          {/* Live Totals Preview */}
          <div className="bg-slate-800/50 rounded-lg p-3 space-y-1 text-sm">
            <div className="flex justify-between text-slate-400">
              <span>Subtotal</span><span>{watchedCurrency} {subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            {Number(watchedDiscount) > 0 && (
              <div className="flex justify-between text-slate-400">
                <span>Discount</span><span>- {watchedCurrency} {Number(watchedDiscount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            {Number(watchedTaxRate) > 0 && (
              <div className="flex justify-between text-slate-400">
                <span>Tax ({watchedTaxRate}%)</span><span>{watchedCurrency} {taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-white border-t border-slate-600 pt-2 mt-1">
              <span>Total</span><span>{watchedCurrency} {total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          {/* Notes & Terms */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="fmis-label">Notes</label>
              <textarea {...register('notes')} rows={3} className="fmis-input" placeholder="Additional notes..." />
            </div>
            <div>
              <label className="fmis-label">Terms & Conditions</label>
              <textarea {...register('terms')} rows={3} className="fmis-input" placeholder="Payment terms..." />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-700/50">
            <button type="button" onClick={() => { setShowForm(false); reset() }} className="btn-ghost">Cancel</button>
            <button type="submit" disabled={isSubmittingForm} className="btn-primary">
              {isSubmittingForm ? <Loader2 size={16} className="animate-spin" /> : 'Create Invoice'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
