import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import CaseChat from '../components/CaseChat'
import PatientHealthSummary from '../components/PatientHealthSummary'
import StaffHRPanel from '../components/StaffHRPanel'
import FlipTimer from '../components/FlipTimer'
import useCountdown from '../hooks/useCountdown'
import AmbulanceTrackingMap from '../components/AmbulanceTrackingMap'
import InstallPWA from '../components/InstallPWA' // ADDED

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const AMBULANCE_API = `${API}/ambulances`

const palette = {
  navy: '#10243a',
  red: '#dc2626',
  green: '#16a34a',
  muted: '#64748b',
  border: '#e2e8f0'
}

const card = {
  background: '#fff',
  border: `1px solid ${palette.border}`,
  borderRadius: 15,
  padding: 24,
  boxShadow: '0 6px 24px rgba(15,23,42,.05)'
}

const button = {
  border: 0,
  borderRadius: 9,
  padding: '13px 19px',
  color: '#fff',
  fontWeight: 700,
  cursor: 'pointer'
}

const heading = {
  color: palette.navy,
  margin: '0 0 10px'
}

const activeStatuses = [
  'assigned',
  'dispatched',
  'picked_up',
  'arrived_at_hospital'
]

const ambulanceStatusOptions = [
  { value: 'available', label: 'Available', description: 'Ready for dispatch', color: '#15803d' },
  { value: 'on_call', label: 'On Call', description: 'Handling an emergency', color: '#1d4ed8' },
  { value: 'under_repair', label: 'Under Repair', description: 'Maintenance required', color: '#b45309' },
  { value: 'out_of_service', label: 'Out of Service', description: 'Not operational', color: '#b91c1c' }
]

function normalizeAmbulanceStatus(value) {
  return value === 'dispatched' ? 'on_call' : value
}

function formatStatus(value) {
  const normalized = normalizeAmbulanceStatus(value)
  if (normalized === 'on_call') return 'On Call'
  return String(normalized || 'Unknown').replaceAll('_', ' ').replace(/\b\w/g, char => char.toUpperCase())
}

function DriverTimer({ deadline }) {
  const secs = useCountdown(deadline);
  if (!deadline || secs <= 0) return null;
  return (
    <div style={{ marginTop: 15, marginBottom: 15 }}>
      <p style={{ margin: '0 0 8px', fontWeight: 'bold', color: '#b45309' }}>⚠ Time remaining to accept:</p>
      <FlipTimer seconds={secs} />
    </div>
  );
}

