import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const API_URL = 'http://localhost:5000/api/admin/hospitals'
const emptyForm = { name: '', location: '', latitude: '', longitude: '' }

export default function HospitalManagement() {
  const navigate = useNavigate()
  const [hospitals, setHospitals] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [search, setSearch] = useState('')

  const getToken = () => localStorage.getItem('medirescue_token')

  const handleUnauthorized = () => {
    localStorage.removeItem('medirescue_token')
    localStorage.removeItem('medirescue_user')
    navigate('/login', { replace: true })
  }

  const loadHospitals = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch(API_URL, {
        headers: { Authorization: `Bearer ${getToken()}` }
      })
      if (response.status === 401 || response.status === 403) {
        handleUnauthorized()
        return
      }
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to load hospitals')
      if (!Array.isArray(data)) throw new Error('Unexpected hospital response')
      setHospitals(data)
    } catch (err) {
      setError(err.message || 'Unable to load hospitals')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadHospitals() }, [])

  const handleChange = (e) => {
    setForm(current => ({ ...current, [e.target.name]: e.target.value }))
  }

  const handleEdit = (hospital) => {
    setEditingId(hospital.id)
    setForm({
      name: hospital.name || '',
      location: hospital.location || '',
      latitude: String(hospital.latitude ?? ''),
      longitude: String(hospital.longitude ?? '')
    })
    setError('')
    setMessage('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleCancel = () => {
    setEditingId(null)
    setForm(emptyForm)
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')
    const isEditing = editingId !== null
    try {
      const response = await fetch(isEditing ? `${API_URL}/${editingId}` : API_URL, {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify(form)
      })
      if (response.status === 401 || response.status === 403) {
        handleUnauthorized()
        return
      }
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to save hospital')
      setEditingId(null)
      setForm(emptyForm)
      await loadHospitals()
      setMessage(isEditing ? 'Hospital updated successfully.' : 'Hospital added successfully.')
    } catch (err) {
      setError(err.message || 'Unable to save hospital')
    } finally {
      setSaving(false)
    }
  }

  const filteredHospitals = hospitals.filter(h =>
    `${h.name || ''} ${h.location || ''} ${h.id}`.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="hm-page">
      <style>{`
        .hm-page{min-height:100vh;background:#f0f5fb;color:#102a43;font-family:Inter,'Segoe UI',Arial,sans-serif}
        .hm-page *{box-sizing:border-box}
        .hm-topbar{background:#10263f;border-bottom:4px solid #e3222a;color:white}
        .hm-top-inner{max-width:1140px;margin:auto;padding:22px 24px;display:flex;align-items:center;justify-content:space-between;gap:16px}
        .hm-brand{display:flex;align-items:center;gap:12px;font-size:23px;font-weight:800;letter-spacing:-.6px}
        .hm-cross{display:grid;place-items:center;width:43px;height:43px;background:#e3222a;border-radius:12px;color:white;font-size:29px}
        .hm-brand small{display:block;font-size:10px;letter-spacing:2px;font-weight:600;margin-top:3px;color:#cbd5e1}
        .hm-wrap{max-width:1140px;margin:auto;padding:38px 24px 70px}
        .hm-eyebrow{font-size:11px;letter-spacing:2px;font-weight:800;color:#dc2626;margin:0 0 13px}
        .hm-title{font-size:clamp(28px,4vw,38px);letter-spacing:-1px;margin:0 0 10px;color:#10263f}
        .hm-subtitle{color:#617895;line-height:1.6;margin:0 0 30px}
        .hm-back,.hm-refresh,.hm-cancel{background:white;border:1px solid #d5e0ec;color:#173555;border-radius:9px;padding:11px 16px;font-weight:700;cursor:pointer}
        .hm-back:hover,.hm-refresh:hover,.hm-cancel:hover{border-color:#dc2626;color:#dc2626;background:#fff8f8}
        .hm-section{background:#fff;border:1px solid #dce6f1;border-radius:16px;box-shadow:0 8px 28px rgba(16,38,63,.04);padding:26px;margin-bottom:24px}
        .hm-section-head{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:22px}
        .hm-section h2{margin:0;font-size:21px;color:#10263f}
        .hm-muted{font-size:13px;color:#64748b;margin:8px 0 0}
        .hm-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px}
        .hm-field{display:flex;flex-direction:column;gap:8px;font-size:13px;font-weight:700;color:#243d5a}
        .hm-field input,.hm-search{width:100%;border:1px solid #cddbea;border-radius:9px;padding:13px 14px;font:inherit;color:#10263f;background:#fff;outline:none;transition:border-color .2s,box-shadow .2s}
        .hm-field input:focus,.hm-search:focus{border-color:#e3222a;box-shadow:0 0 0 3px rgba(227,34,42,.09)}
        .hm-actions{display:flex;flex-wrap:wrap;gap:12px;margin-top:25px}
        .hm-primary{background:#df2229;color:#fff;border:1px solid #df2229;border-radius:9px;padding:12px 20px;font-weight:800;cursor:pointer;transition:transform .2s,box-shadow .2s,background .2s}
        .hm-primary:hover:not(:disabled){background:#bf1820;transform:translateY(-2px);box-shadow:0 7px 15px rgba(223,34,41,.18)}
        .hm-primary:disabled{opacity:.55;cursor:not-allowed}
        .hm-alert{padding:14px 16px;border-radius:9px;margin-bottom:18px;font-size:14px}
        .hm-alert.error{background:#fff1f2;border:1px solid #fecdd3;color:#b91c1c}
        .hm-alert.success{background:#f0fdf4;border:1px solid #bbf7d0;color:#166534}
        .hm-count{background:#eff6ff;border-radius:99px;padding:8px 13px;color:#17466d;font-weight:800;font-size:13px}
        .hm-table-scroll{overflow-x:auto;border:1px solid #e2e8f0;border-radius:11px}
        .hm-table{width:100%;border-collapse:collapse;text-align:left;min-width:720px}
        .hm-table th{background:#f5f8fc;font-size:12px;letter-spacing:.5px;text-transform:uppercase;color:#59708e;padding:16px}
        .hm-table td{padding:16px;border-top:1px solid #e8eef5;font-size:14px;color:#263e58}
        .hm-table tbody tr:hover{background:#fafcff}
        .hm-table td strong{color:#10263f}
        .hm-edit{border:1px solid #f5b6b9;color:#d91f28;background:#fff6f6;border-radius:8px;padding:9px 15px;font-weight:800;cursor:pointer}
        .hm-edit:hover{background:#df2229;color:#fff;border-color:#df2229}
        .hm-toolbar{display:flex;gap:12px;align-items:center;flex-wrap:wrap}
        .hm-search{max-width:270px;font-size:13px}
        .hm-footer{text-align:center;color:#8a9cb2;font-size:12px;padding:12px}
        .hm-page button:focus-visible{outline:3px solid #fb7185;outline-offset:3px}
        @media(max-width:680px){.hm-top-inner{padding:16px}.hm-wrap{padding:28px 16px 50px}.hm-section{padding:19px}.hm-grid{grid-template-columns:1fr}.hm-search{max-width:100%}.hm-toolbar{width:100%}.hm-toolbar .hm-search{flex:1}}
      `}</style>

      <header className="hm-topbar">
        <div className="hm-top-inner">
          <div className="hm-brand"><span className="hm-cross">+</span><div>MediRescue<small>SUPER ADMIN PORTAL</small></div></div>
          <button className="hm-back" type="button" onClick={() => navigate('/admin-dashboard')}>← Dashboard</button>
        </div>
      </header>

      <main className="hm-wrap">
        <p className="hm-eyebrow">HOSPITAL NETWORK MANAGEMENT</p>
        <h1 className="hm-title">Hospital Management</h1>
        <p className="hm-subtitle">Register hospitals, update facility details, and maintain accurate hospital coordinates.</p>

        <section className="hm-section">
          <div className="hm-section-head"><div><h2>{editingId !== null ? 'Edit Hospital' : 'Register New Hospital'}</h2><p className="hm-muted">Provide the hospital's name, location, and map coordinates.</p></div></div>
          {error && <div className="hm-alert error" role="alert">{error}</div>}
          {message && <div className="hm-alert success" role="status">{message}</div>}
          <form onSubmit={handleSubmit}>
            <div className="hm-grid">
              <label className="hm-field">Hospital Name *<input type="text" name="name" value={form.name} onChange={handleChange} placeholder="e.g. Aga Khan University Hospital" maxLength={100} required /></label>
              <label className="hm-field">Location *<input type="text" name="location" value={form.location} onChange={handleChange} placeholder="e.g. Nairobi, Kenya" maxLength={150} required /></label>
              <label className="hm-field">Latitude *<input type="number" name="latitude" value={form.latitude} onChange={handleChange} placeholder="e.g. -1.2635" step="any" min="-90" max="90" required /></label>
              <label className="hm-field">Longitude *<input type="number" name="longitude" value={form.longitude} onChange={handleChange} placeholder="e.g. 36.8112" step="any" min="-180" max="180" required /></label>
            </div>
            <div className="hm-actions">
              <button className="hm-primary" type="submit" disabled={saving}>{saving ? 'Saving...' : editingId !== null ? '✓ Update Hospital' : '+ Add Hospital'}</button>
              {editingId !== null && <button className="hm-cancel" type="button" disabled={saving} onClick={handleCancel}>Cancel Editing</button>}
            </div>
          </form>
        </section>

        <section className="hm-section">
          <div className="hm-section-head">
            <div><h2>Registered Hospitals <span className="hm-count">{hospitals.length}</span></h2><p className="hm-muted">View and edit facilities currently registered in MediRescue.</p></div>
            <div className="hm-toolbar"><input className="hm-search" type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search hospitals..." aria-label="Search hospitals" /><button className="hm-refresh" type="button" onClick={loadHospitals} disabled={loading}>↻ Refresh</button></div>
          </div>
          {loading ? <p className="hm-muted">Loading hospitals...</p> : hospitals.length === 0 ? <p className="hm-muted">No hospitals registered yet.</p> : filteredHospitals.length === 0 ? <p className="hm-muted">No hospitals match your search.</p> : (
            <div className="hm-table-scroll"><table className="hm-table"><thead><tr><th>ID</th><th>Hospital</th><th>Location</th><th>Latitude</th><th>Longitude</th><th>Action</th></tr></thead><tbody>
              {filteredHospitals.map(hospital => <tr key={hospital.id}><td>#{hospital.id}</td><td><strong>{hospital.name}</strong></td><td>{hospital.location}</td><td>{hospital.latitude}</td><td>{hospital.longitude}</td><td><button type="button" className="hm-edit" onClick={() => handleEdit(hospital)}>Edit →</button></td></tr>)}
            </tbody></table></div>
          )}
        </section>
        <footer className="hm-footer">MediRescue • Emergency Response Management System</footer>
      </main>
    </div>
  )
}
