
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const API_BASE = 'http://localhost:5000/api/admin'

const initialForm = {
  name: '',
  email: '',
  password: '',
  hospital_id: ''
}

const initialEditForm = {
  name: '',
  email: '',
  hospital_id: ''
}

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

  const [form, setForm] = useState(initialForm)
  const [editForm, setEditForm] = useState(initialEditForm)
  const [editingId, setEditingId] = useState(null)

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')

  // ==========================================
  // AUTHENTICATION
  // ==========================================

  const getToken = () =>
    localStorage.getItem('medirescue_token')

  const handleUnauthorized = () => {
    localStorage.removeItem('medirescue_token')
    localStorage.removeItem('medirescue_user')
    navigate('/login', { replace: true })
  }

  const fetchJSON = async (url, options = {}) => {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...(options.body
          ? { 'Content-Type': 'application/json' }
          : {}),
        Authorization: `Bearer ${getToken()}`,
        ...options.headers
      }
    })

    if (response.status === 401 || response.status === 403) {
      handleUnauthorized()
      throw new Error('Session expired or access denied')
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
      throw new Error(
        data.error || `Request failed (${response.status})`
      )
    }

    return data
  }

  // ==========================================
  // LOAD STAFF AND HOSPITALS
  // ==========================================

  const loadRecords = async (signal) => {
    setLoading(true)
    setError('')

    try {
      if (!getToken()) {
        handleUnauthorized()
        return
      }

      const [staffData, hospitalData] = await Promise.all([
        fetchJSON(`${API_BASE}/staff`, { signal }),
        fetchJSON(`${API_BASE}/hospitals`, { signal })
      ])

      if (!Array.isArray(staffData)) {
        throw new Error('Unexpected staff response')
      }

      if (!Array.isArray(hospitalData)) {
        throw new Error('Unexpected hospital response')
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
      if (!signal?.aborted) {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    const controller = new AbortController()

    loadRecords(controller.signal)

    return () => controller.abort()
  }, [])

  // ==========================================
  // REGISTER HOSPITAL STAFF
  // ==========================================

  const handleChange = (event) => {
    const { name, value } = event.target

    setForm((previous) => ({
      ...previous,
      [name]: value
    }))

    setFormError('')
    setSuccess('')
  }

  const handleRegister = async (event) => {
    event.preventDefault()

    if (saving) return

    setSaving(true)
    setFormError('')
    setSuccess('')

    try {
      const name = form.name.trim()
      const email = form.email.trim().toLowerCase()

      if (!name || !email || !form.password || !form.hospital_id) {
        throw new Error('Please complete all fields')
      }

      if (
        form.password.length < 8 ||
        form.password.length > 72
      ) {
        throw new Error(
          'Password must contain 8 to 72 characters'
        )
      }

      const result = await fetchJSON(`${API_BASE}/staff`, {
        method: 'POST',
        body: JSON.stringify({
          name,
          email,
          password: form.password,
          hospital_id: Number(form.hospital_id)
        })
      })

      setSuccess(
        result.message || 'Hospital staff registered successfully'
      )

      setForm({ ...initialForm })

      await refreshStaffAfterSave()

    } catch (err) {
      setFormError(
        err.message || 'Failed to register hospital staff'
      )
    } finally {
      setSaving(false)
    }
  }

  // ==========================================
  // EDIT STAFF
  // ==========================================

  const handleEdit = (member) => {
    setEditingId(member.id)

    setEditForm({
      name: member.name || '',
      email: member.email || '',
      hospital_id: String(member.hospital_id ?? '')
    })

    setEditError('')
    setSuccess('')

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }

  const handleEditChange = (event) => {
    const { name, value } = event.target

    setEditForm((previous) => ({
      ...previous,
      [name]: value
    }))

    setEditError('')
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditForm({ ...initialEditForm })
    setEditError('')
  }

  const handleUpdate = async (event) => {
    event.preventDefault()

    if (updating || editingId === null) return

    setUpdating(true)
    setEditError('')
    setSuccess('')

    try {
      const name = editForm.name.trim()
      const email = editForm.email.trim().toLowerCase()

      if (!name || !email || !editForm.hospital_id) {
        throw new Error('Please complete all fields')
      }

      const result = await fetchJSON(
        `${API_BASE}/staff/${editingId}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            name,
            email,
            hospital_id: Number(editForm.hospital_id)
          })
        }
      )

      setSuccess(
        result.message || 'Staff details updated successfully'
      )

      handleCancelEdit()

      await refreshStaffAfterSave()

    } catch (err) {
      setEditError(
        err.message || 'Failed to update staff details'
      )
    } finally {
      setUpdating(false)
    }
  }

  // ==========================================
  // REFRESH STAFF AFTER REGISTRATION OR EDIT
  // ==========================================

  const refreshStaffAfterSave = async () => {
    try {
      const updatedStaff = await fetchJSON(
        `${API_BASE}/staff`
      )

      if (!Array.isArray(updatedStaff)) {
        throw new Error('Unexpected staff response')
      }

      setStaff(updatedStaff)
      setError('')

    } catch (refreshError) {
      setError(
        'Changes were saved, but the staff list could not refresh. ' +
        refreshError.message
      )
    }
  }

  // ==========================================
  // SEARCH AND FILTER
  // ==========================================

  const filteredStaff = staff.filter((member) => {
    const query = search.trim().toLowerCase()

    const matchesSearch = [
      member.id,
      member.name,
      member.email,
      member.hospital_name,
      member.role
    ].some((value) =>
      String(value ?? '').toLowerCase().includes(query)
    )

    const matchesRole =
      roleFilter === 'all' || member.role === roleFilter

    return matchesSearch && matchesRole
  })

  const formatRole = (role) => {
    if (role === 'hospital_staff') return 'Hospital Staff'
    if (role === 'driver') return 'Ambulance Driver'
    return role || 'Unknown'
  }

  // ==========================================
  // STYLES
  // ==========================================

  const inputStyle = {
    width: '100%',
    boxSizing: 'border-box',
    padding: '12px',
    border: '1px solid #cbd5e1',
    borderRadius: '7px',
    backgroundColor: '#ffffff',
    color: '#17233b',
    fontSize: '14px'
  }

  const labelStyle = {
    display: 'block',
    marginBottom: '8px',
    fontWeight: 600,
    color: '#17233b'
  }

  const cellStyle = {
    padding: '15px 12px',
    borderBottom: '1px solid #e2e8f0',
    textAlign: 'left',
    color: '#17233b'
  }

  const buttonStyle = {
    padding: '11px 20px',
    backgroundColor: '#dc2626',
    color: '#ffffff',
    border: 'none',
    borderRadius: '7px',
    fontWeight: 600,
    cursor: 'pointer'
  }

  const sectionStyle = {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 3px 12px rgba(0,0,0,0.04)',
    marginBottom: '24px'
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

        <h1 style={{ color: '#17233b', marginBottom: '10px' }}>
          Staff Management
        </h1>

        <p
          style={{
            color: '#64748b',
            marginBottom: '28px'
          }}
        >
          Register hospital staff, edit employee records,
          and monitor ambulance drivers and hospital
          assignments across MediRescue.
        </p>

        {/* SUCCESS MESSAGE */}

        {success && (
          <p
            role="status"
            style={{
              backgroundColor: '#dcfce7',
              color: '#166534',
              padding: '14px',
              borderRadius: '7px',
              marginBottom: '20px'
            }}
          >
            {success}
          </p>
        )}

        {/* ======================================
            STAFF REGISTRATION FORM
        ====================================== */}

        <section style={sectionStyle}>
          <h2 style={{ color: '#17233b', marginBottom: '8px' }}>
            Register New Hospital Staff
          </h2>

          <p
            style={{
              color: '#64748b',
              marginBottom: '22px'
            }}
          >
            Create a hospital staff account and assign
            the employee to a registered hospital.
          </p>

          {formError && (
            <p role="alert" style={{ color: '#b91c1c' }}>
              {formError}
            </p>
          )}

          <form onSubmit={handleRegister}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '18px'
              }}
            >
              <div>
                <label htmlFor="staff-name" style={labelStyle}>
                  Full Name
                </label>

                <input
                  id="staff-name"
                  name="name"
                  type="text"
                  placeholder="e.g. Mary Wanjiku"
                  value={form.name}
                  onChange={handleChange}
                  maxLength={100}
                  required
                  style={inputStyle}
                />
              </div>

              <div>
                <label htmlFor="staff-email" style={labelStyle}>
                  Email Address
                </label>

                <input
                  id="staff-email"
                  name="email"
                  type="email"
                  placeholder="e.g. mary@hospital.co.ke"
                  value={form.email}
                  onChange={handleChange}
                  maxLength={100}
                  required
                  style={inputStyle}
                />
              </div>

              <div>
                <label htmlFor="staff-password" style={labelStyle}>
                  Password
                </label>

                <input
                  id="staff-password"
                  name="password"
                  type="password"
                  placeholder="Minimum 8 characters"
                  value={form.password}
                  onChange={handleChange}
                  minLength={8}
                  maxLength={72}
                  autoComplete="new-password"
                  required
                  style={inputStyle}
                />
              </div>

              <div>
                <label htmlFor="staff-hospital" style={labelStyle}>
                  Assigned Hospital
                </label>

                <select
                  id="staff-hospital"
                  name="hospital_id"
                  value={form.hospital_id}
                  onChange={handleChange}
                  required
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
              disabled={saving || loading || hospitals.length === 0}
              style={{
                ...buttonStyle,
                marginTop: '22px',
                opacity: saving || loading ? 0.6 : 1
              }}
            >
              {saving
                ? 'Registering...'
                : 'Register Hospital Staff'}
            </button>
          </form>
        </section>

        {/* ======================================
            EDIT STAFF FORM
        ====================================== */}

        {editingId !== null && (
          <section style={sectionStyle}>
            <h2 style={{ color: '#17233b', marginBottom: '8px' }}>
              Edit Staff #{editingId}
            </h2>

            <p
              style={{
                color: '#64748b',
                marginBottom: '22px'
              }}
            >
              Update the employee's name, email address
              or assigned hospital.
            </p>

            {editError && (
              <p role="alert" style={{ color: '#b91c1c' }}>
                {editError}
              </p>
            )}

            <form onSubmit={handleUpdate}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '18px'
                }}
              >
                <div>
                  <label htmlFor="edit-name" style={labelStyle}>
                    Full Name
                  </label>

                  <input
                    id="edit-name"
                    name="name"
                    type="text"
                    value={editForm.name}
                    onChange={handleEditChange}
                    maxLength={100}
                    required
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label htmlFor="edit-email" style={labelStyle}>
                    Email Address
                  </label>

                  <input
                    id="edit-email"
                    name="email"
                    type="email"
                    value={editForm.email}
                    onChange={handleEditChange}
                    maxLength={100}
                    required
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label htmlFor="edit-hospital" style={labelStyle}>
                    Assigned Hospital
                  </label>

                  <select
                    id="edit-hospital"
                    name="hospital_id"
                    value={editForm.hospital_id}
                    onChange={handleEditChange}
                    required
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

              <div
                style={{
                  display: 'flex',
                  gap: '12px',
                  marginTop: '22px',
                  flexWrap: 'wrap'
                }}
              >
                <button
                  type="submit"
                  disabled={updating}
                  style={{
                    ...buttonStyle,
                    backgroundColor: '#2563eb',
                    opacity: updating ? 0.6 : 1
                  }}
                >
                  {updating ? 'Saving...' : 'Save Changes'}
                </button>

                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={updating}
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
            REGISTERED STAFF TABLE
        ====================================== */}

        <section style={sectionStyle}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '15px',
              marginBottom: '22px'
            }}
          >
            <h2 style={{ color: '#17233b', margin: 0 }}>
              Registered Staff ({filteredStaff.length})
            </h2>

            <button
              type="button"
              disabled={loading}
              onClick={() => loadRecords()}
              style={{
                ...buttonStyle,
                opacity: loading ? 0.6 : 1
              }}
            >
              {loading ? 'Loading...' : 'Refresh Records'}
            </button>
          </div>

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
              placeholder="Search name, email or hospital..."
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
              value={roleFilter}
              onChange={(event) =>
                setRoleFilter(event.target.value)
              }
              style={{
                ...inputStyle,
                width: 'auto'
              }}
            >
              <option value="all">All Roles</option>
              <option value="hospital_staff">
                Hospital Staff
              </option>
              <option value="driver">
                Ambulance Drivers
              </option>
            </select>
          </div>

          {error && (
            <p role="alert" style={{ color: '#b91c1c' }}>
              {error}
            </p>
          )}

          {loading ? (
            <p>Loading staff records...</p>
          ) : !error && filteredStaff.length === 0 ? (
            <p>No staff members match your filters.</p>
          ) : !error ? (
            <div style={{ overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  minWidth: '950px',
                  borderCollapse: 'collapse'
                }}
              >
                <thead>
                  <tr>
                    {[
                      'ID',
                      'Full Name',
                      'Email Address',
                      'Role',
                      'Assigned Hospital',
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
                  {filteredStaff.map((member) => (
                    <tr key={member.id}>
                      <td style={cellStyle}>
                        {member.id}
                      </td>

                      <td style={cellStyle}>
                        {member.name || 'Unknown'}
                      </td>

                      <td style={cellStyle}>
                        {member.email}
                      </td>

                      <td style={cellStyle}>
                        {formatRole(member.role)}
                      </td>

                      <td style={cellStyle}>
                        {member.hospital_name || 'Not assigned'}
                      </td>

                      <td style={cellStyle}>
                        <button
                          type="button"
                          onClick={() => handleEdit(member)}
                          style={{
                            ...buttonStyle,
                            backgroundColor: '#2563eb',
                            padding: '8px 16px'
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

export default StaffManagement
