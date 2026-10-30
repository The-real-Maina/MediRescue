import { useEffect, useState } from 'react';

export default function UserRoles() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  const fetchUsers = () => {
    const token = localStorage.getItem('medirescue_token');
    fetch('http://192.168.137.1:5000/api/admin/staff', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        // Filter out super admins so they don't accidentally get modified
        setUsers(data.filter(u => u.role !== 'super_admin'));
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleRoleChange = async (userId, newRole) => {
    if (!window.confirm(`Are you sure you want to change this user's role to ${newRole}?`)) return;
    
    setUpdatingId(userId);
    setError('');
    setMessage('');

    const token = localStorage.getItem('medirescue_token');
    try {
      const res = await fetch(`http://192.168.137.1:5000/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ role: newRole })
      });
      const data = await res.json();
      
      if (res.ok) {
        setMessage(data.message);
        fetchUsers(); // Refresh the list
      } else {
        setError(data.error || 'Failed to change role');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) return <p style={{ color: '#64748b' }}>Loading system users...</p>;

  return (
    <div style={{ background: '#fff', padding: '30px', borderRadius: '15px', border: '1px solid #e2e8f0' }}>
      <h3 style={{ margin: '0 0 10px', color: '#10243a' }}>Change User Roles</h3>
      <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '25px' }}>
        Promote or demote staff and drivers here. Changes take effect immediately.
      </p>

      {error && <div style={{ background: '#fee2e2', color: '#991b1b', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>{error}</div>}
      {message && <div style={{ background: '#dcfce7', color: '#166534', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>{message}</div>}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ background: '#f8fafc', color: '#64748b', textAlign: 'left' }}>
              <th style={{ padding: '15px', borderBottom: '2px solid #e2e8f0' }}>Name</th>
              <th style={{ padding: '15px', borderBottom: '2px solid #e2e8f0' }}>Email</th>
              <th style={{ padding: '15px', borderBottom: '2px solid #e2e8f0' }}>Hospital</th>
              <th style={{ padding: '15px', borderBottom: '2px solid #e2e8f0' }}>Current Role</th>
              <th style={{ padding: '15px', borderBottom: '2px solid #e2e8f0' }}>Change Role</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '15px', fontWeight: 'bold', color: '#10243a' }}>{u.name}</td>
                <td style={{ padding: '15px', color: '#64748b' }}>{u.email}</td>
                <td style={{ padding: '15px' }}>{u.hospital_name || '—'}</td>
                <td style={{ padding: '15px' }}>
                  <span style={{ 
                    background: u.role === 'driver' ? '#e0e7ff' : u.role === 'hospital_admin' ? '#fef3c7' : '#f1f5f9',
                    color: u.role === 'driver' ? '#3730a3' : u.role === 'hospital_admin' ? '#92400e' : '#475569',
                    padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', textTransform: 'capitalize'
                  }}>
                    {u.role.replace('_', ' ')}
                  </span>
                </td>
                <td style={{ padding: '15px' }}>
                  <select 
                    disabled={updatingId === u.id}
                    value={u.role}
                    onChange={(e) => handleRoleChange(u.id, e.target.value)}
                    style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', cursor: 'pointer' }}
                  >
                    <option value="hospital_staff">Hospital Staff</option>
                    <option value="driver">Driver</option>
                    <option value="hospital_admin">Hospital Admin</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}