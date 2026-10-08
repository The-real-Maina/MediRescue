
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const API_URL = 'http://localhost:5000/api/admin/payments'

function PaymentManagement() {
  const navigate = useNavigate()

  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const loadPayments = async (signal) => {
    setLoading(true)
    setError('')

    try {
      const token = localStorage.getItem('medirescue_token')

      if (!token) {
        navigate('/login', { replace: true })
        return
      }

      const response = await fetch(API_URL, {
        headers: {
          Authorization: `Bearer ${token}`
        },
        signal
      })

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('medirescue_token')
        localStorage.removeItem('medirescue_user')
        navigate('/login', { replace: true })
        return
      }

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.error || 'Failed to retrieve payments'
        )
      }

      if (!Array.isArray(data)) {
        throw new Error('Unexpected API response')
      }

      if (!signal?.aborted) {
        setPayments(data)
      }

    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Failed to load payments')
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    const controller = new AbortController()

    loadPayments(controller.signal)

    return () => controller.abort()
  }, [navigate])

  const filteredPayments = payments.filter((payment) => {
    const query = search.trim().toLowerCase()

    const matchesSearch = [
      payment.id,
      payment.case_id,
      payment.hospital_name,
      payment.mpesa_ref,
      payment.phone_number
    ].some((value) =>
      String(value ?? '').toLowerCase().includes(query)
    )

    const matchesStatus =
      statusFilter === 'all' ||
      payment.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const formatAmount = (amount) => {
    if (amount === null || amount === undefined) {
      return '—'
    }

    return `KSh ${Number(amount).toLocaleString('en-KE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`
  }

  const formatDate = (value) => {
    if (!value) return '—'

    const date = new Date(value)

    return Number.isNaN(date.getTime())
      ? '—'
      : date.toLocaleString('en-KE')
  }

  const formatStatus = (status) =>
    String(status || 'Unknown')
      .replace(/\b\w/g, (letter) => letter.toUpperCase())

  const cellStyle = {
    padding: '14px 12px',
    borderBottom: '1px solid #e2e8f0',
    textAlign: 'left',
    color: '#17233b'
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#f3f6fa',
        padding: '30px 20px',
        color: '#17233b'
      }}
    >
      <main style={{ maxWidth: '1350px', margin: 'auto' }}>
        <button
          type="button"
          onClick={() => navigate('/admin-dashboard')}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#dc2626',
            cursor: 'pointer',
            marginBottom: '25px'
          }}
        >
          ← Back to Admin Dashboard
        </button>

        <h1 style={{ color: '#17233b' }}>
          Payment Management
        </h1>

        <p style={{ color: '#64748b', marginBottom: '30px' }}>
          Monitor emergency service payment records,
          M-Pesa references and transaction statuses
          across MediRescue.
        </p>

        <section
          style={{
            backgroundColor: '#ffffff',
            padding: '24px',
            borderRadius: '12px'
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '15px',
              marginBottom: '22px'
            }}
          >
            <h2 style={{ color: '#17233b', margin: 0 }}>
              Payment Records ({filteredPayments.length})
            </h2>

            <button
              type="button"
              disabled={loading}
              onClick={() => loadPayments()}
              style={{
                backgroundColor: '#dc2626',
                color: '#ffffff',
                border: 'none',
                borderRadius: '7px',
                padding: '11px 18px',
                cursor: 'pointer'
              }}
            >
              {loading ? 'Loading...' : 'Refresh Records'}
            </button>
          </div>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '12px',
              marginBottom: '24px'
            }}
          >
            <input
              type="search"
              placeholder="Search case, hospital, M-Pesa reference..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                flex: '1 1 260px',
                padding: '12px',
                border: '1px solid #cbd5e1',
                borderRadius: '7px',
                backgroundColor: '#fff',
                color: '#17233b'
              }}
            />

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: '12px',
                border: '1px solid #cbd5e1',
                borderRadius: '7px',
                backgroundColor: '#fff',
                color: '#17233b'
              }}
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          {error && (
            <p role="alert" style={{ color: '#b91c1c' }}>
              {error}
            </p>
          )}

          {loading ? (
            <p>Loading payment records...</p>
          ) : !error && filteredPayments.length === 0 ? (
            <p>
              No payment records found.
            </p>
          ) : !error ? (
            <div style={{ overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  minWidth: '1000px',
                  borderCollapse: 'collapse'
                }}
              >
                <thead>
                  <tr>
                    {[
                      'Payment ID',
                      'Case ID',
                      'Hospital',
                      'M-Pesa Reference',
                      'Amount',
                      'Status',
                      'Phone Number',
                      'Paid At'
                    ].map((heading) => (
                      <th
                        key={heading}
                        style={{
                          ...cellStyle,
                          borderBottom: '2px solid #cbd5e1'
                        }}
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {filteredPayments.map((payment) => (
                    <tr key={payment.id}>
                      <td style={cellStyle}>{payment.id}</td>

                      <td style={cellStyle}>
                        {payment.case_id}
                      </td>

                      <td style={cellStyle}>
                        {payment.hospital_name || 'Unknown'}
                      </td>

                      <td style={cellStyle}>
                        {payment.mpesa_ref || '—'}
                      </td>

                      <td style={cellStyle}>
                        {formatAmount(payment.amount)}
                      </td>

                      <td style={cellStyle}>
                        {formatStatus(payment.status)}
                      </td>

                      <td style={cellStyle}>
                        {payment.phone_number || '—'}
                      </td>

                      <td style={cellStyle}>
                        {formatDate(payment.paid_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      </main>
    </div>
  )
}

export default PaymentManagement
