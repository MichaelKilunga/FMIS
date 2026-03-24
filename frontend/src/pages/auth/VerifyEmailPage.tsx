import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { authApi } from '../../services/api'
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { useAuthStore } from '../../store'

export default function VerifyEmailPage() {
  const { id, hash } = useParams()
  const navigate = useNavigate()
  const { setUser } = useAuthStore()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const verify = async () => {
      if (!id || !hash) {
        setStatus('error')
        setMessage('Invalid verification link.')
        return
      }

      try {
        const res = await authApi.verifyEmail(id, hash)
        setStatus('success')
        setMessage(res.data.message || 'Email verified successfully!')
        
        // Refresh user data if logged in
        try {
          const meRes = await authApi.me()
          setUser(meRes.data)
        } catch {
          // Not logged in or failed to refresh, that's fine
        }
      } catch (error: any) {
        setStatus('error')
        setMessage(error.response?.data?.message || 'Verification failed. The link may have expired.')
      }
    }

    verify()
  }, [id, hash, setUser])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 p-4 relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none opacity-20 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-500/20 via-gray-900 to-gray-950 blur-3xl" />
      
      <div className="max-w-md w-full relative z-10 backdrop-blur-xl bg-gray-900/60 p-8 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] border border-gray-800/50 text-center">
        {status === 'loading' && (
          <div className="space-y-4">
            <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mx-auto" />
            <h2 className="text-2xl font-bold text-white">Verifying your email...</h2>
            <p className="text-gray-400">Please wait while we confirm your email address.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-6">
            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-10 h-10 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold text-white">Email Verified!</h2>
            <p className="text-gray-400">{message}</p>
            <div className="pt-4">
              <Link
                to="/app/dashboard"
                className="inline-block w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors"
              >
                Go to Dashboard
              </Link>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-6">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-10 h-10 text-red-400" />
            </div>
            <h2 className="text-2xl font-bold text-white">Verification Failed</h2>
            <p className="text-gray-400">{message}</p>
            <div className="pt-4">
              <Link
                to="/app/profile"
                className="inline-block w-full py-3 px-4 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-medium transition-colors"
              >
                Go to Profile
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
