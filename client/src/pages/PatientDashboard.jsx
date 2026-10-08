
import { useNavigate } from 'react-router-dom'

function PatientDashboard() {
  const navigate = useNavigate()

  const user = JSON.parse(
    localStorage.getItem('medirescue_user') || '{}'
  )

  const handleLogout = () => {
    localStorage.removeItem('medirescue_token')
    localStorage.removeItem('medirescue_user')
    navigate('/login')
  }

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <h2>MediRescue</h2>

        <div className="dashboard-user">
          <span>{user.name || 'Patient'}</span>

          <button onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <main className="dashboard-content">
        <div className="dashboard-welcome">
          <p>PATIENT DASHBOARD</p>

          <h1>
            Welcome, {user.name || 'Patient'}
          </h1>

          <span>
            Request emergency medical assistance,
            track your cases and manage payments.
          </span>
        </div>

        <div className="dashboard-actions">

          {/* EMERGENCY ASSISTANCE */}
          <div className="dashboard-card emergency-card">
            <div className="card-icon">+</div>

            <h3>Emergency Assistance</h3>

            <p>
              Request immediate medical assistance
              from a nearby hospital.
            </p>

            <button
              onClick={() => navigate('/emergency-request')}
            >
              Request Emergency Help
            </button>
          </div>

          {/* MY EMERGENCY CASES */}
          <div className="dashboard-card">
            <div className="card-icon">⌕</div>

            <h3>My Emergency Cases</h3>

            <p>
              View your emergency requests and
              follow their current status.
            </p>

            <button
              onClick={() => navigate('/my-cases')}
            >
              View My Cases
            </button>
          </div>

          {/* M-PESA PAYMENTS */}
          <div className="dashboard-card">
            <div className="card-icon">KSh</div>

            <h3>M-Pesa Payments</h3>

            <p>
              Pay for emergency medical services
              securely using M-Pesa.
            </p>

            <button
              onClick={() => navigate('/pay-now')}
            >
              Pay with M-Pesa
            </button>
          </div>

        </div>
      </main>
    </div>
  )
}

export default PatientDashboard
