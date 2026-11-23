import { useEffect, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function DisputesManager() {
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDisputes = () => {
    const token = localStorage.getItem('medirescue_token');
    fetch(`${API_BASE}/api/cases/admin/disputes`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setDisputes(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => { fetchDisputes(); }, []);

  const handleResolve = async (id) => {
    if (!window.confirm('Mark this dispute as resolved?')) return;
    const token = localStorage.getItem('medirescue_token');
    try {
      const res = await fetch(`${API_BASE}/api/cases/admin/disputes/${id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchDisputes();
      }
    } catch (err) {
      alert('Failed to resolve dispute');
    }
  };

  if (loading) return <p style={{ color: '#64748b' }}>Loading disputes...</p>;
  if (error) return <p style={{ color: 'red' }}>Error: {error}</p>;
  if (disputes.length === 0) return <p style={{ padding: '20px', background: '#fff', borderRadius: '12px' }}>No disputes have been reported.</p>;

  return (
    <div style={{ background: '#fff', padding: '30px', borderRadius: '15px', border: '1px solid #e2e8f0' }}>
      <h3 style={{ margin: '0 0 20px', color: '#10243a' }}>Patient Disputes & Refund Requests</h3>
      
      <div style={{ display: 'grid', gap: '15px' }}>
        {disputes.map(dispute => (
          <div key={dispute.id} style={{ border: '1px solid #cbd5e1', padding: '20px', borderRadius: '10px', background: dispute.status === 'open' ? '#fff1f2' : '#f8fafc' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '10px' }}>
              <div>
                <p style={{ margin: '0 0 5px', fontWeight: 'bold', color: '#10243a' }}>
                  Case #{dispute.case_id} — {dispute.emergency_type || 'Emergency'}
                </p>
                <p style={{ margin: '0 0 5px', color: '#64748b', fontSize: '13px' }}>
                  Patient: {dispute.patient_name} ({dispute.patient_phone})
                </p>
              </div>
              <span style={{ 
                background: dispute.status === 'open' ? '#fee2e2' : '#dcfce7', 
                color: dispute.status === 'open' ? '#991b1b' : '#166534',
                padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', height: 'fit-content'
              }}>
                {dispute.status.toUpperCase()}
              </span>
            </div>

            <p style={{ margin: '0 0 15px', color: '#334155', fontSize: '14px', fontStyle: 'italic' }}>
              "{dispute.reason}"
            </p>

            {dispute.status === 'open' && (
              <button 
                onClick={() => handleResolve(dispute.id)}
                style={{ background: '#16a34a', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                Mark as Resolved
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}