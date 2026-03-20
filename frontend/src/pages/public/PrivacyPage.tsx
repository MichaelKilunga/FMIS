import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { TrendingUp, ArrowLeft, Loader2 } from 'lucide-react'
import { settingsApi } from '../../services/api'

export default function PrivacyPage() {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    settingsApi.getSystemSettings()
      .then(res => setContent(res.data['system.privacy_policy'] || 'Privacy policy content coming soon.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-12">
          <Link to="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
            <ArrowLeft size={20} /> Back to Home
          </Link>
          <div className="flex items-center gap-2">
            <TrendingUp size={24} className="text-blue-500" />
            <span className="text-xl font-bold text-white">FMIS</span>
          </div>
        </div>

        <div className="glass-card p-8 md:p-12 min-h-[60vh] prose prose-invert max-w-none">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <Loader2 size={40} className="animate-spin text-blue-500" />
              <p className="text-slate-500">Loading Privacy Policy...</p>
            </div>
          ) : (
            <div dangerouslySetInnerHTML={{ __html: formatMarkdown(content) }} />
          )}
        </div>

        <footer className="mt-12 text-center text-slate-600 text-sm">
          © 2026 Skylink Solutions. All rights reserved.
        </footer>
      </div>
    </div>
  )
}

function formatMarkdown(text: string) {
  // Simple markdown-to-html converter for basic needs
  return text
    .replace(/^# (.*$)/gim, '<h1 class="text-3xl font-bold mb-6 text-white">$1</h1>')
    .replace(/^## (.*$)/gim, '<h2 class="text-2xl font-bold mt-8 mb-4 text-white">$1</h2>')
    .replace(/^### (.*$)/gim, '<h3 class="text-xl font-bold mt-6 mb-3 text-white">$1</h3>')
    .replace(/^\d\. (.*$)/gim, '<li class="ml-4 mb-2 list-decimal">$1</li>')
    .replace(/^\* (.*$)/gim, '<li class="ml-4 mb-2 list-disc">$1</li>')
    .replace(/\n\n/gim, '<div class="mb-4"></div>')
}
