import { useState, useEffect } from 'react'
import api from '../services/api'
import { MapPin, LogIn, LogOut, Loader2, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'

export default function AttendanceWidget() {
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [attendance, setAttendance] = useState<any>(null)

  const [timeInZone, setTimeInZone] = useState<number>(0)

  useEffect(() => {
    if (attendance?.time_in_zone_minutes) {
      setTimeInZone(attendance.time_in_zone_minutes)
    }
  }, [attendance])

  useEffect(() => {
    const handlePing = (e: any) => {
      if (e.detail?.time_in_zone_minutes !== undefined) {
        setTimeInZone(e.detail.time_in_zone_minutes)
      }
    }
    window.addEventListener('attendance-ping-updated', handlePing)
    return () => window.removeEventListener('attendance-ping-updated', handlePing)
  }, [])

  const fetchTodayStatus = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const res = await api.get(`/attendances?date=${today}`)
      if (res.data.data && res.data.data.length > 0) {
        setAttendance(res.data.data[0])
      } else {
        setAttendance(null)
      }
    } catch (err) {
      console.error('Failed to fetch attendance', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTodayStatus()
  }, [])

  const handleAction = async (type: 'check-in' | 'check-out') => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser')
      return
    }

    setActionLoading(true)
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const lat = position.coords.latitude
          const lng = position.coords.longitude
          const endpoint = type === 'check-in' ? '/attendances/check-in' : '/attendances/check-out'
          
          const res = await api.post(endpoint, {
            latitude: lat,
            longitude: lng,
            notes: ''
          })
          
          if (res.status === 202) {
            toast('Attendance queued for sync!', { icon: '📶' })
            if (type === 'check-in') {
                setAttendance({ ...attendance, check_in_time: new Date().toISOString() })
                window.dispatchEvent(new CustomEvent('attendance-check-in'))
            } else {
                setAttendance({ ...attendance, check_out_time: new Date().toISOString() })
                window.dispatchEvent(new CustomEvent('attendance-check-out'))
            }
          } else {
            toast.success(`Successfully ${type.replace('-', ' ')}!`)
            window.dispatchEvent(new CustomEvent(`attendance-${type}`))
            fetchTodayStatus()
          }
        } catch (err: any) {
          toast.error(err.response?.data?.message || `Failed to ${type.replace('-', ' ')}`)
        } finally {
          setActionLoading(false)
        }
      },
      (geoError) => {
        toast.error('Failed to grab your location. Ensure permissions are granted.')
        setActionLoading(false)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }

  if (loading) {
    return (
      <div className="glass-card p-6 rounded-2xl animate-pulse">
        <div className="h-6 w-32 bg-slate-800 rounded mb-4"></div>
        <div className="h-20 w-full bg-slate-800 rounded-xl"></div>
      </div>
    )
  }

  const isCheckedIn = attendance && attendance.check_in_time && !attendance.check_out_time
  const isCompleted = attendance && attendance.check_out_time

  return (
    <div className="glass-card p-6 rounded-2xl border-t-4 border-t-indigo-500 hover:shadow-lg transition-all relative overflow-hidden group">
      <div className="absolute -right-10 -top-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
      
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <MapPin size={18} className="text-indigo-400" /> Daily Attendance
          </h3>
          <p className="text-xs text-slate-400 mt-1">Check-in at the office perimeter</p>
        </div>
        
        {isCompleted ? (
          <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 rounded-md border border-emerald-500/30 flex items-center gap-1.5">
            <CheckCircle2 size={12} /> Completed
          </span>
        ) : isCheckedIn ? (
          <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-400 rounded-md border border-amber-500/30 animate-pulse">
            Active Shift
          </span>
        ) : (
          <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-400 rounded-md border border-slate-700">
            Pending
          </span>
        )}
      </div>

      <div className="relative z-10 mt-6">
        {isCompleted ? (
          <div className="flex flex-col items-center justify-center p-4 bg-emerald-950/20 rounded-xl border border-emerald-500/20 text-center">
            <p className="text-sm font-bold text-emerald-400 mb-1">Shift Completed</p>
            <p className="text-xs text-slate-400 flex items-center justify-center gap-4">
              <span>In: {new Date(attendance.check_in_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
              <span className="w-1 h-1 rounded-full bg-slate-600"></span>
              <span>Out: {new Date(attendance.check_out_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
            </p>
            {timeInZone > 0 && (
              <p className="text-[10px] text-emerald-500 uppercase tracking-widest font-bold mt-2 bg-emerald-500/10 px-3 py-1 rounded-full">
                Time in Zone: {Math.floor(timeInZone / 60)}h {timeInZone % 60}m
              </p>
            )}
          </div>
        ) : isCheckedIn ? (
          <div className="flex flex-col items-center gap-4">
            <div className="w-full flex justify-between text-xs text-slate-400 mb-2 px-1">
              <span>Checked in at {new Date(attendance.check_in_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
              {timeInZone > 0 && (
                <span className="font-bold text-indigo-400 animate-pulse">
                  {Math.floor(timeInZone / 60)}h {timeInZone % 60}m in zone
                </span>
              )}
            </div>
            <button
              onClick={() => handleAction('check-out')}
              disabled={actionLoading}
              className="w-full py-3 px-4 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(245,158,11,0.3)] hover:shadow-[0_0_20px_rgba(245,158,11,0.5)] flex items-center justify-center gap-2"
            >
              {actionLoading ? <Loader2 size={18} className="animate-spin" /> : <LogOut size={18} />}
              {actionLoading ? 'Processing...' : 'Check Out Now'}
            </button>
          </div>
        ) : (
          <button
            onClick={() => handleAction('check-in')}
            disabled={actionLoading}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(99,102,241,0.3)] hover:shadow-[0_0_20px_rgba(99,102,241,0.5)] flex items-center justify-center gap-2"
          >
            {actionLoading ? <Loader2 size={18} className="animate-spin" /> : <LogIn size={18} />}
            {actionLoading ? 'Verifying Coordinates...' : 'Check In Now'}
          </button>
        )}
      </div>
    </div>
  )
}
