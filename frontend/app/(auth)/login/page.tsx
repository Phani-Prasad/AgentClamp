'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import { setAuth, isAuthenticated } from '@/lib/auth'
import {
  ShieldCheck, Zap, Bot, BarChart3, Eye, EyeOff,
  ArrowRight, Lock, Scale, CheckCircle2, KeyRound,
} from 'lucide-react'

/* ─── Design tokens (inline for self-contained auth page) ─────────── */
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes blob-drift {
    0%,100% { transform: translate(0,0) scale(1); }
    33%     { transform: translate(30px,-20px) scale(1.04); }
    66%     { transform: translate(-20px,15px) scale(0.97); }
  }
  @keyframes pulse-ring {
    0%   { box-shadow: 0 0 0 0 rgba(249,115,22,0.35); }
    70%  { box-shadow: 0 0 0 10px rgba(249,115,22,0); }
    100% { box-shadow: 0 0 0 0 rgba(249,115,22,0); }
  }

  .auth-page {
    min-height: 100vh;
    background: #050508;
    display: flex;
    font-family: 'Inter', system-ui, sans-serif;
    color: #f8fafc;
    position: relative;
    overflow: hidden;
  }

  /* Left branding panel */
  .auth-left {
    width: 52%;
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 60px 56px;
    border-right: 1px solid rgba(255,255,255,0.05);
    overflow: hidden;
  }

  /* Right form panel */
  .auth-right {
    width: 48%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding: 40px 52px;
    position: relative;
  }

  .auth-form-card {
    width: 100%;
    max-width: 400px;
    animation: fadeIn 0.45s cubic-bezier(.16,1,.3,1) both;
  }

  .auth-tab {
    flex: 1;
    padding: 10px 0;
    background: none;
    border: none;
    font-family: inherit;
    font-size: 0.82rem;
    font-weight: 600;
    color: #4b5563;
    cursor: pointer;
    transition: all 0.2s;
    border-bottom: 2px solid transparent;
    text-align: center;
  }
  .auth-tab.active {
    color: #f97316;
    border-bottom-color: #f97316;
  }
  .auth-tab:hover:not(.active) { color: #9ca3af; }

  .auth-input-wrap {
    position: relative;
  }
  .auth-input {
    width: 100%;
    padding: 12px 16px;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 10px;
    color: #f8fafc;
    font-family: inherit;
    font-size: 0.875rem;
    outline: none;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .auth-input:focus {
    border-color: #f97316;
    box-shadow: 0 0 0 3px rgba(249,115,22,0.15);
  }
  .auth-input::placeholder { color: #374151; }
  .auth-input.has-icon { padding-right: 44px; }

  .auth-input-icon {
    position: absolute;
    right: 14px;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    color: #4b5563;
    cursor: pointer;
    display: flex;
    align-items: center;
    padding: 0;
    transition: color 0.15s;
  }
  .auth-input-icon:hover { color: #9ca3af; }

  .auth-btn-primary {
    width: 100%;
    padding: 12px 20px;
    background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
    border: none;
    border-radius: 10px;
    color: #ffffff;
    font-family: inherit;
    font-size: 0.875rem;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    box-shadow: 0 4px 20px rgba(249,115,22,0.35);
    transition: all 0.2s ease;
    position: relative;
    overflow: hidden;
  }
  .auth-btn-primary:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 6px 25px rgba(249,115,22,0.5);
  }
  .auth-btn-primary:active:not(:disabled) { transform: translateY(0); }
  .auth-btn-primary:disabled { opacity: 0.65; cursor: not-allowed; }

  .auth-label {
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #4b5563;
    display: block;
    margin-bottom: 8px;
  }

  .auth-feature-pill {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 10px;
    transition: border-color 0.25s, background 0.25s;
  }
  .auth-feature-pill:hover {
    border-color: rgba(249,115,22,0.2);
    background: rgba(249,115,22,0.04);
  }

  .auth-stat {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 10px;
    padding: 12px 14px;
    text-align: center;
    flex: 1;
    transition: border-color 0.25s;
  }
  .auth-stat:hover { border-color: rgba(249,115,22,0.2); }

  @media (max-width: 900px) {
    .auth-left { display: none; }
    .auth-right { width: 100%; padding: 32px 24px; }
  }
`

/* ─── Logo ──────────────────────────────────────────────────── */
function Logo({ size = 32 }: { size?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <path d="M75 22C60 10 32 15 22 36C12 57 17 83 38 93C54 100 75 93 80 82"
          stroke="#f97316" strokeWidth="14" strokeLinecap="round" />
        <rect x="60" y="44" width="32" height="18" rx="6" fill="#f97316" />
        <circle cx="48" cy="52" r="11" fill="#ffffff" />
      </svg>
      <div style={{ lineHeight: 1.1 }}>
        <div style={{ fontSize: size * 0.62, fontWeight: 900, letterSpacing: '-0.5px' }}>
          <span style={{ color: '#f97316' }}>Agent</span>
          <span style={{ color: '#fff' }}>Clamp</span>
        </div>
        <div style={{ fontSize: size * 0.27, color: '#94a3b8', fontWeight: 500, letterSpacing: '0.3px' }}>
          Govern with Confidence
        </div>
      </div>
    </div>
  )
}

/* ─── Feature bullets shown on left panel ────────────────────── */
const FEATURES = [
  { icon: <ShieldCheck size={16} color="#f97316" />, label: 'Real-Time Guardrails', sub: 'Block, mask & redact in milliseconds' },
  { icon: <Bot size={16} color="#fbbf24" />, label: 'Multi-Agent Orchestration', sub: 'LangGraph-powered agent pipelines' },
  { icon: <BarChart3 size={16} color="#38bdf8" />, label: 'Deep Observability', sub: 'Full token, cost & trace analytics' },
  { icon: <Scale size={16} color="#818cf8" />, label: 'Compliance Hub', sub: 'EU AI Act, NIST, ISO 42001 coverage' },
]

const STATS = [
  { value: '<5ms', label: 'Guardrail Latency' },
  { value: '99.9%', label: 'Platform Uptime' },
  { value: '10+', label: 'Compliance Frameworks' },
]

/* ─── Inner form (needs useSearchParams, so wrapped in Suspense) ─ */
function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') || '/dashboard'

  const [mode, setMode] = useState<'passcode' | 'login' | 'signup'>('passcode')
  const [passcode, setPasscode] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errorType, setErrorType] = useState<'error' | 'pending'>('error')
  const [pendingUser, setPendingUser] = useState<{ full_name: string; email: string } | null>(null)

  // If already authenticated, skip to app
  useEffect(() => {
    if (isAuthenticated()) {
      router.replace(decodeURIComponent(redirectTo))
    }
  }, [router, redirectTo])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setErrorType('error')

    try {
      let data: any
      if (mode === 'passcode') {
        data = await api.auth.passcode(passcode)
      } else if (mode === 'login') {
        data = await api.auth.login({ email, password })
      } else {
        data = await api.auth.signup({ full_name: name, email, password })
      }

      if (mode === 'signup' && data.status === 'pending') {
        setPendingUser(data.user)
        setLoading(false)
        return
      }

      if (data.access_token && data.user) {
        setAuth(data.access_token, data.user)
      }

      router.replace(decodeURIComponent(redirectTo))
    } catch (err: any) {
      setLoading(false)
      const msg: string = err.message || 'Authentication failed.'
      if (msg.startsWith('PENDING_APPROVAL:')) {
        setErrorType('pending')
        setError(msg.replace('PENDING_APPROVAL: ', ''))
      } else {
        setErrorType('error')
        setError(msg)
      }
    }
  }

  const switchMode = (next: 'passcode' | 'login' | 'signup') => {
    setMode(next)
    setError(null)
    setPendingUser(null)
    setPasscode('')
    setEmail('')
    setPassword('')
    setName('')
  }

  // ── "Request Submitted" success panel ─────────────────────────
  if (pendingUser) {
    return (
      <div className="auth-form-card" style={{ textAlign: 'center' }}>
        <div style={{ marginBottom: 28 }}><Logo size={34} /></div>

        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: 'rgba(249,115,22,0.1)',
          border: '2px solid rgba(249,115,22,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
          animation: 'pulse-ring 2s ease-out infinite',
        }}>
          <CheckCircle2 size={28} color="#f97316" />
        </div>

        <h2 style={{ fontSize: '1.4rem', fontWeight: 900, letterSpacing: '-0.5px', marginBottom: 8 }}>
          Request Submitted!
        </h2>
        <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.65, marginBottom: 24 }}>
          Thank you, <strong style={{ color: '#f8fafc' }}>{pendingUser.full_name}</strong>.
          Your access request for <strong style={{ color: '#f97316' }}>{pendingUser.email}</strong> has been
          received and is pending administrator review.
        </p>

        <button
          className="auth-btn-primary"
          onClick={() => switchMode('passcode')}
          style={{ marginBottom: 12 }}
        >
          Enter Passcode Instead <ArrowRight size={16} />
        </button>
      </div>
    )
  }

  return (
    <div className="auth-form-card">
      {/* Logo */}
      <div style={{ marginBottom: 28 }}>
        <Logo size={34} />
      </div>

      {/* Heading */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{
          fontSize: '0.7rem',
          fontWeight: 700,
          background: 'rgba(249,115,22,0.12)',
          color: '#f97316',
          border: '1px solid rgba(249,115,22,0.3)',
          padding: '2px 8px',
          borderRadius: 6,
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          Private Access
        </span>
      </div>

      <h1 style={{ fontSize: '1.55rem', fontWeight: 900, letterSpacing: '-0.5px', marginBottom: 6 }}>
        {mode === 'passcode' ? 'Unlock Workspace' : mode === 'login' ? 'Account Sign In' : 'Request Access'}
      </h1>
      <p style={{ fontSize: '0.82rem', color: '#6b7280', marginBottom: 24 }}>
        {mode === 'passcode'
          ? 'Enter your authorized workspace passcode to access the platform.'
          : mode === 'login'
          ? 'Sign in with your email and password.'
          : 'Submit your details for workspace approval.'}
      </p>

      {/* Mode Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: 24, gap: 4 }}>
        <button className={`auth-tab ${mode === 'passcode' ? 'active' : ''}`} onClick={() => switchMode('passcode')}>
          Access Passcode
        </button>
        <button className={`auth-tab ${mode === 'login' ? 'active' : ''}`} onClick={() => switchMode('login')}>
          Email Sign In
        </button>
        <button className={`auth-tab ${mode === 'signup' ? 'active' : ''}`} onClick={() => switchMode('signup')}>
          Request Access
        </button>
      </div>

      {/* Error / Notice */}
      {error && (
        <div style={{
          padding: '12px 14px',
          background: errorType === 'pending' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
          border: `1px solid ${errorType === 'pending' ? 'rgba(245,158,11,0.35)' : 'rgba(239,68,68,0.3)'}`,
          borderRadius: 8,
          color: errorType === 'pending' ? '#fbbf24' : '#ef4444',
          fontSize: '0.8rem',
          marginBottom: 18,
          lineHeight: 1.5,
          display: 'flex',
          gap: 10,
          alignItems: 'flex-start',
        }}>
          <span style={{ fontSize: '1rem', flexShrink: 0 }}>
            {errorType === 'pending' ? '⏳' : '⚠️'}
          </span>
          <span>{error}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        
        {/* Passcode Mode */}
        {mode === 'passcode' && (
          <div>
            <label className="auth-label">Workspace Access Key</label>
            <div className="auth-input-wrap">
              <input
                className="auth-input has-icon"
                type={showPass ? 'text' : 'password'}
                required
                placeholder="Enter workspace key (e.g. agentclamp-2026)"
                value={passcode}
                onChange={e => setPasscode(e.target.value)}
                autoFocus
                autoComplete="off"
              />
              <button
                type="button"
                className="auth-input-icon"
                onClick={() => setShowPass(p => !p)}
                tabIndex={-1}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
              <KeyRound size={12} color="#f97316" />
              <span style={{ fontSize: '0.72rem', color: '#6b7280' }}>
                Only authorized individuals with the secret key can access this portal.
              </span>
            </div>
          </div>
        )}

        {/* Signup Mode */}
        {mode === 'signup' && (
          <div>
            <label className="auth-label">Full Name</label>
            <input
              className="auth-input"
              type="text"
              required
              placeholder="Your full name"
              value={name}
              onChange={e => setName(e.target.value)}
              autoComplete="name"
            />
          </div>
        )}

        {/* Email/Password for Login & Signup */}
        {mode !== 'passcode' && (
          <>
            <div>
              <label className="auth-label">Email Address</label>
              <input
                className="auth-input"
                type="email"
                required
                placeholder="operator@company.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            <div>
              <label className="auth-label">Password</label>
              <div className="auth-input-wrap">
                <input
                  className="auth-input has-icon"
                  type={showPass ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  minLength={mode === 'signup' ? 8 : undefined}
                />
                <button
                  type="button"
                  className="auth-input-icon"
                  onClick={() => setShowPass(p => !p)}
                  tabIndex={-1}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </>
        )}

        {mode === 'signup' && (
          <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: '0.78rem', color: '#6b7280', cursor: 'pointer' }}>
            <input
              type="checkbox"
              required
              checked={agreed}
              onChange={e => setAgreed(e.target.checked)}
              style={{ marginTop: 2, accentColor: '#f97316', flexShrink: 0 }}
            />
            <span>
              I agree to the{' '}
              <span style={{ color: '#f97316' }}>Terms of Service</span>
              {' '}and automated safety audit logging.
            </span>
          </label>
        )}

        <button type="submit" className="auth-btn-primary" disabled={loading} style={{ marginTop: 6 }}>
          {loading ? (
            <>
              <span style={{
                width: 16, height: 16, borderRadius: '50%',
                border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff',
                animation: 'spin 0.7s linear infinite', display: 'inline-block', flexShrink: 0,
              }} />
              Verifying Access…
            </>
          ) : (
            <>
              {mode === 'passcode' ? 'Unlock Workspace' : mode === 'login' ? 'Sign In' : 'Submit Access Request'}
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </form>

      {/* Footer note */}
      <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <Lock size={12} color="#374151" />
        <span style={{ fontSize: '0.72rem', color: '#374151' }}>
          Zero-trust authenticated session · 256-bit encryption
        </span>
      </div>
    </div>
  )
}

/* ─── Main Login Page ────────────────────────────────────────── */
export default function LoginPage() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="auth-page">

        {/* ── Ambient background blobs ─── */}
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-10%', left: '-5%', width: 700, height: 700, background: 'radial-gradient(circle, rgba(249,115,22,0.07) 0%, transparent 65%)', filter: 'blur(60px)', animation: 'blob-drift 22s ease-in-out infinite' }} />
          <div style={{ position: 'absolute', bottom: '-10%', right: '-5%', width: 600, height: 600, background: 'radial-gradient(circle, rgba(6,182,212,0.05) 0%, transparent 65%)', filter: 'blur(60px)', animation: 'blob-drift 28s ease-in-out infinite reverse' }} />
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.02) 1px, transparent 0)', backgroundSize: '28px 28px' }} />
        </div>

        {/* ── Left branding panel ─────────────────── */}
        <div className="auth-left" style={{ zIndex: 1 }}>

          {/* Logo */}
          <div style={{ marginBottom: 40 }}>
            <Link href="/" style={{ textDecoration: 'none' }}>
              <Logo size={40} />
            </Link>
          </div>

          {/* Hero text */}
          <div style={{ maxWidth: 440, marginBottom: 36 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '4px 12px', borderRadius: 20,
              background: 'rgba(249,115,22,0.08)',
              border: '1px solid rgba(249,115,22,0.2)',
              fontSize: '0.72rem', fontWeight: 700, color: '#f97316',
              marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.8px',
            }}>
              <Zap size={11} /> Enterprise AI Security
            </div>
            <h2 style={{
              fontSize: '2rem', fontWeight: 900, lineHeight: 1.2,
              letterSpacing: '-1px', color: '#f8fafc', marginBottom: 12,
            }}>
              Enterprise-Grade AI Guardrails & Governance.
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#64748b', lineHeight: 1.65 }}>
              Protect LLM workflows against prompt injections, PII leakage, and compliance breaches in real time.
            </p>
          </div>

          {/* Feature list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 440, marginBottom: 36 }}>
            {FEATURES.map((f, i) => (
              <div key={i} className="auth-feature-pill">
                <div style={{
                  width: 30, height: 30, borderRadius: 8,
                  background: 'rgba(255,255,255,0.04)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {f.icon}
                </div>
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#e2e8f0' }}>{f.label}</div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{f.sub}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Stats row */}
          <div style={{ display: 'flex', gap: 10, maxWidth: 440 }}>
            {STATS.map((s, i) => (
              <div key={i} className="auth-stat">
                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#f97316', letterSpacing: '-0.5px' }}>
                  {s.value}
                </div>
                <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: 2, fontWeight: 500 }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right form panel ────────────────────── */}
        <div className="auth-right" style={{ zIndex: 1 }}>
          <Suspense fallback={
            <div style={{ color: '#4b5563', fontSize: '0.8rem' }}>Loading workspace access…</div>
          }>
            <LoginForm />
          </Suspense>
        </div>

      </div>
    </>
  )
}
