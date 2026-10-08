
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const API_URL = 'http://localhost:5000/api/admin'

// ==========================================
// SUPER ADMIN DASHBOARD
// ==========================================

function AdminDashboard() {
  const navigate = useNavigate()

  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  let user = {}

  try {
    user = JSON.parse(
      localStorage.getItem('medirescue_user') || '{}'
    ) || {}
  } catch {
    user = {}
  }

  // ==========================================
  // LOAD DASHBOARD STATISTICS
  // ==========================================

  useEffect(() => {
    const controller = new AbortController()

    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('medirescue_token')

        if (!token) {
          navigate('/login', { replace: true })
          return
        }

        const response = await fetch(`${API_URL}/stats`, {
          headers: {
            Authorization: `Bearer ${token}`
          },
          signal: controller.signal
        })

        if (
          response.status === 401 ||
          response.status === 403
        ) {
          localStorage.removeItem('medirescue_token')
          localStorage.removeItem('medirescue_user')

          navigate('/login', { replace: true })
          return
        }

        const contentType =
          response.headers.get('content-type') || ''

        if (!contentType.includes('application/json')) {
          throw new Error(
            `Unexpected server response (${response.status})`
          )
        }

        const data = await response.json()

        if (!response.ok) {
          throw new Error(
            data.error || 'Failed to load statistics'
          )
        }

        if (!controller.signal.aborted) {
          setStats(data)
          setError('')
        }

      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(
            err.message ||
            'Unable to load dashboard statistics'
          )
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    fetchStats()

    return () => controller.abort()
  }, [navigate])

  // ==========================================
  // LOGOUT
  // ==========================================

  const handleLogout = () => {
    localStorage.removeItem('medirescue_token')
    localStorage.removeItem('medirescue_user')

    navigate('/login', { replace: true })
  }

  // ==========================================
  // DASHBOARD STATISTICS
  // ==========================================

  const statCards = stats
    ? [
        {
          label: 'Registered Hospitals',
          value: stats.hospitals
        },
        {
          label: 'Registered Patients',
          value: stats.patients
        },
        {
          label: 'Hospital Staff',
          value: stats.staff
        },
        {
          label: 'Emergency Cases',
          value: stats.emergencies
        },
        {
          label: 'Total Ambulances',
          value: stats.ambulances
        },
        {
          label: 'Available Ambulances',
          value: stats.availableAmbulances
        },
        {
          label: 'Payment Records',
          value: stats.payments
        }
      ]
    : []

  // ==========================================
  // MANAGEMENT MODULES
  // ==========================================

  const managementModules = [
    {
      label: 'Manage Hospitals',
      path: '/admin/hospitals',
      color: '#dc2626'
    },
    {
      label: 'Monitor Emergencies',
      path: '/admin/emergencies',
      color: '#17233b'
    },
    {
      label: 'Manage Ambulances',
      path: '/admin/ambulances',
      color: '#2563eb'
    },
    {
      label: 'Manage Staff',
      path: '/admin/staff',
      color: '#0f766e'
    },
    {
      label: 'Manage Patients',
      path: '/admin/patients',
      color: '#7c3aed'
    },
    {
      label: 'Manage Payments',
      path: '/admin/payments',
      color: '#ea580c'
    }
  ]

  // ==========================================
  // PAGE
  // ==========================================

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#f3f6fa',
        color: '#17233b'
      }}
    >
      {/* HEADER */}

      <header
        style={{
          backgroundColor: '#ffffff',
          padding: '18px 32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
        }}
      >
        <h2
          style={{
            color: '#dc2626',
            margin: 0
          }}
        >
          MediRescue Admin
        </h2>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            flexWrap: 'wrap'
          }}
        >
          <strong style={{ color: '#17233b' }}>
            {user.name || 'Administrator'}
          </strong>

          <button
            type="button"
            onClick={handleLogout}
            style={{
              padding: '10px 18px',
              border: '1px solid #dc2626',
              borderRadius: '6px',
              color: '#dc2626',
              backgroundColor: '#ffffff',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Logout
          </button>
        </div>
      </header>

      {/* DASHBOARD CONTENT */}

      <main
        style={{
          padding: '32px 20px',
          maxWidth: '1400px',
          margin: 'auto'
        }}
      >
        <p
          style={{
            color: '#dc2626',
            fontWeight: 600
          }}
        >
          MEDIRESCUE CENTRAL ADMINISTRATION
        </p>

        <h1
          style={{
            color: '#17233b',
            marginBottom: '8px'
          }}
        >
          Super Admin Dashboard
        </h1>

        <p
          style={{
            color: '#64748b',
            marginBottom: '30px'
          }}
        >
          Overview of hospitals, emergency operations,
          ambulance availability, payments and system
          activity.
        </p>

        {/* LOADING */}

        {loading && (
          <p>Loading dashboard statistics...</p>
        )}

        {/* ERROR */}

        {error && (
          <div
            role="alert"
            style={{
              backgroundColor: '#fee2e2',
              color: '#991b1b',
              padding: '16px',
              borderRadius: '8px',
              marginBottom: '20px'
            }}
          >
            {error}
          </div>
        )}

        {/* STATISTICS CARDS */}

        {!loading && !error && stats && (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '20px'
              }}
            >
              {statCards.map((card) => (
                <div
                  key={card.label}
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    padding: '24px',
                    boxShadow:
                      '0 3px 12px rgba(0,0,0,0.05)',
                    borderLeft: '4px solid #dc2626'
                  }}
                >
                  <p
                    style={{
                      color: '#64748b',
                      fontSize: '14px',
                      marginBottom: '12px'
                    }}
                  >
                    {card.label}
                  </p>

                  <h2
                    style={{
                      fontSize: '32px',
                      color: '#17233b',
                      margin: 0
                    }}
                  >
                    {card.value ?? 0}
                  </h2>
                </div>
              ))}
            </div>

            {/* SYSTEM MANAGEMENT */}

            <section
              style={{
                backgroundColor: '#ffffff',
                padding: '24px',
                borderRadius: '12px',
                marginTop: '30px',
                boxShadow:
                  '0 3px 12px rgba(0,0,0,0.04)'
              }}
            >
              <h2
                style={{
                  color: '#17233b',
                  marginBottom: '12px'
                }}
              >
                System Management
              </h2>

              <p
                style={{
                  color: '#64748b',
                  marginBottom: '20px'
                }}
              >
                Manage hospitals, monitor emergency
                operations, oversee ambulances, manage
                staff accounts, view registered patients
                and monitor payment records across
                MediRescue.
              </p>

              {/* MANAGEMENT BUTTONS */}

              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: '12px'
                }}
              >
                {managementModules.map((module) => (
                  <button
                    key={module.path}
                    type="button"
                    onClick={() => navigate(module.path)}
                    style={{
                      padding: '12px 24px',
                      backgroundColor: module.color,
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '7px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      minHeight: '44px'
                    }}
                  >
                    {module.label}
                  </button>
                ))}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  )
}

export default AdminDashboard
