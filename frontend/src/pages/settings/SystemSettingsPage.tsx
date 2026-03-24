import { useEffect, useState } from 'react'
import { settingsApi } from '../../services/api'
import { Save, Loader2, Mail, MessageSquare, Bot, MapPin, Database, Shield, LayoutDashboard } from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import { format } from 'date-fns'

const TABS = [
  { id: 'email', label: 'Email Configuration', icon: Mail },
  { id: 'sms', label: 'Push SMS', icon: MessageSquare },
  { id: 'whatsapp', label: 'WhatsApp Server', icon: MessageSquare },
  { id: 'ai', label: 'AI & Intelligence', icon: Bot },
  { id: 'maps', label: 'Maps & Location', icon: MapPin },
  { id: 'security', label: 'Security & Auth', icon: Shield },
  { id: 'branding', label: 'App Branding', icon: Palette },
  { id: 'landing', label: 'Landing Page', icon: LayoutDashboard },
  { id: 'email', label: 'Email Configuration', icon: Mail },
  { id: 'sms', label: 'Push SMS', icon: MessageSquare },
  { id: 'whatsapp', label: 'WhatsApp Server', icon: MessageSquare },
  { id: 'ai', label: 'AI & Intelligence', icon: Bot },
  { id: 'maps', label: 'Maps & Location', icon: MapPin },
  { id: 'security', label: 'Security & Auth', icon: Shield },
  { id: 'content', label: 'Legal Content', icon: FileText },
]

import { Palette, FileText, Globe, Upload } from 'lucide-react'

