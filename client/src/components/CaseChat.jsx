import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

// ==========================================
// MEDIRESCUE — CASE CHAT
// Patient <-> driver messages for one case.
// New messages are fetched every few seconds
// while the chat is open.
// ==========================================

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const POLL_INTERVAL = 4000
const MAX_LENGTH = 500

const styles = {
  panel: {
    marginTop: 22,
    border: '1px solid #e2e8f0',
    borderRadius: 12,
    overflow: 'hidden',
    background: '#ffffff'
  },

  header: {
    padding: '14px 18px',
    background: '#10243a',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8
  },

  title: {
    margin: 0,
    fontSize: 15,
    fontWeight: 800
  },

  badgeOpen: {
    background: '#dcfce7',
    color: '#166534',
    borderRadius: 20,
    padding: '4px 11px',
    fontSize: 12,
    fontWeight: 800
  },

  badgeClosed: {
    background: '#e2e8f0',
    color: '#475569',
    borderRadius: 20,
    padding: '4px 11px',
    fontSize: 12,
    fontWeight: 800
  },

  tip: {
    margin: 0,
    padding: '11px 18px',
    background: '#fff7ed',
    color: '#9a3412',
    fontSize: 12,
    lineHeight: 1.6,
    borderBottom: '1px solid #fed7aa'
  },

  list: {
    height: 260,
    overflowY: 'auto',
    padding: 18,
    background: '#f8fafc',
    display: 'flex',
    flexDirection: 'column',
    gap: 12
  },

  empty: {
    margin: 'auto',
    color: '#64748b',
    fontSize: 13,
    lineHeight: 1.7,
    textAlign: 'center',
    maxWidth: 280
  },

  row: {
    display: 'flex',
    flexDirection: 'column',
    maxWidth: '82%'
  },

  sender: {
    fontSize: 11,
    fontWeight: 700,
    color: '#64748b',
    marginBottom: 4
  },

  bubbleMine: {
    background: '#10243a',
    color: '#ffffff',
    borderRadius: '14px 14px 4px 14px',
    padding: '10px 14px',
    fontSize: 14,
    lineHeight: 1.5,
    whiteSpace: 'pre-wrap',
    overflowWrap: 'anywhere'
  },

  bubbleTheirs: {
    background: '#ffffff',
    color: '#17233b',
    border: '1px solid #e2e8f0',
    borderRadius: '14px 14px 14px 4px',
    padding: '10px 14px',
    fontSize: 14,
    lineHeight: 1.5,
    whiteSpace: 'pre-wrap',
    overflowWrap: 'anywhere'
  },

  time: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 4
  },

  form: {
    padding: 16,
    borderTop: '1px solid #e2e8f0',
    background: '#ffffff'
  },

  textarea: {
    display: 'block',
    width: '100%',
    boxSizing: 'border-box',
    resize: 'none',
    padding: '11px 13px',
    border: '1px solid #cbd5e1',
    borderRadius: 9,
    fontFamily: 'inherit',
    fontSize: 14,
    color: '#17233b',
    outlineColor: '#2563eb'
  },

  formFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 10
  },

  counter: {
    fontSize: 12,
    color: '#94a3b8'
  },

  sendButton: {
    background: '#2563eb',
    color: '#ffffff',
    border: 'none',
    borderRadius: 9,
    padding: '11px 18px',
    fontSize: 14,
    fontWeight: 800,
    cursor: 'pointer'
  },

  error: {
    margin: '0 0 10px',
    padding: '10px 13px',
    background: '#fef2f2',
    color: '#991b1b',
    border: '1px solid #fecaca',
    borderRadius: 9,
    fontSize: 13,
    lineHeight: 1.6
  },

  closed: {
    margin: 0,
    padding: '14px 18px',
    background: '#f1f5f9',
    color: '#475569',
    fontSize: 13,
    lineHeight: 1.6,
    borderTop: '1px solid #e2e8f0'
  },

  message: {
    margin: 0,
    padding: '18px',
    color: '#64748b',
    fontSize: 13,
    lineHeight: 1.6
  }
}

function formatTime(value) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return ''

  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  })
}