function EmergencyCard({ emergency, onAction, busy }) {
  const status = emergency.status

  const nextAction =
    status === 'assigned' ? { label: 'Accept Emergency', endpoint: 'accept', color: '#eab308' }
      : status === 'dispatched' ? { label: 'Confirm Patient Pickup', endpoint: 'pickup', color: '#2563eb' }
      : status === 'picked_up' ? { label: 'Confirm Hospital Arrival', endpoint: 'arrive', color: palette.green }
      : null

  return (
    <section style={{ ...card, marginTop: 22 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 15 }}>
        <div>
          <p style={{ color: palette.red, fontSize: 12, fontWeight: 800, letterSpacing: 1 }}>ASSIGNED EMERGENCY</p>
          <h2 style={heading}>Emergency Case #{emergency.id}</h2>
        </div>
        <span style={{ background: '#eff6ff', color: '#1d4ed8', padding: '9px 14px', borderRadius: 20, fontSize: 12, fontWeight: 800 }}>
          {formatStatus(status)}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginTop: 22, padding: 20, background: '#f8fafc', borderRadius: 10 }}>
        <div><p style={{ color: palette.muted, fontSize: 12 }}>Patient</p><strong>{emergency.patient_name || `Patient #${emergency.patient_id}`}</strong></div>
        {emergency.patient_phone && (
          <div><p style={{ color: palette.muted, fontSize: 12 }}>Patient Phone</p><a href={`tel:${emergency.patient_phone}`} style={{ color: '#1d4ed8', fontWeight: 700 }}>{emergency.patient_phone}</a></div>
        )}
        <div><p style={{ color: palette.muted, fontSize: 12 }}>Emergency Type</p><strong>{emergency.emergency_type || 'Emergency'}</strong></div>
        <div><p style={{ color: palette.muted, fontSize: 12 }}>Severity</p><strong>{formatStatus(emergency.severity)}</strong></div>
        <div><p style={{ color: palette.muted, fontSize: 12 }}>Current Status</p><strong>{formatStatus(status)}</strong></div>
      </div>

      {emergency.emergency_desc && (
        <div style={{ marginTop: 20 }}>
          <strong>Emergency Description</strong>
          <p style={{ color: palette.muted, lineHeight: 1.7 }}>{emergency.emergency_desc}</p>
        </div>
      )}

      {['assigned', 'dispatched'].includes(emergency.status) && (
        <div style={{ marginTop: 24, marginBottom: 24 }}>
          <h3 style={heading}>🗺️ Live Route to Patient</h3>
          <AmbulanceTrackingMap caseData={{ ...emergency, ambulance_lat: emergency.ambulance_lat, ambulance_lng: emergency.ambulance_lng }} />
        </div>
      )}

      <div style={{ marginTop: 25, padding: 20, border: `1px solid ${palette.border}`, borderRadius: 11 }}>
        <h3 style={heading}>Emergency Response Progress</h3>
        {[['assigned', 'Awaiting Driver Acceptance'], ['dispatched', 'Ambulance Dispatched'], ['picked_up', 'Patient Picked Up'], ['arrived_at_hospital', 'Arrived at Hospital'], ['handed_over', 'Patient Handed Over']].map(([stage, label], index, stages) => {
          const currentIndex = stages.findIndex(item => item[0] === status)
          const completed = currentIndex >= 0 && index < currentIndex
          const current = index === currentIndex
          return (
            <div key={stage} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 0', borderBottom: index === stages.length - 1 ? 'none' : `1px solid ${palette.border}` }}>
              <span style={{ width: 28, height: 28, borderRadius: '50%', display: 'grid', placeItems: 'center', background: completed || current ? palette.green : '#e2e8f0', color: completed || current ? '#fff' : palette.muted, fontWeight: 800 }}>
                {completed ? '✓' : index + 1}
              </span>
              <div>
                <strong>{label}</strong>
                <p style={{ margin: '4px 0 0', color: palette.muted, fontSize: 12 }}>{completed ? 'Completed' : current ? 'Current stage' : 'Pending'}</p>
              </div>
            </div>
          )
        })}
      </div>

      {status === 'assigned' && (
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', padding: 15, borderRadius: 9, marginTop: 20 }}>
          <strong style={{ color: '#92400e' }}>Action Required</strong>
          <p style={{ color: '#92400e', margin: '6px 0' }}>You have been assigned this emergency. Please accept or decline immediately.</p>
          <DriverTimer deadline={emergency.accept_deadline} />
        </div>
      )}

      {status === 'dispatched' && (
        <p style={{ background: '#fff7ed', color: '#9a3412', padding: 15, borderRadius: 9, marginTop: 20 }}>This emergency has been dispatched to your ambulance. Confirm pickup only after the patient has actually been collected.</p>
      )}

      {status === 'picked_up' && (
        <p style={{ background: '#eff6ff', color: '#1d4ed8', padding: 15, borderRadius: 9, marginTop: 20 }}>Patient pickup has been confirmed. Confirm hospital arrival only when you have reached the hospital.</p>
      )}

      {status === 'arrived_at_hospital' && (
        <p style={{ background: '#ecfdf5', color: '#166534', padding: 15, borderRadius: 9, marginTop: 20 }}>Hospital arrival confirmed. Hospital Staff must complete patient handover.</p>
      )}

      <PatientHealthSummary caseId={emergency.id} />
      {status === 'dispatched' && <CaseChat caseId={emergency.id} />}

      {nextAction && (
        <button type="button" disabled={busy} onClick={() => onAction(emergency.id, nextAction.endpoint)} style={{ ...button, background: nextAction.color, marginTop: 20, opacity: busy ? 0.6 : 1 }}>
          {busy ? 'Processing...' : `${nextAction.label} →`}
        </button>
      )}
    </section>
  )
}

