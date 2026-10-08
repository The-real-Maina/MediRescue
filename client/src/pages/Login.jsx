
import { useState } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'

function Login() {
  const navigate = useNavigate()
  const location = useLocation()

  const [role, setRole] = useState('patient')

  const [formData, setFormData] = useState({
    phone: '',
    email: '',
    password: ''
  })

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const roles = [
    { value: 'patient', label: 'Patient' },
    { value: 'hospital_staff', label: 'Hospital Staff' },
    { value: 'super_admin', label: 'Super Admin' }
  ]

  const handleChange = (e) => {
    setFormData((current) => ({
      ...current,
      [e.target.name]: e.target.value
    }))
  }

  const handleRoleChange = (selectedRole) => {
    setRole(selectedRole)
    setError('')

    setFormData({
      phone: '',
      email: '',
      password: ''
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    setError('')
    setLoading(true)

    const loginData = {
      password: formData.password,
      role,
      ...(role === 'patient'
        ? { phone: formData.phone }
        : { email: formData.email })
    }

    try {
      const response = await fetch(
        'http://localhost:5000/api/auth/login',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(loginData)
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Login failed')
      }

      if (!data.token || !data.user?.role) {
        throw new Error('Invalid login response')
      }

      const destinations = {
        patient: '/patient-dashboard',
        hospital_staff: '/staff-dashboard',
        super_admin: '/admin-dashboard'
      }

      const destination = destinations[data.user.role]

      if (!destination || data.user.role !== role) {
        throw new Error('Unexpected account role')
      }

      localStorage.setItem('medirescue_token', data.token)

      localStorage.setItem(
        'medirescue_user',
        JSON.stringify(data.user)
      )

      navigate(destination, { replace: true })

    } catch (err) {
      setError(err.message || 'Unable to log in')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">

        <h1>MediRescue</h1>
        <h2>Welcome Back</h2>

        <p>Login to continue to your account.</p>

        <div
          className="role-selector"
          style={{
            display: 'flex',
            gap: '4px',
            width: '100%'
          }}
        >
          {roles.map((item) => (
            <button
              key={item.value}
              type="button"
              className={role === item.value ? 'active' : ''}
              style={{
                flex: 1,
                minWidth: 0,
                padding: '12px 5px',
                fontSize: '12px',
                whiteSpace: 'nowrap'
              }}
              onClick={() => handleRoleChange(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>

        {location.state?.registrationSuccess && (
          <p
            role="status"
            style={{
              color: '#15803d',
              backgroundColor: '#dcfce7',
              padding: '12px',
              borderRadius: '6px'
            }}
          >
            Account created successfully. Please log in.
          </p>
        )}

        {error && (
          <div className="login-error" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>

          {role === 'patient' ? (
            <div className="form-group">
              <label htmlFor="login-phone">
                Phone Number
              </label>

              <input
                id="login-phone"
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="e.g. 0712345678"
                required
              />
            </div>
          ) : (
            <div className="form-group">
              <label htmlFor="login-email">
                Email Address
              </label>

              <input
                id="login-email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder={
                  role === 'super_admin'
                    ? 'admin@medirescue.com'
                    : 'staff@hospital.com'
                }
                required
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="login-password">
              Password
            </label>

            <input
              id="login-password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              required
            />
          </div>

          <button
            type="submit"
            className="login-submit"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>

        </form>

        {/* PATIENT REGISTRATION LINK */}

        {role === 'patient' && (
          <p
            style={{
              marginTop: '20px',
              textAlign: 'center',
              color: '#475569'
            }}
          >
            Don't have an account?{' '}
            <Link
              to="/register"
              style={{
                color: '#dc2626',
                fontWeight: 'bold',
                textDecoration: 'none'
              }}
            >
              Create Account
            </Link>
          </p>
        )}

        <Link to="/" className="back-home">
          ← Back to Home
        </Link>

      </div>
    </div>
  )
}

export default Login
