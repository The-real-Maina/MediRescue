
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const API_URL = 'http://localhost:5000/api/ambulances'

const styles = {
  page: {
    minHeight: '100vh',
    background: '#f1f5f9',
    color: '#17233b',
    fontFamily: "'Segoe UI', Arial, sans-serif"
  },
  header: {
    background: '#10243a',
    color: '#ffffff',
    padding: '20px 5%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 16,
    borderBottom: '4px solid #dc2626'
  },
  brand: {
    margin: 0,
    fontSize: 25,
    fontWeight: 800,
    color: '#ffffff'
  },
  logout: {
    background: 'transparent',
    border: '1px solid #64748b',
    borderRadius: 8,
    color: '#ffffff',
    padding: '10px 18px',
    fontWeight: 600,
    cursor: 'pointer'
  },
  content: {
    maxWidth: 1050,
    margin: '0 auto',
    padding: '36px 20px 70px'
  },
  card: {
    background: '#ffffff',
    borderRadius: 14,
    padding: 26,
    border: '1px solid #e2e8f0',
    boxShadow: '0 5px 20px rgba(15,23,42,0.05)',
    marginBottom: 22
  },
  sectionTitle: {
    color: '#17233b',
    fontSize: 20,
    fontWeight: 750,
    margin: '0 0 16px'
  },
  label: {
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 1,
    color: '#64748b',
    textTransform: 'uppercase'
  },
  primaryButton: {
    background: '#16a34a',
    color: '#ffffff',
    border: 'none',
    borderRadius: 9,
    padding: '14px 22px',
    fontWeight: 700,
    fontSize: 14,
    cursor: 'pointer'
  },
  stopButton: {
    background: '#dc2626',
    color: '#ffffff',
    border: 'none',
    borderRadius: 9,
    padding: '14px 22px',
    fontWeight: 700,
    fontSize: 14,
    cursor: 'pointer'
  }
}

