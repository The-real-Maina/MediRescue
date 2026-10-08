
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const API = 'http://localhost:5000/api'

const nextStatuses = {
  dispatched: 'picked_up',
  picked_up: 'in_treatment',
  in_treatment: 'payment_pending',
  payment_pending: 'paid',
  paid: 'closed'
}

function StaffDashboard() {
  const navigate = useNavigate()

  const [cases, setCases] = useState([])
  const [ambulances, setAmbulances] = useState([])
  const [selectedAmbulances, setSelectedAmbulances] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [dispatchingCase, setDispatchingCase] = useState(null)
  const [updatingCase, setUpdatingCase] = useState(null)

  const user = JSON.parse(
    localStorage.getItem('medirescue_user') || '{}'
  )

  const getToken = () =>
    localStorage.getItem('medirescue_token')

  const formatStatus = (status) =>
    status
      ?.replaceAll('_', ' ')
      .replace(/\b\w/g, (letter) => letter.toUpperCase()) || ''

  const request = async (path, options = {}) => {
    const token = getToken()

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

      setCases(
        Array.isArray(caseData)
          ? caseData
          : caseData.cases || []
      )

      setAmbulances(
        Array.isArray(ambulanceData)
          ? ambulanceData
          : []
      )
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
    if (!status) return

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

  const handleLogout = () => {
    localStorage.removeItem('medirescue_token')
    localStorage.removeItem('medirescue_user')
    navigate('/login')
  }

  return (
    <div className="staff-page">
      <header className="dashboard-header">
        <h2>MediRescue</h2>

        <div className="dashboard-user">
          <span>{user.name || 'Hospital Staff'}</span>
          <button onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <main className="staff-content">
        <div className="staff-heading">
          <p>HOSPITAL STAFF DASHBOARD</p>
          <h1>Emergency Cases</h1>
          <span>
            Review emergency requests, dispatch ambulances
            and manage patient response.
          </span>
        </div>

        {error && (
          <div className="login-error">{error}</div>
        )}

        {success && (
          <div className="success-message">{success}</div>
        )}

        {loading && (
          <div className="cases-message">
            Loading hospital emergency cases...
          </div>
        )}

        {!loading && cases.length === 0 && !error && (
          <div className="cases-empty">
            <h3>No Emergency Cases</h3>
            <p>No emergency requests for this hospital.</p>
          </div>
        )}

        {!loading && cases.length > 0 && (
          <div className="cases-list">
            {cases.map((caseItem) => {
              const nextStatus = nextStatuses[caseItem.status]

              return (
                <div className="case-card" key={caseItem.id}>
                  <div className="case-card-header">
                    <div>
                      <span className="case-number">
                        CASE #{caseItem.id}
                      </span>

                      <h3>
                        {caseItem.emergency_type ||
                          'Emergency Request'}
                      </h3>
                    </div>

                    <span
                      className={`case-status status-${caseItem.status}`}
                    >
                      {formatStatus(caseItem.status)}
                    </span>
                  </div>

                  <p className="case-description">
                    {caseItem.emergency_desc ||
                      'No emergency description provided.'}
                  </p>

                  <div className="case-details">
                    <div>
                      <span>Patient</span>
                      <strong>
                        {caseItem.patient_name ||
                          `Patient ${caseItem.patient_id}`}
                      </strong>
                    </div>

                    <div>
                      <span>Severity</span>
                      <strong>
                        {formatStatus(caseItem.severity)}
                      </strong>
                    </div>

                    <div>
                      <span>Status</span>
                      <strong>
                        {formatStatus(caseItem.status)}
                      </strong>
                    </div>
                  </div>

                  {caseItem.status === 'requested' && (
                    <div className="ambulance-assignment">
                      <h4>Dispatch Ambulance</h4>

                      {ambulances.length > 0 ? (
                        <div className="ambulance-controls">
                          <select
                            value={
                              selectedAmbulances[caseItem.id] || ''
                            }
                            onChange={(e) =>
                              setSelectedAmbulances((current) => ({
                                ...current,
                                [caseItem.id]: e.target.value
                              }))
                            }
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
                            className="dispatch-button"
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
                              : 'Dispatch Ambulance'}
                          </button>
                        </div>
                      ) : (
                        <p className="no-ambulance-message">
                          No ambulances currently available.
                        </p>
                      )}
                    </div>
                  )}

                  {caseItem.ambulance_id && (
                    <div
                      className="assigned-ambulance"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '16px',
                        flexWrap: 'wrap',
                        marginTop: '20px',
                        padding: '14px 16px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px'
                      }}
                    >
                      <span>Assigned Ambulance</span>
                      <strong>
                        Ambulance #{caseItem.ambulance_id}
                      </strong>
                    </div>
                  )}

                  {nextStatus && (
                    <div
                      className="case-status-management"
                      style={{
                        marginTop: '20px',
                        paddingTop: '16px',
                        borderTop: '1px solid #e5e7eb'
                      }}
                    >
                      <h4>Case Management</h4>

                      <p>
                        Current status:{' '}
                        <strong>
                          {formatStatus(caseItem.status)}
                        </strong>
                      </p>

                      <button
                        type="button"
                        className="dispatch-button"
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
                          : `Mark as ${formatStatus(nextStatus)}`}
                      </button>
                    </div>
                  )}

                  {caseItem.status === 'closed' && (
                    <div
                      style={{
                        marginTop: '20px',
                        padding: '12px',
                        borderRadius: '8px',
                        background: '#f0fdf4',
                        color: '#166534'
                      }}
                    >
                      Case completed and closed.
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}

export default StaffDashboard
