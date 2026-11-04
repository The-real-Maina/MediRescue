import { useState } from 'react';

export default function ReportIssue({ caseId }) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const token = localStorage.getItem('medirescue_token');
      // CHANGED TO LOCALHOST
      const res = await fetch(`http://localhost:5000/api/cases/${caseId}/dispute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ reason })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit');

      setMessage('Your report has been submitted. Our team will investigate.');
      setReason('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: '20px', padding: '20px', background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '10px' }}>
      <h4 style={{ color: '#991b1b', margin: '0 0 10px' }}>Report an Issue</h4>
      <p style={{ fontSize: '13px', color: '#7f1d1d', marginBottom: '15px' }}>
        If you had a problem with this case (e.g., ambulance never arrived, wrong charge), let us know.
      </p>

      {message && <div style={{ background: '#dcfce7', color: '#166534', padding: '10px', borderRadius: '6px', marginBottom: '10px', fontSize: '13px' }}>{message}</div>}
      {error && <div style={{ background: '#fee2e2', color: '#991b1b', padding: '10px', borderRadius: '6px', marginBottom: '10px', fontSize: '13px' }}>{error}</div>}

      <form onSubmit={handleSubmit}>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Describe what went wrong..."
          required
          rows={3}
          style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', marginBottom: '10px', boxSizing: 'border-box' }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{ background: '#dc2626', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
        >
          {loading ? 'Submitting...' : 'Submit Report'}
        </button>
      </form>
    </div>
  );
}