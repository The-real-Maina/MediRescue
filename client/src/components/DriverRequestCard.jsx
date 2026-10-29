import { useState } from 'react';
import useCountdown from '../hooks/useCountdown';

// TODO: change the token lookup if your project stores it differently
const API_BASE = '/api/cases';
const getToken = () => localStorage.getItem('token');

export default function DriverRequestCard({ request, onDone }) {
  const secs = useCountdown(request.accept_deadline);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const call = async (action) => {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/${request.id}/${action}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      onDone?.(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const expired = secs === 0;

  return (
    <div style={{ border: '2px solid #d33', borderRadius: 8, padding: 16, marginBottom: 12 }}>
      <h3>🚑 New emergency request #{request.id}</h3>
      <p>Severity: <strong>{request.severity}</strong></p>
      {request.emergency_desc && <p>{request.emergency_desc}</p>}
      <p>
        Respond within: <strong>{secs}s</strong>
      </p>

      <button disabled={busy || expired} onClick={() => call('accept')}>✅ Accept</button>{' '}
      <button disabled={busy || expired} onClick={() => call('decline')}>Decline</button>

      {expired && <p style={{ color: 'orange' }}>Time is up. Staff may reassign this request.</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}