import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import CaseChat from '../components/CaseChat'
import PaymentReceipt from '../components/PaymentReceipt'
import ReportIssue from '../components/ReportIssue'
import FirstAidChat from '../components/FirstAidChat'

// ==========================================
// MEDIRESCUE — MY EMERGENCY CASES
// LIGHT MODE — INLINE CSS
// ==========================================

const REFRESH_INTERVAL = 10000

// Works whether VITE_API_URL ends in /api or not
const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000')
  .replace(/\/+$/, '')
  .replace(/\/api$/, '')

// A case is "live" until it is paid or closed
const ACTIVE_STATUSES = ['requested', 'assigned', 'dispatched', 'picked_up', 'in_treatment']

const styles = {
  page: {
    minHeight: '100vh',
    background: '#f1f5f9',
    color: '#17233b',
    fontFamily: "'Segoe UI', Arial, sans-serif"
  },
  header: {
    background: '#10243a',
    borderBottom: '4px solid #dc2626',
    padding: '18px 5%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 16
  },
  brand: { color: '#ffffff', fontSize: 25, fontWeight: 800, margin: 0 },
  portal: { color: '#cbd5e1', fontSize: 10, letterSpacing: 1.6, marginTop: 5 },
  headerButton: {
    background: 'transparent',
    color: '#ffffff',
    border: '1px solid #64748b',
    borderRadius: 8,
    padding: '11px 17px',
    fontWeight: 700,
    cursor: 'pointer'
  },
  container: { maxWidth: 1150, margin: '0 auto', padding: '42px 20px 65px' },
  backButton: {
    background: 'transparent',
    border: 'none',
    color: '#dc2626',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    padding: 0,
    marginBottom: 28
  },
  eyebrow: {
    color: '#dc2626',
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: 1.5,
    marginBottom: 10
  },
  title: {
    color: '#10243a',
    fontSize: 'clamp(28px, 4vw, 38px)',
    fontWeight: 800,
    margin: '0 0 12px'
  },
  subtitle: { color: '#64748b', fontSize: 15, lineHeight: 1.7, margin: 0 },
  summary: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 18,
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: 14,
    padding: '22px 25px',
    marginTop: 30,
    marginBottom: 30,
    boxShadow: '0 5px 20px rgba(15,23,42,0.04)'
  },
  summaryLabel: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 0.5
  },
  summaryNumber: { color: '#10243a', fontSize: 30, fontWeight: 800, marginTop: 5 },
  redButton: {
    background: '#dc2626',
    color: '#ffffff',
    border: 'none',
    borderRadius: 9,
    padding: '13px 19px',
    fontSize: 14,
    fontWeight: 800,
    cursor: 'pointer'
  },
  firstAidButton: {
    background: '#dc2626',
    color: '#ffffff',
    border: 'none',
    borderRadius: 20,
    padding: '8px 14px',
    fontSize: 12,
    fontWeight: 800,
    lineHeight: 1.3,
    cursor: 'pointer'
  },
  list: { display: 'flex', flexDirection: 'column', gap: 20 },
  card: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: 15,
    padding: 'clamp(20px, 4vw, 28px)',
    boxShadow: '0 6px 22px rgba(15,23,42,0.05)'
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 15,
    marginBottom: 20
  },
  caseNumber: {
    color: '#dc2626',
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: 1.2,
    marginBottom: 8,
    display: 'block'
  },
  cardTitle: { color: '#10243a', fontSize: 21, fontWeight: 800, margin: 0 },
  description: { color: '#64748b', fontSize: 14, lineHeight: 1.7, margin: '0 0 22px' },
  divider: { border: 'none', height: 1, background: '#e2e8f0', margin: '0 0 22px' },
  details: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))',
    gap: 22
  },
  detailLabel: {
    display: 'block',
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8
  },
  detailValue: { color: '#334155', fontSize: 14, fontWeight: 700, overflowWrap: 'anywhere' },
  message: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: 14,
    padding: '35px 25px',
    textAlign: 'center',
    color: '#64748b',
    fontSize: 14,
    lineHeight: 1.7
  },
  error: {
    background: '#fee2e2',
    color: '#991b1b',
    border: '1px solid #fecaca',
    borderRadius: 10,
    padding: 18,
    marginBottom: 25,
    fontSize: 14,
    lineHeight: 1.7
  },
  emptyIcon: {
    width: 65,
    height: 65,
    borderRadius: 16,
    background: '#e0f2fe',
    color: '#0369a1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 18px',
    fontSize: 30,
    fontWeight: 800
  },
  footer: { color: '#94a3b8', textAlign: 'center', fontSize: 12, marginTop: 45 }
}

// ==========================================
// STATUS COLORS
// ==========================================

const statusStyles = {
  requested: { background: '#fef3c7', color: '#92400e' },
  assigned: { background: '#dbeafe', color: '#1d4ed8' },
  dispatched: { background: '#dbeafe', color: '#1d4ed8' },
  picked_up: { background: '#e0e7ff', color: '#4338ca' },
  in_treatment: { background: '#f3e8ff', color: '#7e22ce' },
  payment_pending: { background: '#ffedd5', color: '#c2410c' },
  paid: { background: '#dcfce7', color: '#15803d' },
  closed: { background: '#e2e8f0', color: '#475569' }
}

const severityStyles = {
  low: { background: '#dcfce7', color: '#166534' },
  moderate: { background: '#fef3c7', color: '#92400e' },
  high: { background: '#ffedd5', color: '#c2410c' },
  critical: { background: '#fee2e2', color: '#b91c1c' }
}

const badgeBase = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '8px 12px',
  borderRadius: 20,
  fontSize: 12,
  fontWeight: 800,
  lineHeight: 1.3
}

