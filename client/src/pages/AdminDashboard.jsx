import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const API_URL = 'http://localhost:5000/api/admin'

const modules = [
  { label: 'Manage Hospitals', path: '/admin/hospitals', icon: '✚', description: 'Hospital records and facilities' },
  { label: 'Monitor Emergencies', path: '/admin/emergencies', icon: '◉', description: 'Review emergency operations' },
  { label: 'Manage Ambulances', path: '/admin/ambulances', icon: '🚑', description: 'Fleet and driver assignments' },
  { label: 'Manage Staff', path: '/admin/staff', icon: '♙', description: 'Hospital staff accounts' },
  { label: 'Manage Patients', path: '/admin/patients', icon: '♡', description: 'Registered patient records' },
  { label: 'Manage Payments', path: '/admin/payments', icon: 'KSh', description: 'Transactions and payment status' }
]

function formatMoney(amount) {
  return `KSh ${Number(amount || 0).toLocaleString('en-KE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  let user = {}
  try {
    user = JSON.parse(localStorage.getItem('medirescue_user') || '{}') || {}
  } catch {
    user = {}
  }

  useEffect(() => {
    const controller = new AbortController()

    async function fetchStats() {
      setLoading(true)
      setError('')
      try {
        const token = localStorage.getItem('medirescue_token')
        if (!token) {
          navigate('/login', { replace: true })
          return
        }

        const response = await fetch(`${API_URL}/stats`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal
        })

        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem('medirescue_token')
          localStorage.removeItem('medirescue_user')
          navigate('/login', { replace: true })
          return
        }

        if (!(response.headers.get('content-type') || '').includes('application/json')) {
          throw new Error(`Unexpected server response (${response.status})`)
        }

        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Failed to load statistics')
        if (!controller.signal.aborted) setStats(data)
      } catch (err) {
        if (err.name !== 'AbortError' && !controller.signal.aborted) {
          setError(err.message || 'Unable to load dashboard statistics')
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    fetchStats()
    return () => controller.abort()
  }, [navigate, refreshKey])

  function handleLogout() {
    localStorage.removeItem('medirescue_token')
    localStorage.removeItem('medirescue_user')
    navigate('/login', { replace: true })
  }

  const statCards = stats ? [
    { label: 'Registered Hospitals', value: stats.hospitals, icon: '✚', tone: 'red' },
    { label: 'Registered Patients', value: stats.patients, icon: '♡', tone: 'blue' },
    { label: 'Hospital Staff', value: stats.staff, icon: '♙', tone: 'purple' },
    { label: 'Emergency Cases', value: stats.emergencies, icon: '✱', tone: 'red' },
    { label: 'Total Ambulances', value: stats.ambulances, icon: '🚑', tone: 'blue' },
    { label: 'Available Ambulances', value: stats.availableAmbulances, icon: '✓', tone: 'green' },
    { label: 'Total Payments', value: stats.payments, icon: 'KSh', tone: 'blue' },
    { label: 'Completed Payments', value: stats.completedPayments, icon: '✓', tone: 'green' },
    { label: 'Pending Payments', value: stats.pendingPayments, icon: '◷', tone: 'amber' },
    { label: 'Failed Payments', value: stats.failedPayments, icon: '!', tone: 'red' },
    { label: 'Total Revenue', value: formatMoney(stats.totalRevenue), icon: 'KSh', tone: 'green', wide: true }
  ] : []

  return (
    <div className="mr-admin-page">
      <style>{`
        .mr-admin-page{min-height:100vh;background:#f0f5fa;color:#10243e;font-family:Arial,Helvetica,sans-serif}
        .mr-admin-page *{box-sizing:border-box}
        .mr-admin-top{background:#10263e;border-bottom:4px solid #e5232b;color:white}
        .mr-admin-top-inner{max-width:1240px;margin:auto;min-height:91px;padding:18px 26px;display:flex;align-items:center;justify-content:space-between;gap:18px;flex-wrap:wrap}
        .mr-admin-brand{display:flex;align-items:center;gap:13px}
        .mr-admin-cross{display:grid;place-items:center;width:45px;height:45px;background:#e5232b;color:white;border-radius:12px;font-size:30px;font-weight:800}
        .mr-admin-brand-name{font-size:23px;font-weight:800;letter-spacing:-.7px;line-height:1.1}
        .mr-admin-brand-sub{font-size:10px;letter-spacing:2px;margin-top:6px;color:#d8e6f7}
        .mr-admin-account{display:flex;align-items:center;gap:18px;flex-wrap:wrap;font-size:13px}
        .mr-admin-logout{background:transparent;border:1px solid #647d96;color:white;padding:11px 18px;border-radius:8px;font-weight:700;cursor:pointer}
        .mr-admin-logout:hover{background:#203d59}
        .mr-admin-main{max-width:1240px;margin:auto;padding:40px 26px 70px}
        .mr-admin-eyebrow{font-size:11px;font-weight:800;letter-spacing:2px;color:#e5232b;margin:0 0 15px}
        .mr-admin-title{font-size:clamp(29px,4vw,39px);letter-spacing:-1.2px;line-height:1.15;color:#10243e;margin:0 0 12px}
        .mr-admin-desc{color:#637a96;line-height:1.7;margin:0 0 27px;font-size:15px}
        .mr-admin-section-head{display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap;margin:33px 0 16px}
        .mr-admin-section-title{margin:0;font-size:22px;letter-spacing:-.4px}
        .mr-admin-refresh{padding:10px 15px;background:white;border:1px solid #d8e2ed;color:#10243e;border-radius:8px;cursor:pointer;font-weight:700}
        .mr-admin-refresh:disabled{opacity:.55;cursor:wait}
        .mr-admin-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px}
        .mr-admin-stat{background:#fff;border:1px solid #e0e8f0;border-radius:14px;padding:22px;min-height:145px;box-shadow:0 7px 22px rgba(16,36,62,.04);display:flex;align-items:flex-start;justify-content:space-between;gap:10px}
        .mr-admin-stat-label{font-size:13px;font-weight:700;color:#637a96;line-height:1.4;margin:0 0 15px}
        .mr-admin-stat-value{font-size:30px;font-weight:800;letter-spacing:-.7px;overflow-wrap:anywhere;color:#10243e;margin:0}
        .mr-admin-stat.wide .mr-admin-stat-value{font-size:24px}
        .mr-admin-stat-icon{flex-shrink:0;display:grid;place-items:center;width:44px;height:44px;border-radius:12px;font-size:19px;font-weight:800}
        .mr-admin-stat-icon.red{background:#fff0f1;color:#df202a}
        .mr-admin-stat-icon.blue{background:#eaf3ff;color:#2465d0}
        .mr-admin-stat-icon.green{background:#e6fbef;color:#087d42}
        .mr-admin-stat-icon.purple{background:#f1edff;color:#6c4cc5}
        .mr-admin-stat-icon.amber{background:#fff6da;color:#a46700}
        .mr-admin-panel{background:#fff;border:1px solid #e0e8f0;border-radius:16px;padding:26px;box-shadow:0 7px 22px rgba(16,36,62,.04)}
        .mr-admin-panel-desc{color:#637a96;line-height:1.6;font-size:14px;margin:8px 0 22px}
        .mr-admin-modules{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
        .mr-admin-module{position:relative;display:flex;align-items:center;text-align:left;gap:14px;padding:20px;border:1px solid #dfe8f1;border-radius:14px;background:linear-gradient(135deg,#fff 0%,#f9fbfe 100%);color:#10243e;cursor:pointer;min-height:110px;width:100%;font:inherit;transition:transform .2s ease,border-color .2s ease,box-shadow .2s ease,background .2s ease}
        .mr-admin-module:hover{transform:translateY(-4px);border-color:#e5232b;background:#fff;box-shadow:0 14px 30px rgba(16,36,62,.12)}
        .mr-admin-module:active{transform:translateY(-1px);box-shadow:0 5px 12px rgba(16,36,62,.1)}
        .mr-admin-module:focus-visible{outline:3px solid #e5232b;outline-offset:3px}
        .mr-admin-module-icon{flex-shrink:0;width:49px;height:49px;border-radius:13px;display:grid;place-items:center;background:#fff0f1;color:#d82029;font-weight:800;font-size:20px;transition:background .2s ease,color .2s ease,transform .2s ease}
        .mr-admin-module:hover .mr-admin-module-icon{background:#e5232b;color:white;transform:scale(1.05)}
        .mr-admin-module-name{font-size:15px;font-weight:800;margin-bottom:5px}
        .mr-admin-module-desc{font-size:12px;color:#637a96;line-height:1.45}
        .mr-admin-arrow{margin-left:auto;font-size:25px;font-weight:700;color:#d82029;transition:transform .2s ease}
        .mr-admin-module:hover .mr-admin-arrow{transform:translateX(5px)}
        @media(prefers-reduced-motion:reduce){.mr-admin-module,.mr-admin-module-icon,.mr-admin-arrow{transition:none}.mr-admin-module:hover,.mr-admin-module:active{transform:none}.mr-admin-module:hover .mr-admin-module-icon,.mr-admin-module:hover .mr-admin-arrow{transform:none}}
        .mr-admin-alert{padding:17px 19px;border-radius:12px;background:#fff0f1;border:1px solid #ffd6d9;color:#a71923;margin:20px 0}
        .mr-admin-loading{padding:28px;background:#fff;border:1px solid #e0e8f0;border-radius:12px;color:#637a96}
        .mr-admin-footer{text-align:center;font-size:12px;color:#8191a5;margin-top:42px}
        @media(max-width:1050px){.mr-admin-stats{grid-template-columns:repeat(3,minmax(0,1fr))}.mr-admin-modules{grid-template-columns:repeat(2,minmax(0,1fr))}}
        @media(max-width:720px){.mr-admin-stats{grid-template-columns:repeat(2,minmax(0,1fr))}.mr-admin-main{padding:28px 16px 50px}.mr-admin-top-inner{padding:15px 16px}.mr-admin-panel{padding:17px}.mr-admin-modules{grid-template-columns:1fr}}
        @media(max-width:450px){.mr-admin-stats{grid-template-columns:1fr}.mr-admin-account{width:100%;justify-content:space-between}.mr-admin-stat{min-height:110px}.mr-admin-title{font-size:29px}}
      `}</style>

      <header className="mr-admin-top">
        <div className="mr-admin-top-inner">
          <div className="mr-admin-brand">
            <span className="mr-admin-cross" aria-hidden="true">+</span>
            <div>
              <div className="mr-admin-brand-name">MediRescue</div>
              <div className="mr-admin-brand-sub">SUPER ADMIN PORTAL</div>
            </div>
          </div>
          <div className="mr-admin-account">
            <span>{user.name || 'Administrator'}</span>
            <button className="mr-admin-logout" type="button" onClick={handleLogout}>Logout →</button>
          </div>
        </div>
      </header>

      <main className="mr-admin-main">
        <p className="mr-admin-eyebrow">MEDIRESCUE CENTRAL ADMINISTRATION</p>
        <h1 className="mr-admin-title">Super Admin Dashboard</h1>
        <p className="mr-admin-desc">Oversee hospitals, emergency operations, ambulance availability, payments and system activity from one place.</p>

        <div className="mr-admin-section-head">
          <h2 className="mr-admin-section-title">System Overview</h2>
          <button className="mr-admin-refresh" type="button" disabled={loading} onClick={() => setRefreshKey((key) => key + 1)}>↻ Refresh Statistics</button>
        </div>

        {loading && <div className="mr-admin-loading" role="status">Loading dashboard statistics...</div>}
        {error && <div className="mr-admin-alert" role="alert">{error}</div>}

        {!loading && !error && stats && (
          <div className="mr-admin-stats">
            {statCards.map((card) => (
              <article className={`mr-admin-stat${card.wide ? ' wide' : ''}`} key={card.label}>
                <div>
                  <p className="mr-admin-stat-label">{card.label}</p>
                  <p className="mr-admin-stat-value">{card.value ?? 0}</p>
                </div>
                <span className={`mr-admin-stat-icon ${card.tone}`} aria-hidden="true">{card.icon}</span>
              </article>
            ))}
          </div>
        )}

        <div className="mr-admin-section-head" style={{ marginTop: 39 }}>
          <h2 className="mr-admin-section-title">System Management</h2>
        </div>
        <section className="mr-admin-panel" aria-label="System management modules">
          <p className="mr-admin-panel-desc">Select a management area to review records and administer MediRescue operations.</p>
          <div className="mr-admin-modules">
            {modules.map((module) => (
              <button className="mr-admin-module" type="button" key={module.path} onClick={() => navigate(module.path)}>
                <span className="mr-admin-module-icon" aria-hidden="true">{module.icon}</span>
                <span>
                  <span className="mr-admin-module-name" style={{ display: 'block' }}>{module.label}</span>
                  <span className="mr-admin-module-desc" style={{ display: 'block' }}>{module.description}</span>
                </span>
                <span className="mr-admin-arrow" aria-hidden="true">›</span>
              </button>
            ))}
          </div>
        </section>
        <footer className="mr-admin-footer">MediRescue • Emergency Response Management System</footer>
      </main>
    </div>
  )
}
