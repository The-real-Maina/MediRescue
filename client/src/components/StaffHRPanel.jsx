
import { useCallback, useEffect, useState } from 'react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const HR_API = `${API}/team-member`

const colors = {
  navy: '#10243a',
  red: '#dc2626',
  text: '#17233b',
  muted: '#64748b',
  border: '#e2e8f0',
  background: '#f8fafc',
  green: '#047857'
}

const cardStyle = {
  background: '#fff',
  border: `1px solid ${colors.border}`,
  borderRadius: 13,
  padding: 20
}

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  padding: 11,
  border: '1px solid #cbd5e1',
  borderRadius: 8,
  fontSize: 14,
  background: '#fff'
}

const primaryButton = {
  background: colors.red,
  color: '#fff',
  border: 0,
  borderRadius: 8,
  padding: '11px 15px',
  fontWeight: 700,
  cursor: 'pointer'
}

const secondaryButton = {
  background: '#fff',
  color: colors.navy,
  border: `1px solid ${colors.border}`,
  borderRadius: 8,
  padding: '9px 12px',
  fontWeight: 700,
  cursor: 'pointer'
}

function rowsFrom(data, ...keys) {
  if (Array.isArray(data)) return data

  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key]
  }

  return []
}

function formatDate(value) {
  if (!value) return '—'
  return String(value).slice(0, 10)
}

function pretty(value) {
  return String(value || 'unknown')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, letter => letter.toUpperCase())
}

function Status({ value }) {
  const status = String(value || 'unknown').toLowerCase()

  const palette = {
    approved: ['#dcfce7', '#166534'],
    excused: ['#dcfce7', '#166534'],
    pending: ['#fef3c7', '#92400e'],
    reported: ['#dbeafe', '#1d4ed8'],
    rejected: ['#fee2e2', '#b91c1c'],
    unexcused: ['#fee2e2', '#b91c1c'],
    cancelled: ['#f1f5f9', '#475569']
  }

  const [background, color] = palette[status] || ['#f1f5f9', '#475569']

  return (
    <span style={{
      display: 'inline-block',
      padding: '5px 10px',
      borderRadius: 30,
      background,
      color,
      fontSize: 12,
      fontWeight: 800
    }}>
      {pretty(status)}
    </span>
  )
}

