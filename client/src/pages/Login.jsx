import { useState } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'

const API_URL = 'http://localhost:5000/api/auth/login'

const roles = [
  {
    value: 'patient',
    label: 'Patient',
    icon: '♡',
    description: 'Medical assistance'
  },
  {
    value: 'hospital_staff',
    label: 'Hospital Staff',
    icon: '✚',
    description: 'Emergency coordination'
  },
  {
    value: 'hospital_admin',
    label: 'Hospital Admin',
    icon: '☰',
    description: 'Team & shifts'
  },
  {
    value: 'driver',
    label: 'Ambulance Driver',
    icon: '🚑',
    description: 'Ambulance operations'
  },
  {
    value: 'super_admin',
    label: 'Super Admin',
    icon: '⚙',
    description: 'System management'
  }
]

const styles = {
  page: {
    minHeight: '100vh',
    background: '#f1f5f9',
    fontFamily: "'Segoe UI', Arial, sans-serif",
    color: '#10243a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '28px 16px',
    boxSizing: 'border-box'
  },
  shell: {
    width: '100%',
    maxWidth: 1100,
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 390px), 1fr))',
    background: '#ffffff',
    borderRadius: 20,
    overflow: 'hidden',
    boxShadow: '0 20px 60px rgba(15,23,42,0.12)',
    border: '1px solid #e2e8f0'
  },
  branding: {
    background: 'linear-gradient(145deg, #10243a 0%, #173b58 100%)',
    color: '#ffffff',
    padding: 'clamp(28px, 5vw, 55px)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    gap: 45,
    minHeight: 440,
    boxSizing: 'border-box'
  },
  formPanel: {
    padding: 'clamp(24px, 5vw, 48px)',
    background: '#ffffff'
  },
  label: {
    display: 'block',
    color: '#334155',
    fontSize: 13,
    fontWeight: 700,
    marginBottom: 9
  },
  input: {
    display: 'block',
    width: '100%',
    boxSizing: 'border-box',
    background: '#ffffff',
    color: '#10243a',
    border: '1px solid #cbd5e1',
    borderRadius: 10,
    padding: '14px 15px',
    fontSize: 15,
    outlineColor: '#dc2626',
    minHeight: 49
  },
  roleButton: {
    display: 'flex',
    alignItems: 'center',
    textAlign: 'left',
    gap: 11,
    width: '100%',
    minWidth: 0,
    padding: '13px 12px',
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: 11,
    color: '#334155',
    cursor: 'pointer',
    fontFamily: 'inherit'
  },
  submit: {
    width: '100%',
    padding: '15px 18px',
    border: 'none',
    borderRadius: 10,
    background: '#dc2626',
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 800,
    cursor: 'pointer',
    marginTop: 8
  }
}

