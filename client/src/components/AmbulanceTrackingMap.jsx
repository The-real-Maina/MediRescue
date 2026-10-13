
import { useEffect, useMemo, useState } from 'react'
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap
} from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const API = 'http://localhost:5000/api'
const DEFAULT_CENTER = [-0.42, 36.95]
const REFRESH_INTERVAL = 10000
const FRESH_LOCATION_MS = 60000

// ==========================================
// TIME AND GPS STATUS HELPERS
// ==========================================

function parseGpsTime(value) {
  if (!value) return null

  const raw = String(value)
  const normalized = raw.includes('T')
    ? raw
    : raw.replace(' ', 'T')

  const timestamp = Date.parse(
    /(?:Z|[+-]\d{2}:\d{2})$/.test(normalized)
      ? normalized
      : `${normalized}Z`
  )

  return Number.isFinite(timestamp)
    ? timestamp
    : null
}

function getLocationStatus(ambulance, now) {
  if (
    ambulance.current_lat == null ||
    ambulance.current_lng == null ||
    !ambulance.location_updated_at
  ) {
    return 'No GPS data'
  }

  const timestamp = parseGpsTime(
    ambulance.location_updated_at
  )

  if (timestamp === null) {
    return 'Unknown update time'
  }

  const age = now - timestamp

  return age >= 0 && age <= FRESH_LOCATION_MS
    ? 'Recently updated'
    : 'Outdated location'
}

function formatGpsTime(value) {
  const timestamp = parseGpsTime(value)

  if (timestamp === null) {
    return 'Not available'
  }

  return new Date(timestamp).toLocaleString()
}

// ==========================================
// CUSTOM AMBULANCE MAP MARKERS
// ==========================================

function createAmbulanceIcon(isFresh) {
  const background = isFresh
    ? '#16a34a'
    : '#f59e0b'

  const border = isFresh
    ? '#15803d'
    : '#d97706'

  return L.divIcon({
    className: 'medirescue-ambulance-marker',
    html: `
      <div style="
        position:relative;
        width:46px;
        height:46px;
        display:flex;
        align-items:center;
        justify-content:center;
        background:${background};
        border:3px solid #ffffff;
        border-radius:15px;
        box-shadow:0 5px 16px rgba(0,0,0,0.25);
        font-size:25px;
      ">
        🚑
        <div style="
          position:absolute;
          bottom:-10px;
          left:14px;
          width:12px;
          height:12px;
          background:${background};
          transform:rotate(45deg);
          border-right:2px solid #ffffff;
          border-bottom:2px solid #ffffff;
        "></div>
      </div>
    `,
    iconSize: [46, 46],
    iconAnchor: [23, 53],
    popupAnchor: [0, -48]
  })
}

const freshIcon = createAmbulanceIcon(true)
const outdatedIcon = createAmbulanceIcon(false)

// ==========================================
// FIT MAP TO AMBULANCE POSITIONS
// ==========================================

