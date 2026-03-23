import React, { useEffect, useState } from 'react'
import { usePwaStore } from '../../store'
import { Download, X } from 'lucide-react'

export default function PwaInstallBanner() {
  const { deferredPrompt, isInstallable, isInstalled } = usePwaStore()
  const [show, setShow] = useState(false)

  useEffect(() => {
    // Show banner after a short delay if installable and not installed
    if (isInstallable && !isInstalled) {
      const timer = setTimeout(() => setShow(true), 3000)
      return () => clearTimeout(timer)
    }
  }, [isInstallable, isInstalled])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    console.log(`User response to the install prompt: ${outcome}`)
    
    if (outcome === 'accepted') {
      setShow(false)
    }
  }

  if (!show || isInstalled) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-8 duration-500 md:left-auto md:w-96">
      <div className="overflow-hidden rounded-2xl border border-blue-500/20 bg-slate-900/90 p-4 shadow-2xl backdrop-blur-xl ring-1 ring-white/10">
        <button 
          onClick={() => setShow(false)}
          className="absolute right-2 top-2 rounded-full p-1 text-slate-400 hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
        
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400">
            <Download className="h-6 w-6" />
          </div>
          
          <div className="flex-1">
            <h3 className="font-semibold text-white">Install FMIS App</h3>
            <p className="text-sm text-slate-400">Install for faster access and offline use.</p>
          </div>
        </div>
        
        <button
          onClick={handleInstall}
          className="mt-4 w-full rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-blue-500/20 hover:bg-blue-500 active:scale-95 transition-all"
        >
          Install Now
        </button>
      </div>
    </div>
  )
}
