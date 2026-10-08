import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

function MyCases() {
  const navigate = useNavigate()

  const [cases, setCases] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchCases = async () => {
      const token = localStorage.getItem('medirescue_token')

      if (!token) {
        navigate('/login')
        return
      }

      try {
        const response = await fetch(
          'http://localhost:5000/api/cases',
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        )

        const data = await response.json()

        if (!response.ok) {
          throw new Error(
            data.error || 'Failed to load emergency cases'
          )
        }

        setCases(Array.isArray(data) ? data : data.cases || [])

      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchCases()
  }, [navigate])

  const formatStatus = (status) => {
    return status
      ?.replaceAll('_', ' ')
      .replace(/\b\w/g, (letter) => letter.toUpperCase())
  }

  return (
    <div className="cases-page">
      <div className="cases-container">

        <button
          className="back-dashboard"
          onClick={() => navigate('/patient-dashboard')}
        >
          ← Back to Dashboard
        </button>

        <div className="cases-heading">
          <p>MEDIRESCUE</p>
          <h1>My Emergency Cases</h1>

          <span>
            Track your emergency requests and their current status.
          </span>
        </div>

        {loading && (
          <div className="cases-message">
            Loading your emergency cases...
          </div>
        )}

        {error && (
          <div className="login-error">
            {error}
          </div>
        )}

        {!loading && !error && cases.length === 0 && (
          <div className="cases-empty">
            <h3>No Emergency Cases</h3>

            <p>
              You have not submitted any emergency requests yet.
            </p>

            <button
              onClick={() => navigate('/emergency-request')}
            >
              Request Emergency Help
            </button>
          </div>
        )}

        {!loading && !error && cases.length > 0 && (
          <div className="cases-list">

            {cases.map((caseItem) => (
              <div
                className="case-card"
                key={caseItem.id}
              >
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
                    'No description provided.'}
                </p>

                <div className="case-details">
                  <div>
                    <span>Severity</span>

                    <strong>
                      {caseItem.severity
                        ? formatStatus(caseItem.severity)
                        : 'Not specified'}
                    </strong>
                  </div>

                  <div>
                    <span>Hospital</span>

                    <strong>
                      {caseItem.hospital_name ||
                        `Hospital ${caseItem.hospital_id}`}
                    </strong>
                  </div>

                  <div>
                    <span>Status</span>

                    <strong>
                      {formatStatus(caseItem.status)}
                    </strong>
                  </div>
                </div>
              </div>
            ))}

          </div>
        )}

      </div>
    </div>
  )
}

export default MyCases