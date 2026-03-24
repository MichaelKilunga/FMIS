import { useState, useEffect } from 'react'
import api, { attendancesApi } from '../../services/api'
import { useAuthStore } from '../../store'
import { Loader2, Calendar, Clock, MapPin, Search } from 'lucide-react'
import toast from 'react-hot-toast'

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

  const canManageUsers = user?.permissions?.includes('manage-users') || user?.roles?.includes('admin') || user?.roles?.includes('director')

  const fetchRecords = async () => {
    setLoading(true)
    try {
      const res = await attendancesApi.list(dateFilter ? { date: dateFilter } : {})
      setRecords(res.data.data)
    } catch (err: any) {
      console.error('Attendance fetch error:', err.response?.data || err.message)
      toast.error('Failed to load attendance records')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRecords()
  }, [dateFilter])

  const formatTime = (timeString: string | null) => {
    if (!timeString) return '--:--'
    return new Date(timeString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in pb-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Calendar className="text-indigo-400" /> Attendance Records
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            {canManageUsers ? 'Monitor system-wide staff check-ins and check-outs.' : 'View your personal attendance history.'}
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
              className="fmis-input pl-10 h-10 w-48 text-sm bg-slate-800 border-slate-700"
            />
          </div>
        </div>
      </div>

      <div className="glass-card shadow-xl overflow-hidden rounded-2xl border border-slate-700/50">
        <div className="overflow-x-auto">
          <table className="fmis-table w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-800/80 border-b border-slate-700">
                {canManageUsers && <th className="p-4 text-xs font-bold text-slate-300 uppercase tracking-wider">Employee</th>}
                <th className="p-4 text-xs font-bold text-slate-300 uppercase tracking-wider">Date</th>
                <th className="p-4 text-xs font-bold text-slate-300 uppercase tracking-wider">Check In</th>
                <th className="p-4 text-xs font-bold text-slate-300 uppercase tracking-wider">Check Out</th>
                <th className="p-4 text-xs font-bold text-slate-300 uppercase tracking-wider">Total Shift</th>
                <th className="p-4 text-xs font-bold text-slate-300 uppercase tracking-wider">Active In Zone</th>
                <th className="p-4 text-xs font-bold text-slate-300 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {loading ? (
                <tr>
                  <td colSpan={canManageUsers ? 7 : 6} className="p-8 text-center">
                    <Loader2 className="animate-spin text-indigo-500 mx-auto" size={24} />
                    <p className="text-sm text-slate-500 mt-2">Loading records...</p>
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={canManageUsers ? 7 : 6} className="p-8 text-center text-slate-400">
                    No attendance records found for the selected criteria.
                  </td>
                </tr>
              ) : (
                records.map(record => {
                  let duration = '--'
                  if (record.check_in_time && record.check_out_time) {
                    const diffMs = new Date(record.check_out_time).getTime() - new Date(record.check_in_time).getTime()
                    const diffHrs = Math.floor(diffMs / 3600000)
                    const diffMins = Math.round(((diffMs % 3600000) / 60000))
                    duration = `${diffHrs}h ${diffMins}m`
                  }

                  return (
                    <tr key={record.id} className="hover:bg-slate-800/30 transition-colors">
                      {canManageUsers && (
                        <td className="p-4">
                          <p className="font-semibold text-slate-200">
                            {record.user ? record.user.name : `User ${record.user_id}`}
                          </p>
                          <p className="text-xs text-slate-500">{record.user?.email}</p>
                        </td>
                      )}
                      <td className="p-4">
                        <span className="text-slate-300 font-medium">{record.date}</span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Clock size={14} className="text-emerald-400" />
                          <span className="text-slate-300">{formatTime(record.check_in_time)}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Clock size={14} className="text-amber-400" />
                          <span className="text-slate-300">{formatTime(record.check_out_time)}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-slate-400 font-mono text-sm">{duration}</span>
                      </td>
                      <td className="p-4">
                        <span className="text-indigo-400 font-bold text-sm">
                          {record.time_in_zone_minutes ? `${Math.floor(record.time_in_zone_minutes / 60)}h ${record.time_in_zone_minutes % 60}m` : '0h 0m'}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-md uppercase tracking-wide border ${
                          record.status === 'present' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                          record.status === 'late' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 
                          'bg-slate-800 text-slate-400 border-slate-700'
                        }`}>
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
