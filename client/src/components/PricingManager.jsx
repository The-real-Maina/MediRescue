import { useState, useEffect } from 'react';

export default function PricingManager() {
  const [prices, setPrices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [newPrice, setNewPrice] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  
  useEffect(() => {
    const token = localStorage.getItem('medirescue_token');
    
    // If there is no token, don't even try to fetch. Show a helpful error.
    if (!token) {
      setError('You are not logged in. Please log out and log in again.');
      return;
    }

    const url = 'http://localhost:5000/api/hospital-admin/pricing/current';
    console.log("Fetching prices with token:", token.substring(0, 10) + "..."); 

    fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Server rejected the request');
        return data;
      })
      .then(data => {
        if (Array.isArray(data)) {
          setPrices(data);
          setError(''); 
        }
      })
      .catch(err => setError(err.message || 'Failed to load prices.'));
  }, []);

  const handlePropose = async (e) => {
    e.preventDefault();
    if (!selectedService || !newPrice) return;

    const token = localStorage.getItem('medirescue_token');
    if (!token) {
      setError('Session expired. Please log in again.');
      return;
    }

    setError(''); setMessage('');

    try {
      const res = await fetch('http://localhost:5000/api/hospital-admin/pricing/request', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          service_name: selectedService.service_name,
          severity: selectedService.severity,
          proposed_price: Number(newPrice)
        })
      });
      const data = await res.json();
      
      if (res.ok) {
        setMessage(data.message);
        setNewPrice('');
        setSelectedService(null);
      } else {
        setError(data.error || 'Failed to propose price');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    }
  };

  return (
    <div style={{ padding: '30px', background: '#fff', borderRadius: '15px', border: '1px solid #e2e8f0' }}>
      <h2 style={{ color: '#10243a', margin: '0 0 10px' }}>Manage Service Prices</h2>
      <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '25px' }}>Propose new prices. The Super Admin must approve.</p>

      {error && <div style={{ background: '#fee2e2', color: '#991b1b', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>Error: {error}</div>}
      {message && <div style={{ background: '#dcfce7', color: '#166534', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>{message}</div>}

      <div style={{ marginBottom: '30px' }}>
        <h4 style={{ color: '#10243a', marginBottom: '15px' }}>Current Live Prices</h4>
        {prices.length === 0 && !error ? <p style={{ color: '#64748b' }}>No prices configured yet.</p> : (
          <div style={{ display: 'grid', gap: '10px' }}>
            {prices.map((p, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '15px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc' }}>
                <span><strong>{p.service_name}</strong> ({p.severity})</span>
                <strong style={{ color: '#0f766e' }}>KSh {Number(p.amount).toLocaleString()}</strong>
              </div>
            ))}
          </div>
        )}
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '30px 0' }} />

      <form onSubmit={handlePropose}>
        <h4 style={{ color: '#10243a', marginBottom: '15px' }}>Propose a Price Change</h4>
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
          <select required onChange={(e) => setSelectedService(JSON.parse(e.target.value))} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', flex: '1 1 300px' }} disabled={prices.length === 0}>
            <option value="">Select a service to change...</option>
            {prices.map((p, i) => (
              <option key={i} value={JSON.stringify(p)}>{p.service_name} - {p.severity} (Current: KSh {p.amount})</option>
            ))}
          </select>
          <input type="number" placeholder="Enter new price (KSh)" value={newPrice} onChange={e => setNewPrice(e.target.value)} required style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', flex: '1 1 200px' }} disabled={prices.length === 0} />
          <button type="submit" style={{ padding: '12px 25px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', opacity: prices.length === 0 ? 0.5 : 1 }} disabled={prices.length === 0}>Submit Request</button>
        </div>
      </form>
    </div>
  );
}