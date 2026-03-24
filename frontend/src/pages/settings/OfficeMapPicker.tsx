import { useState, useEffect, useCallback } from 'react'
import { GoogleMap, useJsApiLoader, Marker, Circle } from '@react-google-maps/api'
import { settingsApi } from '../../services/api'
import { useSettingsStore } from '../../store'
import toast from 'react-hot-toast'
import { MapPin, Save, Loader2, Plus, Trash2, Map } from 'lucide-react'

const containerStyle = {
  width: '100%',
  height: '400px',
  borderRadius: '0.75rem'
}

const defaultCenter = { lat: -6.7924, lng: 39.2083 }

interface OfficeLocation {
  id: string
  name: string
  lat: number
  lng: number
  radius: number
}

export default function OfficeMapPicker() {
  const { settings, setSettings } = useSettingsStore()
  const [apiKey, setApiKey] = useState<string>('')
  const [loadingKey, setLoadingKey] = useState(true)
  const [saving, setSaving] = useState(false)

  const [locations, setLocations] = useState<OfficeLocation[]>([])
  const [activeLocationId, setActiveLocationId] = useState<string | null>(null)
  
  // Center map on the active location or default
  const [mapCenter, setMapCenter] = useState(defaultCenter)

  // Fetch google maps api key
  useEffect(() => {
    settingsApi.getSystemSettings().then(res => {
      const key = res.data['maps.google_api_key']
      if (key) setApiKey(key)
    }).finally(() => setLoadingKey(false))
  }, [])

  // Load existing tenant settings
  useEffect(() => {
    try {
      if (settings['office_locations']) {
        const parsed = JSON.parse(settings['office_locations'] as string)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setLocations(parsed)
          setMapCenter({ lat: parsed[0].lat, lng: parsed[0].lng })
          setActiveLocationId(parsed[0].id)
        }
      } else if (settings['office_latitude'] && settings['office_longitude']) {
        // Legacy migration
        const legacy: OfficeLocation = {
          id: Date.now().toString(),
          name: 'Main Office',
          lat: parseFloat(settings['office_latitude'] as string),
          lng: parseFloat(settings['office_longitude'] as string),
          radius: parseFloat(settings['office_radius'] as string) || 500
        }
        setLocations([legacy])
        setMapCenter({ lat: legacy.lat, lng: legacy.lng })
        setActiveLocationId(legacy.id)
      }
    } catch (e) {
      console.error('Failed to parse locations', e)
    }
  }, [settings])

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey,
  })

  const activeLocation = locations.find(l => l.id === activeLocationId)

  const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (e.latLng && activeLocationId) {
      updateLocation(activeLocationId, { 
        lat: e.latLng.lat(), 
        lng: e.latLng.lng() 
      })
    }
  }, [activeLocationId, locations])

  const handleMarkerDragEnd = useCallback((id: string, e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      updateLocation(id, { lat: e.latLng.lat(), lng: e.latLng.lng() })
      setActiveLocationId(id)
    }
  }, [locations])

  const addLocation = () => {
    const newLoc: OfficeLocation = {
      id: Date.now().toString(),
      name: `Office ${locations.length + 1}`,
      lat: mapCenter.lat + 0.005,
      lng: mapCenter.lng + 0.005,
      radius: 500
    }
    setLocations([...locations, newLoc])
    setActiveLocationId(newLoc.id)
    setMapCenter({ lat: newLoc.lat, lng: newLoc.lng })
  }

  const removeLocation = (id: string) => {
    const filtered = locations.filter(l => l.id !== id)
    setLocations(filtered)
    if (activeLocationId === id) {
      setActiveLocationId(filtered.length > 0 ? filtered[0].id : null)
    }
  }

  const updateLocation = (id: string, updates: Partial<OfficeLocation>) => {
    setLocations(locations.map(loc => loc.id === id ? { ...loc, ...updates } : loc))
  }

  const savePerimeter = async () => {
    setSaving(true)
    try {
      const payload = [
        { key: 'office_locations', value: JSON.stringify(locations), group: 'attendance', type: 'json' }
      ]
      await settingsApi.setBulk(payload)
      const res = await settingsApi.all()
      setSettings(res.data)
      toast.success('Office perimeters saved successfully')
    } catch {
      toast.error('Failed to save office perimeters')
    } finally {
      setSaving(false)
    }
  }

  if (loadingKey) return <div className="p-4 text-center text-slate-400">Loading map configuration...</div>
  if (!apiKey) return <div className="p-4 text-center text-slate-400 border border-slate-700/50 rounded-xl bg-slate-800/30">Google Maps API key is not configured in system settings.</div>
  if (loadError) return <div className="p-4 text-center text-red-400">Error loading maps.</div>

  return (
    <div className="glass-card p-6 mt-6 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Map size={18} className="text-blue-400" /> Authorized Office Locations
          </h2>
          <p className="text-sm text-slate-400 mt-1">Configure multiple office perimeters for decentralized staff check-ins.</p>
        </div>
        <button onClick={addLocation} className="btn-secondary text-xs flex items-center gap-1">
          <Plus size={14} /> Add Location
        </button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 relative border border-slate-700/50 rounded-xl overflow-hidden bg-slate-800 shadow-inner">
          {isLoaded ? (
            <GoogleMap
              mapContainerStyle={containerStyle}
              center={mapCenter}
              zoom={13}
              onClick={handleMapClick}
              options={{
                streetViewControl: false,
                mapTypeControl: false,
                styles: [
                  { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
                  { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
                  { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
                  { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] }
                ]
              }}
            >
              {locations.map(loc => (
                <div key={loc.id}>
                  <Marker 
                    position={{ lat: loc.lat, lng: loc.lng }} 
                    draggable 
                    onDragEnd={(e) => handleMarkerDragEnd(loc.id, e)}
                    onClick={() => setActiveLocationId(loc.id)}
                    icon={activeLocationId === loc.id ? 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png' : 'http://maps.google.com/mapfiles/ms/icons/red-dot.png'}
                  />
                  <Circle
                    center={{ lat: loc.lat, lng: loc.lng }}
                    radius={loc.radius}
                    options={{
                      fillColor: activeLocationId === loc.id ? '#3B82F6' : '#EF4444',
                      fillOpacity: 0.2,
                      strokeColor: activeLocationId === loc.id ? '#3B82F6' : '#EF4444',
                      strokeOpacity: 0.8,
                      strokeWeight: activeLocationId === loc.id ? 2 : 1,
                    }}
                  />
                </div>
              ))}
            </GoogleMap>
          ) : (
             <div className="w-full h-[400px] flex items-center justify-center">
                <Loader2 className="animate-spin text-blue-500" size={30} />
             </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
            {locations.length === 0 && <p className="text-sm text-slate-500 text-center py-4">No locations added yet.</p>}
            {locations.map((loc) => (
              <div 
                key={loc.id} 
                onClick={() => { setActiveLocationId(loc.id); setMapCenter({ lat: loc.lat, lng: loc.lng }) }}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${activeLocationId === loc.id ? 'bg-blue-900/20 border-blue-500/50' : 'bg-slate-800/50 border-slate-700/50 hover:bg-slate-800'}`}
              >
                <div className="flex justify-between items-center mb-2">
                  <input 
                    type="text" 
                    value={loc.name}
                    onChange={(e) => updateLocation(loc.id, { name: e.target.value })}
                    className="bg-transparent text-sm font-bold text-white outline-none w-2/3"
                    placeholder="Location Name"
                  />
                  <button onClick={(e) => { e.stopPropagation(); removeLocation(loc.id); }} className="text-slate-500 hover:text-red-400 p-1">
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}
                </div>
              </div>
            ))}
          </div>

          {activeLocation && (
            <div className="pt-4 border-t border-slate-700/50 animate-fade-in space-y-4">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Edit: {activeLocation.name}</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="fmis-label text-[10px]">Lat</label>
                  <input type="number" value={activeLocation.lat} onChange={e => updateLocation(activeLocation.id, { lat: parseFloat(e.target.value) })} className="fmis-input px-2 py-1.5 text-xs font-mono" />
                </div>
                <div>
                  <label className="fmis-label text-[10px]">Lng</label>
                  <input type="number" value={activeLocation.lng} onChange={e => updateLocation(activeLocation.id, { lng: parseFloat(e.target.value) })} className="fmis-input px-2 py-1.5 text-xs font-mono" />
                </div>
              </div>
              <div>
                <label className="fmis-label text-[10px] flex justify-between">
                  <span>Geofence Radius</span> <span>{activeLocation.radius}m</span>
                </label>
                <input 
                  type="range" min={50} max={2000} step={50}
                  value={activeLocation.radius} 
                  onChange={e => updateLocation(activeLocation.id, { radius: parseInt(e.target.value) })} 
                  className="w-full accent-blue-500" 
                />
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-slate-700/50">
            <button onClick={savePerimeter} disabled={saving} className="btn-primary w-full">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} 
              Save All Locations
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