export default function CaseChat({ caseId }) {
  const navigate = useNavigate()

  const [messages, setMessages] = useState([])
  const [chatOpen, setChatOpen] = useState(false)
  const [myRole, setMyRole] = useState(null)
  const [partnerName, setPartnerName] = useState(null)
  const [loading, setLoading] = useState(true)
  const [unavailable, setUnavailable] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [sendError, setSendError] = useState('')
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)

  const lastIdRef = useRef(0)
  const mountedRef = useRef(false)
  const listRef = useRef(null)

  const getToken = () =>
    localStorage.getItem('medirescue_token')

  // ==========================================
  // LOAD NEW MESSAGES
  // ==========================================

  const loadMessages = useCallback(async () => {
    const token = getToken()

    if (!token) {
      navigate('/login')
      return
    }

    try {
      const response = await fetch(
        `${API}/messages/case/${encodeURIComponent(caseId)}` +
          `?after=${lastIdRef.current}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )

      const data = await response.json().catch(() => ({}))

      if (!mountedRef.current) return

      if (response.status === 401) {
        navigate('/login')
        return
      }

      if (response.status === 404) {
        setUnavailable(true)
        return
      }

      if (!response.ok) {
        throw new Error(
          data.error || 'Unable to load messages'
        )
      }

      setUnavailable(false)
      setChatOpen(Boolean(data.chat_open))
      setMyRole(data.my_role || null)
      setPartnerName(data.partner_name || null)

      if (
        Array.isArray(data.messages) &&
        data.messages.length > 0
      ) {
        lastIdRef.current =
          data.messages[data.messages.length - 1].id

        setMessages((previous) => {
          const known = new Set(previous.map((item) => item.id))

          return [
            ...previous,
            ...data.messages.filter((item) => !known.has(item.id))
          ]
        })
      }

      setLoadError('')

    } catch (err) {
      if (mountedRef.current) {
        setLoadError(
          err.message || 'Unable to load messages'
        )
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }, [caseId, navigate])

  // First load for this case.
  useEffect(() => {
    mountedRef.current = true
    lastIdRef.current = 0

    setMessages([])
    setLoading(true)
    setUnavailable(false)

    loadMessages()

    return () => {
      mountedRef.current = false
    }
  }, [loadMessages])

  // Keep checking for new messages while the chat is open.
  useEffect(() => {
    if (!chatOpen) return undefined

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadMessages()
      }
    }, POLL_INTERVAL)

    return () => clearInterval(interval)
  }, [chatOpen, loadMessages])

  // Scroll to the newest message.
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [messages.length])

  // ==========================================
  // SEND A MESSAGE
  // ==========================================

  async function handleSend(event) {
    event.preventDefault()

    const text = draft.trim()

    if (!text || sending || !chatOpen) return

    const token = getToken()

    if (!token) {
      navigate('/login')
      return
    }

    setSending(true)
    setSendError('')

    try {
      const response = await fetch(
        `${API}/messages/case/${encodeURIComponent(caseId)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ body: text })
        }
      )

      const data = await response.json().catch(() => ({}))

      if (response.status === 401) {
        navigate('/login')
        return
      }

      if (!response.ok) {
        throw new Error(
          data.error || 'Unable to send message'
        )
      }

      if (mountedRef.current) {
        setDraft('')
      }
    } catch (err) {
      if (mountedRef.current) {
        setSendError(
          err.message || 'Unable to send message'
        )
      }
    } finally {
      if (mountedRef.current) {
        setSending(false)
      }

      // Refresh either way, so a closed chat is noticed.
      loadMessages()
    }
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSend(event)
    }
  }

  const title =
    myRole === 'driver'
      ? 'Message the patient'
      : myRole === 'patient'
        ? 'Message your driver'
        : 'Case messages'

  const otherLabel =
    partnerName ||
    (myRole === 'driver' ? 'Patient' : 'Driver')

  const emptyText =
    myRole === 'driver'
      ? 'No messages yet. Ask the patient to confirm where they are.'
      : 'No messages yet. Tell your driver exactly where you are.'

  // ==========================================
  // INTERFACE
  // ==========================================

  if (unavailable) {
    return (
      <section style={styles.panel}>
        <p style={styles.message}>
          Chat is not available for this case.
        </p>
      </section>
    )
  }

  return (
    <section style={styles.panel} aria-label={title}>

      <div style={styles.header}>
        <h3 style={styles.title}>{title}</h3>

        <span
          style={
            chatOpen ? styles.badgeOpen : styles.badgeClosed
          }
        >
          {loading
            ? 'Loading...'
            : chatOpen
              ? 'Chat open'
              : 'Chat closed'}
        </span>
      </div>

      {chatOpen && (
        <p style={styles.tip}>
          Use this chat to share or confirm your location.
          For urgent medical help, contact local emergency
          services directly.
        </p>
      )}

      <div
        ref={listRef}
        style={styles.list}
        role="log"
        aria-live="polite"
      >
        {!loading && messages.length === 0 && (
          <p style={styles.empty}>{emptyText}</p>
        )}

        {messages.map((item) => {
          const mine = item.sender_role === myRole

          return (
            <div
              key={item.id}
              style={{
                ...styles.row,
                alignSelf: mine ? 'flex-end' : 'flex-start',
                alignItems: mine ? 'flex-end' : 'flex-start'
              }}
            >
              <span style={styles.sender}>
                {mine ? 'You' : otherLabel}
              </span>

              <div
                style={
                  mine ? styles.bubbleMine : styles.bubbleTheirs
                }
              >
                {item.body}
              </div>

              <span style={styles.time}>
                {formatTime(item.created_at)}
              </span>
            </div>
          )
        })}
      </div>

      {loadError && (
        <p style={{ ...styles.error, margin: 16 }} role="alert">
          {loadError}
        </p>
      )}

      {chatOpen ? (
        <form style={styles.form} onSubmit={handleSend}>
          {sendError && (
            <p style={styles.error} role="alert">
              {sendError}
            </p>
          )}

          <textarea
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value)
              if (sendError) setSendError('')
            }}
            onKeyDown={handleKeyDown}
            maxLength={MAX_LENGTH}
            rows={2}
            placeholder="Type a message"
            aria-label="Message"
            disabled={sending}
            style={styles.textarea}
          />

          <div style={styles.formFooter}>
            <span style={styles.counter}>
              {draft.length}/{MAX_LENGTH}
            </span>

            <button
              type="submit"
              disabled={sending || draft.trim().length === 0}
              style={{
                ...styles.sendButton,
                opacity:
                  sending || draft.trim().length === 0 ? 0.6 : 1,
                cursor:
                  sending || draft.trim().length === 0
                    ? 'not-allowed'
                    : 'pointer'
              }}
            >
              {sending ? 'Sending...' : 'Send message'}
            </button>
          </div>
        </form>
      ) : (
        !loading && (
          <p style={styles.closed}>
            Chat is closed because the ambulance is no longer
            on its way to the patient.
          </p>
        )
      )}
    </section>
  )
}