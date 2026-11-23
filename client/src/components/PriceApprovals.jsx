import { useState, useEffect } from 'react';

export default function PriceApprovals() {
  const [requests, setRequests] = useState([]);
  const [declineReason, setDeclineReason] = useState('');
  const [activeDeclineId, setActiveDeclineId] = useState(null);
  const token = localStorage.getItem('medirescue_token');

  const fetchRequests = () => {
    fetch('/api/admin/pricing/pending', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setRequests(data);
      })
      .catch(() => {});
  };

  useEffect(() => { fetchRequests(); }, []);

  const handleReview = async (id, action) => {
    if (action === 'decline' && !declineReason) {
      alert('Please provide a reason for declining.');
      return;
    }

    const res = await fetch(`/api/admin/pricing/${id}/review`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action, decline_reason: declineReason })
    });

    if (res.ok) {
      alert(`Request ${action}d successfully!`);
      setDeclineReason('');
      setActiveDeclineId(null);
      fetchRequests(); 
    } else {
      const err = await res.json();
      alert(err.error || 'Action failed');
    }
  };

  if (requests.length === 0) return <p style={{ padding: '20px', background: '#fff', borderRadius: '12px' }}>No pending price requests.</p>;

  return (
    <div style={{ padding: '30px', background: '#fff', borderRadius: '15px', border: '1px solid #e2e8f0' }}>
      <h2 style={{ color: '#10243a', margin: '0 0 20px' }}>Pending Price Approvals</h2>
      
      <div style={{ display: 'grid', gap: '15px' }}>
        {requests.map(req => (
          <div key={req.id} style={{ border: '1px solid #cbd5e1', padding: '20px', borderRadius: '10px', background: '#f8fafc' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <p style={{ margin: '0 0 5px', fontSize: '16px' }}><strong>Hospital:</strong> {req.hospital_name}</p>
                <p style={{ margin: '0 0 5px', color: '#64748b' }}><strong>Service:</strong> {req.service_name} ({req.severity})</p>
                <p style={{ margin: '0 0 5px', color: '#64748b' }}><strong>Requested By:</strong> {req.admin_name}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ margin: '0 0 5px', color: '#64748b' }}>Current: <strong>KSh {Number(req.old_price).toLocaleString()}</strong></p>
                <p style={{ margin: 0, fontSize: '18px' }}>Proposed: <strong style={{ color: '#dc2626' }}>KSh {Number(req.proposed_price).toLocaleString()}</strong></p>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button onClick={() => handleReview(req.id, 'approve')} style={{ background: '#16a34a', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Approve</button>
              <button onClick={() => setActiveDeclineId(req.id)} style={{ background: '#dc2626', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Decline</button>
            </div>

            {activeDeclineId === req.id && (
              <div style={{ marginTop: '15px', background: '#fef2f2', padding: '15px', borderRadius: '8px', border: '1px solid #fecaca' }}>
                <input type="text" placeholder="Reason for declining..." value={declineReason} onChange={e => setDeclineReason(e.target.value)} style={{ padding: '10px', width: '60%', marginRight: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                <button onClick={() => handleReview(req.id, 'decline')} style={{ background: '#991b1b', color: 'white', padding: '10px 15px', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Confirm Decline</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}