import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

const API_URL = 'http://localhost:5000/api/auth'

const initialForm = {
  name: '',
  phone: '',
  password: '',
  confirmPassword: ''
}

const styles = {
  page: {
    minHeight: '100vh',
    background: '#f1f5f9',
    color: '#10243a',
    fontFamily: "'Segoe UI', Arial, sans-serif",
    padding: '32px 16px',
    boxSizing: 'border-box'
  },
  container: {
    maxWidth: 1100,
    margin: '0 auto',
    background: '#ffffff',
    borderRadius: 20,
    overflow: 'hidden',
    boxShadow: '0 20px 60px rgba(15,23,42,0.1)',
    border: '1px solid #e2e8f0'
  },
  header: {
    background: 'linear-gradient(135deg, #10243a, #173b58)',
    padding: '30px clamp(20px, 5vw, 48px)',
    color: '#ffffff',
    borderBottom: '4px solid #dc2626'
  },
  content: {
    padding: 'clamp(22px, 5vw, 48px)'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
    gap: '20px 24px'
  },
  label: {
    display: 'block',
    marginBottom: 8,
    fontSize: 13,
    fontWeight: 700,
    color: '#334155'
  },
  input: {
    width: '100%',
    minHeight: 48,
    padding: '12px 14px',
    borderRadius: 10,
    border: '1px solid #cbd5e1',
    background: '#ffffff',
    color: '#10243a',
    fontFamily: 'inherit',
    fontSize: 14,
    boxSizing: 'border-box',
    outlineColor: '#dc2626'
  },
  section: {
    marginTop: 30,
    paddingTop: 25,
    borderTop: '1px solid #e2e8f0'
  },
  sectionTitle: {
    margin: '0 0 8px',
    color: '#10243a',
    fontSize: 19,
    fontWeight: 800
  },
  sectionDescription: {
    margin: '0 0 22px',
    color: '#64748b',
    fontSize: 13,
    lineHeight: 1.6
  },
  submit: {
    border: 'none',
    background: '#dc2626',
    color: '#ffffff',
    padding: '15px 26px',
    borderRadius: 10,
    fontWeight: 800,
    fontSize: 14,
    cursor: 'pointer',
    fontFamily: 'inherit'
  }
}

