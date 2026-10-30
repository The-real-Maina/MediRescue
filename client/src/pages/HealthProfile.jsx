import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const API_URL = (import.meta.env.VITE_API_URL || 'http://192.168.137.1:5000/api') + '/health-profile'
const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
const genders = ['Female', 'Male', 'Other', 'Prefer not to say']
const insurers = ['SHA', 'Private insurance', 'Employer scheme', 'None']

const empty = {
  date_of_birth: '', gender: '', blood_type: '', height_cm: '', weight_kg: '',
  pregnancy_status: '', allergies: '', chronic_conditions: '',
  medications: [], past_surgeries: [], family_history: '', mobility_needs: '',
  home_landmark: '', insurance_provider: '', insurance_member_no: '',
  next_of_kin_name: '', next_of_kin_phone: '', extra_contacts: [],
  share_with_responders: false
}

const s = {
  page: { maxWidth: 900, margin: '0 auto', color: '#17233b', fontFamily: "'Segoe UI', Arial, sans-serif" },
  h1: { color: '#10243a', fontSize: 'clamp(26px,4vw,34px)', margin: '0 0 8px' },
  lead: { color: '#64748b', lineHeight: 1.7, margin: '0 0 22px', maxWidth: 640 },
  card: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 'clamp(18px,3vw,28px)', marginBottom: 18 },
  h2: { color: '#10243a', fontSize: 19, margin: '0 0 4px' },
  hint: { color: '#64748b', fontSize: 13, margin: '0 0 18px', lineHeight: 1.6 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,210px),1fr))', gap: 16 },
  label: { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 700, color: '#334155' },
  input: { width: '100%', padding: '11px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', color: '#17233b', background: '#fff', boxSizing: 'border-box' },
  row: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,150px),1fr)) auto', gap: 10, alignItems: 'center', marginBottom: 10 },
  add: { background: '#fff', color: '#dc2626', border: '1px dashed #dc2626', borderRadius: 8, padding: '9px 14px', fontWeight: 700, cursor: 'pointer' },
  remove: { background: 'transparent', color: '#94a3b8', border: 'none', fontSize: 20, cursor: 'pointer', lineHeight: 1 },
  save: { background: '#dc2626', color: '#fff', border: 'none', borderRadius: 9, padding: '13px 26px', fontSize: 15, fontWeight: 800, cursor: 'pointer' },
  bar: { position: 'sticky', bottom: 0, background: 'rgba(244,247,251,.96)', borderTop: '1px solid #e2e8f0', padding: '14px 0', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' },
  ok: { background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', padding: '12px 14px', borderRadius: 9, marginBottom: 16, fontSize: 14 },
  err: { background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '12px 14px', borderRadius: 9, marginBottom: 16, fontSize: 14 }
}

function Field({ label, children }) {
  return <label style={s.label}>{label}{children}</label>
}

function RowList({ items, fields, onChange, addLabel }) {
  const update = (i, key, value) =>
    onChange(items.map((item, idx) => (idx === i ? { ...item, [key]: value } : item)))
  return (
    <div>
      {items.map((item, i) => (
        <div style={s.row} key={i}>
          {fields.map(f => (
            <input key={f.key} style={s.input} placeholder={f.placeholder} aria-label={f.placeholder}
              value={item[f.key] || ''} maxLength={120}
              onChange={e => update(i, f.key, e.target.value)} />
          ))}
          <button type="button" style={s.remove} aria-label="Remove"
            onClick={() => onChange(items.filter((_, idx) => idx !== i))}>×</button>
        </div>
      ))}
      <button type="button" style={s.add} onClick={() => onChange([...items, {}])}>+ {addLabel}</button>
    </div>
  )
}

export default function HealthProfile() {
  const navigate = useNavigate()
  const [form, setForm] = useState(empty)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const token = () => localStorage.getItem('medirescue_token')
  const set = (key, value) => { setForm(f => ({ ...f, [key]: value })); setMessage('') }
  const bind = key => ({ value: form[key] ?? '', onChange: e => set(key, e.target.value) })

  useEffect(() => {
    const controller = new AbortController()
    ;(async () => {
      try {
        const res = await fetch(API_URL, {
          headers: { Authorization: `Bearer ${token()}` }, signal: controller.signal
        })
        if (res.status === 401) { navigate('/login', { replace: true }); return }
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Unable to load your health profile')
        setForm({
          ...empty,
          ...Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v ?? empty[k] ?? '']))
        })
      } catch (err) {
        if (err.name !== 'AbortError') setError(err.message)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    })()
    return () => controller.abort()
  }, [navigate])

  // Share of the key fields a responder would want, as a quick nudge.
  const completeness = useMemo(() => {
    const keys = ['date_of_birth', 'gender', 'blood_type', 'allergies', 'chronic_conditions',
      'home_landmark', 'next_of_kin_name', 'next_of_kin_phone', 'insurance_provider']
    const filled = keys.filter(k => String(form[k] || '').trim()).length
      + (form.medications.length ? 1 : 0)
    return Math.round((filled / (keys.length + 1)) * 100)
  }, [form])

  const handleSave = async e => {
    e.preventDefault()
    setSaving(true); setError(''); setMessage('')
    try {
      const res = await fetch(API_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify(form)
      })
      if (res.status === 401) { navigate('/login', { replace: true }); return }
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Unable to save your health profile')
      setMessage('Your health profile is saved.')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p style={{ ...s.page, color: '#64748b' }} role="status">Loading your health profile...</p>

  return (
    <form style={s.page} onSubmit={handleSave}>
      <h1 style={s.h1}>My health profile</h1>
      <p style={s.lead}>
        Keep this up to date so the ambulance crew and hospital know what matters before they reach you.
      </p>

      <div style={{ ...s.card, display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 240px' }}>
          <strong style={{ color: '#10243a' }}>{completeness}% complete</strong>
          <div style={{ height: 8, background: '#e2e8f0', borderRadius: 99, marginTop: 8 }} aria-hidden="true">
            <div style={{ width: `${completeness}%`, height: '100%', background: '#dc2626', borderRadius: 99 }} />
          </div>
        </div>
        <p style={{ ...s.hint, margin: 0, flex: '2 1 280px' }}>
          Blood group, allergies, conditions and current medications help the most in an emergency.
        </p>
      </div>

      {error && <div style={s.err} role="alert">{error}</div>}
      {message && <div style={s.ok} role="status">{message}</div>}

      <section style={s.card}>
        <h2 style={s.h2}>About you</h2>
        <p style={s.hint}>Basic details used to judge dosing and risk.</p>
        <div style={s.grid}>
          <Field label="Date of birth"><input type="date" style={s.input} max={new Date().toISOString().slice(0, 10)} {...bind('date_of_birth')} /></Field>
          <Field label="Gender">
            <select style={s.input} {...bind('gender')}><option value="">Select</option>{genders.map(g => <option key={g}>{g}</option>)}</select>
          </Field>
          <Field label="Blood group">
            <select style={s.input} {...bind('blood_type')}><option value="">Select</option>{bloodGroups.map(g => <option key={g}>{g}</option>)}</select>
          </Field>
          <Field label="Height (cm)"><input type="number" min="30" max="260" step="0.1" style={s.input} {...bind('height_cm')} /></Field>
          <Field label="Weight (kg)"><input type="number" min="1" max="500" step="0.1" style={s.input} {...bind('weight_kg')} /></Field>
          <Field label="Pregnant?">
            <select style={s.input} {...bind('pregnancy_status')}>
              <option value="">Not applicable</option><option>Yes</option><option>No</option><option>Not sure</option>
            </select>
          </Field>
        </div>
      </section>

      <section style={s.card}>
        <h2 style={s.h2}>Conditions and allergies</h2>
        <p style={s.hint}>Include the reaction if you know it, for example "penicillin: rash".</p>
        <div style={s.grid}>
          <Field label="Allergies"><textarea rows={3} style={s.input} maxLength={1000} {...bind('allergies')} /></Field>
          <Field label="Chronic conditions"><textarea rows={3} style={s.input} maxLength={1000} placeholder="Diabetes, asthma, hypertension..." {...bind('chronic_conditions')} /></Field>
          <Field label="Family history"><textarea rows={3} style={s.input} maxLength={2000} placeholder="Heart disease, stroke, cancer..." {...bind('family_history')} /></Field>
        </div>
      </section>

      <section style={s.card}>
        <h2 style={s.h2}>Medications you take</h2>
        <p style={s.hint}>Blood thinners and insulin are especially important to list.</p>
        <RowList items={form.medications} onChange={v => set('medications', v)} addLabel="Add medication"
          fields={[{ key: 'name', placeholder: 'Medication' }, { key: 'dose', placeholder: 'Dose' }, { key: 'frequency', placeholder: 'How often' }]} />
      </section>

      <section style={s.card}>
        <h2 style={s.h2}>Past surgeries and hospital stays</h2>
        <p style={s.hint}>Operations, implants or long admissions.</p>
        <RowList items={form.past_surgeries} onChange={v => set('past_surgeries', v)} addLabel="Add surgery"
          fields={[{ key: 'procedure', placeholder: 'Procedure' }, { key: 'year', placeholder: 'Year' }]} />
      </section>

      <section style={s.card}>
        <h2 style={s.h2}>Getting to you</h2>
        <p style={s.hint}>Helps the driver find you and bring the right equipment.</p>
        <div style={s.grid}>
          <Field label="Home landmark or directions"><textarea rows={3} style={s.input} maxLength={255} placeholder="Blue gate behind the petrol station" {...bind('home_landmark')} /></Field>
          <Field label="Mobility or communication needs"><textarea rows={3} style={s.input} maxLength={1000} placeholder="Wheelchair, hearing loss, language..." {...bind('mobility_needs')} /></Field>
        </div>
      </section>

      <section style={s.card}>
        <h2 style={s.h2}>Emergency contacts</h2>
        <p style={s.hint}>The first contact is your next of kin. Add up to five more.</p>
        <div style={{ ...s.grid, marginBottom: 18 }}>
          <Field label="Next of kin name"><input style={s.input} maxLength={100} {...bind('next_of_kin_name')} /></Field>
          <Field label="Next of kin phone"><input style={s.input} maxLength={20} placeholder="0712345678" {...bind('next_of_kin_phone')} /></Field>
        </div>
        <RowList items={form.extra_contacts} onChange={v => set('extra_contacts', v)} addLabel="Add another contact"
          fields={[{ key: 'name', placeholder: 'Name' }, { key: 'relationship', placeholder: 'Relationship' }, { key: 'phone', placeholder: 'Phone' }]} />
      </section>

      <section style={s.card}>
        <h2 style={s.h2}>Insurance</h2>
        <p style={s.hint}>Speeds up billing once you reach the hospital.</p>
        <div style={s.grid}>
          <Field label="Cover type">
            <select style={s.input} {...bind('insurance_provider')}><option value="">Select</option>{insurers.map(i => <option key={i}>{i}</option>)}</select>
          </Field>
          <Field label="Member number"><input style={s.input} maxLength={60} {...bind('insurance_member_no')} /></Field>
        </div>
      </section>

      <section style={s.card}>
        <label style={{ display: 'flex', gap: 12, alignItems: 'flex-start', cursor: 'pointer' }}>
          <input type="checkbox" style={{ marginTop: 4, width: 18, height: 18 }}
            checked={form.share_with_responders} onChange={e => set('share_with_responders', e.target.checked)} />
          <span>
            <strong style={{ color: '#10243a' }}>Share this profile with my response team</strong>
            <span style={{ display: 'block', ...s.hint, margin: '4px 0 0' }}>
              When on, the assigned driver and hospital staff can view it during an active emergency. You can turn it off any time.
            </span>
          </span>
        </label>
      </section>

      <div style={s.bar}>
        <button type="submit" style={{ ...s.save, opacity: saving ? 0.6 : 1 }} disabled={saving}>
          {saving ? 'Saving...' : 'Save health profile'}
        </button>
        <span style={{ fontSize: 12, color: '#64748b' }}>Only you can edit this information.</span>
      </div>
    </form>
  )
}