import { useEffect, useState } from 'react'
import { settingsApi } from '../../services/api'
import { useSettingsStore, useAuthStore } from '../../store'
import { Settings, Save, Loader2, Palette, ToggleLeft, ToggleRight, Upload, DollarSign, Bell, FileText, MapPin, Phone, Mail, Globe, Hash, Briefcase, UserCircle, CreditCard } from 'lucide-react'
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

  // Company Profile State (Maps to Tenants table)
  const [tenantName, setTenantName] = useState(tenant?.name || '')
  const [tenantEmail, setTenantEmail] = useState(tenant?.email || '')
  const [tenantPhone, setTenantPhone] = useState(tenant?.phone || '')
  const [tenantAddress, setTenantAddress] = useState(tenant?.address || '')
  
  // Visual Branding State (Maps to Tenants table)
  const [primaryColor, setPrimaryColor] = useState(tenant?.primary_color || '#3B82F6')
  const [secondaryColor, setSecondaryColor] = useState(tenant?.secondary_color || '#0F172A')
  const [accentColor, setAccentColor] = useState(tenant?.accent_color || '#10B981')

  // Invoice-specific state (Maps to Settings table)
  const [invTin, setInvTin] = useState('')
  const [invReg, setInvReg] = useState('')
  const [invDealers, setInvDealers] = useState('')
  const [invLipaName, setInvLipaName] = useState('')
  const [invLipaNumber, setInvLipaNumber] = useState('')
  const [invSalesDirector, setInvSalesDirector] = useState('')
  const [invWebsite, setInvWebsite] = useState('')
  const [invCity, setInvCity] = useState('')
  const [invCountry, setInvCountry] = useState('')
  const [invDefaultTerms, setInvDefaultTerms] = useState('')

  const [currencyDefault, setCurrencyDefault] = useState('USD')
  const [currencySymbol, setCurrencySymbol] = useState('$')
  const [multiCurrencyEnabled, setMultiCurrencyEnabled] = useState(false)
  const [ratesMode, setRatesMode] = useState('manual')
  const [manualRatesStr, setManualRatesStr] = useState('{\n  "EUR": 0.92,\n  "GBP": 0.78,\n  "TZS": 2550\n}')
  const [apiProvider, setApiProvider] = useState('openexchangerates')
  const [apiKey, setApiKey] = useState('')

  useEffect(() => {
    settingsApi.all().then(res => {
      const data = res.data
      setSettings(data)
      
      // Load currency settings
      if (data['currency.default']) setCurrencyDefault(data['currency.default'])
      if (data['currency.symbol']) setCurrencySymbol(data['currency.symbol'])
      if (data['currency.multi_enabled']) setMultiCurrencyEnabled(data['currency.multi_enabled'] === 'true')
      if (data['currency.rates_mode']) setRatesMode(data['currency.rates_mode'])
      if (data['currency.manual_rates']) setManualRatesStr(data['currency.manual_rates'])
      if (data['currency.api_provider']) setApiProvider(data['currency.api_provider'])
      if (data['currency.api_key']) setApiKey(data['currency.api_key'])

      // Load invoice specific settings
      setInvTin(data['invoice_tin'] || data['tin'] || '')
      setInvReg(data['invoice_reg_no'] || data['reg_no'] || '')
      setInvDealers(data['invoice_dealers'] || data['dealers'] || '')
      setInvLipaName(data['invoice_lipa_name'] || data['lipa_name'] || '')
      setInvLipaNumber(data['invoice_lipa_number'] || data['lipa_number'] || '')
      setInvSalesDirector(data['invoice_sales_director'] || data['sales_director'] || '')
      setInvWebsite(data['website'] || '')
      setInvCity(data['city'] || '')
      setInvCountry(data['country'] || '')
      setInvDefaultTerms(data['invoice_default_terms'] || '')

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
      
      if (tenant) {
        setTenant({ ...tenant, ...res.data.branding })
      }
      toast.success('Visual branding updated!')
    } catch { toast.error('Failed to save visuals') } finally { setSavingVisuals(false) }
  }

  const saveCompanyProfile = async () => {
    setSavingCompany(true)
    try {
      // 1. Update Core Tenant Info
      const formData = new FormData()
      formData.append('name', tenantName)
      formData.append('email', tenantEmail)
      formData.append('phone', tenantPhone)
      formData.append('address', tenantAddress)
      const brandRes = await settingsApi.updateBranding(formData)
      if (tenant) {
        setTenant({ ...tenant, ...brandRes.data.branding })
      }

      // 2. Update Extended settings
      const payload = [
        { key: 'invoice_tin', value: invTin, group: 'branding' },
        { key: 'invoice_reg_no', value: invReg, group: 'branding' },
        { key: 'invoice_dealers', value: invDealers, group: 'branding' },
        { key: 'invoice_lipa_name', value: invLipaName, group: 'branding' },
        { key: 'invoice_lipa_number', value: invLipaNumber, group: 'branding' },
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

  const saveCurrencySettings = async () => {
    setSavingCurrency(true)
    try {
      if (multiCurrencyEnabled && ratesMode === 'manual') {
        try { JSON.parse(manualRatesStr) } catch {
          toast.error('Invalid JSON formatting for manual rates.'); setSavingCurrency(false); return
        }
      }
      const payload = [
        { key: 'currency.default', value: currencyDefault, group: 'currency' },
        { key: 'currency.symbol', value: currencySymbol, group: 'currency' },
        { key: 'currency.multi_enabled', value: multiCurrencyEnabled ? 'true' : 'false', group: 'currency' },
        { key: 'currency.rates_mode', value: ratesMode, group: 'currency' },
        { key: 'currency.manual_rates', value: manualRatesStr, group: 'currency' },
        { key: 'currency.api_provider', value: apiProvider, group: 'currency' },
        { key: 'currency.api_key', value: apiKey, group: 'currency' }
      ]
      await settingsApi.setBulk(payload)
      const res = await settingsApi.all()
      setSettings(res.data)
      toast.success('Currency settings saved!')
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to save settings.')
    } finally { setSavingCurrency(false) }
  }

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-blue-500" size={28} /></div>

  return (
    <div className="space-y-6 max-w-5xl pb-10">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white uppercase tracking-tight">System Settings</h1>
          <p className="text-slate-400 text-sm">Configure modules, branding, and business profiles</p>
        </div>
        <div className="bg-blue-900/30 px-3 py-1 rounded text-[10px] font-bold text-blue-400 border border-blue-800/50 uppercase">
          {tenant?.plan} Plan
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Visuals & Modules */}
        <div className="space-y-6">
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Palette size={18} className="text-purple-400" /> Visual Identity
            </h2>
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
                <div>
                  <label className="fmis-label">Primary Color</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="h-9 w-12 rounded cursor-pointer bg-transparent border-0" />
                    <input type="text" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="fmis-input text-xs font-mono uppercase" maxLength={7} />
                  </div>
                </div>
                <div>
                  <label className="fmis-label">Accent Color</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={accentColor} onChange={e => setAccentColor(e.target.value)} className="h-9 w-12 rounded cursor-pointer bg-transparent border-0" />
                    <input type="text" value={accentColor} onChange={e => setAccentColor(e.target.value)} className="fmis-input text-xs font-mono uppercase" maxLength={7} />
                  </div>
                </div>
              </div>

              <button onClick={saveVisualBranding} disabled={savingVisuals} className="btn-primary w-full justify-center">
                {savingVisuals ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Visuals
              </button>
            </div>
          </div>

          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Settings size={18} className="text-blue-400" /> Module Controls
            </h2>
            <div className="space-y-2">
              {modules.map(mod => {
                const enabled = isModuleEnabled(mod.key.replace('modules.', '').replace('.enabled', ''))
                return (
                  <div key={mod.key} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30 border border-slate-700/50 hover:bg-slate-800/50 transition-colors">
                    <div>
                      <p className="text-slate-200 font-medium text-sm">{mod.label}</p>
                      <p className="text-slate-500 text-[10px]">{mod.desc}</p>
                    </div>
                    <button onClick={() => toggleModule(mod.key, enabled)}
                      className={clsx('transition-colors', enabled ? 'text-blue-400' : 'text-slate-600')}>
                      {enabled ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Company Profile & Invoices */}
        <div className="space-y-6">
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Briefcase size={18} className="text-emerald-400" /> Company Profile & Invoicing
            </h2>
            <div className="space-y-3">
              <div>
                <label className="fmis-label flex items-center gap-1.5 font-bold text-slate-300">Organization Name</label>
                <input value={tenantName} onChange={e => setTenantName(e.target.value)} className="fmis-input text-sm border-blue-500/30" placeholder="Legal Entity Name" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="fmis-label flex items-center gap-1.5"><Hash size={12} /> TIN NO</label>
                  <input value={invTin} onChange={e => setInvTin(e.target.value.toUpperCase())} className="fmis-input text-sm" placeholder="e.g. 1XX-XXX-XXX" />
                </div>
                <div>
                  <label className="fmis-label flex items-center gap-1.5"><Hash size={12} /> REG NO</label>
                  <input value={invReg} onChange={e => setInvReg(e.target.value.toUpperCase())} className="fmis-input text-sm" placeholder="e.g. 1XXXXX" />
                </div>
              </div>

              <div>
                <label className="fmis-label flex items-center gap-1.5"><MapPin size={12} /> Office Address</label>
                <input value={tenantAddress} onChange={e => setTenantAddress(e.target.value)} className="fmis-input text-sm" placeholder="Street, Building, etc." />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="fmis-label font-medium opacity-70">City</label>
                  <input value={invCity} onChange={e => setInvCity(e.target.value)} className="fmis-input text-sm" placeholder="Dar es Salaam" />
                </div>
                <div>
                  <label className="fmis-label font-medium opacity-70">Country</label>
                  <input value={invCountry} onChange={e => setInvCountry(e.target.value)} className="fmis-input text-sm" placeholder="Tanzania" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="fmis-label flex items-center gap-1.5"><Mail size={12} /> Email</label>
                  <input value={tenantEmail} onChange={e => setTenantEmail(e.target.value)} className="fmis-input text-sm" placeholder="business@example.com" />
                </div>
                <div>
                  <label className="fmis-label flex items-center gap-1.5"><Phone size={12} /> Phone</label>
                  <input value={tenantPhone} onChange={e => setTenantPhone(e.target.value)} className="fmis-input text-sm" placeholder="+255 7XX XXX XXX" />
                </div>
              </div>

              <div>
                <label className="fmis-label flex items-center gap-1.5"><Globe size={12} /> Website</label>
                <input value={invWebsite} onChange={e => setInvWebsite(e.target.value)} className="fmis-input text-sm" placeholder="www.yourwebsite.com" />
              </div>

              <div className="pt-2">
                <label className="fmis-label flex items-center gap-1.5"><Briefcase size={12} /> Business Focus (Dealers)</label>
                <textarea value={invDealers} onChange={e => setInvDealers(e.target.value)} rows={2} className="fmis-input text-xs" placeholder="Describe what you deal with..." />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="fmis-label flex items-center gap-1.5"><CreditCard size={12} /> Lipa Namba Name</label>
                  <input value={invLipaName} onChange={e => setInvLipaName(e.target.value)} className="fmis-input text-sm" placeholder="M-PESA / TIGO PESA" />
                </div>
                <div>
                  <label className="fmis-label flex items-center gap-1.5"><Hash size={12} /> Lipa Namba Number</label>
                  <input value={invLipaNumber} onChange={e => setInvLipaNumber(e.target.value)} className="fmis-input text-sm" placeholder="5XXXXXX" />
                </div>
              </div>

              <div>
                <label className="fmis-label flex items-center gap-1.5"><UserCircle size={12} /> Sales Director</label>
                <input value={invSalesDirector} onChange={e => setInvSalesDirector(e.target.value.toUpperCase())} className="fmis-input text-sm" placeholder="Name for signature block" />
              </div>

              <div>
                <label className="fmis-label flex items-center gap-1.5"><FileText size={12} /> Default Terms & Conditions</label>
                <textarea value={invDefaultTerms} onChange={e => setInvDefaultTerms(e.target.value)} rows={3} className="fmis-input text-xs" placeholder="One term per line..." />
              </div>

              <button onClick={saveCompanyProfile} disabled={savingCompany} className="btn-primary w-full justify-center bg-emerald-600 hover:bg-emerald-500 mt-2">
                {savingCompany ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Company Profile
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Bell size={18} className="text-yellow-400" /> Notifications
            </h2>
            <div className="space-y-2">
              {[
                { key: 'notifications.channels.email.enabled', label: 'Email Notifications', desc: 'Receive notifications via Email' },
                { key: 'notifications.features.approvals', label: 'Approval Alerts', desc: 'Get notified for pending approvals' },
                { key: 'notifications.features.tasks', label: 'Task Assignments', desc: 'Get notified when tasks are assigned' },
                { key: 'notifications.features.fraud_alerts', label: 'Fraud Detection Alerts', desc: 'Receive high-priority alerts' },
                { key: 'notifications.features.invoices', label: 'Invoice Alerts', desc: 'Get notified for new invoices' },
              ].map(pref => {
                const val = settings[pref.key]
                const enabled = val === undefined ? true : (val === 'true' || val === true)
                return (
                  <div key={pref.key} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30 border border-slate-700/50">
                    <div>
                      <p className="text-slate-200 font-medium text-xs">{pref.label}</p>
                    </div>
                    <button onClick={async () => {
                      try {
                        await settingsApi.set(pref.key, !enabled, 'notifications', 'boolean')
                        const res = await settingsApi.all(); setSettings(res.data); toast.success('Updated')
                      } catch { toast.error('Failed') }
                    }} className={clsx('transition-colors', enabled ? 'text-blue-400' : 'text-slate-600')}>
                      {enabled ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                    </button>
                  </div>
                )
              })}
            </div>
        </div>

        <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <DollarSign size={18} className="text-emerald-400" /> Currency & Rates
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="fmis-label">Default Local Currency</label>
                  <input value={currencyDefault} onChange={e => setCurrencyDefault(e.target.value.toUpperCase())} className="fmis-input uppercase font-mono text-sm" maxLength={3} />
                </div>
                <div>
                  <label className="fmis-label">Symbol (e.g. $, TSh)</label>
                  <input value={currencySymbol} onChange={e => setCurrencySymbol(e.target.value)} className="fmis-input text-sm" />
                </div>
              </div>
              <button onClick={saveCurrencySettings} disabled={savingCurrency} className="btn-primary w-full justify-center">
                {savingCurrency ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Currency Settings
              </button>
            </div>
        </div>
      </div>

      <OfficeMapPicker />
    </div>
  )
}
