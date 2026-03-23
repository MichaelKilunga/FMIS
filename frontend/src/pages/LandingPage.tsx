import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { 
  TrendingUp, Shield, Zap, BarChart3, Users, 
  ArrowRight, CheckCircle2, Globe, Clock, 
  ChevronRight, LayoutDashboard, CreditCard, ListTodo,
  Menu, X
} from 'lucide-react'
import { settingsApi } from '../services/api'

export default function LandingPage() {
  const navigate = useNavigate()
  const [supportEmail, setSupportEmail] = useState('support@skylinksolutions.co')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    settingsApi.getSystemSettings()
      .then(res => {
        if (res.data['system.support_email']) {
          setSupportEmail(res.data['system.support_email'])
        }
      })
      .catch(() => {})
  }, [])

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
    <div className="min-h-screen bg-slate-950 text-slate-200 selection:bg-blue-500/30">
      {/* Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-600/10 blur-[120px]" />
      </div>

      {/* Navigation */}
      <nav className="relative z-50 border-b border-slate-800/50 bg-slate-950/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center">
                <TrendingUp size={24} className="text-white" />
              </div>
              <span className="text-2xl font-black text-white tracking-tight">FMIS</span>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8 text-sm font-medium">
              <a href="#features" className="hover:text-blue-400 transition-colors">Features</a>
              <a href="#about" className="hover:text-blue-400 transition-colors">About</a>
              <div className="h-4 w-px bg-slate-800" />
              <button onClick={() => navigate('/login')} className="hover:text-white transition-colors">Sign In</button>
              <button onClick={() => navigate('/register')} 
                      className="bg-white text-slate-950 px-5 py-2.5 rounded-full font-bold hover:bg-blue-50 transition-all active:scale-95 shadow-lg shadow-white/5">
                Register
              </button>
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
          <div className="md:hidden border-t border-slate-800 bg-slate-950/95 backdrop-blur-xl animate-fade-in">
            <div className="px-4 py-6 space-y-4">
              <a 
                href="#features" 
                className="block text-lg font-medium text-slate-300 hover:text-white"
                onClick={() => setMobileMenuOpen(false)}
              >
                Features
              </a>
              <a 
                href="#about" 
                className="block text-lg font-medium text-slate-300 hover:text-white"
                onClick={() => setMobileMenuOpen(false)}
              >
                About
              </a>
              <div className="h-px bg-slate-800 my-4" />
              <button 
                onClick={() => { navigate('/login'); setMobileMenuOpen(false); }}
                className="block w-full text-left text-lg font-medium text-slate-300 hover:text-white"
              >
                Sign In
              </button>
              <button 
                onClick={() => { navigate('/register'); setMobileMenuOpen(false); }}
                className="w-full mt-4 bg-blue-600 text-white px-6 py-4 rounded-2xl font-bold hover:bg-blue-500 transition-all active:scale-95"
              >
                Register Now
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative pt-20 pb-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold mb-8 animate-fade-in">
            <Zap size={14} />
            <span>VERSION 2.0 IS NOW LIVE</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-6 tracking-tight leading-tight">
            Financial Intelligence <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-emerald-400 to-cyan-400">
              For Modern Organizations
            </span>
          </h1>
          
          <p className="max-w-2xl mx-auto text-lg md:text-xl text-slate-400 mb-10 leading-relaxed">
            The all-in-one Financial Management & Intelligence System designed to streamline your operations, 
            detect fraud, and provide deep insights into your organization's financial health.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={() => navigate('/register')}
                    className="group relative px-8 py-4 bg-blue-600 rounded-2xl font-bold text-white overflow-hidden transition-all hover:bg-blue-500 active:scale-95 shadow-xl shadow-blue-500/20">
              <span className="relative z-10 flex items-center gap-2">
                Get Started Now <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </span>
            </button>
            <button onClick={() => navigate('/login')}
                    className="px-8 py-4 bg-slate-900 border border-slate-800 rounded-2xl font-bold text-white hover:bg-slate-800 transition-all active:scale-95">
              Live Demo
            </button>
          </div>

          <div className="mt-20 relative max-w-5xl mx-auto">
             <div className="absolute inset-0 bg-blue-500/20 blur-[100px] -z-10" />
             <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-4 shadow-2xl backdrop-blur">
                <div className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 aspect-video flex items-center justify-center relative group">
                  <img src="/dashboard_preview.png" alt="FMIS Dashboard Preview" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-slate-950/40">
                    <span className="px-6 py-3 bg-white text-slate-950 rounded-full font-bold shadow-2xl">View Dashboard Features</span>
                  </div>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-32 bg-slate-950 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Powerful Features, Simplified</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Everything you need to manage complex financial operations in a single, unified platform.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((f, i) => (
              <div key={i} className="group p-8 rounded-3xl border border-slate-800 bg-slate-900/40 hover:bg-slate-900/60 transition-all hover:border-slate-700">
                <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                  {f.icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{f.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof / Stats */}
      <section className="py-24 border-y border-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-12 text-center">
            {[
              { label: "Transactions Processed", val: "1.2M+" },
              { label: "Active Organizations", val: "500+" },
              { label: "Fraud Alerts Prevented", val: "15k+" },
              { label: "Uptime Guarantee", val: "99.9%" }
            ].map((s, i) => (
              <div key={i}>
                <div className="text-3xl font-bold text-white mb-1">{s.val}</div>
                <div className="text-xs text-slate-500 font-bold uppercase tracking-widest">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-blue-600/5 -z-10" />
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-8">Ready to transform your <br /> financial management?</h2>
          <p className="text-slate-400 mb-12 text-lg">
            Join hundreds of organizations using FMIS to gain absolute control over their finances. 
            Start your 30-day free trial today.
          </p>
          <button onClick={() => navigate('/register')}
                  className="px-10 py-5 bg-white text-slate-950 rounded-2xl font-bold text-lg hover:bg-blue-50 transition-all shadow-2xl shadow-white/10 active:scale-95">
            Register Your Organization
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-800/50 text-slate-500 text-sm">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <TrendingUp size={18} className="text-blue-500" />
            <span className="font-bold text-white">FMIS</span>
            <span className="ml-2">© 2026 Skylink Solutions. All rights reserved.</span>
          </div>
          <div className="flex gap-8">
            <Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
            <a href={`mailto:${supportEmail}`} className="hover:text-white transition-colors">Contact Support</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
