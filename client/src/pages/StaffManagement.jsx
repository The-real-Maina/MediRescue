import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const API_BASE = 'http://localhost:5000/api/admin'
const blankStaff = { name: '', email: '', password: '', hospital_id: '' }
const blankEdit = { name: '', email: '', hospital_id: '' }

const styles = `
.sm-page{min-height:100vh;background:#f0f4fa;color:#102a43;font-family:'Segoe UI',Arial,sans-serif}
.sm-page *{box-sizing:border-box}
.sm-header{background:#102a43;border-bottom:4px solid #e52634;padding:19px 25px}
.sm-header-inner{max-width:1240px;margin:auto;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}
.sm-brand{display:flex;align-items:center;gap:12px;color:white}
.sm-brand-icon{width:45px;height:45px;display:grid;place-items:center;background:#e52634;border-radius:12px;font-size:31px;font-weight:900}
.sm-brand-name{font-size:23px;font-weight:850;line-height:1.15}
.sm-brand-sub{font-size:10px;letter-spacing:2px;color:#cbd5e1;margin-top:5px}
.sm-back{background:white;color:#102a43;border:0;border-radius:9px;padding:12px 17px;font-weight:800;cursor:pointer}
.sm-main{max-width:1240px;margin:auto;padding:39px 22px 65px}
.sm-eyebrow{color:#e52634;letter-spacing:2px;font-size:11px;font-weight:900;margin:0 0 11px}
.sm-title{font-size:clamp(29px,4vw,39px);margin:0 0 10px;color:#102a43}
.sm-subtitle{color:#667b97;line-height:1.65;margin:0 0 28px}
.sm-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:16px;margin-bottom:29px}
.sm-stat{background:white;border:1px solid #dce5ef;border-radius:14px;padding:22px;display:flex;justify-content:space-between;align-items:center;box-shadow:0 5px 20px #102a4308}
.sm-stat-label{font-size:13px;color:#64748b;font-weight:700;margin-bottom:9px}
.sm-stat-value{font-size:32px;font-weight:850}
.sm-stat-icon{border-radius:12px;width:45px;height:45px;display:grid;place-items:center;font-weight:850;font-size:20px}
.sm-panel{background:white;border:1px solid #dce5ef;border-radius:15px;padding:25px;margin-bottom:24px;box-shadow:0 6px 25px #102a4308}
.sm-panel-title{font-size:22px;color:#102a43;margin:0 0 8px}
.sm-panel-sub{font-size:14px;color:#64748b;margin:0 0 23px;line-height:1.55}
.sm-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:17px}
.sm-field label{display:block;color:#102a43;font-weight:750;font-size:13px;margin-bottom:9px}
.sm-field input,.sm-field select,.sm-search,.sm-filter{width:100%;padding:13px 14px;background:white;color:#102a43;border:1px solid #cbd5e1;border-radius:9px;font-size:14px;outline-color:#e52634}
.sm-field input:focus,.sm-field select:focus,.sm-search:focus,.sm-filter:focus{border-color:#e52634}
.sm-btn{border:0;border-radius:9px;padding:12px 18px;font-weight:800;cursor:pointer;transition:transform .18s,box-shadow .18s}
.sm-btn:hover:not(:disabled),.sm-back:hover{transform:translateY(-2px);box-shadow:0 7px 18px #102a4324}
.sm-btn:disabled{opacity:.55;cursor:not-allowed}
.sm-red{background:#e52634;color:white}.sm-blue{background:#1d4ed8;color:white}.sm-grey{background:#64748b;color:white}
.sm-actions{display:flex;flex-wrap:wrap;gap:12px;margin-top:22px}
.sm-message{padding:13px 16px;border-radius:9px;margin:0 0 19px;font-size:14px}
.sm-error{background:#fff1f2;color:#b91c1c;border:1px solid #fecdd3}
.sm-success{background:#ecfdf5;color:#166534;border:1px solid #bbf7d0}
.sm-record-head{display:flex;align-items:center;justify-content:space-between;gap:15px;flex-wrap:wrap;margin-bottom:22px}
.sm-controls{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:23px}
.sm-search{flex:1 1 270px;min-width:0}.sm-filter{flex:0 1 210px}
.sm-table-wrap{overflow-x:auto;border:1px solid #dce5ef;border-radius:11px}
.sm-table{width:100%;min-width:860px;border-collapse:collapse;text-align:left}
.sm-table th{padding:17px 14px;background:#f3f7fb;border-bottom:1px solid #dce5ef;color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:.7px;white-space:nowrap}
.sm-table td{padding:17px 14px;border-bottom:1px solid #e8edf4;font-size:13px;color:#102a43}
.sm-table tbody tr:hover{background:#f8fbff}.sm-table tbody tr:last-child td{border-bottom:0}
.sm-role{display:inline-block;border-radius:99px;padding:7px 11px;font-size:12px;font-weight:800;white-space:nowrap}
.sm-role-staff{background:#eaf2ff;color:#1d4ed8}.sm-role-driver{background:#fff1f2;color:#be123c}
.sm-empty{padding:35px;text-align:center;color:#64748b}
.sm-footer{text-align:center;color:#8192a8;font-size:12px;padding-top:12px}
@media(max-width:600px){.sm-main{padding:28px 15px 45px}.sm-panel{padding:18px}.sm-header{padding:16px}.sm-record-head .sm-btn{width:100%}}
`

