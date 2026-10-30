import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

// ==========================================
// MEDIRESCUE — M-PESA PAYMENT PORTAL
// LIGHT MODE — INLINE CSS ONLY
// ==========================================

const API_URL = 'http://192.168.137.1:5000/api'
const POLL_INTERVAL = 10000
const MAX_CHECKS = 12

// The simulate section only exists while running `npm run dev`.
// The server also refuses simulation unless it is enabled in .env.
const SIMULATION_UI = import.meta.env.DEV

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

  brand: {
    color: '#ffffff',
    fontSize: 25,
    fontWeight: 800,
    margin: 0
  },

  portal: {
    color: '#cbd5e1',
    fontSize: 10,
    letterSpacing: 1.6,
    marginTop: 5
  },

  headerButton: {
    background: 'transparent',
    border: '1px solid #64748b',
    color: '#ffffff',
    borderRadius: 8,
    padding: '11px 17px',
    fontWeight: 700,
    cursor: 'pointer'
  },

  container: {
    maxWidth: 950,
    margin: '0 auto',
    padding: '40px 20px 65px'
  },

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

  subtitle: {
    color: '#64748b',
    fontSize: 15,
    lineHeight: 1.7,
    margin: 0
  },

  notice: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 16,
    flexWrap: 'wrap',
    background: '#ecfdf5',
    border: '1px solid #bbf7d0',
    borderLeft: '5px solid #16a34a',
    borderRadius: 13,
    padding: '20px 23px',
    margin: '30px 0'
  },

  noticeIcon: {
    width: 46,
    height: 46,
    background: '#dcfce7',
    color: '#15803d',
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 18,
    fontWeight: 800
  },

  noticeTitle: {
    color: '#166534',
    fontSize: 17,
    fontWeight: 800,
    margin: '0 0 7px'
  },

  noticeText: {
    color: '#166534',
    fontSize: 13,
    lineHeight: 1.7,
    margin: 0
  },

  card: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: 16,
    padding: 'clamp(20px, 4vw, 36px)',
    boxShadow: '0 8px 28px rgba(15,23,42,0.05)'
  },

  sectionTitle: {
    color: '#10243a',
    fontSize: 20,
    fontWeight: 800,
    margin: '0 0 8px'
  },

  sectionDescription: {
    color: '#64748b',
    fontSize: 13,
    lineHeight: 1.7,
    margin: '0 0 26px'
  },

  divider: {
    border: 'none',
    height: 1,
    background: '#e2e8f0',
    margin: '30px 0'
  },

  formGroup: {
    marginBottom: 23
  },

  label: {
    display: 'block',
    color: '#334155',
    fontSize: 14,
    fontWeight: 700,
    marginBottom: 9
  },

  input: {
    display: 'block',
    width: '100%',
    boxSizing: 'border-box',
    padding: '13px 14px',
    border: '1px solid #cbd5e1',
    borderRadius: 9,
    background: '#ffffff',
    color: '#17233b',
    fontFamily: 'inherit',
    fontSize: 14,
    outlineColor: '#16a34a'
  },

  helpText: {
    color: '#64748b',
    fontSize: 12,
    lineHeight: 1.7,
    margin: '9px 0 0'
  },

  caseInfo: {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: 12,
    padding: 20,
    marginBottom: 25
  },

  detailLabel: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: 1,
    textTransform: 'uppercase',
    display: 'block',
    marginBottom: 7
  },

  detailValue: {
    color: '#10243a',
    fontSize: 15,
    fontWeight: 800
  },

  amountBox: {
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: 12,
    padding: '20px 22px',
    marginBottom: 25
  },

  amountLabel: {
    color: '#166534',
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: 0.7
  },

  amountValue: {
    color: '#166534',
    fontSize: 'clamp(26px, 4vw, 34px)',
    fontWeight: 800,
    margin: '8px 0'
  },

  error: {
    background: '#fef2f2',
    color: '#991b1b',
    border: '1px solid #fecaca',
    borderRadius: 10,
    padding: 16,
    fontSize: 14,
    lineHeight: 1.7,
    marginBottom: 22
  },

  statusBox: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
    lineHeight: 1.7
  },

  payButton: {
    width: '100%',
    padding: '16px 20px',
    background: '#16a34a',
    color: '#ffffff',
    border: 'none',
    borderRadius: 10,
    fontSize: 15,
    fontWeight: 800,
    cursor: 'pointer'
  },

  checkButton: {
    width: '100%',
    padding: '14px 20px',
    marginTop: 13,
    background: '#ffffff',
    color: '#10243a',
    border: '1px solid #cbd5e1',
    borderRadius: 9,
    fontSize: 14,
    fontWeight: 800,
    cursor: 'pointer'
  },

  empty: {
    background: '#f8fafc',
    border: '1px dashed #cbd5e1',
    borderRadius: 10,
    padding: '18px 20px',
    color: '#64748b',
    fontSize: 14,
    lineHeight: 1.7,
    marginBottom: 22
  },

  sandbox: {
    background: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: 12,
    padding: '18px 20px',
    marginTop: 28,
    color: '#1e40af',
    fontSize: 13,
    lineHeight: 1.8
  },

  simulation: {
    background: '#fffbeb',
    border: '1px solid #fde68a',
    borderLeft: '5px solid #d97706',
    borderRadius: 12,
    padding: '20px 22px',
    marginTop: 28,
    color: '#92400e',
    fontSize: 13,
    lineHeight: 1.8
  },

  simulationButtons: {
    display: 'flex',
    gap: 12,
    flexWrap: 'wrap',
    marginTop: 14
  },

  simulateSuccess: {
    flex: 1,
    minWidth: 180,
    padding: '13px 16px',
    background: '#d97706',
    color: '#ffffff',
    border: 'none',
    borderRadius: 9,
    fontSize: 14,
    fontWeight: 800,
    cursor: 'pointer'
  },

  simulateFailed: {
    flex: 1,
    minWidth: 180,
    padding: '13px 16px',
    background: '#ffffff',
    color: '#92400e',
    border: '1px solid #d97706',
    borderRadius: 9,
    fontSize: 14,
    fontWeight: 800,
    cursor: 'pointer'
  },

  footer: {
    color: '#94a3b8',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 35
  }
}

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

