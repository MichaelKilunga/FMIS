import { useEffect, useRef, useState } from 'react'
import api from '../services/api'
import { toast } from 'react-hot-toast'

export default function GlobalLocationTracker() {
  const [isActive, setIsActive] = useState(false)
  const watchId = useRef<number | null>(null)
  const lastPingTime = useRef<number>(0)

  // 5 minutes in milliseconds
  const PING_INTERVAL_MS = 300000

  useEffect(() => {
    // Check initial state from backend when first loaded
    const checkInitialStatus = async () => {
      try {
        const todayStr = new Date().toISOString().split('T')[0]
        const res = await api.get('/attendances', { params: { date: todayStr } })
        const activeRecord = res.data.data?.find((a: any) => !a.check_out_time)
        if (activeRecord) {
          setIsActive(true)
        }
      } catch (err) {
        // ignore
      }
    }
    checkInitialStatus()

    // Listen to custom events from AttendanceWidget
    const handleCheckIn = () => setIsActive(true)
    const handleCheckOut = () => {
      setIsActive(false)
      // immediately clear watch to save battery
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current)
        watchId.current = null
      }
    }

    window.addEventListener('attendance-check-in', handleCheckIn)
    window.addEventListener('attendance-check-out', handleCheckOut)

    return () => {
      window.removeEventListener('attendance-check-in', handleCheckIn)
      window.removeEventListener('attendance-check-out', handleCheckOut)
    }
  }, [])

  useEffect(() => {
    if (!isActive) return

    if (!('geolocation' in navigator)) {
      console.warn('Geolocation not supported.')
      return
    }

    const pingBackend = async (lat: number, lng: number) => {
      const now = Date.now()
      if (now - lastPingTime.current < PING_INTERVAL_MS) {
        return
      }

      try {
        const res = await api.post('/attendances/ping', {
          latitude: lat,
          longitude: lng,
          recorded_at: new Date(now).toISOString()
        })
        
        lastPingTime.current = Date.now()
        
        // Broadcast new time_in_zone to UI components (like AttendanceWidget)
        if (res.data?.time_in_zone_minutes !== undefined) {
           window.dispatchEvent(new CustomEvent('attendance-ping-updated', {
             detail: res.data
           }))
        }
      } catch (err: any) {
        // Stop tracker if backend says no active check in
        if (err.response?.status === 400 && err.response?.data?.message?.includes('No active check-in')) {
          setIsActive(false)
        }
      }
    }

    // We use watchPosition which is the best approach for PWA tracking
    watchId.current = navigator.geolocation.watchPosition(
      (position) => {
        pingBackend(position.coords.latitude, position.coords.longitude)
      },
      (err) => {
        console.warn('Tracker geolocation error:', err)
      },
      {
        enableHighAccuracy: true,
        maximumAge: 30000, 
        timeout: 27000
      }
    )

    // Additionally fire a ping interval to ensure we still ping if user is perfectly still 
    // and watchPosition isn't aggressively firing
    const fallbackTimer = setInterval(() => {
      navigator.geolocation.getCurrentPosition((pos) => {
        pingBackend(pos.coords.latitude, pos.coords.longitude)
      }, () => {}, { enableHighAccuracy: true, maximumAge: 60000 })
    }, PING_INTERVAL_MS)

    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current)
      }
      clearInterval(fallbackTimer)
    }
  }, [isActive])

  return null // Headless component
}
