import { useCallback, useEffect, useMemo, useState } from 'react'
import PricingManager from '../components/PricingManager' 

const API = 'http://localhost:5000/api/hospital-admin'
const HR_API = `${API}/hr`

const styles = {
  page: { fontFamily: "'Segoe UI', Arial, sans-serif", color: '#10243a', maxWidth: 1200 },
  card: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 20, marginBottom: 20 },
  heading: { fontSize: 24, fontWeight: 800, margin: '0 0 5px' },
  sub: { color: '#64748b', fontSize: 13, margin: 0 },
  sectionTitle: { fontSize: 16, fontWeight: 800, margin: '0 0 14px' },
  th: { textAlign: 'left', fontSize: 11, letterSpacing: 0.5, color: '#64748b', padding: '10px', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' },
  td: { padding: 10, fontSize: 13, borderBottom: '1px solid #f1f5f9', verticalAlign: 'top' },
  input: { border: '1px solid #cbd5e1', borderRadius: 8, padding: '9px 11px', fontSize: 13, color: '#10243a', background: '#fff', maxWidth: '100%' },
  button: { border: '1px solid #cbd5e1', background: '#fff', color: '#334155', borderRadius: 8, padding: '9px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' },
  primary: { border: '1px solid #1d4ed8', background: '#1d4ed8', color: '#fff', borderRadius: 8, padding: '9px 13px', fontSize: 12, fontWeight: 700, cursor: 'pointer' },
  field: { display: 'grid', gap: 6, fontSize: 12, fontWeight: 700, color: '#475569' }
}

function formatDate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseDate(s) {
  const [y, m, d] = String(s).slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d)
}

function addDays(s, n) {
  const d = parseDate(s)
  d.setDate(d.getDate() + n)
  return formatDate(d)
}

function weekStart(s) {
  const d = parseDate(s)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return formatDate(d)
}

function dayLabel(s) {
  if (!s) return '—'
  return parseDate(s).toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
  })
}

function shortDate(s) {
  if (!s) return '—'
  return parseDate(s).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric'
  })
}

async function api(base, path, options = {}) {
  const token = localStorage.getItem('medirescue_token')
  const response = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || data.message || `Request failed (${response.status})`)
  return data
}

function getRows(data, ...keys) {
  if (Array.isArray(data)) return data
  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key]
  }
  return []
}

function ShiftBadge({ type }) {
  if (!type) return <span style={{ color: '#94a3b8' }}>—</span>
  const day = type === 'day'
  return (
    <span style={{
      display: 'inline-block', padding: '4px 9px', borderRadius: 20,
      fontSize: 11, fontWeight: 800,
      background: day ? '#fef3c7' : '#e0e7ff',
      color: day ? '#92400e' : '#3730a3'
    }}>
      {day ? 'Day' : 'Night'}
    </span>
  )
}

function StatusBadge({ status }) {
  const colors = {
    pending: ['#fef3c7', '#92400e'],
    reported: ['#fef3c7', '#92400e'],
    approved: ['#dcfce7', '#166534'],
    excused: ['#dcfce7', '#166534'],
    rejected: ['#fee2e2', '#991b1b'],
    unexcused: ['#fee2e2', '#991b1b'],
    cancelled: ['#f1f5f9', '#475569']
  }
  const [background, color] = colors[status] || ['#e2e8f0', '#334155']
  return (
    <span style={{
      display: 'inline-block', background, color, padding: '4px 8px',
      borderRadius: 20, fontSize: 11, fontWeight: 800
    }}>
      {String(status || 'unknown').replaceAll('_', ' ')}
    </span>
  )
}

function SummaryCard({ label, value, color = '#1d4ed8' }) {
  return (
    <div style={{
      flex: '1 1 145px', background: '#fff', border: '1px solid #e2e8f0',
      borderLeft: `4px solid ${color}`, borderRadius: 12, padding: '14px 16px'
    }}>
      <div style={{ fontSize: 25, fontWeight: 800 }}>{value}</div>
      <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>{label}</div>
    </div>
  )
}

