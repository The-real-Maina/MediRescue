import { useCallback, useEffect, useState } from 'react'

const API = 'http://localhost:5000/api/hospital-admin'

const blankForm = {
  account_type: 'hospital_staff',
  name: '',
  email: '',
  password: ''
}

const styles = {
  page: {
    fontFamily: "'Segoe UI', Arial, sans-serif",
    color: '#10243a',
    maxWidth: 1100
  },
  card: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: 14,
    padding: 20,
    marginBottom: 20
  },
  heading: { fontSize: 22, fontWeight: 800, margin: '0 0 4px' },
  sub: { color: '#64748b', fontSize: 13, margin: 0, lineHeight: 1.5 },
  sectionTitle: { fontSize: 15, fontWeight: 800, margin: '0 0 14px' },
  label: {
    display: 'block',
    fontSize: 12,
    fontWeight: 700,
    color: '#334155',
    marginBottom: 6
  },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    border: '1px solid #cbd5e1',
    borderRadius: 8,
    padding: '10px 12px',
    fontSize: 14,
    color: '#10243a',
    background: '#ffffff'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
    gap: 14
  },
  th: {
    textAlign: 'left',
    fontSize: 11,
    letterSpacing: 0.8,
    color: '#64748b',
    padding: '8px 10px',
    borderBottom: '1px solid #e2e8f0',
    whiteSpace: 'nowrap'
  },
  td: {
    padding: '10px',
    fontSize: 13,
    borderBottom: '1px solid #f1f5f9',
    verticalAlign: 'middle'
  }
}

function button(color, disabled) {
  return {
    border: 'none',
    background: color,
    color: '#ffffff',
    borderRadius: 8,
    padding: '9px 14px',
    fontSize: 13,
    fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1
  }
}

async function api(path, options = {}) {
  const token = localStorage.getItem('medirescue_token')

  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {})
    }
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.error || 'Request failed')
  }

  return data
}

function Banner({ kind, children }) {
  const isError = kind === 'error'

  return (
    <div
      role={isError ? 'alert' : 'status'}
      style={{
        background: isError ? '#fef2f2' : '#f0fdf4',
        color: isError ? '#b91c1c' : '#166534',
        border: `1px solid ${isError ? '#fecaca' : '#bbf7d0'}`,
        padding: 13,
        borderRadius: 9,
        marginBottom: 18,
        fontSize: 13
      }}
    >
      {children}
    </div>
  )
}

function Badge({ children, bg, color }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '3px 9px',
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 800,
        background: bg,
        color,
        marginRight: 6
      }}
    >
      {children}
    </span>
  )
}

