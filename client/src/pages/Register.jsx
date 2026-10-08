
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

function Register() {
  const navigate = useNavigate()

  const [form, setForm] = useState({
    name: '',
    phone: '',
    password: '',
    confirmPassword: '',
    blood_type: '',
    allergies: '',
    chronic_conditions: '',
    next_of_kin_name: '',
    next_of_kin_phone: ''
  })

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (form.password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)

    try {
      const { confirmPassword, ...registrationData } = form

      const response = await fetch(
        'http://localhost:5000/api/auth/register',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(registrationData)
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed')
      }

      navigate('/login', {
        replace: true,
        state: { registrationSuccess: true }
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>MediRescue</h1>
        <h2>Create Patient Account</h2>

        <p>Register to access emergency medical assistance.</p>

        {error && (
          <div className="login-error" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Full Name *</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Phone Number *</label>
            <input
              type="tel"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              placeholder="0712345678"
              required
            />
          </div>

          <div className="form-group">
            <label>Password *</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              minLength={6}
              required
            />
          </div>

          <div className="form-group">
            <label>Confirm Password *</label>
            <input
              type="password"
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Blood Group (Optional)</label>
            <select
              name="blood_type"
              value={form.blood_type}
              onChange={handleChange}
            >
              <option value="">Select blood group</option>
              {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(
                (group) => (
                  <option key={group} value={group}>
                    {group}
                  </option>
                )
              )}
            </select>
          </div>

          <div className="form-group">
            <label>Allergies (Optional)</label>
            <textarea
              name="allergies"
              value={form.allergies}
              onChange={handleChange}
              placeholder="Known allergies"
            />
          </div>

          <div className="form-group">
            <label>Chronic Conditions (Optional)</label>
            <textarea
              name="chronic_conditions"
              value={form.chronic_conditions}
              onChange={handleChange}
              placeholder="Existing medical conditions"
            />
          </div>

          <div className="form-group">
            <label>Next of Kin Name (Optional)</label>
            <input
              name="next_of_kin_name"
              value={form.next_of_kin_name}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>Next of Kin Phone (Optional)</label>
            <input
              type="tel"
              name="next_of_kin_phone"
              value={form.next_of_kin_phone}
              onChange={handleChange}
            />
          </div>

          <button
            type="submit"
            className="login-submit"
            disabled={loading}
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <p style={{ marginTop: '20px' }}>
          Already have an account? <Link to="/login">Login</Link>
        </p>

        <Link to="/" className="back-home">
          ← Back to Home
        </Link>
      </div>
    </div>
  )
}

export default Register
