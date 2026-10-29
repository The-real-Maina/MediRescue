import { useEffect, useRef, useState } from 'react'
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  useMap
} from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const POLL_MS = 5000
const STALE_SECONDS = 30

const makeIcon = (emoji) =>
  L.divIcon({
    html: `<div style="font-size:28px;line-height:28px">${emoji}</div>`,
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 14]
  })

const ambulanceIcon = makeIcon('🚑')
const pickupIcon = makeIcon('📍')

// Zoom to show both markers once, then leave the map to the user
function FitOnce({ points }) {
  const map = useMap()
  const done = useRef(false)

  useEffect(() => {
    if (done.current || points.length < 2) return
    map.fitBounds(points, { padding: [40, 40], maxZoom: 16 })
    done.current = true
  }, [map, points])

  return null
}

const box = {
  background: '#fff',
  border: '1px solid #e2e8f0',
  borderRadius: 12,
  padding: 18,
  marginTop: 20
}

export default function TrackingMap({ caseId }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function load() {
      const token = localStorage.getItem('medirescue_token')

      try {
        const res = await fetch(`${API}/tracking/case/${caseId}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        const json = await res.json().catch(() => ({}))

        if (!res.ok) throw new Error(json.error || 'Tracking unavailable')
        if (!active) return

        setData(json)
        setError('')
      } catch (err) {
        if (active) setError(err.message)
      }
    }

    load()
    const timer = setInterval(load, POLL_MS)

    return () => {
      active = false
      clearInterval(timer)
    }
  }, [caseId])

  if (error && !data) {
    return <div style={box}>Live tracking unavailable: {error}</div>
  }

  if (!data) {
    return <div style={box}>Locating your ambulance...</div>
  }

  if (data.tracking === false) return null

  if (!data.ambulance || !data.pickup) {
    return (
      <div style={box}>
        🚑 Your ambulance is on its way. Waiting for the driver&apos;s
        live location...
      </div>
    )
  }

  const { ambulance, pickup, eta, route } = data
  const here = [ambulance.lat, ambulance.lng]
  const there = [pickup.lat, pickup.lng]
  const stale =
    ambulance.age_seconds != null && ambulance.age_seconds > STALE_SECONDS

  const arrival = eta
    ? new Date(eta.arrival_time).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      })
    : null

  return (
    <div style={box}>
      {eta && (
        <div
          style={{
            background: '#eff6ff',
            color: '#1d4ed8',
            borderRadius: 10,
            padding: '14px 16px',
            marginBottom: 14
          }}
        >
          <div style={{ fontSize: 22, fontWeight: 800 }}>
            Arriving in about {eta.minutes} min
          </div>
          <div style={{ fontSize: 13, marginTop: 4 }}>
            {eta.distance_km} km away • expected around {arrival}
            {eta.source === 'straight_line' && ' • rough estimate'}
          </div>
        </div>
      )}

      {stale && (
        <p style={{ color: '#b45309', fontSize: 13, margin: '0 0 12px' }}>
          ⚠ The driver&apos;s location has not updated for a while. The
          ambulance may be somewhere else.
        </p>
      )}

      <MapContainer
        center={here}
        zoom={14}
        style={{ height: 320, borderRadius: 10 }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {route && route.length > 1 && (
          <Polyline
            positions={route}
            pathOptions={{ color: '#2563eb', weight: 5 }}
          />
        )}
        <Marker position={there} icon={pickupIcon} />
        <Marker position={here} icon={ambulanceIcon} />
        <FitOnce points={[here, there]} />
      </MapContainer>

      <p style={{ color: '#64748b', fontSize: 12, margin: '10px 0 0' }}>
        🚑 {ambulance.plate_number || 'Ambulance'} • 📍 your pickup
        location • updates every 5 seconds
      </p>
    </div>
  )
}