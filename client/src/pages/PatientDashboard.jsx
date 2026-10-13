
import { useNavigate } from 'react-router-dom'

// ==========================================
// MEDIRESCUE PATIENT DASHBOARD STYLES
// ==========================================

const styles = {
  page: {
    minHeight: '100vh',
    background: '#f1f5f9',
    color: '#17233b',
    fontFamily: "'Segoe UI', Arial, sans-serif"
  },

  header: {
    background: '#10243a',
    borderBottom: '4px solid #dc2626',
    padding: '18px 5%',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 16
  },

  brand: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: 800,
    margin: 0
  },

  portal: {
    color: '#cbd5e1',
    fontSize: 11,
    letterSpacing: 1.6,
    marginTop: 5
  },

  logout: {
    padding: '10px 18px',
    borderRadius: 8,
    border: '1px solid #64748b',
    background: 'transparent',
    color: '#ffffff',
    fontWeight: 700,
    cursor: 'pointer'
  },

  content: {
    maxWidth: 1100,
    margin: '0 auto',
    padding: '40px 20px 70px'
  },

  eyebrow: {
    color: '#dc2626',
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: 1.5,
    marginBottom: 10
  },

  title: {
    color: '#10243a',
    fontSize: 'clamp(28px, 4vw, 38px)',
    fontWeight: 800,
    margin: '0 0 12px'
  },

  subtitle: {
    color: '#64748b',
    fontSize: 15,
    lineHeight: 1.7,
    margin: 0
  },

  grid: {
    display: 'grid',
    gridTemplateColumns:
      'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
    gap: 22,
    marginTop: 30
  },

  card: {
    background: '#ffffff',
    borderRadius: 15,
    padding: 28,
    border: '1px solid #e2e8f0',
    boxShadow: '0 6px 22px rgba(15,23,42,0.05)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    minHeight: 275
  },

  cardTitle: {
    color: '#10243a',
    fontSize: 21,
    fontWeight: 800,
    margin: '20px 0 10px'
  },

  cardDescription: {
    color: '#64748b',
    fontSize: 15,
    lineHeight: 1.7,
    margin: '0 0 24px',
    flexGrow: 1
  },

  iconBox: {
    width: 54,
    height: 54,
    borderRadius: 13,
    background: '#fee2e2',
    color: '#dc2626',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: 27,
    fontWeight: 800
  },

  redButton: {
    padding: '13px 19px',
    background: '#dc2626',
    color: '#ffffff',
    border: 'none',
    borderRadius: 9,
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer'
  },

  navyButton: {
    padding: '13px 19px',
    background: '#10243a',
    color: '#ffffff',
    border: 'none',
    borderRadius: 9,
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer'
  }
}

// ==========================================
// DASHBOARD COMPONENT
// ==========================================

function PatientDashboard() {
  const navigate = useNavigate()

  let user = {}

  try {
    user = JSON.parse(
      localStorage.getItem('medirescue_user') || '{}'
    ) || {}
  } catch {
    user = {}
  }

  const patientName = user.name || 'Patient'

  // ==========================================
  // LOGOUT
  // ==========================================

  const handleLogout = () => {
    localStorage.removeItem('medirescue_token')
    localStorage.removeItem('medirescue_user')

    navigate('/login', { replace: true })
  }

  return (
    <div style={styles.page}>

      {/* HEADER */}
      <header style={styles.header}>

        <div>
          <h2 style={styles.brand}>
            ✚ MediRescue
          </h2>

          <div style={styles.portal}>
            PATIENT PORTAL
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            flexWrap: 'wrap'
          }}
        >
          <span
            style={{
              color: '#ffffff',
              fontSize: 14,
              fontWeight: 600
            }}
          >
            {patientName}
          </span>

          <button
            type="button"
            onClick={handleLogout}
            style={styles.logout}
          >
            Logout →
          </button>
        </div>
      </header>

      <main style={styles.content}>

        {/* WELCOME SECTION */}
        <section style={{ marginBottom: 30 }}>

          <p style={styles.eyebrow}>
            PATIENT CONTROL CENTER
          </p>

          <h1 style={styles.title}>
            Welcome, {patientName}
          </h1>

          <p style={styles.subtitle}>
            Request emergency medical assistance,
            monitor your emergency cases and
            manage payments in one secure place.
          </p>

        </section>

        {/* EMERGENCY NOTICE */}
        <section
          style={{
            background: '#fff7f7',
            border: '1px solid #fecaca',
            borderLeft: '5px solid #dc2626',
            borderRadius: 12,
            padding: '20px 22px',
            marginBottom: 28,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            flexWrap: 'wrap'
          }}
        >
          <div
            style={{
              fontSize: 30,
              lineHeight: 1
            }}
          >
            🚨
          </div>

          <div style={{ flex: 1, minWidth: 200 }}>
            <h3
              style={{
                color: '#991b1b',
                margin: '0 0 6px',
                fontSize: 17
              }}
            >
              Need urgent medical assistance?
            </h3>

            <p
              style={{
                color: '#7f1d1d',
                margin: 0,
                lineHeight: 1.6,
                fontSize: 14
              }}
            >
              Submit an emergency request to
              start the MediRescue response process.
              For an immediate life-threatening
              emergency, contact local emergency
              services directly.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate('/emergency-request')}
            style={styles.redButton}
          >
            Request Help →
          </button>
        </section>

        {/* DASHBOARD ACTION CARDS */}
        <div style={styles.grid}>

          {/* EMERGENCY ASSISTANCE */}
          <section style={styles.card}>

            <div style={styles.iconBox}>
              ✚
            </div>

            <h3 style={styles.cardTitle}>
              Emergency Assistance
            </h3>

            <p style={styles.cardDescription}>
              Request emergency medical assistance
              from a hospital and provide important
              details about your situation.
            </p>

            <button
              type="button"
              style={styles.redButton}
              onClick={() =>
                navigate('/emergency-request')
              }
            >
              Request Emergency Help →
            </button>

          </section>

          {/* MY EMERGENCY CASES */}
          <section style={styles.card}>

            <div
              style={{
                ...styles.iconBox,
                background: '#e0f2fe',
                color: '#0369a1'
              }}
            >
              ☷
            </div>

            <h3 style={styles.cardTitle}>
              My Emergency Cases
            </h3>

            <p style={styles.cardDescription}>
              Review your submitted emergency
              requests and follow their current
              response and treatment status.
            </p>

            <button
              type="button"
              style={styles.navyButton}
              onClick={() =>
                navigate('/my-cases')
              }
            >
              View My Cases →
            </button>

          </section>

          {/* M-PESA PAYMENTS */}
          <section style={styles.card}>

            <div
              style={{
                ...styles.iconBox,
                background: '#dcfce7',
                color: '#15803d',
                fontSize: 17
              }}
            >
              KSh
            </div>

            <h3 style={styles.cardTitle}>
              M-Pesa Payments
            </h3>

            <p style={styles.cardDescription}>
              View payment information and pay
              for emergency medical services
              using M-Pesa.
            </p>

            <button
              type="button"
              style={styles.navyButton}
              onClick={() =>
                navigate('/pay-now')
              }
            >
              Pay with M-Pesa →
            </button>

          </section>

        </div>

        {/* FOOTER */}
        <footer
          style={{
            textAlign: 'center',
            marginTop: 45,
            color: '#94a3b8',
            fontSize: 12
          }}
        >
          MediRescue Emergency Response System
          {' '}• Patient Portal
        </footer>

      </main>
    </div>
  )
}

export default PatientDashboard
