'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { CheckCircle2, XCircle, Trash2, RefreshCw, ShieldCheck, Users, Clock, LogOut } from 'lucide-react'

/* ─── Logo ───────────────────────────────────────────────────── */
function Logo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <svg width="28" height="28" viewBox="0 0 100 100" fill="none">
        <path d="M75 22C60 10 32 15 22 36C12 57 17 83 38 93C54 100 75 93 80 82"
          stroke="#f97316" strokeWidth="14" strokeLinecap="round" />
        <rect x="60" y="44" width="32" height="18" rx="6" fill="#f97316" />
        <circle cx="48" cy="52" r="11" fill="#ffffff" />
      </svg>
      <span style={{ fontWeight: 900, fontSize: '1.1rem', letterSpacing: '-0.03em' }}>
        <span style={{ color: '#f97316' }}>Agent</span>
        <span style={{ color: '#fff' }}>Clamp</span>
        <span style={{ color: '#4b5563', fontWeight: 500, fontSize: '0.75rem', marginLeft: 8 }}>Admin Panel</span>
      </span>
    </div>
  )
}

/* ─── Types ──────────────────────────────────────────────────── */
interface UserRecord {
  id: string
  full_name: string
  email: string
  role: string
  is_approved: boolean
  is_active: boolean
  created_at: string
}

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes blob-drift {
    0%,100% { transform: translate(0,0) scale(1); }
    33%     { transform: translate(30px,-20px) scale(1.04); }
    66%     { transform: translate(-20px,15px) scale(0.97); }
  }

  .admin-page {
    min-height: 100vh;
    background: #050508;
    color: #f8fafc;
    font-family: 'Inter', system-ui, sans-serif;
    position: relative;
    overflow-x: hidden;
  }

  /* Gate screen */
  .admin-gate-card {
    background: linear-gradient(145deg, #111116 0%, #0d0d12 100%);
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 20px;
    padding: 40px;
    width: 100%;
    max-width: 400px;
    animation: fadeIn 0.4s cubic-bezier(.16,1,.3,1) both;
    box-shadow: 0 40px 80px rgba(0,0,0,0.8);
  }

  .admin-input {
    width: 100%;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 10px;
    padding: 11px 14px;
    font-size: 0.875rem;
    color: #f8fafc;
    font-family: 'JetBrains Mono', monospace, inherit;
    outline: none;
    transition: border-color 0.2s, box-shadow 0.2s;
    letter-spacing: 0.5px;
  }
  .admin-input::placeholder { color: #374151; }
  .admin-input:focus { border-color: #f97316; box-shadow: 0 0 0 3px rgba(249,115,22,0.12); }

  .admin-btn-primary {
    background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
    color: #fff; border: none; border-radius: 10px; font-family: inherit;
    font-size: 0.875rem; font-weight: 700; cursor: pointer;
    padding: 11px 20px; width: 100%;
    display: flex; align-items: center; justify-content: center; gap: 8px;
    transition: transform 0.2s, box-shadow 0.2s, opacity 0.2s;
    box-shadow: 0 4px 20px rgba(249,115,22,0.3);
  }
  .admin-btn-primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 28px rgba(249,115,22,0.4); }
  .admin-btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }

  /* Table */
  .admin-table-wrap {
    background: rgba(13,13,20,0.8);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 16px;
    overflow: hidden;
    animation: fadeIn 0.4s cubic-bezier(.16,1,.3,1) both;
  }
  .admin-table { width: 100%; border-collapse: collapse; }
  .admin-table th {
    padding: 12px 16px;
    text-align: left;
    font-size: 0.68rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    color: #6b7280;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    white-space: nowrap;
  }
  .admin-table td {
    padding: 14px 16px;
    font-size: 0.82rem;
    border-bottom: 1px solid rgba(255,255,255,0.04);
    vertical-align: middle;
  }
  .admin-table tr:last-child td { border-bottom: none; }
  .admin-table tr:hover td { background: rgba(255,255,255,0.02); }

  .admin-badge {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 3px 9px; border-radius: 999px;
    font-size: 0.68rem; font-weight: 700; letter-spacing: 0.3px;
    white-space: nowrap;
  }

  .admin-action-btn {
    background: none; border: 1px solid transparent;
    border-radius: 7px; cursor: pointer; font-family: inherit;
    font-size: 0.75rem; font-weight: 600;
    padding: 5px 11px; transition: all 0.18s;
    display: inline-flex; align-items: center; gap: 5px;
  }

  /* Stats bar */
  .admin-stat-card {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 12px;
    padding: 14px 18px;
    flex: 1;
  }
`

/* ─── Main Admin Page ────────────────────────────────────────── */
export default function AdminPage() {
  const [adminKey, setAdminKey]     = useState('')
  const [inputKey, setInputKey]     = useState('')
  const [keyError, setKeyError]     = useState<string | null>(null)
  const [verifying, setVerifying]   = useState(false)

  const [users, setUsers]           = useState<UserRecord[]>([])
  const [loading, setLoading]       = useState(false)
  const [actionId, setActionId]     = useState<string | null>(null)
  const [toast, setToast]           = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)

  const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const fetchUsers = useCallback(async (key: string) => {
    setLoading(true)
    try {
      const data = await api.admin.listUsers(key)
      setUsers(data)
    } catch (err: any) {
      showToast(err.message || 'Failed to load users', 'err')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setVerifying(true)
    setKeyError(null)
    try {
      await api.admin.listUsers(inputKey)
      setAdminKey(inputKey)
      await fetchUsers(inputKey)
    } catch (err: any) {
      setKeyError(err.message?.includes('403') || err.message?.includes('Invalid')
        ? 'Invalid admin key. Please check your .env ADMIN_SECRET_KEY.'
        : err.message || 'Verification failed.')
    } finally {
      setVerifying(false)
    }
  }

  const handleApprove = async (userId: string, email: string) => {
    setActionId(userId)
    try {
      await api.admin.approveUser(userId, adminKey)
      showToast(`✓ Approved ${email}`)
      await fetchUsers(adminKey)
    } catch (err: any) {
      showToast(err.message || 'Failed to approve', 'err')
    } finally {
      setActionId(null)
    }
  }

  const handleReject = async (userId: string, email: string) => {
    if (!confirm(`Reject access for ${email}? They will not be able to log in.`)) return
    setActionId(userId)
    try {
      await api.admin.rejectUser(userId, adminKey)
      showToast(`✗ Rejected ${email}`, 'err')
      await fetchUsers(adminKey)
    } catch (err: any) {
      showToast(err.message || 'Failed to reject', 'err')
    } finally {
      setActionId(null)
    }
  }

  const handleDelete = async (userId: string, email: string) => {
    if (!confirm(`Permanently delete account for ${email}? This cannot be undone.`)) return
    setActionId(userId)
    try {
      await api.admin.deleteUser(userId, adminKey)
      showToast(`Deleted ${email}`)
      await fetchUsers(adminKey)
    } catch (err: any) {
      showToast(err.message || 'Failed to delete', 'err')
    } finally {
      setActionId(null)
    }
  }

  // ── Counts ────────────────────────────────────────────────────
  const pending  = users.filter(u => u.is_active && !u.is_approved).length
  const approved = users.filter(u => u.is_approved).length
  const rejected = users.filter(u => !u.is_active).length

  // ── Gate screen ───────────────────────────────────────────────
  if (!adminKey) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: CSS }} />
        <div className="admin-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 24 }}>
          <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}>
            <div style={{ position: 'absolute', top: '-10%', left: '-5%', width: 600, height: 600, background: 'radial-gradient(circle, rgba(249,115,22,0.07) 0%, transparent 65%)', filter: 'blur(60px)', animation: 'blob-drift 22s ease-in-out infinite' }} />
          </div>

          <div className="admin-gate-card">
            <div style={{ marginBottom: 24 }}><Logo /></div>

            <div style={{
              background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)',
              borderRadius: 10, padding: '10px 14px', marginBottom: 24,
              display: 'flex', gap: 10, alignItems: 'center',
            }}>
              <ShieldCheck size={16} color="#f97316" />
              <span style={{ fontSize: '0.78rem', color: '#f97316', fontWeight: 600 }}>
                Restricted — Admin Access Only
              </span>
            </div>

            <h2 style={{ fontSize: '1.3rem', fontWeight: 900, letterSpacing: '-0.5px', marginBottom: 6 }}>
              Admin Sign-In
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: 24 }}>
              Enter the <code style={{ color: '#f97316', background: 'rgba(249,115,22,0.1)', padding: '1px 5px', borderRadius: 4 }}>ADMIN_SECRET_KEY</code> from your backend <code style={{ color: '#94a3b8' }}>.env</code> file.
            </p>

            {keyError && (
              <div style={{
                padding: '10px 14px', background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8,
                color: '#ef4444', fontSize: '0.78rem', marginBottom: 16,
              }}>
                {keyError}
              </div>
            )}

            <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: '#4b5563', letterSpacing: '0.5px', display: 'block', marginBottom: 8 }}>
                  Admin Secret Key
                </label>
                <input
                  className="admin-input"
                  type="password"
                  required
                  placeholder="agentclamp-admin-2026"
                  value={inputKey}
                  onChange={e => setInputKey(e.target.value)}
                  autoFocus
                />
              </div>
              <button className="admin-btn-primary" type="submit" disabled={verifying || !inputKey}>
                {verifying ? (
                  <><span style={{ width: 15, height: 15, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} /> Verifying…</>
                ) : (
                  <><ShieldCheck size={15} /> Enter Admin Panel</>
                )}
              </button>
            </form>

            <div style={{ marginTop: 20, textAlign: 'center' }}>
              <Link href="/" style={{ fontSize: '0.75rem', color: '#4b5563', textDecoration: 'none' }}>
                ← Back to landing page
              </Link>
            </div>
          </div>
        </div>
      </>
    )
  }

  // ── Dashboard ─────────────────────────────────────────────────
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="admin-page">
        {/* BG */}
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
          <div style={{ position: 'absolute', top: '-10%', right: '-5%', width: 500, height: 500, background: 'radial-gradient(circle, rgba(249,115,22,0.06) 0%, transparent 65%)', filter: 'blur(60px)', animation: 'blob-drift 25s ease-in-out infinite' }} />
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.02) 1px, transparent 0)', backgroundSize: '28px 28px' }} />
        </div>

        {/* Header */}
        <header style={{
          position: 'sticky', top: 0, zIndex: 50,
          background: 'rgba(5,5,8,0.9)', backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          padding: '14px 32px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <Logo />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => fetchUsers(adminKey)}
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#9ca3af', cursor: 'pointer', padding: '7px 12px', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', fontFamily: 'inherit', transition: 'all 0.2s' }}
            >
              <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
              Refresh
            </button>
            <button
              onClick={() => { setAdminKey(''); setUsers([]); }}
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, color: '#f87171', cursor: 'pointer', padding: '7px 12px', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', fontFamily: 'inherit', transition: 'all 0.2s' }}
            >
              <LogOut size={14} /> Sign Out
            </button>
          </div>
        </header>

        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 28px', position: 'relative', zIndex: 1 }}>

          {/* Page title */}
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 4 }}>
              User Access Management
            </h1>
            <p style={{ fontSize: '0.82rem', color: '#6b7280' }}>
              Review and approve access requests for AgentClamp.
            </p>
          </div>

          {/* Stats bar */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
            {[
              { icon: <Users size={18} color="#f97316" />, label: 'Total Users',     value: users.length,  color: '#f97316' },
              { icon: <Clock size={18} color="#fbbf24" />, label: 'Pending Review',  value: pending,        color: '#fbbf24' },
              { icon: <CheckCircle2 size={18} color="#22c55e" />, label: 'Approved', value: approved,       color: '#22c55e' },
              { icon: <XCircle size={18} color="#ef4444" />,      label: 'Rejected', value: rejected,       color: '#ef4444' },
            ].map(s => (
              <div key={s.label} className="admin-stat-card" style={{ minWidth: 140 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>{s.icon}</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 900, color: s.color, letterSpacing: '-1px', lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: '0.7rem', color: '#6b7280', marginTop: 4, fontWeight: 600 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Toast */}
          {toast && (
            <div style={{
              position: 'fixed', bottom: 28, right: 28, zIndex: 200,
              background: toast.type === 'ok' ? 'rgba(22,101,52,0.95)' : 'rgba(127,29,29,0.95)',
              border: `1px solid ${toast.type === 'ok' ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)'}`,
              borderRadius: 10, padding: '12px 18px',
              color: '#fff', fontSize: '0.82rem', fontWeight: 600,
              backdropFilter: 'blur(8px)', boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
              animation: 'fadeIn 0.3s ease both',
            }}>
              {toast.msg}
            </div>
          )}

          {/* User table */}
          {loading && users.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, gap: 12, color: '#4b5563' }}>
              <span style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid rgba(249,115,22,0.3)', borderTopColor: '#f97316', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
              Loading users…
            </div>
          ) : users.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#4b5563' }}>
              <Users size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
              <p>No users registered yet.</p>
            </div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Role</th>
                    <th>Registered</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => {
                    const isPending  = u.is_active && !u.is_approved
                    const isApproved = u.is_approved
                    const isRejected = !u.is_active
                    const busy       = actionId === u.id

                    return (
                      <tr key={u.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                              width: 32, height: 32, borderRadius: '50%',
                              background: `linear-gradient(135deg, ${isPending ? '#f59e0b' : isApproved ? '#22c55e' : '#4b5563'} 0%, ${isPending ? '#d97706' : isApproved ? '#16a34a' : '#374151'} 100%)`,
                              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '0.75rem', fontWeight: 800, flexShrink: 0,
                            }}>
                              {u.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                            </div>
                            <span style={{ fontWeight: 600, color: '#f8fafc' }}>{u.full_name}</span>
                          </div>
                        </td>
                        <td style={{ color: '#9ca3af' }}>{u.email}</td>
                        <td>
                          {isPending && (
                            <span className="admin-badge" style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', color: '#fbbf24' }}>
                              <Clock size={11} /> Pending
                            </span>
                          )}
                          {isApproved && (
                            <span className="admin-badge" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e' }}>
                              <CheckCircle2 size={11} /> Approved
                            </span>
                          )}
                          {isRejected && (
                            <span className="admin-badge" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>
                              <XCircle size={11} /> Rejected
                            </span>
                          )}
                        </td>
                        <td>
                          <span style={{ fontSize: '0.72rem', color: u.role === 'admin' ? '#f97316' : '#6b7280', fontWeight: 600 }}>
                            {u.role}
                          </span>
                        </td>
                        <td style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                          {new Date(u.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                            {/* Approve */}
                            {!isApproved && (
                              <button
                                className="admin-action-btn"
                                disabled={busy}
                                onClick={() => handleApprove(u.id, u.email)}
                                style={{ color: '#22c55e', borderColor: 'rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.07)' }}
                                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(34,197,94,0.15)' }}
                                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(34,197,94,0.07)' }}
                              >
                                {busy ? <span style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid rgba(34,197,94,0.3)', borderTopColor: '#22c55e', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} /> : <CheckCircle2 size={13} />}
                                Approve
                              </button>
                            )}
                            {/* Reject */}
                            {!isRejected && (
                              <button
                                className="admin-action-btn"
                                disabled={busy}
                                onClick={() => handleReject(u.id, u.email)}
                                style={{ color: '#f87171', borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.07)' }}
                                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.15)' }}
                                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.07)' }}
                              >
                                <XCircle size={13} /> Reject
                              </button>
                            )}
                            {/* Delete */}
                            <button
                              className="admin-action-btn"
                              disabled={busy}
                              onClick={() => handleDelete(u.id, u.email)}
                              style={{ color: '#6b7280', borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)' }}
                              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#ef4444'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(239,68,68,0.3)' }}
                              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#6b7280'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.1)' }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
