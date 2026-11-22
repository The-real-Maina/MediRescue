import { useState } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import ThemeToggle from '../components/ThemeToggle'

// Changed to localhost so it connects to your running Node.js server on your PC
const API_URL = 'http://localhost:5000/api/auth'

const roles = [
  { value: 'patient', label: 'Patient', icon: '♡', description: 'Medical assistance' },
  { value: 'hospital_staff', label: 'Hospital Staff', icon: '✚', description: 'Emergency coordination' },
  { value: 'hospital_admin', label: 'Hospital Admin', icon: '☰', description: 'Team & shifts' },
  { value: 'driver', label: 'Ambulance Driver', icon: '🚑', description: 'Ambulance operations' },
  { value: 'super_admin', label: 'Super Admin', icon: '⚙', description: 'System management' }
]

const OTP_ROLES = ['hospital_staff', 'hospital_admin', 'driver']

const styles = {
  page: { minHeight: '100vh', background: 'var(--bg)', fontFamily: "'Segoe UI', Arial, sans-serif", color: 'var(--heading)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '28px 16px', boxSizing: 'border-box' },
  shell: { width: '100%', maxWidth: 1100, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 390px), 1fr))', background: 'var(--surface)', borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--shadow-modal)', border: '1px solid var(--border)' },
  branding: { background: 'linear-gradient(145deg, #10243a 0%, #173b58 100%)', color: '#ffffff', padding: 'clamp(28px, 5vw, 55px)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 45, minHeight: 440, boxSizing: 'border-box' },
  formPanel: { padding: 'clamp(24px, 5vw, 48px)', background: 'var(--surface)' },
  label: { display: 'block', color: 'var(--text)', fontSize: 13, fontWeight: 700, marginBottom: 9 },
  input: { display: 'block', width: '100%', boxSizing: 'border-box', background: 'var(--input-bg)', color: 'var(--text)', border: '1px solid var(--input-border)', borderRadius: 10, padding: '14px 15px', fontSize: 15, outlineColor: 'var(--primary-text)', minHeight: 49 },
  roleButton: { display: 'flex', alignItems: 'center', textAlign: 'left', gap: 11, width: '100%', minWidth: 0, padding: '13px 12px', background: 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: 11, color: 'var(--text)', cursor: 'pointer', fontFamily: 'inherit' },
  submit: { width: '100%', padding: '15px 18px', border: 'none', borderRadius: 10, background: 'var(--primary)', color: 'var(--text-on-primary)', fontSize: 15, fontWeight: 800, cursor: 'pointer', marginTop: 8 },
  secondaryButton: { width: '100%', padding: '13px 18px', border: '1px solid var(--border)', borderRadius: 10, background: 'var(--surface-alt)', color: 'var(--text)', fontSize: 14, fontWeight: 700, cursor: 'pointer', marginTop: 10 },
  textLink: { color: 'var(--primary-text)', fontWeight: 800, textDecoration: 'none', cursor: 'pointer' }
}

