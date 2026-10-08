
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const API_URL = 'http://localhost:5000/api/admin/emergencies'

function EmergencyMonitoring() {
  const navigate = useNavigate()

  const [cases, setCases] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const loadCases = async (signal) => {
    setLoading(true)
    setError('')

    try {
      const token = localStorage.getItem('medirescue_token')

      if (!token) {
        navigate('/login', { replace: true })
        return
      }

      const response = await fetch(API_URL, {
        headers: {
          Authorization: `Bearer ${token}`
        },
        signal
      })

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('medirescue_token')
        localStorage.removeItem('medirescue_user')
        navigate('/login', { replace: true })
        return
      }

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load cases')
      }

      if (!Array.isArray(data)) {
        throw new Error('Unexpected API response')
      }

      setCases(data)

    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Unable to load cases')
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    loadCases(controller.signal)

    return () => controller.abort()
  }, [])

  const filteredCases = cases.filter((item) => {
    const query = search.toLowerCase()

    const matchesSearch = [
      item.id,
      item.patient_name,
      item.hospital_name,
      item.ambulance_plate,
      item.emergency_desc
    ].some((value) =>
      String(value ?? '').toLowerCase().includes(query)
    )

    const matchesStatus =
      statusFilter === 'all' || item.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const formatDate = (date) => {
    if (!date) return '—'

    const parsed = new Date(date)

    return Number.isNaN(parsed.getTime())
      ? '—'
      : parsed.toLocaleString()
  }

  const formatStatus = (status) =>
    String(status || 'Unknown')
      .replaceAll('_', ' ')
      .replace(/\b\w/g, (letter) => letter.toUpperCase())

  const cellStyle = {
    padding: '13px 12px',
    borderBottom: '1px solid #e2e8f0',
    textAlign: 'left',
    verticalAlign: 'top',
    color: '#17233b'
  }

  const filterStyle = {
    padding: '11px 12px',
    border: '1px solid #cbd5e1',
    borderRadius: '7px',
    background: '#fff',
    color: '#17233b',
    fontSize: '14px'
  }

  return (
    <div style={{
      minHeight: '100vh',
      padding: '30px 20px',
      background: '#f3f6fa',
      color: '#17233b'
    }}>
      <main style={{ maxWidth: '1350px', margin: 'auto' }}>
        <button
          type="button"
          onClick={() => navigate('/admin-dashboard')}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#dc2626',
            cursor: 'pointer',
            marginBottom: '25px'
          }}
        >
          ← Back to Admin Dashboard
        </button>

        <h1 style={{ color: '#17233b' }}>
          Emergency Case Monitoring
        </h1>

        <p style={{ color: '#64748b', margin: '12px 0 28px' }}>
          Monitor emergency requests across all MediRescue hospitals.
        </p>

        <section style={{
          background: '#fff',
          padding: '24px',
          borderRadius: '12px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '15px',
            marginBottom: '22px'
          }}>
            <h2 style={{ color: '#17233b', margin: 0 }}>
              Emergency Records ({filteredCases.length})
            </h2>

            <button
              type="button"
              onClick={() => loadCases()}
              disabled={loading}
              style={{
                padding: '10px 18px',
                border: 'none',
                borderRadius: '7px',
                background: '#dc2626',
                color: '#fff',
                cursor: 'pointer'
              }}
            >
              {loading ? 'Loading...' : 'Refresh Records'}
            </button>
          </div>

          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: '24px'
          }}>
            <input
              type="search"
              placeholder="Search patient, hospital, case ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ ...filterStyle, flex: '1 1 260px' }}
            />

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={filterStyle}
            >
              <option value="all">All Statuses</option>
              <option value="requested">Requested</option>
              <option value="assigned">Assigned</option>
              <option value="dispatched">Dispatched</option>
              <option value="picked_up">Picked Up</option>
              <option value="in_treatment">In Treatment</option>
              <option value="payment_pending">Payment Pending</option>
              <option value="paid">Paid</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          {error && (
            <p role="alert" style={{ color: '#b91c1c' }}>
              {error}
            </p>
          )}

          {loading ? (
            <p>Loading emergency cases...</p>
          ) : filteredCases.length === 0 ? (
            <p>No emergency cases match your filters.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                minWidth: '1050px'
              }}>
                <thead>
                  <tr>
                    {[
                      'Case ID',
                      'Patient',
                      'Hospital',
                      'Emergency',
                      'Severity',
                      'Status',
                      'Ambulance',
                      'Requested At'
                    ].map((heading) => (
                      <th key={heading} style={{
                        ...cellStyle,
                        borderBottom: '2px solid #cbd5e1'
                      }}>
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {filteredCases.map((item) => (
                    <tr key={item.id}>
                      <td style={cellStyle}>#{item.id}</td>
                      <td style={cellStyle}>
                        {item.patient_name || 'Unknown'}
                      </td>
                      <td style={cellStyle}>
                        {item.hospital_name || 'Unassigned'}
                      </td>
                      <td style={cellStyle}>
                        {item.emergency_desc || '—'}
                      </td>
                      <td style={cellStyle}>
                        {formatStatus(item.severity)}
                      </td>
                      <td style={cellStyle}>
                        {formatStatus(item.status)}
                      </td>
                      <td style={cellStyle}>
                        {item.ambulance_plate || 'Not assigned'}
                      </td>
                      <td style={cellStyle}>
                        {formatDate(item.requested_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

export default EmergencyMonitoring
