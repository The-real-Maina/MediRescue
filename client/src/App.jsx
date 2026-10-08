
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  Navigate
} from 'react-router-dom'

import Login from './pages/Login'
import Register from './pages/Register'
import PatientDashboard from './pages/PatientDashboard'
import EmergencyRequest from './pages/EmergencyRequest'
import MyCases from './pages/MyCases'
import PayNow from './pages/PayNow'
import StaffDashboard from './pages/StaffDashboard'
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
// HOME PAGE
// ==========================================

function Home() {
  return (
    <div className="app">
      <header className="navbar">
        <h2>MediRescue</h2>

        <nav>
          <a href="#home">Home</a>
          <a href="#about">About</a>

          <Link to="/login">
            <button>Login</button>
          </Link>
        </nav>
      </header>

      <main className="home" id="home">
        <div className="home-content">
          <p className="tagline">
            Emergency Medical Response
          </p>

          <h1>
            Fast Help When Every Second Matters
          </h1>

          <p>
            MediRescue connects patients with nearby
            hospitals and emergency medical responders
            for faster emergency assistance.
          </p>

          <div className="home-buttons">
            <Link to="/login">
              <button className="emergency-btn">
                Request Emergency Help
              </button>
            </Link>

            <Link to="/login">
              <button className="login-btn">
                Login
              </button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}

// ==========================================
// APPLICATION ROUTES
// ==========================================

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* HOME */}
        <Route path="/" element={<Home />} />

        {/* AUTHENTICATION */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

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

        {/* PATIENT M-PESA PAYMENT */}
        <Route
          path="/pay-now"
          element={
            <ProtectedRoute allowedRole="patient">
              <PayNow />
            </ProtectedRoute>
          }
        />

        {/* HOSPITAL STAFF */}
        <Route
          path="/staff-dashboard"
          element={
            <ProtectedRoute allowedRole="hospital_staff">
              <StaffDashboard />
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
