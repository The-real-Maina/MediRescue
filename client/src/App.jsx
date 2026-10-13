
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate
} from 'react-router-dom'

// HOMEPAGE
import Home from './pages/Home'

// AUTHENTICATION
import Login from './pages/Login'
import Register from './pages/Register'

// PATIENT PAGES
import PatientDashboard from './pages/PatientDashboard'
import EmergencyRequest from './pages/EmergencyRequest'
import MyCases from './pages/MyCases'
import PayNow from './pages/PayNow'

// HOSPITAL STAFF
import StaffDashboard from './pages/StaffDashboard'

// AMBULANCE DRIVER
import DriverDashboard from './pages/DriverDashboard'

// ADMIN PAGES
import AdminDashboard from './pages/AdminDashboard'
import HospitalManagement from './pages/HospitalManagement'
import EmergencyMonitoring from './pages/EmergencyMonitoring'
import AmbulanceManagement from './pages/AmbulanceManagement'
import StaffManagement from './pages/StaffManagement'
import PatientManagement from './pages/PatientManagement'
import PaymentManagement from './pages/PaymentManagement'

import './App.css'

// ==========================================
// ROLE-BASED ROUTE PROTECTION
// ==========================================

function ProtectedRoute({ children, allowedRole }) {
  const token = localStorage.getItem('medirescue_token')

  let user = null

  try {
    user = JSON.parse(
      localStorage.getItem('medirescue_user') || 'null'
    )
  } catch {
    return <Navigate to="/login" replace />
  }

  if (!token || !user || user.role !== allowedRole) {
    return <Navigate to="/login" replace />
  }

  return children
}

// ==========================================
// APPLICATION ROUTES
// ==========================================

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* PUBLIC HOMEPAGE */}
        <Route
          path="/"
          element={<Home />}
        />

        {/* LOGIN */}
        <Route
          path="/login"
          element={<Login />}
        />

        {/* REGISTRATION */}
        <Route
          path="/register"
          element={<Register />}
        />

        {/* PATIENT DASHBOARD */}
        <Route
          path="/patient-dashboard"
          element={
            <ProtectedRoute allowedRole="patient">
              <PatientDashboard />
            </ProtectedRoute>
          }
        />

        {/* EMERGENCY REQUEST */}
        <Route
          path="/emergency-request"
          element={
            <ProtectedRoute allowedRole="patient">
              <EmergencyRequest />
            </ProtectedRoute>
          }
        />

        {/* PATIENT CASES */}
        <Route
          path="/my-cases"
          element={
            <ProtectedRoute allowedRole="patient">
              <MyCases />
            </ProtectedRoute>
          }
        />

        {/* M-PESA PAYMENT */}
        <Route
          path="/pay-now"
          element={
            <ProtectedRoute allowedRole="patient">
              <PayNow />
            </ProtectedRoute>
          }
        />

        {/* HOSPITAL STAFF DASHBOARD */}
        <Route
          path="/staff-dashboard"
          element={
            <ProtectedRoute allowedRole="hospital_staff">
              <StaffDashboard />
            </ProtectedRoute>
          }
        />

        {/* AMBULANCE DRIVER DASHBOARD */}
        <Route
          path="/driver-dashboard"
          element={
            <ProtectedRoute allowedRole="driver">
              <DriverDashboard />
            </ProtectedRoute>
          }
        />

        {/* SUPER ADMIN DASHBOARD */}
        <Route
          path="/admin-dashboard"
          element={
            <ProtectedRoute allowedRole="super_admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* HOSPITAL MANAGEMENT */}
        <Route
          path="/admin/hospitals"
          element={
            <ProtectedRoute allowedRole="super_admin">
              <HospitalManagement />
            </ProtectedRoute>
          }
        />

        {/* EMERGENCY CASE MONITORING */}
        <Route
          path="/admin/emergencies"
          element={
            <ProtectedRoute allowedRole="super_admin">
              <EmergencyMonitoring />
            </ProtectedRoute>
          }
        />

        {/* AMBULANCE MANAGEMENT */}
        <Route
          path="/admin/ambulances"
          element={
            <ProtectedRoute allowedRole="super_admin">
              <AmbulanceManagement />
            </ProtectedRoute>
          }
        />

        {/* STAFF MANAGEMENT */}
        <Route
          path="/admin/staff"
          element={
            <ProtectedRoute allowedRole="super_admin">
              <StaffManagement />
            </ProtectedRoute>
          }
        />

        {/* PATIENT MANAGEMENT */}
        <Route
          path="/admin/patients"
          element={
            <ProtectedRoute allowedRole="super_admin">
              <PatientManagement />
            </ProtectedRoute>
          }
        />

        {/* PAYMENT MANAGEMENT */}
        <Route
          path="/admin/payments"
          element={
            <ProtectedRoute allowedRole="super_admin">
              <PaymentManagement />
            </ProtectedRoute>
          }
        />

        {/* UNKNOWN ROUTES */}
        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />

      </Routes>
    </BrowserRouter>
  )
}

export default App
