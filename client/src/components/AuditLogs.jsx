import { useEffect, useState } from 'react';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('medirescue_token');
    fetch('http://192.168.137.1:5000/api/admin/audit-logs', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to load logs');
        return json;
      })
      .then(data => {
        setLogs(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <p style={{ color: '#64748b' }}>Loading system audit trail...</p>;
  if (error) return <p style={{ color: 'red' }}>Error: {error}</p>;

  return (
    <div style={{ background: '#fff', padding: '30px', borderRadius: '15px', border: '1px solid #e2e8f0' }}>
      <h3 style={{ margin: '0 0 10px', color: '#10243a' }}>System Audit Trail</h3>
      <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '30px' }}>
        A permanent record of critical actions taken across the MediRescue system.
      </p>

      {logs.length === 0 ? (
        <p style={{ color: '#64748b' }}>No activity has been logged yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {logs.map((log) => (
            <div key={log.id} style={{ display: 'flex', gap: '15px' }}>
              
              {/* Timeline Dot */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#2563eb', marginTop: '5px' }} />
                <div style={{ width: '2px', flex: 1, background: '#e2e8f0', marginTop: '5px' }} />
              </div>

              {/* Content */}
              <div style={{ paddingBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px', flexWrap: 'wrap' }}>
                  <strong style={{ color: '#10243a', fontSize: '15px' }}>{log.actor_name}</strong>
                  <span style={{ background: '#e0e7ff', color: '#3730a3', padding: '2px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                    {log.actor_role.replace('_', ' ')}
                  </span>
                  <span style={{ color: '#94a3b8', fontSize: '12px' }}>
                    {new Date(log.created_at).toLocaleString()}
                  </span>
                </div>
                <p style={{ margin: 0, color: '#334155', fontSize: '14px', lineHeight: 1.5 }}>
                  {log.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}