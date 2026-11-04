import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const styles = {
  page: { minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Segoe UI', Arial, sans-serif" },
  header: { background: '#10243a', borderBottom: '4px solid #dc2626', padding: '18px 5%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 },
  brand: { color: '#ffffff', fontSize: 25, fontWeight: 800, margin: 0 },
  portal: { color: '#cbd5e1', fontSize: 10, letterSpacing: 1.6, marginTop: 5 },
  headerButton: { background: 'transparent', color: '#ffffff', border: '1px solid #64748b', borderRadius: 8, padding: '11px 17px', fontWeight: 700, cursor: 'pointer' },
  container: { maxWidth: 1150, margin: '0 auto', padding: '42px 20px 65px' },
  title: { color: '#10243a', fontSize: 32, fontWeight: 800, margin: '0 0 10px' },
  subtitle: { color: '#64748b', fontSize: 15, marginBottom: 30 },
  card: { background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20, marginBottom: 15, boxShadow: '0 4px 6px rgba(0,0,0,0.02)' },
  table: { width: '100%', borderCollapse: 'collapse', marginTop: 20, background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 5px 20px rgba(15,23,42,0.04)' },
  th: { background: '#f8fafc', color: '#475569', textAlign: 'left', padding: '15px', fontSize: 13, fontWeight: 800, borderBottom: '1px solid #e2e8f0' },
  td: { padding: '15px', borderBottom: '1px solid #e2e8f0', color: '#334155', fontSize: 14 },
  badge: { padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 800 },
  resolveBtn: { background: '#10b981', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 6, fontWeight: 700, cursor: 'pointer' },
  message: { padding: 40, textAlign: 'center', background: '#fff', borderRadius: 12, color: '#64748b' }
};

export default function AdminDisputes() {
  const navigate = useNavigate();
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDisputes = useCallback(async () => {
    const token = localStorage.getItem('medirescue_token');
    if (!token) return navigate('/login');

    try {
      const res = await fetch('http://localhost:5000/api/cases/hospital-admin/disputes', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Failed to load disputes');
      setDisputes(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchDisputes();
  }, [fetchDisputes]);

  const handleResolve = async (id) => {
    if (!window.confirm('Are you sure you want to mark this dispute as resolved?')) return;
    const token = localStorage.getItem('medirescue_token');

    try {
      const res = await fetch(`http://localhost:5000/api/cases/hospital-admin/disputes/${id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Failed to resolve');
      
      setDisputes(current => current.map(d => d.id === id ? { ...d, status: 'resolved' } : d));
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h2 style={styles.brand}>✚ MediRescue</h2>
          <div style={styles.portal}>HOSPITAL ADMIN • PATIENT DISPUTES</div>
        </div>
        <button type="button" style={styles.headerButton} onClick={() => navigate('/hospital-admin-dashboard')}>
          ← Dashboard
        </button>
      </header>

      <main style={styles.container}>
        <h1 style={styles.title}>Patient Disputes</h1>
        <p style={styles.subtitle}>Review and resolve issues reported by patients regarding their emergency cases.</p>

        {loading && <div style={styles.message}>Loading disputes...</div>}
        {error && <div style={{ ...styles.message, color: 'red' }}>{error}</div>}
        
        {!loading && !error && disputes.length === 0 && (
          <div style={styles.message}>
            <h3>No Disputes Found</h3>
            <p>There are currently no patient disputes to review.</p>
          </div>
        )}

        {!loading && !error && disputes.length > 0 && (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Case ID</th>
                <th style={styles.th}>Patient Name</th>
                <th style={styles.th}>Phone</th>
                <th style={styles.th}>Reason</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {disputes.map((d) => (
                <tr key={d.id}>
                  {/* REMOVED emergency_type HERE */}
                  <td style={styles.td}><strong>#{d.case_id}</strong></td>
                  <td style={styles.td}>{d.patient_name}</td>
                  <td style={styles.td}>{d.patient_phone}</td>
                  <td style={styles.td}><div style={{ maxWidth: 300, whiteSpace: 'normal' }}>{d.reason}</div></td>
                  <td style={styles.td}>
                    <span style={{ 
                      ...styles.badge, 
                      background: d.status === 'open' ? '#fee2e2' : '#dcfce7',
                      color: d.status === 'open' ? '#991b1b' : '#166534'
                    }}>
                      {d.status.toUpperCase()}
                    </span>
                  </td>
                  <td style={styles.td}>
                    {d.status === 'open' ? (
                      <button style={styles.resolveBtn} onClick={() => handleResolve(d.id)}>
                        Mark Resolved
                      </button>
                    ) : (
                      <span style={{ color: '#64748b', fontSize: 13 }}>Resolved</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </main>
    </div>
  );
}