import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

export default function Modal({
  isOpen, onClose, title, children
}: {
  isOpen: boolean; onClose: () => void; title: string; children: ReactNode;
}) {
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!isOpen || !mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="relative glass-card w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto animate-fade-in shadow-2xl border border-slate-700/50">
         <div className="flex items-center justify-between mb-6">
           <h2 className="text-xl font-bold text-white">{title}</h2>
           <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors">
              <X size={20} />
           </button>
         </div>
         {children}
      </div>
    </div>,
    document.body
  )
}