export default function HospitalAdminTeam() {
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [form, setForm] = useState({ ...blankForm })
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const [resetTarget, setResetTarget] = useState(null)
  const [resetPassword, setResetPassword] = useState('')
  const [resetConfirm, setResetConfirm] = useState('')
  const [resetError, setResetError] = useState('')
  const [resetting, setResetting] = useState(false)

  const [releaseTarget, setReleaseTarget] = useState(null)
  const [releaseError, setReleaseError] = useState('')
  const [acting, setActing] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await api('/accounts')
      setAccounts(data.accounts)
      setError('')
    } catch (err) {
      setError(err.message || 'Could not load your team')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const activeCount = accounts.filter((a) => Number(a.is_active) === 1).length
  const releasedCount = accounts.length - activeCount

  function closePanels() {
    setResetTarget(null)
    setResetPassword('')
    setResetConfirm('')
    setResetError('')
    setReleaseTarget(null)
    setReleaseError('')
  }

  async function handleCreate(event) {
    event.preventDefault()
    if (saving) return

    setFormError('')
    setSuccess('')

    const name = form.name.trim()
    const email = form.email.trim().toLowerCase()

    if (!name || !email || !form.password) {
      setFormError('Please complete all fields')
      return
    }

    if (form.password.length < 8 || form.password.length > 72) {
      setFormError('Password must contain 8 to 72 characters')
      return
    }

    setSaving(true)

    try {
      const result = await api('/accounts', {
        method: 'POST',
        body: JSON.stringify({
          account_type: form.account_type,
          name,
          email,
          password: form.password
        })
      })

      setSuccess(result.message || 'Account created')
      setForm({ ...blankForm, account_type: form.account_type })
      await load()
    } catch (err) {
      setFormError(err.message || 'Failed to create account')
    } finally {
      setSaving(false)
    }
  }

  async function handleReset(event) {
    event.preventDefault()
    if (resetting || !resetTarget) return

    setResetError('')
    setSuccess('')

    if (resetPassword.length < 8 || resetPassword.length > 72) {
      setResetError('Password must contain 8 to 72 characters')
      return
    }

    if (resetPassword !== resetConfirm) {
      setResetError('The two passwords do not match')
      return
    }

    setResetting(true)

    try {
      const result = await api(`/accounts/${resetTarget.id}/password`, {
        method: 'POST',
        body: JSON.stringify({ password: resetPassword })
      })

      setSuccess(result.message || 'Password reset')
      closePanels()
    } catch (err) {
      setResetError(err.message || 'Failed to reset password')
    } finally {
      setResetting(false)
    }
  }

  async function handleRelease() {
    if (acting || !releaseTarget) return

    setActing(true)
    setReleaseError('')
    setSuccess('')

    try {
      const result = await api(`/accounts/${releaseTarget.id}/deactivate`, {
        method: 'POST'
      })

      setSuccess(result.message || 'Account released')
      closePanels()
      await load()
    } catch (err) {
      setReleaseError(err.message || 'Failed to release account')
    } finally {
      setActing(false)
    }
  }

  async function handleReactivate(person) {
    if (acting) return

    closePanels()
    setActing(true)
    setSuccess('')
    setError('')

    try {
      const result = await api(`/accounts/${person.id}/reactivate`, {
        method: 'POST'
      })

      setSuccess(result.message || 'Account reactivated')
      await load()
    } catch (err) {
      setError(err.message || 'Failed to reactivate account')
    } finally {
      setActing(false)
    }
  }

  return (
    <div style={styles.page}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={styles.heading}>Team Accounts</h1>
        <p style={styles.sub}>
          Add staff and drivers for your hospital, release people who leave,
          and reset passwords. {activeCount} active, {releasedCount} released.
        </p>
      </div>

      {success && <Banner kind="success">{success}</Banner>}
      {error && <Banner kind="error">{error}</Banner>}

      {/* ADD ACCOUNT */}
      <div style={styles.card}>
        <h2 style={styles.sectionTitle}>Add a team member</h2>

        {formError && <Banner kind="error">{formError}</Banner>}

        <form onSubmit={handleCreate}>
          <div style={styles.grid}>
            <div>
              <label htmlFor="ha-type" style={styles.label}>
                Account type
              </label>
              <select
                id="ha-type"
                value={form.account_type}
                onChange={(e) =>
                  setForm((f) => ({ ...f, account_type: e.target.value }))
                }
                style={styles.input}
              >
                <option value="hospital_staff">Hospital Staff</option>
                <option value="driver">Ambulance Driver</option>
              </select>
            </div>

            <div>
              <label htmlFor="ha-name" style={styles.label}>
                Full name
              </label>
              <input
                id="ha-name"
                value={form.name}
                maxLength={100}
                placeholder="e.g. Mary Wanjiku"
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                style={styles.input}
                required
              />
            </div>

            <div>
              <label htmlFor="ha-email" style={styles.label}>
                Email address
              </label>
              <input
                id="ha-email"
                type="email"
                value={form.email}
                maxLength={100}
                placeholder="mary@hospital.co.ke"
                onChange={(e) =>
                  setForm((f) => ({ ...f, email: e.target.value }))
                }
                style={styles.input}
                required
              />
            </div>

            <div>
              <label htmlFor="ha-password" style={styles.label}>
                Starting password
              </label>
              <input
                id="ha-password"
                type="password"
                value={form.password}
                minLength={8}
                maxLength={72}
                autoComplete="new-password"
                placeholder="8–72 characters"
                onChange={(e) =>
                  setForm((f) => ({ ...f, password: e.target.value }))
                }
                style={styles.input}
                required
              />
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <button type="submit" disabled={saving} style={button('#dc2626', saving)}>
              {saving
                ? 'Creating...'
                : form.account_type === 'driver'
                  ? '+ Add Driver'
                  : '+ Add Hospital Staff'}
            </button>
          </div>
        </form>
      </div>

      {/* RESET PASSWORD PANEL */}
      {resetTarget && (
        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>
            Reset password: {resetTarget.name || resetTarget.email}
          </h2>
          <p style={{ ...styles.sub, marginBottom: 14 }}>
            Set a new password for {resetTarget.email} and share it with them
            securely.
          </p>

          {resetError && <Banner kind="error">{resetError}</Banner>}

          <form onSubmit={handleReset}>
            <div style={styles.grid}>
              <div>
                <label htmlFor="ha-reset-pw" style={styles.label}>
                  New password
                </label>
                <input
                  id="ha-reset-pw"
                  type="password"
                  value={resetPassword}
                  minLength={8}
                  maxLength={72}
                  autoComplete="new-password"
                  onChange={(e) => setResetPassword(e.target.value)}
                  style={styles.input}
                  required
                />
              </div>

              <div>
                <label htmlFor="ha-reset-confirm" style={styles.label}>
                  Confirm new password
                </label>
                <input
                  id="ha-reset-confirm"
                  type="password"
                  value={resetConfirm}
                  minLength={8}
                  maxLength={72}
                  autoComplete="new-password"
                  onChange={(e) => setResetConfirm(e.target.value)}
                  style={styles.input}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button type="submit" disabled={resetting} style={button('#b45309', resetting)}>
                {resetting ? 'Saving...' : 'Reset Password'}
              </button>
              <button
                type="button"
                disabled={resetting}
                onClick={closePanels}
                style={button('#64748b', resetting)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* RELEASE CONFIRMATION */}
      {releaseTarget && (
        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>
            Release {releaseTarget.name || releaseTarget.email}?
          </h2>
          <p style={{ ...styles.sub, marginBottom: 14 }}>
            They will lose access immediately, even if they are logged in right
            now, and their upcoming shifts will be removed.
            {releaseTarget.role === 'driver' && releaseTarget.ambulance_id
              ? ' They will also be unassigned from their ambulance, so you will need to assign another driver to it.'
              : ''}{' '}
            You can reactivate the account later.
          </p>

          {releaseError && <Banner kind="error">{releaseError}</Banner>}

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" disabled={acting} onClick={handleRelease} style={button('#b45309', acting)}>
              {acting ? 'Working...' : 'Yes, release'}
            </button>
            <button type="button" disabled={acting} onClick={closePanels} style={button('#64748b', acting)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ACCOUNTS TABLE */}
      <div style={styles.card}>
        <h2 style={styles.sectionTitle}>Your team ({accounts.length})</h2>

        {loading ? (
          <p style={styles.sub}>Loading team...</p>
        ) : accounts.length === 0 ? (
          <p style={styles.sub}>No staff or drivers yet. Add the first one above.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={styles.th}>NAME</th>
                  <th style={styles.th}>ROLE</th>
                  <th style={styles.th}>AMBULANCE</th>
                  <th style={styles.th}>ACTIONS</th>
                </tr>
              </thead>

              <tbody>
                {accounts.map((person) => {
                  const inactive = Number(person.is_active) === 0

                  return (
                    <tr key={person.id} style={inactive ? { opacity: 0.65 } : undefined}>
                      <td style={styles.td}>
                        <div style={{ fontWeight: 700 }}>
                          {person.name || person.email}
                        </div>
                        <div style={{ color: '#64748b', fontSize: 11 }}>
                          {person.email}
                        </div>
                      </td>

                      <td style={styles.td}>
                        {person.role === 'driver' ? (
                          <Badge bg="#fff1f2" color="#be123c">Driver</Badge>
                        ) : (
                          <Badge bg="#eaf2ff" color="#1d4ed8">Hospital Staff</Badge>
                        )}
                        {inactive && (
                          <Badge bg="#e2e8f0" color="#475569">Released</Badge>
                        )}
                      </td>

                      <td style={styles.td}>
                        {person.role === 'driver' && person.ambulance_id
                          ? person.plate_number || `#${person.ambulance_id}`
                          : '-'}
                      </td>

                      <td style={styles.td}>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            style={button('#b45309', false)}
                            onClick={() => {
                              closePanels()
                              setSuccess('')
                              setResetTarget(person)
                            }}
                          >
                            Reset Password
                          </button>

                          {inactive ? (
                            <button
                              type="button"
                              disabled={acting}
                              style={button('#047857', acting)}
                              onClick={() => handleReactivate(person)}
                            >
                              Reactivate
                            </button>
                          ) : (
                            <button
                              type="button"
                              style={button('#64748b', false)}
                              onClick={() => {
                                closePanels()
                                setSuccess('')
                                setReleaseTarget(person)
                              }}
                            >
                              Release
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}