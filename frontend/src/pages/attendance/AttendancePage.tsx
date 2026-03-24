import { useState, useEffect } from 'react'
import { attendancesApi } from '../../services/api'
import { useAuthStore } from '../../store'
import { Loader2, Calendar, Clock, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'

interface AttendanceRecord {
  id: number
  user_id: number
  tenant_id: number
  date: string
  check_in_time: string | null
  check_out_time: string | null
  check_in_location: any
  check_out_location: any
  status: string
  time_in_zone_minutes: number
  notes: string | null
  user?: {
    id: number
    name: string
    email: string
  }
}

export default function AttendancePage() {
  const { user } = useAuthStore()
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [dateFilter, setDateFilter] = useState('')

  const canManageUsers = !!(user?.permissions?.includes('manage-users') || user?.roles?.includes('admin') || user?.roles?.includes('director'))

  const fetchRecords = async () => {
    setLoading(true)
    try {
      const res = await attendancesApi.list(dateFilter ? { date: dateFilter } : {})
      // Extract data from paginated response
      const data = res.data?.data || []
      setRecords(Array.isArray(data) ? data : [])
    } catch (err: any) {
      console.error('Attendance fetch error:', err.response?.data || err.message)
      toast.error('Failed to load attendance records')
      setRecords([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRecords()
  }, [dateFilter, user]) // Refetch if user permissions change

  const formatTime = (timeString: string | null) => {
    if (!timeString) return '--:--'
    try {
        const date = new Date(timeString)
        if (isNaN(date.getTime())) return '--:--'
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch {
        return '--:--'
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in pb-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
             <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-[10px] font-bold text-indigo-400 uppercase tracking-widest border border-indigo-500/20">
                Attendance Module
             </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white flex items-center gap-3">
            <Calendar className="text-indigo-400" size={32} /> Attendance Records
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            {canManageUsers ? 'Monitor system-wide staff check-ins, check-outs, and zone active time.' : 'Review your personal check-in history and efficiency stats.'}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={16} className="text-slate-500" />
            </div>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="fmis-input pl-10 h-10 w-48 text-sm bg-slate-800/50 border-slate-700/50 focus:border-indigo-500/50 transition-all"
            />
          </div>
        </div>
      </div>

      <div className="glass-card shadow-xl overflow-hidden rounded-2xl border border-slate-700/40 backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="fmis-table w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-800/60 border-b border-slate-700/50">
                {canManageUsers && <th className="p-4 text-xs font-bold text-slate-300 uppercase tracking-widest">Employee</th>}
                <th className="p-4 text-xs font-bold text-slate-300 uppercase tracking-widest">Date</th>
                <th className="p-4 text-xs font-bold text-slate-300 uppercase tracking-widest text-center">Clock In</th>
                <th className="p-4 text-xs font-bold text-slate-300 uppercase tracking-widest text-center">Clock Out</th>
                <th className="p-4 text-xs font-bold text-slate-300 uppercase tracking-widest text-center">Total Shift</th>
                <th className="p-4 text-xs font-bold text-slate-300 uppercase tracking-widest text-center">Active In Zone</th>
                <th className="p-4 text-xs font-bold text-slate-300 uppercase tracking-widest text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {loading ? (
                <tr>
                  <td colSpan={canManageUsers ? 7 : 6} className="p-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="animate-spin text-indigo-500" size={32} />
                      <p className="text-sm font-medium text-slate-400">Fetching records...</p>
                    </div>
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={canManageUsers ? 7 : 6} className="p-16 text-center">
                    <p className="text-slate-500 font-medium italic">No attendance records found for this period.</p>
                  </td>
                </tr>
              ) : (
                records.map(record => {
                  let duration = '--'
                  if (record.check_in_time && record.check_out_time) {
                    const diffMs = new Date(record.check_out_time).getTime() - new Date(record.check_in_time).getTime()
                    if (!isNaN(diffMs) && diffMs > 0) {
                        const diffHrs = Math.floor(diffMs / 3600000)
                        const diffMins = Math.round(((diffMs % 3600000) / 60000))
                        duration = `${diffHrs}h ${diffMins}m`
                    }
                  }

                  return (
                    <tr key={record.id} className="hover:bg-slate-800/20 transition-all duration-200 group">
                      {canManageUsers && (
                        <td className="p-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-200 group-hover:text-indigo-300 transition-colors">
                                {record.user ? record.user.name : `User ID: ${record.user_id}`}
                            </span>
                            <span className="text-[10px] text-slate-500 font-medium">{record.user?.email || 'No email'}</span>
                          </div>
                        </td>
                      )}
                      <td className="p-4">
                        <span className="text-slate-300 font-medium">{record.date}</span>
                      </td>
                      <td className="p-4 text-center">
                        <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-emerald-500/5 text-emerald-400 rounded-lg border border-emerald-500/10 text-xs font-bold">
                          <Clock size={12} /> {formatTime(record.check_in_time)}
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-amber-500/5 text-amber-400 rounded-lg border border-amber-500/10 text-xs font-bold">
                          <Clock size={12} /> {formatTime(record.check_out_time)}
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <span className="text-slate-400 font-mono text-xs">{duration}</span>
                      </td>
                      <td className="p-4 text-center">
                        <span className={clsx(
                            "font-black text-sm transition-all",
                            record.time_in_zone_minutes > 0 ? "text-indigo-400 drop-shadow-[0_0_8px_rgba(129,140,248,0.3)]" : "text-slate-600"
                        )}>
                          {record.time_in_zone_minutes ? `${Math.floor(record.time_in_zone_minutes / 60)}h ${record.time_in_zone_minutes % 60}m` : '0h 0m'}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <span className={clsx(
                            "px-2.5 py-1 text-[10px] font-black rounded-md uppercase tracking-widest border transition-all",
                            record.status === 'present' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]' : 
                            record.status === 'late' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 
                            'bg-slate-800 text-slate-500 border-slate-700'
                        )}>
                          {record.status}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
