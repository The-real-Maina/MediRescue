
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AmbulanceTrackingMap from '../components/AmbulanceTrackingMap'
import PatientHealthSummary from '../components/PatientHealthSummary'
import StaffHRPanel from '../components/StaffHRPanel'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const COLORS = {
  navy: '#10243a',
  red: '#dc2626',
  background: '#f1f5f9',
  border: '#e2e8f0',
  muted: '#64748b',
  text: '#17233b',
  green: '#16a34a'
}

const nextStatuses = {
  handed_over: 'in_treatment',
  in_treatment: 'payment_pending',
  paid: 'closed'
}

const trackingStages = [
  { status: 'dispatched', label: 'Ambulance Dispatched', description: 'An ambulance and driver have been assigned.' },
  { status: 'picked_up', label: 'Patient Picked Up', description: 'The driver has confirmed patient pickup.' },
  { status: 'arrived_at_hospital', label: 'Arrived at Hospital', description: 'The driver has confirmed hospital arrival.' },
  { status: 'handed_over', label: 'Patient Handed Over', description: 'Hospital staff have received the patient.' }
]

const trackingStatuses = [
  'dispatched',
  'picked_up',
  'arrived_at_hospital'
]

const statusColors = {
  requested: ['#fff1f2', '#be123c'],
  dispatched: ['#fff7ed', '#c2410c'],
  picked_up: ['#eef2ff', '#4338ca'],
  arrived_at_hospital: ['#e0f2fe', '#0369a1'],
  handed_over: ['#f0fdfa', '#0f766e'],
  in_treatment: ['#f5f3ff', '#6d28d9'],
  payment_pending: ['#fffbeb', '#92400e'],
  paid: ['#ecfdf5', '#047857'],
  closed: ['#ecfdf5', '#047857'],
  available: ['#ecfdf5', '#047857'],
  dispatched_ambulance: ['#fff7ed', '#c2410c'],
  en_route: ['#eff6ff', '#1d4ed8'],
  returning: ['#fff7ed', '#c2410c']
}

const styles = {
  page: {
    minHeight: '100vh',
    background: COLORS.background,
    color: COLORS.text,
    fontFamily: "'Segoe UI', Arial, sans-serif"
  },
  content: {
    maxWidth: 1240,
    margin: 'auto',
    padding: '38px 20px 80px',
    boxSizing: 'border-box'
  },
  eyebrow: {
    color: COLORS.red,
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: 1.5,
    margin: '0 0 12px'
  },
  title: {
    color: COLORS.navy,
    fontSize: 'clamp(30px, 4vw, 40px)',
    fontWeight: 800,
    margin: '0 0 12px'
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: 15,
    lineHeight: 1.7,
    margin: 0
  },
  card: {
    background: '#fff',
    border: `1px solid ${COLORS.border}`,
    borderRadius: 15,
    boxShadow: '0 6px 24px rgba(15,23,42,0.05)'
  },
  button: {
    background: COLORS.red,
    color: '#fff',
    border: 'none',
    borderRadius: 9,
    padding: '12px 18px',
    fontWeight: 700,
    fontSize: 13,
    cursor: 'pointer',
    minHeight: 43
  },
  secondaryButton: {
    background: '#fff',
    color: COLORS.navy,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 9,
    padding: '12px 18px',
    fontWeight: 700,
    fontSize: 13,
    cursor: 'pointer',
    minHeight: 43
  },
  label: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: 1,
    margin: '0 0 8px',
    textTransform: 'uppercase'
  },
  sectionTitle: {
    color: COLORS.navy,
    fontSize: 23,
    fontWeight: 800,
    margin: 0
  },
  sectionDescription: {
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 1.7,
    margin: '8px 0 0'
  },
  notice: {
    padding: '16px 19px',
    borderRadius: 10,
    marginBottom: 20,
    lineHeight: 1.6
  },
  detailGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))',
    gap: 18,
    background: '#f8fafc',
    border: `1px solid ${COLORS.border}`,
    borderRadius: 11,
    padding: 20
  },
  select: {
    flex: '1 1 250px',
    minHeight: 44,
    borderRadius: 9,
    border: '1px solid #cbd5e1',
    background: '#fff',
    color: COLORS.text,
    padding: '10px 13px',
    fontSize: 14
  },
  actionPanel: {
    marginTop: 23,
    padding: 20,
    background: '#f8fafc',
    border: `1px solid ${COLORS.border}`,
    borderRadius: 11
  },
  suggestionBox: {
    marginTop: 16,
    padding: '14px 16px',
    background: '#ecfdf5',
    border: '1px solid #a7f3d0',
    borderRadius: 10,
    color: '#065f46',
    fontSize: 14,
    lineHeight: 1.6
  },
  footer: {
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 45
  }
}