// ==========================================
// PAYMENT COMPONENT
// ==========================================

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

  // Development simulation state.
  const [simulating, setSimulating] = useState('')
  const [simMessage, setSimMessage] = useState(null)

  const timerRef = useRef(null)
  const activeRef = useRef(false)
  const requestRef = useRef(0)
  const checksRef = useRef(0)
  const mountedRef = useRef(false)

  const eligibleCases = cases.filter(
    (item) =>
      item.status === 'payment_pending' &&
      Number(item.payment_amount) > 0
  )

  const selectedCase = eligibleCases.find(
    (item) => String(item.id) === String(caseId)
  )

  const amount = selectedCase
    ? Number(selectedCase.payment_amount)
    : 0

  const getToken = () =>
    localStorage.getItem('medirescue_token')

  const formatAmount = (value) =>
    Number(value).toLocaleString('en-KE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })

  // ==========================================
  // STOP PAYMENT STATUS CHECKING
  // ==========================================

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

  // ==========================================
  // LOAD PATIENT CASES
  // ==========================================

  const loadCases = useCallback(async () => {
    const token = getToken()

    if (!token) {
      navigate('/login')
      return
    }

    setLoadingCases(true)

    try {
      const response = await fetch(
        `${API_URL}/cases`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )

      if (
        response.status === 401 ||
        response.status === 403
      ) {
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
        throw new Error(
          'Unexpected response from cases API'
        )
      }

      if (!mountedRef.current) return

      setCases(data)

      const eligible = data.filter(
        (item) =>
          item.status === 'payment_pending' &&
          Number(item.payment_amount) > 0
      )

      setCaseId((previous) =>
        eligible.some(
          (item) => String(item.id) === previous
        )
          ? previous
          : eligible.length === 1
            ? String(eligible[0].id)
            : ''
      )

    } catch (err) {
      if (mountedRef.current) {
        setError(
          err.message || 'Failed to load cases'
        )
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

  // ==========================================
  // CHECK M-PESA PAYMENT STATUS
  // ==========================================

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

        setNotice(
          'Payment confirmed by the backend.'
        )

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
      console.error(
        'Payment status check:',
        err.message
      )

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

  // ==========================================
  // INITIATE M-PESA PAYMENT
  // ==========================================

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
      setError(
        'Please select a valid unpaid emergency case.'
      )
      return
    }

    if (
      !Number.isSafeInteger(parsedCaseId) ||
      parsedCaseId <= 0
    ) {
      setError(
        'Please select a valid emergency case.'
      )
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

  // ==========================================
  // DEVELOPMENT: SIMULATE PAYMENT
  // No money moves. Records a simulated payment
  // through POST /api/mpesa/simulate.
  // ==========================================

  const handleSimulate = async (outcome) => {
    if (simulating || loading || checking) return
    if (!selectedCase) return

    const token = getToken()

    if (!token) {
      navigate('/login')
      return
    }

    const simulatedCaseId = Number(selectedCase.id)

    setSimulating(outcome)
    setSimMessage(null)
    setError('')

    try {
      const response = await fetch(
        `${API_URL}/mpesa/simulate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            case_id: simulatedCaseId,
            outcome
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
          data.error || 'Payment simulation failed'
        )
      }

      if (!mountedRef.current) return

      setSimMessage({
        type: outcome === 'success' ? 'completed' : 'failed',
        text:
          outcome === 'success'
            ? `Simulated payment recorded for Case #${simulatedCaseId}: ` +
              `KSh ${formatAmount(data.amount)}. No money was transferred. ` +
              'The case is now paid and ready for hospital staff to close.'
            : `Simulated failed payment recorded for Case #${simulatedCaseId}. ` +
              'The case is still awaiting payment, so you can try again.'
      })

      await loadCases()

    } catch (err) {
      if (mountedRef.current) {
        setSimMessage({
          type: 'failed',
          text: err.message || 'Payment simulation failed'
        })
      }
    } finally {
      if (mountedRef.current) {
        setSimulating('')
      }
    }
  }

  // ==========================================
  // CASE SELECTION
  // ==========================================

  const handleCaseChange = (value) => {
    stopChecking()
    setCaseId(value)
    setResult(null)
    setNotice('')
    setError('')
    setSimMessage(null)
  }

  // ==========================================
  // MANUAL STATUS CHECK
  // ==========================================

  const handleManualCheck = () => {
    if (!caseId || loading || checking) return

    setError('')
    setNotice(
      'Checking the latest payment status...'
    )

    checksRef.current = 0
    activeRef.current = true
    requestRef.current += 1

    const requestId = requestRef.current

    setChecking(true)

    checkPaymentStatus(Number(caseId), requestId)
  }

  const paymentStatus = result?.status || 'pending'

  const paymentDisabled =
    loading ||
    loadingCases ||
    checking ||
    !selectedCase ||
    (result && paymentStatus !== 'failed')

  const simulationDisabled =
    Boolean(simulating) ||
    loading ||
    checking ||
    loadingCases ||
    !selectedCase

  // ==========================================
  // PAGE INTERFACE
  // ==========================================

  return (
    <div style={styles.page}>

      {/* HEADER */}
      <header style={styles.header}>
        <div>
          <h2 style={styles.brand}>
            ✚ MediRescue
          </h2>

          <div style={styles.portal}>
            PATIENT PORTAL • M-PESA PAYMENTS
          </div>
        </div>

        <button
          type="button"
          style={styles.headerButton}
          onClick={() =>
            navigate('/patient-dashboard')
          }
        >
          ← Dashboard
        </button>
      </header>

      <main style={styles.container}>

        {/* BACK BUTTON */}
        <button
          type="button"
          style={styles.backButton}
          onClick={() =>
            navigate('/patient-dashboard')
          }
        >
          ← Back to Patient Dashboard
        </button>

        {/* PAGE HEADING */}
        <section>
          <p style={styles.eyebrow}>
            MEDIRESCUE PAYMENT SERVICES
          </p>

          <h1 style={styles.title}>
            Pay with M-Pesa
          </h1>

          <p style={styles.subtitle}>
            Manage payments for your emergency
            medical services securely using M-Pesa.
            Select an eligible case to get started.
          </p>
        </section>

        {/* PAYMENT INFORMATION */}
        <section style={styles.notice}>
          <div style={styles.noticeIcon}>
            KSh
          </div>

          <div style={{ flex: 1, minWidth: 200 }}>
            <h3 style={styles.noticeTitle}>
              M-Pesa Payment
            </h3>

            <p style={styles.noticeText}>
              Select your emergency case and enter
              your Safaricom phone number.
              The system will submit a payment request
              and check its confirmation status.
              Emergency assistance does not require
              advance payment.
            </p>
          </div>
        </section>

        {/* PAYMENT FORM */}
        <section style={styles.card}>
          <form onSubmit={handlePayment}>

            <h2 style={styles.sectionTitle}>
              01. Select Emergency Case
            </h2>

            <p style={styles.sectionDescription}>
              Only emergency cases with an outstanding
              payment amount are available for selection.
            </p>

            <div style={styles.formGroup}>
              <label
                htmlFor="caseId"
                style={styles.label}
              >
                Emergency Case
              </label>

              <select
                id="caseId"
                value={caseId}
                onChange={(event) =>
                  handleCaseChange(event.target.value)
                }
                disabled={
                  loadingCases || loading || checking
                }
                required
                style={styles.input}
              >
                <option value="">
                  {loadingCases
                    ? 'Loading emergency cases...'
                    : 'Select an emergency case'}
                </option>

                {eligibleCases.map((item) => (
                  <option
                    key={item.id}
                    value={item.id}
                  >
                    Case #{item.id} —{' '}
                    {item.hospital_name ||
                      'Assigned Hospital'}
                  </option>
                ))}
              </select>
            </div>

            {!loadingCases &&
              eligibleCases.length === 0 && (
                <div style={styles.empty}>
                  No emergency cases currently require
                  payment. If you recently submitted
                  an emergency request, check your
                  case status before making a payment.
                </div>
              )}

            {selectedCase && (
              <div style={styles.caseInfo}>
                <div style={{ marginBottom: 18 }}>
                  <span style={styles.detailLabel}>
                    Emergency Case
                  </span>
                  <strong style={styles.detailValue}>
                    Case #{selectedCase.id}
                  </strong>
                </div>

                <div style={{ marginBottom: 18 }}>
                  <span style={styles.detailLabel}>
                    Assigned Hospital
                  </span>
                  <strong style={styles.detailValue}>
                    {selectedCase.hospital_name ||
                      'Hospital information unavailable'}
                  </strong>
                </div>

                <div>
                  <span style={styles.detailLabel}>
                    Payment Status
                  </span>
                  <strong
                    style={{
                      ...styles.detailValue,
                      color: '#c2410c'
                    }}
                  >
                    Payment Pending
                  </strong>
                </div>
              </div>
            )}

            <hr style={styles.divider} />

            <h2 style={styles.sectionTitle}>
              02. Payment Details
            </h2>

            <p style={styles.sectionDescription}>
              Enter the Safaricom number associated
              with the M-Pesa account you wish to use.
            </p>

            <div style={styles.formGroup}>
              <label
                htmlFor="phone"
                style={styles.label}
              >
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
                style={styles.input}
              />

              <p style={styles.helpText}>
                Enter the number in international
                format, for example 2547XXXXXXXX.
              </p>
            </div>

            <div style={styles.amountBox}>
              <span style={styles.amountLabel}>
                TOTAL PAYMENT AMOUNT
              </span>

              <div style={styles.amountValue}>
                {selectedCase
                  ? `KSh ${formatAmount(amount)}`
                  : 'KSh —'}
              </div>

              <p
                style={{
                  ...styles.helpText,
                  color: '#166534'
                }}
              >
                The payment amount is determined
                by MediRescue and cannot be edited.
              </p>
            </div>

            <hr style={styles.divider} />

            <h2 style={styles.sectionTitle}>
              03. Confirm Payment
            </h2>

            <p style={styles.sectionDescription}>
              Review your selected case, phone number,
              and amount before submitting the request.
            </p>

            {error && (
              <div style={styles.error} role="alert">
                <strong>Payment Error</strong>
                <div>{error}</div>
              </div>
            )}

            {result && (
              <div
                role="status"
                aria-live="polite"
                style={{
                  ...styles.statusBox,
                  ...statusColors[paymentStatus]
                }}
              >
                <h3
                  style={{
                    margin: '0 0 12px',
                    fontSize: 18
                  }}
                >
                  {paymentStatus === 'completed'
                    ? '✓ M-Pesa Payment Confirmed'
                    : paymentStatus === 'failed'
                      ? '✕ M-Pesa Payment Failed'
                      : '⏳ M-Pesa Request Submitted'}
                </h3>

                <p style={{ margin: '0 0 6px' }}>
                  Case ID:{' '}
                  <strong>{result.case_id}</strong>
                </p>

                <p style={{ margin: '0 0 6px' }}>
                  Status:{' '}
                  <strong>
                    {paymentStatus.toUpperCase()}
                  </strong>
                </p>

                {notice && (
                  <p
                    style={{
                      fontSize: 13,
                      margin: '12px 0 0'
                    }}
                  >
                    {notice}
                  </p>
                )}

                {checking && (
                  <p
                    style={{
                      fontSize: 13,
                      margin: '12px 0 0'
                    }}
                  >
                    Checking payment status...
                  </p>
                )}

                {result.result_code != null &&
                  paymentStatus === 'failed' && (
                    <p
                      style={{
                        fontSize: 13,
                        margin: '12px 0 0'
                      }}
                    >
                      Safaricom result code:{' '}
                      {result.result_code}
                    </p>
                  )}

                {paymentStatus === 'pending' && (
                  <p
                    style={{
                      fontSize: 12,
                      margin: '14px 0 0'
                    }}
                  >
                    A submitted payment request
                    does not mean payment has
                    been completed.
                  </p>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={paymentDisabled}
              style={{
                ...styles.payButton,
                opacity: paymentDisabled ? 0.6 : 1,
                cursor: paymentDisabled
                  ? 'not-allowed'
                  : 'pointer'
              }}
            >
              {loading
                ? 'Sending M-Pesa Request...'
                : checking
                  ? 'Checking Payment...'
                  : result?.status === 'completed'
                    ? '✓ Payment Completed'
                    : result?.status === 'pending'
                      ? 'Awaiting Confirmation'
                      : result?.status === 'failed'
                        ? 'Retry M-Pesa Payment →'
                        : 'Pay with M-Pesa →'}
            </button>

            {result?.status === 'pending' &&
              !checking && (
                <button
                  type="button"
                  onClick={handleManualCheck}
                  style={styles.checkButton}
                >
                  Check Payment Status →
                </button>
              )}
          </form>
        </section>

        {/* DEVELOPMENT PAYMENT SIMULATION */}
        {SIMULATION_UI && (selectedCase || simMessage) && (
          <section style={styles.simulation}>
            <strong>
              Development only: simulate a payment
            </strong>

            <p style={{ margin: '8px 0 0' }}>
              Records a test payment for the selected
              case without sending an M-Pesa request.
              No money moves. This section is not
              included in a production build.
            </p>

            {selectedCase && (
              <div style={styles.simulationButtons}>
                <button
                  type="button"
                  disabled={simulationDisabled}
                  onClick={() =>
                    handleSimulate('success')
                  }
                  style={{
                    ...styles.simulateSuccess,
                    opacity: simulationDisabled ? 0.6 : 1,
                    cursor: simulationDisabled
                      ? 'not-allowed'
                      : 'pointer'
                  }}
                >
                  {simulating === 'success'
                    ? 'Recording...'
                    : `Simulate successful payment for Case #${selectedCase.id}`}
                </button>

                <button
                  type="button"
                  disabled={simulationDisabled}
                  onClick={() =>
                    handleSimulate('failed')
                  }
                  style={{
                    ...styles.simulateFailed,
                    opacity: simulationDisabled ? 0.6 : 1,
                    cursor: simulationDisabled
                      ? 'not-allowed'
                      : 'pointer'
                  }}
                >
                  {simulating === 'failed'
                    ? 'Recording...'
                    : 'Simulate failed payment'}
                </button>
              </div>
            )}

            {simMessage && (
              <div
                role="status"
                aria-live="polite"
                style={{
                  ...styles.statusBox,
                  ...statusColors[simMessage.type],
                  marginTop: 16,
                  marginBottom: 0,
                  fontSize: 13
                }}
              >
                {simMessage.text}
              </div>
            )}
          </section>
        )}

        <section style={styles.sandbox}>
          <strong>
            ℹ M-Pesa Sandbox Environment
          </strong>

          <p style={{ margin: '8px 0 0' }}>
            MediRescue currently uses M-Pesa Sandbox.
            Transactions are simulated and do not
            transfer real money. Real phone prompts
            require approved production credentials.
          </p>
        </section>

        <footer style={styles.footer}>
          © {new Date().getFullYear()} MediRescue
          {' '}• Emergency Medical Response System
        </footer>

      </main>
    </div>
  )
}

export default PayNow