export default function SystemSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('email')
  const [now, setNow] = useState(new Date())
  
  const [formData, setFormData] = useState<Record<string, string>>({})

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    settingsApi.all().then(res => {
      setFormData(res.data)
    }).catch(() => toast.error('Failed to load system settings'))
      .finally(() => setLoading(false))
    return () => clearInterval(timer)
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-3 tracking-tight">
            <Database className="text-blue-400" size={28} /> Global Control Layer
          </h1>
          <p className="text-slate-400 text-sm mt-2 max-w-2xl leading-relaxed">
            Manage the underlying infrastructure, API integrations, and environment variables that power all {formData['system.total_tenants'] || 'active'} tenants.
          </p>
        </div>
        <div className="bg-slate-800/80 backdrop-blur px-4 py-2 rounded-xl border border-slate-700/50 flex flex-col items-end">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">System Time (UTC)</span>
            <span className="text-white font-mono font-bold">{format(now, 'HH:mm:ss')}</span>
        </div>
      </div>

      <div className="bg-gradient-to-r from-blue-600/10 to-purple-600/10 border border-blue-500/20 rounded-2xl p-4 flex items-center gap-4">
          <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
              <Shield size={20} />
          </div>
          <div className="flex-1">
              <p className="text-sm font-bold text-white uppercase tracking-tighter">System-Wide Configuration Mode</p>
              <p className="text-xs text-slate-400">Changes made here affect all tenant environments immediately. Exercise caution with API keys and database credentials.</p>
          </div>
          <div className="hidden sm:block">
              <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-[10px] font-bold uppercase tracking-wider">Operational</span>
          </div>
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
            {activeTab === 'branding' && (
              <div className="animate-slide-in">
                <div className="mb-6 border-b border-slate-700/60 pb-5">
                  <h2 className="text-xl font-bold text-white tracking-tight">Application Branding</h2>
                  <p className="text-sm text-slate-400 mt-1">Logo, favicon and primary colors for the global application interface.</p>
                </div>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Field label="System Name" value={formData['system.name'] || 'FMIS'} onChange={v => handleChange('system.name', v)} placeholder="e.g. My FMIS Enterprise" />
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Primary Color</label>
                      <div className="flex gap-2">
                        <input type="color" value={formData['system.primary_color'] || '#3B82F6'} onChange={e => handleChange('system.primary_color', e.target.value)} className="h-11 w-14 bg-slate-900 border border-slate-700 rounded-xl cursor-pointer" />
                        <input value={formData['system.primary_color'] || '#3B82F6'} onChange={e => handleChange('system.primary_color', e.target.value)} className="flex-1 bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 uppercase font-mono" />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-slate-700/30">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Global Logo</label>
                      <div className="flex flex-col gap-3">
                        {formData['system.logo'] && (
                          <div className="h-20 bg-slate-900/50 rounded-xl border border-slate-700 p-3 flex items-center justify-center">
                            <img src={formData['system.logo']} alt="System Logo" className="max-h-full max-w-full object-contain" />
                          </div>
                        )}
                        <input type="file" onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const fd = new FormData();
                          fd.append('logo', file);
                          fd.append('is_system_wide', 'true');
                          try {
                            setSaving(true);
                            await settingsApi.updateBranding(fd);
                            const res = await settingsApi.all();
                            setFormData(res.data);
                            toast.success('Logo uploaded');
                          } catch { toast.error('Upload failed') } finally { setSaving(false) }
                        }} className="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-600/10 file:text-blue-400 hover:file:bg-blue-600/20" accept="image/*" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Favicon</label>
                      <div className="flex flex-col gap-3">
                        {formData['system.favicon'] && (
                          <div className="h-20 w-20 bg-slate-900/50 rounded-xl border border-slate-700 p-3 flex items-center justify-center">
                            <img src={formData['system.favicon']} alt="Favicon" className="max-h-full max-w-full object-contain" />
                          </div>
                        )}
                        <input type="file" onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const fd = new FormData();
                          fd.append('favicon', file);
                          fd.append('is_system_wide', 'true');
                          try {
                            setSaving(true);
                            await settingsApi.updateBranding(fd);
                            const res = await settingsApi.all();
                            setFormData(res.data);
                            toast.success('Favicon uploaded');
                          } catch { toast.error('Upload failed') } finally { setSaving(false) }
                        }} className="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-purple-600/10 file:text-purple-400 hover:file:bg-purple-600/20" accept="image/x-icon,image/png" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'landing' && (
              <div className="animate-slide-in">
                <div className="mb-6 border-b border-slate-700/60 pb-5">
                  <h2 className="text-xl font-bold text-white tracking-tight">Landing Page & SEO</h2>
                  <p className="text-sm text-slate-400 mt-1">Customize the public landing page hero content and search engine metadata.</p>
                </div>
                <div className="space-y-6">
                  <div className="space-y-4">
                    <Field label="Hero Title" value={formData['landing.hero_title'] || 'Financial Intelligence For Modern Organizations'} onChange={v => handleChange('landing.hero_title', v)} />
                    <Field label="Hero Subtitle" value={formData['landing.hero_subtitle'] || 'The all-in-one Financial Management & Intelligence System designed to streamline your operations.'} onChange={v => handleChange('landing.hero_subtitle', v)} />
                    <Field label="CTA Button Text" value={formData['landing.cta_text'] || 'Get Started Now'} onChange={v => handleChange('landing.cta_text', v)} />
                  </div>

                  <div className="pt-6 border-t border-slate-700/30 space-y-4">
                    <h3 className="text-xs font-bold text-blue-400 uppercase tracking-widest flex items-center gap-2">
                       <Globe size={14} /> Search Engine Optimization (SEO)
                    </h3>
                    <Field label="Meta Title" value={formData['system.seo.title'] || 'FMIS - Financial Intelligence Platform'} onChange={v => handleChange('system.seo.title', v)} placeholder="Browser tab title..." />
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Meta Description</label>
                      <textarea 
                        value={formData['system.seo.description'] || ''} 
                        onChange={e => handleChange('system.seo.description', e.target.value)}
                        rows={3}
                        placeholder="Short summary for Google results..."
                        className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 text-sm focus:ring-2 focus:ring-blue-500/40 outline-none"
                      />
                    </div>
                    <Field label="Meta Keywords (Comma separated)" value={formData['system.seo.keywords'] || 'fmis, finance, management, intelligence'} onChange={v => handleChange('system.seo.keywords', v)} />
                  </div>
                </div>
              </div>
            )}

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
                  <h2 className="text-xl font-bold text-white tracking-tight">Legal & Public Content</h2>
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
