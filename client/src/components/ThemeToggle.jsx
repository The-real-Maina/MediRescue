import { useEffect, useState } from 'react'

function getInitialTheme() {
  try {
    const saved = localStorage.getItem('theme')
    if (saved === 'dark' || saved === 'light') return saved
  } catch {
    // ignore storage errors
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

// <ThemeToggle floating /> pins the button to the bottom-right corner.
// <ThemeToggle /> renders it inline (for use inside a navbar).
export default function ThemeToggle({ floating = false }) {
  const [theme, setTheme] = useState(getInitialTheme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try {
      localStorage.setItem('theme', theme)
    } catch {
      // ignore storage errors
    }
  }, [theme])

  const floatingStyle = floating
    ? {
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 1000,
        boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
      }
    : {}

  return (
    <button
      type="button"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      aria-label="Toggle dark mode"
      style={{
        padding: '10px 16px',
        borderRadius: '999px',
        border: '1px solid var(--border)',
        background: 'var(--surface)',
        color: 'var(--heading)',
        fontFamily: 'inherit',
        fontSize: 13,
        fontWeight: 700,
        cursor: 'pointer',
        ...floatingStyle,
      }}
    >
      {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
    </button>
  )
}