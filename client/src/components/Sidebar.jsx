import { useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { FaBars, FaTachometerAlt, FaAmbulance, FaUsers, FaUserMd, FaChevronDown, FaChevronRight, FaChartBar, FaFirstAid, FaCreditCard, FaSignOutAlt, FaMapMarkedAlt, FaHistory } from 'react-icons/fa'

const menus = {
  super_admin: [
    { title: 'Dashboard', icon: FaTachometerAlt, path: '/admin-dashboard' },
    { title: 'Management', icon: FaUsers, children: [
      { title: 'Hospitals', path: '/admin/hospitals' },
      { title: 'Ambulances', path: '/admin/ambulances' },
      { title: 'Hospital Staff', path: '/admin/staff' }
    ] },
    { title: 'Emergencies', icon: FaFirstAid, children: [
      { title: 'Emergency Monitoring', path: '/admin/emergencies' }
    ] },
    { title: 'Analytics & Records', icon: FaChartBar, children: [
      { title: 'Patient Statistics', path: '/admin/patients' },
      { title: 'Payments', path: '/admin/payments' }
    ] }
  ],
  hospital_staff: [
    { title: 'Dashboard', icon: FaTachometerAlt, path: '/staff-dashboard' },
    { title: 'Ambulance GPS Tracking', icon: FaMapMarkedAlt, path: '/staff/tracking' },
    { title: 'Emergency Cases', icon: FaFirstAid, path: '/staff/cases' },
    { title: 'Closed Cases / History', icon: FaHistory, path: '/staff/history' }
  ],
  driver: [
    { title: 'Dashboard', icon: FaTachometerAlt, path: '/driver-dashboard' },
    { title: 'Live GPS Tracking', icon: FaMapMarkedAlt, path: '/driver/tracking' },
    { title: 'Assigned Ambulance', icon: FaAmbulance, path: '/driver/ambulance' }
  ],
  patient: [
    { title: 'Dashboard', icon: FaTachometerAlt, path: '/patient-dashboard' },
    { title: 'Request Emergency', icon: FaFirstAid, path: '/emergency-request' },
    { title: 'My Emergency Cases', icon: FaHistory, path: '/my-cases' },
    { title: 'Payments', icon: FaCreditCard, path: '/pay-now' }
  ]
}

const menuStyle = {
  display: 'flex', alignItems: 'center', gap: 14, width: '100%',
  padding: 13, background: 'transparent', border: 'none', borderRadius: 7,
  color: '#fff', cursor: 'pointer', fontSize: 14, textAlign: 'left',
  marginBottom: 5
}
const linkStyle = {
  display: 'block', padding: '11px 10px 11px 36px', color: '#fff',
  textDecoration: 'none', borderRadius: 6, fontSize: 13, marginBottom: 3
}

export default function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [openMenu, setOpenMenu] = useState(null)

  let user = null
  try { user = JSON.parse(localStorage.getItem('medirescue_user') || 'null') }
  catch { user = null }

  const menuItems = menus[user?.role] || []
  const activeGroup = menuItems.find(item =>
    item.children?.some(child => child.path === location.pathname)
  )?.title
  const currentOpenMenu = openMenu ?? activeGroup

  const handleToggleMenu = title => {
    if (collapsed) { setCollapsed(false); setOpenMenu(title); return }
    setOpenMenu(currentOpenMenu === title ? '' : title)
  }

  const handleGroupNavigation = item => {
    if (item.path) {
      navigate(item.path)
      setOpenMenu(item.title)
    } else {
      handleToggleMenu(item.title)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('medirescue_token')
    localStorage.removeItem('medirescue_user')
    navigate('/login', { replace: true })
  }

  return (
    <aside style={{
      width: collapsed ? 76 : 250, height: '100vh', position: 'sticky', top: 0,
      background: '#102a43', color: '#fff', padding: '16px 10px',
      boxSizing: 'border-box', flexShrink: 0, transition: 'width .25s ease',
      display: 'flex', flexDirection: 'column', overflow: 'hidden'
    }}>
      <button type="button" onClick={() => setCollapsed(!collapsed)}
        aria-label="Toggle sidebar" title="Toggle sidebar"
        style={{ ...menuStyle, flexShrink: 0 }}>
        <FaBars size={20} />
        {!collapsed && <strong style={{ fontSize: 18 }}>MediRescue</strong>}
      </button>

      <nav aria-label="Dashboard navigation" style={{
        marginTop: 20, flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden'
      }}>
        {menuItems.map(item => {
          const Icon = item.icon
          const childIsActive = item.children?.some(child => child.path === location.pathname)
          const isOpen = currentOpenMenu === item.title
          return (
            <div key={item.title}>
              {item.children ? <>
                <button type="button" title={item.title}
                  onClick={() => handleGroupNavigation(item)}
                  aria-expanded={isOpen && !collapsed}
                  style={{ ...menuStyle, background: childIsActive ? '#1e4970' : 'transparent' }}>
                  <Icon size={18} />
                  {!collapsed && <>
                    <span style={{ flex: 1, textAlign: 'left' }}>{item.title}</span>
                    {isOpen ? <FaChevronDown size={12} /> : <FaChevronRight size={12} />}
                  </>}
                </button>
                {!collapsed && isOpen && item.children.map(child => (
                  <NavLink key={child.path} to={child.path}
                    onClick={() => setOpenMenu(item.title)}
                    style={({ isActive }) => ({
                      ...linkStyle, background: isActive ? '#2563eb' : 'transparent'
                    })}>{child.title}</NavLink>
                ))}
              </> : (
                <NavLink to={item.path} title={item.title}
                  style={({ isActive }) => ({
                    ...menuStyle, color: '#fff', textDecoration: 'none',
                    background: isActive ? '#2563eb' : 'transparent'
                  })}>
                  <Icon size={18} />
                  {!collapsed && <span>{item.title}</span>}
                </NavLink>
              )}
            </div>
          )
        })}
      </nav>
      <div style={{ marginTop: 'auto', paddingTop: 12,
        borderTop: '1px solid #29465f', flexShrink: 0 }}>
        <button type="button" onClick={handleLogout} title="Logout"
          style={{ ...menuStyle, color: '#ff6b6b', fontWeight: 600, marginBottom: 0 }}>
          <FaSignOutAlt size={18} />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  )
}
