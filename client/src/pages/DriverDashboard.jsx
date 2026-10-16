import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const API_URL = 'http://localhost:5000/api/ambulances'
const palette = { navy: '#10243a', red: '#dc2626', green: '#16a34a', muted: '#64748b', border: '#e2e8f0' }
const card = { background: '#fff', border: `1px solid ${palette.border}`, borderRadius: 15, padding: 24, boxShadow: '0 6px 24px rgba(15,23,42,.05)' }
const button = { border: 0, borderRadius: 9, padding: '13px 19px', color: '#fff', fontWeight: 700, cursor: 'pointer' }
const heading = { color: palette.navy, margin: '0 0 10px' }

export default function DriverDashboard({ view = 'dashboard' }) {
  const navigate = useNavigate()
  const [ambulance, setAmbulance] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tracking, setTracking] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [coordinates, setCoordinates] = useState(null)
  const [lastUpdate, setLastUpdate] = useState(null)
  const watchIdRef = useRef(null)
  const activeRef = useRef(false)
  const requestRef = useRef(null)
  const sendingRef = useRef(false)
  const sessionRef = useRef(0)
  const token = localStorage.getItem('medirescue_token')

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      if (!token) { navigate('/login', { replace: true }); return }
      try {
        const response = await fetch(`${API_URL}/driver/me`, {
          headers: { Authorization: `Bearer ${token}` }, signal: controller.signal
        })
        if (response.status === 401) { navigate('/login', { replace: true }); return }
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Unable to load assigned ambulance')
        if (controller.signal.aborted) return
        setAmbulance(data)
        setLastUpdate(data.location_updated_at || null)
        if (data.current_lat != null && data.current_lng != null) {
          setCoordinates({ latitude: Number(data.current_lat), longitude: Number(data.current_lng) })
        }
      } catch (err) {
        if (err.name !== 'AbortError') setError(err.message)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    load()
    return () => controller.abort()
  }, [navigate, token])

  function stopTracking(showMessage = true) {
    activeRef.current = false
    sessionRef.current += 1
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    requestRef.current?.abort()
    requestRef.current = null
    setTracking(false)
    if (showMessage) setMessage('GPS tracking stopped.')
  }

  async function sendLocation(position) {
    if (!activeRef.current || sendingRef.current) return
    const session = sessionRef.current
    const latitude = position.coords.latitude
    const longitude = position.coords.longitude
    sendingRef.current = true
    const controller = new AbortController()
    requestRef.current = controller
    try {
      const response = await fetch(`${API_URL}/driver/location`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ latitude, longitude }),
        signal: controller.signal
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Location update failed')
      if (!activeRef.current || session !== sessionRef.current) return
      setCoordinates({ latitude, longitude })
      setLastUpdate(new Date().toISOString())
      setMessage('GPS location updated successfully.')
      setError('')
    } catch (err) {
      if (err.name !== 'AbortError' && activeRef.current && session === sessionRef.current) setError(err.message)
    } finally {
      sendingRef.current = false
      if (requestRef.current === controller) requestRef.current = null
    }
  }

  function startTracking() {
    setError('')
    setMessage('')
    if (!ambulance) { setError('No ambulance assigned to your account.'); return }
    if (!navigator.geolocation) { setError('This browser does not support GPS.'); return }
    if (!window.isSecureContext) { setError('GPS requires localhost or HTTPS.'); return }
    if (activeRef.current) return
    sessionRef.current += 1
    activeRef.current = true
    setTracking(true)
    setMessage('Requesting location permission...')
    watchIdRef.current = navigator.geolocation.watchPosition(
      sendLocation,
      (err) => {
        setError(`GPS error: ${err.message}`)
        if (err.code === 1) { stopTracking(false); setMessage('Location permission denied.') }
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
    )
  }

  // GPS sharing stops when leaving the tracking page or signing out.
  useEffect(() => {
    if (view !== 'tracking' && activeRef.current) stopTracking(false)
  }, [view])
  useEffect(() => () => {
    activeRef.current = false
    sessionRef.current += 1
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current)
    requestRef.current?.abort()
  }, [])

  const validCoords = coordinates && Number.isFinite(coordinates.latitude) && Number.isFinite(coordinates.longitude)
  const lastSeen = lastUpdate && !Number.isNaN(Date.parse(lastUpdate)) ? new Date(lastUpdate).toLocaleString() : 'No GPS updates yet'
  const status = ambulance?.status || 'Unknown'
  const titles = { dashboard: 'Driver Dashboard', tracking: 'Live GPS Tracking', ambulance: 'Assigned Ambulance' }

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', color: '#17233b', fontFamily: "'Segoe UI', Arial, sans-serif" }}>
      <main style={{ maxWidth: 1240, margin: 'auto', padding: '36px 20px 70px' }}>
        <p style={{ color: palette.red, fontSize: 12, fontWeight: 800, letterSpacing: 1.5 }}>MEDIRESCUE • AMBULANCE DRIVER</p>
        <h1 style={{ ...heading, fontSize: 'clamp(28px,4vw,38px)' }}>{titles[view] || titles.dashboard}</h1>
        <p style={{ color: palette.muted, margin: '0 0 30px', lineHeight: 1.6 }}>
          {view === 'dashboard' ? 'Overview of your assigned ambulance and current location reporting.' : view === 'tracking' ? 'Share your current GPS location with the hospital while tracking is enabled.' : 'Details of the ambulance assigned to your driver account.'}
        </p>
        {loading && <section style={card}>Loading assigned ambulance...</section>}
        {!loading && error && <p role="alert" style={{ ...card, color: '#b91c1c' }}>{error}</p>}
        {!loading && !ambulance && <section style={card}>No ambulance is currently assigned to this driver.</section>}
        {!loading && ambulance && view === 'dashboard' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,220px),1fr))', gap: 18 }}>
            {[
              { label: 'Assigned Ambulance', value: ambulance.plate_number || 'Not available' },
              { label: 'Ambulance Status', value: String(status).replaceAll('_', ' ') },
              { label: 'Available for Dispatch', value: status === 'available' ? 'Yes' : 'No' },
              { label: 'Last GPS Update', value: lastSeen }
            ].map(item => <article key={item.label} style={card}>
              <p style={{ color: palette.muted, fontSize: 13, fontWeight: 700 }}>{item.label}</p>
              <strong style={{ color: palette.navy, fontSize: 22, overflowWrap: 'anywhere' }}>{item.value}</strong>
            </article>)}
          </div>
        )}
        {!loading && ambulance && view === 'ambulance' && (
          <section style={card}>
            <h2 style={heading}>🚑 {ambulance.plate_number || 'Assigned Ambulance'}</h2>
            <p><strong>Current status:</strong> {String(status).replaceAll('_', ' ')}</p>
            <p><strong>Available for dispatch:</strong> {status === 'available' ? 'Yes' : 'No'}</p>
            <p><strong>Last GPS update:</strong> {lastSeen}</p>
            <p style={{ color: palette.muted, fontSize: 13 }}>Ambulance availability is controlled by the existing backend dispatch workflow. This page does not override dispatch status.</p>
          </section>
        )}
        {!loading && ambulance && view === 'tracking' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,320px),1fr))', gap: 20 }}>
            <section style={card}>
              <h2 style={heading}>Live GPS Tracking</h2>
              <p style={{ color: palette.muted }}>Tracking is {tracking ? 'ACTIVE' : 'STOPPED'}. Start tracking only when location sharing is required.</p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 22 }}>
                <button type="button" onClick={startTracking} disabled={tracking} style={{ ...button, background: palette.green, opacity: tracking ? .5 : 1 }}>▶ Start GPS Tracking</button>
                <button type="button" onClick={() => stopTracking()} disabled={!tracking} style={{ ...button, background: palette.red, opacity: tracking ? 1 : .5 }}>■ Stop GPS Tracking</button>
              </div>
              {message && <p role="status" style={{ color: '#166534', marginTop: 20 }}>{message}</p>}
              {error && <p role="alert" style={{ color: '#b91c1c', marginTop: 20 }}>{error}</p>}
              <p style={{ color: palette.muted, fontSize: 13, marginTop: 24 }}>Leaving this page stops GPS sharing. Do not operate this dashboard while driving.</p>
            </section>
            <section style={card}>
              <h2 style={heading}>Last Recorded Location</h2>
              <p><strong>Latitude:</strong> {validCoords ? coordinates.latitude : 'Not available'}</p>
              <p><strong>Longitude:</strong> {validCoords ? coordinates.longitude : 'Not available'}</p>
              <p><strong>Last update:</strong> {lastSeen}</p>
              {validCoords && <a href={`https://www.google.com/maps?q=${coordinates.latitude},${coordinates.longitude}`} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: 14, background: palette.navy, color: '#fff', borderRadius: 9, padding: '13px 18px', textDecoration: 'none', fontWeight: 700 }}>View on Google Maps ↗</a>}
            </section>
          </div>
        )}
        <footer style={{ marginTop: 45, textAlign: 'center', fontSize: 12, color: '#94a3b8' }}>© {new Date().getFullYear()} MediRescue • Ambulance Driver Portal</footer>
      </main>
    </div>
  )
}
