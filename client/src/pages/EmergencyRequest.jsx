
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

function EmergencyRequest() {
  const navigate = useNavigate()

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
  // GET PATIENT CURRENT LOCATION
  // ==========================================

  const getCurrentLocation = () => {
    setError('')
    setLocationLoading(true)
    setLocationFound(false)

    if (!navigator.geolocation) {
      setError(
        'Location services are not supported by this browser.'
      )

      setLocationLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData((current) => ({
          ...current,
          pickup_lat: position.coords.latitude,
          pickup_lng: position.coords.longitude
        }))

        setLocationFound(true)
        setLocationLoading(false)
      },

      (locationError) => {
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

    if (loading) return

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

      // ==========================================
      // DISPLAY SELECTED HOSPITAL
      // ==========================================

      const hospitalName =
        data.hospital?.name || 'Nearest Hospital'

      const distance =
        data.distance_km !== undefined
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
        `${hospitalName} has been selected as your nearest hospital` +
        `${distance ? ` (${distance})` : ''}. ` +
        `Estimated emergency service charge: ${formattedAmount}. ` +
        `Emergency assistance does not require advance payment.`
      )

      // ==========================================
      // RESET FORM AFTER SUCCESS
      // ==========================================

      setFormData(initialFormData)
      setLocationFound(false)

    } catch (err) {
      setError(
        err.message || 'Failed to send emergency request.'
      )

    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="emergency-page">
      <div className="emergency-form-card">

        <button
          type="button"
          className="back-dashboard"
          onClick={() => navigate('/patient-dashboard')}
        >
          ← Back to Dashboard
        </button>

        <div className="emergency-heading">
          <p>
            MEDIRESCUE EMERGENCY RESPONSE
          </p>

          <h1>
            Request Emergency Help
          </h1>

          <span>
            Describe your emergency and share your
            location. MediRescue will connect you
            with the nearest hospital.
          </span>
        </div>

        {/* ERROR MESSAGE */}

        {error && (
          <div className="login-error" role="alert">
            {error}
          </div>
        )}

        {/* SUCCESS MESSAGE */}

        {success && (
          <div
            className="success-message"
            role="status"
            aria-live="polite"
          >
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>

          {/* EMERGENCY TYPE */}

          <div className="form-group">
            <label htmlFor="emergency_type">
              Emergency Type
            </label>

            <select
              id="emergency_type"
              name="emergency_type"
              value={formData.emergency_type}
              onChange={handleChange}
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

          {/* EMERGENCY DESCRIPTION */}

          <div className="form-group">
            <label htmlFor="emergency_desc">
              Emergency Description
            </label>

            <textarea
              id="emergency_desc"
              name="emergency_desc"
              value={formData.emergency_desc}
              onChange={handleChange}
              placeholder="Briefly describe the emergency..."
              rows="4"
            />
          </div>

          {/* EMERGENCY SEVERITY */}

          <div className="form-group">
            <label htmlFor="severity">
              Emergency Severity
            </label>

            <select
              id="severity"
              name="severity"
              value={formData.severity}
              onChange={handleChange}
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

            <p
              style={{
                color: '#64748b',
                fontSize: '13px',
                marginTop: '8px',
                lineHeight: 1.5
              }}
            >
              Select the level that best describes
              the emergency. Hospital staff will
              assess the patient's actual urgency.
            </p>
          </div>

          {/* LOCATION DETECTION */}

          <div className="form-group">
            <label>
              Emergency Location
            </label>

            <button
              type="button"
              className="location-button"
              onClick={getCurrentLocation}
              disabled={locationLoading || loading}
            >
              {locationLoading
                ? 'Detecting Location...'
                : locationFound
                  ? '✓ Location Detected'
                  : 'Use My Current Location'}
            </button>

            {locationFound && (
              <p className="location-success">
                Your location has been detected successfully.
              </p>
            )}
          </div>

          {/* SUBMIT EMERGENCY REQUEST */}

          <button
            type="submit"
            className="emergency-submit"
            disabled={loading || locationLoading}
          >
            {loading
              ? 'Finding Nearest Hospital...'
              : 'Send Emergency Request'}
          </button>

        </form>
      </div>
    </div>
  )
}

export default EmergencyRequest
