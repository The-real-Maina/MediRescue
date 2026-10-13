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
  navy: '#10263e',
  navyLight: '#193b58',
  red: '#e3232b',
  background: '#f0f4f8',
  border: '#e1e8f0',
  muted: '#627892',
  text: '#12263f'
}

const ui = {
  page: {
    minHeight: '100vh',
    background: colors.background,
    color: colors.text,
    fontFamily: "'Segoe UI', Arial, sans-serif"
  },
  header: {
    background: colors.navy,
    borderBottom: `4px solid ${colors.red}`,
    color: '#fff'
  },
  headerInner: {
    maxWidth: 1240,
    margin: 'auto',
    padding: '20px 28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 20,
    flexWrap: 'wrap'
  },
  content: {
    maxWidth: 1240,
    margin: 'auto',
    padding: '38px 28px 90px',
    boxSizing: 'border-box'
  },
  card: {
    background: '#fff',
    border: `1px solid ${colors.border}`,
    borderRadius: 16,
    boxShadow: '0 8px 28px rgba(16,38,62,0.045)'
  },
  button: {
    background: colors.red,
    color: '#fff',
    border: 'none',
    borderRadius: 9,
    padding: '12px 19px',
    fontWeight: 700,
    fontSize: 13,
    cursor: 'pointer',
    minHeight: 43
  },
  label: {
    margin: '0 0 7px',
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: '1.2px',
    color: colors.muted
  },
  notice: {
    padding: '15px 18px',
    borderRadius: 10,
    marginBottom: 20,
    lineHeight: 1.6
  }
}

function StatusBadge({ status }) {
  const variants = {
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
  const [background, color] = variants[status] || ['#f1f5f9', '#475569']
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '8px 12px', borderRadius: 999,
      background, color, fontSize: 12, fontWeight: 800,
      whiteSpace: 'nowrap'
    }}>
      <span aria-hidden="true">●</span> {formatStatus(status)}
    </span>
  )
}

