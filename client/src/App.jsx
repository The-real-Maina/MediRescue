import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import PatientDashboard from './pages/PatientDashboard'
import EmergencyRequest from './pages/EmergencyRequest'
import MyCases from './pages/MyCases'
import PayNow from './pages/PayNow'
import HealthProfile from './pages/HealthProfile'
import StaffDashboard from './pages/StaffDashboard'
import DriverDashboard from './pages/DriverDashboard'
import AdminDashboard from './pages/AdminDashboard'
import HospitalManagement from './pages/HospitalManagement'
import EmergencyMonitoring from './pages/EmergencyMonitoring'
import AmbulanceManagement from './pages/AmbulanceManagement'
import StaffManagement from './pages/StaffManagement'
import PatientManagement from './pages/PatientManagement'
import PaymentManagement from './pages/PaymentManagement'
import ProtectedRoute from './components/ProtectedRoute'
import DashboardLayout from './layouts/DashboardLayout'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route element={<ProtectedRoute allowedRole="patient"><DashboardLayout /></ProtectedRoute>}>
          <Route path="/patient-dashboard" element={<PatientDashboard />} />
          <Route path="/emergency-request" element={<EmergencyRequest />} />
          <Route path="/my-cases" element={<MyCases />} />
          <Route path="/health-profile" element={<HealthProfile />} />
          <Route path="/pay-now" element={<PayNow />} />
        </Route>

        <Route element={<ProtectedRoute allowedRole="hospital_staff"><DashboardLayout /></ProtectedRoute>}>
          <Route path="/staff-dashboard" element={<StaffDashboard view="dashboard" />} />
          <Route path="/staff/tracking" element={<StaffDashboard view="tracking" />} />
          <Route path="/staff/cases" element={<StaffDashboard view="cases" />} />
          <Route path="/staff/history" element={<StaffDashboard view="history" />} />
        </Route>

        <Route element={<ProtectedRoute allowedRole="driver"><DashboardLayout /></ProtectedRoute>}>
          <Route path="/driver-dashboard" element={<DriverDashboard view="dashboard" />} />
          <Route path="/driver/tracking" element={<DriverDashboard view="tracking" />} />
          <Route path="/driver/ambulance" element={<DriverDashboard view="ambulance" />} />
        </Route>

        <Route element={<ProtectedRoute allowedRole="super_admin"><DashboardLayout /></ProtectedRoute>}>
          <Route path="/admin-dashboard" element={<AdminDashboard />} />
          <Route path="/admin/hospitals" element={<HospitalManagement />} />
          <Route path="/admin/emergencies" element={<EmergencyMonitoring />} />
          <Route path="/admin/ambulances" element={<AmbulanceManagement />} />
          <Route path="/admin/staff" element={<StaffManagement />} />
          <Route path="/admin/patients" element={<PatientManagement />} />
          <Route path="/admin/payments" element={<PaymentManagement />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}