
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const API_URL = 'http://192.168.137.1:5000/api/admin/payments'

const css = `
.pm-page{min-height:100vh;background:#eff4fa;color:#102a43;font-family:'Segoe UI',Arial,sans-serif}
.pm-page *{box-sizing:border-box}
.pm-header{background:#102a43;border-bottom:4px solid #e52634;padding:19px 25px}
.pm-header-inner{max-width:1280px;margin:auto;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}
.pm-brand{display:flex;align-items:center;gap:12px;color:white}
.pm-logo{width:45px;height:45px;display:grid;place-items:center;background:#e52634;border-radius:12px;font-size:30px;font-weight:900}
.pm-brand-name{font-size:23px;font-weight:850;line-height:1.15}
.pm-brand-sub{font-size:10px;letter-spacing:2px;color:#cbd5e1;margin-top:5px}
.pm-back{background:white;color:#102a43;border:0;border-radius:9px;padding:12px 17px;font-weight:800;cursor:pointer}
.pm-main{max-width:1280px;margin:auto;padding:38px 22px 60px}
.pm-eyebrow{color:#e52634;letter-spacing:2px;font-size:11px;font-weight:900;margin:0 0 10px}
.pm-title{font-size:clamp(29px,4vw,39px);margin:0 0 10px;color:#102a43}
.pm-subtitle{color:#64748b;line-height:1.65;margin:0 0 29px}
.pm-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:15px;margin-bottom:27px}
.pm-stat{background:#fff;border:1px solid #dce5ef;border-radius:14px;padding:20px;box-shadow:0 5px 20px #102a4308;min-width:0}
.pm-stat-top{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:12px}
.pm-stat-label{color:#64748b;font-size:12px;font-weight:750}
.pm-stat-icon{display:grid;place-items:center;border-radius:10px;width:38px;height:38px;font-size:18px;font-weight:900}
.pm-stat-value{font-size:29px;font-weight:850;overflow-wrap:anywhere}
.pm-stat-revenue{font-size:22px}
.pm-panel{background:#fff;border:1px solid #dce5ef;border-radius:15px;padding:25px;box-shadow:0 6px 25px #102a4308}
.pm-panel-head{display:flex;align-items:center;justify-content:space-between;gap:15px;flex-wrap:wrap;margin-bottom:22px}
.pm-panel-title{font-size:22px;color:#102a43;margin:0 0 7px}
.pm-panel-desc{font-size:13px;color:#64748b;margin:0}
.pm-btn{border:0;border-radius:9px;padding:12px 18px;font-weight:800;cursor:pointer;background:#e52634;color:white;transition:transform .15s,box-shadow .15s}
.pm-btn:hover:not(:disabled),.pm-back:hover{transform:translateY(-2px);box-shadow:0 7px 18px #102a4324}
.pm-btn:disabled{opacity:.55;cursor:not-allowed}
.pm-controls{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:22px}
.pm-search,.pm-filter{background:white;border:1px solid #cbd5e1;border-radius:9px;padding:13px 14px;color:#102a43;font-size:14px;outline-color:#e52634}
.pm-search{flex:1 1 280px;min-width:0}.pm-filter{flex:0 1 200px}
.pm-error{padding:14px 16px;background:#fff1f2;border:1px solid #fecdd3;color:#b91c1c;border-radius:9px;margin-bottom:20px}
.pm-table-wrap{overflow-x:auto;border:1px solid #dce5ef;border-radius:11px}
.pm-table{width:100%;min-width:1080px;border-collapse:collapse;text-align:left}
.pm-table th{padding:17px 14px;background:#f3f7fb;border-bottom:1px solid #dce5ef;color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:.65px;white-space:nowrap}
.pm-table td{padding:16px 14px;border-bottom:1px solid #e8edf4;font-size:13px;color:#102a43;white-space:nowrap}
.pm-table tbody tr:hover{background:#f8fbff}.pm-table tbody tr:last-child td{border-bottom:0}
.pm-badge{display:inline-block;border-radius:99px;padding:7px 11px;font-size:12px;font-weight:800;text-transform:capitalize}
.pm-empty{text-align:center;color:#64748b;padding:42px 16px}
.pm-note{text-align:center;font-size:12px;color:#8192a8;margin-top:22px;line-height:1.6}
@media(max-width:600px){.pm-header{padding:16px}.pm-main{padding:28px 15px 45px}.pm-panel{padding:18px}.pm-panel-head .pm-btn{width:100%}}
`

const badgeColors = {
  completed: { background: '#dcfce7', color: '#166534' },
  pending: { background: '#fef3c7', color: '#92400e' },
  failed: { background: '#fee2e2', color: '#991b1b' }
}

