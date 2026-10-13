
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const API_URL = 'http://localhost:5000/api/admin/emergencies'

const colors = {
  navy: '#102a43',
  red: '#e51f2a',
  background: '#eff4fa',
  white: '#ffffff',
  border: '#dbe5f1',
  muted: '#627b9c',
  text: '#102a43'
}

const statusColors = {
  requested: ['#fff1f2', '#be123c'],
  assigned: ['#eff6ff', '#1d4ed8'],
  dispatched: ['#fff7ed', '#c2410c'],
  picked_up: ['#f0fdfa', '#0f766e'],
  in_treatment: ['#eef2ff', '#4338ca'],
  payment_pending: ['#fef3c7', '#92400e'],
  paid: ['#dcfce7', '#166534'],
  closed: ['#f1f5f9', '#475569']
}

const severityColors = {
  low: ['#dcfce7', '#166534'],
  moderate: ['#fef3c7', '#92400e'],
  high: ['#ffedd5', '#c2410c'],
  critical: ['#fee2e2', '#b91c1c']
}

const formatStatus = (value) =>
  String(value || 'Unknown')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())

const formatDate = (date) => {
  if (!date) return '—'
  const parsed = new Date(date)

  return Number.isNaN(parsed.getTime())
    ? '—'
    : parsed.toLocaleString()
}

function Badge({ value, palette }) {
  const [background, color] =
    palette[value] || ['#f1f5f9', '#475569']

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '7px 11px',
        borderRadius: 999,
        background,
        color,
        fontSize: 12,
        fontWeight: 800,
        whiteSpace: 'nowrap'
      }}
    >
      {formatStatus(value)}
    </span>
  )
}

