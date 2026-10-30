import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const API_URL = 'http://192.168.137.1:5000/api/admin/patients'

const css = `
.pm-page{min-height:100vh;background:#f0f4fa;color:#102a43;font-family:'Segoe UI',Arial,sans-serif}
.pm-page *{box-sizing:border-box}
.pm-header{background:#102a43;border-bottom:4px solid #dc2626;padding:20px 24px}
.pm-header-inner{max-width:1200px;margin:auto;display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap}
.pm-brand{display:flex;align-items:center;gap:12px;color:white}
.pm-mark{width:46px;height:46px;background:#dc2626;border-radius:12px;display:grid;place-items:center;font-size:30px;font-weight:900}
.pm-brand-title{font-size:23px;font-weight:850}
.pm-brand-sub{color:#cbd5e1;font-size:10px;letter-spacing:2px;margin-top:3px}
.pm-back{border:0;border-radius:9px;background:white;color:#102a43;padding:12px 17px;font-weight:800;cursor:pointer}
.pm-main{max-width:1200px;margin:auto;padding:40px 22px 60px}
.pm-eyebrow{color:#dc2626;font-size:11px;font-weight:900;letter-spacing:2px;margin:0 0 12px}
.pm-title{font-size:clamp(29px,4vw,39px);margin:0 0 11px}
.pm-description{color:#64748b;line-height:1.7;margin:0 0 29px}
.pm-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:16px;margin-bottom:28px}
.pm-stat{background:#fff;border:1px solid #dce5ef;border-radius:15px;padding:23px;display:flex;justify-content:space-between;align-items:center;box-shadow:0 7px 22px #102a4308}
.pm-stat-label{color:#64748b;font-size:13px;font-weight:750;margin-bottom:10px}
.pm-stat-number{font-size:32px;font-weight:900}
.pm-stat-icon{width:47px;height:47px;display:grid;place-items:center;border-radius:12px;font-size:23px;font-weight:900}
.pm-panel{background:white;border:1px solid #dce5ef;border-radius:16px;padding:25px;box-shadow:0 8px 24px #102a4309}
.pm-panel-top{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:23px}
.pm-panel-title{font-size:22px;margin:0 0 8px}
.pm-panel-description{font-size:13px;color:#64748b;margin:0}
.pm-count{background:#eaf2ff;color:#102a43;font-size:13px;padding:5px 10px;border-radius:99px;vertical-align:middle;margin-left:7px}
.pm-refresh{background:#dc2626;color:white;border:0;border-radius:9px;padding:12px 18px;font-weight:800;cursor:pointer}
.pm-refresh:disabled{opacity:.6;cursor:wait}
.pm-search{width:100%;padding:14px 15px;border:1px solid #cbd5e1;border-radius:9px;font-size:14px;color:#102a43;background:white;margin-bottom:23px;outline-color:#dc2626}
.pm-alert{background:#fff1f2;border:1px solid #fecdd3;color:#b91c1c;padding:15px;border-radius:9px;margin-bottom:18px}
.pm-empty{padding:43px 16px;text-align:center;color:#64748b}
.pm-table-wrap{overflow-x:auto;border:1px solid #dce5ef;border-radius:11px}
.pm-table{border-collapse:collapse;width:100%;min-width:550px;text-align:left}
.pm-table th{background:#f4f7fb;color:#64748b;font-size:12px;letter-spacing:.6px;text-transform:uppercase;padding:17px 16px;border-bottom:1px solid #dce5ef}
.pm-table td{padding:17px 16px;font-size:14px;border-bottom:1px solid #e8edf4}
.pm-table tbody tr:hover{background:#f8fbff}
.pm-table tbody tr:last-child td{border-bottom:0}
.pm-id{color:#dc2626;font-weight:850}.pm-name{font-weight:750}
.pm-footer{text-align:center;color:#8495ad;font-size:12px;margin-top:36px}
@media(max-width:600px){.pm-main{padding:28px 15px 45px}.pm-header{padding:16px}.pm-panel{padding:18px}.pm-refresh{width:100%}}
`

