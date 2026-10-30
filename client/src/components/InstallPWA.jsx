import { useState, useEffect } from 'react';

export default function InstallPWA() {
  const [supportsPWA, setSupportsPWA] = useState(false);
  const [promptInstall, setPromptInstall] = useState(null);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setSupportsPWA(true);
      setPromptInstall(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const onClick = (evt) => {
    evt.preventDefault();
    if (!promptInstall) return;
    promptInstall.prompt();
  };

  if (!supportsPWA) return null;

  return (
    <div style={{ position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 9999, background: '#10243a', padding: '15px 25px', borderRadius: '50px', boxShadow: '0 10px 25px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', gap: '15px' }}>
      <div style={{ color: '#fff', fontSize: '14px' }}>
        <strong>Install MediRescue</strong>
        <div style={{ fontSize: '12px', color: '#cbd5e1' }}>Add to home screen for fast access</div>
      </div>
      <button 
        onClick={onClick}
        style={{ background: '#dc2626', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '25px', fontWeight: 'bold', cursor: 'pointer' }}
      >
        Install
      </button>
    </div>
  );
}