function PaymentManagement() {
  const navigate = useNavigate()
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const loadPayments = useCallback(async (signal) => {
    setLoading(true)
    setError('')
    try {
      const token = localStorage.getItem('medirescue_token')
      if (!token) {
        navigate('/login', { replace: true })
        return
      }
      const response = await fetch(API_URL, {
        headers: { Authorization: `Bearer ${token}` }, signal
      })
      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('medirescue_token')
        localStorage.removeItem('medirescue_user')
        navigate('/login', { replace: true })
        return
      }
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to retrieve payments')
      if (!Array.isArray(data)) throw new Error('Unexpected API response')
      if (!signal?.aborted) setPayments(data)
    } catch (err) {
      if (err.name !== 'AbortError' && !signal?.aborted) {
        setError(err.message || 'Failed to load payment records')
      }
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [navigate])

  useEffect(() => {
    const controller = new AbortController()
    loadPayments(controller.signal)
    return () => controller.abort()
  }, [loadPayments])

  const summary = useMemo(() => {
    const completed = payments.filter(p => p.status === 'completed')
    return {
      total: payments.length,
      completed: completed.length,
      pending: payments.filter(p => p.status === 'pending').length,
      failed: payments.filter(p => p.status === 'failed').length,
      revenue: completed.reduce((sum, p) => {
        const amount = Number(p.amount)
        return sum + (Number.isFinite(amount) ? amount : 0)
      }, 0)
    }
  }, [payments])

  const filteredPayments = useMemo(() => {
    const query = search.trim().toLowerCase()
    return payments.filter(p => {
      const matchesSearch = [p.id, p.case_id, p.hospital_name, p.mpesa_ref, p.phone_number]
        .some(v => String(v ?? '').toLowerCase().includes(query))
      return matchesSearch && (statusFilter === 'all' || p.status === statusFilter)
    })
  }, [payments, search, statusFilter])

  const formatAmount = amount => {
    if (amount === null || amount === undefined) return '—'
    const value = Number(amount)
    return Number.isFinite(value) ? `KSh ${value.toLocaleString('en-KE', {
      minimumFractionDigits: 2, maximumFractionDigits: 2
    })}` : '—'
  }
  const formatDate = value => {
    if (!value) return '—'
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('en-KE')
  }
  const statusBadge = status => {
    const normalized = String(status || 'unknown').toLowerCase()
    return <span className="pm-badge" style={badgeColors[normalized] || {
      background: '#e2e8f0', color: '#475569'
    }}>{normalized}</span>
  }

  const cards = [
    { label: 'Total Payments', value: summary.total, symbol: '≡', color: '#1d4ed8', tint: '#eaf2ff' },
    { label: 'Completed Payments', value: summary.completed, symbol: '✓', color: '#15803d', tint: '#dcfce7' },
    { label: 'Pending Payments', value: summary.pending, symbol: '◷', color: '#b45309', tint: '#fef3c7' },
    { label: 'Failed Payments', value: summary.failed, symbol: '!', color: '#be123c', tint: '#ffe4e6' },
    { label: 'Total Revenue', value: formatAmount(summary.revenue), symbol: 'KSh', color: '#0f766e', tint: '#ccfbf1' }
  ]

  return (
    <div className="pm-page">
      <style>{css}</style>
      <header className="pm-header">
        <div className="pm-header-inner">
          <div className="pm-brand">
            <div className="pm-logo">+</div>
            <div>
              <div className="pm-brand-name">MediRescue</div>
              <div className="pm-brand-sub">SUPER ADMIN PORTAL</div>
            </div>
          </div>
          <button className="pm-back" type="button"
            onClick={() => navigate('/admin-dashboard')}>← Dashboard</button>
        </div>
      </header>

      <main className="pm-main">
        <p className="pm-eyebrow">FINANCIAL OPERATIONS</p>
        <h1 className="pm-title">Payment Management</h1>
        <p className="pm-subtitle">
          Monitor emergency service payments, M-Pesa references and transaction
          statuses across MediRescue.
        </p>

        {error && <div role="alert" className="pm-error">{error}</div>}

        {!loading && !error && (
          <div className="pm-stats">
            {cards.map(card => (
              <div className="pm-stat" key={card.label}>
                <div className="pm-stat-top">
                  <div className="pm-stat-label">{card.label}</div>
                  <div className="pm-stat-icon" style={{ color: card.color, background: card.tint }}>
                    {card.symbol}
                  </div>
                </div>
                <div className={`pm-stat-value ${card.label === 'Total Revenue' ? 'pm-stat-revenue' : ''}`}>
                  {card.value}
                </div>
              </div>
            ))}
          </div>
        )}

        <section className="pm-panel">
          <div className="pm-panel-head">
            <div>
              <h2 className="pm-panel-title">Payment Records</h2>
              <p className="pm-panel-desc">
                Showing {filteredPayments.length} of {payments.length} transactions
              </p>
            </div>
            <button type="button" className="pm-btn" disabled={loading}
              onClick={() => loadPayments()}>
              {loading ? 'Loading...' : '↻ Refresh Records'}
            </button>
          </div>
          <div className="pm-controls">
            <input type="search" className="pm-search" aria-label="Search payment records"
              placeholder="Search case, hospital, M-Pesa reference..."
              value={search} onChange={e => setSearch(e.target.value)} />
            <select className="pm-filter" aria-label="Filter payments by status"
              value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="all">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          {loading ? (
            <div className="pm-empty">Loading payment records...</div>
          ) : !error && filteredPayments.length === 0 ? (
            <div className="pm-empty">No payment records match your search or filter.</div>
          ) : !error ? (
            <div className="pm-table-wrap">
              <table className="pm-table">
                <thead><tr>
                  {['Payment ID', 'Case ID', 'Hospital', 'M-Pesa Reference',
                    'Amount', 'Status', 'Phone Number', 'Paid At']
                    .map(label => <th key={label}>{label}</th>)}
                </tr></thead>
                <tbody>
                  {filteredPayments.map(p => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 850, color: '#e52634' }}>#{p.id}</td>
                      <td>{p.case_id}</td>
                      <td>{p.hospital_name || 'Unknown'}</td>
                      <td>{p.mpesa_ref || '—'}</td>
                      <td style={{ fontWeight: 750 }}>{formatAmount(p.amount)}</td>
                      <td>{statusBadge(p.status)}</td>
                      <td>{p.phone_number || '—'}</td>
                      <td>{formatDate(p.paid_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
        <p className="pm-note">
          Revenue includes only payments recorded as completed.
          Pending and failed transactions are excluded.
        </p>
      </main>
    </div>
  )
}

export default PaymentManagement
