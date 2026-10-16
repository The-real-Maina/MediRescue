
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AmbulanceTrackingMap from '../components/AmbulanceTrackingMap'

const API = 'http://localhost:5000/api'

const nextStatuses = {
  dispatched: 'picked_up',
  picked_up: 'in_treatment',
  in_treatment: 'payment_pending',
  paid: 'closed'
}

const formatStatus = (status) =>
  String(status || 'Unknown')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())

const colors = {
  navy: '#10243a',
  red: '#dc2626',
  background: '#f1f5f9',
  border: '#e2e8f0',
  muted: '#64748b',
  text: '#17233b'
}

const styles = {
  page: {
    minHeight: '100vh',
    background: colors.background,
    color: colors.text,
    fontFamily: "'Segoe UI', Arial, sans-serif"
  },
  header: {
    background: colors.navy,
    borderBottom: `4px solid ${colors.red}`,
    color: '#ffffff'
  },
  headerInner: {
    maxWidth: 1240,
    margin: 'auto',
    padding: '20px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 18,
    flexWrap: 'wrap'
  },
  content: {
    maxWidth: 1240,
    margin: 'auto',
    padding: '38px 20px 80px',
    boxSizing: 'border-box'
  },
  eyebrow: {
    color: colors.red,
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: 1.5,
    margin: '0 0 12px'
  },
  title: {
    color: colors.navy,
    fontSize: 'clamp(30px, 4vw, 40px)',
    fontWeight: 800,
    lineHeight: 1.2,
    margin: '0 0 12px',
    letterSpacing: '-0.8px'
  },
  subtitle: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 1.7,
    margin: 0
  },
  card: {
    background: '#ffffff',
    border: `1px solid ${colors.border}`,
    borderRadius: 15,
    boxShadow: '0 6px 24px rgba(15,23,42,0.05)'
  },
  button: {
    background: colors.red,
    color: '#ffffff',
    border: 'none',
    borderRadius: 9,
    padding: '12px 18px',
    fontWeight: 700,
    fontSize: 13,
    cursor: 'pointer',
    minHeight: 43
  },
  secondaryButton: {
    background: '#ffffff',
    color: colors.navy,
    border: `1px solid ${colors.border}`,
    borderRadius: 9,
    padding: '12px 18px',
    fontWeight: 700,
    fontSize: 13,
    cursor: 'pointer'
  },
  label: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: 1,
    margin: '0 0 8px',
    textTransform: 'uppercase'
  },
  sectionTitle: {
    color: colors.navy,
    fontSize: 23,
    fontWeight: 800,
    margin: 0
  },
  sectionDescription: {
    color: colors.muted,
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
    gridTemplateColumns:
      'repeat(auto-fit, minmax(min(100%, 175px), 1fr))',
    gap: 18,
    background: '#f8fafc',
    border: `1px solid ${colors.border}`,
    borderRadius: 11,
    padding: 20
  },
  select: {
    flex: '1 1 250px',
    minHeight: 44,
    borderRadius: 9,
    border: '1px solid #cbd5e1',
    background: '#ffffff',
    color: colors.text,
    padding: '10px 13px',
    fontSize: 14
  },
  actionPanel: {
    marginTop: 23,
    padding: 20,
    background: '#f8fafc',
    border: `1px solid ${colors.border}`,
    borderRadius: 11
  },
  footer: {
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 45
  }
}

const statusVariants = {
  requested: ['#fff1f2', '#be123c'],
  assigned: ['#eff6ff', '#1d4ed8'],
  dispatched: ['#fff7ed', '#c2410c'],
  picked_up: ['#eef2ff', '#4338ca'],
  in_treatment: ['#f5f3ff', '#6d28d9'],
  payment_pending: ['#fffbeb', '#92400e'],
  paid: ['#ecfdf5', '#047857'],
  closed: ['#ecfdf5', '#047857'],
  available: ['#ecfdf5', '#047857'],
  en_route: ['#eff6ff', '#1d4ed8'],
  returning: ['#fff7ed', '#c2410c']
}

