
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const API_URL = 'http://localhost:5000/api/admin/patients'

function PatientManagement() {
  const navigate = useNavigate()

  const [patients, setPatients] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadPatients = async (signal) => {
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
        throw new Error(
          data.error || 'Failed to retrieve patients'
        )
      }

      if (!Array.isArray(data)) {
        throw new Error('Unexpected API response')
      }

      if (!signal?.aborted) {
        setPatients(data)
      }

    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Failed to load patients')
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    const controller = new AbortController()

    loadPatients(controller.signal)

    return () => controller.abort()
  }, [navigate])

  const filteredPatients = patients.filter((patient) => {
    const query = search.trim().toLowerCase()

    return [
      patient.id,
      patient.name,
      patient.phone
    ].some((value) =>
      String(value ?? '').toLowerCase().includes(query)
    )
  })

  const cellStyle = {
    padding: '16px 14px',
    borderBottom: '1px solid #e2e8f0',
    textAlign: 'left',
    color: '#17233b'
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#f3f6fa',
        padding: '30px 20px',
        color: '#17233b'
      }}
    >
      <main style={{ maxWidth: '1200px', margin: 'auto' }}>
        <button
          type="button"
          onClick={() => navigate('/admin-dashboard')}
          style={{
            border: 'none',
            background: 'transparent',
            color: '#dc2626',
            cursor: 'pointer',
            marginBottom: '25px'
          }}
        >
          ← Back to Admin Dashboard
        </button>

        <h1 style={{ color: '#17233b' }}>
          Patient Management
        </h1>

        <p
          style={{
            color: '#64748b',
            marginBottom: '30px'
          }}
        >
          View and monitor registered patients across
          MediRescue.
        </p>

        <section
          style={{
            backgroundColor: '#ffffff',
            padding: '24px',
            borderRadius: '12px',
            boxShadow: '0 3px 12px rgba(0,0,0,0.04)'
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '15px',
              marginBottom: '22px'
            }}
          >
            <h2 style={{ color: '#17233b', margin: 0 }}>
              Registered Patients ({filteredPatients.length})
            </h2>

            <button
              type="button"
              onClick={() => loadPatients()}
              disabled={loading}
              style={{
                padding: '11px 20px',
                backgroundColor: '#dc2626',
                color: '#ffffff',
                border: 'none',
                borderRadius: '7px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {loading ? 'Loading...' : 'Refresh Records'}
            </button>
          </div>

          <input
            type="search"
            placeholder="Search by name, phone or patient ID..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '12px',
              border: '1px solid #cbd5e1',
              borderRadius: '7px',
              backgroundColor: '#ffffff',
              color: '#17233b',
              marginBottom: '24px'
            }}
          />

          {error && (
            <p role="alert" style={{ color: '#b91c1c' }}>
              {error}
            </p>
          )}

          {loading ? (
            <p>Loading patient records...</p>
          ) : !error && filteredPatients.length === 0 ? (
            <p>No patients match your search.</p>
          ) : !error ? (
            <div style={{ overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  minWidth: '550px'
                }}
              >
                <thead>
                  <tr>
                    {[
                      'Patient ID',
                      'Full Name',
                      'Phone Number'
                    ].map((heading) => (
                      <th
                        key={heading}
                        style={{
                          ...cellStyle,
                          borderBottom: '2px solid #cbd5e1'
                        }}
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {filteredPatients.map((patient) => (
                    <tr key={patient.id}>
                      <td style={cellStyle}>{patient.id}</td>
                      <td style={cellStyle}>{patient.name}</td>
                      <td style={cellStyle}>{patient.phone}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      </main>
    </div>
  )
}

export default PatientManagement
