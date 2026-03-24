import { useState, useEffect } from 'react'
import api, { attendancesApi } from '../services/api'
import { MapPin, LogIn, LogOut, Loader2, CheckCircle2, Clock } from 'lucide-react'
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
      const res = await attendancesApi.list({ date: today })
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
          const params = { latitude: lat, longitude: lng, notes: '' }
          
          const res = type === 'check-in' 
            ? await attendancesApi.checkIn(params) 
            : await attendancesApi.checkOut(params)
          
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
    <div className="glass-card p-6 rounded-2xl border-t-4 border-t-indigo-500 hover:shadow-2xl transition-all relative overflow-hidden group min-h-[220px] flex flex-col justify-between">
      {/* Dynamic Background Glow */}
      <div className={clsx(
        "absolute -right-10 -top-10 w-40 h-40 rounded-full blur-3xl opacity-20 transition-all duration-500",
        isCompleted ? "bg-emerald-500" : isCheckedIn ? "bg-amber-500 animate-pulse" : "bg-indigo-500"
      )}></div>
      
      <div className="flex justify-between items-start relative z-10">
        <div className="flex items-center gap-3">
          <div className={clsx(
            "p-2.5 rounded-xl shadow-inner transition-transform group-hover:scale-110 group-hover:rotate-3",
            isCompleted ? "bg-emerald-500/10 text-emerald-400" : isCheckedIn ? "bg-amber-500/10 text-amber-400" : "bg-indigo-500/10 text-indigo-400"
          )}>
            <MapPin size={22} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">Staff Attendance</h3>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold mt-0.5">Verification Zone</p>
          </div>
        </div>
        
        {isCompleted ? (
          <div className="flex flex-col items-end">
            <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30 flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              <CheckCircle2 size={12} /> Shift Ended
            </span>
          </div>
        ) : isCheckedIn ? (
          <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/30 animate-pulse flex items-center gap-1.5">
             <div className="w-1.5 h-1.5 rounded-full bg-amber-400"></div> Tracking Active
          </span>
        ) : (
          <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-500 rounded-lg border border-slate-700">
            Awaiting Check-in
          </span>
        )}
      </div>

      <div className="relative z-10 mt-6 flex-1 flex flex-col justify-center">
        {isCompleted ? (
          <div className="flex flex-col items-center justify-center p-4 bg-slate-900/40 rounded-2xl border border-slate-700/50 text-center backdrop-blur-md">
            <div className="flex items-center gap-4 mb-3">
              <div className="text-left leading-tight">
                <span className="text-[10px] text-slate-500 uppercase font-black block">Clock In</span>
                <span className="text-sm font-bold text-slate-200">{new Date(attendance.check_in_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
              </div>
              <div className="h-8 w-px bg-slate-700 mx-1"></div>
              <div className="text-left leading-tight">
                <span className="text-[10px] text-slate-500 uppercase font-black block">Clock Out</span>
                <span className="text-sm font-bold text-slate-200">{new Date(attendance.check_out_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
              </div>
            </div>
            {timeInZone > 0 && (
              <div className="flex items-center gap-2 px-4 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full animate-fade-in">
                <Clock size={12} className="text-emerald-400" />
                <span className="text-xs font-bold text-emerald-400">{Math.floor(timeInZone / 60)}h {timeInZone % 60}m Active in Zone</span>
              </div>
            )}
          </div>
        ) : isCheckedIn ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between p-4 bg-indigo-950/20 rounded-2xl border border-indigo-500/20 mb-1">
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">Current Session</span>
                <span className="text-base font-black text-white">{new Date(attendance.check_in_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
              </div>
              {timeInZone > 0 ? (
                <div className="text-right">
                  <span className="text-[10px] text-indigo-400 uppercase font-black block animate-pulse">Efficiency Tracking</span>
                  <span className="text-xl font-black text-indigo-300 drop-shadow-[0_0_10px_rgba(129,140,248,0.4)]">
                    {Math.floor(timeInZone / 60)}h {timeInZone % 60}m
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-slate-500 text-xs italic">
                  <Loader2 size={12} className="animate-spin" /> Verifying zone...
                </div>
              )}
            </div>
            <button
              onClick={() => handleAction('check-out')}
              disabled={actionLoading}
              className="w-full py-4 px-6 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-black rounded-2xl transition-all shadow-[0_10px_20px_-10px_rgba(245,158,11,0.5)] active:scale-[0.98] flex items-center justify-center gap-3 uppercase tracking-widest text-sm"
            >
              {actionLoading ? <Loader2 size={18} className="animate-spin" /> : <LogOut size={20} />}
              {actionLoading ? 'Synchronizing...' : 'Terminate Shift'}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="p-4 bg-slate-800/20 rounded-2xl border border-slate-700/30 text-center">
              <p className="text-sm text-slate-400">Ready to start? Ensure you're within the geofenced perimeter.</p>
            </div>
            <button
              onClick={() => handleAction('check-in')}
              disabled={actionLoading}
              className="w-full py-4 px-6 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-black rounded-2xl transition-all shadow-[0_10px_20px_-10px_rgba(79,70,229,0.5)] active:scale-[0.98] flex items-center justify-center gap-3 uppercase tracking-widest text-sm"
            >
              {actionLoading ? <Loader2 size={18} className="animate-spin" /> : <LogIn size={20} />}
              {actionLoading ? 'Detecting Location...' : 'Establish Connection'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
