import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Custom Tooltip component for a clean look
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: '#fff', padding: '10px 15px', border: '1px solid #cbd5e1', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        <p style={{ margin: 0, fontWeight: 'bold', color: '#10243a' }}>{label}</p>
        <p style={{ margin: '5px 0 0', color: '#64748b' }}>
          {payload[0].name}: <span style={{ color: payload[0].color, fontWeight: 'bold' }}>{payload[0].value}</span>
        </p>
      </div>
    );
  }
  return null;
};

export default function SystemAnalytics() {
  const [data, setData] = useState({ casesByHospital: [], responseTimes: [], revenueByHospital: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('medirescue_token');
    fetch(`${API_BASE}/api/admin/analytics`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to load analytics');
        return json;
      })
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <p style={{ padding: 20, color: '#fff' }}>Loading analytics...</p>;
  if (error) return <p style={{ padding: 20, color: '#ef4444' }}>Error: {error}</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      
      {/* CHART 1: CASES PER HOSPITAL */}
      <div style={{ background: '#ffffff', padding: '25px', borderRadius: '15px', border: '1px solid #e2e8f0' }}>
        <h3 style={{ margin: '0 0 20px', color: '#10243a' }}>Total Emergency Cases per Hospital</h3>
        <div style={{ height: 300, width: '100%' }}>
          <ResponsiveContainer>
            <BarChart data={data.casesByHospital} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="hospital_name" tick={{ fontSize: 12, fill: '#64748b' }} tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} tick={{ fill: '#64748b' }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9' }} />
              <Bar dataKey="total_cases" name="Total Cases" fill="#2563eb" radius={[4, 4, 0, 0]} maxBarSize={60} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* CHART 2: AVERAGE RESPONSE TIME */}
      <div style={{ background: '#ffffff', padding: '25px', borderRadius: '15px', border: '1px solid #e2e8f0' }}>
        <h3 style={{ margin: '0 0 10px', color: '#10243a' }}>Average Response Time (Minutes)</h3>
        <p style={{ fontSize: '13px', color: '#64748b', marginTop: '-5px', marginBottom: '20px' }}>
          Measured from the moment the patient requests help, to when the ambulance arrives at the hospital.
        </p>
        <div style={{ height: 300, width: '100%' }}>
          <ResponsiveContainer>
            <BarChart data={data.responseTimes} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="hospital_name" tick={{ fontSize: 12, fill: '#64748b' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: '#64748b' }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9' }} />
              <Bar dataKey="avg_minutes" name="Avg Minutes" fill="#16a34a" radius={[4, 4, 0, 0]} maxBarSize={60} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* CHART 3: REVENUE PER HOSPITAL */}
      <div style={{ background: '#ffffff', padding: '25px', borderRadius: '15px', border: '1px solid #e2e8f0' }}>
        <h3 style={{ margin: '0 0 10px', color: '#10243a' }}>Revenue Generated per Hospital (KSh)</h3>
        <p style={{ fontSize: '13px', color: '#64748b', marginTop: '-5px', marginBottom: '20px' }}>
          Total amount collected from completed payments.
        </p>
        <div style={{ height: 300, width: '100%' }}>
          <ResponsiveContainer>
            <BarChart data={data.revenueByHospital} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="hospital_name" tick={{ fontSize: 12, fill: '#64748b' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: '#64748b' }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9' }} />
              <Bar dataKey="total_revenue" name="Revenue (KSh)" fill="#eab308" radius={[4, 4, 0, 0]} maxBarSize={60} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}