export default function DriverDashboard({ view = 'dashboard' }) {
  const navigate = useNavigate()
  const [ambulance, setAmbulance] = useState(null)
  const [emergencies, setEmergencies] = useState([])
  const [hospital, setHospital] = useState(null)
  const [hospitalError, setHospitalError] = useState('')
  const [loading, setLoading] = useState(true)
  const [casesLoading, setCasesLoading] = useState(true)
  const [tracking, setTracking] = useState(false)
  const [error, setError] = useState('')
  const [caseError, setCaseError] = useState('')
  const [message, setMessage] = useState('')
  const [statusError, setStatusError] = useState('')
  const [statusSaving, setStatusSaving] = useState(false)
  const [coordinates, setCoordinates] = useState(null)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [busyCase, setBusyCase] = useState(null)

  const watchIdRef = useRef(null)
  const activeRef = useRef(false)
  const requestRef = useRef(null)
  const sendingRef = useRef(false)
  const sessionRef = useRef(0)

  const token = localStorage.getItem('medirescue_token')

  const authenticatedRequest = useCallback(async (path, options = {}) => {
    const response = await fetch(`${API}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...options.headers }
    })
    const data = await response.json().catch(() => ({}))
    if (response.status === 401) {
      navigate('/login', { replace: true })
      throw new Error('Session expired. Please log in again.')
    }
    if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`)
    return data
  }, [token, navigate])

  const loadMyHospital = useCallback(async () => {
    try {
      const data = await authenticatedRequest('/team-member/hospital')
      setHospital(data.hospital || null)
      setHospitalError('')
    } catch (err) {
      setHospitalError(err.message || 'Unable to load hospital details')
    }
  }, [authenticatedRequest])

  const loadAmbulance = useCallback(async () => {
    if (!token) {
      navigate('/login', { replace: true })
      return
    }
    try {
      const data = await authenticatedRequest('/ambulances/driver/me')
      setAmbulance(data)
      setLastUpdate(data.location_updated_at || null)
      if (data.current_lat != null && data.current_lng != null) {
        setCoordinates({ latitude: Number(data.current_lat), longitude: Number(data.current_lng) })
      }
      setError('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [token, navigate, authenticatedRequest])

  const loadEmergencies = useCallback(async (showLoading = false) => {
    if (showLoading) setCasesLoading(true)
    try {
      const data = await authenticatedRequest('/cases/driver/assigned')
      const list = Array.isArray(data) ? data : Array.isArray(data.cases) ? data.cases : []
      setEmergencies(list.filter(item => activeStatuses.includes(item.status)))
      setCaseError('')
    } catch (err) {
      setCaseError(err.message)
    } finally {
      setCasesLoading(false)
    }
  }, [authenticatedRequest])

  useEffect(() => {
    loadAmbulance()
    loadEmergencies(true)
    loadMyHospital()
  }, [loadAmbulance, loadEmergencies, loadMyHospital])

  useEffect(() => {
    const interval = setInterval(() => {
      loadEmergencies(false)
      loadAmbulance()
    }, 10000)
    return () => clearInterval(interval)
  }, [loadEmergencies, loadAmbulance])

  async function handleEmergencyAction(caseId, action) {
    const confirmation = action === 'accept' ? 'Accept this emergency dispatch?' : action === 'pickup' ? 'Confirm that you have picked up the patient?' : 'Confirm that you have arrived at the hospital?'
    if (!window.confirm(confirmation)) return
    setBusyCase(caseId)
    setCaseError('')
    setMessage('')
    try {
      await authenticatedRequest(`/cases/${caseId}/${action}`, { method: 'PATCH' })
      setMessage(action === 'accept' ? `Case #${caseId} accepted. Proceed to the patient.` : action === 'pickup' ? `Patient pickup confirmed for Case #${caseId}.` : `Hospital arrival confirmed for Case #${caseId}.`)
      await loadEmergencies(false)
      await loadAmbulance()
    } catch (err) {
      setCaseError(err.message)
    } finally {
      setBusyCase(null)
    }
  }

  async function handleAmbulanceStatusChange(newStatus) {
    if (!ambulance || statusSaving) return
    const labels = { available: 'Available', on_call: 'On Call', under_repair: 'Under Repair', out_of_service: 'Out of Service' }
    const currentStatus = normalizeAmbulanceStatus(ambulance.status)
    if (newStatus === currentStatus) return
    const confirmed = window.confirm(`Change ambulance status to ${labels[newStatus]}?`)
    if (!confirmed) return
    setStatusSaving(true)
    setStatusError('')
    setMessage('')
    try {
      await authenticatedRequest('/cases/driver/ambulance/status', { method: 'PATCH', body: JSON.stringify({ status: newStatus }) })
      await loadAmbulance()
      await loadEmergencies(false)
      setMessage(`Ambulance status updated to ${labels[newStatus]}.`)
    } catch (err) {
      setStatusError(err.message || 'Failed to update ambulance status')
    } finally {
      setStatusSaving(false)
    }
  }

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
      const response = await fetch(`${AMBULANCE_API}/driver/location`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ latitude, longitude }),
        signal: controller.signal
      })
      const data = await response.json().catch(() => ({}))
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
    watchIdRef.current = navigator.geolocation.watchPosition(sendLocation, err => {
      setError(`GPS error: ${err.message}`)
      if (err.code === 1) { stopTracking(false); setMessage('Location permission denied.') }
    }, { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 })
  }

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
  const normalizedStatus = normalizeAmbulanceStatus(status)
  const titles = { dashboard: 'Driver Dashboard', tracking: 'Live GPS Tracking', ambulance: 'Assigned Ambulance' }

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', color: '#17233b', fontFamily: "'Segoe UI', Arial, sans-serif" }}>
      
      {/* ADDED PWA INSTALL BUTTON */}
      <InstallPWA />

      <main style={{ maxWidth: 1240, margin: 'auto', padding: '36px 20px 70px' }}>
        <p style={{ color: palette.red, fontSize: 12, fontWeight: 800, letterSpacing: 1.5 }}>MEDIRESCUE • AMBULANCE DRIVER</p>

        <div style={{ ...card, padding: '18px 22px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ width: 52, height: 52, minWidth: 52, borderRadius: 13, background: '#eff6ff', color: '#1d4ed8', display: 'grid', placeItems: 'center', fontSize: 27, fontWeight: 800 }}>✚</div>
          <div style={{ flex: 1 }}>
            <p style={{ color: palette.muted, fontSize: 11, fontWeight: 800, letterSpacing: 1, margin: '0 0 6px', textTransform: 'uppercase' }}>YOUR ASSIGNED HOSPITAL</p>
            <h2 style={{ color: palette.navy, fontSize: 22, fontWeight: 800, margin: 0 }}>{hospital?.name || (hospitalError ? 'Hospital unavailable' : 'Loading hospital...')}</h2>
            {hospital?.location && <p style={{ color: palette.muted, fontSize: 15, lineHeight: 1.7, margin: '6px 0 0' }}>{hospital.location}</p>}
            {hospitalError && (
              <button type="button" onClick={loadMyHospital} style={{ ...button, background: '#fff', color: palette.navy, border: `1px solid ${palette.border}`, fontSize: 13, marginTop: 10 }}>Retry Hospital Details</button>
            )}
          </div>
        </div>

        <h1 style={{ ...heading, fontSize: 'clamp(28px,4vw,38px)' }}>{titles[view] || titles.dashboard}</h1>
        <p style={{ color: palette.muted, margin: '0 0 30px', lineHeight: 1.6 }}>
          {view === 'dashboard' ? 'Your assigned ambulance, dispatched emergencies and response actions.' : view === 'tracking' ? 'Share your current GPS location with the hospital while tracking is enabled.' : 'Your assigned ambulance and active emergency requests.'}
        </p>

        {loading && <section style={card}>Loading assigned ambulance...</section>}
        {!loading && error && <p role="alert" style={{ ...card, color: '#b91c1c' }}>{error}</p>}
        {message && <p role="status" style={{ ...card, background: '#ecfdf5', color: '#166534', marginBottom: 20 }}>{message}</p>}
        {!loading && !ambulance && <section style={card}>No ambulance is currently assigned to this driver.</section>}

        {!loading && ambulance && view === 'dashboard' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,220px),1fr))', gap: 18 }}>
            {[
              { label: 'Assigned Ambulance', value: ambulance.plate_number || 'Not available' },
              { label: 'Ambulance Status', value: formatStatus(status) },
              { label: 'Available for Dispatch', value: status === 'available' ? 'Yes' : 'No' },
              { label: 'Active Emergencies', value: emergencies.length },
              { label: 'Last GPS Update', value: lastSeen }
            ].map(item => (
              <article key={item.label} style={card}>
                <p style={{ color: palette.muted, fontSize: 13, fontWeight: 700 }}>{item.label}</p>
                <strong style={{ color: palette.navy, fontSize: 22, overflowWrap: 'anywhere' }}>{item.value}</strong>
              </article>
            ))}
          </div>
        )}

        {!loading && ambulance && view === 'dashboard' && <section style={{ marginTop: 28 }}><StaffHRPanel /></section>}

        {!loading && ambulance && (view === 'dashboard' || view === 'ambulance') && (
          <section style={{ marginTop: 26 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
              <div>
                <h2 style={heading}>🚨 Assigned Emergency Requests</h2>
                <p style={{ color: palette.muted, fontSize: 13 }}>Automatically checks for new dispatches every 10 seconds.</p>
              </div>
              <button type="button" style={{ ...button, background: palette.navy }} onClick={() => { loadEmergencies(true); loadAmbulance() }}>↻ Refresh Requests</button>
            </div>

            {caseError && <p role="alert" style={{ ...card, color: '#b91c1c', marginBottom: 18 }}>Unable to load or update emergency requests: {caseError}</p>}
            {casesLoading && <section style={card}>Checking assigned emergencies...</section>}
            {!casesLoading && !caseError && emergencies.length === 0 && (
              <section style={card}>
                <h3 style={heading}>No Active Emergency Requests</h3>
                <p style={{ color: palette.muted }}>When Hospital Staff dispatch your ambulance, the assigned emergency will appear here.</p>
              </section>
            )}
            {!casesLoading && emergencies.map(emergency => (
              <EmergencyCard key={emergency.id} emergency={emergency} busy={busyCase !== null} onAction={handleEmergencyAction} />
            ))}
          </section>
        )}

        {!loading && ambulance && view === 'ambulance' && (
          <section style={{ ...card, marginTop: 25 }}>
            <h2 style={heading}>🚑 {ambulance.plate_number || 'Assigned Ambulance'}</h2>
            <p><strong>Current status:</strong> {formatStatus(status)}</p>
            <p><strong>Available for dispatch:</strong> {status === 'available' ? 'Yes' : 'No'}</p>
            <p><strong>Last GPS update:</strong> {lastSeen}</p>

            <div style={{ marginTop: 24, padding: 20, background: '#f8fafc', border: `1px solid ${palette.border}`, borderRadius: 12 }}>
              <h3 style={heading}>Manage Ambulance Status</h3>
              <p style={{ color: palette.muted, lineHeight: 1.6 }}>Choose your ambulance's operational status. Ambulances handling active emergencies cannot be marked available or taken out of service.</p>
              {statusError && <p role="alert" style={{ background: '#fef2f2', color: '#b91c1c', padding: 12, borderRadius: 8 }}>{statusError}</p>}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 190px), 1fr))', gap: 12, marginTop: 18 }}>
                {ambulanceStatusOptions.map(option => {
                  const selected = normalizedStatus === option.value
                  return (
                    <button key={option.value} type="button" disabled={statusSaving || selected} onClick={() => handleAmbulanceStatusChange(option.value)} style={{ padding: 16, borderRadius: 10, border: selected ? `2px solid ${option.color}` : `1px solid ${palette.border}`, background: selected ? '#f0fdf4' : '#fff', color: option.color, textAlign: 'left', cursor: statusSaving || selected ? 'not-allowed' : 'pointer', opacity: statusSaving ? 0.65 : 1 }}>
                      <strong style={{ display: 'block', fontSize: 15 }}>{selected ? '✓ ' : ''}{option.label}</strong>
                      <span style={{ display: 'block', marginTop: 7, fontSize: 12, color: palette.muted }}>{option.description}</span>
                      {selected && <span style={{ display: 'block', marginTop: 10, fontSize: 11, fontWeight: 800 }}>CURRENT STATUS</span>}
                    </button>
                  )
                })}
              </div>
              {statusSaving && <p role="status" style={{ marginTop: 16, color: palette.muted }}>Updating ambulance status...</p>}
            </div>
          </section>
        )}

        {!loading && ambulance && view === 'tracking' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,320px),1fr))', gap: 20 }}>
            <section style={card}>
              <h2 style={heading}>Live GPS Tracking</h2>
              <p style={{ color: palette.muted }}>Tracking is {tracking ? 'ACTIVE' : 'STOPPED'}. Start tracking only when location sharing is required.</p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 22 }}>
                <button type="button" onClick={startTracking} disabled={tracking} style={{ ...button, background: palette.green, opacity: tracking ? 0.5 : 1 }}>▶ Start GPS Tracking</button>
                <button type="button" onClick={() => stopTracking()} disabled={!tracking} style={{ ...button, background: palette.red, opacity: tracking ? 1 : 0.5 }}>■ Stop GPS Tracking</button>
              </div>
              <p style={{ color: palette.muted, fontSize: 13, marginTop: 24 }}>Leaving this page stops GPS sharing. Do not operate this dashboard while driving.</p>
            </section>

            <section style={card}>
              <h2 style={heading}>Last Recorded Location</h2>
              <p><strong>Latitude:</strong> {validCoords ? coordinates.latitude : 'Not available'}</p>
              <p><strong>Longitude:</strong> {validCoords ? coordinates.longitude : 'Not available'}</p>
              <p><strong>Last update:</strong> {lastSeen}</p>
              {validCoords && (
                <a href={`https://www.google.com/maps?q=${coordinates.latitude},${coordinates.longitude}`} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: 14, background: palette.navy, color: '#fff', borderRadius: 9, padding: '13px 18px', textDecoration: 'none', fontWeight: 700 }}>View on Google Maps ↗</a>
              )}
            </section>
          </div>
        )}

        <footer style={{ marginTop: 45, textAlign: 'center', fontSize: 12, color: '#94a3b8' }}>© {new Date().getFullYear()} MediRescue • Ambulance Driver Portal</footer>
      </main>
    </div>
  )
}