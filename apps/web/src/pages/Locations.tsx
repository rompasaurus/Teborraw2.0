import { useState, useEffect, useMemo, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
  Circle,
} from 'react-leaflet'
import L from 'leaflet'
import {
  MapPin,
  Calendar,
  Clock,
  Navigation,
  Download,
  ChevronLeft,
  ChevronRight,
  Layers,
  Play,
  Pause,
  RotateCcw,
} from 'lucide-react'
import { Layout } from '@/components/Layout'
import { locationsApi } from '@/services/api'
import type {
  LocationPoint,
  LocationSummary,
  HeatmapPoint,
} from '@/types/location'

// Fix for default marker icons in Leaflet with webpack/vite
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
})

// Custom marker icon
const createMarkerIcon = (color: string = '#0ea5e9') => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      background-color: ${color};
      width: 12px;
      height: 12px;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  })
}

// Map view controller
function MapController({
  center,
  zoom,
}: {
  center: [number, number]
  zoom: number
}) {
  const map = useMap()

  useEffect(() => {
    if (center[0] !== 0 && center[1] !== 0) {
      map.setView(center, zoom)
    }
  }, [center, zoom, map])

  return null
}

// Heat map layer using circles
function HeatmapLayer({ points }: { points: HeatmapPoint[] }) {
  return (
    <>
      {points.map((point, index) => (
        <Circle
          key={index}
          center={[point.latitude, point.longitude]}
          radius={50 + point.intensity * 200}
          pathOptions={{
            color: 'transparent',
            fillColor: `hsl(${200 - point.intensity * 200}, 70%, 50%)`,
            fillOpacity: 0.3 + point.intensity * 0.4,
          }}
        />
      ))}
    </>
  )
}

