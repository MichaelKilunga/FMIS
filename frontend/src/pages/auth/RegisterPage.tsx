import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { TrendingUp, User, Building2, ArrowRight, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { authApi } from '../../services/api'
import { useAuthStore } from '../../store'

const schema = z.object({
  director_name:     z.string().min(2, 'Name must be at least 2 characters'),
  email:             z.string().email('Invalid email address'),
  password:          z.string().min(8, 'Password must be at least 8 characters'),
  password_confirmation: z.string(),
  organization_name: z.string().min(2, 'Organization name must be at least 2 characters'),
  phone:             z.string().optional(),
  address:           z.string().optional(),
}).refine((data) => data.password === data.password_confirmation, {
  message: "Passwords don't match",
  path: ["password_confirmation"],
})

type FormData = z.infer<typeof schema>

export default function RegisterPage() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, trigger, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onBlur'
  })

  const nextStep = async () => {
    const fields = step === 1 
      ? ['director_name', 'email', 'password', 'password_confirmation'] 
      : ['organization_name', 'phone', 'address']
    
    const isValid = await trigger(fields as any)
    if (isValid) setStep(s => s + 1)
  }

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      const res = await authApi.register(data)
      const { token, user, tenant } = res.data
      setAuth(user, token, tenant)
      toast.success(`Welcome to FMIS, ${user.name}! Your organization is ready.`)
      navigate('/app/dashboard')
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Registration failed. Please try again.'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-blue-600/10 blur-3xl opacity-50" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-emerald-600/10 blur-3xl opacity-50" />
      </div>

      <div className="relative z-10 w-full max-w-xl animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-10">
          <Link to="/" className="inline-flex items-center gap-3 group">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform">
              <TrendingUp size={24} className="text-white" />
            </div>
            <span className="text-3xl font-black text-white tracking-tight">FMIS</span>
          </Link>
          <h1 className="text-2xl font-bold text-white mt-6">Register Your Organization</h1>
          <p className="text-slate-400 text-sm mt-2">Start your 30-day free trial today.</p>
        </div>

        {/* Progress Stepper */}
        <div className="flex items-center justify-center mb-10 gap-4">
          <div className={`flex items-center gap-2 ${step >= 1 ? 'text-blue-400' : 'text-slate-600'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step >= 1 ? 'border-blue-400 bg-blue-400/10' : 'border-slate-800'}`}>
              {step > 1 ? <CheckCircle2 size={16} /> : '1'}
            </div>
            <span className="text-sm font-bold">Director</span>
          </div>
          <div className="w-12 h-px bg-slate-800" />
          <div className={`flex items-center gap-2 ${step >= 2 ? 'text-blue-400' : 'text-slate-600'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step >= 2 ? 'border-blue-400 bg-blue-400/10' : 'border-slate-800'}`}>
              2
            </div>
            <span className="text-sm font-bold">Organization</span>
          </div>
        </div>

        {/* Form Card */}
        <div className="glass-card p-8 md:p-10">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {step === 1 && (
              <div className="space-y-5 animate-slide-up">
                <div className="flex items-center gap-3 mb-6 text-slate-300">
                  <User className="text-blue-400" size={20} />
                  <h3 className="font-bold">Director Details</h3>
                </div>
                
                <div>
                  <label className="fmis-label">Full Name</label>
                  <input {...register('director_name')} placeholder="e.g. John Doe" className="fmis-input" />
                  {errors.director_name && <p className="mt-1 text-xs text-red-400">{errors.director_name.message}</p>}
                </div>

                <div>
                  <label className="fmis-label">Work Email</label>
                  <input {...register('email')} type="email" placeholder="john@company.com" className="fmis-input" />
                  {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="fmis-label">Password</label>
                    <input {...register('password')} type="password" placeholder="••••••••" className="fmis-input" />
                    {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password.message}</p>}
                  </div>
                  <div>
                    <label className="fmis-label">Confirm Password</label>
                    <input {...register('password_confirmation')} type="password" placeholder="••••••••" className="fmis-input" />
                    {errors.password_confirmation && <p className="mt-1 text-xs text-red-400">{errors.password_confirmation.message}</p>}
                  </div>
                </div>

                <button type="button" onClick={nextStep} 
                        className="btn-primary w-full justify-center py-4 mt-4 group">
                  Continue to Organization <ArrowRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5 animate-slide-up">
                <div className="flex items-center gap-3 mb-6 text-slate-300">
                  <Building2 className="text-emerald-400" size={20} />
                  <h3 className="font-bold">Organization Details</h3>
                </div>

                <div>
                  <label className="fmis-label">Organization Name</label>
                  <input {...register('organization_name')} placeholder="e.g. Acme Corporation" className="fmis-input" />
                  {errors.organization_name && <p className="mt-1 text-xs text-red-400">{errors.organization_name.message}</p>}
                </div>

                <div>
                  <label className="fmis-label">Phone Number (Optional)</label>
                  <input {...register('phone')} placeholder="+255..." className="fmis-input" />
                </div>

                <div>
                  <label className="fmis-label">Physical Address (Optional)</label>
                  <textarea {...register('address')} placeholder="123 Innovation St..." className="fmis-input min-h-[100px]" />
                </div>

                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setStep(1)} 
                          className="flex-1 px-6 py-4 bg-slate-900 border border-slate-800 rounded-2xl font-bold text-white hover:bg-slate-800 transition-all flex items-center justify-center gap-2">
                    <ArrowLeft size={18} /> Back
                  </button>
                  <button type="submit" disabled={loading}
                          className="flex-[2] btn-primary justify-center py-4">
                    {loading ? <><Loader2 size={18} className="animate-spin mr-2" /> Initializing...</> : 'Complete Registration'}
                  </button>
                </div>
              </div>
            )}
          </form>

          <div className="mt-8 pt-6 border-t border-slate-800/50 text-center">
            <p className="text-sm text-slate-500">
              Already have an account? <Link to="/login" className="text-blue-400 font-bold hover:underline">Sign In</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