function Login() {
  const navigate = useNavigate()
  const location = useLocation()

  const [role, setRole] = useState('patient')
  const [formData, setFormData] = useState({
    phone: '',
    email: '',
    password: ''
  })

  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const selectedRole = roles.find(
    (item) => item.value === role
  )

  // ==========================================
  // FORM HANDLERS
  // ==========================================

  const handleChange = (event) => {
    const { name, value } = event.target

    setFormData((current) => ({
      ...current,
      [name]: value
    }))
  }

  const handleRoleChange = (selectedRoleValue) => {
    setRole(selectedRoleValue)
    setError('')
    setShowPassword(false)

    setFormData({
      phone: '',
      email: '',
      password: ''
    })
  }

  // ==========================================
  // AUTHENTICATION
  // ==========================================

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (loading) return

    setError('')
    setLoading(true)

    const loginData = {
      password: formData.password,
      role,
      ...(role === 'patient'
        ? { phone: formData.phone }
        : { email: formData.email })
    }

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(loginData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.error || 'Login failed. Please try again.'
        )
      }

      if (!data.token || !data.user?.role) {
        throw new Error('Invalid login response')
      }

      const destinations = {
        patient: '/patient-dashboard',
        hospital_staff: '/staff-dashboard',
        hospital_admin: '/hospital-admin-dashboard',
        driver: '/driver-dashboard',
        super_admin: '/admin-dashboard'
      }

      const destination = destinations[data.user.role]

      if (!destination || data.user.role !== role) {
        throw new Error('Unexpected account role')
      }

      localStorage.setItem(
        'medirescue_token',
        data.token
      )

      localStorage.setItem(
        'medirescue_user',
        JSON.stringify(data.user)
      )

      navigate(destination, { replace: true })
    } catch (err) {
      setError(err.message || 'Unable to log in')
    } finally {
      setLoading(false)
    }
  }

  // ==========================================
  // INTERFACE
  // ==========================================

  return (
    <div style={styles.page}>
      <main style={styles.shell}>

        {/* BRANDING PANEL */}
        <aside style={styles.branding}>
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 13
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 13,
                  background: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 29,
                  fontWeight: 800
                }}
              >
                ✚
              </div>

              <div>
                <div
                  style={{
                    fontSize: 27,
                    fontWeight: 800,
                    letterSpacing: -0.8
                  }}
                >
                  MediRescue
                </div>

                <div
                  style={{
                    fontSize: 10,
                    letterSpacing: 2,
                    color: '#cbd5e1',
                    marginTop: 4
                  }}
                >
                  EMERGENCY RESPONSE SYSTEM
                </div>
              </div>
            </div>

            <div style={{ marginTop: 75 }}>
              <div
                style={{
                  color: '#fca5a5',
                  fontSize: 12,
                  fontWeight: 800,
                  letterSpacing: 2,
                  marginBottom: 16
                }}
              >
                CONNECTING CARE & RESPONSE
              </div>

              <h1
                style={{
                  color: '#ffffff',
                  fontSize: 'clamp(30px, 3.5vw, 43px)',
                  lineHeight: 1.2,
                  letterSpacing: -1,
                  margin: '0 0 20px'
                }}
              >
                Every second matters.
                <br />
                Every life counts.
              </h1>

              <p
                style={{
                  color: '#cbd5e1',
                  lineHeight: 1.8,
                  fontSize: 15,
                  maxWidth: 380
                }}
              >
                One platform connecting patients,
                hospital teams and ambulance drivers
                for coordinated emergency medical
                response.
              </p>
            </div>
          </div>

          <div
            style={{
              borderTop: '1px solid #36516a',
              paddingTop: 22
            }}
          >
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 12
              }}
            >
              {[
                'Patient Services',
                'Hospital Coordination',
                'Ambulance GPS'
              ].map((item) => (
                <span
                  key={item}
                  style={{
                    padding: '8px 11px',
                    borderRadius: 20,
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: '#e2e8f0',
                    fontSize: 11
                  }}
                >
                  ✓ {item}
                </span>
              ))}
            </div>
          </div>
        </aside>

        {/* LOGIN FORM PANEL */}
        <section style={styles.formPanel}>
          <div style={{ marginBottom: 26 }}>
            <p
              style={{
                color: '#dc2626',
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: 1.7,
                margin: '0 0 10px'
              }}
            >
              SECURE ACCOUNT ACCESS
            </p>

            <h2
              style={{
                color: '#10243a',
                fontSize: 30,
                fontWeight: 800,
                margin: '0 0 10px'
              }}
            >
              Welcome Back
            </h2>

            <p
              style={{
                color: '#64748b',
                fontSize: 14,
                lineHeight: 1.6,
                margin: 0
              }}
            >
              Select your account type and sign in
              to continue.
            </p>
          </div>

          {/* ROLE SELECTOR */}
          <div style={{ marginBottom: 26 }}>
            <div
              style={{
                ...styles.label,
                marginBottom: 12
              }}
            >
              Select Account Type
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(2, minmax(0, 1fr))',
                gap: 10
              }}
            >
              {roles.map((item) => {
                const selected = role === item.value

                return (
                  <button
                    key={item.value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() =>
                      handleRoleChange(item.value)
                    }
                    style={{
                      ...styles.roleButton,
                      background: selected
                        ? '#fff1f2'
                        : '#f8fafc',
                      border: selected
                        ? '1.5px solid #dc2626'
                        : '1px solid #e2e8f0',
                      boxShadow: selected
                        ? '0 0 0 2px rgba(220,38,38,0.05)'
                        : 'none'
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        width: 32,
                        height: 32,
                        flexShrink: 0,
                        borderRadius: 9,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: selected
                          ? '#fee2e2'
                          : '#e2e8f0',
                        color: selected
                          ? '#b91c1c'
                          : '#475569',
                        fontSize: 19,
                        fontWeight: 800
                      }}
                    >
                      {item.icon}
                    </span>

                    <span
                      style={{
                        minWidth: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 3
                      }}
                    >
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 800,
                          color: selected
                            ? '#991b1b'
                            : '#10243a'
                        }}
                      >
                        {item.label}
                      </span>

                      <span
                        style={{
                          color: '#64748b',
                          fontSize: 10,
                          lineHeight: 1.3
                        }}
                      >
                        {item.description}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* REGISTRATION MESSAGE */}
          {location.state?.registrationSuccess && (
            <div
              role="status"
              style={{
                background: '#f0fdf4',
                color: '#166534',
                border: '1px solid #bbf7d0',
                padding: 13,
                borderRadius: 9,
                marginBottom: 18,
                fontSize: 13
              }}
            >
              Account created successfully.
              Please log in.
            </div>
          )}

          {/* ERROR MESSAGE */}
          {error && (
            <div
              role="alert"
              style={{
                background: '#fef2f2',
                color: '#b91c1c',
                border: '1px solid #fecaca',
                padding: 13,
                borderRadius: 9,
                marginBottom: 18,
                fontSize: 13
              }}
            >
              {error}
            </div>
          )}

          {/* LOGIN FORM */}
          <form onSubmit={handleSubmit}>

            {role === 'patient' ? (
              <div style={{ marginBottom: 20 }}>
                <label
                  htmlFor="login-phone"
                  style={styles.label}
                >
                  Phone Number
                </label>

                <input
                  id="login-phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="e.g. 0712345678"
                  value={formData.phone}
                  onChange={handleChange}
                  style={styles.input}
                  required
                />
              </div>
            ) : (
              <div style={{ marginBottom: 20 }}>
                <label
                  htmlFor="login-email"
                  style={styles.label}
                >
                  Email Address
                </label>

                <input
                  id="login-email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  placeholder={
                    role === 'super_admin'
                      ? 'admin@medirescue.com'
                      : role === 'hospital_admin'
                        ? 'admin@hospital.com'
                        : role === 'driver'
                          ? 'driver@hospital.com'
                          : 'staff@hospital.com'
                  }
                  value={formData.email}
                  onChange={handleChange}
                  style={styles.input}
                  required
                />
              </div>
            )}

            {/* PASSWORD FIELD */}
            <div style={{ marginBottom: 24 }}>
              <label
                htmlFor="login-password"
                style={styles.label}
              >
                Password
              </label>

              <div style={{ position: 'relative' }}>
                <input
                  id="login-password"
                  name="password"
                  type={
                    showPassword
                      ? 'text'
                      : 'password'
                  }
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  style={{
                    ...styles.input,
                    paddingRight: 75
                  }}
                  required
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword((current) => !current)
                  }
                  aria-label={
                    showPassword
                      ? 'Hide password'
                      : 'Show password'
                  }
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    border: 'none',
                    background: 'transparent',
                    color: '#475569',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    padding: 7
                  }}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                ...styles.submit,
                opacity: loading ? 0.7 : 1,
                cursor: loading
                  ? 'not-allowed'
                  : 'pointer'
              }}
            >
              {loading
                ? 'Signing in...'
                : `Sign In as ${selectedRole.label} →`}
            </button>
          </form>

          {/* PATIENT REGISTRATION */}
          {role === 'patient' && (
            <p
              style={{
                textAlign: 'center',
                marginTop: 22,
                color: '#64748b',
                fontSize: 13
              }}
            >
              Don't have an account?{' '}
              <Link
                to="/register"
                style={{
                  color: '#dc2626',
                  fontWeight: 800,
                  textDecoration: 'none'
                }}
              >
                Create Account
              </Link>
            </p>
          )}

          {/* BACK TO HOME */}
          <div
            style={{
              borderTop: '1px solid #e2e8f0',
              marginTop: 28,
              paddingTop: 20,
              textAlign: 'center'
            }}
          >
            <Link
              to="/"
              style={{
                color: '#475569',
                textDecoration: 'none',
                fontSize: 13,
                fontWeight: 700
              }}
            >
              ← Back to Homepage
            </Link>
          </div>
        </section>
      </main>
    </div>
  )
}

export default Login