
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const API_BASE = 'http://localhost:5000/api/admin'

const emptyForm = {
  plate_number: '',
  hospital_id: ''
}

function AmbulanceManagement() {
  const navigate = useNavigate()

  const [ambulances, setAmbulances] = useState([])
  const [hospitals, setHospitals] = useState([])
  const [drivers, setDrivers] = useState([])

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

  const inputStyle = {
    padding: '12px',
    border: '1px solid #cbd5e1',
    borderRadius: '7px',
    backgroundColor: '#ffffff',
    color: '#17233b',
    fontSize: '14px',
    width: '100%',
    boxSizing: 'border-box'
  }

  const labelStyle = {
    display: 'block',
    fontWeight: 600,
    marginBottom: '8px',
    color: '#17233b'
  }

  const cellStyle = {
    padding: '14px 12px',
    borderBottom: '1px solid #e2e8f0',
    textAlign: 'left',
    verticalAlign: 'top',
    color: '#17233b'
  }

  const buttonStyle = {
    padding: '11px 20px',
    border: 'none',
    borderRadius: '7px',
    color: '#ffffff',
    fontWeight: 600,
    cursor: 'pointer'
  }

  const sectionStyle = {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '25px',
    boxShadow: '0 3px 12px rgba(0,0,0,0.04)'
  }

  // ==========================================
  // PAGE
  // ==========================================

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#f3f6fa',
        padding: '30px 20px',
        color: '#17233b'
      }}
    >
      <main style={{ maxWidth: '1350px', margin: 'auto' }}>

        {/* BACK BUTTON */}

        <button
          type="button"
          onClick={() => navigate('/admin-dashboard')}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#dc2626',
            cursor: 'pointer',
            marginBottom: '25px'
          }}
        >
          ← Back to Admin Dashboard
        </button>

        <h1 style={{ color: '#17233b' }}>
          Ambulance Management
        </h1>

        <p style={{ color: '#64748b', margin: '12px 0 28px' }}>
          Register ambulances, assign hospital drivers and
          monitor operational availability across MediRescue.
        </p>

        {/* ======================================
            REGISTRATION FORM
        ====================================== */}

        <section style={sectionStyle}>
          <h2 style={{ color: '#17233b', marginTop: 0 }}>
            Register New Ambulance
          </h2>

          <p style={{ color: '#64748b' }}>
            Enter the ambulance registration number and
            select its assigned hospital.
          </p>

          {formError && (
            <p role="alert" style={{ color: '#b91c1c' }}>
              {formError}
            </p>
          )}

          {success && (
            <p role="status" style={{ color: '#166534' }}>
              {success}
            </p>
          )}

          <form onSubmit={handleRegister}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(auto-fit, minmax(230px, 1fr))',
                gap: '18px',
                marginBottom: '20px'
              }}
            >
              <div>
                <label
                  htmlFor="register-plate"
                  style={labelStyle}
                >
                  Plate Number
                </label>

                <input
                  id="register-plate"
                  type="text"
                  required
                  maxLength={20}
                  placeholder="e.g. KAA 007G"
                  value={formData.plate_number}
                  onChange={(event) =>
                    setFormData({
                      ...formData,
                      plate_number: event.target.value
                    })
                  }
                  style={inputStyle}
                />
              </div>

              <div>
                <label
                  htmlFor="register-hospital"
                  style={labelStyle}
                >
                  Assigned Hospital
                </label>

                <select
                  id="register-hospital"
                  required
                  value={formData.hospital_id}
                  onChange={(event) =>
                    setFormData({
                      ...formData,
                      hospital_id: event.target.value
                    })
                  }
                  style={inputStyle}
                >
                  <option value="">Select a hospital</option>

                  {hospitals.map((hospital) => (
                    <option
                      key={hospital.id}
                      value={hospital.id}
                    >
                      {hospital.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving || hospitals.length === 0}
              style={{
                ...buttonStyle,
                backgroundColor: '#dc2626',
                opacity:
                  saving || hospitals.length === 0 ? 0.6 : 1
              }}
            >
              {saving
                ? 'Registering...'
                : 'Register Ambulance'}
            </button>
          </form>
        </section>

        {/* ======================================
            EDIT AMBULANCE FORM
        ====================================== */}

        {editingId !== null && (
          <section style={sectionStyle}>
            <h2 style={{ color: '#17233b', marginTop: 0 }}>
              Edit Ambulance #{editingId}
            </h2>

            <p style={{ color: '#64748b' }}>
              Update the ambulance details and assign an
              eligible driver from the selected hospital.
            </p>

            {editError && (
              <p role="alert" style={{ color: '#b91c1c' }}>
                {editError}
              </p>
            )}

            <form onSubmit={handleSaveEdit}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    'repeat(auto-fit, minmax(230px, 1fr))',
                  gap: '18px',
                  marginBottom: '20px'
                }}
              >
                {/* PLATE NUMBER */}

                <div>
                  <label
                    htmlFor="edit-plate"
                    style={labelStyle}
                  >
                    Plate Number
                  </label>

                  <input
                    id="edit-plate"
                    type="text"
                    required
                    maxLength={20}
                    value={editForm.plate_number}
                    onChange={(event) =>
                      setEditForm({
                        ...editForm,
                        plate_number: event.target.value
                      })
                    }
                    style={inputStyle}
                  />
                </div>

                {/* HOSPITAL */}

                <div>
                  <label
                    htmlFor="edit-hospital"
                    style={labelStyle}
                  >
                    Assigned Hospital
                  </label>

                  <select
                    id="edit-hospital"
                    required
                    value={editForm.hospital_id}
                    onChange={(event) =>
                      setEditForm({
                        ...editForm,
                        hospital_id: event.target.value,
                        driver_id: ''
                      })
                    }
                    style={inputStyle}
                  >
                    <option value="">Select a hospital</option>

                    {hospitals.map((hospital) => (
                      <option
                        key={hospital.id}
                        value={hospital.id}
                      >
                        {hospital.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* DRIVER */}

                <div>
                  <label
                    htmlFor="edit-driver"
                    style={labelStyle}
                  >
                    Assigned Driver
                  </label>

                  <select
                    id="edit-driver"
                    value={editForm.driver_id}
                    onChange={(event) =>
                      setEditForm({
                        ...editForm,
                        driver_id: event.target.value
                      })
                    }
                    style={inputStyle}
                  >
                    <option value="">No driver assigned</option>

                    {eligibleDrivers.map((driver) => (
                      <option
                        key={driver.id}
                        value={driver.id}
                      >
                        {driver.name}
                      </option>
                    ))}
                  </select>

                  <p
                    style={{
                      fontSize: '12px',
                      color: '#64748b'
                    }}
                  >
                    Only unassigned drivers from the selected
                    hospital are displayed.
                  </p>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: '12px',
                  flexWrap: 'wrap'
                }}
              >
                <button
                  type="submit"
                  disabled={editSaving}
                  style={{
                    ...buttonStyle,
                    backgroundColor: '#2563eb'
                  }}
                >
                  {editSaving
                    ? 'Saving...'
                    : 'Save Changes'}
                </button>

                <button
                  type="button"
                  disabled={editSaving}
                  onClick={handleCancelEdit}
                  style={{
                    ...buttonStyle,
                    backgroundColor: '#64748b'
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </section>
        )}

        {/* ======================================
            AMBULANCE RECORDS
        ====================================== */}

        <section style={sectionStyle}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '15px',
              marginBottom: '22px'
            }}
          >
            <h2 style={{ color: '#17233b', margin: 0 }}>
              Registered Ambulances ({filteredAmbulances.length})
            </h2>

            <button
              type="button"
              disabled={loading}
              onClick={loadAmbulances}
              style={{
                ...buttonStyle,
                backgroundColor: '#dc2626'
              }}
            >
              {loading ? 'Loading...' : 'Refresh Records'}
            </button>
          </div>

          {editSuccess && (
            <p role="status" style={{ color: '#166534' }}>
              {editSuccess}
            </p>
          )}

          {editError && editingId === null && (
            <p role="alert" style={{ color: '#b91c1c' }}>
              {editError}
            </p>
          )}

          {/* SEARCH AND STATUS FILTER */}

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '12px',
              marginBottom: '24px'
            }}
          >
            <input
              type="search"
              placeholder="Search plate, hospital or driver..."
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              style={{
                ...inputStyle,
                flex: '1 1 260px',
                width: 'auto'
              }}
            />

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value)
              }
              style={{
                ...inputStyle,
                width: 'auto'
              }}
            >
              <option value="all">All Statuses</option>
              <option value="available">Available</option>
              <option value="dispatched">Dispatched</option>
              <option value="en_route">En Route</option>
              <option value="returning">Returning</option>
            </select>
          </div>

          {error && (
            <p role="alert" style={{ color: '#b91c1c' }}>
              {error}
            </p>
          )}

          {loading ? (
            <p>Loading ambulance records...</p>
          ) : !error && filteredAmbulances.length === 0 ? (
            <p>No ambulances match your filters.</p>
          ) : !error ? (
            <div style={{ overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  minWidth: '1050px',
                  borderCollapse: 'collapse'
                }}
              >
                <thead>
                  <tr>
                    {[
                      'ID',
                      'Plate Number',
                      'Hospital',
                      'Driver',
                      'Status',
                      'Latitude',
                      'Longitude',
                      'Actions'
                    ].map((heading) => (
                      <th
                        key={heading}
                        style={{
                          ...cellStyle,
                          borderBottom: '2px solid #cbd5e1'
                        }}
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {filteredAmbulances.map((item) => (
                    <tr key={item.id}>
                      <td style={cellStyle}>{item.id}</td>

                      <td style={cellStyle}>
                        {item.plate_number}
                      </td>

                      <td style={cellStyle}>
                        {item.hospital_name || 'Unknown hospital'}
                      </td>

                      <td style={cellStyle}>
                        {item.driver_name || 'Not assigned'}
                      </td>

                      <td style={cellStyle}>
                        {formatStatus(item.status)}
                      </td>

                      <td style={cellStyle}>
                        {formatCoordinate(item.current_lat)}
                      </td>

                      <td style={cellStyle}>
                        {formatCoordinate(item.current_lng)}
                      </td>

                      <td style={cellStyle}>
                        <button
                          type="button"
                          disabled={
                            item.status !== 'available' ||
                            editSaving
                          }
                          onClick={() => handleEdit(item)}
                          style={{
                            ...buttonStyle,
                            padding: '8px 15px',
                            backgroundColor: '#2563eb',
                            opacity:
                              item.status !== 'available'
                                ? 0.5
                                : 1
                          }}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      </main>
    </div>
  )
}

export default AmbulanceManagement