function StatCard({ label, value, icon, tint, iconColor }) {
  return (
    <div
      style={{
        background: colors.white,
        border: `1px solid ${colors.border}`,
        borderRadius: 15,
        padding: 22,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
        boxShadow: '0 8px 24px rgba(16,42,67,0.035)'
      }}
    >
      <div>
        <p
          style={{
            margin: '0 0 10px',
            fontSize: 13,
            color: colors.muted,
            fontWeight: 700
          }}
        >
          {label}
        </p>
        <strong style={{ fontSize: 32, color: colors.navy }}>
          {value}
        </strong>
      </div>

      <div
        style={{
          width: 46,
          height: 46,
          borderRadius: 12,
          background: tint,
          color: iconColor,
          display: 'grid',
          placeItems: 'center',
          fontSize: 23,
          fontWeight: 900
        }}
      >
        {icon}
      </div>
    </div>
  )
}

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

      if (!signal?.aborted) {
        setCases(data)
      }
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
    const query = search.trim().toLowerCase()

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

  const activeStatuses = [
    'requested',
    'assigned',
    'dispatched',
    'picked_up',
    'in_treatment'
  ]

  const activeCount = cases.filter((item) =>
    activeStatuses.includes(item.status)
  ).length

  const pendingCount = cases.filter(
    (item) => item.status === 'payment_pending'
  ).length

  const closedCount = cases.filter(
    (item) => item.status === 'closed'
  ).length

  const inputStyle = {
    padding: '13px 15px',
    border: `1px solid ${colors.border}`,
    borderRadius: 9,
    background: colors.white,
    color: colors.text,
    fontSize: 14,
    outlineColor: colors.red,
    boxSizing: 'border-box'
  }

  const thStyle = {
    padding: '17px 15px',
    textAlign: 'left',
    fontSize: 12,
    letterSpacing: '0.6px',
    textTransform: 'uppercase',
    color: colors.muted,
    background: '#f4f7fb',
    borderBottom: `1px solid ${colors.border}`,
    whiteSpace: 'nowrap'
  }

  const tdStyle = {
    padding: '17px 15px',
    borderBottom: `1px solid ${colors.border}`,
    fontSize: 13,
    verticalAlign: 'middle',
    color: colors.text
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: colors.background,
        color: colors.text,
        fontFamily: "'Segoe UI', Arial, sans-serif"
      }}
    >
      {/* HEADER */}
      <header
        style={{
          background: colors.navy,
          borderBottom: `4px solid ${colors.red}`,
          padding: '22px 24px'
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: 'auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 13
            }}
          >
            <div
              style={{
                background: colors.red,
                width: 44,
                height: 44,
                borderRadius: 12,
                display: 'grid',
                placeItems: 'center',
                color: '#fff',
                fontSize: 28,
                fontWeight: 900
              }}
            >
              +
            </div>

            <div>
              <div
                style={{
                  color: '#fff',
                  fontWeight: 900,
                  fontSize: 22
                }}
              >
                MediRescue
              </div>
              <div
                style={{
                  color: '#cbd5e1',
                  fontSize: 10,
                  letterSpacing: 2
                }}
              >
                SUPER ADMIN PORTAL
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/admin-dashboard')}
            style={{
              padding: '12px 17px',
              background: '#fff',
              color: colors.navy,
              border: 'none',
              borderRadius: 9,
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            ← Dashboard
          </button>
        </div>
      </header>

      <main
        style={{
          maxWidth: 1200,
          margin: 'auto',
          padding: '42px 24px 60px'
        }}
      >
        {/* PAGE INTRO */}
        <p
          style={{
            color: colors.red,
            fontSize: 11,
            letterSpacing: 2,
            fontWeight: 900,
            margin: '0 0 12px'
          }}
        >
          EMERGENCY RESPONSE OVERSIGHT
        </p>

        <h1
          style={{
            fontSize: 'clamp(28px, 4vw, 38px)',
            color: colors.navy,
            margin: '0 0 10px'
          }}
        >
          Emergency Monitoring
        </h1>

        <p
          style={{
            color: colors.muted,
            margin: '0 0 32px',
            lineHeight: 1.7
          }}
        >
          Monitor emergency requests, ambulance assignments
          and patient response across all MediRescue hospitals.
        </p>

        {/* STATISTICS */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fit, minmax(210px, 1fr))',
            gap: 15,
            marginBottom: 35
          }}
        >
          <StatCard
            label="Total Emergencies"
            value={cases.length}
            icon="≡"
            tint="#eaf2ff"
            iconColor="#2563eb"
          />

          <StatCard
            label="Active Cases"
            value={activeCount}
            icon="+"
            tint="#fff0f1"
            iconColor={colors.red}
          />

          <StatCard
            label="Awaiting Payment"
            value={pendingCount}
            icon="KSh"
            tint="#fff8df"
            iconColor="#d97706"
          />

          <StatCard
            label="Closed Cases"
            value={closedCount}
            icon="✓"
            tint="#e8fbf0"
            iconColor="#059669"
          />
        </div>

        {/* RECORDS */}
        <section
          style={{
            background: colors.white,
            border: `1px solid ${colors.border}`,
            borderRadius: 16,
            padding: 25,
            boxShadow: '0 10px 30px rgba(16,42,67,0.035)'
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 15,
              flexWrap: 'wrap',
              marginBottom: 24
            }}
          >
            <div>
              <h2
                style={{
                  color: colors.navy,
                  fontSize: 22,
                  margin: '0 0 8px'
                }}
              >
                Emergency Records
                <span
                  style={{
                    display: 'inline-block',
                    marginLeft: 10,
                    padding: '5px 10px',
                    borderRadius: 999,
                    background: '#eaf2ff',
                    color: colors.navy,
                    fontSize: 13
                  }}
                >
                  {filteredCases.length}
                </span>
              </h2>

              <p
                style={{
                  margin: 0,
                  color: colors.muted,
                  fontSize: 13
                }}
              >
                Search and review registered emergency cases.
              </p>
            </div>

            <button
              type="button"
              onClick={() => loadCases()}
              disabled={loading}
              style={{
                padding: '12px 18px',
                background: colors.red,
                color: '#fff',
                border: 'none',
                borderRadius: 9,
                fontWeight: 800,
                cursor: loading ? 'wait' : 'pointer',
                opacity: loading ? 0.65 : 1
              }}
            >
              {loading ? 'Refreshing...' : '↻ Refresh Records'}
            </button>
          </div>

          {/* FILTERS */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 12,
              marginBottom: 24
            }}
          >
            <input
              type="search"
              aria-label="Search emergency records"
              placeholder="Search case ID, patient, hospital..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                ...inputStyle,
                flex: '1 1 290px',
                minWidth: 0
              }}
            />

            <select
              aria-label="Filter by case status"
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value)
              }
              style={{
                ...inputStyle,
                flex: '0 1 200px'
              }}
            >
              <option value="all">All Statuses</option>
              <option value="requested">Requested</option>
              <option value="assigned">Assigned</option>
              <option value="dispatched">Dispatched</option>
              <option value="picked_up">Picked Up</option>
              <option value="in_treatment">In Treatment</option>
              <option value="payment_pending">
                Payment Pending
              </option>
              <option value="paid">Paid</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          {error && (
            <div
              role="alert"
              style={{
                padding: 15,
                borderRadius: 9,
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                marginBottom: 20
              }}
            >
              {error}
            </div>
          )}

          {loading ? (
            <div
              style={{
                padding: 45,
                textAlign: 'center',
                color: colors.muted
              }}
            >
              Loading emergency cases...
            </div>
          ) : filteredCases.length === 0 ? (
            <div
              style={{
                padding: '50px 20px',
                textAlign: 'center'
              }}
            >
              <div style={{ fontSize: 34, marginBottom: 12 }}>
                ⌕
              </div>
              <h3 style={{ color: colors.navy }}>
                No Emergency Cases Found
              </h3>
              <p style={{ color: colors.muted }}>
                No records match your current search or filters.
              </p>
            </div>
          ) : (
            <div
              style={{
                overflowX: 'auto',
                border: `1px solid ${colors.border}`,
                borderRadius: 11
              }}
            >
              <table
                style={{
                  width: '100%',
                  minWidth: 1050,
                  borderCollapse: 'collapse'
                }}
              >
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
                      <th key={heading} style={thStyle}>
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {filteredCases.map((item) => (
                    <tr key={item.id}>
                      <td
                        style={{
                          ...tdStyle,
                          fontWeight: 900,
                          color: colors.red
                        }}
                      >
                        #{item.id}
                      </td>

                      <td
                        style={{
                          ...tdStyle,
                          fontWeight: 700
                        }}
                      >
                        {item.patient_name || 'Unknown'}
                      </td>

                      <td style={tdStyle}>
                        {item.hospital_name || 'Unassigned'}
                      </td>

                      <td
                        style={{
                          ...tdStyle,
                          maxWidth: 230,
                          lineHeight: 1.6
                        }}
                      >
                        {item.emergency_desc || '—'}
                      </td>

                      <td style={tdStyle}>
                        <Badge
                          value={item.severity}
                          palette={severityColors}
                        />
                      </td>

                      <td style={tdStyle}>
                        <Badge
                          value={item.status}
                          palette={statusColors}
                        />
                      </td>

                      <td style={tdStyle}>
                        {item.ambulance_plate || 'Not assigned'}
                      </td>

                      <td
                        style={{
                          ...tdStyle,
                          whiteSpace: 'nowrap',
                          color: colors.muted
                        }}
                      >
                        {formatDate(item.requested_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <footer
          style={{
            textAlign: 'center',
            marginTop: 38,
            fontSize: 12,
            color: '#8195b0'
          }}
        >
          MediRescue • Emergency Response Management System
        </footer>
      </main>
    </div>
  )
}

export default EmergencyMonitoring
