import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const API_URL = 'http://localhost:5000/api'
const POLL_INTERVAL = 10000
const MAX_CHECKS = 12

function PayNow() {
  const navigate = useNavigate()

  const [cases, setCases] = useState([])
  const [caseId, setCaseId] = useState('')
  const [phone, setPhone] = useState('')
  const [loadingCases, setLoadingCases] = useState(true)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [result, setResult] = useState(null)

  const timerRef = useRef(null)
  const activeRef = useRef(false)
  const requestRef = useRef(0)
  const checksRef = useRef(0)
  const mountedRef = useRef(false)

  const selectedCase = cases.find(
    (item) => String(item.id) === String(caseId)
  )

  const eligibleCases = cases.filter(
    (item) =>
      item.status === 'payment_pending' &&
      Number(item.payment_amount) > 0
  )

  const amount = selectedCase
    ? Number(selectedCase.payment_amount)
    : 0

  const getToken = () =>
    localStorage.getItem('medirescue_token')

  const stopChecking = useCallback(() => {
    activeRef.current = false
    requestRef.current += 1

    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }

    if (mountedRef.current) {
      setChecking(false)
    }
  }, [])

  const loadCases = useCallback(async () => {
    const token = getToken()

    if (!token) {
      navigate('/login')
      return
    }

    setLoadingCases(true)

    try {
      const response = await fetch(`${API_URL}/cases`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (response.status === 401 || response.status === 403) {
        navigate('/login')
        return
      }

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.error || 'Unable to load emergency cases'
        )
      }

      if (!Array.isArray(data)) {
        throw new Error('Unexpected response from cases API')
      }

      if (!mountedRef.current) return

      setCases(data)

      const eligible = data.filter(
        (item) =>
          item.status === 'payment_pending' &&
          Number(item.payment_amount) > 0
      )

      setCaseId((previous) =>
        eligible.some((item) => String(item.id) === previous)
          ? previous
          : eligible.length === 1
            ? String(eligible[0].id)
            : ''
      )
    } catch (err) {
      if (mountedRef.current) {
        setError(err.message || 'Failed to load cases')
      }
    } finally {
      if (mountedRef.current) {
        setLoadingCases(false)
      }
    }
  }, [navigate])

  useEffect(() => {
    mountedRef.current = true
    loadCases()

    return () => {
      mountedRef.current = false
      activeRef.current = false
      requestRef.current += 1

      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [loadCases])

  const checkPaymentStatus = async (id, requestId) => {
    if (
      !activeRef.current ||
      requestId !== requestRef.current
    ) {
      return
    }

    const token = getToken()

    if (!token) {
      stopChecking()
      navigate('/login')
      return
    }

    checksRef.current += 1

    try {
      const response = await fetch(
        `${API_URL}/mpesa/status/${encodeURIComponent(id)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )

      const data = await response.json()

      if (
        !mountedRef.current ||
        !activeRef.current ||
        requestId !== requestRef.current
      ) {
        return
      }

      if (response.status === 401) {
        stopChecking()
        navigate('/login')
        return
      }

      if (!response.ok) {
        throw new Error(
          data.error || 'Unable to check payment status'
        )
      }

      if (data.status === 'completed') {
        setResult((previous) => ({
          ...previous,
          status: 'completed',
          result_code: data.result_code
        }))

        setNotice('Payment confirmed by the backend.')
        stopChecking()
        await loadCases()
        return
      }

      if (data.status === 'failed') {
        setResult((previous) => ({
          ...previous,
          status: 'failed',
          result_code: data.result_code
        }))

        setNotice(
          'Payment was not completed. You may retry after checking the transaction status.'
        )

        stopChecking()
        return
      }

      setResult((previous) => ({
        ...previous,
        status: 'pending'
      }))
    } catch (err) {
      console.error('Payment status check:', err.message)

      if (
        !mountedRef.current ||
        !activeRef.current ||
        requestId !== requestRef.current
      ) {
        return
      }

      setNotice(
        'Unable to confirm payment status yet. Automatic checking will continue.'
      )
    }

    if (checksRef.current >= MAX_CHECKS) {
      setNotice(
        'Automatic checking has paused. Payment is not confirmed. ' +
        'Check the status before attempting another payment.'
      )

      stopChecking()
      return
    }

    if (
      activeRef.current &&
      requestId === requestRef.current
    ) {
      timerRef.current = setTimeout(
        () => checkPaymentStatus(id, requestId),
        POLL_INTERVAL
      )
    }
  }

  const handlePayment = async (event) => {
    event.preventDefault()

    if (loading || checking) return

    setError('')
    setNotice('')

    const parsedCaseId = Number(caseId)
    const normalizedPhone = phone.replace(/\D/g, '')

    if (
      !selectedCase ||
      selectedCase.status !== 'payment_pending' ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      setError('Please select a valid unpaid emergency case.')
      return
    }

    if (
      !Number.isSafeInteger(parsedCaseId) ||
      parsedCaseId <= 0
    ) {
      setError('Please select a valid emergency case.')
      return
    }

    if (!/^254[71]\d{8}$/.test(normalizedPhone)) {
      setError(
        'Enter a valid Safaricom number, e.g. 2547XXXXXXXX'
      )
      return
    }

    const token = getToken()

    if (!token) {
      navigate('/login')
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const response = await fetch(
        `${API_URL}/mpesa/initiate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            case_id: parsedCaseId,
            phone_number: normalizedPhone
          })
        }
      )

      const data = await response.json()

      if (response.status === 401) {
        navigate('/login')
        return
      }

      if (!response.ok) {
        throw new Error(
          data.error || 'Unable to initiate M-Pesa payment'
        )
      }

      if (!mountedRef.current) return

      setResult({
        ...data,
        case_id: parsedCaseId,
        status: 'pending'
      })

      setNotice(
        'M-Pesa request submitted. Waiting for confirmation.'
      )

      checksRef.current = 0
      activeRef.current = true
      requestRef.current += 1

      const requestId = requestRef.current

      setChecking(true)

      timerRef.current = setTimeout(
        () => checkPaymentStatus(parsedCaseId, requestId),
        POLL_INTERVAL
      )
    } catch (err) {
      if (mountedRef.current) {
        setError(
          err.message || 'Payment request failed.'
        )
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }

  const handleCaseChange = (value) => {
    stopChecking()
    setCaseId(value)
    setResult(null)
    setNotice('')
    setError('')
  }

  const handleManualCheck = () => {
    if (!caseId || loading || checking) return

    setError('')
    setNotice('Checking the latest payment status...')

    checksRef.current = 0
    activeRef.current = true
    requestRef.current += 1

    const requestId = requestRef.current

    setChecking(true)
    checkPaymentStatus(Number(caseId), requestId)
  }

  const inputStyle = {
    width: '100%',
    padding: '13px',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    marginTop: '8px',
    marginBottom: '20px',
    boxSizing: 'border-box',
    backgroundColor: '#ffffff',
    color: '#17233b',
    fontSize: '15px'
  }

  const labelStyle = {
    display: 'block',
    color: '#17233b',
    fontSize: '14px',
    fontWeight: 600
  }

  const paymentStatus = result?.status || 'pending'

  const statusColors = {
    completed: {
      background: '#f0fdf4',
      color: '#166534',
      border: '1px solid #bbf7d0'
    },
    failed: {
      background: '#fef2f2',
      color: '#b91c1c',
      border: '1px solid #fecaca'
    },
    pending: {
      background: '#eff6ff',
      color: '#1d4ed8',
      border: '1px solid #bfdbfe'
    }
  }

  const paymentDisabled =
    loading ||
    loadingCases ||
    checking ||
    !selectedCase ||
    (result && paymentStatus !== 'failed')

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f3f6fa',
        padding: '40px 20px',
        boxSizing: 'border-box',
        color: '#17233b'
      }}
    >
      <main
        style={{
          maxWidth: '520px',
          margin: 'auto',
          background: '#ffffff',
          padding: '30px',
          borderRadius: '14px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.06)'
        }}
      >
        <button
          type="button"
          onClick={() => navigate('/patient-dashboard')}
          style={{
            border: 'none',
            background: 'transparent',
            color: '#dc2626',
            fontWeight: 600,
            cursor: 'pointer',
            marginBottom: '24px'
          }}
        >
          ← Back to Dashboard
        </button>

        <header style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '29px', marginBottom: '10px' }}>
            Pay with M-Pesa
          </h1>

          <p
            style={{
              color: '#64748b',
              lineHeight: 1.6,
              marginBottom: '28px'
            }}
          >
            Pay for your MediRescue emergency service
            securely using M-Pesa.
          </p>
        </header>

        <form onSubmit={handlePayment}>
          <label htmlFor="caseId" style={labelStyle}>
            Emergency Case
          </label>

          <select
            id="caseId"
            value={caseId}
            onChange={(event) =>
              handleCaseChange(event.target.value)
            }
            disabled={loadingCases || loading || checking}
            required
            style={inputStyle}
          >
            <option value="">
              {loadingCases
                ? 'Loading emergency cases...'
                : 'Select an emergency case'}
            </option>

            {eligibleCases.map((item) => (
              <option key={item.id} value={item.id}>
                Case #{item.id} — {item.hospital_name}
              </option>
            ))}
          </select>

          {!loadingCases && eligibleCases.length === 0 && (
            <p
              style={{
                color: '#64748b',
                fontSize: '14px',
                marginTop: '-10px',
                marginBottom: '20px'
              }}
            >
              No emergency cases currently require payment.
            </p>
          )}

          {selectedCase && (
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '16px',
                marginBottom: '22px'
              }}
            >
              <div
                style={{
                  color: '#64748b',
                  fontSize: '13px',
                  marginBottom: '6px'
                }}
              >
                Hospital
              </div>

              <strong>{selectedCase.hospital_name}</strong>

              <div
                style={{
                  color: '#64748b',
                  fontSize: '13px',
                  marginTop: '15px',
                  marginBottom: '6px'
                }}
              >
                Emergency Status
              </div>

              <strong>Payment Pending</strong>
            </div>
          )}

          <label htmlFor="phone" style={labelStyle}>
            Safaricom Phone Number
          </label>

          <input
            id="phone"
            type="tel"
            required
            value={phone}
            onChange={(event) =>
              setPhone(event.target.value)
            }
            disabled={loading || checking}
            placeholder="2547XXXXXXXX"
            style={inputStyle}
          />

          <label htmlFor="amount" style={labelStyle}>
            Amount (KSh)
          </label>

          <input
            id="amount"
            type="text"
            value={
              selectedCase
                ? amount.toLocaleString('en-KE', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })
                : ''
            }
            placeholder="Select a case to view amount"
            readOnly
            style={{
              ...inputStyle,
              background: '#f1f5f9',
              fontWeight: 700,
              cursor: 'not-allowed'
            }}
          />

          <p
            style={{
              color: '#64748b',
              fontSize: '12px',
              marginTop: '-12px',
              marginBottom: '22px'
            }}
          >
            Payment amount is determined by MediRescue
            and cannot be edited.
          </p>

          {error && (
            <div
              role="alert"
              style={{
                background: '#fef2f2',
                color: '#b91c1c',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                padding: '14px',
                marginBottom: '18px'
              }}
            >
              {error}
            </div>
          )}

          {result && (
            <div
              role="status"
              aria-live="polite"
              style={{
                ...statusColors[paymentStatus],
                padding: '16px',
                borderRadius: '8px',
                marginBottom: '20px',
                textAlign: 'center'
              }}
            >
              <strong>
                {paymentStatus === 'completed'
                  ? 'M-Pesa Payment Confirmed'
                  : paymentStatus === 'failed'
                    ? 'M-Pesa Payment Failed'
                    : 'M-Pesa Request Submitted'}
              </strong>

              <p>Case ID: {result.case_id}</p>

              <p>
                Status: <strong>{paymentStatus}</strong>
              </p>

              <p style={{ fontSize: '14px' }}>
                {notice}
              </p>

              {checking && (
                <p style={{ fontSize: '13px' }}>
                  Checking payment status...
                </p>
              )}

              {result.result_code != null &&
                paymentStatus === 'failed' && (
                  <p style={{ fontSize: '13px' }}>
                    Safaricom result code: {result.result_code}
                  </p>
                )}

              {paymentStatus === 'pending' && (
                <small>
                  A submitted request does not mean
                  payment has been completed.
                </small>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={paymentDisabled}
            style={{
              width: '100%',
              padding: '15px',
              background: '#16a34a',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '15px',
              cursor: paymentDisabled
                ? 'not-allowed'
                : 'pointer',
              opacity: paymentDisabled ? 0.6 : 1
            }}
          >
            {loading
              ? 'Sending M-Pesa Request...'
              : checking
                ? 'Checking Payment...'
                : result?.status === 'completed'
                  ? 'Payment Completed'
                  : result?.status === 'pending'
                    ? 'Awaiting Confirmation'
                    : result?.status === 'failed'
                      ? 'Retry M-Pesa Payment'
                      : 'Pay with M-Pesa'}
          </button>

          {result?.status === 'pending' && !checking && (
            <button
              type="button"
              onClick={handleManualCheck}
              style={{
                width: '100%',
                padding: '13px',
                marginTop: '12px',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                color: '#17233b',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Check Payment Status
            </button>
          )}
        </form>

        <p
          style={{
            fontSize: '12px',
            color: '#64748b',
            marginTop: '24px',
            textAlign: 'center',
            lineHeight: 1.7
          }}
        >
          MediRescue currently uses M-Pesa Sandbox.
          Transactions are simulated and do not transfer
          real money. Real phone prompts require approved
          production credentials.
        </p>
      </main>
    </div>
  )
}

export default PayNow