function FitAmbulances({ positions }) {
  const map = useMap()

  const positionKey = positions
    .map(([lat, lng]) => `${lat},${lng}`)
    .join('|')

  useEffect(() => {
    if (positions.length === 0) return

    if (positions.length === 1) {
      map.setView(positions[0], 14)
    } else {
      map.fitBounds(positions, {
        padding: [50, 50],
        maxZoom: 15
      })
    }
    // Refit only when the reported positions change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, positionKey])

  return null
}

// ==========================================
// MAIN GPS TRACKING COMPONENT
// ==========================================

export default function AmbulanceTrackingMap() {
  const [ambulances, setAmbulances] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastRefresh, setLastRefresh] = useState(null)
  const [now, setNow] = useState(Date.now())

  // ==========================================
  // FETCH HOSPITAL AMBULANCE LOCATIONS
  // ==========================================

  useEffect(() => {
    let mounted = true
    let controller = null

    async function loadLocations() {
      if (controller) controller.abort()

      const currentController = new AbortController()
      controller = currentController

      try {
        const token = localStorage.getItem(
          'medirescue_token'
        )

        if (!token) {
          throw new Error('Please log in again.')
        }

        const response = await fetch(
          `${API}/ambulances/locations`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            },
            signal: currentController.signal
          }
        )

        const data = await response.json()

        if (!response.ok) {
          throw new Error(
            data.error ||
            'Failed to load ambulance locations'
          )
        }

        if (!Array.isArray(data)) {
          throw new Error(
            'Unexpected ambulance location response'
          )
        }

        if (!mounted) return

        setAmbulances(data)
        setLastRefresh(new Date())
        setNow(Date.now())
        setError('')
      } catch (err) {
        if (
          !mounted ||
          err.name === 'AbortError'
        ) {
          return
        }

        setError(err.message)
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    loadLocations()

    const interval = setInterval(
      loadLocations,
      REFRESH_INTERVAL
    )

    return () => {
      mounted = false
      clearInterval(interval)

      if (controller) {
        controller.abort()
      }
    }
  }, [])

  // ==========================================
  // VALID GPS COORDINATES
  // ==========================================

  const locatedAmbulances = ambulances.filter(
    (ambulance) => {
      if (
        ambulance.current_lat == null ||
        ambulance.current_lng == null
      ) {
        return false
      }

      const lat = Number(ambulance.current_lat)
      const lng = Number(ambulance.current_lng)

      return (
        Number.isFinite(lat) &&
        Number.isFinite(lng) &&
        lat >= -90 &&
        lat <= 90 &&
        lng >= -180 &&
        lng <= 180
      )
    }
  )

  const positions = useMemo(
    () =>
      locatedAmbulances.map((ambulance) => [
        Number(ambulance.current_lat),
        Number(ambulance.current_lng)
      ]),
    // Only rebuild positions when new API data arrives.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ambulances]
  )

  const freshCount = locatedAmbulances.filter(
    (ambulance) =>
      getLocationStatus(ambulance, now) ===
      'Recently updated'
  ).length

  const outdatedCount =
    locatedAmbulances.length - freshCount

  const noGpsCount =
    ambulances.length - locatedAmbulances.length

  // ==========================================
  // INTERFACE
  // ==========================================

  return (
    <section
      style={{
        background: '#ffffff',
        padding: 26,
        borderRadius: 15,
        border: '1px solid #e2e8f0',
        boxShadow: '0 5px 20px rgba(15,23,42,0.04)',
        marginBottom: 30,
        color: '#17233b'
      }}
    >
      {/* HEADER */}
      <div style={{ marginBottom: 22 }}>
        <p
          style={{
            color: '#dc2626',
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: 1.2,
            margin: '0 0 8px'
          }}
        >
          EMERGENCY RESPONSE MONITORING
        </p>

        <h2
          style={{
            margin: '0 0 9px',
            color: '#10243a',
            fontSize: 25
          }}
        >
          🚑 Ambulance GPS Tracking
        </h2>

        <p
          style={{
            color: '#64748b',
            lineHeight: 1.6,
            margin: 0
          }}
        >
          Monitor the latest reported locations
          of ambulances assigned to your hospital.
        </p>
      </div>

      {/* STATISTICS */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fit, minmax(145px, 1fr))',
          gap: 12,
          marginBottom: 22
        }}
      >
        {[
          {
            label: 'Total Ambulances',
            value: ambulances.length,
            color: '#10243a',
            bg: '#f1f5f9'
          },
          {
            label: 'Recently Updated',
            value: freshCount,
            color: '#166534',
            bg: '#dcfce7'
          },
          {
            label: 'Outdated GPS',
            value: outdatedCount,
            color: '#92400e',
            bg: '#fef3c7'
          },
          {
            label: 'No GPS Data',
            value: noGpsCount,
            color: '#475569',
            bg: '#f1f5f9'
          }
        ].map((item) => (
          <div
            key={item.label}
            style={{
              background: item.bg,
              borderRadius: 11,
              padding: '16px 18px'
            }}
          >
            <div
              style={{
                color: item.color,
                fontSize: 27,
                fontWeight: 800
              }}
            >
              {item.value}
            </div>

            <div
              style={{
                color: item.color,
                fontSize: 12,
                fontWeight: 700,
                marginTop: 4
              }}
            >
              {item.label}
            </div>
          </div>
        ))}
      </div>

      {/* LEGEND */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 20,
          marginBottom: 16,
          fontSize: 13,
          color: '#475569'
        }}
      >
        <span>🟢 Recently updated GPS</span>
        <span>🟠 Outdated GPS location</span>
        <span>⚪ No GPS coordinates</span>
      </div>

      {loading && (
        <p style={{ color: '#64748b' }}>
          Loading ambulance locations...
        </p>
      )}

      {error && (
        <div
          role="alert"
          style={{
            color: '#b91c1c',
            background: '#fef2f2',
            padding: 13,
            borderRadius: 9,
            marginBottom: 16
          }}
        >
          {error}
        </div>
      )}

      {/* MAP */}
      <div
        style={{
          height: 440,
          width: '100%',
          borderRadius: 12,
          overflow: 'hidden',
          border: '1px solid #cbd5e1'
        }}
      >
        <MapContainer
          center={DEFAULT_CENTER}
          zoom={11}
          style={{
            height: '100%',
            width: '100%'
          }}
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <FitAmbulances positions={positions} />

          {locatedAmbulances.map((ambulance) => {
            const lat = Number(
              ambulance.current_lat
            )

            const lng = Number(
              ambulance.current_lng
            )

            const locationStatus =
              getLocationStatus(ambulance, now)

            const isFresh =
              locationStatus === 'Recently updated'

            return (
              <Marker
                key={ambulance.id}
                position={[lat, lng]}
                icon={
                  isFresh
                    ? freshIcon
                    : outdatedIcon
                }
              >
                <Popup minWidth={240} maxWidth={310}>
                  <div
                    style={{
                      fontFamily:
                        'Arial, sans-serif',
                      color: '#17233b',
                      minWidth: 215
                    }}
                  >
                    <div
                      style={{
                        fontSize: 18,
                        fontWeight: 800,
                        color: '#10243a',
                        marginBottom: 10
                      }}
                    >
                      🚑 {ambulance.plate_number}
                    </div>

                    <div
                      style={{
                        display: 'inline-block',
                        background: isFresh
                          ? '#dcfce7'
                          : '#fef3c7',
                        color: isFresh
                          ? '#166534'
                          : '#92400e',
                        padding: '6px 10px',
                        borderRadius: 15,
                        fontWeight: 700,
                        fontSize: 12,
                        marginBottom: 12
                      }}
                    >
                      ● {locationStatus}
                    </div>

                    <p style={{ margin: '8px 0' }}>
                      <strong>Driver:</strong>{' '}
                      {ambulance.driver_name ||
                        'Not assigned'}
                    </p>

                    <p style={{ margin: '8px 0' }}>
                      <strong>Ambulance status:</strong>{' '}
                      {ambulance.status}
                    </p>

                    <p style={{ margin: '8px 0' }}>
                      <strong>Last GPS update:</strong>{' '}
                      {formatGpsTime(
                        ambulance.location_updated_at
                      )}
                    </p>

                    <p
                      style={{
                        margin: '8px 0',
                        fontSize: 12,
                        color: '#64748b'
                      }}
                    >
                      {lat.toFixed(6)}, {lng.toFixed(6)}
                    </p>

                    <a
                      href={`https://www.google.com/maps?q=${lat},${lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-block',
                        background: '#10243a',
                        color: '#ffffff',
                        padding: '10px 13px',
                        borderRadius: 7,
                        fontWeight: 700,
                        textDecoration: 'none',
                        marginTop: 8
                      }}
                    >
                      📍 Open in Google Maps ↗
                    </a>
                  </div>
                </Popup>
              </Marker>
            )
          })}
        </MapContainer>
      </div>

      {/* MAP FOOTER */}
      <p
        style={{
          fontSize: 13,
          color: '#64748b',
          marginTop: 15,
          lineHeight: 1.6
        }}
      >
        GPS data refreshes every 10 seconds.
        Green markers indicate a location reported
        within the last 60 seconds. Orange markers
        indicate older positions, which may not
        represent an ambulance's current location.
      </p>

      {lastRefresh && (
        <p
          style={{
            fontSize: 12,
            color: '#64748b'
          }}
        >
          Last checked:{' '}
          {lastRefresh.toLocaleTimeString()}
        </p>
      )}

      {!loading &&
        ambulances.length > 0 &&
        locatedAmbulances.length === 0 && (
          <p style={{ color: '#92400e' }}>
            No ambulances have reported valid GPS
            coordinates yet.
          </p>
        )}
    </section>
  )
}
