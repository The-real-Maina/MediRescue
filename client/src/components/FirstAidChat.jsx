import { useEffect, useRef, useState } from 'react';

// Works whether VITE_API_URL ends in /api or not
const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000')
  .replace(/\/+$/, '')
  .replace(/\/api$/, '');

// Sits above the theme toggle button in the bottom-right corner
const BOTTOM_OFFSET = 84;

const GREETING =
  "Hi, I'm the MediRescue first-aid assistant. Your ambulance has been requested. Tell me what is happening and I'll guide you with basic first aid. I am not a doctor.";

export default function FirstAidChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, open]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const next = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setInput('');
    setLoading(true);

    try {
      const token = localStorage.getItem('medirescue_token');

      const res = await fetch(`${API_BASE}/api/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ messages: next })
      });

      const data = await res.json().catch(() => ({}));

      if (res.status === 401) {
        throw new Error('Your session has expired. Please log in again.');
      }

      if (!res.ok) throw new Error(data.message || 'Assistant unavailable.');

      setMessages([...next, { role: 'assistant', content: data.reply }]);
    } catch (err) {
      setMessages([
        ...next,
        {
          role: 'assistant',
          content:
            (err.message || 'Assistant unavailable.') +
            ' If this is an emergency, call 999 or 112.'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const bubble = (role) => ({
    alignSelf: role === 'user' ? 'flex-end' : 'flex-start',
    maxWidth: '85%',
    padding: '10px 14px',
    borderRadius:
      role === 'user' ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
    background: role === 'user' ? '#2563eb' : '#f1f5f9',
    color: role === 'user' ? '#fff' : '#10243a',
    fontSize: '14px',
    lineHeight: 1.5,
    whiteSpace: 'pre-wrap',
    overflowWrap: 'anywhere'
  });

  const callLink = {
    color: '#991b1b',
    fontWeight: 'bold',
    textDecoration: 'underline'
  };

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          style={{
            position: 'fixed',
            right: '20px',
            bottom: `${BOTTOM_OFFSET}px`,
            zIndex: 1000,
            background: '#e5232b',
            color: '#fff',
            border: 'none',
            borderRadius: '30px',
            padding: '14px 20px',
            fontWeight: 'bold',
            fontSize: '14px',
            cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(0,0,0,0.25)'
          }}
        >
          ✚ First-Aid Help
        </button>
      )}

      {open && (
        <div
          style={{
            position: 'fixed',
            right: '20px',
            bottom: `${BOTTOM_OFFSET}px`,
            zIndex: 1000,
            width: 'min(380px, calc(100vw - 40px))',
            height: `min(540px, calc(100vh - ${BOTTOM_OFFSET + 20}px))`,
            background: '#fff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 16px 48px rgba(0,0,0,0.3)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          <div
            style={{
              background: '#10263e',
              color: '#fff',
              padding: '14px 16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '3px solid #e5232b'
            }}
          >
            <strong style={{ fontSize: '15px' }}>First-Aid Assistant</strong>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#fff',
                fontSize: '20px',
                cursor: 'pointer'
              }}
            >
              ✕
            </button>
          </div>

          <div
            style={{
              background: '#fef2f2',
              color: '#991b1b',
              fontSize: '12px',
              padding: '8px 14px',
              borderBottom: '1px solid #fecaca'
            }}
          >
            Life-threatening emergency? Call{' '}
            <a href="tel:999" style={callLink}>999</a> or{' '}
            <a href="tel:112" style={callLink}>112</a> now.
          </div>

          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}
          >
            <div style={bubble('assistant')}>{GREETING}</div>

            {messages.map((m, i) => (
              <div key={i} style={bubble(m.role)}>
                {m.content}
              </div>
            ))}

            {loading && (
              <div style={{ ...bubble('assistant'), color: '#64748b' }}>
                Typing...
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          <div
            style={{
              display: 'flex',
              gap: '8px',
              padding: '12px',
              borderTop: '1px solid #e2e8f0'
            }}
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Describe what is happening..."
              rows={1}
              maxLength={2000}
              style={{
                flex: 1,
                resize: 'none',
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontFamily: 'inherit',
                fontSize: '14px'
              }}
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              style={{
                background: '#2563eb',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '0 16px',
                fontWeight: 'bold',
                cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                opacity: loading || !input.trim() ? 0.6 : 1
              }}
            >
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
}