export function Locations() {
  const [dateRange, setDateRange] = useState<{
    start: string
    end: string
  }>(() => {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - 7)
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    }
  })

  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [showHeatmap, setShowHeatmap] = useState(false)
  const [showPath, setShowPath] = useState(true)
  const [selectedLocation, setSelectedLocation] = useState<LocationPoint | null>(null)
  const [playbackIndex, setPlaybackIndex] = useState<number | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  // Fetch locations
  const { data: locationsData, isLoading: locationsLoading } = useQuery({
    queryKey: ['locations', dateRange],
    queryFn: async () => {
      const response = await locationsApi.list({
        startDate: dateRange.start,
        endDate: dateRange.end,
        pageSize: 1000,
      })
      return response.data
    },
  })

  // Fetch summary
  const { data: summary } = useQuery({
    queryKey: ['locations-summary', dateRange],
    queryFn: async () => {
      const response = await locationsApi.getSummary({
        startDate: dateRange.start,
        endDate: dateRange.end,
      })
      return response.data as LocationSummary
    },
  })

  // Fetch heatmap data
  const { data: heatmapData } = useQuery({
    queryKey: ['locations-heatmap', dateRange],
    queryFn: async () => {
      const response = await locationsApi.getHeatmap({
        startDate: dateRange.start,
        endDate: dateRange.end,
      })
      return response.data as HeatmapPoint[]
    },
    enabled: showHeatmap,
  })

  const locations: LocationPoint[] = locationsData?.items || []

  // Calculate map center and bounds
  const mapConfig = useMemo(() => {
    if (locations.length === 0) {
      return { center: [51.505, -0.09] as [number, number], zoom: 13 }
    }

    const lats = locations.map((l) => l.latitude)
    const lngs = locations.map((l) => l.longitude)
    const centerLat = (Math.max(...lats) + Math.min(...lats)) / 2
    const centerLng = (Math.max(...lngs) + Math.min(...lngs)) / 2

    // Calculate zoom based on bounds
    const latDiff = Math.max(...lats) - Math.min(...lats)
    const lngDiff = Math.max(...lngs) - Math.min(...lngs)
    const maxDiff = Math.max(latDiff, lngDiff)
    let zoom = 13
    if (maxDiff > 10) zoom = 5
    else if (maxDiff > 5) zoom = 7
    else if (maxDiff > 1) zoom = 9
    else if (maxDiff > 0.5) zoom = 11
    else if (maxDiff > 0.1) zoom = 13
    else zoom = 15

    return { center: [centerLat, centerLng] as [number, number], zoom }
  }, [locations])

  // Path coordinates for polyline
  const pathCoordinates = useMemo(() => {
    // Sort by recorded time (oldest first for path drawing)
    const sorted = [...locations].sort(
      (a, b) =>
        new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
    )
    return sorted.map((l) => [l.latitude, l.longitude] as [number, number])
  }, [locations])

  // Playback animation
  useEffect(() => {
    if (!isPlaying || locations.length === 0) return

    const interval = setInterval(() => {
      setPlaybackIndex((prev) => {
        if (prev === null) return 0
        if (prev >= locations.length - 1) {
          setIsPlaying(false)
          return prev
        }
        return prev + 1
      })
    }, 500)

    return () => clearInterval(interval)
  }, [isPlaying, locations.length])

  const handleExport = useCallback(
    async (format: 'json' | 'gpx' | 'csv') => {
      try {
        const response = await locationsApi.export({
          format,
          startDate: dateRange.start,
          endDate: dateRange.end,
        })

        const blob = new Blob([response.data])
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `teboraw-locations.${format}`
        a.click()
        window.URL.revokeObjectURL(url)
      } catch (error) {
        console.error('Export failed:', error)
      }
    },
    [dateRange]
  )

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <Layout>
      <div className="flex h-[calc(100vh-64px)] bg-slate-900">
        {/* Sidebar */}
        <div
          className={`${
            sidebarOpen ? 'w-80' : 'w-0'
          } transition-all duration-300 overflow-hidden border-r border-slate-700 flex flex-col`}
        >
          {/* Summary Stats */}
          <div className="p-4 border-b border-slate-700">
            <h2 className="text-lg font-semibold text-white mb-3">
              Location History
            </h2>

            {summary && (
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-800 rounded-lg p-3">
                  <div className="text-2xl font-bold text-cyan-400">
                    {summary.totalPoints}
                  </div>
                  <div className="text-xs text-slate-400">Points</div>
                </div>
                <div className="bg-slate-800 rounded-lg p-3">
                  <div className="text-2xl font-bold text-cyan-400">
                    {summary.daysTracked}
                  </div>
                  <div className="text-xs text-slate-400">Days</div>
                </div>
                <div className="bg-slate-800 rounded-lg p-3 col-span-2">
                  <div className="text-2xl font-bold text-cyan-400">
                    {summary.totalDistanceKm.toFixed(1)} km
                  </div>
                  <div className="text-xs text-slate-400">Total Distance</div>
                </div>
              </div>
            )}
          </div>

          {/* Date Range Filter */}
          <div className="p-4 border-b border-slate-700">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-medium text-slate-300">
                Date Range
              </span>
            </div>
            <div className="space-y-2">
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) =>
                  setDateRange((prev) => ({ ...prev, start: e.target.value }))
                }
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white"
              />
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) =>
                  setDateRange((prev) => ({ ...prev, end: e.target.value }))
                }
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white"
              />
            </div>
          </div>

          {/* Layer Controls */}
          <div className="p-4 border-b border-slate-700">
            <div className="flex items-center gap-2 mb-3">
              <Layers className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-medium text-slate-300">Layers</span>
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showPath}
                  onChange={(e) => setShowPath(e.target.checked)}
                  className="rounded bg-slate-700 border-slate-600 text-cyan-500"
                />
                <span className="text-sm text-slate-300">Show Path</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showHeatmap}
                  onChange={(e) => setShowHeatmap(e.target.checked)}
                  className="rounded bg-slate-700 border-slate-600 text-cyan-500"
                />
                <span className="text-sm text-slate-300">Heat Map</span>
              </label>
            </div>
          </div>

          {/* Playback Controls */}
          <div className="p-4 border-b border-slate-700">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-medium text-slate-300">
                Timeline Playback
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setPlaybackIndex(0)
                  setIsPlaying(!isPlaying)
                }}
                className="flex items-center justify-center w-10 h-10 bg-cyan-500 hover:bg-cyan-600 rounded-lg text-white"
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={() => {
                  setPlaybackIndex(null)
                  setIsPlaying(false)
                }}
                className="flex items-center justify-center w-10 h-10 bg-slate-700 hover:bg-slate-600 rounded-lg text-white"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              {playbackIndex !== null && (
                <span className="text-sm text-slate-400">
                  {playbackIndex + 1} / {locations.length}
                </span>
              )}
            </div>
            {playbackIndex !== null && locations[playbackIndex] && (
              <div className="mt-2 text-xs text-slate-400">
                {formatDate(locations[playbackIndex].recordedAt)}
              </div>
            )}
          </div>

          {/* Location List */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-slate-300">
                  Recent Locations
                </span>
                <span className="text-xs text-slate-500">
                  {locations.length} points
                </span>
              </div>
              <div className="space-y-2">
                {locations.slice(0, 50).map((location) => (
                  <button
                    key={location.id}
                    onClick={() => setSelectedLocation(location)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedLocation?.id === location.id
                        ? 'bg-cyan-500/20 border border-cyan-500'
                        : 'bg-slate-800 hover:bg-slate-700'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-cyan-400 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-white truncate">
                          {location.latitude.toFixed(5)},{' '}
                          {location.longitude.toFixed(5)}
                        </div>
                        <div className="text-xs text-slate-400">
                          {formatDate(location.recordedAt)}
                        </div>
                        {location.durationSeconds && location.durationSeconds > 0 && (
                          <div className="text-xs text-cyan-400">
                            {formatDuration(location.durationSeconds)} at this location
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Export Buttons */}
          <div className="p-4 border-t border-slate-700">
            <div className="flex items-center gap-2 mb-3">
              <Download className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-medium text-slate-300">Export</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleExport('gpx')}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white text-sm py-2 rounded-lg"
              >
                GPX
              </button>
              <button
                onClick={() => handleExport('csv')}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white text-sm py-2 rounded-lg"
              >
                CSV
              </button>
              <button
                onClick={() => handleExport('json')}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white text-sm py-2 rounded-lg"
              >
                JSON
              </button>
            </div>
          </div>
        </div>

        {/* Toggle Sidebar Button */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute left-0 top-1/2 transform -translate-y-1/2 z-[1000] bg-slate-800 hover:bg-slate-700 text-white p-2 rounded-r-lg border border-l-0 border-slate-600"
          style={{ marginLeft: sidebarOpen ? '320px' : '0' }}
        >
          {sidebarOpen ? (
            <ChevronLeft className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>

        {/* Map */}
        <div className="flex-1 relative">
          {locationsLoading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
              <div className="text-slate-400">Loading locations...</div>
            </div>
          ) : (
            <MapContainer
              center={mapConfig.center}
              zoom={mapConfig.zoom}
              className="h-full w-full"
              style={{ background: '#0f172a' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              />

              <MapController center={mapConfig.center} zoom={mapConfig.zoom} />

              {/* Heat map layer */}
              {showHeatmap && heatmapData && (
                <HeatmapLayer points={heatmapData} />
              )}

              {/* Path polyline */}
              {showPath && pathCoordinates.length > 1 && (
                <Polyline
                  positions={
                    playbackIndex !== null
                      ? pathCoordinates.slice(0, playbackIndex + 1)
                      : pathCoordinates
                  }
                  pathOptions={{
                    color: '#0ea5e9',
                    weight: 3,
                    opacity: 0.7,
                  }}
                />
              )}

              {/* Location markers */}
              {(playbackIndex !== null
                ? locations.slice(0, playbackIndex + 1)
                : locations
              ).map((location, index) => (
                <Marker
                  key={location.id}
                  position={[location.latitude, location.longitude]}
                  icon={createMarkerIcon(
                    selectedLocation?.id === location.id
                      ? '#f59e0b'
                      : playbackIndex === index
                      ? '#22c55e'
                      : '#0ea5e9'
                  )}
                  eventHandlers={{
                    click: () => setSelectedLocation(location),
                  }}
                >
                  <Popup>
                    <div className="text-sm">
                      <div className="font-medium mb-1">
                        {formatDate(location.recordedAt)}
                      </div>
                      <div className="text-slate-600">
                        {location.latitude.toFixed(6)},{' '}
                        {location.longitude.toFixed(6)}
                      </div>
                      {location.speed && (
                        <div className="text-slate-600 flex items-center gap-1">
                          <Navigation className="w-3 h-3" />
                          {(location.speed * 3.6).toFixed(1)} km/h
                        </div>
                      )}
                      {location.durationSeconds && location.durationSeconds > 0 && (
                        <div className="text-cyan-600">
                          {formatDuration(location.durationSeconds)} here
                        </div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          )}

          {/* No data overlay */}
          {!locationsLoading && locations.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 z-[500]">
              <div className="text-center">
                <MapPin className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">
                  No Location Data
                </h3>
                <p className="text-slate-400 max-w-sm">
                  Start tracking your location with the Teboraw mobile app to
                  see your history here.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
