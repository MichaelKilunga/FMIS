import { useState } from 'react'
import { Link } from 'react-router-dom'
import { authApi } from '../../services/api'
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('loading')
    setMessage('')
    try {
      const res = await authApi.forgotPassword(email)
      setStatus('success')
      setMessage(res.data.message || 'Password reset link sent to your email.')
    } catch (error: any) {
      setStatus('error')
      setMessage(error.response?.data?.message || 'Failed to send reset link. Please try again.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 p-4 relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none opacity-20 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-500/20 via-gray-900 to-gray-950 blur-3xl" />
      
      <div className="max-w-md w-full relative z-10 backdrop-blur-xl bg-gray-900/60 p-8 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] border border-gray-800/50">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">Forgot password?</h2>
          <p className="text-gray-400">No worries, we'll send you reset instructions.</p>
        </div>

        {status === 'success' ? (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-emerald-300 text-sm">{message}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {status === 'error' && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <p className="text-red-300 text-sm">{message}</p>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1.5">
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all duration-200"
                placeholder="you@example.com"
              />
            </div>

            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === 'loading' ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                'Reset password'
              )}
            </button>
          </form>
        )}

        <div className="mt-8 text-center text-sm text-gray-400 flex items-center justify-center gap-2">
          <Link to="/login" className="font-medium text-indigo-400 hover:text-indigo-300 transition-colors">
            &larr; Back to log in
          </Link>
        </div>
      </div>
    </div>
  )
}
