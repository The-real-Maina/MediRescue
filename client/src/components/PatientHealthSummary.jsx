import { useEffect, useState } from 'react'

const API = import.meta.env.VITE_API_URL || 'http://192.168.137.1:5000/api'

const s = {
  panel: { marginTop: 22, border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden', background: '#fff' },
  head: { padding: '13px 18px', background: '#10243a', color: '#fff', fontWeight: 800, fontSize: 15, display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
  body: { padding: 18, display: 'grid', gap: 16 },
  alert: { background: '#fef2f2', border: '1px solid #fecaca', borderLeft: '4px solid #dc2626', borderRadius: 9, padding: '12px 14px', color: '#7f1d1d', fontSize: 14, lineHeight: 1.6 },
  note: { background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 9, padding: '12px 14px', color: '#92400e', fontSize: 14, lineHeight: 1.6 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 16 },
  label: { display: 'block', color: '#64748b', fontSize: 11, fontWeight: 800, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 5 },
  value: { color: '#17233b', fontSize: 14, lineHeight: 1.6, overflowWrap: 'anywhere' },
  message: { margin: 0, padding: 18, color: '#64748b', fontSize: 14, lineHeight: 1.6 }
}

function Item({ label, children }) {
  if (!children || (Array.isArray(children) && children.length === 0)) return null
  return (
    <div>
      <span style={s.label}>{label}</span>
      <div style={s.value}>{children}</div>
    </div>
  )
}

export default function PatientHealthSummary({ caseId }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    ;(async () => {
      try {
        const res = await fetch(`${API}/health-profile/case/${encodeURIComponent(caseId)}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('medirescue_token')}` },
          signal: controller.signal
        })
        const body = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(body.error || 'Unable to load health summary')
        setData(body)
      } catch (err) {
        if (err.name !== 'AbortError') setError(err.message)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    })()
    return () => controller.abort()
  }, [caseId])

  const wrap = children => (
    <section style={s.panel} aria-label="Patient health summary">
      <div style={s.head}><span>Patient health summary</span></div>
      {children}
    </section>
  )

  if (loading) return wrap(<p style={s.message} role="status">Loading health summary...</p>)
  if (error) return wrap(<p style={s.message}>{error}</p>)
  if (!data?.shared) {
    return wrap(<p style={s.message}>The patient has not shared their health profile for this emergency.</p>)
  }

  const about = [
    data.age != null ? `${data.age} years` : null,
    data.gender,
    data.height_cm ? `${data.height_cm} cm` : null,
    data.weight_kg ? `${data.weight_kg} kg` : null
  ].filter(Boolean).join(', ')

  const hasAnything = data.allergies || data.blood_type || data.chronic_conditions ||
    data.medications.length || data.past_surgeries.length || data.mobility_needs ||
    data.home_landmark || data.next_of_kin_name || about

  if (!hasAnything) return wrap(<p style={s.message}>No health details have been added yet.</p>)

  return wrap(
    <div style={s.body}>
      {data.allergies && (
        <div style={s.alert}><strong>Allergies:</strong> {data.allergies}</div>
      )}
      {data.home_landmark && (
        <div style={s.note}><strong>Finding the patient:</strong> {data.home_landmark}</div>
      )}

      <div style={s.grid}>
        <Item label="Blood group">{data.blood_type}</Item>
        <Item label="Age, build">{about}</Item>
        <Item label="Pregnancy">{data.pregnancy_status === 'Yes' ? 'Yes' : null}</Item>
        <Item label="Chronic conditions">{data.chronic_conditions}</Item>
        <Item label="Mobility or communication needs">{data.mobility_needs}</Item>
        <Item label="Family history">{data.family_history}</Item>
      </div>

      <Item label="Current medications">
        {data.medications.map((m, i) => (
          <div key={i}>{[m.name, m.dose, m.frequency].filter(Boolean).join(' - ')}</div>
        ))}
      </Item>

      <Item label="Past surgeries">
        {data.past_surgeries.map((x, i) => (
          <div key={i}>{x.procedure}{x.year ? ` (${x.year})` : ''}</div>
        ))}
      </Item>

      <div style={s.grid}>
        {data.next_of_kin_name && (
          <Item label="Next of kin">
            {data.next_of_kin_name}
            {data.next_of_kin_phone && <> - <a href={`tel:${data.next_of_kin_phone}`}>{data.next_of_kin_phone}</a></>}
          </Item>
        )}
        {data.extra_contacts.map((c, i) => (
          <Item key={i} label={c.relationship || 'Other contact'}>
            {c.name}{c.phone && <> - <a href={`tel:${c.phone}`}>{c.phone}</a></>}
          </Item>
        ))}
        {(data.insurance_provider || data.insurance_member_no) && (
          <Item label="Insurance">
            {[data.insurance_provider, data.insurance_member_no].filter(Boolean).join(' - ')}
          </Item>
        )}
      </div>
    </div>
  )
}