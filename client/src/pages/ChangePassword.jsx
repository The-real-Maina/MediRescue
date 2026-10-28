import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { FaLock, FaEye, FaEyeSlash, FaCheckCircle, FaRegCircle, FaSignOutAlt } from 'react-icons/fa'
import Sidebar from '../components/Sidebar'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000'

const DASHBOARDS = {
  patient: '/patient-dashboard',
  hospital_staff: '/staff-dashboard',
  hospital_admin: '/hospital-admin-dashboard',
  driver: '/driver-dashboard'
}

function readUser() {
  try {
    return JSON.parse(localStorage.getItem('medirescue_user') || 'null')
  } catch {
    return null
  }
}

const styles = {
  forcedPage: {
    minHeight: '100vh', display: 'flex', alignItems: 'center',
    justifyContent: 'center', padding: '30px 20px', boxSizing: 'border-box',
    background: 'var(--bg)'
  },
  shell: { display: 'flex', minHeight: '100vh', background: 'var(--bg)' },
  main: { flex: 1, minWidth: 0, padding: '50px 24px' },
  mainInner: { maxWidth: 520, margin: '0 auto' },
  eyebrow: {
    color: 'var(--primary-text)', fontSize: 13, fontWeight: 'bold',
    letterSpacing: 1.5, marginBottom: 8
  },
  pageTitle: { color: 'var(--heading)', fontSize: 34, margin: '0 0 8px' },
  pageSub: { color: 'var(--text-muted)', fontSize: 16, margin: '0 0 28px', lineHeight: 1.5 },
  card: {
    width: '100%', maxWidth: 460, background: 'var(--surface)', borderRadius: 14,
    padding: '34px 32px', boxSizing: 'border-box',
    border: '1px solid var(--border)', boxShadow: 'var(--shadow-modal)'
  },
  cardInline: {
    width: '100%', background: 'var(--surface)', borderRadius: 14,
    padding: '30px 30px', boxSizing: 'border-box',
    border: '1px solid var(--border)', boxShadow: 'var(--shadow-modal)'
  },
  brand: { textAlign: 'center', color: 'var(--primary-text)', fontSize: 30, fontWeight: 'bold', marginBottom: 6 },
  badge: {
    width: 54, height: 54, borderRadius: 12, background: 'var(--primary-soft)',
    color: 'var(--primary-text)', display: 'flex', alignItems: 'center',
    justifyContent: 'center', margin: '0 auto 14px'
  },
  title: { margin: 0, textAlign: 'center', color: 'var(--heading)', fontSize: 24 },
  subtitle: {
    textAlign: 'center', color: 'var(--text-muted)', fontSize: 14,
    lineHeight: 1.6, margin: '8px 0 24px'
  },
  label: { display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 7 },
  fieldWrap: { position: 'relative', marginBottom: 18 },
  input: {
    width: '100%', padding: '13px 46px 13px 14px', border: '1px solid var(--input-border)',
    borderRadius: 7, fontSize: 15, boxSizing: 'border-box', outline: 'none',
    background: 'var(--input-bg)', color: 'var(--text)'
  },
  eye: {
    position: 'absolute', right: 4, bottom: 3, background: 'transparent',
    border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 11, display: 'flex'
  },
  rules: {
    background: 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: 8,
    padding: '10px 14px', margin: '0 0 20px', fontSize: 13
  },
  error: {
    background: 'var(--danger-soft)', color: 'var(--danger)', border: '1px solid var(--danger-border)',
    padding: '11px 12px', borderRadius: 7, marginBottom: 18, fontSize: 14
  },
  success: {
    background: 'var(--success-soft)', color: 'var(--success-text)', border: '1px solid var(--success-border)',
    padding: '11px 12px', borderRadius: 7, marginBottom: 18, fontSize: 14
  },
  primary: {
    width: '100%', padding: 14, background: 'var(--primary)', color: 'var(--text-on-primary)',
    border: 'none', borderRadius: 7, fontSize: 16, fontWeight: 'bold'
  },
  logoutRow: { display: 'flex', justifyContent: 'center', marginTop: 18 },
  textBtn: {
    background: 'transparent', border: 'none', color: 'var(--primary-text)', fontSize: 14,
    fontWeight: 500, cursor: 'pointer', display: 'flex',
    alignItems: 'center', gap: 6, padding: 4
  }
}

function PasswordField({ id, label, value, onChange, autoComplete }) {
  const [visible, setVisible] = useState(false)

  return (
    <div style={styles.fieldWrap}>
      <label htmlFor={id} style={styles.label}>{label}</label>
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required
        style={styles.input}
        onFocus={(e) => {
          e.target.style.borderColor = 'var(--primary)'
          e.target.style.boxShadow = '0 0 0 3px var(--focus-ring)'
        }}
        onBlur={(e) => {
          e.target.style.borderColor = 'var(--input-border)'
          e.target.style.boxShadow = 'none'
        }}
      />
      <button
        type="button"
        onClick={() => setVisible(!visible)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        style={styles.eye}
      >
        {visible ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
      </button>
    </div>
  )
}

function Rule({ ok, text }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0',
      color: ok ? 'var(--success-text)' : 'var(--text-muted)', fontWeight: ok ? 600 : 400
    }}>
      {ok ? <FaCheckCircle size={13} /> : <FaRegCircle size={13} />}
      <span>{text}</span>
    </div>
  )
}

