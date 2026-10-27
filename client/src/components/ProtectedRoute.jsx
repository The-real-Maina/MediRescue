import { Navigate, useLocation } from 'react-router-dom'

const homeRoutes = {
  patient: '/patient-dashboard',
  hospital_staff: '/staff-dashboard',
  hospital_admin: '/hospital-admin-dashboard',
  driver: '/driver-dashboard',
  super_admin: '/admin-dashboard'
}

export default function ProtectedRoute({ allowedRole, children }) {
  const location = useLocation()
  const token = localStorage.getItem('medirescue_token')

  let user = null
  try {
    user = JSON.parse(localStorage.getItem('medirescue_user') || 'null')
  } catch {
    user = null
  }

  if (!token || !user?.role) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (allowedRole && user.role !== allowedRole) {
    return <Navigate to={homeRoutes[user.role] || '/login'} replace />
  }

  return children
}