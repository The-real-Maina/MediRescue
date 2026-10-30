import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import InstallPWA from '../components/InstallPWA' // ADDED

export default function PatientDashboard() {
  const navigate = useNavigate()
  
  let user = {}
  try {
    user = JSON.parse(localStorage.getItem('medirescue_user') || '{}') || {}
  } catch {
    user = {}
  }
  const name = user.name || user.full_name || 'Patient'

  const [sosLoading, setSosLoading] = useState(false)
  const [sosError, setSosError] = useState('')
  const [sosSuccess, setSosSuccess] = useState('')

  const handleSOS = () => {
    if (!window.confirm("🚨 EMERGENCY SOS: Are you sure you want to send an immediate SOS dispatch to your current location?")) return;

    setSosLoading(true)
    setSosError('')
    setSosSuccess('')

    if (!navigator.geolocation) {
      setSosError('Location services are not supported by this browser.')
      setSosLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const token = localStorage.getItem('medirescue_token')
          if (!token) {
            navigate('/login')
            return
          }

          const res = await fetch('http://192.168.137.1:5000/api/cases', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
              emergency_type: 'SOS Emergency',
              emergency_desc: 'One-tap SOS triggered. Patient requires immediate assistance.',
              severity: 'critical',
              pickup_lat: position.coords.latitude,
              pickup_lng: position.coords.longitude
            })
          })

          const data = await res.json()

          if (res.ok) {
            setSosSuccess(`🚨 SOS Sent! An ambulance is being dispatched. Case ID: ${data.case_id}`)
            setTimeout(() => navigate('/my-cases'), 3000)
          } else {
            setSosError(data.error || 'Failed to send SOS dispatch.')
          }
        } catch (err) {
          setSosError('Network error. Please call emergency services directly.')
        } finally {
          setSosLoading(false)
        }
      },
      (error) => {
        setSosLoading(false)
        setSosError('Location permission denied. Please allow location access or call emergency services.')
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }

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
      
      {/* ADDED PWA INSTALL BUTTON */}
      <InstallPWA />

      <div style={{ maxWidth: 980, margin: '0 auto' }}>
        
        <div style={{ marginBottom: 28 }}>
          <p style={{ margin: '0 0 10px', color: 'var(--primary-text)', fontWeight: 800, fontSize: 12, letterSpacing: 1.6 }}>MEDIRESCUE PATIENT PORTAL</p>
          <h1 style={{ fontSize: 'clamp(27px, 4vw, 38px)', color: 'var(--heading)', margin: '0 0 12px' }}>Welcome back, {name}</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 16, lineHeight: 1.7, margin: 0 }}>Your space for staying informed about your emergency medical care.</p>
        </div>

        <section style={{ background: '#dc2626', color: 'white', borderRadius: 16, padding: '30px 24px', textAlign: 'center', marginBottom: 24, boxShadow: '0 10px 25px rgba(220, 38, 38, 0.3)' }}>
          <h2 style={{ margin: '0 0 10px', fontSize: 26, fontWeight: 900 }}>🚨 NEED IMMEDIATE HELP? 🚨</h2>
          <p style={{ margin: '0 0 24px', fontSize: 16, opacity: 0.9, maxWidth: 600, marginLeft: 'auto', marginRight: 'auto' }}>
            Tap the button below to instantly send an emergency request with your exact GPS location. No forms required.
          </p>
          
          {sosError && <div style={{ background: '#7f1d1d', padding: 12, borderRadius: 8, marginBottom: 15, fontWeight: 'bold' }}>{sosError}</div>}
          {sosSuccess && <div style={{ background: '#166534', padding: 12, borderRadius: 8, marginBottom: 15, fontWeight: 'bold' }}>{sosSuccess}</div>}
          
          <button
            onClick={handleSOS}
            disabled={sosLoading}
            style={{
              background: 'white',
              color: '#dc2626',
              border: 'none',
              borderRadius: 50,
              padding: '20px 50px',
              fontSize: 22,
              fontWeight: 900,
              cursor: sosLoading ? 'wait' : 'pointer',
              boxShadow: '0 8px 20px rgba(0,0,0,0.2)',
              transition: 'transform 0.1s',
              transform: sosLoading ? 'scale(0.98)' : 'scale(1)'
            }}
            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
            onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            {sosLoading ? '⌛ Sending SOS...' : '📍 ONE-TAP SOS'}
          </button>
        </section>

        <section style={card}>
          <div aria-hidden="true" style={{ fontSize: 35, marginBottom: 12 }}>🩺</div>
          <h2 style={{ color: 'var(--heading)', margin: '0 0 12px', fontSize: 24 }}>We're here when you need care</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 15, lineHeight: 1.85, margin: 0 }}>
            MediRescue helps you request emergency medical assistance, follow the progress of your cases, and review payment information. Everything you need is available from the menu on the left.
            <br /><br />
            If your situation is not immediately life-threatening, you can still use the <a href="/emergency-request" style={{ color: '#2563eb', fontWeight: 'bold' }}>Emergency Request Form</a> to provide more details before dispatching.
          </p>
        </section>

        <section style={{ background: 'var(--danger-soft)', border: '1px solid var(--danger-border)', borderLeft: '4px solid var(--primary)', borderRadius: 14, padding: '22px 26px' }}>
          <h2 style={{ color: 'var(--danger)', fontSize: 18, margin: '0 0 9px' }}>A note about emergencies</h2>
          <p style={{ color: 'var(--danger)', lineHeight: 1.8, fontSize: 14, margin: 0 }}>If someone is in immediate danger or needs urgent lifesaving assistance, contact local emergency services directly. Do not wait for a response through the website.</p>
        </section>
      </div>
    </main>
  )
}