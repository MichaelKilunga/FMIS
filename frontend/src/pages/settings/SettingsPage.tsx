import { useEffect, useState } from 'react'
import { settingsApi } from '../../services/api'
import { useSettingsStore, useAuthStore } from '../../store'
import { Settings, Save, Loader2, Palette, ToggleLeft, ToggleRight, Upload, DollarSign, Bell } from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import SystemSettingsPage from './SystemSettingsPage'

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
  const [saving, setSaving] = useState(false)
  const [savingCurrency, setSavingCurrency] = useState(false)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  
  const isSystemAdmin = !user?.tenant_id && user?.permissions?.includes('manage-tenants')

  if (isSystemAdmin) {
    return <SystemSettingsPage />
  }

  const [primaryColor, setPrimaryColor] = useState(tenant?.primary_color || '#3B82F6')
  const [secondaryColor, setSecondaryColor] = useState(tenant?.secondary_color || '#0F172A')
  const [accentColor, setAccentColor] = useState(tenant?.accent_color || '#10B981')

  const [currencyDefault, setCurrencyDefault] = useState('USD')
  const [currencySymbol, setCurrencySymbol] = useState('$')
  const [multiCurrencyEnabled, setMultiCurrencyEnabled] = useState(false)
  const [ratesMode, setRatesMode] = useState('manual')
  const [manualRatesStr, setManualRatesStr] = useState('{\n  "EUR": 0.92,\n  "GBP": 0.78,\n  "TZS": 2550\n}')
  const [apiProvider, setApiProvider] = useState('openexchangerates')
  const [apiKey, setApiKey] = useState('')

  useEffect(() => {
    settingsApi.all().then(res => {
      setSettings(res.data)
      if (res.data['currency.default']) setCurrencyDefault(res.data['currency.default'])
      if (res.data['currency.symbol']) setCurrencySymbol(res.data['currency.symbol'])
      if (res.data['currency.multi_enabled']) setMultiCurrencyEnabled(res.data['currency.multi_enabled'] === 'true')
      if (res.data['currency.rates_mode']) setRatesMode(res.data['currency.rates_mode'])
      if (res.data['currency.manual_rates']) setManualRatesStr(res.data['currency.manual_rates'])
      if (res.data['currency.api_provider']) setApiProvider(res.data['currency.api_provider'])
      if (res.data['currency.api_key']) setApiKey(res.data['currency.api_key'])
    }).catch(() => {}).finally(() => setLoading(false))

    // Sync local state if tenant changes (e.g. from other tabs or persistence)
    if (tenant) {
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

  const saveBranding = async () => {
    setSaving(true)
    try {
      const formData = new FormData()
      formData.append('primary_color', primaryColor)
      formData.append('secondary_color', secondaryColor)
      formData.append('accent_color', accentColor)
      if (logoFile) formData.append('logo', logoFile)
      const res = await settingsApi.updateBranding(formData)
      
      // Update store with new branding
      if (tenant) {
        setTenant({
          ...tenant,
          ...res.data.branding
        })
      }
      
      toast.success('Branding updated!')
    } catch { toast.error('Failed to save branding') } finally { setSaving(false) }
  }

  const saveCurrencySettings = async () => {
    setSavingCurrency(true)
    try {
      if (multiCurrencyEnabled && ratesMode === 'manual') {
        try {
          JSON.parse(manualRatesStr) 
        } catch (e) {
          toast.error('Invalid JSON formatting for manual rates. Please verify.')
          setSavingCurrency(false)
          return
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
      toast.error(e.response?.data?.message || 'Failed to save settings to server.')
    } finally {
      setSavingCurrency(false)
    }
  }

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-blue-500" size={28} /></div>

  return (
    <div className="space-y-6 max-w-4xl pb-10">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-slate-400 text-sm">Configure system behavior, modules, and branding</p>
      </div>

      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Settings size={18} className="text-blue-400" /> Module Controls
        </h2>
        <div className="space-y-3">
          {modules.map(mod => {
            const enabled = isModuleEnabled(mod.key.replace('modules.', '').replace('.enabled', ''))
            return (
              <div key={mod.key} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50">
                <div>
                  <p className="text-slate-200 font-medium text-sm">{mod.label}</p>
                  <p className="text-slate-500 text-xs">{mod.desc}</p>
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

      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Bell size={18} className="text-yellow-400" /> Notification Preferences
        </h2>
        <div className="space-y-3">
          {[
            { key: 'notifications.channels.email.enabled', label: 'Email Notifications', desc: 'Receive notifications via Email' },
            { key: 'notifications.features.approvals', label: 'Approval Alerts', desc: 'Get notified for pending approvals and workflow updates' },
            { key: 'notifications.features.tasks', label: 'Task Assignments', desc: 'Get notified when tasks are assigned or completed' },
            { key: 'notifications.features.fraud_alerts', label: 'Fraud Detection Alerts', desc: 'Receive high-priority alerts for suspicious activities' },
            { key: 'notifications.features.budgets', label: 'Budget Thresholds', desc: 'Get alerted when budgets approach their limits' },
            { key: 'notifications.features.debts', label: 'Debt & Payments', desc: 'Receive updates on debt recording and payments' },
            { key: 'notifications.features.elections', label: 'Elections & Voting', desc: 'Get notified of new elections and results' },
            { key: 'notifications.features.invoices', label: 'Invoice Alerts', desc: 'Get notified for new invoices and status changes' },
          ].map(pref => {
            const val = settings[pref.key]
            const enabled = val === undefined ? true : (val === 'true' || val === true)
            return (
              <div key={pref.key} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50">
                <div>
                  <p className="text-slate-200 font-medium text-sm">{pref.label}</p>
                  <p className="text-slate-500 text-xs">{pref.desc}</p>
                </div>
                <button onClick={async () => {
                  try {
                    await settingsApi.set(pref.key, !enabled, 'notifications', 'boolean')
                    const res = await settingsApi.all()
                    setSettings(res.data)
                    toast.success('Preference updated')
                  } catch {
                    toast.error('Failed to update preference')
                  }
                }}
                  className={clsx('transition-colors', enabled ? 'text-blue-400' : 'text-slate-600')}>
                  {enabled ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                </button>
              </div>
            )
          })}
        </div>
      </div>

      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Palette size={18} className="text-purple-400" /> Tenant Branding
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-4">
            <div>
              <label className="fmis-label">Primary Color</label>
              <div className="flex items-center gap-3">
                <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)}
                  className="h-10 w-16 rounded cursor-pointer bg-transparent border-0" />
                <input type="text" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)}
                  className="fmis-input flex-1 font-mono uppercase" maxLength={7} />
              </div>
            </div>
            <div>
              <label className="fmis-label">Secondary Color</label>
              <div className="flex items-center gap-3">
                <input type="color" value={secondaryColor} onChange={e => setSecondaryColor(e.target.value)}
                  className="h-10 w-16 rounded cursor-pointer bg-transparent border-0" />
                <input type="text" value={secondaryColor} onChange={e => setSecondaryColor(e.target.value)}
                  className="fmis-input flex-1 font-mono uppercase" maxLength={7} />
              </div>
            </div>
            <div>
              <label className="fmis-label">Accent Color</label>
              <div className="flex items-center gap-3">
                <input type="color" value={accentColor} onChange={e => setAccentColor(e.target.value)}
                  className="h-10 w-16 rounded cursor-pointer bg-transparent border-0" />
                <input type="text" value={accentColor} onChange={e => setAccentColor(e.target.value)}
                  className="fmis-input flex-1 font-mono uppercase" maxLength={7} />
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="fmis-label">Company Logo</label>
              <div className="flex gap-4 items-end">
                <label className="flex flex-col items-center justify-center flex-1 h-32 border-2 border-dashed border-slate-600 rounded-lg cursor-pointer hover:border-blue-500 transition-colors bg-slate-800/30">
                  <Upload size={24} className="text-slate-500 mb-2" />
                  <span className="text-sm text-slate-400 text-center px-2">{logoFile ? logoFile.name : 'Click to upload logo'}</span>
                  <span className="text-xs text-slate-500">PNG, JPG, SVG · Max 4MB</span>
                  <input type="file" accept="image/*" className="hidden" onChange={e => setLogoFile(e.target.files?.[0] || null)} />
                </label>
                {(logoFile || tenant?.logo) && (
                  <div className="h-32 w-32 rounded-lg border border-slate-700 bg-slate-800 flex items-center justify-center overflow-hidden shrink-0 p-2">
                    <img 
                      src={logoFile ? URL.createObjectURL(logoFile) : tenant?.logo} 
                      alt="Logo Preview" 
                      className="max-h-full max-w-full object-contain" 
                    />
                  </div>
                )}
              </div>
            </div>
            <div className="rounded-lg overflow-hidden border border-slate-700">
              <div className="h-8 flex" style={{ background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})` }} />
              <div className="p-3 text-xs text-slate-400 flex gap-2">
                <span className="px-2 py-0.5 rounded font-mono" style={{ background: primaryColor, color: '#fff' }}>{primaryColor}</span>
                <span className="px-2 py-0.5 rounded font-mono" style={{ background: accentColor, color: '#fff' }}>{accentColor}</span>
              </div>
            </div>
          </div>
        </div>
        <button onClick={saveBranding} disabled={saving} className="btn-primary mt-5">
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save Branding
        </button>
      </div>

      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <DollarSign size={18} className="text-emerald-400" /> Currency & Exchange Rates
        </h2>
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="fmis-label">Default Local Currency</label>
              <input value={currencyDefault} onChange={e => setCurrencyDefault(e.target.value.toUpperCase())} className="fmis-input uppercase font-mono" placeholder="e.g. USD" maxLength={3} />
            </div>
            <div>
              <label className="fmis-label">Display Symbol (e.g. $, TSh)</label>
              <input value={currencySymbol} onChange={e => setCurrencySymbol(e.target.value)} className="fmis-input" placeholder="e.g. $" />
            </div>
            <div>
              <label className="fmis-label">Enable Multi-Currency Modes</label>
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 mt-1">
                <div>
                  <p className="text-slate-200 font-medium text-sm">International Currencies</p>
                  <p className="text-slate-500 text-xs">Allow foreign invoice tracking</p>
                </div>
                <button onClick={() => setMultiCurrencyEnabled(!multiCurrencyEnabled)}
                  className={clsx('transition-colors', multiCurrencyEnabled ? 'text-emerald-400' : 'text-slate-600')}>
                  {multiCurrencyEnabled ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                </button>
              </div>
            </div>
          </div>

          {multiCurrencyEnabled && (
            <div className="pt-4 border-t border-slate-700/50 space-y-5 animate-fade-in">
              <div>
                <label className="fmis-label">Exchange Rate Calculator Strategy</label>
                <select value={ratesMode} onChange={e => setRatesMode(e.target.value)} className="fmis-select">
                  <option value="manual">Manual Fixed Rates</option>
                  <option value="api">Dynamic Provider API</option>
                </select>
              </div>

              {ratesMode === 'manual' && (
                <div>
                  <label className="fmis-label">Exchange Rates JSON (Target -&gt; Rate multiplier for 1 {currencyDefault})</label>
                  <textarea value={manualRatesStr} onChange={e => setManualRatesStr(e.target.value)} rows={5}
                    className="fmis-input font-mono text-sm leading-relaxed" placeholder={'{\n  "EUR": 0.92,\n  "GBP": 0.78\n}'} />
                  <p className="text-xs text-slate-500 mt-2">Example: If {currencyDefault} is USD, an rate entry of "EUR": 0.92 means $1 = €0.92.</p>
                </div>
              )}

              {ratesMode === 'api' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="fmis-label">Rate Provider</label>
                    <select value={apiProvider} onChange={e => setApiProvider(e.target.value)} className="fmis-select">
                      <option value="openexchangerates">Open Exchange Rates</option>
                      <option value="exchangerate-api">ExchangeRate-API</option>
                    </select>
                  </div>
                  <div>
                    <label className="fmis-label">API Key</label>
                    <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} className="fmis-input" placeholder="Enter API Token" />
                  </div>
                </div>
              )}
            </div>
          )}

          <button onClick={saveCurrencySettings} disabled={savingCurrency} className="btn-primary mt-4">
            {savingCurrency ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save Currency Settings
          </button>
        </div>
      </div>
    </div>
  )
}