function ActionButton({ children, onClick, disabled, color = '#1d4ed8' }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        border: `1px solid ${disabled ? '#cbd5e1' : color}`,
        background: disabled ? '#f1f5f9' : color,
        color: disabled ? '#94a3b8' : '#fff',
        borderRadius: 7, padding: '7px 10px', fontSize: 11,
        fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer'
      }}
    >
      {children}
    </button>
  )
}

const NAV = [
  ['overview', 'Overview'],
  ['shifts', 'Team & Shifts'],
  ['leave', 'Leave Requests'],
  ['absences', 'Absence Reports'],
  ['attendance', 'Attendance'],
  ['announcements', 'Announcements'],
  ['pricing', 'Pricing Management'] 
]

export default function HospitalAdminDashboard() {
  const today = formatDate(new Date())
  const monthStart = `${today.slice(0, 7)}-01`

  const [section, setSection] = useState('overview')
  const [hospital, setHospital] = useState(null)
  const [hospitalLoading, setHospitalLoading] = useState(true)
  const [date, setDate] = useState(today)
  const [team, setTeam] = useState([])
  const [shifts, setShifts] = useState([])
  const [leaveRequests, setLeaveRequests] = useState([])
  const [absences, setAbsences] = useState([])
  const [attendance, setAttendance] = useState([])
  const [announcements, setAnnouncements] = useState([])

  const [leaveFilter, setLeaveFilter] = useState('pending')
  const [absenceFilter, setAbsenceFilter] = useState('reported')
  const [from, setFrom] = useState(monthStart)
  const [to, setTo] = useState(today)

  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [audience, setAudience] = useState('all')
  const [reviewNotes, setReviewNotes] = useState({})

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const start = useMemo(() => weekStart(date), [date])
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(start, i)),
    [start]
  )

  const showError = (err) => {
    setNotice('')
    setError(err?.message || 'Something went wrong.')
  }

  const showSuccess = (text) => {
    setError('')
    setNotice(text)
  }

  const loadShifts = useCallback(async () => {
    const [teamData, shiftData] = await Promise.all([
      api(API, `/team?date=${date}`),
      api(API, `/shifts?from=${start}&to=${addDays(start, 6)}`)
    ])
    setTeam(getRows(teamData, 'team'))
    setShifts(getRows(shiftData, 'shifts'))
  }, [date, start])

  const loadLeave = useCallback(async () => {
    const data = await api(HR_API, `/leave?status=${leaveFilter}`)
    setLeaveRequests(getRows(data, 'requests', 'leaveRequests', 'leave'))
  }, [leaveFilter])

  const loadAbsences = useCallback(async () => {
    const data = await api(
      HR_API,
      `/absences?status=${absenceFilter}&from=${from}&to=${to}`
    )
    setAbsences(getRows(data, 'absences', 'reports', 'requests'))
  }, [absenceFilter, from, to])

  const loadAttendance = useCallback(async () => {
    const data = await api(HR_API, `/attendance?from=${from}&to=${to}`)
    setAttendance(getRows(data, 'attendance', 'records', 'rows'))
  }, [from, to])

  const loadAnnouncements = useCallback(async () => {
    const data = await api(HR_API, '/announcements')
    setAnnouncements(getRows(data, 'announcements'))
  }, [])

  const reloadCurrent = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      if (section === 'overview') {
        await Promise.all([loadShifts(), loadLeave(), loadAbsences(), loadAnnouncements()])
      }
      if (section === 'shifts') await loadShifts()
      if (section === 'leave') await loadLeave()
      if (section === 'absences') await loadAbsences()
      if (section === 'attendance') await loadAttendance()
      if (section === 'announcements') await loadAnnouncements()
    } catch (err) {
      showError(err)
    } finally {
      setLoading(false)
    }
  }, [
    section, loadShifts, loadLeave, loadAbsences,
    loadAttendance, loadAnnouncements
  ])

  useEffect(() => {
    let cancelled = false

    async function loadHospital() {
      setHospitalLoading(true)
      try {
        const data = await api(API, '/hospital')
        if (!cancelled) setHospital(data.hospital || data)
      } catch (err) {
        if (!cancelled) setHospital(null)
        console.error('Could not load hospital details:', err)
      } finally {
        if (!cancelled) setHospitalLoading(false)
      }
    }

    loadHospital()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    reloadCurrent()
  }, [reloadCurrent])

  const shiftLookup = useMemo(() => {
    const map = {}
    shifts.forEach((s) => {
      const shiftDate = String(s.shift_date).slice(0, 10)
      map[`${s.staff_id}|${shiftDate}`] = s.shift_type
    })
    return map
  }, [shifts])

  const dayCount = team.filter((p) => p.shift_type === 'day').length
  const nightCount = team.filter((p) => p.shift_type === 'night').length
  const unassignedCount = team.length - dayCount - nightCount

  async function saveShift(staffId, type) {
    setSaving(`shift-${staffId}`)
    setError('')
    setNotice('')
    try {
      if (type === null) {
        await api(API, `/shifts/${staffId}/${date}`, { method: 'DELETE' })
      } else {
        await api(API, '/shifts', {
          method: 'PUT',
          body: JSON.stringify({
            staff_id: staffId,
            shift_date: date,
            shift_type: type
          })
        })
      }
      await loadShifts()
      showSuccess('Shift updated successfully.')
    } catch (err) {
      showError(err)
    } finally {
      setSaving('')
    }
  }

  async function reviewLeave(id, decision) {
    setSaving(`leave-${id}`)
    setError('')
    setNotice('')
    const note = reviewNotes[`leave-${id}`] || ''

    try {
      await api(HR_API, `/leave/${id}/review`, {
        method: 'POST',
        body: JSON.stringify({
          status: decision,
          action: decision,
          decision,
          review_note: note,
          note
        })
      })
      await loadLeave()
      showSuccess(`Leave request ${decision}.`)
    } catch (err) {
      showError(err)
    } finally {
      setSaving('')
    }
  }

  async function reviewAbsence(id, decision) {
    setSaving(`absence-${id}`)
    setError('')
    setNotice('')
    const note = reviewNotes[`absence-${id}`] || ''

    try {
      await api(HR_API, `/absences/${id}/review`, {
        method: 'POST',
        body: JSON.stringify({
          status: decision,
          action: decision,
          decision,
          review_note: note,
          note
        })
      })
      await loadAbsences()
      showSuccess(`Absence marked ${decision}.`)
    } catch (err) {
      showError(err)
    } finally {
      setSaving('')
    }
  }

  async function createAnnouncement(e) {
    e.preventDefault()
    setSaving('announcement')
    setError('')
    setNotice('')

    try {
      await api(HR_API, '/announcements', {
        method: 'POST',
        body: JSON.stringify({ title, message, audience })
      })
      setTitle('')
      setMessage('')
      setAudience('all')
      await loadAnnouncements()
      showSuccess('Announcement published successfully.')
    } catch (err) {
      showError(err)
    } finally {
      setSaving('')
    }
  }

  async function deleteAnnouncement(id) {
    if (!window.confirm('Delete this announcement?')) return

    setSaving(`announcement-${id}`)
    setError('')
    setNotice('')
    try {
      await api(HR_API, `/announcements/${id}`, { method: 'DELETE' })
      await loadAnnouncements()
      showSuccess('Announcement deleted.')
    } catch (err) {
      showError(err)
    } finally {
      setSaving('')
    }
  }

  const navStyle = (active) => ({
    ...styles.button,
    background: active ? '#1d4ed8' : '#fff',
    color: active ? '#fff' : '#334155',
    borderColor: active ? '#1d4ed8' : '#cbd5e1',
    padding: '10px 14px',
    whiteSpace: 'nowrap'
  })

  const dateControls = (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginBottom: 18 }}>
      <label style={styles.field}>
        From
        <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} style={styles.input} />
      </label>
      <label style={styles.field}>
        To
        <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} style={styles.input} />
      </label>
      <button type="button" style={styles.button} onClick={reloadCurrent}>Refresh</button>
    </div>
  )

  return (
    <div style={styles.page}>
      <div style={{
        background: 'linear-gradient(135deg, #10243a 0%, #1d4ed8 100%)',
        color: '#fff', borderRadius: 16, padding: '24px 26px', marginBottom: 20
      }}>
        <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: '#bfdbfe' }}>
          Hospital Administration
        </p>
        <h1 style={{ margin: '0 0 8px', fontSize: 30, fontWeight: 900, lineHeight: 1.2 }}>
          {hospitalLoading ? 'Loading hospital...' : hospital?.name || 'Hospital name unavailable'}
        </h1>
        <p style={{ margin: 0, fontSize: 13, color: '#dbeafe' }}>
          {hospital?.location ? `${hospital.location} · ` : ''}Manage shifts, leave, attendance, absences and staff announcements.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {NAV.map(([key, label]) => (
          <button key={key} type="button" style={navStyle(section === key)} onClick={() => {
            setSection(key)
            setError('')
            setNotice('')
          }}>
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div role="alert" style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', padding: 13, borderRadius: 9, marginBottom: 18, fontSize: 13 }}>
          {error}
        </div>
      )}
      {notice && (
        <div role="status" style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', padding: 13, borderRadius: 9, marginBottom: 18, fontSize: 13 }}>
          {notice}
        </div>
      )}

      {loading && <p style={{ ...styles.sub, marginBottom: 15 }}>Loading information...</p>}

      {section === 'overview' && (
        <>
          <div style={{ ...styles.card, background: '#f8fafc' }}>
            <h2 style={{ ...styles.sectionTitle, fontSize: 19 }}>Hospital overview</h2>
            <p style={{ ...styles.sub, marginBottom: 16 }}>
              A quick view of staffing and pending HR matters for {hospital?.name || 'your hospital'}.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
              <SummaryCard label="Team members" value={team.length} color="#2563eb" />
              <SummaryCard label="Day shift" value={dayCount} color="#d97706" />
              <SummaryCard label="Night shift" value={nightCount} color="#4f46e5" />
              <SummaryCard label="Pending leave requests" value={leaveRequests.filter((item) => item.status === 'pending').length} color="#0d9488" />
              <SummaryCard label="Absences awaiting review" value={absences.filter((item) => item.status === 'reported').length} color="#dc2626" />
            </div>
          </div>

          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>Quick actions</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              <button type="button" style={styles.primary} onClick={() => setSection('shifts')}>Manage Team & Shifts</button>
              <button type="button" style={styles.button} onClick={() => setSection('leave')}>Review Leave Requests</button>
              <button type="button" style={styles.button} onClick={() => setSection('absences')}>Review Absence Reports</button>
              <button type="button" style={styles.button} onClick={() => setSection('attendance')}>View Attendance</button>
              <button type="button" style={styles.button} onClick={() => setSection('announcements')}>Publish Announcement</button>
            </div>
          </div>

          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>Administration at a glance</h2>
            <p style={{ ...styles.sub, lineHeight: 1.7 }}>
              Assign day and night shifts, review leave applications and absence reports, check scheduled days and approved leave, and share announcements with hospital staff and drivers. Shift assignment remains subject to the server's approved-leave checks.
            </p>
          </div>
        </>
      )}

      {section === 'shifts' && (
        <>
          <div style={{ ...styles.card, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
            <button type="button" style={styles.button} onClick={() => setDate(addDays(date, -1))}>← Previous day</button>
            <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} style={styles.input} />
            <button type="button" style={styles.button} onClick={() => setDate(addDays(date, 1))}>Next day →</button>
            <button type="button" style={styles.button} onClick={() => setDate(today)}>Today</button>
            <span style={{ color: '#64748b', fontSize: 13, marginLeft: 'auto' }}>{dayLabel(date)}</span>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginBottom: 20 }}>
            <SummaryCard label="On day shift" value={dayCount} color="#f59e0b" />
            <SummaryCard label="On night shift" value={nightCount} color="#6366f1" />
            <SummaryCard label="No shift assigned" value={unassignedCount} color="#94a3b8" />
          </div>

          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>Assign shifts for {dayLabel(date)}</h2>
            {!loading && team.length === 0 ? <p style={styles.sub}>No staff or drivers are linked to your hospital yet.</p> : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr>
                    <th style={styles.th}>NAME</th><th style={styles.th}>ROLE</th>
                    <th style={styles.th}>AMBULANCE</th><th style={styles.th}>CURRENT SHIFT</th>
                    <th style={styles.th}>ASSIGN</th>
                  </tr></thead>
                  <tbody>
                    {team.map((person) => {
                      const busy = saving === `shift-${person.id}`
                      return (
                        <tr key={person.id}>
                          <td style={styles.td}>
                            <strong>{person.name || person.email}</strong>
                            <div style={{ color: '#64748b', fontSize: 11 }}>{person.email}</div>
                          </td>
                          <td style={styles.td}>{person.role === 'driver' ? 'Driver' : 'Hospital Staff'}</td>
                          <td style={styles.td}>{person.role === 'driver' && person.ambulance_id ? `#${person.ambulance_id}` : '—'}</td>
                          <td style={styles.td}><ShiftBadge type={person.shift_type} /></td>
                          <td style={styles.td}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                              <ActionButton disabled={busy} color="#d97706" onClick={() => saveShift(person.id, 'day')}>Day</ActionButton>
                              <ActionButton disabled={busy} color="#4f46e5" onClick={() => saveShift(person.id, 'night')}>Night</ActionButton>
                              <ActionButton disabled={busy || !person.shift_type} color="#64748b" onClick={() => saveShift(person.id, null)}>Clear</ActionButton>
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

          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>Week overview</h2>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
              <button type="button" style={styles.button} onClick={() => setDate(addDays(start, -7))}>← Previous week</button>
              <button type="button" style={styles.button} onClick={() => setDate(addDays(start, 7))}>Next week →</button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>
                  <th style={styles.th}>NAME</th>
                  {weekDays.map((day) => <th key={day} style={{ ...styles.th, textAlign: 'center', cursor: 'pointer' }} onClick={() => setDate(day)}>{dayLabel(day)}</th>)}
                </tr></thead>
                <tbody>
                  {team.map((person) => (
                    <tr key={person.id}>
                      <td style={styles.td}><strong>{person.name || person.email}</strong><div style={styles.sub}>{person.role === 'driver' ? 'Driver' : 'Staff'}</div></td>
                      {weekDays.map((day) => <td key={day} style={{ ...styles.td, textAlign: 'center', background: day === date ? '#eff6ff' : '#fff' }}><ShiftBadge type={shiftLookup[`${person.id}|${day}`]} /></td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p style={{ ...styles.sub, marginTop: 12 }}>Select a date heading to assign shifts for that day. Approved leave is checked by the server when assigning a shift.</p>
          </div>
        </>
      )}

      {section === 'leave' && (
        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>Staff and Driver Leave Requests</h2>
          <div style={{ marginBottom: 16 }}>
            <label style={styles.field}>Request status
              <select value={leaveFilter} onChange={(e) => setLeaveFilter(e.target.value)} style={styles.input}>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="cancelled">Cancelled</option>
                <option value="all">All statuses</option>
              </select>
            </label>
          </div>
          {leaveRequests.length === 0 ? <p style={styles.sub}>No leave requests found for this filter.</p> : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>
                  <th style={styles.th}>EMPLOYEE</th><th style={styles.th}>TYPE</th><th style={styles.th}>DATES</th>
                  <th style={styles.th}>REASON</th><th style={styles.th}>STATUS</th><th style={styles.th}>REVIEW</th>
                </tr></thead>
                <tbody>
                  {leaveRequests.map((item) => {
                    const id = item.id
                    const pending = item.status === 'pending'
                    return (
                      <tr key={id}>
                        <td style={styles.td}><strong>{item.staff_name || item.name || item.employee_name || `Staff #${item.staff_id}`}</strong><div style={styles.sub}>{item.email || item.role || ''}</div></td>
                        <td style={styles.td}>{item.leave_type || '—'}</td>
                        <td style={styles.td}>{shortDate(item.start_date)}<br />to {shortDate(item.end_date)}</td>
                        <td style={{ ...styles.td, minWidth: 180 }}>{item.reason || 'No reason supplied'}</td>
                        <td style={styles.td}><StatusBadge status={item.status} />{item.review_note && <div style={{ ...styles.sub, marginTop: 5 }}>Note: {item.review_note}</div>}</td>
                        <td style={{ ...styles.td, minWidth: 190 }}>
                          {pending ? (
                            <div style={{ display: 'grid', gap: 7 }}>
                              <textarea rows={2} placeholder="Review note (required for rejection)" value={reviewNotes[`leave-${id}`] || ''} onChange={(e) => setReviewNotes((old) => ({ ...old, [`leave-${id}`]: e.target.value }))} style={{ ...styles.input, width: '100%', boxSizing: 'border-box' }} />
                              <div style={{ display: 'flex', gap: 6 }}>
                                <ActionButton disabled={saving === `leave-${id}`} color="#15803d" onClick={() => reviewLeave(id, 'approve')}>Approve</ActionButton>
                                <ActionButton disabled={saving === `leave-${id}`} color="#b91c1c" onClick={() => reviewLeave(id, 'reject')}>Reject</ActionButton>
                              </div>
                            </div>
                          ) : <span style={styles.sub}>Already reviewed</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {section === 'absences' && (
        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>Absence Reports</h2>
          <div style={{ marginBottom: 14 }}>
            <label style={styles.field}>Report status
              <select value={absenceFilter} onChange={(e) => setAbsenceFilter(e.target.value)} style={styles.input}>
                <option value="reported">Awaiting review</option>
                <option value="excused">Excused</option>
                <option value="unexcused">Unexcused</option>
                <option value="all">All statuses</option>
              </select>
            </label>
          </div>
          {dateControls}
          {absences.length === 0 ? <p style={styles.sub}>No absence reports found for these filters.</p> : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>
                  <th style={styles.th}>EMPLOYEE</th><th style={styles.th}>ABSENCE DATE</th>
                  <th style={styles.th}>REASON</th><th style={styles.th}>STATUS</th><th style={styles.th}>REVIEW</th>
                </tr></thead>
                <tbody>
                  {absences.map((item) => {
                    const id = item.id
                    const reported = item.status === 'reported'
                    return (
                      <tr key={id}>
                        <td style={styles.td}><strong>{item.staff_name || item.name || item.employee_name || `Staff #${item.staff_id}`}</strong><div style={styles.sub}>{item.email || item.role || ''}</div></td>
                        <td style={styles.td}>{shortDate(item.absence_date)}</td>
                        <td style={{ ...styles.td, minWidth: 180 }}>{item.reason}</td>
                        <td style={styles.td}><StatusBadge status={item.status} />{item.review_note && <div style={{ ...styles.sub, marginTop: 5 }}>{item.review_note}</div>}</td>
                        <td style={{ ...styles.td, minWidth: 190 }}>
                          {reported ? (
                            <div style={{ display: 'grid', gap: 7 }}>
                              <textarea rows={2} placeholder="Optional review note" value={reviewNotes[`absence-${id}`] || ''} onChange={(e) => setReviewNotes((old) => ({ ...old, [`absence-${id}`]: e.target.value }))} style={{ ...styles.input, width: '100%', boxSizing: 'border-box' }} />
                              <div style={{ display: 'flex', gap: 6 }}>
                                <ActionButton disabled={saving === `absence-${id}`} color="#15803d" onClick={() => reviewAbsence(id, 'excused')}>Excuse</ActionButton>
                                <ActionButton disabled={saving === `absence-${id}`} color="#b91c1c" onClick={() => reviewAbsence(id, 'unexcused')}>Unexcused</ActionButton>
                              </div>
                            </div>
                          ) : <span style={styles.sub}>Reviewed</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {section === 'attendance' && (
        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>Attendance and Days Off</h2>
          {dateControls}
          {attendance.length === 0 ? <p style={styles.sub}>No attendance records were returned for this period.</p> : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>
                  <th style={styles.th}>EMPLOYEE</th><th style={styles.th}>ROLE</th>
                  <th style={styles.th}>SCHEDULED DAYS</th><th style={styles.th}>APPROVED LEAVE DAYS</th>
                  <th style={styles.th}>DAYS OFF</th>
                </tr></thead>
                <tbody>
                  {attendance.map((item, index) => (
                    <tr key={item.staff_id || item.id || index}>
                      <td style={styles.td}><strong>{item.staff_name || item.name || item.employee_name || item.email || `Staff #${item.staff_id}`}</strong></td>
                      <td style={styles.td}>{item.role || '—'}</td>
                      <td style={styles.td}>{item.active_days ?? item.shift_days ?? item.scheduled_days ?? 0}</td>
                      <td style={styles.td}>{item.leave_days ?? item.approved_leave_days ?? 0}</td>
                      <td style={styles.td}>{item.off_days ?? item.days_off ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p style={{ ...styles.sub, marginTop: 12 }}>These figures are based on scheduled shifts and approved leave. They do not confirm clock-in or actual attendance.</p>
        </div>
      )}

      {section === 'announcements' && (
        <>
          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>Publish an Announcement</h2>
            <form onSubmit={createAnnouncement} style={{ display: 'grid', gap: 14, maxWidth: 700 }}>
              <label style={styles.field}>Announcement title
                <input required maxLength={150} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Staff meeting on Friday" style={styles.input} />
              </label>
              <label style={styles.field}>Message
                <textarea required rows={5} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Write the announcement..." style={{ ...styles.input, resize: 'vertical' }} />
              </label>
              <label style={styles.field}>Audience
                <select value={audience} onChange={(e) => setAudience(e.target.value)} style={styles.input}>
                  <option value="all">All staff and drivers</option>
                  <option value="hospital_staff">Hospital staff only</option>
                  <option value="driver">Drivers only</option>
                </select>
              </label>
              <div><button type="submit" disabled={saving === 'announcement'} style={styles.primary}>{saving === 'announcement' ? 'Publishing...' : 'Publish announcement'}</button></div>
            </form>
          </div>

          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>Published Announcements</h2>
            {announcements.length === 0 ? <p style={styles.sub}>No announcements have been published yet.</p> : (
              <div style={{ display: 'grid', gap: 12 }}>
                {announcements.map((item) => (
                  <div key={item.id} style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 15 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                      <div>
                        <h3 style={{ margin: '0 0 6px', fontSize: 15 }}>{item.title}</h3>
                        <p style={{ margin: '0 0 10px', fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{item.message}</p>
                        <div style={styles.sub}>Audience: {item.audience || 'all'} · {item.created_at ? new Date(item.created_at).toLocaleString() : ''}</div>
                      </div>
                      <button type="button" disabled={saving === `announcement-${item.id}`} onClick={() => deleteAnnouncement(item.id)} style={{ ...styles.button, color: '#b91c1c', borderColor: '#fecaca' }}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {section === 'pricing' && (
        <PricingManager />
      )}

    </div>
  )
}