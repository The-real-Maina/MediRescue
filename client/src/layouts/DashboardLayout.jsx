import { Outlet } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import ThemeToggle from '../components/ThemeToggle'

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
          background: 'var(--bg)',
          color: 'var(--text)',
          overflowX: 'auto'
        }}
      >
        <Outlet />
      </main>

      <ThemeToggle
        floating
        style={{ top: 'auto', bottom: 20, right: 20 }}
      />
    </div>
  )
}