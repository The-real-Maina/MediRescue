
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const API_URL = 'http://localhost:5000/api/mpesa/initiate'

function PayNow() {
  const navigate = useNavigate()

  const [caseId, setCaseId] = useState('')
  const [phone, setPhone] = useState('')
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  // Initiate M-Pesa payment
  const handlePayment = async (e) => {
    e.preventDefault()

    setError('')
    setResult(null)

    const normalizedPhone = phone.replace(/\D/g, '')
    const parsedCaseId = Number(caseId)
    const parsedAmount = Number(amount)

    // Validate phone number
    if (!/^254[71]\d{8}$/.test(normalizedPhone)) {
      setError(
        'Enter a valid Safaricom number, e.g. 2547XXXXXXXX'
      )
      return
    }

    // Validate case ID
    if (
      !Number.isSafeInteger(parsedCaseId) ||
      parsedCaseId <= 0
    ) {
      setError('Enter a valid emergency case ID')
      return
    }

    // Validate amount
    if (
      !Number.isSafeInteger(parsedAmount) ||
      parsedAmount <= 0
    ) {
      setError('Enter a valid payment amount')
      return
    }

    const token = localStorage.getItem('medirescue_token')

    if (!token) {
      navigate('/login')
      return
    }

    setLoading(true)

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          case_id: parsedCaseId,
          phone_number: normalizedPhone,
          amount: parsedAmount
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.error || 'Unable to initiate M-Pesa payment'
        )
      }

      setResult(data)

    } catch (err) {
      setError(
        err.message || 'Payment request failed. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  // Input styling
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
    fontSize: '15px',
    outlineColor: '#16a34a'
  }

  const labelStyle = {
    display: 'block',
    color: '#17233b',
    fontSize: '14px',
    fontWeight: '600'
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#f3f6fa',
        padding: '40px 20px',
        color: '#17233b',
        boxSizing: 'border-box'
      }}
    >
      <main
        style={{
          maxWidth: '500px',
          margin: 'auto',
          backgroundColor: '#ffffff',
          padding: '30px',
          borderRadius: '14px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.06)'
        }}
      >

        {/* BACK BUTTON */}
        <button
          type="button"
          onClick={() => navigate('/patient-dashboard')}
          style={{
            border: 'none',
            backgroundColor: 'transparent',
            color: '#dc2626',
            cursor: 'pointer',
            marginBottom: '22px',
            fontWeight: '600',
            fontSize: '14px',
            padding: '0'
          }}
        >
          ← Back to Dashboard
        </button>

        {/* PAGE HEADING */}
        <div style={{ textAlign: 'center' }}>
          <h1
            style={{
              color: '#17233b',
              fontSize: '29px',
              marginBottom: '12px'
            }}
          >
            Pay with M-Pesa
          </h1>

          <p
            style={{
              color: '#64748b',
              fontSize: '15px',
              lineHeight: '1.6',
              marginBottom: '28px'
            }}
          >
            Pay for your MediRescue emergency service
            securely using M-Pesa.
          </p>
        </div>

        {/* PAYMENT FORM */}
        <form onSubmit={handlePayment}>

          {/* CASE ID */}
          <label htmlFor="caseId" style={labelStyle}>
            Emergency Case ID
          </label>

          <input
            id="caseId"
            type="number"
            min="1"
            required
            value={caseId}
            onChange={(e) => setCaseId(e.target.value)}
            placeholder="Enter your case ID"
            style={inputStyle}
          />

          {/* PHONE NUMBER */}
          <label htmlFor="phone" style={labelStyle}>
            Safaricom Phone Number
          </label>

          <input
            id="phone"
            type="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="2547XXXXXXXX"
            style={inputStyle}
          />

          {/* PAYMENT AMOUNT */}
          <label htmlFor="amount" style={labelStyle}>
            Amount (KSh)
          </label>

          <input
            id="amount"
            type="number"
            min="1"
            step="1"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter payment amount"
            style={inputStyle}
          />

          {/* ERROR MESSAGE */}
          {error && (
            <div
              role="alert"
              style={{
                backgroundColor: '#fef2f2',
                color: '#b91c1c',
                border: '1px solid #fecaca',
                padding: '14px',
                borderRadius: '8px',
                marginBottom: '18px',
                fontSize: '14px'
              }}
            >
              {error}
            </div>
          )}

          {/* PAYMENT REQUEST RESULT */}
          {result && (
            <div
              role="status"
              style={{
                backgroundColor: '#f0fdf4',
                color: '#166534',
                border: '1px solid #bbf7d0',
                padding: '16px',
                borderRadius: '8px',
                marginBottom: '20px'
              }}
            >
              <strong>
                M-Pesa Request Submitted
              </strong>

              <p style={{ marginTop: '10px' }}>
                Case ID: {result.case_id}
              </p>

              <p>
                Status: {result.status || 'pending'}
              </p>

              <p style={{ fontSize: '14px' }}>
                Awaiting payment confirmation from Safaricom.
              </p>

              <small>
                A submitted request does not mean payment
                has been completed.
              </small>
            </div>
          )}

          {/* PAY BUTTON */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '15px',
              backgroundColor: '#16a34a',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              cursor: loading ? 'wait' : 'pointer',
              opacity: loading ? 0.7 : 1,
              fontSize: '15px',
              fontWeight: 'bold'
            }}
          >
            {loading
              ? 'Sending M-Pesa Request...'
              : 'Pay with M-Pesa'}
          </button>

        </form>

        {/* SANDBOX INFORMATION */}
        <p
          style={{
            fontSize: '12px',
            color: '#64748b',
            marginTop: '24px',
            textAlign: 'center',
            lineHeight: '1.7'
          }}
        >
          MediRescue is currently using M-Pesa Sandbox.
          Transactions are simulated and do not transfer
          real money. Real phone prompts require approved
          production credentials.
        </p>

      </main>
    </div>
  )
}

export default PayNow