function PatientManagement() {
  const navigate = useNavigate()
  const [patients, setPatients] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadPatients = async (signal) => {
    setLoading(true)
    setError('')
    try {
      const token = localStorage.getItem('medirescue_token')
      if (!token) {
        navigate('/login', { replace: true })
        return
      }
      const response = await fetch(API_URL, {
        headers: { Authorization: `Bearer ${token}` },
        signal
      })
      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('medirescue_token')
        localStorage.removeItem('medirescue_user')
        navigate('/login', { replace: true })
        return
      }
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to retrieve patients')
      }
      if (!Array.isArray(data)) throw new Error('Unexpected API response')
      if (!signal?.aborted) setPatients(data)
    } catch (err) {
      if (err.name !== 'AbortError' && !signal?.aborted) {
        setError(err.message || 'Failed to load patients')
      }
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    loadPatients(controller.signal)
    return () => controller.abort()
  }, [navigate])

  const filteredPatients = patients.filter((patient) => {
    const query = search.trim().toLowerCase()
    return [patient.id, patient.name, patient.phone].some((value) =>
      String(value ?? '').toLowerCase().includes(query)
    )
  })

  const withPhone = patients.filter((patient) =>
    String(patient.phone ?? '').trim().length > 0
  ).length

  return (
    <div className="pm-page">
      <style>{css}</style>
      <header className="pm-header">
        <div className="pm-header-inner">
          <div className="pm-brand">
            <div className="pm-mark">+</div>
            <div>
              <div className="pm-brand-title">MediRescue</div>
              <div className="pm-brand-sub">SUPER ADMIN PORTAL</div>
            </div>
          </div>
          <button type="button" className="pm-back"
            onClick={() => navigate('/admin-dashboard')}>
            ← Dashboard
          </button>
        </div>
      </header>

      <main className="pm-main">
        <p className="pm-eyebrow">PATIENT DIRECTORY</p>
        <h1 className="pm-title">Patient Management</h1>
        <p className="pm-description">
          View and monitor registered patients across MediRescue.
          Search patient records without changing account information.
        </p>

        <div className="pm-stats">
          <div className="pm-stat">
            <div>
              <div className="pm-stat-label">Registered Patients</div>
              <div className="pm-stat-number">{patients.length}</div>
            </div>
            <div className="pm-stat-icon" style={{ background: '#eaf2ff', color: '#1d4ed8' }}>♙</div>
          </div>
          <div className="pm-stat">
            <div>
              <div className="pm-stat-label">Matching Search</div>
              <div className="pm-stat-number">{filteredPatients.length}</div>
            </div>
            <div className="pm-stat-icon" style={{ background: '#fff1f2', color: '#dc2626' }}>⌕</div>
          </div>
          <div className="pm-stat">
            <div>
              <div className="pm-stat-label">With Phone Numbers</div>
              <div className="pm-stat-number">{withPhone}</div>
            </div>
            <div className="pm-stat-icon" style={{ background: '#e8fbf0', color: '#047857' }}>☎</div>
          </div>
        </div>

        <section className="pm-panel">
          <div className="pm-panel-top">
            <div>
              <h2 className="pm-panel-title">
                Registered Patients
                <span className="pm-count">{filteredPatients.length}</span>
              </h2>
              <p className="pm-panel-description">
                Browse patient IDs, names and contact numbers.
              </p>
            </div>
            <button type="button" className="pm-refresh"
              disabled={loading} onClick={() => loadPatients()}>
              {loading ? 'Refreshing...' : '↻ Refresh Records'}
            </button>
          </div>

          <input
            className="pm-search"
            type="search"
            aria-label="Search patients"
            placeholder="Search by name, phone or patient ID..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          {error && <div role="alert" className="pm-alert">{error}</div>}
          {loading ? (
            <div className="pm-empty">Loading patient records...</div>
          ) : !error && filteredPatients.length === 0 ? (
            <div className="pm-empty">No patients match your search.</div>
          ) : !error ? (
            <div className="pm-table-wrap">
              <table className="pm-table">
                <thead>
                  <tr>
                    <th>Patient ID</th>
                    <th>Full Name</th>
                    <th>Phone Number</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPatients.map((patient) => (
                    <tr key={patient.id}>
                      <td className="pm-id">#{patient.id}</td>
                      <td className="pm-name">{patient.name || 'Unknown'}</td>
                      <td>{patient.phone || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
        <footer className="pm-footer">
          MediRescue • Emergency Response Management System
        </footer>
      </main>
    </div>
  )
}

export default PatientManagement
