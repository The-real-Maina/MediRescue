
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

// ==========================================
// MEDIRESCUE EMERGENCY REQUEST STYLES
// LIGHT MODE — INLINE CSS
// ==========================================

const styles = {
  page: {
    minHeight: '100vh',
    background: '#f1f5f9',
    color: '#17233b',
    fontFamily: "'Segoe UI', Arial, sans-serif"
  },

  header: {
    background: '#10243a',
    borderBottom: '4px solid #dc2626',
    padding: '18px 5%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    flexWrap: 'wrap'
  },

  brand: {
    color: '#ffffff',
    fontSize: 25,
    fontWeight: 800,
    margin: 0
  },

  portal: {
    color: '#cbd5e1',
    fontSize: 10,
    letterSpacing: 1.6,
    marginTop: 5
  },

  headerButton: {
    background: 'transparent',
    border: '1px solid #64748b',
    color: '#ffffff',
    borderRadius: 8,
    padding: '11px 16px',
    fontWeight: 700,
    cursor: 'pointer'
  },

  container: {
    maxWidth: 950,
    margin: '0 auto',
    padding: '40px 20px 65px'
  },

  backButton: {
    border: 'none',
    background: 'transparent',
    color: '#dc2626',
    fontWeight: 700,
    fontSize: 14,
    cursor: 'pointer',
    padding: 0,
    marginBottom: 26
  },

  eyebrow: {
    color: '#dc2626',
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: 1.5,
    marginBottom: 10
  },

  title: {
    color: '#10243a',
    fontSize: 'clamp(28px, 4vw, 38px)',
    fontWeight: 800,
    margin: '0 0 12px'
  },

  subtitle: {
    color: '#64748b',
    fontSize: 15,
    lineHeight: 1.7,
    margin: 0
  },

  notice: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 15,
    background: '#fff1f2',
    border: '1px solid #fecdd3',
    borderLeft: '5px solid #dc2626',
    borderRadius: 12,
    padding: '20px 22px',
    marginTop: 28,
    marginBottom: 28
  },

  noticeIcon: {
    fontSize: 27,
    lineHeight: 1
  },

  noticeTitle: {
    color: '#991b1b',
    fontWeight: 800,
    fontSize: 16,
    margin: '0 0 7px'
  },

  noticeText: {
    color: '#7f1d1d',
    fontSize: 13,
    lineHeight: 1.7,
    margin: 0
  },

  card: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: 16,
    padding: 'clamp(20px, 4vw, 36px)',
    boxShadow: '0 8px 28px rgba(15,23,42,0.05)'
  },

  sectionHeading: {
    color: '#10243a',
    fontSize: 20,
    fontWeight: 800,
    margin: '0 0 8px'
  },

  sectionDescription: {
    color: '#64748b',
    fontSize: 13,
    lineHeight: 1.6,
    margin: '0 0 25px'
  },

  divider: {
    height: 1,
    background: '#e2e8f0',
    border: 'none',
    margin: '30px 0'
  },

  formGroup: {
    marginBottom: 23
  },

  label: {
    display: 'block',
    color: '#334155',
    fontSize: 14,
    fontWeight: 700,
    marginBottom: 9
  },

  input: {
    display: 'block',
    width: '100%',
    boxSizing: 'border-box',
    padding: '13px 14px',
    border: '1px solid #cbd5e1',
    borderRadius: 9,
    background: '#ffffff',
    color: '#17233b',
    fontFamily: 'inherit',
    fontSize: 14,
    outlineColor: '#dc2626'
  },

  textarea: {
    display: 'block',
    width: '100%',
    boxSizing: 'border-box',
    minHeight: 125,
    resize: 'vertical',
    padding: '13px 14px',
    border: '1px solid #cbd5e1',
    borderRadius: 9,
    background: '#ffffff',
    color: '#17233b',
    fontFamily: 'inherit',
    fontSize: 14,
    lineHeight: 1.6,
    outlineColor: '#dc2626'
  },

  helpText: {
    color: '#64748b',
    fontSize: 12,
    lineHeight: 1.6,
    marginTop: 8
  },

  locationBox: {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: 12,
    padding: 20
  },

  locationButton: {
    width: '100%',
    padding: '14px 18px',
    background: '#ffffff',
    border: '2px solid #dc2626',
    borderRadius: 9,
    color: '#dc2626',
    fontSize: 14,
    fontWeight: 800,
    cursor: 'pointer'
  },

  locationSuccess: {
    background: '#dcfce7',
    color: '#166534',
    borderRadius: 8,
    padding: '12px 14px',
    fontSize: 13,
    fontWeight: 700,
    marginTop: 14,
    lineHeight: 1.6
  },

  hospitalCard: {
    marginTop: 18,
    padding: 22,
    background: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderLeft: '5px solid #2563eb',
    borderRadius: 12
  },

  hospitalHeading: {
    color: '#1e40af',
    fontSize: 16,
    fontWeight: 800,
    margin: '0 0 14px'
  },

  hospitalName: {
    color: '#10243a',
    fontSize: 19,
    fontWeight: 800,
    margin: '0 0 12px'
  },

  hospitalDetail: {
    color: '#334155',
    fontSize: 14,
    lineHeight: 1.7,
    margin: '7px 0'
  },

  hospitalNotice: {
    color: '#64748b',
    fontSize: 12,
    lineHeight: 1.7,
    margin: '15px 0 0'
  },

  error: {
    background: '#fee2e2',
    color: '#991b1b',
    border: '1px solid #fecaca',
    borderRadius: 9,
    padding: 16,
    fontSize: 14,
    lineHeight: 1.7,
    marginBottom: 22
  },

  success: {
    background: '#ecfdf5',
    color: '#166534',
    border: '1px solid #bbf7d0',
    borderRadius: 9,
    padding: 18,
    fontSize: 14,
    lineHeight: 1.8,
    marginBottom: 22
  },

  submitButton: {
    width: '100%',
    padding: '16px 22px',
    background: '#dc2626',
    color: '#ffffff',
    border: 'none',
    borderRadius: 10,
    fontSize: 15,
    fontWeight: 800,
    cursor: 'pointer'
  },

  footer: {
    color: '#94a3b8',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 35
  }
}