// embedded: render only the page content, for routes that already sit
// inside DashboardLayout (the patient route), so there is no second sidebar.
export default function ChangePassword({ embedded = false }) {
  const navigate = useNavigate()
  const user = readUser()
  const token = localStorage.getItem('medirescue_token')

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)

  if (!token || !user) {
    return <Navigate to="/login" replace />
  }

  const forced = Boolean(user.must_change_password)
  const dashboard = DASHBOARDS[user.role] || '/'

  const lengthOk = newPassword.length >= 8 && newPassword.length <= 72
  const differentOk = newPassword.length > 0 && newPassword !== currentPassword
  const matchOk = newPassword.length > 0 && newPassword === confirmPassword
  const canSubmit = lengthOk && differentOk && matchOk && currentPassword.length > 0

  const handleLogout = () => {
    localStorage.removeItem('medirescue_token')
    localStorage.removeItem('medirescue_user')
    navigate('/login', { replace: true })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!canSubmit) {
      setError('Please meet all the password requirements first')
      return
    }

    setSaving(true)

    try {
      const res = await fetch(`${API_BASE}/api/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword
        })
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        setError(data.error || 'Could not change password')
        setSaving(false)
        return
      }

      // The old token is no longer valid, so store the new one.
      if (data.token) localStorage.setItem('medirescue_token', data.token)
      localStorage.setItem(
        'medirescue_user',
        JSON.stringify({ ...user, must_change_password: false })
      )

      if (forced) {
        navigate(dashboard, { replace: true })
        return
      }

      // Voluntary change: stay on the page and confirm.
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setSuccess('Your password has been changed.')
      setSaving(false)
    } catch {
      setError('Could not reach the server. Please try again.')
      setSaving(false)
    }
  }

  const disabled = saving || !canSubmit

  const form = (
    <form onSubmit={handleSubmit} style={forced ? styles.card : styles.cardInline}>
      {forced && (
        <>
          <div style={styles.brand}>MediRescue</div>
          <div style={styles.badge}><FaLock size={22} /></div>
          <h2 style={styles.title}>Set your password</h2>
          <p style={styles.subtitle}>
            Your account was set up with a temporary password.
            Choose your own password to continue.
          </p>
        </>
      )}

      {error && <div role="alert" style={styles.error}>{error}</div>}
      {success && <div role="status" style={styles.success}>{success}</div>}

      <PasswordField
        id="current-password"
        label={forced ? 'Temporary password' : 'Current password'}
        value={currentPassword}
        onChange={setCurrentPassword}
        autoComplete="current-password"
      />

      <PasswordField
        id="new-password"
        label="New password"
        value={newPassword}
        onChange={setNewPassword}
        autoComplete="new-password"
      />

      <PasswordField
        id="confirm-password"
        label="Confirm new password"
        value={confirmPassword}
        onChange={setConfirmPassword}
        autoComplete="new-password"
      />

      <div style={styles.rules}>
        <Rule ok={lengthOk} text="8 to 72 characters" />
        <Rule ok={differentOk} text="Different from your current password" />
        <Rule ok={matchOk} text="Both new passwords match" />
      </div>

      <button
        type="submit"
        disabled={disabled}
        style={{
          ...styles.primary,
          opacity: disabled ? 0.55 : 1,
          cursor: disabled ? 'not-allowed' : 'pointer'
        }}
      >
        {saving ? 'Saving...' : 'Save password'}
      </button>

      {forced && (
        <div style={styles.logoutRow}>
          <button type="button" onClick={handleLogout} style={styles.textBtn}>
            <FaSignOutAlt size={13} /> Log out
          </button>
        </div>
      )}
    </form>
  )

  // First login or admin reset: focused page, no sidebar, no way around it.
  if (forced) {
    return <div style={styles.forcedPage}>{form}</div>
  }

  const content = (
    <div style={styles.mainInner}>
      <p style={styles.eyebrow}>ACCOUNT SECURITY</p>
      <h1 style={styles.pageTitle}>Change Password</h1>
      <p style={styles.pageSub}>
        Enter your current password, then choose a new one.
      </p>
      {form}
    </div>
  )

  // Inside DashboardLayout (patient route): the layout already has the sidebar.
  if (embedded) {
    return <div style={{ padding: '50px 24px' }}>{content}</div>
  }

  // Staff, admin and driver: shown with the sidebar.
  return (
    <div style={styles.shell}>
      <Sidebar />
      <main style={styles.main}>{content}</main>
    </div>
  )
}