// ==========================================
// MY CASES COMPONENT
// ==========================================

function MyCases() {
  const navigate = useNavigate()

  const [cases, setCases] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [aidOpen, setAidOpen] = useState(false)

  // Safely get user for the receipt
  let user = {}
  try {
    user = JSON.parse(localStorage.getItem('medirescue_user') || '{}') || {}
  } catch {
    user = {}
  }

  const fetchCases = useCallback(async (isFirstLoad) => {
    const token = localStorage.getItem('medirescue_token')

    if (!token) {
      navigate('/login')
      return
    }

    try {
      const response = await fetch(`${API_BASE}/api/cases`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      const data = await response.json()

      if (response.status === 401) {
        navigate('/login')
        return
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load emergency cases')
      }

      setCases(Array.isArray(data) ? data : Array.isArray(data.cases) ? data.cases : [])
      setError('')

    } catch (err) {
      if (isFirstLoad) setError(err.message || 'Unable to load emergency cases.')
    } finally {
      if (isFirstLoad) setLoading(false)
    }
  }, [navigate])

  useEffect(() => {
    fetchCases(true)
    const interval = setInterval(() => { fetchCases(false) }, REFRESH_INTERVAL)
    return () => clearInterval(interval)
  }, [fetchCases])

  const formatStatus = (status) => {
    if (!status) return 'Unknown'
    return String(status).replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
  }

  const getStatusStyle = (status) => ({
    ...badgeBase,
    ...(statusStyles[status] || { background: '#e2e8f0', color: '#334155' })
  })

  const getSeverityStyle = (severity) => ({
    ...badgeBase,
    ...(severityStyles[severity] || { background: '#f1f5f9', color: '#475569' })
  })

  // The assistant is only available while at least one case is live
  const hasActiveCase = cases.some((c) => ACTIVE_STATUSES.includes(c.status))

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h2 style={styles.brand}>✚ MediRescue</h2>
          <div style={styles.portal}>PATIENT PORTAL • CASE TRACKING</div>
        </div>
        <button type="button" style={styles.headerButton} onClick={() => navigate('/patient-dashboard')}>
          ← Dashboard
        </button>
      </header>

      <main style={styles.container}>
        <button type="button" style={styles.backButton} onClick={() => navigate('/patient-dashboard')}>
          ← Back to Patient Dashboard
        </button>

        <section>
          <p style={styles.eyebrow}>MEDIRESCUE CASE MANAGEMENT</p>
          <h1 style={styles.title}>My Emergency Cases</h1>
          <p style={styles.subtitle}>Track your submitted emergency requests, monitor their response status, and review important case details.</p>
        </section>

        <section style={styles.summary}>
          <div>
            <span style={styles.summaryLabel}>TOTAL EMERGENCY REQUESTS</span>
            <div style={styles.summaryNumber}>{loading ? '—' : error ? '—' : cases.length}</div>
          </div>
          <button type="button" style={styles.redButton} onClick={() => navigate('/emergency-request')}>
            + New Emergency Request
          </button>
        </section>

        {loading && <div style={styles.message} role="status">⏳ Loading your emergency cases...</div>}

        {!loading && error && (
          <div style={styles.error} role="alert">
            <strong>Unable to load cases</strong>
            <div>{error}</div>
          </div>
        )}

        {!loading && !error && cases.length === 0 && (
          <div style={styles.message}>
            <div style={styles.emptyIcon}>☷</div>
            <h3 style={{ color: '#10243a', fontSize: 22, margin: '0 0 12px' }}>No Emergency Cases Yet</h3>
            <p style={{ margin: '0 0 22px', color: '#64748b' }}>You have not submitted any emergency requests yet. Your requests will appear here once they have been created.</p>
            <button type="button" style={styles.redButton} onClick={() => navigate('/emergency-request')}>
              Request Emergency Help →
            </button>
          </div>
        )}

        {!loading && !error && cases.length > 0 && (
          <section style={styles.list}>
            {cases.map((caseItem, index) => {
              const caseId = caseItem.id ?? caseItem.case_id ?? index + 1
              const hospitalName = caseItem.hospital_name || (caseItem.hospital_id ? `Hospital ${caseItem.hospital_id}` : 'Not yet assigned')
              const isLive = ACTIVE_STATUSES.includes(caseItem.status)

              return (
                <article key={caseId} style={styles.card}>
                  <div style={styles.cardHeader}>
                    <div>
                      <span style={styles.caseNumber}>CASE #{caseId}</span>
                      <h3 style={styles.cardTitle}>{caseItem.emergency_type || 'Emergency Request'}</h3>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
                      {caseItem.dispute_status === 'open' && (
                        <span style={{ ...badgeBase, background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}>
                          ⚠️ Dispute Under Review
                        </span>
                      )}
                      <span style={getStatusStyle(caseItem.status)}>{formatStatus(caseItem.status)}</span>
                      {isLive && (
                        <button
                          type="button"
                          style={styles.firstAidButton}
                          onClick={() => setAidOpen(true)}
                        >
                          ✚ First-Aid Help
                        </button>
                      )}
                    </div>
                  </div>

                  <p style={styles.description}>{caseItem.emergency_desc || 'No emergency description provided.'}</p>
                  <hr style={styles.divider} />

                  <div style={styles.details}>
                    <div>
                      <span style={styles.detailLabel}>Severity</span>
                      <span style={getSeverityStyle(caseItem.severity)}>{caseItem.severity ? formatStatus(caseItem.severity) : 'Not specified'}</span>
                    </div>
                    <div>
                      <span style={styles.detailLabel}>Assigned Hospital</span>
                      <strong style={styles.detailValue}>{hospitalName}</strong>
                    </div>
                    <div>