export default function StaffHRPanel() {
  const [section, setSection] = useState('shifts')
  const [shifts, setShifts] = useState([])
  const [approvedLeave, setApprovedLeave] = useState([])
  const [leaveRequests, setLeaveRequests] = useState([])
  const [absences, setAbsences] = useState([])
  const [announcements, setAnnouncements] = useState([])

  const [leaveType, setLeaveType] = useState('annual')
  const [leaveStart, setLeaveStart] = useState('')
  const [leaveEnd, setLeaveEnd] = useState('')
  const [leaveReason, setLeaveReason] = useState('')

  const [absenceDate, setAbsenceDate] = useState(
    new Date().toLocaleDateString('en-CA')
  )
  const [absenceReason, setAbsenceReason] = useState('')

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const request = useCallback(async (path, options = {}) => {
    const token = localStorage.getItem('medirescue_token')

    if (!token) throw new Error('Your session has expired. Please log in again.')

    const response = await fetch(`${HR_API}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options.headers
      }
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      throw new Error(data.error || data.message || 'The request failed.')
    }

    return data
  }, [])

  const loadSection = useCallback(async (target = section) => {
    setLoading(true)
    setError('')

    try {
      if (target === 'shifts') {
        const data = await request('/shifts')
        setShifts(rowsFrom(data, 'shifts', 'data'))
        setApprovedLeave(
          rowsFrom(data, 'approvedLeave', 'approved_leave', 'leave')
        )
      }

      if (target === 'leave') {
        const data = await request('/leave')
        setLeaveRequests(rowsFrom(data, 'requests', 'leaveRequests', 'leave', 'data'))
      }

      if (target === 'absences') {
        const data = await request('/absences')
        setAbsences(rowsFrom(data, 'absences', 'reports', 'data'))
      }

      if (target === 'announcements') {
        const data = await request('/announcements')
        setAnnouncements(rowsFrom(data, 'announcements', 'data'))
      }
    } catch (err) {
      setError(err.message || 'Unable to load HR information.')
    } finally {
      setLoading(false)
    }
  }, [request, section])

  useEffect(() => {
    loadSection(section)
  }, [section, loadSection])

  const submitLeave = async event => {
    event.preventDefault()
    setError('')
    setMessage('')

    if (!leaveStart || !leaveEnd) {
      setError('Select both the start and end dates.')
      return
    }

    if (leaveEnd < leaveStart) {
      setError('The end date cannot be before the start date.')
      return
    }

    setSaving(true)

    try {
      await request('/leave', {
        method: 'POST',
        body: JSON.stringify({
          leave_type: leaveType,
          start_date: leaveStart,
          end_date: leaveEnd,
          reason: leaveReason.trim()
        })
      })

      setMessage('Leave request submitted successfully.')
      setLeaveStart('')
      setLeaveEnd('')
      setLeaveReason('')
      setSection('leave')
      await loadSection('leave')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const cancelLeave = async id => {
    if (!window.confirm('Cancel this pending leave request?')) return

    setError('')
    setMessage('')
    setSaving(true)

    try {
      await request(`/leave/${id}/cancel`, { method: 'POST' })
      setMessage('Leave request cancelled.')
      await loadSection('leave')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const submitAbsence = async event => {
    event.preventDefault()
    setError('')
    setMessage('')

    if (!absenceDate || !absenceReason.trim()) {
      setError('Enter the absence date and reason.')
      return
    }

    setSaving(true)

    try {
      await request('/absences', {
        method: 'POST',
        body: JSON.stringify({
          absence_date: absenceDate,
          reason: absenceReason.trim()
        })
      })

      setMessage('Absence report submitted successfully.')
      setAbsenceReason('')
      setSection('absences')
      await loadSection('absences')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const tabs = [
    { id: 'shifts', label: 'My Shifts' },
    { id: 'leave', label: 'Leave Requests' },
    { id: 'request', label: 'Request Leave' },
    { id: 'absences', label: 'My Absences' },
    { id: 'report', label: 'Report Absence' },
    { id: 'announcements', label: 'Announcements' }
  ]

  return (
    <section style={{ marginTop: 30 }}>
      <div style={{
        ...cardStyle,
        padding: 0,
        overflow: 'hidden'
      }}>
        <div style={{
          background: colors.navy,
          color: '#fff',
          padding: '23px 24px'
        }}>
          <p style={{
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: 1.5,
            margin: '0 0 8px',
            color: '#fca5a5'
          }}>
            STAFF SERVICES
          </p>

          <h2 style={{ margin: 0, fontSize: 24 }}>
            My Shifts & HR
          </h2>

          <p style={{
            margin: '8px 0 0',
            color: '#cbd5e1',
            fontSize: 14,
            lineHeight: 1.6
          }}>
            View your schedule, manage leave, report absences and read hospital notices.
          </p>
        </div>

        <div style={{
          display: 'flex',
          gap: 8,
          padding: 15,
          flexWrap: 'wrap',
          borderBottom: `1px solid ${colors.border}`
        }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setError('')
                setMessage('')
                setSection(tab.id)
              }}
              style={{
                ...secondaryButton,
                background: section === tab.id ? colors.navy : '#fff',
                color: section === tab.id ? '#fff' : colors.navy,
                borderColor: section === tab.id ? colors.navy : colors.border
              }}
            >
              {tab.label}
            </button>
          ))}

          <button
            type="button"
            onClick={() => loadSection(section)}
            style={{ ...secondaryButton, marginLeft: 'auto' }}
          >
            ↻ Refresh
          </button>
        </div>

        <div style={{ padding: 22 }}>
          {error && (
            <div role="alert" style={{
              padding: 13,
              borderRadius: 8,
              background: '#fff1f2',
              color: '#be123c',
              marginBottom: 16
            }}>
              {error}
            </div>
          )}

          {message && (
            <div role="status" style={{
              padding: 13,
              borderRadius: 8,
              background: '#ecfdf5',
              color: colors.green,
              marginBottom: 16
            }}>
              {message}
            </div>
          )}

          {loading && (
            <p style={{ color: colors.muted }}>Loading your information...</p>
          )}

          {!loading && section === 'shifts' && (
            <>
              <h3 style={{ color: colors.navy, marginTop: 0 }}>Assigned Shifts</h3>

              {shifts.length === 0 ? (
                <p style={{ color: colors.muted }}>No shifts found for the period returned by the server.</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: 14
                  }}>
                    <thead>
                      <tr>
                        {['Date', 'Shift', 'Hospital'].map(label => (
                          <th key={label} style={{
                            textAlign: 'left',
                            padding: 11,
                            borderBottom: `1px solid ${colors.border}`,
                            color: colors.muted
                          }}>
                            {label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {shifts.map((shift, index) => (
                        <tr key={shift.id || `${shift.shift_date}-${index}`}>
                          <td style={{ padding: 11, borderBottom: `1px solid ${colors.border}` }}>
                            {formatDate(shift.shift_date || shift.date)}
                          </td>
                          <td style={{ padding: 11, borderBottom: `1px solid ${colors.border}` }}>
                            <Status value={shift.shift_type || shift.shift} />
                          </td>
                          <td style={{ padding: 11, borderBottom: `1px solid ${colors.border}` }}>
                            {shift.hospital_name || shift.hospital || 'Your hospital'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <h3 style={{ color: colors.navy, marginTop: 28 }}>Approved Leave</h3>

              {approvedLeave.length === 0 ? (
                <p style={{ color: colors.muted }}>No approved leave records were returned.</p>
              ) : (
                approvedLeave.map((item, index) => (
                  <div key={item.id || index} style={{ ...cardStyle, marginBottom: 10 }}>
                    <strong>{pretty(item.leave_type || 'leave')}</strong>
                    <p style={{ margin: '8px 0', color: colors.muted }}>
                      {formatDate(item.start_date)} to {formatDate(item.end_date)}
                    </p>
                    <Status value={item.status || 'approved'} />
                  </div>
                ))
              )}
            </>
          )}

          {!loading && section === 'leave' && (
            <>
              <h3 style={{ color: colors.navy, marginTop: 0 }}>My Leave Requests</h3>

              {leaveRequests.length === 0 ? (
                <p style={{ color: colors.muted }}>You have not submitted any leave requests yet.</p>
              ) : (
                <div style={{ display: 'grid', gap: 12 }}>
                  {leaveRequests.map((item, index) => (
                    <article key={item.id || index} style={cardStyle}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 12,
                        flexWrap: 'wrap'
                      }}>
                        <strong>{pretty(item.leave_type)}</strong>
                        <Status value={item.status} />
                      </div>

                      <p style={{ color: colors.muted, marginBottom: 8 }}>
                        {formatDate(item.start_date)} to {formatDate(item.end_date)}
                      </p>

                      {item.reason && <p>Reason: {item.reason}</p>}

                      {item.review_note && (
                        <p style={{
                          background: colors.background,
                          borderRadius: 8,
                          padding: 12,
                          marginBottom: 0
                        }}>
                          <strong>Admin's note:</strong> {item.review_note}
                        </p>
                      )}

                      {item.status === 'pending' && (
                        <button
                          type="button"
                          style={{ ...secondaryButton, marginTop: 12 }}
                          disabled={saving}
                          onClick={() => cancelLeave(item.id)}
                        >
                          Cancel Request
                        </button>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </>
          )}

          {!loading && section === 'request' && (
            <>
              <h3 style={{ color: colors.navy, marginTop: 0 }}>Request Leave</h3>
              <p style={{ color: colors.muted, lineHeight: 1.6 }}>
                Your request will be sent to your Hospital Admin for review.
              </p>

              <form onSubmit={submitLeave} style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 15
              }}>
                <label>
                  <span style={{ display: 'block', marginBottom: 7 }}>Leave type</span>
                  <select
                    value={leaveType}
                    onChange={event => setLeaveType(event.target.value)}
                    style={inputStyle}
                  >
                    <option value="annual">Annual leave</option>
                    <option value="sick">Sick leave</option>
                    <option value="emergency">Emergency leave</option>
                    <option value="other">Other</option>
                  </select>
                </label>

                <label>
                  <span style={{ display: 'block', marginBottom: 7 }}>Start date</span>
                  <input
                    type="date"
                    value={leaveStart}
                    onChange={event => setLeaveStart(event.target.value)}
                    style={inputStyle}
                    required
                  />
                </label>

                <label>
                  <span style={{ display: 'block', marginBottom: 7 }}>End date</span>
                  <input
                    type="date"
                    value={leaveEnd}
                    min={leaveStart || undefined}
                    onChange={event => setLeaveEnd(event.target.value)}
                    style={inputStyle}
                    required
                  />
                </label>

                <label style={{ gridColumn: '1 / -1' }}>
                  <span style={{ display: 'block', marginBottom: 7 }}>Reason</span>
                  <textarea
                    value={leaveReason}
                    onChange={event => setLeaveReason(event.target.value)}
                    maxLength={500}
                    rows={3}
                    placeholder="Explain why you need leave..."
                    style={{ ...inputStyle, resize: 'vertical' }}
                  />
                </label>

                <div>
                  <button type="submit" disabled={saving} style={primaryButton}>
                    {saving ? 'Submitting...' : 'Submit Leave Request'}
                  </button>
                </div>
              </form>
            </>
          )}

          {!loading && section === 'absences' && (
            <>
              <h3 style={{ color: colors.navy, marginTop: 0 }}>My Absence Reports</h3>

              {absences.length === 0 ? (
                <p style={{ color: colors.muted }}>You have not submitted any absence reports.</p>
              ) : (
                <div style={{ display: 'grid', gap: 12 }}>
                  {absences.map((item, index) => (
                    <article key={item.id || index} style={cardStyle}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 12,
                        flexWrap: 'wrap'
                      }}>
                        <strong>{formatDate(item.absence_date)}</strong>
                        <Status value={item.status} />
                      </div>

                      <p style={{ marginBottom: 0 }}>{item.reason}</p>

                      {item.review_note && (
                        <p style={{ color: colors.muted }}>
                          Review note: {item.review_note}
                        </p>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </>
          )}

          {!loading && section === 'report' && (
            <>
              <h3 style={{ color: colors.navy, marginTop: 0 }}>Report an Absence</h3>
              <p style={{ color: colors.muted, lineHeight: 1.6 }}>
                Submit an honest report explaining why you missed a shift.
              </p>

              <form onSubmit={submitAbsence} style={{
                display: 'grid',
                gap: 15,
                maxWidth: 650
              }}>
                <label>
                  <span style={{ display: 'block', marginBottom: 7 }}>Absence date</span>
                  <input
                    type="date"
                    value={absenceDate}
                    onChange={event => setAbsenceDate(event.target.value)}
                    style={inputStyle}
                    required
                  />
                </label>

                <label>
                  <span style={{ display: 'block', marginBottom: 7 }}>Reason</span>
                  <textarea
                    value={absenceReason}
                    onChange={event => setAbsenceReason(event.target.value)}
                    maxLength={500}
                    rows={4}
                    placeholder="Explain the reason for your absence..."
                    style={{ ...inputStyle, resize: 'vertical' }}
                    required
                  />
                </label>

                <div>
                  <button type="submit" disabled={saving} style={primaryButton}>
                    {saving ? 'Submitting...' : 'Submit Absence Report'}
                  </button>
                </div>
              </form>
            </>
          )}

          {!loading && section === 'announcements' && (
            <>
              <h3 style={{ color: colors.navy, marginTop: 0 }}>Hospital Announcements</h3>

              {announcements.length === 0 ? (
                <p style={{ color: colors.muted }}>There are no announcements available.</p>
              ) : (
                <div style={{ display: 'grid', gap: 12 }}>
                  {announcements.map((item, index) => (
                    <article key={item.id || index} style={cardStyle}>
                      <h4 style={{ color: colors.navy, margin: '0 0 8px' }}>
                        {item.title || 'Hospital announcement'}
                      </h4>

                      <p style={{ lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                        {item.message}
                      </p>

                      <p style={{ color: colors.muted, fontSize: 12, marginBottom: 0 }}>
                        {item.created_at ? new Date(item.created_at).toLocaleString() : ''}
                        {item.audience ? ` · ${pretty(item.audience)}` : ''}
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  )
}
