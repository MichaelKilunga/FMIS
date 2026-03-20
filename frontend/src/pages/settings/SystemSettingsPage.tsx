import { useEffect, useState } from 'react'
import { settingsApi } from '../../services/api'
import { Save, Loader2, Mail, MessageSquare, Bot, MapPin, Database, Shield, LayoutDashboard } from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const TABS = [
  { id: 'email', label: 'Email Configuration', icon: Mail },
  { id: 'sms', label: 'Push SMS', icon: MessageSquare },
  { id: 'whatsapp', label: 'WhatsApp Server', icon: MessageSquare },
  { id: 'ai', label: 'AI & Intelligence', icon: Bot },
  { id: 'maps', label: 'Maps & Location', icon: MapPin },
  { id: 'security', label: 'Security & Auth', icon: Shield },
  { id: 'content', label: 'System Content', icon: LayoutDashboard },
]

export default function SystemSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('email')
  
  const [formData, setFormData] = useState<Record<string, string>>({})

  useEffect(() => {
    settingsApi.all().then(res => {
      // The backend returns an object of key => value, we just set it.
      // E.g. { "email.host": "smtp.example.com", ... }
      setFormData(res.data)
    }).catch(() => toast.error('Failed to load system settings'))
      .finally(() => setLoading(false))
  }, [])

  const handleChange = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    
    // Group settings by their prefix
    const settingsPayload = Object.entries(formData).map(([key, value]) => {
      const group = key.split('.')[0] || 'general'
      return { key, value, group, type: 'string' }
    })

    try {
      await settingsApi.setBulk(settingsPayload, true)
      toast.success('Global settings saved successfully')
    } catch {
      toast.error('Failed to save global configurations')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-blue-500" size={32} /></div>

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fade-in pl-1">
      <div>
        <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
          <Database className="text-blue-400" size={28} /> Global System Configurations
        </h1>
        <p className="text-slate-400 text-sm mt-2 max-w-2xl leading-relaxed">
          Manage core environment variables, credentials, and API integrations for all tenants universally. 
          Use the categories below to configure the integrated system modules.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start mt-8">
        {/* Sidebar Nav */}
        <div className="w-full lg:w-64 shrink-0 flex flex-col gap-1.5 p-2 glass-card rounded-2xl border-slate-700/50">
          {TABS.map(tab => {
            const isSelected = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  'w-full flex items-center gap-3 px-4 py-3.5 text-sm font-medium rounded-xl transition-all duration-200',
                  isSelected 
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' 
                    : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
                )}
              >
                <div className={clsx("p-1.5 rounded-lg", isSelected ? "bg-blue-500/20 text-blue-400" : "bg-slate-800 text-slate-500")}>
                  <tab.icon size={16} />
                </div>
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Dynamic Canvas Area */}
        <div className="flex-1 w-full relative">
          {/* Subtle Glow */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/5 blur-[120px] pointer-events-none rounded-full" />

          <form onSubmit={handleSave} className="glass-card p-8 rounded-3xl relative z-10 border border-slate-700/60 shadow-xl overflow-hidden">
            {activeTab === 'email' && (
              <div className="animate-slide-in">
                <div className="mb-6 border-b border-slate-700/60 pb-5">
                  <h2 className="text-xl font-bold text-white tracking-tight">SMTP Mail Configuration</h2>
                  <p className="text-sm text-slate-400 mt-1">Configure global outgoing email routing for invoices and approvals.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                  <Field label="Mail Driver" value={formData['email.mailer'] || 'smtp'} onChange={v => handleChange('email.mailer', v)} placeholder="e.g. smtp, mailgun" />
                  <Field label="SMTP Host" value={formData['email.host'] || ''} onChange={v => handleChange('email.host', v)} placeholder="smtp.mailtrap.io" />
                  <Field label="SMTP Port" value={formData['email.port'] || '2525'} onChange={v => handleChange('email.port', v)} placeholder="2525 or 587" />
                  <Field label="Mail Encryption" value={formData['email.encryption'] || 'tls'} onChange={v => handleChange('email.encryption', v)} placeholder="tls or ssl" />
                  <Field label="Username" value={formData['email.username'] || ''} onChange={v => handleChange('email.username', v)} />
                  <Field label="Password" value={formData['email.password'] || ''} onChange={v => handleChange('email.password', v)} type="password" />
                  <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-slate-700/30">
                    <Field label="Sender Address" value={formData['email.from_address'] || ''} onChange={v => handleChange('email.from_address', v)} placeholder="hello@company.com" />
                    <Field label="Sender Name" value={formData['email.from_name'] || ''} onChange={v => handleChange('email.from_name', v)} placeholder="FMIS System" />
                  </div>
                  <div className="md:col-span-2 pt-2 border-t border-slate-700/30">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 transition-colors">
                      Enable Email Notifications Globally
                    </label>
                    <select
                      value={formData['notifications.channels.email.enabled'] || 'true'}
                      onChange={e => handleChange('notifications.channels.email.enabled', e.target.value)}
                      className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 outline-none transition-all"
                    >
                      <option value="true">Enabled</option>
                      <option value="false">Disabled</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'sms' && (
              <div className="animate-slide-in">
                <div className="mb-6 border-b border-slate-700/60 pb-5">
                  <h2 className="text-xl font-bold text-white tracking-tight">Push SMS Gateway</h2>
                  <p className="text-sm text-slate-400 mt-1">Setup the default provider to handle instant messaging and OTP codes.</p>
                </div>
                <div className="space-y-5 max-w-xl">
                  <Field label="SMS Provider" value={formData['sms.provider'] || ''} onChange={v => handleChange('sms.provider', v)} placeholder="e.g. Twilio, Vonage, Africastalking" />
                  <Field label="API Key / SID" value={formData['sms.api_key'] || ''} onChange={v => handleChange('sms.api_key', v)} type="password" />
                  <Field label="API Secret / Auth Token" value={formData['sms.api_secret'] || ''} onChange={v => handleChange('sms.api_secret', v)} type="password" />
                  <Field label="Sender ID / From Number" value={formData['sms.sender_id'] || ''} onChange={v => handleChange('sms.sender_id', v)} placeholder="e.g. FMIS-ALERT" />
                </div>
              </div>
            )}

            {activeTab === 'whatsapp' && (
              <div className="animate-slide-in">
                <div className="mb-6 border-b border-slate-700/60 pb-5">
                  <h2 className="text-xl font-bold text-white tracking-tight">WhatsApp Business API</h2>
                  <p className="text-sm text-slate-400 mt-1">Connect the WhatsApp Business gateway for customer invoice notifications.</p>
                </div>
                <div className="space-y-5 max-w-xl">
                  <Field label="Business Account ID" value={formData['whatsapp.business_account_id'] || ''} onChange={v => handleChange('whatsapp.business_account_id', v)} />
                  <Field label="Phone Number ID" value={formData['whatsapp.phone_id'] || ''} onChange={v => handleChange('whatsapp.phone_id', v)} />
                  <Field label="Access Token" value={formData['whatsapp.access_token'] || ''} onChange={v => handleChange('whatsapp.access_token', v)} type="password" />
                </div>
              </div>
            )}

            {activeTab === 'ai' && (
              <div className="animate-slide-in">
                <div className="mb-6 border-b border-slate-700/60 pb-5">
                  <h2 className="text-xl font-bold text-white tracking-tight">AI Models & Intelligence</h2>
                  <p className="text-sm text-slate-400 mt-1">Key parameters for the internal fraud detection rules evaluation and conversational logic.</p>
                </div>
                <div className="space-y-5 max-w-xl">
                  <Field label="Default Engine" value={formData['ai.provider'] || 'openai'} onChange={v => handleChange('ai.provider', v)} placeholder="E.g. openai, anthropic" />
                  <Field label="OpenAI Native API Key" value={formData['ai.openai_key'] || ''} onChange={v => handleChange('ai.openai_key', v)} type="password" />
                  <Field label="Anthropic API Key" value={formData['ai.anthropic_key'] || ''} onChange={v => handleChange('ai.anthropic_key', v)} type="password" />
                  <Field label="Generative AI Model Node" value={formData['ai.default_model'] || 'gpt-4-turbo'} onChange={v => handleChange('ai.default_model', v)} />
                </div>
              </div>
            )}

            {activeTab === 'maps' && (
              <div className="animate-slide-in">
                <div className="mb-6 border-b border-slate-700/60 pb-5">
                  <h2 className="text-xl font-bold text-white tracking-tight">Maps & Embedded Location</h2>
                  <p className="text-sm text-slate-400 mt-1">Global configuration parameters for mapping integrations.</p>
                </div>
                <div className="space-y-5 max-w-xl">
                  <Field label="Google Maps API Key" value={formData['maps.google_api_key'] || ''} onChange={v => handleChange('maps.google_api_key', v)} type="password" />
                  <Field label="Mapbox Token (Fallback)" value={formData['maps.mapbox_key'] || ''} onChange={v => handleChange('maps.mapbox_key', v)} type="password" />
                  <div className="grid grid-cols-2 gap-4 border-t border-slate-700/40 pt-4">
                    <Field label="Default Start Latitude" value={formData['maps.default_lat'] || '-6.7924'} onChange={v => handleChange('maps.default_lat', v)} />
                    <Field label="Default Start Longitude" value={formData['maps.default_lng'] || '39.2083'} onChange={v => handleChange('maps.default_lng', v)} />
                  </div>
                </div>
              </div>
            )}
            
            {activeTab === 'security' && (
              <div className="animate-slide-in">
                <div className="mb-6 border-b border-slate-700/60 pb-5">
                  <h2 className="text-xl font-bold text-white tracking-tight">Security & Authentication</h2>
                  <p className="text-sm text-slate-400 mt-1">Manage global security policies and session behaviors.</p>
                </div>
                <div className="space-y-6 max-w-xl">
                  <div>
                    <Field 
                      label="Session Lifetime (Minutes)" 
                      value={formData['auth.session_lifetime'] || '120'} 
                      onChange={v => handleChange('auth.session_lifetime', v)} 
                      type="number"
                      placeholder="e.g. 120" 
                    />
                    <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                      Determines how long a user session (token) remains valid before requiring re-authentication. 
                      Setting this to 0 means tokens never expire (not recommended).
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'content' && (
              <div className="animate-slide-in">
                <div className="mb-6 border-b border-slate-700/60 pb-5">
                  <h2 className="text-xl font-bold text-white tracking-tight">System Public Content</h2>
                  <p className="text-sm text-slate-400 mt-1">Manage global Privacy Policy, Terms of Service, and support contact details.</p>
                </div>
                <div className="space-y-6">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Support Email</label>
                    <input 
                      type="email"
                      value={formData['system.support_email'] || ''} 
                      onChange={e => handleChange('system.support_email', e.target.value)}
                      placeholder="support@example.com"
                      className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 placeholder:text-slate-600 focus:bg-slate-900 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 outline-none transition-all shadow-inner"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Privacy Policy (Markdown)</label>
                    <textarea 
                      value={formData['system.privacy_policy'] || ''} 
                      onChange={e => handleChange('system.privacy_policy', e.target.value)}
                      rows={10}
                      className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 font-mono text-sm leading-relaxed focus:bg-slate-900 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 outline-none transition-all shadow-inner"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Terms of Service (Markdown)</label>
                    <textarea 
                      value={formData['system.terms_of_service'] || ''} 
                      onChange={e => handleChange('system.terms_of_service', e.target.value)}
                      rows={10}
                      className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 font-mono text-sm leading-relaxed focus:bg-slate-900 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 outline-none transition-all shadow-inner"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="pt-8 mt-8 border-t border-slate-700/50 flex justify-end">
              <button 
                type="submit" 
                disabled={saving} 
                className="inline-flex items-center justify-center gap-2 px-7 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-all hover:-translate-y-0.5 shadow-lg shadow-blue-500/25 active:scale-95 disabled:opacity-70 disabled:hover:translate-y-0"
              >
                {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                {saving ? 'Synching...' : 'Apply Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', placeholder = '' }: { label: string, value: string, onChange: (v: string) => void, type?: string, placeholder?: string }) {
  return (
    <div className="group">
      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 group-focus-within:text-blue-400 transition-colors">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 placeholder:text-slate-600 focus:bg-slate-900 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 outline-none transition-all shadow-inner"
      />
    </div>
  )
}
