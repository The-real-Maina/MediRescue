
import { Outlet } from 'react-router-dom'
import Sidebar from '../components/Sidebar'

export default function DashboardLayout() {
  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        width: '100%'
      }}
    >
      <Sidebar />

      <main
        style={{
          flex: 1,
          minWidth: 0,
          padding: '24px',
          background: '#f4f7fb',
          overflowX: 'auto'
        }}
      >
        <Outlet />
      </main>
    </div>
  )
}
