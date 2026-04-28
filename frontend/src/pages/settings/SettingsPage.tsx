import { useEffect, useState } from 'react'
import { settingsApi } from '../../services/api'
import { useSettingsStore, useAuthStore } from '../../store'
import { Settings, Save, Loader2, Palette, ToggleLeft, ToggleRight, Upload, DollarSign, Bell, FileText, MapPin, Phone, Mail, Globe, Hash, Briefcase, UserCircle, CreditCard, GitBranch, Layout, Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import SystemSettingsPage from './SystemSettingsPage'
import OfficeMapPicker from './OfficeMapPicker'

const modules = [
  { key: 'modules.analytics.enabled',       label: 'Analytics', desc: 'Dashboard analytics and charts' },
  { key: 'modules.approvals.enabled',       label: 'Approval Workflows', desc: 'Multi-level transaction approvals' },
  { key: 'modules.budgeting.enabled',       label: 'Budgeting', desc: 'Department budget management' },
  { key: 'modules.fraud_detection.enabled', label: 'Fraud Detection', desc: 'Automated fraud detection rules' },
  { key: 'modules.reporting.enabled',       label: 'Reporting', desc: 'Report generation and export' },
]

export default function SettingsPage() {
  const { settings, setSettings, isModuleEnabled } = useSettingsStore()
  const { user, tenant, setTenant } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [savingVisuals, setSavingVisuals] = useState(false)
  const [savingCurrency, setSavingCurrency] = useState(false)
  const [savingCompany, setSavingCompany] = useState(false)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  
  const isSystemAdmin = !user?.tenant_id && user?.permissions?.includes('manage-tenants')

  if (isSystemAdmin) {
    return <SystemSettingsPage />
  }

  // Company Profile State
  const [tenantName, setTenantName] = useState(tenant?.name || '')
  const [tenantEmail, setTenantEmail] = useState(tenant?.email || '')
  const [tenantPhone, setTenantPhone] = useState(tenant?.phone || '')
  const [tenantAddress, setTenantAddress] = useState(tenant?.address || '')
  
  // Visual Branding State
  const [primaryColor, setPrimaryColor] = useState(tenant?.primary_color || '#3B82F6')
  const [secondaryColor, setSecondaryColor] = useState(tenant?.secondary_color || '#0F172A')
  const [accentColor, setAccentColor] = useState(tenant?.accent_color || '#10B981')

  // Invoice-specific state
  const [invTin, setInvTin] = useState('')
  const [invReg, setInvReg] = useState('')
  const [invDealers, setInvDealers] = useState('')
  const [invSalesDirector, setInvSalesDirector] = useState('')
  const [invWebsite, setInvWebsite] = useState('')
  const [invCity, setInvCity] = useState('')
  const [invCountry, setInvCountry] = useState('')
  const [invDefaultTerms, setInvDefaultTerms] = useState('')

  // Enhanced Invoice Branding
  const [invTemplate, setInvTemplate] = useState('modern')
  const [invStyle, setInvStyle] = useState('light')
  const [invAccentColor, setInvAccentColor] = useState('#3B82F6')
  const [invAccounts, setInvAccounts] = useState<Array<{type: string, name: string, number: string}>>([])

  const [currencyDefault, setCurrencyDefault] = useState('USD')
  const [currencySymbol, setCurrencySymbol] = useState('$')

  useEffect(() => {
    settingsApi.all().then(res => {
      const data = res.data
      setSettings(data)
      
      if (data['currency.default']) setCurrencyDefault(data['currency.default'])
      if (data['currency.symbol']) setCurrencySymbol(data['currency.symbol'])

      setInvTin(data['invoice_tin'] || data['tin'] || '')
      setInvReg(data['invoice_reg_no'] || data['reg_no'] || '')
      setInvDealers(data['invoice_dealers'] || data['dealers'] || '')
      setInvSalesDirector(data['invoice_sales_director'] || data['sales_director'] || '')
      setInvWebsite(data['website'] || '')
      setInvCity(data['city'] || '')
      setInvCountry(data['country'] || '')
      setInvDefaultTerms(data['invoice_default_terms'] || '')

      setInvTemplate(data['invoice_template'] || 'modern')
      setInvStyle(data['invoice_style'] || 'light')
      setInvAccentColor(data['invoice_accent_color'] || '#3B82F6')
      
      const rawAccounts = data['invoice_accounts']
      if (Array.isArray(rawAccounts)) {
        setInvAccounts(rawAccounts)
      } else if (typeof rawAccounts === 'string') {
        try {
          const parsed = JSON.parse(rawAccounts)
          setInvAccounts(Array.isArray(parsed) ? parsed : [])
        } catch { setInvAccounts([]) }
      } else {
        setInvAccounts([])
      }

    }).catch(() => {}).finally(() => setLoading(false))

    if (tenant) {
      setTenantName(tenant.name)
      setTenantEmail(tenant.email || '')
      setTenantPhone(tenant.phone || '')
      setTenantAddress(tenant.address || '')
      setPrimaryColor(tenant.primary_color)
      setSecondaryColor(tenant.secondary_color)
      setAccentColor(tenant.accent_color)
    }
  }, [setSettings, tenant])

  const toggleModule = async (key: string, enabled: boolean) => {
    try {
      await settingsApi.set(key, !enabled, 'modules', 'boolean')
      const res = await settingsApi.all()
      setSettings(res.data)
      toast.success(`Module ${!enabled ? 'enabled' : 'disabled'}`)
    } catch { toast.error('Failed to update setting') }
  }

  const saveVisualBranding = async () => {
    setSavingVisuals(true)
    try {
      const formData = new FormData()
      formData.append('primary_color', primaryColor)
      formData.append('secondary_color', secondaryColor)
      formData.append('accent_color', accentColor)
      if (logoFile) formData.append('logo', logoFile)
      const res = await settingsApi.updateBranding(formData)
      if (tenant) setTenant({ ...tenant, ...res.data.branding })
      toast.success('Visual branding updated!')
    } catch { toast.error('Failed to save visuals') } finally { setSavingVisuals(false) }
  }

  const saveCompanyProfile = async () => {
    setSavingCompany(true)
    try {
      const formData = new FormData()
      formData.append('name', tenantName)
      formData.append('email', tenantEmail)
      formData.append('phone', tenantPhone)
      formData.append('address', tenantAddress)
      formData.append('invoice_template', invTemplate)
      formData.append('invoice_style', invStyle)
      formData.append('invoice_accent_color', invAccentColor)
      formData.append('invoice_accounts', JSON.stringify(invAccounts))

      const brandRes = await settingsApi.updateBranding(formData)
      if (tenant) setTenant({ ...tenant, ...brandRes.data.branding })

      const payload = [
        { key: 'invoice_tin', value: invTin, group: 'branding' },
        { key: 'invoice_reg_no', value: invReg, group: 'branding' },
        { key: 'invoice_dealers', value: invDealers, group: 'branding' },
        { key: 'invoice_sales_director', value: invSalesDirector, group: 'branding' },
        { key: 'invoice_default_terms', value: invDefaultTerms, group: 'branding' },
        { key: 'website', value: invWebsite, group: 'branding' },
        { key: 'city', value: invCity, group: 'branding' },
        { key: 'country', value: invCountry, group: 'branding' },
      ]
      await settingsApi.setBulk(payload)
      const res = await settingsApi.all()
      setSettings(res.data)
      toast.success('Company profile and invoice details updated!')
    } catch { toast.error('Failed to save company profile') } finally { setSavingCompany(false) }
  }

  const addAccount = () => setInvAccounts([...invAccounts, { type: 'Bank', name: '', number: '' }])
  const removeAccount = (idx: number) => setInvAccounts(invAccounts.filter((_, i) => i !== idx))
  const updateAccount = (idx: number, field: string, val: string) => {
    const newAccs = [...invAccounts]; (newAccs[idx] as any)[field] = val; setInvAccounts(newAccs)
  }

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-blue-500" size={28} /></div>

  return (
    <div className="space-y-6 max-w-5xl pb-10">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white uppercase tracking-tight">System Settings</h1>
          <p className="text-slate-400 text-sm">Configure modules, branding, and business profiles</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><Palette size={18} className="text-purple-400" /> Visual Identity</h2>
            <div className="space-y-4">
              <div>
                <label className="fmis-label">Company Logo</label>
                <div className="flex gap-4 items-center">
                  <label className="flex flex-col items-center justify-center flex-1 h-32 border border-dashed border-slate-700 rounded-lg cursor-pointer hover:border-blue-500/50 hover:bg-slate-800/50 transition-all">
                    <Upload size={20} className="text-slate-500 mb-1" />
                    <span className="text-[10px] text-slate-400 text-center px-2">{logoFile ? logoFile.name : 'Upload logo'}</span>
                    <input type="file" accept="image/*" className="hidden" onChange={e => setLogoFile(e.target.files?.[0] || null)} />
                  </label>
                  {(logoFile || tenant?.logo) && (
                    <div className="h-32 w-32 rounded-lg border border-slate-700 bg-slate-900/50 p-3 flex items-center justify-center overflow-hidden shrink-0">
                      <img src={logoFile ? URL.createObjectURL(logoFile) : tenant?.logo} alt="Logo" className="max-h-full max-w-full object-contain" />
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="fmis-label">Primary Color</label><div className="flex items-center gap-2"><input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="h-9 w-12 rounded cursor-pointer bg-transparent border-0" /><input type="text" value={primaryColor} readOnly className="fmis-input text-xs font-mono uppercase" /></div></div>
                <div><label className="fmis-label">Accent Color</label><div className="flex items-center gap-2"><input type="color" value={accentColor} onChange={e => setAccentColor(e.target.value)} className="h-9 w-12 rounded cursor-pointer bg-transparent border-0" /><input type="text" value={accentColor} readOnly className="fmis-input text-xs font-mono uppercase" /></div></div>
              </div>
              <button onClick={saveVisualBranding} disabled={savingVisuals} className="btn-primary w-full justify-center">{savingVisuals ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Visuals</button>
            </div>
          </div>

          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><Settings size={18} className="text-blue-400" /> Module Controls</h2>
            <div className="space-y-2">
              {modules.map(mod => {
                const enabled = isModuleEnabled(mod.key.replace('modules.', '').replace('.enabled', ''))
                return (
                  <div key={mod.key} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30 border border-slate-700/50 hover:bg-slate-800/50 transition-colors">
                    <div><p className="text-slate-200 font-medium text-sm">{mod.label}</p><p className="text-slate-500 text-[10px]">{mod.desc}</p></div>
                    <button onClick={() => toggleModule(mod.key, enabled)} className={clsx('transition-colors', enabled ? 'text-blue-400' : 'text-slate-600')}>{enabled ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}</button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><Briefcase size={18} className="text-emerald-400" /> Organization Profile</h2>
            <div className="space-y-3">
              <div><label className="fmis-label">Organization Name</label><input value={tenantName} onChange={e => setTenantName(e.target.value)} className="fmis-input text-sm" placeholder="Legal Entity Name" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="fmis-label">TIN NO</label><input value={invTin} onChange={e => setInvTin(e.target.value.toUpperCase())} className="fmis-input text-sm" /></div>
                <div><label className="fmis-label">REG NO</label><input value={invReg} onChange={e => setInvReg(e.target.value.toUpperCase())} className="fmis-input text-sm" /></div>
              </div>
              <div><label className="fmis-label">Address</label><input value={tenantAddress} onChange={e => setTenantAddress(e.target.value)} className="fmis-input text-sm" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="fmis-label">Email</label><input value={tenantEmail} onChange={e => setTenantEmail(e.target.value)} className="fmis-input text-sm" /></div>
                <div><label className="fmis-label">Phone</label><input value={tenantPhone} onChange={e => setTenantPhone(e.target.value)} className="fmis-input text-sm" /></div>
              </div>
            </div>
          </div>

          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><FileText size={18} className="text-blue-400" /> Invoice Customization</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="fmis-label">Template</label><select value={invTemplate} onChange={e => setInvTemplate(e.target.value)} className="fmis-select"><option value="classic">Classic</option><option value="modern">Modern</option><option value="minimal">Minimal</option><option value="corporate">Corporate</option></select></div>
                <div><label className="fmis-label">Style</label><select value={invStyle} onChange={e => setInvStyle(e.target.value)} className="fmis-select"><option value="light">Light</option><option value="dark">Dark</option><option value="branded">Branded</option></select></div>
              </div>
              <div><label className="fmis-label">Invoice Accent Color</label><div className="flex items-center gap-2"><input type="color" value={invAccentColor} onChange={e => setInvAccentColor(e.target.value)} className="h-9 w-12 rounded cursor-pointer bg-transparent border-0" /><input type="text" value={invAccentColor} readOnly className="fmis-input text-xs font-mono uppercase" /></div></div>
              
              <div>
                <div className="flex items-center justify-between mb-2"><label className="fmis-label m-0">Payment Accounts</label><button onClick={addAccount} className="text-[10px] text-blue-400 flex items-center gap-1 hover:underline"><Plus size={12} /> Add Account</button></div>
                <div className="space-y-2">
                  {invAccounts.map((acc, i) => (
                    <div key={i} className="flex gap-2 items-center bg-slate-800/40 p-2 rounded border border-slate-700/50">
                      <select value={acc.type} onChange={e => updateAccount(i, 'type', e.target.value)} className="bg-transparent border-none text-[10px] text-slate-300 w-16 p-0 focus:ring-0"><option value="Bank">Bank</option><option value="Mobile">Mobile</option></select>
                      <input value={acc.name} onChange={e => updateAccount(i, 'name', e.target.value)} placeholder="Bank Name / Provider" className="flex-1 bg-transparent border-none text-[10px] text-white p-0 focus:ring-0" />
                      <input value={acc.number} onChange={e => updateAccount(i, 'number', e.target.value)} placeholder="Acc Number / Paybill" className="flex-1 bg-transparent border-none text-[10px] text-white p-0 focus:ring-0" />
                      <button onClick={() => removeAccount(i)} className="text-slate-500 hover:text-red-400"><Trash2 size={12} /></button>
                    </div>
                  ))}
                  {invAccounts.length === 0 && <p className="text-[10px] text-slate-500 italic">No accounts added. They will appear on your PDF invoices.</p>}
                </div>
              </div>

              <div><label className="fmis-label">Sales Director (for signature)</label><input value={invSalesDirector} onChange={e => setInvSalesDirector(e.target.value.toUpperCase())} className="fmis-input text-sm" /></div>
              <div><label className="fmis-label">Default Terms</label><textarea value={invDefaultTerms} onChange={e => setInvDefaultTerms(e.target.value)} rows={3} className="fmis-input text-[10px]" /></div>
              
              <button onClick={saveCompanyProfile} disabled={savingCompany} className="btn-primary w-full justify-center">{savingCompany ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Customization</button>
            </div>
          </div>
        </div>
      </div>
      <OfficeMapPicker />
    </div>
  )
}