function formatStatus(status) {
  return String(status || 'Unknown')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, letter => letter.toUpperCase())
}

function formatDistance(km) {
  const value = Number(km)

  if (!Number.isFinite(value)) return ''
  if (value < 0.1) return 'under 0.1 km'

  return `${value.toFixed(1)} km`
}

function formatPositionNote(minutes) {
  if (minutes === null || minutes === undefined) {
    return 'Position not live'
  }

  if (minutes <= 10) return 'Live GPS'
  if (minutes < 60) return `Last GPS update ${minutes} min ago`
  if (minutes < 1440) {
    return `Last GPS update ${Math.floor(minutes / 60)} h ago`
  }

  return `Last GPS update ${Math.floor(minutes / 1440)} d ago`
}

function ambulanceOptionLabel(ambulance) {
  const driver = ambulance.driver_name
    ? ` - ${ambulance.driver_name}`
    : ambulance.driver_id
      ? ` - Driver #${ambulance.driver_id}`
      : ' - No driver assigned'

  const distance =
    ambulance.distance_km !== null &&
    ambulance.distance_km !== undefined
      ? ` - ${formatDistance(ambulance.distance_km)} away`
      : ''

  const closest = ambulance.suggested ? ' (closest)' : ''

  return `${ambulance.plate_number}${driver}${distance}${closest}`
}

function StatusBadge({ status }) {
  const [background, color] =
    statusColors[status] || ['#f1f5f9', '#475569']

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        padding: '8px 13px',
        borderRadius: 999,
        background,
        color,
        fontSize: 12,
        fontWeight: 800,
        whiteSpace: 'nowrap'
      }}
    >
      <span aria-hidden="true">●</span>
      {formatStatus(status)}
    </span>
  )
}

