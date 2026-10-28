import React from 'react'

export default function PatientDashboard() {
  let user = {}
  try {
    user = JSON.parse(localStorage.getItem('medirescue_user') || '{}') || {}
  } catch {
    user = {}
  }
  const name = user.name || user.full_name || 'Patient'

  const card = {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 16,
    padding: 'clamp(24px, 4vw, 38px)',
    boxShadow: 'var(--shadow-modal)',
    marginBottom: 20
  }

  return (
    <main style={{ minHeight: '100%', background: 'var(--bg)', padding: 'clamp(24px, 4vw, 48px)', fontFamily: "'Segoe UI', Arial, sans-serif", color: 'var(--text)' }}>
      <div style={{ maxWidth: 980, margin: '0 auto' }}>
        <div style={{ marginBottom: 28 }}>
          <p style={{ margin: '0 0 10px', color: 'var(--primary-text)', fontWeight: 800, fontSize: 12, letterSpacing: 1.6 }}>MEDIRESCUE PATIENT PORTAL</p>
          <h1 style={{ fontSize: 'clamp(27px, 4vw, 38px)', color: 'var(--heading)', margin: '0 0 12px' }}>Welcome back, {name}</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 16, lineHeight: 1.7, margin: 0 }}>Your space for staying informed about your emergency medical care.</p>
        </div>

        <section style={card}>
          <div aria-hidden="true" style={{ fontSize: 35, marginBottom: 12 }}>🩺</div>
          <h2 style={{ color: 'var(--heading)', margin: '0 0 12px', fontSize: 24 }}>We're here when you need care</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 15, lineHeight: 1.85, margin: 0 }}>MediRescue helps you request emergency medical assistance, follow the progress of your cases, and review payment information. Everything you need is available from the menu on the left.</p>
        </section>

        <section style={{ background: 'var(--danger-soft)', border: '1px solid var(--danger-border)', borderLeft: '4px solid var(--primary)', borderRadius: 14, padding: '22px 26px' }}>
          <h2 style={{ color: 'var(--danger)', fontSize: 18, margin: '0 0 9px' }}>A note about emergencies</h2>
          <p style={{ color: 'var(--danger)', lineHeight: 1.8, fontSize: 14, margin: 0 }}>If someone is in immediate danger or needs urgent lifesaving assistance, contact local emergency services directly. Do not wait for a response through the website.</p>
        </section>
      </div>
    </main>
  )
}