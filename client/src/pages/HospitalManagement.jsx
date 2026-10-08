
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const API_URL = 'http://localhost:5000/api/admin/hospitals'

const emptyForm = {
  name: '',
  location: '',
  latitude: '',
  longitude: ''
}

function HospitalManagement() {
  const navigate = useNavigate()

  const [hospitals, setHospitals] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const getToken = () =>
    localStorage.getItem('medirescue_token')

  const handleUnauthorized = () => {
    localStorage.removeItem('medirescue_token')
    localStorage.removeItem('medirescue_user')
    navigate('/login', { replace: true })
  }

  // ==========================================
  // LOAD REGISTERED HOSPITALS
  // ==========================================

  const loadHospitals = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch(API_URL, {
        headers: {
          Authorization: `Bearer ${getToken()}`
        }
      })

      if (response.status === 401 || response.status === 403) {
        handleUnauthorized()
        return
      }

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load hospitals')
      }

      if (!Array.isArray(data)) {
        throw new Error('Unexpected hospital response')
      }

      setHospitals(data)

    } catch (err) {
      setError(err.message || 'Unable to load hospitals')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadHospitals()
  }, [])

  // ==========================================
  // HANDLE FORM CHANGES
  // ==========================================

  const handleChange = (e) => {
    setForm((current) => ({
      ...current,
      [e.target.name]: e.target.value
    }))
  }

  // ==========================================
  // EDIT EXISTING HOSPITAL
  // ==========================================

  const handleEdit = (hospital) => {
    setEditingId(hospital.id)

    setForm({
      name: hospital.name,
      location: hospital.location || '',
      latitude: String(hospital.latitude ?? ''),
      longitude: String(hospital.longitude ?? '')
    })

    setError('')
    setMessage('')

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }

  const handleCancel = () => {
    setEditingId(null)
    setForm(emptyForm)
    setError('')
  }

  // ==========================================
  // ADD OR UPDATE HOSPITAL
  // ==========================================

  const handleSubmit = async (e) => {
    e.preventDefault()

    setSaving(true)
    setError('')
    setMessage('')

    const isEditing = editingId !== null

    try {
      const response = await fetch(
        isEditing ? `${API_URL}/${editingId}` : API_URL,
        {
          method: isEditing ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${getToken()}`
          },
          body: JSON.stringify(form)
        }
      )

      if (response.status === 401 || response.status === 403) {
        handleUnauthorized()
        return
      }

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Unable to save hospital')
      }

      setEditingId(null)
      setForm(emptyForm)

      await loadHospitals()

      setMessage(
        isEditing
          ? 'Hospital updated successfully.'
          : 'Hospital added successfully.'
      )

    } catch (err) {
      setError(err.message || 'Unable to save hospital')
    } finally {
      setSaving(false)
    }
  }

  // ==========================================
  // STYLES
  // ==========================================

  const inputStyle = {
    display: 'block',
    width: '100%',
    padding: '12px',
    border: '1px solid #cbd5e1',
    borderRadius: '7px',
    background: '#ffffff',
    color: '#17233b',
    fontSize: '15px',
    marginTop: '8px',
    boxSizing: 'border-box'
  }

  const sectionStyle = {
    background: '#ffffff',
    padding: '25px',
    borderRadius: '12px',
    marginBottom: '28px',
    boxShadow: '0 3px 12px rgba(0,0,0,0.04)'
  }

  const headingStyle = {
    color: '#17233b',
    marginBottom: '20px'
  }

  const cellStyle = {
    padding: '12px',
    borderBottom: '1px solid #e2e8f0',
    color: '#17233b'
  }

  // ==========================================
  // PAGE
  // ==========================================

  return (
    <div
      className="hospital-management-page"
      style={{
        minHeight: '100vh',
        background: '#f3f6fa',
        padding: '30px 20px',
        color: '#17233b'
      }}
    >
      <main
        style={{
          maxWidth: '1150px',
          margin: 'auto'
        }}
      >
        {/* BACK BUTTON */}

        <button
          type="button"
          onClick={() => navigate('/admin-dashboard')}
          style={{
            border: 'none',
            background: 'transparent',
            color: '#dc2626',
            cursor: 'pointer',
            marginBottom: '24px',
            fontSize: '14px'
          }}
        >
          ← Back to Admin Dashboard
        </button>

        <h1
          style={{
            color: '#17233b',
            marginBottom: '12px'
          }}
        >
          Hospital Management
        </h1>

        <p
          style={{
            color: '#64748b',
            marginBottom: '28px'
          }}
        >
          Register hospitals and maintain their location details.
        </p>

        {/* HOSPITAL FORM */}

        <section style={sectionStyle}>
          <h2 style={headingStyle}>
            {editingId !== null
              ? 'Edit Hospital'
              : 'Add New Hospital'}
          </h2>

          {error && (
            <p
              role="alert"
              style={{
                color: '#b91c1c',
                marginBottom: '15px'
              }}
            >
              {error}
            </p>
          )}

          {message && (
            <p
              role="status"
              style={{
                color: '#15803d',
                marginBottom: '15px'
              }}
            >
              {message}
            </p>
          )}

          <form onSubmit={handleSubmit}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '18px'
              }}
            >
              <label>
                Hospital Name

                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  style={inputStyle}
                  maxLength={100}
                  required
                />
              </label>

              <label>
                Location

                <input
                  type="text"
                  name="location"
                  value={form.location}
                  onChange={handleChange}
                  style={inputStyle}
                  maxLength={150}
                  required
                />
              </label>

              <label>
                Latitude

                <input
                  type="number"
                  name="latitude"
                  value={form.latitude}
                  onChange={handleChange}
                  style={inputStyle}
                  step="any"
                  min="-90"
                  max="90"
                  required
                />
              </label>

              <label>
                Longitude

                <input
                  type="number"
                  name="longitude"
                  value={form.longitude}
                  onChange={handleChange}
                  style={inputStyle}
                  step="any"
                  min="-180"
                  max="180"
                  required
                />
              </label>
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
                disabled={saving}
                style={{
                  background: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '7px',
                  padding: '12px 22px',
                  cursor: saving ? 'not-allowed' : 'pointer'
                }}
              >
                {saving
                  ? 'Saving...'
                  : editingId !== null
                    ? 'Update Hospital'
                    : 'Add Hospital'}
              </button>

              {editingId !== null && (
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={saving}
                  style={{
                    padding: '12px 22px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '7px',
                    background: '#ffffff',
                    color: '#17233b',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </section>

        {/* REGISTERED HOSPITALS */}

        <section style={sectionStyle}>
          <h2 style={headingStyle}>
            Registered Hospitals ({hospitals.length})
          </h2>

          {loading ? (
            <p>Loading hospitals...</p>
          ) : hospitals.length === 0 ? (
            <p>No hospitals registered yet.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  textAlign: 'left'
                }}
              >
                <thead>
                  <tr>
                    {[
                      'ID',
                      'Hospital',
                      'Location',
                      'Latitude',
                      'Longitude',
                      'Action'
                    ].map((heading) => (
                      <th
                        key={heading}
                        style={{
                          ...cellStyle,
                          borderBottom: '2px solid #cbd5e1',
                          fontWeight: 'bold'
                        }}
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {hospitals.map((hospital) => (
                    <tr key={hospital.id}>
                      <td style={cellStyle}>
                        {hospital.id}
                      </td>

                      <td style={cellStyle}>
                        {hospital.name}
                      </td>

                      <td style={cellStyle}>
                        {hospital.location}
                      </td>

                      <td style={cellStyle}>
                        {hospital.latitude}
                      </td>

                      <td style={cellStyle}>
                        {hospital.longitude}
                      </td>

                      <td style={cellStyle}>
                        <button
                          type="button"
                          onClick={() => handleEdit(hospital)}
                          style={{
                            padding: '8px 14px',
                            border: '1px solid #dc2626',
                            color: '#dc2626',
                            background: '#ffffff',
                            borderRadius: '6px',
                            cursor: 'pointer'
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
          )}
        </section>
      </main>
    </div>
  )
}

export default HospitalManagement
