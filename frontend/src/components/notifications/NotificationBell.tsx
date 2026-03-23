import { useState, useEffect, useRef } from 'react'
import { Bell, Check, Info, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { notificationsApi } from '../../services/api'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import toast from 'react-hot-toast'

export interface AppNotification {
  id: string
  type: string
  notifiable_type: string
  notifiable_id: number
  data: {
    title: string
    content: string
    action?: { label: string; url: string }
    type: 'info' | 'success' | 'warning' | 'error'
    metadata?: Record<string, any>
  }
  read_at: string | null
  created_at: string
  updated_at: string
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 60000) // refresh every minute
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchNotifications = async () => {
    try {
      const { data } = await notificationsApi.list()
      setNotifications(data.data)
      setUnreadCount(data.meta.unread_count)
    } catch (err) {
      console.error('Failed to fetch notifications')
    }
  }

  const markAsRead = async (id: string) => {
    try {
      await notificationsApi.markAsRead(id)
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch {
      toast.error('Failed to mark notification as read')
    }
  }

  const markAllAsRead = async () => {
    try {
      await notificationsApi.markAllAsRead()
      setNotifications(prev => prev.map(n => ({ ...n, read_at: new Date().toISOString() })))
      setUnreadCount(0)
      toast.success('All marked as read')
    } catch {
      toast.error('Failed to mark all as read')
    }
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle size={16} className="text-emerald-400" />
      case 'warning': return <AlertTriangle size={16} className="text-yellow-400" />
      case 'error': return <XCircle size={16} className="text-red-400" />
      default: return <Info size={16} className="text-blue-400" />
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-700 transition-colors relative"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
        )}
      </button>

      {open && (
        <div className="fixed right-4 top-20 w-[calc(100vw-32px)] sm:w-96 bg-slate-800 border border-slate-700/60 rounded-2xl py-2 z-[9999] animate-fade-in shadow-2xl">
          <div className="flex items-center justify-between px-4 pb-2 border-b border-slate-700/50">
            <h3 className="font-semibold text-slate-200">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto mt-1 custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-sm">
                No notifications yet
              </div>
            ) : (
              <div className="flex flex-col">
                {notifications.map(n => (
                  <div
                    key={n.id}
                    className={clsx(
                      'px-4 py-3 flex gap-3 transition-colors',
                      n.read_at ? 'opacity-70 hover:bg-slate-800' : 'bg-slate-800/50 hover:bg-slate-700'
                    )}
                  >
                    <div className="mt-1 shrink-0">{getIcon(n.data.type)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-200">{n.data.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{n.data.content}</p>
                      
                      <div className="flex items-center justify-between mt-2">
                        {n.data.action ? (
                          <Link
                            to={n.data.action.url}
                            onClick={() => !n.read_at && markAsRead(n.id)}
                            className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
                          >
                            {n.data.action.label}
                          </Link>
                        ) : <div />}
                        
                        <span className="text-[10px] text-slate-500">
                          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                    {!n.read_at && (
                      <button
                        onClick={() => markAsRead(n.id)}
                        className="p-1 text-slate-500 hover:text-slate-300 transition-colors"
                        title="Mark as read"
                      >
                        <Check size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
