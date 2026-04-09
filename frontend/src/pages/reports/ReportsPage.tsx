import { useState } from 'react'
import { BarChart3, Download, Filter, Loader2, Calendar, PieChart, Wallet, Tag } from 'lucide-react'
import { reportsApi, categoriesApi, accountsApi } from '../../services/api'
import { toast } from 'react-hot-toast'
import { useEffect } from 'react'
import Modal from '../../components/Modal'
import { useCurrency } from '../../hooks/useCurrency'

interface ReportConfig {
  title: string;
  period: 'daily' | 'monthly' | 'yearly';
  fromDate: string;
  toDate: string;
  type: 'all' | 'income' | 'expense' | 'budget_vs_actual';
  format: 'pdf' | 'excel';
  categoryId?: string;
  accountId?: string;
  status?: string;
}

export default function ReportsPage() {
  const [fromDate, setFromDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0])
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0])
  const { formatCurrency } = useCurrency()
  const [type, setType] = useState('all')
  const [status, setStatus] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [accountId, setAccountId] = useState('')
  const [loading, setLoading] = useState<string | null>(null)
  const [configReport, setConfigReport] = useState<ReportConfig | null>(null)
  const [categories, setCategories] = useState<any[]>([])
  const [accounts, setAccounts] = useState<any[]>([])
  const [previewData, setPreviewData] = useState<any[]>([])
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [resCats, resAccounts] = await Promise.all([
          categoriesApi.list(),
          accountsApi.list()
        ])
        setCategories(resCats.data)
        setAccounts(resAccounts.data)
      } catch (err) {
        console.error('Failed to fetch filter data:', err)
      }
    }
    fetchData()
  }, [])

  const handlePreview = async () => {
    setIsPreviewLoading(true)
    try {
      const params = { from_date: fromDate, to_date: toDate, type, status, category_id: categoryId, account_id: accountId }
      const res = await reportsApi.preview(params)
      setPreviewData(res.data)
      toast.success(`Found ${res.data.length} transactions`)
    } catch (err) {
      console.error('Preview failed:', err)
      toast.error('Failed to load preview')
    } finally {
      setIsPreviewLoading(false)
    }
  }

  const handleExport = async (format: 'pdf' | 'excel', params?: any) => {
    const exportId = params?.id || `${format}-${params?.period || 'custom'}`
    setLoading(exportId)
    try {
      const exportParams = params || { from_date: fromDate, to_date: toDate, type, status, category_id: categoryId, account_id: accountId, format }
      const response = await reportsApi.export(exportParams)
      
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      const filename = `report_${exportParams.from_date || 'report'}.${format === 'excel' ? 'csv' : 'pdf'}`
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      link.remove()
      toast.success('Report exported successfully')
      if (configReport) setConfigReport(null)
    } catch (error) {
      console.error('Export failed:', error)
      toast.error('Failed to export report')
    } finally {
      setLoading(null)
    }
  }

  const openConfig = (r: { title: string, period: 'daily' | 'monthly' | 'yearly' }) => {
    const today = new Date()
    let from = today.toISOString().split('T')[0]
    let to = today.toISOString().split('T')[0]

    if (r.period === 'monthly') {
      from = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]
    } else if (r.period === 'yearly') {
      from = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0]
    }

    setConfigReport({
      title: r.title,
      period: r.period,
      fromDate: from,
      toDate: to,
      type: 'all',
      format: 'pdf',
      categoryId: '',
      accountId: '',
      status: ''
    })
  }

  const getQuickParams = (period: string) => {
    const today = new Date()
    let from = new Date()
    if (period === 'daily') {
      from = today
    } else if (period === 'monthly') {
      from = new Date(today.getFullYear(), today.getMonth(), 1)
    } else if (period === 'yearly') {
      from = new Date(today.getFullYear(), 0, 1)
    }
    
    return {
      from_date: from.toISOString().split('T')[0],
      to_date: today.toISOString().split('T')[0],
      type: 'all',
      format: 'pdf',
      period
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Reports</h1>
          <p className="text-slate-400 text-sm">Generate and export financial reports</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { title: 'Daily Summary', desc: 'Transactions summary for a specific day', period: 'daily' as const },
          { title: 'Monthly Report', desc: 'Comprehensive monthly financial overview', period: 'monthly' as const },
          { title: 'Annual Report', desc: 'Full year financial performance report', period: 'yearly' as const },
          { title: 'Budget vs Actual', desc: 'Compare planned budget with actual spending', period: 'monthly' as const, type: 'budget_vs_actual' },
        ].map(r => (
          <div key={r.title} className="glass-card p-6 space-y-3 hover:border-blue-500/30 transition-all">
            <div className="p-2.5 w-fit rounded-lg bg-blue-900/30">
              {r.title.includes('Budget') ? <PieChart size={20} className="text-blue-400" /> : <BarChart3 size={20} className="text-blue-400" />}
            </div>
            <div>
              <h3 className="font-semibold text-white">{r.title}</h3>
              <p className="text-sm text-slate-400 mt-1">{r.desc}</p>
            </div>
            <div className="flex gap-2 pt-1">
              <button 
                className="btn-secondary text-xs gap-1.5"
                onClick={() => openConfig(r as any)}
              >
                <Filter size={12} /> Configure
              </button>
              <button 
                className="btn-primary text-xs gap-1.5"
                disabled={loading === `pdf-${r.period}-${r.title}`}
                onClick={() => handleExport('pdf', { ...getQuickParams(r.period), type: (r as any).type || 'all', id: `pdf-${r.period}-${r.title}` })}
              >
                {loading === `pdf-${r.period}-${r.title}` ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                Export PDF
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar size={18} className="text-blue-400" />
          <h2 className="text-lg font-semibold text-white">Custom Report Range</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="fmis-label">From Date</label>
            <input 
              type="date" 
              className="fmis-input" 
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div>
            <label className="fmis-label">To Date</label>
            <input 
              type="date" 
              className="fmis-input" 
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
          <div>
            <label className="fmis-label">Type</label>
            <select 
              className="fmis-select"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="all">All Transactions</option>
              <option value="income">Income Only</option>
              <option value="expense">Expense Only</option>
              <option value="budget_vs_actual">Budget vs Actual</option>
            </select>
          </div>
          <div>
            <label className="fmis-label">Status</label>
            <select 
              className="fmis-select"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="under_review">Under Review</option>
              <option value="approved">Approved</option>
              <option value="posted">Posted</option>
            </select>
          </div>
          <div>
            <label className="fmis-label flex items-center gap-1"><Tag size={12} /> Category</label>
            <select 
              className="fmis-select"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="fmis-label flex items-center gap-1"><Wallet size={12} /> Account</label>
            <select 
              className="fmis-select"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
            >
              <option value="">All Accounts</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end gap-2 lg:col-span-2">
            <button 
              className="btn-secondary flex-1 gap-2"
              disabled={isPreviewLoading}
              onClick={handlePreview}
            >
              {isPreviewLoading ? <Loader2 size={15} className="animate-spin" /> : <BarChart3 size={15} />}
              Preview
            </button>
            <button 
              className="btn-primary flex-1 gap-2"
              disabled={loading === 'pdf-custom'}
              onClick={() => handleExport('pdf')}
            >
              {loading === 'pdf-custom' ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
              Export PDF
            </button>
            <button 
              className="btn-secondary flex-1 gap-2"
              disabled={loading === 'excel-custom'}
              onClick={() => handleExport('excel')}
            >
              {loading === 'excel-custom' ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
              CSV / Excel
            </button>
          </div>
        </div>

        {previewData.length > 0 && (
          <div className="mt-8 overflow-x-auto rounded-xl border border-slate-700/50">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-slate-800/50 text-slate-400">
                <tr>
                  <th className="px-6 py-4 font-medium">Date</th>
                  <th className="px-6 py-4 font-medium">Reference</th>
                  <th className="px-6 py-4 font-medium">Description</th>
                  <th className="px-6 py-4 font-medium">Category</th>
                  <th className="px-6 py-4 font-medium">Type</th>
                  <th className="px-6 py-4 font-medium">Amount</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30">
                {previewData.map((t) => (
                  <tr key={t.id} className="bg-slate-900/20 hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4 text-slate-300">{new Date(t.transaction_date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 font-mono text-blue-400">{t.reference}</td>
                    <td className="px-6 py-4 text-slate-300">{t.description || 'N/A'}</td>
                    <td className="px-6 py-4 text-slate-300">{t.category?.name || 'N/A'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                        t.type === 'income' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                      }`}>
                        {t.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-semibold text-white">
                      {formatCurrency(t.amount, t.currency)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-slate-400">{t.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal 
        isOpen={!!configReport} 
        onClose={() => setConfigReport(null)}
        title={`Configure ${configReport?.title}`}
      >
        {configReport && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="fmis-label">From Date</label>
                <input 
                  type="date" 
                  className="fmis-input" 
                  value={configReport.fromDate}
                  onChange={e => setConfigReport({...configReport, fromDate: e.target.value})}
                />
              </div>
              <div>
                <label className="fmis-label">To Date</label>
                <input 
                  type="date" 
                  className="fmis-input" 
                  value={configReport.toDate}
                  onChange={e => setConfigReport({...configReport, toDate: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="fmis-label">Transaction Type</label>
                <select 
                  className="fmis-select"
                  value={configReport.type}
                  onChange={e => setConfigReport({...configReport, type: e.target.value as any})}
                >
                  <option value="all">All Types</option>
                  <option value="income">Income Only</option>
                  <option value="expense">Expense Only</option>
                  <option value="budget_vs_actual">Budget vs Actual</option>
                </select>
              </div>
              <div>
                <label className="fmis-label">Status Filter</label>
                <select 
                  className="fmis-select"
                  value={configReport.status}
                  onChange={e => setConfigReport({...configReport, status: e.target.value})}
                >
                  <option value="">All Statuses</option>
                  <option value="draft">Draft</option>
                  <option value="submitted">Submitted</option>
                  <option value="under_review">Under Review</option>
                  <option value="approved">Approved</option>
                  <option value="posted">Posted</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="fmis-label flex items-center gap-1"><Tag size={12} /> Category</label>
                <select 
                  className="fmis-select"
                  value={configReport.categoryId}
                  onChange={e => setConfigReport({...configReport, categoryId: e.target.value})}
                >
                  <option value="">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="fmis-label flex items-center gap-1"><Wallet size={12} /> Account</label>
                <select 
                  className="fmis-select"
                  value={configReport.accountId}
                  onChange={e => setConfigReport({...configReport, accountId: e.target.value})}
                >
                  <option value="">All Accounts</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="fmis-label">File Format</label>
              <div className="flex gap-3">
                <button 
                  className={`flex-1 p-3 rounded-lg border-2 transition-all ${configReport.format === 'pdf' ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700 bg-slate-800'}`}
                  onClick={() => setConfigReport({...configReport, format: 'pdf'})}
                >
                  <div className="font-semibold text-white">PDF</div>
                  <div className="text-xs text-slate-400">Professional Report</div>
                </button>
                <button 
                  className={`flex-1 p-3 rounded-lg border-2 transition-all ${configReport.format === 'excel' ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700 bg-slate-800'}`}
                  onClick={() => setConfigReport({...configReport, format: 'excel'})}
                >
                  <div className="font-semibold text-white">Excel/CSV</div>
                  <div className="text-xs text-slate-400">Data Spreadsheet</div>
                </button>
              </div>
            </div>

            <div className="pt-4 flex gap-3">
              <button 
                className="btn-secondary flex-1"
                onClick={() => setConfigReport(null)}
              >
                Cancel
              </button>
              <button 
                className="btn-primary flex-1 gap-2"
                disabled={!!loading}
                onClick={() => handleExport(configReport.format, { 
                   from_date: configReport.fromDate, 
                   to_date: configReport.toDate, 
                   type: configReport.type, 
                   format: configReport.format,
                   status: configReport.status,
                   category_id: configReport.categoryId,
                   account_id: configReport.accountId,
                   id: 'config-export'
                })}
              >
                {loading === 'config-export' ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                Generate Report
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
