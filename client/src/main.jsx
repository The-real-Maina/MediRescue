import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Production backend address, e.g. https://medirescue-api.onrender.com
// (no trailing slash, no /api). When it is not set (local development),
// nothing below runs and the app behaves exactly as before.
const API_ORIGIN = (import.meta.env.VITE_API_ORIGIN || '').replace(/\/+$/, '')

if (API_ORIGIN) {
  const originalFetch = window.fetch.bind(window)

  // Matches the test addresses hardcoded in the app:
  // localhost, 127.0.0.1 and 192.168.x.x, with or without a port
  const TEST_ADDRESS = /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3})(:\d+)?(?=\/|$)/

  const rewriteUrl = (url) => {
    if (typeof url !== 'string') return url
    // Relative calls like '/api/cases' used to go through the Vite proxy
    if (url === '/api' || url.startsWith('/api/')) return API_ORIGIN + url
    return url.replace(TEST_ADDRESS, API_ORIGIN)
  }

  window.fetch = (input, init) => originalFetch(rewriteUrl(input), init)
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)