function StaffDashboard() {
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

  let user = {}
  try {
    user = JSON.parse(localStorage.getItem('medirescue_user') || '{}') || {}
  } catch {
    user = {}
  }

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
      if (response.status === 401) navigate('/login')
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
      const caseList = Array.isArray(caseData) ? caseData : caseData.cases || []
      setCases(caseList)
      setAmbulances(Array.isArray(ambulanceData) ? ambulanceData : [])

      const ids = [...new Set(caseList.map((item) => item.ambulance_id).filter(Boolean))]
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
      const data = await request(`/cases/${caseId}/ambulance`, {
        method: 'PATCH',
        body: JSON.stringify({ ambulance_id: Number(ambulanceId) })
      })
      setSuccess(`Ambulance ${data.ambulance_plate} dispatched for Case #${caseId}.`)
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
        (status === 'closed' ? ' The ambulance has been released.' : '')
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
      await request(`/ambulances/${ambulanceId}/return`, { method: 'PATCH' })
      setSuccess(`Ambulance #${ambulanceId} return confirmed. It is now available for future dispatch.`)
      await loadDashboard(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setReturningAmbulance(null)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('medirescue_token')
    localStorage.removeItem('medirescue_user')
    navigate('/login')
  }

  const totalCases = cases.length
  const pendingCases = cases.filter((item) => item.status === 'payment_pending').length
  const activeCases = cases.filter(
    (item) => !['closed', 'paid', 'payment_pending'].includes(item.status)
  ).length
  const closedCases = cases.filter((item) => item.status === 'closed').length

  const summary = [
    { label: 'Total Cases', value: totalCases, symbol: '▤', accent: '#2563eb', tint: '#eff6ff' },
    { label: 'Active Cases', value: activeCases, symbol: '✚', accent: '#e3232b', tint: '#fff1f2' },
    { label: 'Awaiting Payment', value: pendingCases, symbol: 'KSh', accent: '#d97706', tint: '#fffbeb' },
    { label: 'Closed Cases', value: closedCases, symbol: '✓', accent: '#059669', tint: '#ecfdf5' }
  ]

  return (
    <div style={ui.page}>
      <header style={ui.header}>
        <div style={ui.headerInner}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
            <span aria-hidden="true" style={{
              background: colors.red, width: 43, height: 43,
              display: 'grid', placeItems: 'center', borderRadius: 11,
              fontSize: 26, fontWeight: 900
            }}>+</span>
            <div>
              <div style={{ fontSize: 23, fontWeight: 850, letterSpacing: '-0.8px' }}>MediRescue</div>
              <div style={{ fontSize: 10, letterSpacing: 2, color: '#c8d8e8' }}>HOSPITAL STAFF PORTAL</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, color: '#d8e4ef' }}>{user.name || 'Hospital Staff'}</span>
            <button type="button" onClick={handleLogout} style={{
              background: 'transparent', color: '#fff', border: '1px solid #58718a',
              borderRadius: 8, padding: '10px 16px', cursor: 'pointer', fontWeight: 700
            }}>Logout →</button>
          </div>
        </div>
      </header>

      <main style={ui.content}>
        <div style={{ marginBottom: 28 }}>
          <p style={{ color: colors.red, fontSize: 11, fontWeight: 850, letterSpacing: 2, margin: '0 0 12px' }}>
            EMERGENCY RESPONSE CONTROL CENTER
          </p>
          <h1 style={{ fontSize: 'clamp(29px, 4vw, 40px)', letterSpacing: '-1.2px', margin: '0 0 10px' }}>
            Hospital Staff Dashboard
          </h1>
          <p style={{ color: colors.muted, lineHeight: 1.7, margin: 0 }}>
            Review emergency requests, dispatch ambulances, monitor GPS locations and manage patient response.
          </p>
        </div>

        {error && (
          <div role="alert" style={{ ...ui.notice, background: '#fff1f2', color: '#be123c', border: '1px solid #fecdd3' }}>
            {error}
          </div>
        )}
        {success && (
          <div role="status" style={{ ...ui.notice, background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' }}>
            {success}
          </div>
        )}

        {!loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(205px, 1fr))', gap: 17, marginBottom: 30 }}>
            {summary.map((item) => (
              <div key={item.label} style={{ ...ui.card, padding: 22, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <div>
                  <p style={{ fontSize: 12, color: colors.muted, fontWeight: 700, margin: '0 0 10px' }}>{item.label}</p>
                  <strong style={{ fontSize: 33, lineHeight: 1 }}>{item.value}</strong>
                </div>
                <span aria-hidden="true" style={{
                  background: item.tint, color: item.accent, width: 46, height: 46,
                  borderRadius: 12, display: 'grid', placeItems: 'center',
                  fontWeight: 900, fontSize: item.symbol === 'KSh' ? 13 : 24
                }}>{item.symbol}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginBottom: 30 }}>
          <div style={{ marginBottom: 14 }}>
            <p style={{ ...ui.label, color: colors.red }}>LIVE OPERATIONS</p>
            <h2 style={{ margin: 0, fontSize: 23, color: '#102a43' }}>Ambulance GPS Tracking</h2>
          </div>
          <AmbulanceTrackingMap />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 14, flexWrap: 'wrap', marginBottom: 18 }}>
          <div>
            <p style={{ ...ui.label, color: colors.red }}>CASE MANAGEMENT</p>
            <h2 style={{ margin: 0, fontSize: 24, color: '#102a43' }}>Emergency Cases</h2>
            <p style={{ margin: '7px 0 0', color: colors.muted, fontSize: 14 }}>Review requests and coordinate each patient's response.</p>
          </div>
          <button type="button" onClick={() => loadDashboard(false)} style={{
            ...ui.button, background: '#fff', color: colors.navy, border: `1px solid ${colors.border}`
          }}>↻ Refresh Cases</button>
        </div>

        {loading && <div style={{ ...ui.card, padding: 28 }}>Loading hospital emergency cases...</div>}

        {!loading && cases.length === 0 && !error && (
          <div style={{ ...ui.card, padding: '48px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 34, marginBottom: 12 }}>✓</div>
            <h3 style={{ margin: '0 0 8px' }}>No Emergency Cases</h3>
            <p style={{ color: colors.muted, margin: 0 }}>No emergency requests for this hospital.</p>
          </div>
        )}

        {!loading && cases.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {cases.map((caseItem) => {
              const nextStatus = nextStatuses[caseItem.status]
              const ambulanceStatus = ambulanceStatuses[caseItem.ambulance_id]?.status
              const canReturn =
                ['in_treatment', 'payment_pending', 'paid'].includes(caseItem.status) &&
                ['dispatched', 'en_route', 'returning'].includes(ambulanceStatus)

              return (
                <article key={caseItem.id} style={{ ...ui.card, overflow: 'hidden' }}>
                  <div style={{ height: 4, background: colors.red }} />
                  <div style={{ padding: '24px 26px 27px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
                      <div>
                        <p style={{ ...ui.label, color: colors.red }}>EMERGENCY CASE #{caseItem.id}</p>
                        <h3 style={{ fontSize: 21, margin: 0 }}>{caseItem.emergency_type || 'Emergency Request'}</h3>
                      </div>
                      <StatusBadge status={caseItem.status} />
                    </div>

                    <p style={{ color: '#536880', lineHeight: 1.7, margin: '18px 0 22px' }}>
                      {caseItem.emergency_desc || 'No emergency description provided.'}
                    </p>

                    <div style={{
                      display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(165px, 1fr))',
                      gap: 16, background: '#f7f9fc', border: `1px solid ${colors.border}`,
                      borderRadius: 11, padding: 19
                    }}>
                      <div>
                        <p style={ui.label}>PATIENT</p>
                        <strong>{caseItem.patient_name || `Patient ${caseItem.patient_id}`}</strong>
                      </div>
                      <div>
                        <p style={ui.label}>SEVERITY</p>
                        <strong>{formatStatus(caseItem.severity)}</strong>
                      </div>
                      <div>
                        <p style={ui.label}>CURRENT STATUS</p>
                        <strong>{formatStatus(caseItem.status)}</strong>
                      </div>
                    </div>

                    {caseItem.status === 'requested' && (
                      <section style={{ marginTop: 24 }}>
                        <h4 style={{ margin: '0 0 12px', fontSize: 16 }}>Dispatch Ambulance</h4>
                        {ambulances.length > 0 ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                            <select
                              aria-label={`Ambulance for case ${caseItem.id}`}
                              value={selectedAmbulances[caseItem.id] || ''}
                              onChange={(e) => setSelectedAmbulances((current) => ({
                                ...current, [caseItem.id]: e.target.value
                              }))}
                              style={{
                                flex: '1 1 250px', minHeight: 44, borderRadius: 9,
                                border: `1px solid #cbd5e1`, background: '#fff',
                                color: colors.text, padding: '10px 13px'
                              }}
                            >
                              <option value="">Select available ambulance</option>
                              {ambulances.map((ambulance) => (
                                <option key={ambulance.id} value={ambulance.id}>
                                  {ambulance.plate_number}
                                  {ambulance.driver_id ? ` - Driver #${ambulance.driver_id}` : ''}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              style={{ ...ui.button, opacity: dispatchingCase !== null || !selectedAmbulances[caseItem.id] ? 0.55 : 1 }}
                              disabled={dispatchingCase !== null || !selectedAmbulances[caseItem.id]}
                              onClick={() => handleDispatch(caseItem.id)}
                            >
                              {dispatchingCase === caseItem.id ? 'Dispatching...' : 'Dispatch Ambulance →'}
                            </button>
                          </div>
                        ) : (
                          <p style={{ color: colors.muted }}>No ambulances currently available.</p>
                        )}
                      </section>
                    )}

                    {caseItem.ambulance_id && (
                      <section style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        gap: 15, flexWrap: 'wrap', marginTop: 22, padding: 18,
                        background: '#f7f9fc', border: `1px solid ${colors.border}`, borderRadius: 11
                      }}>
                        <div>
                          <p style={ui.label}>ASSIGNED AMBULANCE</p>
                          <strong>Ambulance #{caseItem.ambulance_id}</strong>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                          {ambulanceStatus && <StatusBadge status={ambulanceStatus} />}
                          {canReturn && (
                            <button
                              type="button"
                              style={{ ...ui.button, background: '#0f766e' }}
                              disabled={returningAmbulance !== null}
                              onClick={() => handleAmbulanceReturn(caseItem.ambulance_id)}
                            >
                              {returningAmbulance === caseItem.ambulance_id ? 'Confirming...' : 'Confirm Ambulance Return'}
                            </button>
                          )}
                        </div>
                      </section>
                    )}

                    {caseItem.status === 'payment_pending' && (
                      <section style={{ marginTop: 22, padding: 19, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 11 }}>
                        <h4 style={{ color: '#92400e', margin: '0 0 8px' }}>Awaiting Payment Verification</h4>
                        <p style={{ color: '#92400e', lineHeight: 1.7, fontSize: 14, margin: '0 0 15px' }}>
                          This case is awaiting payment. M-Pesa payment must be verified before it is marked as paid.
                        </p>
                        <button type="button" onClick={() => loadDashboard(false)} style={{ ...ui.button, background: '#92400e' }}>
                          Refresh Case Status
                        </button>
                      </section>
                    )}

                    {nextStatus && (
                      <section style={{ borderTop: `1px solid ${colors.border}`, marginTop: 23, paddingTop: 20 }}>
                        <h4 style={{ margin: '0 0 8px', fontSize: 16 }}>Case Management</h4>
                        <p style={{ color: colors.muted, fontSize: 14, margin: '0 0 14px' }}>
                          Current status: <strong style={{ color: colors.text }}>{formatStatus(caseItem.status)}</strong>
                        </p>
                        <button
                          type="button"
                          style={ui.button}
                          disabled={updatingCase !== null}
                          onClick={() => handleStatusUpdate(caseItem.id, nextStatus)}
                        >
                          {updatingCase === caseItem.id ? 'Updating...' : `Mark as ${formatStatus(nextStatus)} →`}
                        </button>
                      </section>
                    )}

                    {caseItem.status === 'closed' && (
                      <div style={{ marginTop: 22, padding: 15, background: '#ecfdf5', color: '#047857', borderRadius: 10, fontWeight: 700 }}>
                        ✓ Case completed and closed.
                      </div>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}

export default StaffDashboard
