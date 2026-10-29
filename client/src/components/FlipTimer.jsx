import React from 'react';

export default function FlipTimer({ seconds = 0 }) {
  // Ensure seconds is a valid number and never negative
  const safeSeconds = Math.max(0, Number(seconds) || 0);
  
  const mins = Math.floor(safeSeconds / 60);
  const secs = safeSeconds % 60;

  const formatTime = (time) => String(time).padStart(2, '0');

  const digitBoxStyle = {
    backgroundColor: '#2a2a2a',
    backgroundImage: 'linear-gradient(to bottom, #333 0%, #222 49%, #111 50%, #222 100%)',
    color: '#e0e0e0',
    fontSize: '3.5rem',
    fontWeight: '900',
    fontFamily: 'monospace',
    padding: '10px 20px',
    borderRadius: '8px',
    border: '1px solid #444',
    boxShadow: '0 4px 10px rgba(0,0,0,0.5), inset 0 2px 2px rgba(255,255,255,0.1)',
    minWidth: '80px',
    textAlign: 'center',
    position: 'relative',
    lineHeight: '1'
  };

  const labelStyle = {
    color: '#f59e0b',
    fontSize: '0.75rem',
    fontWeight: 'bold',
    letterSpacing: '1px',
    marginTop: '8px',
    textTransform: 'uppercase',
    textAlign: 'center'
  };

  return (
    <div style={{ display: 'flex', gap: '15px', alignItems: 'center', margin: '15px 0' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={digitBoxStyle}>{formatTime(mins)}</div>
        <div style={labelStyle}>Minutes</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={digitBoxStyle}>{formatTime(secs)}</div>
        <div style={labelStyle}>Seconds</div>
      </div>
    </div>
  );
}