function StaffManagement() {
  const navigate = useNavigate()
  const [staff, setStaff] = useState([])
  const [hospitals, setHospitals] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [editError, setEditError] = useState('')
  const [success, setSuccess] = useState('')
  const [form, setForm] = useState({ ...blankStaff })
  const [editForm, setEditForm] = useState({ ...blankEdit })
  const [editingId, setEditingId] = useState(null)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')

  const unauthorized = () => {
    localStorage.removeItem('medirescue_token')
    localStorage.removeItem('medirescue_user')
    navigate('/login', { replace: true })
  }

  const fetchJSON = async (url, options = {}) => {
    const token = localStorage.getItem('medirescue_token')
    if (!token) {
      unauthorized()
      throw new Error('Please log in again')
    }
    const response = await fetch(url, {
      ...options,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        Authorization: `Bearer ${token}`,
        ...options.headers
      }
    })
    if (response.status === 401 || response.status === 403) {
      unauthorized()
      throw new Error('Session expired or access denied')
    }
    const contentType = response.headers.get('content-type') || ''
    if (!contentType.includes('application/json')) {
      throw new Error(`Unexpected server response (${response.status})`)
    }
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`)
    return data
  }

  const loadRecords = async (signal) => {
    setLoading(true)
    setError('')
    try {
      const [staffData, hospitalData] = await Promise.all([
        fetchJSON(`${API_BASE}/staff`, { signal }),
        fetchJSON(`${API_BASE}/hospitals`, { signal })
      ])
      if (!Array.isArray(staffData) || !Array.isArray(hospitalData)) {
        throw new Error('Unexpected staff or hospital response')
      }
      if (!signal?.aborted) {
        setStaff(staffData)
        setHospitals(hospitalData)
      }
    } catch (err) {
      if (err.name !== 'AbortError' && !signal?.aborted) {
        setError(err.message || 'Failed to load records')
      }
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    loadRecords(controller.signal)
    return () => controller.abort()
  }, [])

  const refreshStaffAfterSave = async () => {
    try {
      const data = await fetchJSON(`${API_BASE}/staff`)
      if (!Array.isArray(data)) throw new Error('Unexpected staff response')
      setStaff(data)
      setError('')
    } catch (err) {
      setError('Changes were saved, but the staff list could not refresh. ' + err.message)
    }
  }

  const handleRegister = async (event) => {
    event.preventDefault()
    if (saving) return
    setFormError('')
    setSuccess('')
    const name = form.name.trim()
    const email = form.email.trim().toLowerCase()
    if (!name || !email || !form.password || !form.hospital_id) {
      setFormError('Please complete all fields')
      return
    }
    if (form.password.length < 8 || form.password.length > 72) {
      setFormError('Password must contain 8 to 72 characters')
      return
    }
    setSaving(true)
    try {
      const result = await fetchJSON(`${API_BASE}/staff`, {
        method: 'POST',
        body: JSON.stringify({
          name, email, password: form.password,
          hospital_id: Number(form.hospital_id)
        })
      })
      setSuccess(result.message || 'Hospital staff registered successfully')
      setForm({ ...blankStaff })
      await refreshStaffAfterSave()
    } catch (err) {
      setFormError(err.message || 'Failed to register hospital staff')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (member) => {
    setEditingId(member.id)
    setEditForm({
      name: member.name || '',
      email: member.email || '',
      hospital_id: String(member.hospital_id ?? '')
    })
    setEditError('')
    setSuccess('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditForm({ ...blankEdit })
    setEditError('')
  }

  const handleUpdate = async (event) => {
    event.preventDefault()
    if (updating || editingId === null) return
    setEditError('')
    setSuccess('')
    const name = editForm.name.trim()
    const email = editForm.email.trim().toLowerCase()
    if (!name || !email || !editForm.hospital_id) {
      setEditError('Please complete all fields')
      return
    }
    setUpdating(true)
    try {
      const result = await fetchJSON(`${API_BASE}/staff/${editingId}`, {
        method: 'PUT',
        body: JSON.stringify({
          name, email, hospital_id: Number(editForm.hospital_id)
        })
      })
      setSuccess(result.message || 'Staff details updated successfully')
      handleCancelEdit()
      await refreshStaffAfterSave()
    } catch (err) {
      setEditError(err.message || 'Failed to update staff details')
    } finally {
      setUpdating(false)
    }
  }

  const filteredStaff = staff.filter((member) => {
    const query = search.trim().toLowerCase()
    const matchesSearch = [
      member.id, member.name, member.email,
      member.hospital_name, member.role
    ].some(value => String(value ?? '').toLowerCase().includes(query))
    return matchesSearch && (roleFilter === 'all' || member.role === roleFilter)
  })

  const staffCount = staff.filter(s => s.role === 'hospital_staff').length
  const driverCount = staff.filter(s => s.role === 'driver').length
  const formatRole = role => role === 'hospital_staff'
    ? 'Hospital Staff' : role === 'driver' ? 'Ambulance Driver' : (role || 'Unknown')

  const renderField = (id, label, name, value, change, type = 'text', props = {}) => (
    <div className="sm-field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id} name={name} type={type} value={value}
        onChange={change} required {...props}
      />
    </div>
  )

  const renderHospital = (id, name, value, change) => (
    <div className="sm-field">
      <label htmlFor={id}>Assigned Hospital</label>
      <select id={id} name={name} value={value} onChange={change} required>
        <option value="">Select a hospital</option>
        {hospitals.map(hospital => (
          <option key={hospital.id} value={hospital.id}>{hospital.name}</option>
        ))}
      </select>
    </div>
  )

  return (
    <div className="sm-page">
      <style>{styles}</style>
      <header className="sm-header">
        <div className="sm-header-inner">
          <div className="sm-brand">
            <div className="sm-brand-icon">+</div>
            <div>
              <div className="sm-brand-name">MediRescue</div>
              <div className="sm-brand-sub">SUPER ADMIN PORTAL</div>
            </div>
          </div>
          <button type="button" className="sm-back"
            onClick={() => navigate('/admin-dashboard')}>← Dashboard</button>
        </div>
      </header>

      <main className="sm-main">
        <p className="sm-eyebrow">WORKFORCE MANAGEMENT</p>
        <h1 className="sm-title">Staff Management</h1>
        <p className="sm-subtitle">
          Register hospital staff, manage employee records, and review ambulance
          drivers and hospital assignments across MediRescue.
        </p>

        <div className="sm-stats">
          {[
            { label: 'Total Personnel', value: staff.length, icon: '👥', tint: '#eaf2ff', color: '#1d4ed8' },
            { label: 'Hospital Staff', value: staffCount, icon: '+', tint: '#fff1f2', color: '#be123c' },
            { label: 'Ambulance Drivers', value: driverCount, icon: '🚑', tint: '#e8fbf0', color: '#047857' },
            { label: 'Registered Hospitals', value: hospitals.length, icon: '⌂', tint: '#fff7ed', color: '#c2410c' }
          ].map(item => (
            <div className="sm-stat" key={item.label}>
              <div>
                <div className="sm-stat-label">{item.label}</div>
                <div className="sm-stat-value">{item.value}</div>
              </div>
              <div className="sm-stat-icon" style={{ background: item.tint, color: item.color }}>
                {item.icon}
              </div>
            </div>
          ))}
        </div>

        {success && <div role="status" className="sm-message sm-success">{success}</div>}

        <section className="sm-panel">
          <h2 className="sm-panel-title">Register New Hospital Staff</h2>
          <p className="sm-panel-sub">
            Create a staff account and assign the employee to a registered hospital.
            Ambulance drivers are registered from Manage Ambulances.
          </p>
          {formError && <div role="alert" className="sm-message sm-error">{formError}</div>}
          <form onSubmit={handleRegister}>
            <div className="sm-grid">
              {renderField('sm-name', 'Full Name', 'name', form.name,
                e => setForm(prev => ({ ...prev, name: e.target.value })),
                'text', { maxLength: 100, placeholder: 'e.g. Mary Wanjiku' })}
              {renderField('sm-email', 'Email Address', 'email', form.email,
                e => setForm(prev => ({ ...prev, email: e.target.value })),
                'email', { maxLength: 100, placeholder: 'mary@hospital.co.ke' })}
              {renderField('sm-password', 'Initial Password', 'password', form.password,
                e => setForm(prev => ({ ...prev, password: e.target.value })),
                'password', { minLength: 8, maxLength: 72,
                  autoComplete: 'new-password', placeholder: '8–72 characters' })}
              {renderHospital('sm-hospital', 'hospital_id', form.hospital_id,
                e => setForm(prev => ({ ...prev, hospital_id: e.target.value })))}
            </div>
            <div className="sm-actions">
              <button type="submit" className="sm-btn sm-red"
                disabled={saving || loading || hospitals.length === 0}>
                {saving ? 'Registering...' : '+ Register Hospital Staff'}
              </button>
            </div>
          </form>
        </section>

        {editingId !== null && (
          <section className="sm-panel">
            <h2 className="sm-panel-title">Edit Staff #{editingId}</h2>
            <p className="sm-panel-sub">
              Update the employee's name, email address or assigned hospital.
            </p>
            {editError && <div role="alert" className="sm-message sm-error">{editError}</div>}
            <form onSubmit={handleUpdate}>
              <div className="sm-grid">
                {renderField('sm-edit-name', 'Full Name', 'name', editForm.name,
                  e => setEditForm(prev => ({ ...prev, name: e.target.value })),
                  'text', { maxLength: 100 })}
                {renderField('sm-edit-email', 'Email Address', 'email', editForm.email,
                  e => setEditForm(prev => ({ ...prev, email: e.target.value })),
                  'email', { maxLength: 100 })}
                {renderHospital('sm-edit-hospital', 'hospital_id', editForm.hospital_id,
                  e => setEditForm(prev => ({ ...prev, hospital_id: e.target.value })))}
              </div>
              <div className="sm-actions">
                <button type="submit" className="sm-btn sm-blue" disabled={updating}>
                  {updating ? 'Saving...' : 'Save Changes'}
                </button>
                <button type="button" className="sm-btn sm-grey"
                  onClick={handleCancelEdit} disabled={updating}>Cancel</button>
              </div>
            </form>
          </section>
        )}

        <section className="sm-panel">
          <div className="sm-record-head">
            <div>
              <h2 className="sm-panel-title">
                Registered Staff ({filteredStaff.length})
              </h2>
              <p className="sm-panel-sub" style={{ marginBottom: 0 }}>
                Search, filter and manage personnel records.
              </p>
            </div>
            <button type="button" className="sm-btn sm-red"
              disabled={loading} onClick={() => loadRecords()}>
              {loading ? 'Refreshing...' : '↻ Refresh Records'}
            </button>
          </div>
          <div className="sm-controls">
            <input className="sm-search" type="search"
              aria-label="Search staff"
              placeholder="Search name, email, hospital or ID..."
              value={search} onChange={e => setSearch(e.target.value)} />
            <select className="sm-filter" aria-label="Filter staff by role"
              value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
              <option value="all">All Roles</option>
              <option value="hospital_staff">Hospital Staff</option>
              <option value="driver">Ambulance Drivers</option>
            </select>
          </div>
          {error && <div role="alert" className="sm-message sm-error">{error}</div>}
          {loading ? (
            <div className="sm-empty">Loading staff records...</div>
          ) : !error && filteredStaff.length === 0 ? (
            <div className="sm-empty">No staff members match your filters.</div>
          ) : !error ? (
            <div className="sm-table-wrap">
              <table className="sm-table">
                <thead><tr>
                  {['ID', 'Full Name', 'Email Address', 'Role',
                    'Assigned Hospital', 'Actions'].map(h => <th key={h}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {filteredStaff.map(member => (
                    <tr key={member.id}>
                      <td style={{ fontWeight: 850, color: '#e52634' }}>#{member.id}</td>
                      <td style={{ fontWeight: 750 }}>{member.name || 'Unknown'}</td>
                      <td>{member.email}</td>
                      <td>
                        <span className={`sm-role ${member.role === 'driver'
                          ? 'sm-role-driver' : 'sm-role-staff'}`}>
                          {formatRole(member.role)}
                        </span>
                      </td>
                      <td>{member.hospital_name || 'Not assigned'}</td>
                      <td>
                        <button type="button" className="sm-btn sm-blue"
                          style={{ padding: '9px 15px' }}
                          onClick={() => handleEdit(member)}>Edit</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
        <footer className="sm-footer">
          MediRescue • Emergency Response Management System
        </footer>
      </main>
    </div>
  )
}

export default StaffManagement
