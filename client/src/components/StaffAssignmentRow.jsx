import { useState } from 'react';
import useCountdown from '../hooks/useCountdown';
import FlipTimer from './FlipTimer'; // Import the new visual timer

const API_BASE = '/api/cases';
const getToken = () => localStorage.getItem('token');

export default function StaffAssignmentRow({ c, ambulances = [], onChanged }) {
  const secs = useCountdown(c.accept_deadline);
  const [ambulanceId, setAmbulanceId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const overdue = c.status === 'assigned' && secs === 0;

  const assign = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/${c.id}/assign`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ ambulance_id: ambulanceId }),
      });
      
      if (res.ok) {
        setAmbulanceId('');
        onChanged?.();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to assign ambulance');
      }
    } catch (err) {
      alert('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const picker = (label) => (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      <select 
        value={ambulanceId} 
        onChange={(e) => setAmbulanceId(e.target.value)}
        disabled={isSubmitting}
        style={{ padding: '8px', borderRadius: '4px', backgroundColor: '#334155', color: 'white', border: '1px solid #475569' }}
      >
        <option value="">Select ambulance</option>
        {ambulances
          .filter((a) => a.id !== c.ambulance_id)
          .map((a) => (
            <option key={a.id} value={a.id}>
              {a.plate_number} – {a.driver_name || 'No Driver'}
            </option>
          ))}
      </select>
      <button 
        disabled={!ambulanceId || isSubmitting} 
        onClick={assign}
        style={{ 
          padding: '8px 16px', 
          backgroundColor: label === 'Reassign' ? '#ef4444' : '#3b82f6', 
          color: 'white', 
          border: 'none', 
          borderRadius: '4px',
          cursor: !ambulanceId || isSubmitting ? 'not-allowed' : 'pointer',
          opacity: !ambulanceId || isSubmitting ? 0.6 : 1
        }}
      >
        {isSubmitting ? 'Processing...' : label}
      </button>
    </div>
  );

  if (c.status === 'requested') {
    return <div>{picker('Assign')}</div>;
  }

  if (c.status === 'assigned') {
    return (
      <div>
        {overdue ? (
          <div style={{ color: '#ef4444', marginBottom: '8px', fontWeight: 'bold', fontSize: '1.1rem' }}>
            ⚠ No response from driver 
          </div>
        ) : (
          <div>
             <div style={{ color: '#94a3b8', marginBottom: '4px' }}>Waiting for driver to accept...</div>
             <FlipTimer seconds={secs} />
          </div>
        )}
        
        {overdue && picker('Reassign')}
      </div>
    );
  }

  if (c.status === 'dispatched') {
    return <div style={{ color: '#10b981', fontWeight: 'bold', fontSize: '1.1rem' }}>✅ Driver accepted</div>;
  }

  return null;
}