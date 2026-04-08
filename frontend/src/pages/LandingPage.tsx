import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { 
  TrendingUp, Shield, Zap, BarChart3, Users, 
  ArrowRight, CheckCircle2, Globe, Clock, 
  ChevronRight, LayoutDashboard, CreditCard, ListTodo,
  Menu, X, Sparkles, Box
} from 'lucide-react'
import { settingsApi } from '../services/api'
import { useAuthStore } from '../store'

export default function LandingPage() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuthStore()
  const [config, setConfig] = useState<Record<string, string>>({})
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    settingsApi.getSystemSettings()
      .then(res => {
        setConfig(res.data)
        // Update document title for SEO
        if (res.data['system.seo.title']) {
          document.title = res.data['system.seo.title']
        }
        // Update meta tags for SEO
        updateMetaTags(res.data)
        
        // Apply primary color
        if (res.data['system.primary_color']) {
            document.documentElement.style.setProperty('--primary', res.data['system.primary_color'])
        }
      })
      .catch(() => {})

    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const updateMetaTags = (data: Record<string, string>) => {
    const head = document.head
    
    const setMeta = (name: string, content: string, property: boolean = false) => {
        let el = property 
            ? head.querySelector(`meta[property="${name}"]`) 
            : head.querySelector(`meta[name="${name}"]`)
        
        if (!el) {
            el = document.createElement('meta')
            if (property) el.setAttribute('property', name)
            else el.setAttribute('name', name)
            head.appendChild(el)
        }
        el.setAttribute('content', content)
    }

    if (data['system.seo.description']) setMeta('description', data['system.seo.description'])
    if (data['system.seo.keywords']) setMeta('keywords', data['system.seo.keywords'])
    
    // Open Graph
    setMeta('og:title', data['system.seo.title'] || data['system.name'] || 'FMIS', true)
    setMeta('og:description', data['system.seo.description'] || '', true)
    if (data['system.logo']) setMeta('og:image', data['system.logo'], true)
  }

  const appName = config['system.name'] || 'FMIS'
  const logoUrl = config['system.logo'] || null
  const primaryColor = config['system.primary_color'] || '#3B82F6'

  const features = [
    {
      icon: <BarChart3 className="text-blue-400" />,
      title: "Real-time Analytics",
      description: "Advanced dashboards with deep insights into your financial health and cash flow."
    },
    {
      icon: <Shield className="text-emerald-400" />,
      title: "Fraud Detection",
      description: "Automated monitoring and heuristics to spot suspicious transactions instantly."
    },
    {
      icon: <ListTodo className="text-purple-400" />,
      title: "Task Management",
      description: "Streamline workflows with automated task assignments and progress tracking."
    },
    {
      icon: <CreditCard className="text-amber-400" />,
      title: "Billing & Invoices",
      description: "Generate professional invoices and manage recurring bills effortlessly."
    },
    {
      icon: <Users className="text-rose-400" />,
      title: "Multi-tenant RBAC",
      description: "Secure, isolated data with fine-grained role-based access controls."
    },
    {
      icon: <Clock className="text-cyan-400" />,
      title: "Audit Logging",
      description: "Complete transparency with comprehensive activity logs for every action."
    }
  ]

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 selection:bg-blue-500/30 font-inter">
      {/* Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-blue-600/10 blur-[150px] animate-pulse-slow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-emerald-600/10 blur-[150px] animate-pulse-slow" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150" />
      </div>

      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-300 ${
        scrolled ? 'py-4 bg-slate-950/80 backdrop-blur-xl border-b border-white/5 shadow-2xl' : 'py-6 bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3 group cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              {logoUrl ? (
                <img src={logoUrl} alt={appName} className="h-10 w-auto object-contain transition-transform group-hover:scale-110" />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:rotate-12 transition-all">
                  <TrendingUp size={22} className="text-white" />
                </div>
              )}
              <span className="text-2xl font-black text-white tracking-tighter uppercase">{appName}</span>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-10 text-[13px] font-bold uppercase tracking-widest">
              <a href="#features" className="text-slate-400 hover:text-white transition-colors">Features</a>
              <a href="#solutions" className="text-slate-400 hover:text-white transition-colors">Solutions</a>
              <div className="h-4 w-px bg-slate-800" />
              {isAuthenticated ? (
                <button 
                  onClick={() => navigate('/app/dashboard')} 
                  className="relative group overflow-hidden bg-white text-slate-950 px-7 py-3 rounded-full font-black transition-all hover:pr-10 active:scale-95 shadow-xl shadow-white/5"
                >
                  <span className="relative z-10 transition-all">Go to Dashboard</span>
                  <ChevronRight size={16} className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all" />
                </button>
              ) : (
                <>
                  <button onClick={() => navigate('/login')} className="text-slate-400 hover:text-white transition-colors">Sign In</button>
                  <button 
                    onClick={() => navigate('/register')} 
                    className="relative group overflow-hidden bg-white text-slate-950 px-7 py-3 rounded-full font-black transition-all hover:pr-10 active:scale-95 shadow-xl shadow-white/5"
                  >
                    <span className="relative z-10 transition-all">Get Started</span>
                    <ChevronRight size={16} className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all" />
                  </button>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button 
              className="md:hidden p-2 text-slate-400 hover:text-white transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 border-t border-white/5 bg-slate-950/95 backdrop-blur-2xl animate-fade-in shadow-2xl">
            <div className="px-6 py-8 space-y-6">
              <a href="#features" className="block text-xl font-bold text-slate-200" onClick={() => setMobileMenuOpen(false)}>Features</a>
              <a href="#solutions" className="block text-xl font-bold text-slate-200" onClick={() => setMobileMenuOpen(false)}>Solutions</a>
              <div className="h-px bg-white/5" />
              {isAuthenticated ? (
                <button onClick={() => { navigate('/app/dashboard'); setMobileMenuOpen(false); }} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-blue-500/20">
                  Go to Dashboard
                </button>
              ) : (
                <>
                  <button onClick={() => { navigate('/login'); setMobileMenuOpen(false); }} className="block w-full text-left text-xl font-bold text-slate-400">Sign In</button>
                  <button onClick={() => { navigate('/register'); setMobileMenuOpen(false); }} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-blue-500/20">
                    Register Now
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-32 overflow-hidden z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black tracking-[0.2em] mb-10 animate-fade-in shadow-[0_0_20px_rgba(59,130,246,0.1)]">
            <Sparkles size={12} className="animate-spin-slow" />
            <span>{config['system.name']?.toUpperCase() || 'FMIS'} PLATFORM v3.0</span>
          </div>
          
          <h1 className="text-6xl md:text-8xl font-[950] text-white mb-8 tracking-tighter leading-[0.9] animate-slide-up">
            {config['landing.hero_title'] || (
                <>
                Financial Intelligence <br />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-emerald-400">
                    Engineered for Speed
                </span>
                </>
            )}
          </h1>
          
          <p className="max-w-3xl mx-auto text-lg md:text-xl text-slate-400/80 mb-12 leading-relaxed font-medium animate-slide-up" style={{ animationDelay: '0.1s' }}>
            {config['landing.hero_subtitle'] || "The all-in-one Financial Management & Intelligence System designed to streamline your operations, detect fraud, and provide deep insights into your organization's health."}
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-5 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <button onClick={() => navigate('/register')}
                    className="group relative px-10 py-5 bg-blue-600 rounded-2xl font-black text-white overflow-hidden transition-all hover:bg-blue-500 active:scale-95 shadow-2xl shadow-blue-500/40">
              <span className="relative z-10 flex items-center gap-3">
                {config['landing.cta_text'] || 'Start Scaling Your Business'} <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            </button>
            <button onClick={() => navigate('/login')}
                    className="px-10 py-5 bg-slate-900/50 backdrop-blur-md border border-white/10 rounded-2xl font-black text-white hover:bg-slate-800 transition-all active:scale-95">
              Live Interactive Demo
            </button>
          </div>

          <div className="mt-24 relative max-w-6xl mx-auto animate-slide-up" style={{ animationDelay: '0.3s' }}>
             <div className="absolute -top-20 -left-20 w-64 h-64 bg-blue-500/20 blur-[100px] rounded-full" />
             <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-emerald-500/20 blur-[100px] rounded-full" />
             <div className="relative rounded-[2.5rem] border border-white/10 bg-slate-900/40 p-3 shadow-[0_0_100px_rgba(0,0,0,0.5)] backdrop-blur-xl group overflow-hidden">
                <div className="rounded-[2rem] overflow-hidden bg-slate-950 aspect-[16/9] flex items-center justify-center relative">
                  <div className="absolute inset-x-0 top-0 h-8 bg-slate-800/50 flex items-center px-4 gap-1.5 z-20">
                     <div className="w-2.5 h-2.5 rounded-full bg-rose-500/50" />
                     <div className="w-2.5 h-2.5 rounded-full bg-amber-500/50" />
                     <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/50" />
                     <div className="ml-4 h-4 w-60 bg-slate-900/50 rounded-md" />
                  </div>
                  <img src="/dashboard_preview.png" alt="Dashboard Preview" className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-all duration-1000" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end justify-center pb-10 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="px-8 py-4 bg-white text-slate-950 rounded-2xl font-black shadow-2xl flex items-center gap-3">
                      Explore Dashboard <LayoutDashboard size={18} />
                    </button>
                  </div>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-40 bg-slate-950 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-24">
            <h2 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.4em] mb-4">Core Infrastructure</h2>
            <h3 className="text-4xl md:text-5xl font-black text-white mb-6 tracking-tighter">Everything you need, <br /> Built for Enterprise.</h3>
            <p className="text-slate-400 text-lg leading-relaxed">
              We've consolidated fragmented financial tools into a single, high-performance ecosystem powered by AI and real-time ledger auditing.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((f, i) => (
              <div key={i} className="group p-10 rounded-[2.5rem] border border-white/5 bg-slate-900/20 hover:bg-slate-900/40 transition-all hover:border-white/10 relative overflow-hidden">
                <div className="absolute -right-8 -bottom-8 w-24 h-24 bg-gradient-to-br from-blue-600/5 to-transparent blur-2xl group-hover:scale-150 transition-transform duration-700" />
                <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mb-8 border border-white/5 group-hover:scale-110 group-hover:bg-white/10 transition-all duration-500">
                  {f.icon}
                </div>
                <h4 className="text-xl font-black text-white mb-4 tracking-tight">{f.title}</h4>
                <p className="text-slate-400 text-sm leading-relaxed font-medium">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof / Stats */}
      <section className="py-24 border-y border-white/5 bg-slate-950/50 backdrop-blur-sm relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-12 text-center">
            {[
              { label: "Transactions Processed", val: "1.2M+", icon: <BarChart3 size={16} /> },
              { label: "Active Organizations", val: "500+", icon: <Users size={16} /> },
              { label: "Fraud Alerts Prevented", val: "15k+", icon: <Shield size={16} /> },
              { label: "Uptime Guarantee", val: "99.9%", icon: <Zap size={16} /> }
            ].map((s, i) => (
              <div key={i} className="space-y-3">
                <div className="flex items-center justify-center text-blue-500 mb-2">
                    {s.icon}
                </div>
                <div className="text-4xl md:text-5xl font-black text-white tracking-tighter">{s.val}</div>
                <div className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-40 relative overflow-hidden z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-600/5 to-transparent -z-10" />
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="w-20 h-20 bg-blue-600/10 rounded-full flex items-center justify-center mx-auto mb-10 border border-blue-500/20 shadow-[0_0_50px_rgba(59,130,246,0.2)]">
            <Box size={32} className="text-blue-500 animate-bounce" />
          </div>
          <h2 className="text-5xl md:text-7xl font-black text-white mb-10 tracking-tighter leading-tight">Ready to transform your <br /> financial operations?</h2>
          <p className="text-slate-400/80 mb-14 text-xl font-medium max-w-2xl mx-auto leading-relaxed">
            Join 500+ enterprises using {appName} to achieve absolute financial clarity. 
            No credit card required for your first 30 days.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <button onClick={() => navigate('/register')}
                    className="px-12 py-6 bg-white text-slate-950 rounded-[2rem] font-black text-xl hover:bg-blue-50 transition-all shadow-2xl shadow-white/10 active:scale-95">
              Start Free Trial
            </button>
            <button className="flex items-center gap-3 font-black text-white group">
                Contact Sales <ChevronRight className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 border-t border-white/5 text-slate-400/60 text-sm relative z-10">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-10">
          <div className="flex flex-col items-center md:items-start gap-4">
            <div className="flex items-center gap-3">
              {logoUrl ? <img src={logoUrl} alt={appName} className="h-8 w-auto grayscale opacity-50" /> : <TrendingUp size={18} className="text-blue-500/50" />}
              <span className="font-black text-white/50 tracking-tighter uppercase text-xl">{appName}</span>
            </div>
            <p className="font-medium text-xs">© 2026 Skylink Solutions. Global Finance OS.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-10 text-[11px] font-black uppercase tracking-widest">
            <Link to="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link to="/terms" className="hover:text-white transition-colors">Terms</Link>
            <a href={`mailto:${config['system.support_email'] || 'support@fmis.ai'}`} className="hover:text-white transition-colors">Support</a>
            <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 cursor-pointer transition-colors">
                    <Globe size={14} />
                </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

