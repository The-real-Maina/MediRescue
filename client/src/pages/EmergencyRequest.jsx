import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

function EmergencyRequest() {
  const navigate = useNavigate()

  const [formData, setFormData] = useState({
    emergency_type: '',
    emergency_desc: '',
    severity: 'moderate',
    pickup_lat: '',
    pickup_lng: ''
  })

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [locationLoading, setLocationLoading] = useState(false)
  const [locationFound, setLocationFound] = useState(false)

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  // ==========================================
  // GET PATIENT CURRENT LOCATION
  // ==========================================

  const getCurrentLocation = () => {
    setError('')
    setLocationLoading(true)

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

    setError('')
    setSuccess('')

    if (!formData.pickup_lat || !formData.pickup_lng) {
      setError(
        'Please allow MediRescue to detect your current location first.'
      )
      return
    }

    setLoading(true)

    const token =
      localStorage.getItem('medirescue_token')

    if (!token) {
      setLoading(false)
      navigate('/login')
      return
    }

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

            pickup_lat:
              Number(formData.pickup_lat),

            pickup_lng:
              Number(formData.pickup_lng)
          })
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.error ||
            'Failed to create emergency request'
        )
      }


      // ==========================================
      // SHOW HOSPITAL SELECTED BY MEDIRESCUE
      // ==========================================

      const hospitalName =
        data.hospital?.name ||
        'Nearest Hospital'

      const distance =
        data.distance_km !== undefined
          ? `${data.distance_km} km away`
          : ''


      setSuccess(
        `Emergency request sent successfully. ` +
        `Case ID: ${data.case_id}. ` +
        `${hospitalName} has been selected as your nearest hospital` +
        `${distance ? ` (${distance})` : ''}.`
      )


      // ==========================================
      // CLEAR FORM AFTER SUCCESS
      // ==========================================

      setFormData({
        emergency_type: '',
        emergency_desc: '',
        severity: 'moderate',
        pickup_lat: '',
        pickup_lng: ''
      })

      setLocationFound(false)

    } catch (err) {

      setError(err.message)

    } finally {

      setLoading(false)
    }
  }


  return (
    <div className="emergency-page">

      <div className="emergency-form-card">

        <button
          className="back-dashboard"
          onClick={() =>
            navigate('/patient-dashboard')
          }
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


        {error && (
          <div className="login-error">
            {error}
          </div>
        )}


        {success && (
          <div className="success-message">
            {success}
          </div>
        )}


        <form onSubmit={handleSubmit}>

          <div className="form-group">

            <label>
              Emergency Type
            </label>

            <select
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


          <div className="form-group">

            <label>
              Emergency Description
            </label>

            <textarea
              name="emergency_desc"
              value={formData.emergency_desc}
              onChange={handleChange}
              placeholder="Briefly describe the emergency..."
              rows="4"
            />

          </div>


          <div className="form-group">

            <label>
              Severity
            </label>

            <select
              name="severity"
              value={formData.severity}
              onChange={handleChange}
            >

              <option value="minor">
                Minor
              </option>

              <option value="moderate">
                Moderate
              </option>

              <option value="critical">
                Critical
              </option>

            </select>

          </div>


          <div className="form-group">

            <label>
              Emergency Location
            </label>

            <button
              type="button"
              className="location-button"
              onClick={getCurrentLocation}
              disabled={locationLoading}
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


          <button
            type="submit"
            className="emergency-submit"
            disabled={loading}
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