function Register() {
  const navigate = useNavigate()

  const [form, setForm] = useState(initialForm)
  const [otp, setOtp] = useState('')
  const [otpStep, setOtpStep] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const handleChange = (event) => {
    const { name, value } = event.target

    setForm((current) => ({
      ...current,
      [name]: value
    }))
  }

  const requestOtp = async (event) => {
    event.preventDefault()

    if (loading) return

    setError('')
    setMessage('')

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (form.password.length < 6) {
      setError('Password must contain at least six characters.')
      return
    }

    if (!form.name.trim() || !form.phone.trim()) {
      setError('Enter your full name and phone number.')
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`${API_URL}/register/request-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.trim(),
          password: form.password,
          confirmPassword: form.confirmPassword
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Could not request verification code.')
      }

      setOtpStep(true)
      setMessage(
        data.message ||
        'Verification code requested. Check your SMS messages.'
      )
    } catch (err) {
      setError(err.message || 'Unable to request verification code.')
    } finally {
      setLoading(false)
    }
  }

  const verifyOtp = async (event) => {
    event.preventDefault()

    if (loading) return

    setError('')
    setMessage('')

    if (!/^\d{6}$/.test(otp)) {
      setError('Enter the six-digit verification code.')
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`${API_URL}/register/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phone: form.phone.trim(),
          code: otp
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Phone verification failed.')
      }

      navigate('/login', {
        replace: true,
        state: {
          registrationSuccess: true
        }
      })
    } catch (err) {
      setError(err.message || 'Unable to verify your phone number.')
    } finally {
      setLoading(false)
    }
  }

  const renderInput = (label, name, options = {}) => (
    <div>
      <label htmlFor={`register-${name}`} style={styles.label}>
        {label}
      </label>

      <input
        id={`register-${name}`}
        name={name}
        type={options.type || 'text'}
        value={form[name]}
        onChange={handleChange}
        placeholder={options.placeholder || ''}
        autoComplete={options.autoComplete}
        minLength={options.minLength}
        required
        disabled={loading || otpStep}
        style={{
          ...styles.input,
          background: otpStep ? '#f1f5f9' : '#ffffff'
        }}
      />
    </div>
  )

  return (
    <div style={styles.page}>
      <main style={styles.container}>
        <header style={styles.header}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 15
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  background: '#dc2626',
                  width: 46,
                  height: 46,
                  borderRadius: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 27,
                  fontWeight: 800
                }}
              >
                ✚
              </div>

              <div>
                <div style={{ fontSize: 26, fontWeight: 800 }}>
                  MediRescue
                </div>

                <div
                  style={{
                    fontSize: 10,
                    letterSpacing: 2,
                    color: '#cbd5e1',
                    marginTop: 3
                  }}
                >
                  EMERGENCY RESPONSE SYSTEM
                </div>
              </div>
            </div>

            <Link
              to="/login"
              style={{
                color: '#ffffff',
                textDecoration: 'none',
                border: '1px solid #64748b',
                padding: '10px 16px',
                borderRadius: 9,
                fontSize: 13,
                fontWeight: 700
              }}
            >
              Sign In →
            </Link>
          </div>

          <div style={{ marginTop: 35 }}>
            <p
              style={{
                color: '#fca5a5',
                fontSize: 11,
                letterSpacing: 2,
                fontWeight: 800,
                margin: '0 0 12px'
              }}
            >
              PATIENT REGISTRATION
            </p>

            <h1
              style={{
                fontSize: 'clamp(27px, 4vw, 38px)',
                margin: '0 0 12px',
                color: '#ffffff'
              }}
            >
              {otpStep ? 'Verify Your Phone Number' : 'Create Your Patient Account'}
            </h1>

            <p
              style={{
                color: '#cbd5e1',
                fontSize: 14,
                lineHeight: 1.7,
                maxWidth: 650,
                margin: 0
              }}
            >
              {otpStep
                ? `Enter the six-digit code sent to ${form.phone}. Your account will be created after successful verification.`
                : 'Register with MediRescue to request emergency medical assistance, follow your cases, and manage your medical response payments.'}
            </p>
          </div>
        </header>

        <div style={styles.content}>
          <div style={{ marginBottom: 25 }}>
            <h2
              style={{
                margin: '0 0 7px',
                fontSize: 23,
                color: '#10243a'
              }}
            >
              {otpStep ? 'Phone Verification' : 'Patient Information'}
            </h2>

            <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>
              {otpStep
                ? 'Check your SMS messages and enter your verification code.'
                : 'Complete the details below to begin registration.'}
            </p>
          </div>

          {error && (
            <div
              role="alert"
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                padding: 15,
                borderRadius: 10,
                marginBottom: 24,
                fontSize: 13
              }}
            >
              {error}
            </div>
          )}

          {message && (
            <div
              role="status"
              style={{
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                color: '#166534',
                padding: 15,
                borderRadius: 10,
                marginBottom: 24,
                fontSize: 13
              }}
            >
              {message}
            </div>
          )}

          {!otpStep ? (
            <form onSubmit={requestOtp}>
              <div style={styles.grid}>
                {renderInput('Full Name *', 'name', {
                  placeholder: 'Enter your full name',
                  autoComplete: 'name'
                })}

                {renderInput('Phone Number *', 'phone', {
                  type: 'tel',
                  placeholder: 'e.g. 0712345678',
                  autoComplete: 'tel'
                })}
              </div>

              <section style={styles.section}>
                <h3 style={styles.sectionTitle}>Account Security</h3>

                <p style={styles.sectionDescription}>
                  Set a password with at least six characters to protect your account.
                </p>

                <div style={styles.grid}>
                  <div>
                    <label htmlFor="register-password" style={styles.label}>
                      Password *
                    </label>

                    <input
                      id="register-password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={handleChange}
                      placeholder="Create a password"
                      autoComplete="new-password"
                      minLength={6}
                      required
                      disabled={loading}
                      style={styles.input}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="register-confirmPassword"
                      style={styles.label}
                    >
                      Confirm Password *
                    </label>

                    <input
                      id="register-confirmPassword"
                      name="confirmPassword"
                      type={showPassword ? 'text' : 'password'}
                      value={form.confirmPassword}
                      onChange={handleChange}
                      placeholder="Re-enter your password"
                      autoComplete="new-password"
                      required
                      disabled={loading}
                      style={styles.input}
                    />
                  </div>
                </div>

                <label
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    marginTop: 15,
                    color: '#475569',
                    fontSize: 13,
                    cursor: 'pointer'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={showPassword}
                    onChange={(event) =>
                      setShowPassword(event.target.checked)
                    }
                  />
                  Show passwords
                </label>
              </section>

              <p
                style={{
                  margin: '28px 0 0',
                  color: '#64748b',
                  fontSize: 13,
                  lineHeight: 1.6
                }}
              >
                Your account will only be created after phone verification.
              </p>

              <div
                style={{
                  marginTop: 35,
                  paddingTop: 25,
                  borderTop: '1px solid #e2e8f0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 18
                }}
              >
                <div style={{ color: '#64748b', fontSize: 13 }}>
                  Already registered?{' '}
                  <Link
                    to="/login"
                    style={{
                      color: '#dc2626',
                      fontWeight: 800,
                      textDecoration: 'none'
                    }}
                  >
                    Sign In
                  </Link>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    ...styles.submit,
                    opacity: loading ? 0.7 : 1,
                    cursor: loading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {loading ? 'Requesting Code...' : 'Send Verification Code →'}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={verifyOtp}>
              <div>
                <label htmlFor="register-otp" style={styles.label}>
                  Six-Digit Verification Code *
                </label>

                <input
                  id="register-otp"
                  name="otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  value={otp}
                  onChange={(event) =>
                    setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))
                  }
                  placeholder="Enter 6-digit code"
                  style={{
                    ...styles.input,
                    maxWidth: 360,
                    letterSpacing: 6,
                    fontSize: 20,
                    textAlign: 'center'
                  }}
                />
              </div>

              <p
                style={{
                  marginTop: 16,
                  color: '#64748b',
                  fontSize: 13,
                  lineHeight: 1.6
                }}
              >
                The code expires after five minutes. If it expires, go back and request a new code.
              </p>

              <div
                style={{
                  marginTop: 30,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 18
                }}
              >
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setOtpStep(false)
                    setOtp('')
                    setError('')
                    setMessage('')
                  }}
                  style={{
                    ...styles.submit,
                    background: '#e2e8f0',
                    color: '#10243a'
                  }}
                >
                  ← Back
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    ...styles.submit,
                    opacity: loading ? 0.7 : 1,
                    cursor: loading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {loading ? 'Verifying...' : 'Verify & Create Account →'}
                </button>
              </div>
            </form>
          )}

          <div style={{ textAlign: 'center', marginTop: 30 }}>
            <Link
              to="/"
              style={{
                color: '#64748b',
                fontSize: 13,
                fontWeight: 700,
                textDecoration: 'none'
              }}
            >
              ← Back to Homepage
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}

export default Register