export default function DriverDashboard() {
  const navigate = useNavigate()

  const [ambulance, setAmbulance] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tracking, setTracking] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [lastUpdate, setLastUpdate] = useState(null)
  const [coordinates, setCoordinates] = useState(null)

  const watchIdRef = useRef(null)
  const trackingRef = useRef(false)
  const requestInFlightRef = useRef(false)
  const sessionRef = useRef(0)
  const controllerRef = useRef(null)

  const token = localStorage.getItem('medirescue_token')

  // ==========================================
  // LOAD ASSIGNED AMBULANCE
  // ==========================================

  useEffect(() => {
    let active = true

    async function loadAmbulance() {
      try {
        const response = await fetch(
          `${API_URL}/driver/me`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        )

        const data = await response.json()

        if (!response.ok) {
          throw new Error(
            data.error || 'Failed to load ambulance'
          )
        }

        if (!active) return

        setAmbulance(data)
        setLastUpdate(data.location_updated_at)

        if (
          data.current_lat != null &&
          data.current_lng != null
        ) {
          setCoordinates({
            latitude: Number(data.current_lat),
            longitude: Number(data.current_lng)
          })
        }
      } catch (err) {
        if (active) setError(err.message)
      } finally {
        if (active) setLoading(false)
      }
    }

    loadAmbulance()

    return () => {
      active = false
    }
  }, [token])

  // ==========================================
  // STOP GPS TRACKING
  // ==========================================

  function stopTracking() {
    trackingRef.current = false
    sessionRef.current += 1

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(
        watchIdRef.current
      )
      watchIdRef.current = null
    }

    if (controllerRef.current) {
      controllerRef.current.abort()
      controllerRef.current = null
    }

    setTracking(false)
    setMessage('GPS tracking stopped.')
  }

  // ==========================================
  // SEND LOCATION TO BACKEND
  // ==========================================

  async function sendLocation(position) {
    if (!trackingRef.current) return
    if (requestInFlightRef.current) return

    const latitude = position.coords.latitude
    const longitude = position.coords.longitude
    const session = sessionRef.current

    requestInFlightRef.current = true

    const controller = new AbortController()
    controllerRef.current = controller

    try {
      const response = await fetch(
        `${API_URL}/driver/location`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            latitude,
            longitude
          }),
          signal: controller.signal
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.error || 'Location update failed'
        )
      }

      if (
        !trackingRef.current ||
        session !== sessionRef.current
      ) {
        return
      }

      setCoordinates({ latitude, longitude })
      setLastUpdate(new Date().toISOString())
      setError('')
      setMessage('GPS location updated successfully.')
    } catch (err) {
      if (
        err.name !== 'AbortError' &&
        trackingRef.current &&
        session === sessionRef.current
      ) {
        setError(err.message)
      }
    } finally {
      requestInFlightRef.current = false

      if (controllerRef.current === controller) {
        controllerRef.current = null
      }
    }
  }

  // ==========================================
  // START GPS TRACKING
  // ==========================================

  function startTracking() {
    setError('')
    setMessage('')

    if (!ambulance) {
      setError('No assigned ambulance found.')
      return
    }

    if (!navigator.geolocation) {
      setError('GPS is not supported by this browser.')
      return
    }

    if (!window.isSecureContext) {
      setError('GPS requires HTTPS or localhost.')
      return
    }

    if (trackingRef.current) return

    sessionRef.current += 1
    trackingRef.current = true

    setTracking(true)
    setMessage('Requesting GPS permission...')

    watchIdRef.current =
      navigator.geolocation.watchPosition(
        sendLocation,
        (geoError) => {
          setError(`GPS error: ${geoError.message}`)

          if (geoError.code === 1) {
            stopTracking()
            setMessage('Location permission denied.')
          }
        },
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 15000
        }
      )
  }

  // ==========================================
  // CLEAN UP GPS TRACKING
  // ==========================================

  useEffect(() => {
    return () => {
      trackingRef.current = false
      sessionRef.current += 1

      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(
          watchIdRef.current
        )
        watchIdRef.current = null
      }

      if (controllerRef.current) {
        controllerRef.current.abort()
      }
    }
  }, [])

  // ==========================================
  // LOGOUT
  // ==========================================

  function handleLogout() {
    stopTracking()

    localStorage.removeItem('medirescue_token')
    localStorage.removeItem('medirescue_user')

    navigate('/login', { replace: true })
  }

  // ==========================================
  // LOCATION DISPLAY
  // ==========================================

  const hasCoordinates =
    coordinates !== null &&
    Number.isFinite(coordinates.latitude) &&
    Number.isFinite(coordinates.longitude)

  const formattedTime = lastUpdate
    ? new Date(lastUpdate).toLocaleString()
    : 'No GPS updates yet'

  // ==========================================
  // USER INTERFACE
  // ==========================================

  return (
    <div style={styles.page}>

      {/* HEADER */}
      <header style={styles.header}>
        <div>
          <h1 style={styles.brand}>
            ✚ MediRescue
          </h1>

          <div
            style={{
              fontSize: 12,
              color: '#cbd5e1',
              marginTop: 5,
              letterSpacing: 1.5
            }}
          >
            AMBULANCE DRIVER PORTAL
          </div>
        </div>

        <button
          type="button"
          style={styles.logout}
          onClick={handleLogout}
        >
          Logout →
        </button>
      </header>

      <main style={styles.content}>

        {/* PAGE HEADING */}
        <div style={{ marginBottom: 28 }}>
          <p
            style={{
              color: '#dc2626',
              fontWeight: 800,
              letterSpacing: 1.4,
              fontSize: 12
            }}
          >
            DRIVER CONTROL CENTER
          </p>

          <h2
            style={{
              color: '#17233b',
              fontSize: 'clamp(28px, 4vw, 38px)',
              margin: '8px 0 10px'
            }}
          >
            Driver Dashboard
          </h2>

          <p
            style={{
              color: '#64748b',
              lineHeight: 1.7,
              margin: 0
            }}
          >
            Manage your assigned ambulance and share
            your GPS location with your hospital
            when tracking is enabled.
          </p>
        </div>

        {/* LOADING */}
        {loading && (
          <div style={styles.card}>
            Loading assigned ambulance...
          </div>
        )}

        {/* NO AMBULANCE */}
        {!loading && !ambulance && (
          <div
            role="alert"
            style={{
              ...styles.card,
              color: '#b91c1c',
              background: '#fef2f2'
            }}
          >
            {error || 'No ambulance assigned to this driver.'}
          </div>
        )}

        {ambulance && (
          <>

            {/* ASSIGNED AMBULANCE */}
            <section style={styles.card}>
              <p style={styles.label}>
                Assigned Ambulance
              </p>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 16
                }}
              >
                <div>
                  <h3
                    style={{
                      fontSize: 34,
                      color: '#10243a',
                      margin: '5px 0 12px'
                    }}
                  >
                    {ambulance.plate_number}
                  </h3>

                  <span
                    style={{
                      display: 'inline-block',
                      background:
                        ambulance.status === 'available'
                          ? '#dcfce7'
                          : '#fef3c7',
                      color:
                        ambulance.status === 'available'
                          ? '#166534'
                          : '#92400e',
                      padding: '7px 13px',
                      borderRadius: 20,
                      fontSize: 13,
                      fontWeight: 700,
                      textTransform: 'capitalize'
                    }}
                  >
                    ● {ambulance.status}
                  </span>
                </div>

                <div
                  style={{
                    background: '#eff6ff',
                    borderRadius: 14,
                    padding: 18,
                    fontSize: 36
                  }}
                >
                  🚑
                </div>
              </div>
            </section>

            {/* GPS TRACKING */}
            <section style={styles.card}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 12,
                  marginBottom: 16
                }}
              >
                <h3
                  style={{
                    ...styles.sectionTitle,
                    margin: 0
                  }}
                >
                  Live GPS Tracking
                </h3>

                <span
                  style={{
                    background: tracking
                      ? '#dcfce7'
                      : '#f1f5f9',
                    color: tracking
                      ? '#166534'
                      : '#475569',
                    borderRadius: 20,
                    padding: '8px 14px',
                    fontSize: 13,
                    fontWeight: 700
                  }}
                >
                  ● {tracking
                    ? 'Tracking Active'
                    : 'Tracking Stopped'}
                </span>
              </div>

              <p
                style={{
                  color: '#64748b',
                  lineHeight: 1.7,
                  marginBottom: 24
                }}
              >
                Your location is shared only after
                you start GPS tracking. Stop tracking
                whenever you no longer want to share
                your location.
              </p>

              <div
                style={{
                  display: 'flex',
                  gap: 12,
                  flexWrap: 'wrap'
                }}
              >
                <button
                  type="button"
                  onClick={startTracking}
                  disabled={tracking}
                  style={{
                    ...styles.primaryButton,
                    opacity: tracking ? 0.5 : 1,
                    cursor: tracking
                      ? 'not-allowed'
                      : 'pointer'
                  }}
                >
                  ▶ Start GPS Tracking
                </button>

                <button
                  type="button"
                  onClick={stopTracking}
                  disabled={!tracking}
                  style={{
                    ...styles.stopButton,
                    opacity: !tracking ? 0.5 : 1,
                    cursor: !tracking
                      ? 'not-allowed'
                      : 'pointer'
                  }}
                >
                  ■ Stop GPS Tracking
                </button>
              </div>

              {message && (
                <div
                  role="status"
                  style={{
                    marginTop: 20,
                    padding: 14,
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: 8,
                    color: '#166534'
                  }}
                >
                  {message}
                </div>
              )}

              {error && (
                <div
                  role="alert"
                  style={{
                    marginTop: 14,
                    padding: 14,
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: 8,
                    color: '#b91c1c'
                  }}
                >
                  {error}
                </div>
              )}
            </section>

            {/* GPS INFORMATION */}
            <section style={styles.card}>
              <h3 style={styles.sectionTitle}>
                Last Recorded GPS Location
              </h3>

              <p
                style={{
                  color: '#64748b',
                  marginBottom: 20
                }}
              >
                These coordinates represent the last
                successfully reported position.
              </p>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: 16
                }}
              >
                {/* LATITUDE */}
                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 10,
                    padding: 20
                  }}
                >
                  <p style={styles.label}>
                    Latitude
                  </p>

                  <strong
                    style={{
                      color: '#17233b',
                      fontSize: 22,
                      overflowWrap: 'anywhere'
                    }}
                  >
                    {hasCoordinates
                      ? coordinates.latitude
                      : 'Not available'}
                  </strong>
                </div>

                {/* LONGITUDE */}
                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 10,
                    padding: 20
                  }}
                >
                  <p style={styles.label}>
                    Longitude
                  </p>

                  <strong
                    style={{
                      color: '#17233b',
                      fontSize: 22,
                      overflowWrap: 'anywhere'
                    }}
                  >
                    {hasCoordinates
                      ? coordinates.longitude
                      : 'Not available'}
                  </strong>
                </div>
              </div>

              {/* LAST UPDATE */}
              <div
                style={{
                  marginTop: 20,
                  padding: 16,
                  borderRadius: 9,
                  background: '#eff6ff',
                  color: '#1e40af'
                }}
              >
                <strong>Last GPS Update:</strong>{' '}
                {formattedTime}
              </div>

              {/* GOOGLE MAPS */}
              {hasCoordinates && (
                <a
                  href={`https://www.google.com/maps?q=${coordinates.latitude},${coordinates.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-block',
                    marginTop: 20,
                    padding: '12px 18px',
                    borderRadius: 8,
                    background: '#10243a',
                    color: '#ffffff',
                    fontWeight: 700,
                    textDecoration: 'none'
                  }}
                >
                  📍 View Last Location on Google Maps ↗
                </a>
              )}
            </section>

            {/* FOOTER */}
            <p
              style={{
                textAlign: 'center',
                color: '#94a3b8',
                fontSize: 12,
                marginTop: 28
              }}
            >
              MediRescue Emergency Response System
              {' '}• Driver Portal
            </p>

          </>
        )}

      </main>
    </div>
  )
}
