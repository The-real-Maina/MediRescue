import { useEffect, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function Settlements() {
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('medirescue_token');
    fetch(`${API_BASE}/api/admin/settlements`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to load settlements');
        return json;
      })
      .then(data => {
        setSettlements(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <p style={{ color: '#64748b' }}>Calculating settlements...</p>;
  if (error) return <p style={{ color: 'red' }}>Error: {error}</p>;

  // Calculate grand totals
  const grandTotalCollected = settlements.reduce((sum, s) => sum + Number(s.total_collected), 0);
  const grandTotalOwed = settlements.reduce((sum, s) => sum + Number(s.amount_owed_to_hospital), 0);
  const grandTotalPlatformFee = settlements.reduce((sum, s) => sum + Number(s.platform_fee), 0);

  return (
    <div style={{ background: '#fff', padding: '30px', borderRadius: '15px', border: '1px solid #e2e8f0' }}>
      <h3 style={{ margin: '0 0 10px', color: '#10243a' }}>Hospital Settlements Overview</h3>
      <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '25px' }}>
        This shows how much money has been collected and how much is owed to each hospital after the 10% MediRescue platform fee.
      </p>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ background: '#f8fafc', color: '#64748b', textAlign: 'left' }}>
              <th style={{ padding: '15px', borderBottom: '2px solid #e2e8f0' }}>Hospital</th>
              <th style={{ padding: '15px', borderBottom: '2px solid #e2e8f0' }}>Transactions</th>
              <th style={{ padding: '15px', borderBottom: '2px solid #e2e8f0' }}>Total Collected</th>
              <th style={{ padding: '15px', borderBottom: '2px solid #e2e8f0' }}>Platform Fee (10%)</th>
              <th style={{ padding: '15px', borderBottom: '2px solid #e2e8f0', color: '#16a34a' }}>Owed to Hospital</th>
            </tr>
          </thead>
          <tbody>
            {settlements.map(s => (
              <tr key={s.hospital_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '15px', fontWeight: 'bold', color: '#10243a' }}>{s.hospital_name}</td>
                <td style={{ padding: '15px', color: '#64748b' }}>{s.total_transactions}</td>
                <td style={{ padding: '15px' }}>KSh {Number(s.total_collected).toLocaleString()}</td>
                <td style={{ padding: '15px', color: '#dc2626' }}>- KSh {Number(s.platform_fee).toLocaleString()}</td>
                <td style={{ padding: '15px', fontWeight: 'bold', color: '#16a34a' }}>
                  KSh {Number(s.amount_owed_to_hospital).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* SUMMARY CARDS */}
      {settlements.length > 0 && (
        <div style={{ display: 'flex', gap: '20px', marginTop: '30px', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 200px', padding: '20px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <p style={{ margin: '0 0 5px', fontSize: '13px', color: '#64748b', fontWeight: 'bold' }}>TOTAL COLLECTED</p>
            <h3 style={{ margin: 0, color: '#10243a', fontSize: '24px' }}>KSh {grandTotalCollected.toLocaleString()}</h3>
          </div>
          <div style={{ flex: '1 1 200px', padding: '20px', background: '#fef2f2', borderRadius: '12px', border: '1px solid #fecaca' }}>
            <p style={{ margin: '0 0 5px', fontSize: '13px', color: '#991b1b', fontWeight: 'bold' }}>PLATFORM REVENUE</p>
            <h3 style={{ margin: 0, color: '#dc2626', fontSize: '24px' }}>KSh {grandTotalPlatformFee.toLocaleString()}</h3>
          </div>
          <div style={{ flex: '1 1 200px', padding: '20px', background: '#f0fdf4', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
            <p style={{ margin: '0 0 5px', fontSize: '13px', color: '#166534', fontWeight: 'bold' }}>TOTAL OWED TO HOSPITALS</p>
            <h3 style={{ margin: 0, color: '#16a34a', fontSize: '24px' }}>KSh {grandTotalOwed.toLocaleString()}</h3>
          </div>
        </div>
      )}

    </div>
  );
}