// ==========================================
// EMERGENCY REQUEST COMPONENT
// ==========================================

function EmergencyRequest() {
  const navigate = useNavigate()

  const locationRequestRef = useRef(0)

  const initialFormData = {
    emergency_type: '',
    emergency_desc: '',
    severity: 'moderate',
    pickup_lat: '',
    pickup_lng: ''
  }

  const [formData, setFormData] = useState(initialFormData)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [loading, setLoading] = useState(false)

  const [locationLoading, setLocationLoading] = useState(false)
  const [locationFound, setLocationFound] = useState(false)

  const [nearestHospital, setNearestHospital] = useState(null)
  const [hospitalLoading, setHospitalLoading] = useState(false)
  const [hospitalError, setHospitalError] = useState('')

  // ==========================================
  // HANDLE FORM INPUT
  // ==========================================

  const handleChange = (e) => {
    const { name, value } = e.target

    setFormData((current) => ({
      ...current,
      [name]: value
    }))
  }

  // ==========================================
  // FETCH NEAREST HOSPITAL PREVIEW
  // ==========================================

  const fetchNearestHospital = async (
    latitude,
    longitude,
    requestId
  ) => {
    setHospitalLoading(true)
    setHospitalError('')
    setNearestHospital(null)

    try {
      const token = localStorage.getItem('medirescue_token')

      if (!token) {
        navigate('/login')
        return
      }

      const response = await fetch(
        'http://localhost:5000/api/cases/nearest-hospital',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            pickup_lat: latitude,
            pickup_lng: longitude
          })
        }
      )

      const data = await response.json()

      // Ignore results from older GPS requests.
      if (requestId !== locationRequestRef.current) {
        return
      }

      if (response.status === 401) {
        navigate('/login')
        return
      }

      if (!response.ok) {
        throw new Error(
          data.error || 'Unable to identify the nearest hospital.'
        )
      }

      if (!data.hospital?.id || !data.hospital?.name) {
        throw new Error(
          'The hospital preview response is incomplete.'
        )
      }

      setNearestHospital({
        id: data.hospital.id,
        name: data.hospital.name,
        location: data.hospital.location,
        distance_km: data.distance_km
      })

    } catch (err) {
      if (requestId === locationRequestRef.current) {
        setHospitalError(
          err.message || 'Unable to identify the nearest hospital.'
        )
      }
    } finally {
      if (requestId === locationRequestRef.current) {
        setHospitalLoading(false)
      }
    }
  }

  // ==========================================
  // GET CURRENT GPS LOCATION
  // ==========================================

  const getCurrentLocation = () => {
    const requestId = ++locationRequestRef.current

    setError('')
    setSuccess('')

    setLocationLoading(true)
    setLocationFound(false)

    setNearestHospital(null)
    setHospitalLoading(false)
    setHospitalError('')

    setFormData((current) => ({
      ...current,
      pickup_lat: '',
      pickup_lng: ''
    }))

    if (!navigator.geolocation) {
      setError(
        'Location services are not supported by this browser.'
      )

      setLocationLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (requestId !== locationRequestRef.current) {
          return
        }

        const latitude = position.coords.latitude
        const longitude = position.coords.longitude

        setFormData((current) => ({
          ...current,
          pickup_lat: latitude,
          pickup_lng: longitude
        }))

        setLocationFound(true)
        setLocationLoading(false)

        // Automatically preview the nearest hospital.
        fetchNearestHospital(
          latitude,
          longitude,
          requestId
        )
      },

      (locationError) => {
        if (requestId !== locationRequestRef.current) {
          return
        }

        setLocationLoading(false)
        setLocationFound(false)

        if (locationError.code === 1) {
          setError(
            'Location permission was denied. Please allow location access and try again.'
          )
        } else if (locationError.code === 2) {
          setError(
            'Your current location could not be determined.'
          )
        } else {
          setError(
            'Location request timed out. Please try again.'
          )
        }
      },

      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    )
  }

  // ==========================================
  // SEND EMERGENCY REQUEST
  // ==========================================

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (loading || locationLoading) return

    setError('')
    setSuccess('')

    if (
      formData.pickup_lat === '' ||
      formData.pickup_lng === ''
    ) {
      setError(
        'Please allow MediRescue to detect your current location first.'
      )
      return
    }

    const validSeverities = [
      'low',
      'moderate',
      'high',
      'critical'
    ]

    if (!validSeverities.includes(formData.severity)) {
      setError('Please select a valid emergency severity.')
      return
    }

    const token = localStorage.getItem('medirescue_token')

    if (!token) {
      navigate('/login')
      return
    }

    setLoading(true)

    try {
      const response = await fetch(
        'http://localhost:5000/api/cases',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            emergency_type: formData.emergency_type,
            emergency_desc: formData.emergency_desc,
            severity: formData.severity,
            pickup_lat: Number(formData.pickup_lat),
            pickup_lng: Number(formData.pickup_lng)
          })
        }
      )

      const data = await response.json()

      if (response.status === 401) {
        navigate('/login')
        return
      }

      if (!response.ok) {
        throw new Error(
          data.error || 'Failed to create emergency request'
        )
      }

      // Use the hospital returned by the actual
      // case creation endpoint, not the preview.
      const hospitalName =
        data.hospital?.name || 'Hospital name unavailable'

      const distance =
        data.distance_km !== undefined &&
        data.distance_km !== null
          ? `${data.distance_km} km away`
          : ''

      const paymentAmount =
        data.payment_amount !== null &&
        data.payment_amount !== undefined
          ? Number(data.payment_amount)
          : null

      const formattedAmount =
        paymentAmount !== null &&
        Number.isFinite(paymentAmount)
          ? `KSh ${paymentAmount.toLocaleString('en-KE', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}`
          : 'Pending hospital pricing'

      setSuccess(
        `Emergency request sent successfully. ` +
        `Case ID: ${data.case_id}. ` +
        `Assigned hospital: ${hospitalName}` +
        `${distance ? ` (${distance})` : ''}. ` +
        `Estimated emergency service charge: ${formattedAmount}. ` +
        `Emergency assistance does not require advance payment.`
      )

      // Invalidate any outstanding preview request.
      locationRequestRef.current += 1

      setFormData(initialFormData)
      setLocationFound(false)
      setNearestHospital(null)
      setHospitalError('')
      setHospitalLoading(false)

    } catch (err) {
      setError(
        err.message || 'Failed to send emergency request.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.page}>

      {/* HEADER */}
      <header style={styles.header}>
        <div>
          <h2 style={styles.brand}>
            ✚ MediRescue
          </h2>

          <div style={styles.portal}>
            EMERGENCY RESPONSE PORTAL
          </div>
        </div>

        <button
          type="button"
          style={styles.headerButton}
          onClick={() => navigate('/patient-dashboard')}
        >
          ← Dashboard
        </button>
      </header>

      <main style={styles.container}>

        <button
          type="button"
          style={styles.backButton}
          onClick={() => navigate('/patient-dashboard')}
        >
          ← Back to Patient Dashboard
        </button>

        {/* PAGE INTRODUCTION */}
        <section>
          <p style={styles.eyebrow}>
            MEDIRESCUE EMERGENCY RESPONSE
          </p>

          <h1 style={styles.title}>
            Request Emergency Help
          </h1>

          <p style={styles.subtitle}>
            Describe your emergency and share your
            current location. MediRescue will use
            this information to identify the nearest
            available hospital.
          </p>
        </section>

        {/* EMERGENCY NOTICE */}
        <section style={styles.notice}>
          <div style={styles.noticeIcon}>
            🚨
          </div>

          <div>
            <h3 style={styles.noticeTitle}>
              Emergency Assistance
            </h3>

            <p style={styles.noticeText}>
              Complete the form below to request
              medical assistance. For an immediate
              life-threatening emergency, contact
              local emergency services directly.
              Do not delay urgent care while using
              this application.
            </p>
          </div>
        </section>

        {/* ERROR MESSAGE */}
        {error && (
          <div style={styles.error} role="alert">
            <strong>Request Error</strong>
            <div>{error}</div>
          </div>
        )}

        {/* SUCCESS MESSAGE */}
        {success && (
          <div
            style={styles.success}
            role="status"
            aria-live="polite"
          >
            <strong>Emergency Request Submitted</strong>

            <div>{success}</div>

            <button
              type="button"
              onClick={() => navigate('/my-cases')}
              style={{
                marginTop: 15,
                padding: '11px 16px',
                background: '#166534',
                color: '#ffffff',
                border: 'none',
                borderRadius: 8,
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              View My Cases →
            </button>
          </div>
        )}

        {/* EMERGENCY FORM */}
        <div style={styles.card}>
          <form onSubmit={handleSubmit}>

            {/* EMERGENCY DETAILS */}
            <section>
              <h2 style={styles.sectionHeading}>
                01. Emergency Details
              </h2>

              <p style={styles.sectionDescription}>
                Tell us what has happened so the
                responding medical team has useful
                information about the situation.
              </p>

              <div style={styles.formGroup}>
                <label
                  htmlFor="emergency_type"
                  style={styles.label}
                >
                  Emergency Type
                </label>

                <select
                  id="emergency_type"
                  name="emergency_type"
                  value={formData.emergency_type}
                  onChange={handleChange}
                  style={styles.input}
                  required
                >
                  <option value="">
                    Select emergency type
                  </option>

                  <option value="Accident">
                    Accident
                  </option>

                  <option value="Medical Emergency">
                    Medical Emergency
                  </option>

                  <option value="Injury">
                    Injury
                  </option>

                  <option value="Other">
                    Other
                  </option>
                </select>
              </div>

              <div style={styles.formGroup}>
                <label
                  htmlFor="emergency_desc"
                  style={styles.label}
                >
                  Emergency Description
                </label>

                <textarea
                  id="emergency_desc"
                  name="emergency_desc"
                  value={formData.emergency_desc}
                  onChange={handleChange}
                  placeholder="Briefly describe what happened, the patient's condition, or any important details..."
                  rows={4}
                  style={styles.textarea}
                />
              </div>

              <div style={styles.formGroup}>
                <label
                  htmlFor="severity"
                  style={styles.label}
                >
                  Emergency Severity
                </label>

                <select
                  id="severity"
                  name="severity"
                  value={formData.severity}
                  onChange={handleChange}
                  style={styles.input}
                  required
                >
                  <option value="low">
                    Low
                  </option>

                  <option value="moderate">
                    Moderate
                  </option>

                  <option value="high">
                    High
                  </option>

                  <option value="critical">
                    Critical
                  </option>
                </select>

                <p style={styles.helpText}>
                  Select the level that best describes
                  the emergency. Hospital staff will
                  assess the patient's actual urgency.
                </p>
              </div>
            </section>

            <hr style={styles.divider} />

            {/* LOCATION DETAILS */}
            <section>
              <h2 style={styles.sectionHeading}>
                02. Emergency Location
              </h2>

              <p style={styles.sectionDescription}>
                Your current GPS location is needed
                to identify the nearest hospital.
                Allow browser location permission
                when prompted.
              </p>

              <div style={styles.locationBox}>
                <button
                  type="button"
                  style={{
                    ...styles.locationButton,
                    opacity:
                      locationLoading || loading ? 0.6 : 1
                  }}
                  onClick={getCurrentLocation}
                  disabled={locationLoading || loading}
                >
                  {locationLoading
                    ? '⌛ Detecting Location...'
                    : locationFound
                      ? '✓ Location Detected — Refresh Location'
                      : '📍 Use My Current Location'}
                </button>

                {/* LOCATION SUCCESS */}
                {locationFound && (
                  <div
                    style={styles.locationSuccess}
                    role="status"
                  >
                    ✓ Your location has been detected
                    successfully and is ready to be
                    submitted with your request.
                  </div>
                )}

                {/* HOSPITAL LOADING */}
                {hospitalLoading && (
                  <p
                    style={styles.helpText}
                    role="status"
                  >
                    🔎 Identifying your nearest hospital...
                  </p>
                )}

                {/* HOSPITAL ERROR */}
                {hospitalError && (
                  <div
                    style={{
                      ...styles.error,
                      marginTop: 14,
                      marginBottom: 0
                    }}
                    role="alert"
                  >
                    {hospitalError}
                  </div>
                )}

                {/* NEAREST HOSPITAL PREVIEW */}
                {nearestHospital && (
                  <div style={styles.hospitalCard}>
                    <h3 style={styles.hospitalHeading}>
                      🏥 Nearest Hospital Identified
                    </h3>

                    <p style={styles.hospitalName}>
                      {nearestHospital.name}
                    </p>

                    <p style={styles.hospitalDetail}>
                      📍 {nearestHospital.location}
                    </p>

                    {nearestHospital.distance_km !== undefined &&
                      nearestHospital.distance_km !== null && (
                        <p style={styles.hospitalDetail}>
                          📏 Distance:{' '}
                          <strong>
                            {nearestHospital.distance_km} km
                          </strong>
                          {' '}(straight-line)
                        </p>
                      )}

                    <p style={styles.hospitalNotice}>
                      This is the nearest hospital
                      identified from your GPS location
                      among hospitals registered in
                      MediRescue. Your emergency request
                      has not been submitted yet.
                    </p>
                  </div>
                )}

                <p style={styles.helpText}>
                  Your browser may request permission
                  to access your device's location.
                </p>
              </div>
            </section>

            <hr style={styles.divider} />

            {/* SUBMIT REQUEST */}
            <section>
              <h2 style={styles.sectionHeading}>
                03. Submit Emergency Request
              </h2>

              <p style={styles.sectionDescription}>
                Confirm your details and submit
                the request to MediRescue.
                No advance payment is required
                to request emergency assistance.
              </p>

              <button
                type="submit"
                style={{
                  ...styles.submitButton,
                  opacity:
                    loading || locationLoading ? 0.65 : 1
                }}
                disabled={loading || locationLoading}
              >
                {loading
                  ? 'Finding Nearest Hospital...'
                  : '🚑 Send Emergency Request →'}
              </button>
            </section>

          </form>
        </div>

        {/* FOOTER */}
        <footer style={styles.footer}>
          © {new Date().getFullYear()} MediRescue
          {' '}• Emergency Medical Response System
        </footer>

      </main>
    </div>
  )
}

export default EmergencyRequest
