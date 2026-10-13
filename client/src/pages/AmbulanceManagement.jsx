import { useEffect, useState } from 'react'

import { useNavigate } from 'react-router-dom'

const API_BASE = 'http://localhost:5000/api/admin'

const emptyDriverForm = { name: '', email: '', password: '', hospital_id: '' }



const emptyForm = {

  plate_number: '',

  hospital_id: ''

}

function AmbulanceManagement() {

  const navigate = useNavigate()

  const [ambulances, setAmbulances] = useState([])

  const [hospitals, setHospitals] = useState([])

  const [drivers, setDrivers] = useState([])

  const [driverForm, setDriverForm] = useState(emptyDriverForm)

  const [driverSaving, setDriverSaving] = useState(false)

  const [driverError, setDriverError] = useState('')

  const [driverSuccess, setDriverSuccess] = useState('')

  const [loading, setLoading] = useState(true)

  const [saving, setSaving] = useState(false)

  const [error, setError] = useState('')

  const [formError, setFormError] = useState('')

  const [success, setSuccess] = useState('')

  const [search, setSearch] = useState('')

  const [statusFilter, setStatusFilter] = useState('all')

  const [formData, setFormData] = useState(emptyForm)

  const [editingId, setEditingId] = useState(null)

  const [editForm, setEditForm] = useState({

    plate_number: '',

    hospital_id: '',

    driver_id: ''

  })

  const [editError, setEditError] = useState('')

  const [editSuccess, setEditSuccess] = useState('')

  const [editSaving, setEditSaving] = useState(false)

  // ==========================================

  // AUTHENTICATED API REQUEST

  // ==========================================

  const apiRequest = async (endpoint, options = {}) => {

    const token = localStorage.getItem('medirescue_token')

    if (!token) {

      navigate('/login', { replace: true })

      throw new Error('Please log in again')

    }

    const response = await fetch(`${API_BASE}${endpoint}`, {

      ...options,

      headers: {

        Authorization: `Bearer ${token}`,

        ...(options.body

          ? { 'Content-Type': 'application/json' }

          : {}),

        ...options.headers

      }

    })

    if (response.status === 401 || response.status === 403) {

      localStorage.removeItem('medirescue_token')

      localStorage.removeItem('medirescue_user')

      navigate('/login', { replace: true })

      throw new Error(

        'Your session has expired or access was denied'

      )

    }

    const contentType =

      response.headers.get('content-type') || ''

    if (!contentType.includes('application/json')) {

      throw new Error(

        `Unexpected server response (${response.status})`

      )

    }

    const data = await response.json()

    if (!response.ok) {

      throw new Error(data.error || 'Request failed')

    }

    return data

  }

  // ==========================================

  // LOAD AMBULANCES

  // ==========================================

  const loadAmbulances = async () => {

    setLoading(true)

    setError('')

    try {

      const data = await apiRequest('/ambulances')

      if (!Array.isArray(data)) {

        throw new Error('Unexpected ambulance response')

      }

      setAmbulances(data)

      return data

    } catch (err) {

      setError(err.message || 'Unable to load ambulances')

      return null

    } finally {

      setLoading(false)

    }

  }

  // ==========================================

  // LOAD HOSPITALS AND DRIVERS

  // ==========================================

  const loadOptions = async () => {

    try {

      const [hospitalData, driverData] = await Promise.all([

        apiRequest('/hospitals'),

        apiRequest('/drivers')

      ])

      if (

        !Array.isArray(hospitalData) ||

        !Array.isArray(driverData)

      ) {

        throw new Error('Unexpected hospital or driver response')

      }

      setHospitals(hospitalData)

      setDrivers(driverData)

    } catch (err) {

      setFormError(

        err.message || 'Unable to load hospitals and drivers'

      )

    }

  }

  useEffect(() => {

    loadAmbulances()

    loadOptions()

  }, [])

  // ==========================================

  // REGISTER AMBULANCE

  // ==========================================

  const handleRegister = async (event) => {

    event.preventDefault()

    setFormError('')

    setSuccess('')

    const plate = formData.plate_number.trim().toUpperCase()

    const hospitalId = Number(formData.hospital_id)

    if (!plate || plate.length > 20) {

      setFormError('Enter a valid ambulance plate number')

      return

    }

    if (

      !formData.hospital_id ||

      !Number.isSafeInteger(hospitalId) ||

      hospitalId <= 0

    ) {

      setFormError('Please select a hospital')

      return

    }

    setSaving(true)

    try {

      const result = await apiRequest('/ambulances', {

        method: 'POST',

        body: JSON.stringify({

          plate_number: plate,

          hospital_id: hospitalId

        })

      })

      setFormData(emptyForm)

      setSearch('')

      setStatusFilter('all')

      setSuccess(

        result.message || 'Ambulance registered successfully'

      )

      await loadAmbulances()

    } catch (err) {

      setFormError(err.message || 'Failed to register ambulance')

    } finally {

      setSaving(false)

    }

  }

  // ==========================================

  // REGISTER NEW DRIVER

  // ==========================================



  const handleRegisterDriver = async (event) => {

    event.preventDefault()

    if (driverSaving) return



    setDriverError('')

    setDriverSuccess('')



    const name = driverForm.name.trim()

    const email = driverForm.email.trim().toLowerCase()

    const hospitalId = Number(driverForm.hospital_id)



    if (!name || name.length > 100) {

      setDriverError('Enter a valid driver name')

      return

    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 100) {

      setDriverError('Enter a valid email address')

      return

    }

    if (driverForm.password.length < 8) {

      setDriverError('Password must contain at least 8 characters')

      return

    }

    if (!Number.isSafeInteger(hospitalId) || hospitalId <= 0) {

      setDriverError('Select the driver hospital')

      return

    }



    setDriverSaving(true)

    try {

      const result = await apiRequest('/drivers', {

        method: 'POST',

        body: JSON.stringify({

          name,

          email,

          password: driverForm.password,

          hospital_id: hospitalId

        })

      })

      setDriverForm(emptyDriverForm)

      setDriverSuccess(result.message || 'Driver registered successfully')

      await loadOptions()

    } catch (err) {

      setDriverError(err.message || 'Failed to register driver')

    } finally {

      setDriverSaving(false)

    }

  }



  // ==========================================

  // START EDITING

  // ==========================================

  const handleEdit = (ambulance) => {

    if (ambulance.status !== 'available') {

      setEditError(

        'Only available ambulances can be edited'

      )

      return

    }

    setEditingId(ambulance.id)

    setEditError('')

    setEditSuccess('')

    setEditForm({

      plate_number: ambulance.plate_number || '',

      hospital_id: String(ambulance.hospital_id ?? ''),

      driver_id: ambulance.driver_id == null

        ? ''

        : String(ambulance.driver_id)

    })

  }

  // ==========================================

  // CANCEL EDITING

  // ==========================================

  const handleCancelEdit = () => {

    setEditingId(null)

    setEditError('')

    setEditForm({

      plate_number: '',

      hospital_id: '',

      driver_id: ''

    })

  }

  // ==========================================

  // AVAILABLE DRIVERS FOR SELECTED HOSPITAL

  // ==========================================

  const eligibleDrivers = drivers.filter((driver) => {

    if (

      Number(driver.hospital_id) !==

      Number(editForm.hospital_id)

    ) {

      return false

    }

    const assignedToOtherAmbulance = ambulances.some(

      (ambulance) =>

        Number(ambulance.driver_id) === Number(driver.id) &&

        ambulance.id !== editingId

    )

    return !assignedToOtherAmbulance

  })

  // ==========================================

  // SAVE AMBULANCE CHANGES

  // ==========================================

  const handleSaveEdit = async (event) => {

    event.preventDefault()

    if (editSaving) return

    setEditError('')

    setEditSuccess('')

    const plate = editForm.plate_number.trim().toUpperCase()

    const hospitalId = Number(editForm.hospital_id)

    const driverId = editForm.driver_id

      ? Number(editForm.driver_id)

      : null

    if (!plate || plate.length > 20) {

      setEditError('Enter a valid plate number')

      return

    }

    if (

      !editForm.hospital_id ||

      !Number.isSafeInteger(hospitalId) ||

      hospitalId <= 0

    ) {

      setEditError('Please select a hospital')

      return

    }

    if (

      driverId !== null &&

      (!Number.isSafeInteger(driverId) || driverId <= 0)

    ) {

      setEditError('Invalid driver selection')

      return

    }

    setEditSaving(true)

    try {

      const result = await apiRequest(

        `/ambulances/${editingId}`,

        {

          method: 'PUT',

          body: JSON.stringify({

            plate_number: plate,

            hospital_id: hospitalId,

            driver_id: driverId

          })

        }

      )

      setEditingId(null)

      setEditSuccess(

        result.message || 'Ambulance updated successfully'

      )

      await loadAmbulances()

    } catch (err) {

      setEditError(err.message || 'Failed to update ambulance')

    } finally {

      setEditSaving(false)

    }

  }

  // ==========================================

  // SEARCH AND FILTER

  // ==========================================

  const filteredAmbulances = ambulances.filter((item) => {

    const query = search.trim().toLowerCase()

    const matchesSearch = [

      item.id,

      item.plate_number,

      item.hospital_name,

      item.driver_name

    ].some((value) =>

      String(value ?? '').toLowerCase().includes(query)

    )

    const matchesStatus =

      statusFilter === 'all' ||

      item.status === statusFilter

    return matchesSearch && matchesStatus

  })

  // ==========================================

  // FORMATTING

  // ==========================================

  const formatStatus = (status) =>

    String(status || 'Unknown')

      .replaceAll('_', ' ')

      .replace(/\b\w/g, (letter) => letter.toUpperCase())

  const formatCoordinate = (value) =>

    value === null || value === undefined

      ? '—'

      : String(value)

  const palette = {
    navy: '#102a43', red: '#e11d2a', ink: '#102a43', muted: '#657b96',
    line: '#dce6f1', bg: '#eff4fa', white: '#fff'
  }
  const panel = { background: '#fff', border: `1px solid ${palette.line}`, borderRadius: 18, padding: 26, marginBottom: 24, boxShadow: '0 10px 32px rgba(16,42,67,.035)' }
  const input = { width: '100%', boxSizing: 'border-box', padding: '13px 14px', border: `1px solid #cbd9e9`, borderRadius: 9, background: '#fff', color: palette.ink, fontSize: 14, outlineColor: palette.red }
  const label = { display: 'block', fontSize: 13, fontWeight: 700, color: palette.ink, marginBottom: 9 }
  const primary = { border: 0, borderRadius: 9, padding: '13px 20px', background: palette.red, color: '#fff', fontWeight: 800, cursor: 'pointer', fontSize: 13 }
  const secondary = { ...primary, color: palette.ink, background: '#fff', border: `1px solid ${palette.line}` }
  const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 235px), 1fr))', gap: 18, marginBottom: 20 }
  const th = { textAlign: 'left', padding: '15px 14px', fontSize: 11, letterSpacing: '.08em', color: '#59708d', background: '#f5f8fc', borderBottom: `1px solid ${palette.line}`, whiteSpace: 'nowrap' }
  const td = { textAlign: 'left', padding: '16px 14px', fontSize: 13, color: palette.ink, borderBottom: `1px solid #e8eef6`, verticalAlign: 'middle' }
  const statusColors = {
    available: ['#e5fbef', '#087d45'], dispatched: ['#fff1e8', '#b45309'],
    en_route: ['#e9f1ff', '#1d4ed8'], returning: ['#f3edff', '#6d28d9']
  }
  const badge = (status) => {
    const [background, color] = statusColors[status] || ['#edf2f7', '#475569']
    return <span style={{ display: 'inline-block', background, color, padding: '7px 11px', borderRadius: 999, fontWeight: 800, fontSize: 11, whiteSpace: 'nowrap' }}>{formatStatus(status)}</span>
  }
  const notice = (message, danger = false) => message && <div role={danger ? 'alert' : 'status'} style={{ background: danger ? '#fff1f2' : '#edfcf3', border: `1px solid ${danger ? '#fecdd3' : '#bbf7d0'}`, color: danger ? '#b91c1c' : '#166534', padding: '12px 15px', borderRadius: 9, marginBottom: 17, fontSize: 13 }}>{message}</div>
  const availableCount = ambulances.filter(a => a.status === 'available').length
  const assignedCount = ambulances.filter(a => a.driver_id != null).length
  const activeCount = ambulances.length - availableCount

  return (
    <div style={{ minHeight: '100vh', background: palette.bg, color: palette.ink, fontFamily: 'inherit' }}>
      <header style={{ background: palette.navy, borderBottom: `4px solid ${palette.red}`, color: '#fff' }}>
        <div style={{ maxWidth: 1190, margin: 'auto', padding: '23px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
            <span style={{ background: palette.red, borderRadius: 12, width: 45, height: 45, display: 'grid', placeItems: 'center', fontSize: 29, fontWeight: 900 }}>+</span>
            <div><div style={{ fontSize: 23, fontWeight: 900, letterSpacing: '-.04em' }}>MediRescue</div><div style={{ fontSize: 10, letterSpacing: '.19em', marginTop: 3 }}>SUPER ADMIN PORTAL</div></div>
          </div>
          <button type="button" onClick={() => navigate('/admin-dashboard')} style={{ ...secondary, background: '#fff' }}>← Dashboard</button>
        </div>
      </header>

      <main style={{ maxWidth: 1190, margin: '0 auto', padding: '37px 24px 70px' }}>
        <p style={{ color: palette.red, fontWeight: 900, letterSpacing: '.2em', fontSize: 11, margin: '0 0 12px' }}>FLEET & DRIVER OPERATIONS</p>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 38px)', margin: '0 0 10px', letterSpacing: '-.04em' }}>Ambulance Management</h1>
        <p style={{ color: palette.muted, margin: '0 0 28px', lineHeight: 1.7 }}>Register ambulances, manage hospital drivers, and monitor the MediRescue response fleet.</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(185px, 1fr))', gap: 14, marginBottom: 27 }}>
          {[
            ['Total Ambulances', ambulances.length, '🚑'],
            ['Available', availableCount, '✓'],
            ['On Operations', activeCount, '↗'],
            ['Drivers Assigned', assignedCount, '♙']
          ].map(([title, value, symbol]) => (
            <div key={title} style={{ ...panel, marginBottom: 0, padding: '21px 23px', display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
              <div><div style={{ fontSize: 12, fontWeight: 700, color: palette.muted, marginBottom: 11 }}>{title}</div><div style={{ fontSize: 29, fontWeight: 900 }}>{value}</div></div>
              <span style={{ width: 42, height: 42, display: 'grid', placeItems: 'center', borderRadius: 12, background: '#fff0f1', color: palette.red, fontSize: 23 }}>{symbol}</span>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))', gap: 22, alignItems: 'start' }}>
          <section style={panel}>
            <p style={{ fontSize: 11, color: palette.red, fontWeight: 900, letterSpacing: '.15em', margin: '0 0 9px' }}>FLEET REGISTRATION</p>
            <h2 style={{ margin: '0 0 7px', fontSize: 21 }}>Register New Ambulance</h2>
            <p style={{ color: palette.muted, fontSize: 13, lineHeight: 1.6, marginBottom: 23 }}>Add a vehicle to a hospital's response fleet.</p>
            {notice(formError, true)}{notice(success)}
            <form onSubmit={handleRegister}>
              <div style={{ marginBottom: 17 }}><label htmlFor="register-plate" style={label}>Plate Number *</label><input id="register-plate" style={input} required maxLength={20} placeholder="e.g. KAA 007G" value={formData.plate_number} onChange={e => setFormData({ ...formData, plate_number: e.target.value })} /></div>
              <div style={{ marginBottom: 23 }}><label htmlFor="register-hospital" style={label}>Assigned Hospital *</label><select id="register-hospital" style={input} required value={formData.hospital_id} onChange={e => setFormData({ ...formData, hospital_id: e.target.value })}><option value="">Select a hospital</option>{hospitals.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}</select></div>
              <button type="submit" disabled={saving || !hospitals.length} style={{ ...primary, opacity: saving || !hospitals.length ? .55 : 1 }}>{saving ? 'Registering...' : '+ Register Ambulance'}</button>
            </form>
          </section>

          <section style={panel}>
            <p style={{ fontSize: 11, color: palette.red, fontWeight: 900, letterSpacing: '.15em', margin: '0 0 9px' }}>DRIVER MANAGEMENT</p>
            <h2 style={{ margin: '0 0 7px', fontSize: 21 }}>Register New Driver</h2>
            <p style={{ color: palette.muted, fontSize: 13, lineHeight: 1.6, marginBottom: 23 }}>Create a hospital driver account. Assign the driver to an available ambulance below.</p>
            {notice(driverError, true)}{notice(driverSuccess)}
            <form onSubmit={handleRegisterDriver}>
              <div style={grid}>
                <div><label htmlFor="driver-name" style={label}>Full Name *</label><input id="driver-name" style={input} required maxLength={100} placeholder="Driver's full name" value={driverForm.name} onChange={e => setDriverForm({ ...driverForm, name: e.target.value })} /></div>
                <div><label htmlFor="driver-email" style={label}>Email Address *</label><input id="driver-email" type="email" style={input} required maxLength={100} placeholder="driver@hospital.com" value={driverForm.email} onChange={e => setDriverForm({ ...driverForm, email: e.target.value })} /></div>
                <div><label htmlFor="driver-password" style={label}>Initial Password *</label><input id="driver-password" type="password" autoComplete="new-password" style={input} required minLength={8} placeholder="At least 8 characters" value={driverForm.password} onChange={e => setDriverForm({ ...driverForm, password: e.target.value })} /></div>
                <div><label htmlFor="driver-hospital" style={label}>Assigned Hospital *</label><select id="driver-hospital" style={input} required value={driverForm.hospital_id} onChange={e => setDriverForm({ ...driverForm, hospital_id: e.target.value })}><option value="">Select a hospital</option>{hospitals.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}</select></div>
              </div>
              <button type="submit" disabled={driverSaving || !hospitals.length} style={{ ...primary, opacity: driverSaving || !hospitals.length ? .55 : 1 }}>{driverSaving ? 'Registering...' : '+ Register Driver'}</button>
            </form>
          </section>
        </div>

        {editingId !== null && <section style={{ ...panel, border: `2px solid #fda4af` }}>
          <p style={{ color: palette.red, fontWeight: 900, letterSpacing: '.15em', fontSize: 11, margin: '0 0 9px' }}>FLEET DETAILS</p>
          <h2 style={{ margin: '0 0 9px', fontSize: 22 }}>Edit Ambulance #{editingId}</h2>
          <p style={{ color: palette.muted, margin: '0 0 22px', fontSize: 13 }}>Changes are permitted only while the ambulance is available. Drivers must belong to the selected hospital and cannot be assigned to another ambulance.</p>
          {notice(editError, true)}
          <form onSubmit={handleSaveEdit}>
            <div style={grid}>
              <div><label htmlFor="edit-plate" style={label}>Plate Number *</label><input id="edit-plate" style={input} required maxLength={20} value={editForm.plate_number} onChange={e => setEditForm({ ...editForm, plate_number: e.target.value })} /></div>
              <div><label htmlFor="edit-hospital" style={label}>Assigned Hospital *</label><select id="edit-hospital" style={input} required value={editForm.hospital_id} onChange={e => setEditForm({ ...editForm, hospital_id: e.target.value, driver_id: '' })}><option value="">Select a hospital</option>{hospitals.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}</select></div>
              <div><label htmlFor="edit-driver" style={label}>Assigned Driver</label><select id="edit-driver" style={input} value={editForm.driver_id} onChange={e => setEditForm({ ...editForm, driver_id: e.target.value })}><option value="">No driver assigned</option>{eligibleDrivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select><p style={{ color: palette.muted, fontSize: 11 }}>Only eligible drivers from this hospital are listed.</p></div>
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}><button type="submit" disabled={editSaving} style={primary}>{editSaving ? 'Saving...' : 'Save Changes'}</button><button type="button" disabled={editSaving} onClick={handleCancelEdit} style={secondary}>Cancel</button></div>
          </form>
        </section>}

        <section style={panel}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 23 }}>
            <div><p style={{ color: palette.red, fontSize: 11, fontWeight: 900, letterSpacing: '.15em', margin: '0 0 9px' }}>FLEET DIRECTORY</p><h2 style={{ margin: '0 0 7px', fontSize: 23 }}>Registered Ambulances <span style={{ fontSize: 14, padding: '5px 10px', background: '#edf4fb', borderRadius: 999 }}>{filteredAmbulances.length}</span></h2><p style={{ margin: 0, color: palette.muted, fontSize: 13 }}>View ambulance assignments, operational status, and reported GPS coordinates.</p></div>
            <button type="button" disabled={loading} onClick={loadAmbulances} style={secondary}>{loading ? 'Refreshing...' : '↻ Refresh Records'}</button>
          </div>
          {notice(editSuccess)}{editingId === null && notice(editError, true)}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 22 }}>
            <input aria-label="Search ambulances" type="search" placeholder="Search plate, hospital or driver..." value={search} onChange={e => setSearch(e.target.value)} style={{ ...input, flex: '1 1 280px', width: 'auto' }} />
            <select aria-label="Filter ambulance status" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ ...input, width: 'auto', flex: '0 1 200px' }}><option value="all">All Statuses</option><option value="available">Available</option><option value="dispatched">Dispatched</option><option value="en_route">En Route</option><option value="returning">Returning</option></select>
          </div>
          {notice(error, true)}
          {loading ? <p style={{ color: palette.muted }}>Loading ambulance records...</p> : !error && !filteredAmbulances.length ? <p style={{ color: palette.muted }}>No ambulances match your filters.</p> : !error ? (
            <div style={{ overflowX: 'auto', border: `1px solid ${palette.line}`, borderRadius: 12 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1000 }}>
                <thead><tr>{['ID', 'Plate Number', 'Hospital', 'Driver', 'Status', 'Latitude', 'Longitude', 'Action'].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
                <tbody>{filteredAmbulances.map(item => <tr key={item.id}>
                  <td style={{ ...td, color: palette.muted }}>#{item.id}</td>
                  <td style={{ ...td, fontWeight: 900 }}>{item.plate_number}</td>
                  <td style={td}>{item.hospital_name || 'Unknown hospital'}</td>
                  <td style={td}>{item.driver_name || <span style={{ color: '#b45309' }}>Not assigned</span>}</td>
                  <td style={td}>{badge(item.status)}</td>
                  <td style={td}>{formatCoordinate(item.current_lat)}</td>
                  <td style={td}>{formatCoordinate(item.current_lng)}</td>
                  <td style={td}><button type="button" disabled={item.status !== 'available' || editSaving} onClick={() => handleEdit(item)} style={{ ...secondary, padding: '9px 14px', color: palette.red, borderColor: '#fecdd3', background: '#fff7f7', opacity: item.status !== 'available' ? .45 : 1 }}>Edit →</button></td>
                </tr>)}</tbody>
              </table>
            </div>
          ) : null}
        </section>
        <footer style={{ textAlign: 'center', color: '#8aa0ba', fontSize: 12, marginTop: 38 }}>MediRescue • Emergency Response Management System</footer>
      </main>
    </div>
  )
}

export default AmbulanceManagement
