import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { TrendingUp, Eye, EyeOff, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { authApi, settingsApi } from '../../services/api'
import { useAuthStore, useSettingsStore, applyBranding } from '../../store'

const schema = z.object({
  email:    z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})
type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const { setSettings } = useSettingsStore()
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      const res = await authApi.login(data.email, data.password)
      const { token, user } = res.data
      setAuth(user, token)

      // Load settings and apply branding
      try {
        const settingsRes = await settingsApi.all()
        setSettings(settingsRes.data)
      } catch {}

      toast.success(`Welcome back, ${user.name}!`)
      navigate('/app/dashboard')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Login failed. Check your credentials.'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-10 blur-3xl"
             style={{ background: 'var(--color-primary)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full opacity-10 blur-3xl"
             style={{ background: 'var(--color-accent)' }} />
      </div>

      <div className="relative z-10 w-full max-w-md animate-fade-in">
        {/* Logo / Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
               style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))' }}>
            <TrendingUp size={28} className="text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-white">FMIS</h1>
          <p className="text-slate-400 text-sm mt-1">Financial Management & Intelligence System</p>
        </div>

        {/* Form card */}
        <div className="glass-card p-8">
          <h2 className="text-xl font-semibold text-white mb-6">Sign in to your account</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="fmis-label">Email address</label>
              <input {...register('email')} type="email" placeholder="you@company.com" className="fmis-input" autoComplete="email" />
              {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>}
            </div>

            <div>
              <label className="fmis-label">Password</label>
              <div className="relative">
                <input {...register('password')} type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••" className="fmis-input pr-10" autoComplete="current-password" />
                <button type="button" onClick={() => setShowPassword(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password.message}</p>}
            </div>

            <button type="submit" disabled={loading}
              className="btn-primary w-full justify-center py-3 text-base mt-2">
              {loading ? <><Loader2 size={18} className="animate-spin" /> Signing in...</> : 'Sign in'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-700/50 text-center">
            <p className="text-sm text-slate-400">
              Don't have an account? <button onClick={() => navigate('/register')} className="text-blue-400 font-bold hover:underline">Register your Tenant</button>
            </p>
            <div className="mt-4 pt-4 border-t border-slate-800/50">
              <p className="text-xs text-slate-500">
                Demo credentials: <span className="text-slate-300 font-mono">director@skylinksolutions.co</span> / <span className="text-slate-300 font-mono">password</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