function Login() {
  const navigate = useNavigate()
  const location = useLocation()

  const [role, setRole] = useState('patient')
  const [formData, setFormData] = useState({ phone: '', email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(false)

  const [otpStep, setOtpStep] = useState(false)
  const [challengeId, setChallengeId] = useState(null)
  const [otp, setOtp] = useState('')

  const [recoveryMode, setRecoveryMode] = useState('login')
  const [recoveryPhone, setRecoveryPhone] = useState('')
  const [recoveryOtp, setRecoveryOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const selectedRole = roles.find(item => item.value === role)

  const destinations = {
    patient: '/patient-dashboard',
    hospital_staff: '/staff-dashboard',
    hospital_admin: '/hospital-admin-dashboard',
    driver: '/driver-dashboard',
    super_admin: '/admin-dashboard'
  }

  const handleChange = event => {
    const { name, value } = event.target
    setFormData(current => ({ ...current, [name]: value }))
  }

  const handleRoleChange = selectedRoleValue => {
    if (otpStep || recoveryMode !== 'login') return
    setRole(selectedRoleValue)
    setError('')
    setNotice('')
    setShowPassword(false)
    setFormData({ phone: '', email: '', password: '' })
  }

  const finishLogin = data => {
    if (!data.token || !data.user?.role) {
      throw new Error('Login verification succeeded, but the server response is incomplete.')
    }
    if (data.user.role !== role) {
      throw new Error('Unexpected account role. Please select the correct account type.')
    }
    const destination = destinations[data.user.role]
    if (!destination) {
      throw new Error('No dashboard is configured for this account.')
    }
    localStorage.setItem('medirescue_token', data.token)
    localStorage.setItem('medirescue_user', JSON.stringify(data.user))
    navigate(destination, { replace: true })
  }

  const handleSubmit = async event => {
    event.preventDefault()
    if (loading || otpStep) return
    setError('')
    setNotice('')
    setLoading(true)

    const loginData = {
      password: formData.password,
      role,
      ...(role === 'patient' ? { phone: formData.phone } : { email: formData.email })
    }

    try {
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Login failed. Please try again.')
      }

      if (OTP_ROLES.includes(role) && data.requiresOtp === true) {
        if (data.challengeId == null) {
          throw new Error('The server did not provide an OTP challenge. Please contact the administrator.')
        }
        setChallengeId(data.challengeId)
        setOtp('')
        setOtpStep(true)
        setError('')
        // Demo mode: the server returns the code in the response so
        // visitors can sign in without a paid SMS service.
        setNotice(data.demoOtp ? data.message : '')
        return
      }
      finishLogin(data)
    } catch (err) {
      setError(err.message || 'Unable to log in.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async event => {
    event.preventDefault()
    if (loading) return
    if (!/^\d{6}$/.test(otp)) {
      setError('Enter the complete six-digit OTP.')
      return
    }
    setError('')
    setLoading(true)
    try {
      const response = await fetch(`${API_URL}/staff-otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId, code: otp })
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || data.error || 'OTP verification failed. Please try again.')
      }
      finishLogin(data)
    } catch (err) {
      setError(err.message || 'Unable to verify OTP.')
    } finally {
      setLoading(false)
    }
  }

  const openForgotPassword = () => {
    setRecoveryPhone(formData.phone)
    setRecoveryOtp('')
    setNewPassword('')
    setConfirmPassword('')
    setRecoveryMode('request')
    setError('')
    setNotice('')
  }

  const handleRequestResetOtp = async event => {
    event.preventDefault()
    if (loading) return
    if (!recoveryPhone.trim()) {
      setError('Enter your registered patient phone number.')
      return
    }
    setError('')
    setNotice('')
    setLoading(true)
    try {
      const response = await fetch(`${API_URL}/forgot-password/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: recoveryPhone.trim() })
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || data.error || 'Unable to request a reset code.')
      }
      setRecoveryMode('reset')
      setNotice(data.message || 'If a patient account exists for that number, a reset code will be sent.')
    } catch (err) {
      setError(err.message || 'Unable to request a reset code.')
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async event => {
    event.preventDefault()
    if (loading) return
    if (!/^\d{6}$/.test(recoveryOtp)) {
      setError('Enter the complete six-digit SMS code.')
      return
    }
    if (newPassword.length < 8 || newPassword.length > 72) {
      setError('Your new password must contain 8 to 72 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('The new passwords do not match.')
      return
    }
    setError('')
    setNotice('')
    setLoading(true)
    try {
      const response = await fetch(`${API_URL}/forgot-password/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: recoveryPhone.trim(),
          otp: recoveryOtp,
          new_password: newPassword,
          confirm_password: confirmPassword
        })
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || data.error || 'Password reset failed.')
      }
      setFormData(current => ({ ...current, phone: recoveryPhone.trim(), password: '' }))
      setRecoveryMode('login')
      setRole('patient')
      setOtpStep(false)
      setRecoveryOtp('')
      setNewPassword('')
      setConfirmPassword('')
      setError('')
      setNotice(data.message || 'Password reset successfully. You can now log in.')
    } catch (err) {
      setError(err.message || 'Unable to reset your password.')
    } finally {
      setLoading(false)
    }
  }

  const returnToLogin = () => {
    setRecoveryMode('login')
    setRecoveryOtp('')
    setNewPassword('')
    setConfirmPassword('')
    setError('')
    setNotice('')
    setRole('patient')
  }

  const returnToPasswordEntry = () => {
    setOtpStep(false)
    setChallengeId(null)
    setOtp('')
    setError('')
    setNotice('')
  }

  const isRecovering = recoveryMode !== 'login'

  return (
    <div style={styles.page}>
      <ThemeToggle floating />

      <main style={styles.shell}>
        <aside style={styles.branding}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
              <div style={{ width: 48, height: 48, borderRadius: 13, background: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 29, fontWeight: 800 }}>
                ✚
              </div>
              <div>
                <div style={{ fontSize: 27, fontWeight: 800, letterSpacing: -0.8 }}>
                  MediRescue
                </div>
                <div style={{ fontSize: 10, letterSpacing: 2, color: '#cbd5e1', marginTop: 4 }}>
                  EMERGENCY RESPONSE SYSTEM
                </div>
              </div>
            </div>

            <div style={{ marginTop: 75 }}>
              <div style={{ color: '#fca5a5', fontSize: 12, fontWeight: 800, letterSpacing: 2, marginBottom: 16 }}>
                CONNECTING CARE & RESPONSE
              </div>
              <h1 style={{ color: '#ffffff', fontSize: 'clamp(30px, 3.5vw, 43px)', lineHeight: 1.2, letterSpacing: -1, margin: '0 0 20px' }}>
                Every second matters.<br />Every life counts.
              </h1>
              <p style={{ color: '#cbd5e1', lineHeight: 1.8, fontSize: 15, maxWidth: 380 }}>
                One platform connecting patients, hospital teams and ambulance
                drivers for coordinated emergency medical response.
              </p>
            </div>
          </div>

          <div style={{ borderTop: '1px solid #36516a', paddingTop: 22 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              {['Patient Services', 'Hospital Coordination', 'Ambulance GPS'].map(item => (
                <span key={item} style={{ padding: '8px 11px', borderRadius: 20, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#e2e8f0', fontSize: 11 }}>
                  ✓ {item}
                </span>
              ))}
            </div>
          </div>
        </aside>

        <section style={styles.formPanel}>
          <div style={{ marginBottom: 26 }}>
            <p style={{ color: 'var(--primary-text)', fontSize: 11, fontWeight: 800, letterSpacing: 1.7, margin: '0 0 10px' }}>
              {isRecovering ? 'PATIENT ACCOUNT RECOVERY' : otpStep ? 'TWO-STEP VERIFICATION' : 'SECURE ACCOUNT ACCESS'}
            </p>
            <h2 style={{ color: 'var(--heading)', fontSize: 30, fontWeight: 800, margin: '0 0 10px' }}>
              {isRecovering ? (recoveryMode === 'request' ? 'Forgot Password?' : 'Reset Your Password') : otpStep ? 'Verify Your Identity' : 'Welcome Back'}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6, margin: 0 }}>
              {isRecovering ? (recoveryMode === 'request' ? 'Enter the phone number linked to your patient account to request a reset code.' : 'Enter the six-digit code sent to your phone and choose a new password.') : otpStep ? 'Enter the six-digit verification code for your staff account.' : 'Select your account type and sign in to continue.'}
            </p>
          </div>

          {!otpStep && !isRecovering && (
            <div style={{ marginBottom: 26 }}>
              <div style={{ ...styles.label, marginBottom: 12 }}>Select Account Type</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
                {roles.map(item => {
                  const selected = role === item.value
                  return (
                    <button key={item.value} type="button" aria-pressed={selected} onClick={() => handleRoleChange(item.value)} style={{ ...styles.roleButton, background: selected ? 'var(--primary-faint)' : 'var(--surface-alt)', border: selected ? '1.5px solid var(--primary)' : '1px solid var(--border)', boxShadow: selected ? '0 0 0 2px var(--focus-ring)' : 'none' }}>
                      <span aria-hidden="true" style={{ width: 32, height: 32, flexShrink: 0, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', background: selected ? 'var(--primary-soft)' : 'var(--border)', color: selected ? 'var(--primary-text)' : 'var(--text-muted)', fontSize: 19, fontWeight: 800 }}>
                        {item.icon}
                      </span>
                      <span style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <span style={{ fontSize: 12, fontWeight: 800, color: selected ? 'var(--primary-text)' : 'var(--heading)' }}>
                          {item.label}
                        </span>
                        <span style={{ color: 'var(--text-muted)', fontSize: 10, lineHeight: 1.3 }}>
                          {item.description}
                        </span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {location.state?.registrationSuccess && !otpStep && !isRecovering && (
            <div role="status" style={{ background: 'var(--success-soft)', color: 'var(--success-text)', border: '1px solid var(--success-border)', padding: 13, borderRadius: 9, marginBottom: 18, fontSize: 13 }}>
              Account created successfully. Please log in.
            </div>
          )}

          {notice && (
            <div role="status" style={{ background: 'var(--success-soft)', color: 'var(--success-text)', border: '1px solid var(--success-border)', padding: 13, borderRadius: 9, marginBottom: 18, fontSize: 13, lineHeight: 1.6 }}>
              {notice}
            </div>
          )}

          {error && (
            <div role="alert" style={{ background: 'var(--danger-soft)', color: 'var(--danger)', border: '1px solid var(--danger-border)', padding: 13, borderRadius: 9, marginBottom: 18, fontSize: 13, lineHeight: 1.6 }}>
              {error}
            </div>
          )}

          {recoveryMode === 'request' && (
            <form onSubmit={handleRequestResetOtp}>
              <div style={{ marginBottom: 20 }}>
                <label htmlFor="recovery-phone" style={styles.label}>Registered Patient Phone Number</label>
                <input id="recovery-phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="e.g. 0712345678" value={recoveryPhone} onChange={event => setRecoveryPhone(event.target.value)} style={styles.input} required />
              </div>
              <button type="submit" disabled={loading} style={{ ...styles.submit, opacity: loading ? 0.65 : 1 }}>
                {loading ? 'Requesting code...' : 'Send Reset Code →'}
              </button>
              <button type="button" onClick={returnToLogin} disabled={loading} style={styles.secondaryButton}>← Back to Login</button>
            </form>
          )}

          {recoveryMode === 'reset' && (
            <form onSubmit={handleResetPassword}>
              <div style={{ marginBottom: 18 }}>
                <label htmlFor="recovery-phone-confirm" style={styles.label}>Registered Phone Number</label>
                <input id="recovery-phone-confirm" type="tel" value={recoveryPhone} onChange={event => setRecoveryPhone(event.target.value)} style={styles.input} required />
              </div>
              <div style={{ marginBottom: 18 }}>
                <label htmlFor="recovery-otp" style={styles.label}>Six-Digit SMS Code</label>
                <input id="recovery-otp" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} placeholder="Enter 6-digit code" value={recoveryOtp} onChange={event => { setRecoveryOtp(event.target.value.replace(/\D/g, '').slice(0, 6)) }} style={{ ...styles.input, textAlign: 'center', fontSize: 22, fontWeight: 800, letterSpacing: 7 }} required />
                <p style={{ color: 'var(--text-muted)', fontSize: 12, lineHeight: 1.5, marginTop: 8 }}>The reset code expires after five minutes.</p>
              </div>
              <div style={{ marginBottom: 18 }}>
                <label htmlFor="recovery-new-password" style={styles.label}>New Password</label>
                <input id="recovery-new-password" type="password" autoComplete="new-password" minLength={8} maxLength={72} placeholder="Enter new password" value={newPassword} onChange={event => setNewPassword(event.target.value)} style={styles.input} required />
                <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 7 }}>Use 8 to 72 characters.</p>
              </div>
              <div style={{ marginBottom: 22 }}>
                <label htmlFor="recovery-confirm-password" style={styles.label}>Confirm New Password</label>
                <input id="recovery-confirm-password" type="password" autoComplete="new-password" minLength={8} maxLength={72} placeholder="Confirm new password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} style={styles.input} required />
              </div>
              <button type="submit" disabled={loading} style={{ ...styles.submit, opacity: loading ? 0.65 : 1 }}>
                {loading ? 'Resetting password...' : 'Reset Password →'}
              </button>
              <button type="button" onClick={() => { setRecoveryMode('request'); setRecoveryOtp(''); setNewPassword(''); setConfirmPassword(''); setError(''); setNotice(''); }} disabled={loading} style={styles.secondaryButton}>Request a New Code</button>
              <button type="button" onClick={returnToLogin} disabled={loading} style={styles.secondaryButton}>← Back to Login</button>
            </form>
          )}

          {otpStep && !isRecovering && (
            <form onSubmit={handleVerifyOtp}>
              <div style={{ marginBottom: 20 }}>
                <label htmlFor="staff-login-otp" style={styles.label}>Six-Digit Verification Code</label>
                <input id="staff-login-otp" name="otp" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} placeholder="Enter 6-digit OTP" value={otp} onChange={event => { setOtp(event.target.value.replace(/\D/g, '').slice(0, 6)); setError('') }} style={{ ...styles.input, textAlign: 'center', fontSize: 24, fontWeight: 800, letterSpacing: 8 }} required autoFocus />
                <p style={{ color: 'var(--text-muted)', fontSize: 12, lineHeight: 1.6, marginTop: 10 }}>Follow the existing OTP instructions provided by your MediRescue backend.</p>
              </div>
              <button type="submit" disabled={loading || otp.length !== 6} style={{ ...styles.submit, opacity: loading || otp.length !== 6 ? 0.65 : 1 }}>
                {loading ? 'Verifying...' : 'Verify OTP & Sign In →'}
              </button>
              <button type="button" onClick={returnToPasswordEntry} disabled={loading} style={styles.secondaryButton}>← Back to Login</button>
            </form>
          )}

          {!otpStep && !isRecovering && (
            <form onSubmit={handleSubmit}>
              {role === 'patient' ? (
                <div style={{ marginBottom: 20 }}>
                  <label htmlFor="login-phone" style={styles.label}>Phone Number</label>
                  <input id="login-phone" name="phone" type="tel" autoComplete="tel" placeholder="e.g. 0712345678" value={formData.phone} onChange={handleChange} style={styles.input} required />
                </div>
              ) : (
                <div style={{ marginBottom: 20 }}>
                  <label htmlFor="login-email" style={styles.label}>Email Address</label>
                  <input id="login-email" name="email" type="email" autoComplete="username" placeholder={role === 'super_admin' ? 'admin@medirescue.com' : role === 'hospital_admin' ? 'admin@hospital.com' : role === 'driver' ? 'driver@hospital.com' : 'staff@hospital.com'} value={formData.email} onChange={handleChange} style={styles.input} required />
                </div>
              )}

              <div style={{ marginBottom: 24 }}>
                <label htmlFor="login-password" style={styles.label}>Password</label>
                <div style={{ position: 'relative' }}>
                  <input id="login-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Enter your password" value={formData.password} onChange={handleChange} style={{ ...styles.input, paddingRight: 75 }} required />
                  <button type="button" onClick={() => setShowPassword(current => !current)} aria-label={showPassword ? 'Hide password' : 'Show password'} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', color: 'var(--text-muted)', fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: 7 }}>
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              {role === 'patient' && (
                <div style={{ textAlign: 'right', marginTop: -13, marginBottom: 17 }}>
                  <button type="button" onClick={openForgotPassword} style={{ ...styles.textLink, border: 'none', background: 'transparent', fontSize: 13, padding: 0 }}>Forgot Password?</button>
                </div>
              )}

              <button type="submit" disabled={loading} style={{ ...styles.submit, opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}>
                {loading ? 'Signing in...' : `Sign In as ${selectedRole.label} →`}
              </button>
            </form>
          )}

          {!otpStep && !isRecovering && role === 'patient' && (
            <p style={{ textAlign: 'center', marginTop: 22, color: 'var(--text-muted)', fontSize: 13 }}>
              Don't have an account? <Link to="/register" style={styles.textLink}>Create Account</Link>
            </p>
          )}

          <div style={{ borderTop: '1px solid var(--border)', marginTop: 28, paddingTop: 20, textAlign: 'center' }}>
            {isRecovering ? (
              <button type="button" onClick={returnToLogin} style={{ ...styles.textLink, border: 'none', background: 'transparent', fontSize: 13 }}>← Return to Sign In</button>
            ) : !otpStep ? (
              <Link to="/" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: 13, fontWeight: 700 }}>← Back to Homepage</Link>
            ) : null}
          </div>
        </section>
      </main>
    </div>
  )
}

export default Login