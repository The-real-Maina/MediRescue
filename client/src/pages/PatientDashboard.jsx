import React from 'react'

const colors = {
  navy: '#10243a', red: '#dc2626', text: '#17233b',
  muted: '#64748b', background: '#f1f5f9', border: '#e2e8f0'
}

export default function PatientDashboard() {
  let user = {}
  try {
    user = JSON.parse(localStorage.getItem('medirescue_user') || '{}') || {}
  } catch {
    user = {}
  }
  const name = user.name || user.full_name || 'Patient'

  return (
    <main style={{ minHeight: '100%', background: colors.background, padding: 'clamp(24px, 4vw, 48px)', fontFamily: "'Segoe UI', Arial, sans-serif", color: colors.text }}>
      <div style={{ maxWidth: 980, margin: '0 auto' }}>
        <div style={{ marginBottom: 28 }}>
          <p style={{ margin: '0 0 10px', color: colors.red, fontWeight: 800, fontSize: 12, letterSpacing: 1.6 }}>MEDIRESCUE PATIENT PORTAL</p>
          <h1 style={{ fontSize: 'clamp(27px, 4vw, 38px)', color: colors.navy, margin: '0 0 12px' }}>Welcome back, {name}</h1>
          <p style={{ color: colors.muted, fontSize: 16, lineHeight: 1.7, margin: 0 }}>Your space for staying informed about your emergency medical care.</p>
        </div>

        <section style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 16, padding: 'clamp(24px, 4vw, 38px)', boxShadow: '0 6px 22px rgba(15,23,42,0.04)', marginBottom: 20 }}>
          <div aria-hidden="true" style={{ fontSize: 35, marginBottom: 12 }}>🩺</div>
          <h2 style={{ color: colors.navy, margin: '0 0 12px', fontSize: 24 }}>We're here when you need care</h2>
          <p style={{ color: colors.muted, fontSize: 15, lineHeight: 1.85, margin: 0 }}>MediRescue helps you request emergency medical assistance, follow the progress of your cases, and review payment information. Everything you need is available from the menu on the left.</p>
        </section>

        <section style={{ background: '#fff7f7', border: '1px solid #fecaca', borderLeft: `4px solid ${colors.red}`, borderRadius: 14, padding: '22px 26px' }}>
          <h2 style={{ color: '#991b1b', fontSize: 18, margin: '0 0 9px' }}>A note about emergencies</h2>
          <p style={{ color: '#7f1d1d', lineHeight: 1.8, fontSize: 14, margin: 0 }}>If someone is in immediate danger or needs urgent lifesaving assistance, contact local emergency services directly. Do not wait for a response through the website.</p>
        </section>
      </div>
    </main>
  )
}