function StatusBadge({ status }) {
  const [background, color] =
    statusVariants[status] || ['#f1f5f9', '#475569']

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

function StaffDashboard({ view = 'dashboard' }) {
  const navigate = useNavigate()

  const [cases, setCases] = useState([])
  const [ambulances, setAmbulances] = useState([])
  const [ambulanceStatuses, setAmbulanceStatuses] = useState({})
  const [returningAmbulance, setReturningAmbulance] = useState(null)
  const [selectedAmbulances, setSelectedAmbulances] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [dispatchingCase, setDispatchingCase] = useState(null)
  const [updatingCase, setUpdatingCase] = useState(null)

  const request = async (path, options = {}) => {
    const token = localStorage.getItem('medirescue_token')

    if (!token) {
      navigate('/login')
      throw new Error('Please log in again')
    }

    const response = await fetch(`${API}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options.headers
      }
    })

    const data = await response.json()

    if (!response.ok) {
      if (response.status === 401) {
        navigate('/login')
      }

      throw new Error(data.error || 'Request failed')
    }

    return data
  }

  const loadDashboard = async (showLoading = true) => {
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

      const ids = [
        ...new Set(
          caseList
            .map((item) => item.ambulance_id)
            .filter(Boolean)
        )
      ]

      const results = await Promise.allSettled(
        ids.map((id) => request(`/ambulances/${id}/status`))
      )

      const statusMap = {}

      ids.forEach((id, index) => {
        if (results[index].status === 'fulfilled') {
          statusMap[id] = results[index].value
        }
      })

      setAmbulanceStatuses(statusMap)
      setError('')
    } catch (err) {
      setError(err.message)
    } finally {
      if (showLoading) setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboard()
  }, [])

  const handleDispatch = async (caseId) => {
    const ambulanceId = selectedAmbulances[caseId]

    if (!ambulanceId) {
      setError('Please select an ambulance first.')
      return
    }

    setError('')
    setSuccess('')
    setDispatchingCase(caseId)

    try {
      const data = await request(
        `/cases/${caseId}/ambulance`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            ambulance_id: Number(ambulanceId)
          })
        }
      )

      setSuccess(
        `Ambulance ${data.ambulance_plate} dispatched for Case #${caseId}.`
      )

      setSelectedAmbulances((current) => {
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

  const handleStatusUpdate = async (caseId, status) => {
    if (!status || status === 'paid') return

    setError('')
    setSuccess('')
    setUpdatingCase(caseId)

    try {
      await request(`/cases/${caseId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      })

      setSuccess(
        `Case #${caseId} updated to ${formatStatus(status)}.` +
        (status === 'closed'
          ? ' The ambulance has been released.'
          : '')
      )

      await loadDashboard(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setUpdatingCase(null)
    }
  }

  const handleAmbulanceReturn = async (ambulanceId) => {
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
        `Ambulance #${ambulanceId} return confirmed. It is now available for future dispatch.`
      )

      await loadDashboard(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setReturningAmbulance(null)
    }
  }

  const visibleCases = cases.filter(item => view === 'history' ? item.status === 'closed' : item.status !== 'closed')

  const totalCases = cases.length

  const pendingCases = cases.filter(
    (item) => item.status === 'payment_pending'
  ).length

  const activeCases = cases.filter(
    (item) =>
      !['closed', 'paid', 'payment_pending'].includes(item.status)
  ).length

  const closedCases = cases.filter(
    (item) => item.status === 'closed'
  ).length

  const summary = [
    {
      label: 'Total Cases',
      value: totalCases,
      symbol: '▤',
      accent: '#2563eb',
      tint: '#eff6ff'
    },
    {
      label: 'Active Cases',
      value: activeCases,
      symbol: '✚',
      accent: '#dc2626',
      tint: '#fff1f2'
    },
    {
      label: 'Awaiting Payment',
      value: pendingCases,
      symbol: 'KSh',
      accent: '#d97706',
      tint: '#fffbeb'
    },
    {
      label: 'Closed Cases',
      value: closedCases,
      symbol: '✓',
      accent: '#059669',
      tint: '#ecfdf5'
    }
  ]

  return (
    <div style={styles.page}>
      <main style={styles.content}>
        {/* INTRODUCTION */}
        <section style={{ marginBottom: 30 }}>
          <p style={styles.eyebrow}>
            EMERGENCY RESPONSE CONTROL CENTER
          </p>

          <h1 style={styles.title}>
            {view === 'dashboard' ? 'Hospital Staff Dashboard' : view === 'tracking' ? 'Live Operations' : view === 'history' ? 'Closed Cases / History' : 'Emergency Case Management'}
          </h1>

          <p style={styles.subtitle}>
            {view === 'dashboard' ? 'An overview of emergency cases and hospital response performance.' : view === 'tracking' ? 'Monitor ambulance locations and latest GPS updates.' : view === 'history' ? 'Review completed and closed emergency cases.' : 'Review emergency requests, dispatch ambulances and manage patient response.'}
          </p>
        </section>

        {/* MESSAGES */}
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

        {view === 'dashboard' && (<>
        {/* STATISTICS */}
        {!loading && (
          <section
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(min(100%, 215px), 1fr))',
              gap: 17,
              marginBottom: 35
            }}
          >
            {summary.map((item) => (
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
                  <p
                    style={{
                      color: colors.muted,
                      fontSize: 12,
                      fontWeight: 700,
                      margin: '0 0 12px'
                    }}
                  >
                    {item.label}
                  </p>

                  <strong
                    style={{
                      color: colors.navy,
                      fontSize: 33,
                      lineHeight: 1
                    }}
                  >
                    {item.value}
                  </strong>
                </div>

                <span
                  aria-hidden="true"
                  style={{
                    background: item.tint,
                    color: item.accent,
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    display: 'grid',
                    placeItems: 'center',
                    fontWeight: 900,
                    fontSize: item.symbol === 'KSh' ? 13 : 24
                  }}
                >
                  {item.symbol}
                </span>
              </div>
            ))}
          </section>
        )}

        </>)}

        {view === 'tracking' && (<>
        {/* GPS TRACKING */}
        <section style={{ marginBottom: 36 }}>
          <div style={{ marginBottom: 16 }}>
            <p style={styles.eyebrow}>
              LIVE OPERATIONS
            </p>

            <h2 style={styles.sectionTitle}>
              Ambulance GPS Tracking
            </h2>

            <p style={styles.sectionDescription}>
              Monitor ambulance locations and the latest
              GPS updates for your hospital.
            </p>
          </div>

          <AmbulanceTrackingMap />
        </section>

        </>)}

        {(view === 'cases' || view === 'history') && (<>
        {/* CASE MANAGEMENT HEADING */}
        <section
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 15,
            marginBottom: 20
          }}
        >
          <div>
            <p style={styles.eyebrow}>
              CASE MANAGEMENT
            </p>

            <h2 style={styles.sectionTitle}>
              {view === 'history' ? 'Closed Cases / History' : 'Emergency Cases'}
            </h2>

            <p style={styles.sectionDescription}>
              {view === 'history' ? 'Review previously closed emergencies.' : 'Review requests and coordinate each patient’s emergency response.'}
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

        {/* LOADING */}
        {loading && (
          <div
            style={{
              ...styles.card,
              padding: 30,
              color: colors.muted
            }}
          >
            Loading hospital emergency cases...
          </div>
        )}

        {/* EMPTY STATE */}
        {!loading && visibleCases.length === 0 && !error && (
          <div
            style={{
              ...styles.card,
              padding: '45px 24px',
              textAlign: 'center'
            }}
          >
            <div
              style={{
                color: '#059669',
                fontSize: 34,
                marginBottom: 12
              }}
            >
              ✓
            </div>

            <h3
              style={{
                color: colors.navy,
                margin: '0 0 8px'
              }}
            >
              {view === 'history' ? 'No Closed Cases' : 'No Emergency Cases'}
            </h3>

            <p
              style={{
                color: colors.muted,
                margin: 0
              }}
            >
              {view === 'history' ? 'No completed cases have been recorded yet.' : 'No active emergency requests for this hospital.'}
            </p>
          </div>
        )}

        {/* EMERGENCY CASES */}
        {!loading && visibleCases.length > 0 && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 20
            }}
          >
            {visibleCases.map((caseItem) => {
              const nextStatus = nextStatuses[caseItem.status]

              const ambulanceStatus =
                ambulanceStatuses[caseItem.ambulance_id]?.status

              const canReturn =
                [
                  'in_treatment',
                  'payment_pending',
                  'paid'
                ].includes(caseItem.status) &&
                [
                  'dispatched',
                  'en_route',
                  'returning'
                ].includes(ambulanceStatus)

              return (
                <article
                  key={caseItem.id}
                  style={{
                    ...styles.card,
                    overflow: 'hidden'
                  }}
                >
                  <div
                    style={{
                      height: 4,
                      background: colors.red
                    }}
                  />

                  <div
                    style={{
                      padding: 'clamp(20px, 4vw, 28px)'
                    }}
                  >
                    {/* CASE HEADER */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        flexWrap: 'wrap',
                        gap: 16,
                        marginBottom: 20
                      }}
                    >
                      <div>
                        <p style={styles.eyebrow}>
                          EMERGENCY CASE #{caseItem.id}
                        </p>

                        <h3
                          style={{
                            color: colors.navy,
                            fontSize: 22,
                            fontWeight: 800,
                            margin: 0
                          }}
                        >
                          {caseItem.emergency_type ||
                            'Emergency Request'}
                        </h3>
                      </div>

                      <StatusBadge status={caseItem.status} />
                    </div>

                    {/* DESCRIPTION */}
                    <p
                      style={{
                        color: colors.muted,
                        fontSize: 14,
                        lineHeight: 1.8,
                        margin: '0 0 22px'
                      }}
                    >
                      {caseItem.emergency_desc ||
                        'No emergency description provided.'}
                    </p>

                    {/* CASE DETAILS */}
                    <div style={styles.detailGrid}>
                      <div>
                        <p style={styles.label}>
                          PATIENT
                        </p>

                        <strong>
                          {caseItem.patient_name ||
                            `Patient ${caseItem.patient_id}`}
                        </strong>
                      </div>

                      <div>
                        <p style={styles.label}>
                          SEVERITY
                        </p>

                        <strong>
                          {formatStatus(caseItem.severity)}
                        </strong>
                      </div>

                      <div>
                        <p style={styles.label}>
                          CURRENT STATUS
                        </p>

                        <StatusBadge status={caseItem.status} />
                      </div>
                    </div>

                    {/* DISPATCH AMBULANCE */}
                    {caseItem.status === 'requested' && (
                      <section style={styles.actionPanel}>
                        <h4
                          style={{
                            color: colors.navy,
                            fontSize: 16,
                            margin: '0 0 10px'
                          }}
                        >
                          Dispatch Ambulance
                        </h4>

                        <p style={styles.sectionDescription}>
                          Select an available ambulance
                          to respond to this case.
                        </p>

                        {ambulances.length > 0 ? (
                          <div
                            style={{
                              display: 'flex',
                              flexWrap: 'wrap',
                              gap: 12,
                              marginTop: 17
                            }}
                          >
                            <select
                              aria-label={`Ambulance for case ${caseItem.id}`}
                              value={
                                selectedAmbulances[caseItem.id] || ''
                              }
                              onChange={(e) =>
                                setSelectedAmbulances(
                                  (current) => ({
                                    ...current,
                                    [caseItem.id]: e.target.value
                                  })
                                )
                              }
                              style={styles.select}
                            >
                              <option value="">
                                Select available ambulance
                              </option>

                              {ambulances.map((ambulance) => (
                                <option
                                  key={ambulance.id}
                                  value={ambulance.id}
                                >
                                  {ambulance.plate_number}
                                  {ambulance.driver_id
                                    ? ` - Driver #${ambulance.driver_id}`
                                    : ''}
                                </option>
                              ))}
                            </select>

                            <button
                              type="button"
                              style={{
                                ...styles.button,
                                opacity:
                                  dispatchingCase !== null ||
                                  !selectedAmbulances[caseItem.id]
                                    ? 0.55
                                    : 1
                              }}
                              disabled={
                                dispatchingCase !== null ||
                                !selectedAmbulances[caseItem.id]
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
                      </section>
                    )}

                    {/* ASSIGNED AMBULANCE */}
                    {caseItem.ambulance_id && (
                      <section
                        style={{
                          ...styles.actionPanel,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: 15
                        }}
                      >
                        <div>
                          <p style={styles.label}>
                            ASSIGNED AMBULANCE
                          </p>

                          <strong
                            style={{
                              color: colors.navy,
                              fontSize: 15
                            }}
                          >
                            Ambulance #{caseItem.ambulance_id}
                          </strong>
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: 12
                          }}
                        >
                          {ambulanceStatus && (
                            <StatusBadge
                              status={ambulanceStatus}
                            />
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

                    {/* PAYMENT PENDING */}
                    {caseItem.status === 'payment_pending' && (
                      <section
                        style={{
                          marginTop: 22,
                          padding: 20,
                          background: '#fffbeb',
                          border: '1px solid #fde68a',
                          borderRadius: 11
                        }}
                      >
                        <h4
                          style={{
                            color: '#92400e',
                            margin: '0 0 9px'
                          }}
                        >
                          Awaiting Payment Verification
                        </h4>

                        <p
                          style={{
                            color: '#92400e',
                            fontSize: 14,
                            lineHeight: 1.7,
                            margin: '0 0 15px'
                          }}
                        >
                          This case is awaiting payment.
                          M-Pesa payment must be verified
                          before it is marked as paid.
                        </p>

                        <button
                          type="button"
                          onClick={() => loadDashboard(false)}
                          style={{
                            ...styles.button,
                            background: '#92400e'
                          }}
                        >
                          Refresh Case Status
                        </button>
                      </section>
                    )}

                    {/* CASE STATUS ACTIONS */}
                    {nextStatus && (
                      <section
                        style={{
                          borderTop:
                            `1px solid ${colors.border}`,
                          marginTop: 24,
                          paddingTop: 21
                        }}
                      >
                        <h4
                          style={{
                            color: colors.navy,
                            fontSize: 16,
                            margin: '0 0 9px'
                          }}
                        >
                          Case Management
                        </h4>

                        <p style={styles.sectionDescription}>
                          Current status:{' '}
                          <strong style={{ color: colors.text }}>
                            {formatStatus(caseItem.status)}
                          </strong>
                        </p>

                        <button
                          type="button"
                          style={{
                            ...styles.button,
                            marginTop: 15,
                            opacity:
                              updatingCase !== null ? 0.6 : 1
                          }}
                          disabled={updatingCase !== null}
                          onClick={() =>
                            handleStatusUpdate(
                              caseItem.id,
                              nextStatus
                            )
                          }
                        >
                          {updatingCase === caseItem.id
                            ? 'Updating...'
                            : `Mark as ${formatStatus(nextStatus)} →`}
                        </button>
                      </section>
                    )}

                    {/* CLOSED CASE */}
                    {caseItem.status === 'closed' && (
                      <div
                        style={{
                          marginTop: 22,
                          padding: 16,
                          background: '#ecfdf5',
                          color: '#047857',
                          borderRadius: 10,
                          fontWeight: 700
                        }}
                      >
                        ✓ Case completed and closed.
                      </div>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        )}

        </>)}

        <footer style={styles.footer}>
          © {new Date().getFullYear()} MediRescue
          {' '}• Hospital Emergency Response Portal
        </footer>
      </main>
    </div>
  )
}

export default StaffDashboard