function TrackingTimeline({ currentStatus }) {
  const currentIndex = trackingStages.findIndex(
    stage => stage.status === currentStatus
  )

  return (
    <div style={{ marginTop: 22 }}>
      <h4 style={{ color: COLORS.navy, marginBottom: 20 }}>
        Emergency Response Progress
      </h4>

      {trackingStages.map((stage, index) => {
        const completed = index < currentIndex
        const current = index === currentIndex
        const reached = completed || current

        return (
          <div
            key={stage.status}
            style={{
              display: 'flex',
              gap: 17,
              paddingBottom: index === trackingStages.length - 1 ? 0 : 25,
              position: 'relative'
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                minWidth: 34
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  display: 'grid',
                  placeItems: 'center',
                  background: reached ? COLORS.green : '#e2e8f0',
                  color: reached ? '#fff' : '#64748b',
                  fontWeight: 800,
                  zIndex: 1
                }}
              >
                {completed ? '✓' : index + 1}
              </div>

              {index < trackingStages.length - 1 && (
                <div
                  style={{
                    width: 3,
                    flex: 1,
                    minHeight: 30,
                    background: completed ? COLORS.green : '#e2e8f0',
                    marginTop: 5
                  }}
                />
              )}
            </div>

            <div style={{ paddingTop: 3, flex: 1 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 10
                }}
              >
                <strong style={{ color: COLORS.navy }}>
                  {stage.label}
                </strong>

                {current && (
                  <span style={{
                    background: '#dbeafe',
                    color: '#1d4ed8',
                    borderRadius: 20,
                    padding: '4px 9px',
                    fontSize: 11,
                    fontWeight: 800
                  }}>
                    CURRENT STAGE
                  </span>
                )}
              </div>

              <p style={{
                color: COLORS.muted,
                fontSize: 13,
                margin: '6px 0'
              }}>
                {stage.description}
              </p>

              <span style={{
                color: completed
                  ? COLORS.green
                  : current
                    ? '#1d4ed8'
                    : '#94a3b8',
                fontSize: 12,
                fontWeight: 700
              }}>
                {completed
                  ? 'Completed'
                  : current
                    ? 'In progress / latest confirmed stage'
                    : 'Pending'}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function TrackingCard({ item }) {
  return (
    <article
      style={{
        ...styles.card,
        overflow: 'hidden',
        marginBottom: 20
      }}
    >
      <div style={{ height: 4, background: COLORS.red }} />

      <div style={{ padding: 25 }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 14,
          marginBottom: 20
        }}>
          <div>
            <p style={styles.eyebrow}>
              EMERGENCY CASE #{item.id}
            </p>

            <h3 style={{
              color: COLORS.navy,
              fontSize: 21,
              margin: 0
            }}>
              {item.emergency_type || 'Emergency Response'}
            </h3>
          </div>

          <StatusBadge status={item.status} />
        </div>

        <div style={styles.detailGrid}>
          <div>
            <p style={styles.label}>PATIENT</p>
            <strong>
              {item.patient_name || `Patient #${item.patient_id}`}
            </strong>
          </div>

          <div>
            <p style={styles.label}>AMBULANCE</p>
            <strong>Ambulance #{item.ambulance_id}</strong>
          </div>

          <div>
            <p style={styles.label}>CURRENT STATUS</p>
            <StatusBadge status={item.status} />
          </div>

          <div>
            <p style={styles.label}>SEVERITY</p>
            <strong>{formatStatus(item.severity)}</strong>
          </div>
        </div>

        <TrackingTimeline currentStatus={item.status} />

        {item.status === 'dispatched' && (
          <div style={{
            ...styles.actionPanel,
            background: '#fff7ed'
          }}>
            <strong>Awaiting driver pickup confirmation</strong>
            <p style={styles.sectionDescription}>
              The ambulance has been dispatched. The driver must
              confirm that the patient has been picked up.
            </p>
          </div>
        )}

        {item.status === 'picked_up' && (
          <div style={{
            ...styles.actionPanel,
            background: '#eff6ff'
          }}>
            <strong>Patient picked up</strong>
            <p style={styles.sectionDescription}>
              The driver has confirmed pickup. Hospital staff
              are waiting for the driver to confirm arrival.
            </p>
          </div>
        )}

        {item.status === 'arrived_at_hospital' && (
          <div style={{
            ...styles.actionPanel,
            background: '#ecfdf5'
          }}>
            <strong>Ambulance arrived at hospital</strong>
            <p style={styles.sectionDescription}>
              The driver has confirmed arrival. Hospital staff
              can complete patient handover from Emergency Cases.
            </p>
          </div>
        )}
      </div>
    </article>
  )
}

export default function StaffDashboard({ view = 'dashboard' }) {
  const navigate = useNavigate()

  const [cases, setCases] = useState([])
  const [ambulances, setAmbulances] = useState([])
  const [ambulanceStatuses, setAmbulanceStatuses] = useState({})
  const [selectedAmbulances, setSelectedAmbulances] = useState({})
  const [suggestionsByCase, setSuggestionsByCase] = useState({})

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [dispatchingCase, setDispatchingCase] = useState(null)
  const [updatingCase, setUpdatingCase] = useState(null)
  const [returningAmbulance, setReturningAmbulance] = useState(null)
  const [lastRefresh, setLastRefresh] = useState(null)

  const request = useCallback(async (path, options = {}) => {
    const token = localStorage.getItem('medirescue_token')

    if (!token) {
      navigate('/login', { replace: true })
      throw new Error('Please log in again.')
    }

    const response = await fetch(`${API}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options.headers
      }
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('medirescue_token')
        localStorage.removeItem('medirescue_user')
        navigate('/login', { replace: true })
      }

      throw new Error(data.error || 'Request failed')
    }

    return data
  }, [navigate])

  const loadDashboard = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true)

    try {
      const [caseData, ambulanceData] = await Promise.all([
        request('/cases/hospital'),
        request('/ambulances/available')
      ])

      const caseList = Array.isArray(caseData)
        ? caseData
        : caseData.cases || []

      setCases(caseList)
      setAmbulances(
        Array.isArray(ambulanceData) ? ambulanceData : []
      )

      const ambulanceIds = [
        ...new Set(
          caseList
            .map(item => item.ambulance_id)
            .filter(Boolean)
        )
      ]

      const results = await Promise.allSettled(
        ambulanceIds.map(id =>
          request(`/ambulances/${id}/status`)
        )
      )

      const statusMap = {}

      ambulanceIds.forEach((id, index) => {
        if (results[index].status === 'fulfilled') {
          const result = results[index].value

          statusMap[id] =
            typeof result === 'string'
              ? result
              : result?.status || result?.ambulance?.status
        }
      })

      setAmbulanceStatuses(statusMap)

      const requestedIds = caseList
        .filter(item => item.status === 'requested')
        .map(item => item.id)

      const suggestionResults = await Promise.allSettled(
        requestedIds.map(id =>
          request(`/ambulances/suggestions/${id}`)
        )
      )

      const suggestionMap = {}

      requestedIds.forEach((id, index) => {
        if (suggestionResults[index].status === 'fulfilled') {
          suggestionMap[id] = suggestionResults[index].value
        }
      })

      setSuggestionsByCase(suggestionMap)

      setLastRefresh(new Date())
      setError('')
    } catch (err) {
      setError(err.message || 'Unable to load hospital data')
    } finally {
      if (showLoading) setLoading(false)
    }
  }, [request])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  useEffect(() => {
    if (view !== 'tracking') return

    const interval = setInterval(() => {
      loadDashboard(false)
    }, 10000)

    return () => clearInterval(interval)
  }, [view, loadDashboard])

  const getAmbulanceOptions = caseId =>
    suggestionsByCase[caseId]?.ambulances ?? ambulances

  const getSelectedAmbulanceId = caseId => {
    const options = getAmbulanceOptions(caseId)
    const chosen = selectedAmbulances[caseId]

    if (
      chosen &&
      options.some(item => String(item.id) === String(chosen))
    ) {
      return String(chosen)
    }

    const suggested = options.find(item => item.suggested)

    return suggested ? String(suggested.id) : ''
  }

  const handleDispatch = async caseId => {
    const ambulanceId = getSelectedAmbulanceId(caseId)

    if (!ambulanceId) {
      setError('Please select an ambulance first.')
      return
    }

    setError('')
    setSuccess('')
    setDispatchingCase(caseId)

    try {
      const data = await request(`/cases/${caseId}/ambulance`, {
        method: 'PATCH',
        body: JSON.stringify({
          ambulance_id: Number(ambulanceId)
        })
      })

      setSuccess(
        `Ambulance ${data.ambulance_plate || `#${ambulanceId}`} dispatched for Case #${caseId}.`
      )

      setSelectedAmbulances(current => {
        const updated = { ...current }
        delete updated[caseId]
        return updated
      })

      await loadDashboard(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setDispatchingCase(null)
    }
  }

  const handleHandover = async caseId => {
    setError('')
    setSuccess('')
    setUpdatingCase(caseId)

    try {
      await request(`/cases/${caseId}/handover`, {
        method: 'PATCH'
      })

      setSuccess(
        `Patient handover confirmed for Case #${caseId}. Treatment can now begin.`
      )

      await loadDashboard(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setUpdatingCase(null)
    }
  }

  const handleStatusUpdate = async (caseId, status) => {
    if (!['in_treatment', 'payment_pending', 'closed'].includes(status)) {
      setError('This status cannot be updated by hospital staff.')
      return
    }

    setError('')
    setSuccess('')
    setUpdatingCase(caseId)

    try {
      await request(`/cases/${caseId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      })

      setSuccess(
        `Case #${caseId} updated to ${formatStatus(status)}.`
      )

      await loadDashboard(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setUpdatingCase(null)
    }
  }

  const handleAmbulanceReturn = async ambulanceId => {
    const confirmed = window.confirm(
      `Confirm Ambulance #${ambulanceId} has physically returned and is ready for another emergency?`
    )

    if (!confirmed) return

    setError('')
    setSuccess('')
    setReturningAmbulance(ambulanceId)

    try {
      await request(`/ambulances/${ambulanceId}/return`, {
        method: 'PATCH'
      })

      setSuccess(
        `Ambulance #${ambulanceId} return confirmed.`
      )

      await loadDashboard(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setReturningAmbulance(null)
    }
  }

  const visibleCases = cases.filter(item =>
    view === 'history'
      ? item.status === 'closed'
      : item.status !== 'closed'
  )

  const trackedCases = cases.filter(item =>
    trackingStatuses.includes(item.status) &&
    item.ambulance_id
  )

  const summary = [
    {
      label: 'Total Cases',
      value: cases.length,
      symbol: '▤',
      accent: '#2563eb',
      tint: '#eff6ff'
    },
    {
      label: 'Active Cases',
      value: cases.filter(item =>
        !['closed', 'paid', 'payment_pending'].includes(item.status)
      ).length,
      symbol: '✚',
      accent: COLORS.red,
      tint: '#fff1f2'
    },
    {
      label: 'Awaiting Payment',
      value: cases.filter(item =>
        item.status === 'payment_pending'
      ).length,
      symbol: 'KSh',
      accent: '#d97706',
      tint: '#fffbeb'
    },
    {
      label: 'Closed Cases',
      value: cases.filter(item =>
        item.status === 'closed'
      ).length,
      symbol: '✓',
      accent: '#059669',
      tint: '#ecfdf5'
    }
  ]

  const viewTitles = {
    dashboard: 'Hospital Staff Dashboard',
    tracking: 'Ambulance Tracking',
    cases: 'Emergency Case Management',
    history: 'Closed Cases / History'
  }

  const viewDescriptions = {
    dashboard:
      'An overview of emergency cases and hospital response performance.',
    tracking:
      'Track dispatched ambulances from patient pickup to hospital arrival.',
    cases:
      'Review emergency requests, dispatch ambulances and manage patient response.',
    history:
      'Review completed and closed emergency cases.'
  }

  return (
    <div style={styles.page}>
      <main style={styles.content}>
        <section style={{ marginBottom: 30 }}>
          <p style={styles.eyebrow}>
            EMERGENCY RESPONSE CONTROL CENTER
          </p>

          <h1 style={styles.title}>
            {viewTitles[view] || viewTitles.cases}
          </h1>

          <p style={styles.subtitle}>
            {viewDescriptions[view] || viewDescriptions.cases}
          </p>
        </section>

        {error && (
          <div
            role="alert"
            style={{
              ...styles.notice,
              background: '#fff1f2',
              color: '#be123c',
              border: '1px solid #fecdd3'
            }}
          >
            {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            style={{
              ...styles.notice,
              background: '#ecfdf5',
              color: '#047857',
              border: '1px solid #a7f3d0'
            }}
          >
            {success}
          </div>
        )}

        {view === 'dashboard' && (
          <>
            <section style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(215px, 1fr))',
              gap: 17,
              marginBottom: 35
            }}>
              {summary.map(item => (
                <div
                  key={item.label}
                  style={{
                    ...styles.card,
                    padding: 23,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12
                  }}
                >
                  <div>
                    <p style={{
                      color: COLORS.muted,
                      fontSize: 12,
                      fontWeight: 700,
                      margin: '0 0 12px'
                    }}>
                      {item.label}
                    </p>

                    <strong style={{
                      color: COLORS.navy,
                      fontSize: 33
                    }}>
                      {item.value}
                    </strong>
                  </div>

                  <span style={{
                    background: item.tint,
                    color: item.accent,
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    display: 'grid',
                    placeItems: 'center',
                    fontWeight: 900,
                    fontSize: item.symbol === 'KSh' ? 13 : 24
                  }}>
                    {item.symbol}
                  </span>
                </div>
              ))}
            </section>

            {/* Staff and driver HR features */}
            <StaffHRPanel />
          </>
        )}

        {view === 'tracking' && (
          <section style={{ marginBottom: 36 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 15,
              marginBottom: 22
            }}>
              <div>
                <p style={styles.eyebrow}>
                  LIVE AMBULANCE OPERATIONS
                </p>

                <h2 style={styles.sectionTitle}>
                  Dispatched Ambulances
                </h2>

                <p style={styles.sectionDescription}>
                  Only ambulances assigned to active emergency responses
                  appear below.
                </p>
              </div>

              <button
                type="button"
                onClick={() => loadDashboard(false)}
                style={styles.secondaryButton}
              >
                ↻ Refresh Tracking
              </button>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 15,
              marginBottom: 24
            }}>
              {[
                {
                  label: 'Active Dispatches',
                  value: trackedCases.length
                },
                {
                  label: 'Awaiting Pickup',
                  value: trackedCases.filter(item =>
                    item.status === 'dispatched'
                  ).length
                },
                {
                  label: 'Patient Picked Up',
                  value: trackedCases.filter(item =>
                    item.status === 'picked_up'
                  ).length
                },
                {
                  label: 'Arrived at Hospital',
                  value: trackedCases.filter(item =>
                    item.status === 'arrived_at_hospital'
                  ).length
                }
              ].map(item => (
                <div
                  key={item.label}
                  style={{
                    ...styles.card,
                    padding: 20
                  }}
                >
                  <strong style={{
                    display: 'block',
                    color: COLORS.navy,
                    fontSize: 29
                  }}>
                    {item.value}
                  </strong>

                  <span style={{
                    color: COLORS.muted,
                    fontSize: 13,
                    fontWeight: 700
                  }}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>

            {loading && (
              <div style={{
                ...styles.card,
                padding: 25,
                marginBottom: 22
              }}>
                Loading dispatched emergency cases...
              </div>
            )}

            {!loading && !error && trackedCases.length === 0 && (
              <div style={{
                ...styles.card,
                padding: 30,
                textAlign: 'center',
                marginBottom: 25
              }}>
                <h3 style={{ color: COLORS.navy }}>
                  No Active Ambulance Dispatches
                </h3>

                <p style={styles.sectionDescription}>
                  When hospital staff dispatch an ambulance for an
                  emergency, its progress will appear here.
                </p>
              </div>
            )}

            {!loading && trackedCases.map(item => (
              <TrackingCard key={item.id} item={item} />
            ))}

            <p style={{
              color: COLORS.muted,
              fontSize: 12,
              margin: '14px 0 28px'
            }}>
              Case statuses refresh automatically every 10 seconds.
              Driver actions determine pickup and arrival updates.
              GPS locations are reported separately.
              {lastRefresh && (
                <> Last checked: {lastRefresh.toLocaleTimeString()}.</>
              )}
            </p>

            <AmbulanceTrackingMap />
          </section>
        )}

        {(view === 'cases' || view === 'history') && (
          <>
            <section style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 15,
              marginBottom: 20
            }}>
              <div>
                <p style={styles.eyebrow}>CASE MANAGEMENT</p>

                <h2 style={styles.sectionTitle}>
                  {view === 'history'
                    ? 'Closed Cases / History'
                    : 'Emergency Cases'}
                </h2>

                <p style={styles.sectionDescription}>
                  {view === 'history'
                    ? 'Review previously closed emergencies.'
                    : 'Review requests and coordinate each patient’s emergency response.'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => loadDashboard(false)}
                style={styles.secondaryButton}
              >
                ↻ Refresh Cases
              </button>
            </section>

            {loading && (
              <div style={{ ...styles.card, padding: 30 }}>
                Loading hospital emergency cases...
              </div>
            )}

            {!loading && visibleCases.length === 0 && (
              <div style={{
                ...styles.card,
                padding: '45px 24px',
                textAlign: 'center'
              }}>
                <h3 style={{ color: COLORS.navy }}>
                  {view === 'history'
                    ? 'No Closed Cases'
                    : 'No Emergency Cases'}
                </h3>

                <p style={{ color: COLORS.muted }}>
                  No records available for this section.
                </p>
              </div>
            )}

            {!loading && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 20
              }}>
                {visibleCases.map(caseItem => {
                  const nextStatus = nextStatuses[caseItem.status]

                  const ambulanceStatus =
                    ambulanceStatuses[caseItem.ambulance_id]

                  const canReturn =
                    ['handed_over', 'in_treatment', 'payment_pending', 'paid'].includes(
                      caseItem.status
                    ) &&
                    ['dispatched', 'en_route', 'returning'].includes(
                      ambulanceStatus
                    )

                  const isBusy = updatingCase !== null

                  const suggestion = suggestionsByCase[caseItem.id]
                  const ambulanceOptions = getAmbulanceOptions(caseItem.id)
                  const closestAmbulance = ambulanceOptions.find(
                    item => item.suggested
                  )
                  const selectedAmbulanceId = getSelectedAmbulanceId(
                    caseItem.id
                  )

                  return (
                    <article
                      key={caseItem.id}
                      style={{
                        ...styles.card,
                        overflow: 'hidden'
                      }}
                    >
                      <div style={{
                        height: 4,
                        background: COLORS.red
                      }} />

                      <div style={{
                        padding: 'clamp(20px, 4vw, 28px)'
                      }}>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          flexWrap: 'wrap',
                          gap: 16,
                          marginBottom: 20
                        }}>
                          <div>
                            <p style={styles.eyebrow}>
                              EMERGENCY CASE #{caseItem.id}
                            </p>

                            <h3 style={{
                              color: COLORS.navy,
                              fontSize: 22,
                              fontWeight: 800,
                              margin: 0
                            }}>
                              {caseItem.emergency_type ||
                                'Emergency Request'}
                            </h3>
                          </div>

                          <StatusBadge status={caseItem.status} />
                        </div>

                        <p style={{
                          color: COLORS.muted,
                          fontSize: 14,
                          lineHeight: 1.8,
                          margin: '0 0 22px'
                        }}>
                          {caseItem.emergency_desc ||
                            'No emergency description provided.'}
                        </p>

                        <div style={styles.detailGrid}>
                          <div>
                            <p style={styles.label}>PATIENT</p>
                            <strong>
                              {caseItem.patient_name ||
                                `Patient ${caseItem.patient_id}`}
                            </strong>
                          </div>

                          <div>
                            <p style={styles.label}>SEVERITY</p>
                            <strong>
                              {formatStatus(caseItem.severity)}
                            </strong>
                          </div>

                          <div>
                            <p style={styles.label}>CURRENT STATUS</p>
                            <StatusBadge status={caseItem.status} />
                          </div>
                        </div>

                        {caseItem.status !== 'closed' && (
                          <PatientHealthSummary caseId={caseItem.id} />
                        )}

                        {caseItem.status === 'requested' && (
                          <section style={styles.actionPanel}>
                            <h4 style={{
                              color: COLORS.navy,
                              margin: '0 0 10px'
                            }}>
                              Dispatch Ambulance
                            </h4>

                            <p style={styles.sectionDescription}>
                              Select an available ambulance with an
                              assigned driver.
                            </p>

                            {closestAmbulance && (
                              <div style={styles.suggestionBox}>
                                <strong>
                                  Closest available ambulance:{' '}
                                  {closestAmbulance.plate_number}
                                </strong>

                                <div>
                                  {formatDistance(
                                    closestAmbulance.distance_km
                                  )}{' '}
                                  from the patient
                                  {closestAmbulance.driver_name
                                    ? ` · Driver ${closestAmbulance.driver_name}`
                                    : ''}
                                  {' · '}
                                  {formatPositionNote(
                                    closestAmbulance.position_age_minutes
                                  )}
                                </div>
                              </div>
                            )}

                            {suggestion &&
                              !suggestion.has_pickup_location && (
                                <p style={{
                                  ...styles.sectionDescription,
                                  color: '#92400e'
                                }}>
                                  This request has no patient location,
                                  so ambulances cannot be ranked by distance.
                                </p>
                              )}

                            {ambulanceOptions.length > 0 ? (
                              <div style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: 12,
                                marginTop: 17
                              }}>
                                <select
                                  aria-label={`Ambulance for case ${caseItem.id}`}
                                  value={selectedAmbulanceId}
                                  onChange={e =>
                                    setSelectedAmbulances(current => ({
                                      ...current,
                                      [caseItem.id]: e.target.value
                                    }))
                                  }
                                  style={styles.select}
                                >
                                  <option value="">
                                    Select available ambulance
                                  </option>

                                  {ambulanceOptions.map(ambulance => (
                                    <option
                                      key={ambulance.id}
                                      value={ambulance.id}
                                      disabled={!ambulance.driver_id}
                                    >
                                      {ambulanceOptionLabel(ambulance)}
                                    </option>
                                  ))}
                                </select>

                                <button
                                  type="button"
                                  style={styles.button}
                                  disabled={
                                    dispatchingCase !== null ||
                                    !selectedAmbulanceId
                                  }
                                  onClick={() =>
                                    handleDispatch(caseItem.id)
                                  }
                                >
                                  {dispatchingCase === caseItem.id
                                    ? 'Dispatching...'
                                    : 'Dispatch Ambulance →'}
                                </button>
                              </div>
                            ) : (
                              <p style={styles.sectionDescription}>
                                No ambulances currently available.
                              </p>
                            )}

                            {closestAmbulance && (
                              <p style={{
                                ...styles.sectionDescription,
                                fontSize: 12
                              }}>
                                Distances are straight-line, from each
                                ambulance's last known position to the
                                patient's reported location. You can
                                still choose a different ambulance.
                              </p>
                            )}
                          </section>
                        )}

                        {caseItem.ambulance_id && (
                          <section style={{
                            ...styles.actionPanel,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: 15
                          }}>
                            <div>
                              <p style={styles.label}>
                                ASSIGNED AMBULANCE
                              </p>

                              <strong>
                                Ambulance #{caseItem.ambulance_id}
                              </strong>
                            </div>

                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              flexWrap: 'wrap',
                              gap: 12
                            }}>
                              {ambulanceStatus && (
                                <StatusBadge status={ambulanceStatus} />
                              )}

                              {canReturn && (
                                <button
                                  type="button"
                                  style={{
                                    ...styles.button,
                                    background: '#0f766e'
                                  }}
                                  disabled={
                                    returningAmbulance !== null
                                  }
                                  onClick={() =>
                                    handleAmbulanceReturn(
                                      caseItem.ambulance_id
                                    )
                                  }
                                >
                                  {returningAmbulance ===
                                  caseItem.ambulance_id
                                    ? 'Confirming...'
                                    : 'Confirm Ambulance Return'}
                                </button>
                              )}
                            </div>
                          </section>
                        )}

                        {['dispatched', 'picked_up'].includes(
                          caseItem.status
                        ) && (
                          <section style={styles.actionPanel}>
                            <h4 style={{
                              color: COLORS.navy,
                              margin: '0 0 9px'
                            }}>
                              Awaiting Ambulance Driver
                            </h4>

                            <p style={styles.sectionDescription}>
                              {caseItem.status === 'dispatched'
                                ? 'The ambulance has been dispatched. The driver must confirm patient pickup from the Driver Dashboard.'
                                : 'The patient has been picked up. The driver must confirm arrival at the hospital.'}
                            </p>

                            <button
                              type="button"
                              style={{
                                ...styles.secondaryButton,
                                marginTop: 15
                              }}
                              onClick={() => loadDashboard(false)}
                            >
                              ↻ Refresh Status
                            </button>
                          </section>
                        )}

                        {caseItem.status === 'arrived_at_hospital' && (
                          <section style={styles.actionPanel}>
                            <h4 style={{
                              color: COLORS.navy,
                              margin: '0 0 9px'
                            }}>
                              Patient Handover
                            </h4>

                            <p style={styles.sectionDescription}>
                              The driver has confirmed hospital
                              arrival. Confirm that the patient has
                              been handed over before treatment begins.
                            </p>

                            <button
                              type="button"
                              style={{
                                ...styles.button,
                                marginTop: 15
                              }}
                              disabled={isBusy}
                              onClick={() =>
                                handleHandover(caseItem.id)
                              }
                            >
                              {updatingCase === caseItem.id
                                ? 'Confirming...'
                                : 'Confirm Patient Handover →'}
                            </button>
                          </section>
                        )}

                        {caseItem.status === 'payment_pending' && (
                          <section style={{
                            ...styles.actionPanel,
                            background: '#fffbeb',
                            border: '1px solid #fde68a'
                          }}>
                            <h4 style={{
                              color: '#92400e',
                              margin: '0 0 9px'
                            }}>
                              Awaiting Payment Verification
                            </h4>

                            <p style={{
                              ...styles.sectionDescription,
                              color: '#92400e'
                            }}>
                              The patient must complete payment.
                              Hospital staff cannot manually mark
                              the case as paid. Payment verification
                              is handled by the backend.
                            </p>

                            <button
                              type="button"
                              style={{
                                ...styles.secondaryButton,
                                marginTop: 15
                              }}
                              onClick={() => loadDashboard(false)}
                            >
                              ↻ Refresh Payment Status
                            </button>
                          </section>
                        )}

                        {nextStatus && (
                          <section style={{
                            borderTop: `1px solid ${COLORS.border}`,
                            marginTop: 24,
                            paddingTop: 21
                          }}>
                            <h4 style={{
                              color: COLORS.navy,
                              margin: '0 0 9px'
                            }}>
                              Case Management
                            </h4>

                            <p style={styles.sectionDescription}>
                              Current status:{' '}
                              <strong>
                                {formatStatus(caseItem.status)}
                              </strong>
                            </p>

                            <button
                              type="button"
                              style={{
                                ...styles.button,
                                marginTop: 15
                              }}
                              disabled={isBusy}
                              onClick={() =>
                                handleStatusUpdate(
                                  caseItem.id,
                                  nextStatus
                                )
                              }
                            >
                              {updatingCase === caseItem.id
                                ? 'Updating...'
                                : nextStatus === 'closed'
                                  ? 'Close Case →'
                                  : `Mark as ${formatStatus(nextStatus)} →`}
                            </button>
                          </section>
                        )}

                        {caseItem.status === 'closed' && (
                          <div style={{
                            marginTop: 22,
                            padding: 16,
                            background: '#ecfdf5',
                            color: '#047857',
                            borderRadius: 10,
                            fontWeight: 700
                          }}>
                            ✓ Case completed and closed.
                          </div>
                        )}
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </>
        )}

        <footer style={styles.footer}>
          © {new Date().getFullYear()} MediRescue
          {' '}• Hospital Emergency Response Portal
        </footer>
      </main>
    </div>
  )
}
