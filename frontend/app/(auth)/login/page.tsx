'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import { setAuth, isAuthenticated } from '@/lib/auth'
import {
  ShieldCheck, Zap, Bot, BarChart3, Eye, EyeOff,
  ArrowRight, Lock, Scale, CheckCircle2,
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
  @keyframes gradient-pan {
    0%   { background-position: 0% 50%; }
    50%  { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
  @keyframes pulse-ring {
    0%   { box-shadow: 0 0 0 0 rgba(249,115,22,0.35); }
    70%  { box-shadow: 0 0 0 10px rgba(249,115,22,0); }
    100% { box-shadow: 0 0 0 0 rgba(249,115,22,0); }
  }
  @keyframes shimmer {
    0%   { background-position: -200% center; }
    100% { background-position: 200% center; }
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
    font-size: 0.875rem;
    font-weight: 600;
    color: #4b5563;
    cursor: pointer;
    transition: color 0.2s;
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
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 10px;
    padding: 12px 16px;
    font-size: 0.875rem;
    color: #f8fafc;
    font-family: inherit;
    outline: none;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .auth-input::placeholder { color: #374151; }
  .auth-input:focus {
    border-color: #f97316;
    box-shadow: 0 0 0 3px rgba(249,115,22,0.12);
  }
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
    transition: color 0.2s;
  }
  .auth-input-icon:hover { color: #9ca3af; }

  .auth-btn-primary {
    width: 100%;
    padding: 13px;
    background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
    color: #fff;
    border: none;
    border-radius: 10px;
    font-family: inherit;
    font-size: 0.9rem;
    font-weight: 700;
    cursor: pointer;
    position: relative;
    overflow: hidden;
    transition: transform 0.2s, box-shadow 0.2s, opacity 0.2s;
    box-shadow: 0 4px 20px rgba(249,115,22,0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }
  .auth-btn-primary:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 30px rgba(249,115,22,0.45);
  }
  .auth-btn-primary:active:not(:disabled) { transform: translateY(0); }
  .auth-btn-primary:disabled { opacity: 0.65; cursor: not-allowed; }
  .auth-btn-primary::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(255,255,255,0.18) 0%, transparent 60%);
    opacity: 0;
    transition: opacity 0.2s;
  }
  .auth-btn-primary:hover::before { opacity: 1; }

  .auth-label {
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #4b5563;
    display: block;
    margin-bottom: 8px;
  }

  .auth-error {
    padding: 10px 14px;
    background: rgba(239,68,68,0.1);
    border: 1px solid rgba(239,68,68,0.3);
    border-radius: 8px;
    color: #ef4444;
    font-size: 0.78rem;
    line-height: 1.5;
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

  /* Stat badge */
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

  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errorType, setErrorType] = useState<'error' | 'pending'>('error')
  // After signup — show "request submitted" panel
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
      const data = mode === 'login'
        ? await api.auth.login({ email, password })
        : await api.auth.signup({ full_name: name, email, password })

      if (mode === 'signup' && data.status === 'pending') {
        // Show "request submitted" success panel — no redirect
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

  const switchMode = (next: 'login' | 'signup') => {
    setMode(next)
    setError(null)
    setPendingUser(null)
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

        {/* Status timeline */}
        <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
          {[
            { done: true,  label: 'Request submitted',         sub: 'Your details have been recorded' },
            { done: false, label: 'Admin review',              sub: 'An administrator will review your request' },
            { done: false, label: 'Access granted',            sub: 'You\'ll be able to sign in once approved' },
          ].map((step, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{
                width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                background: step.done ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.05)',
                border: `1.5px solid ${step.done ? 'rgba(34,197,94,0.5)' : 'rgba(255,255,255,0.1)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginTop: 2,
              }}>
                {step.done
                  ? <CheckCircle2 size={13} color="#22c55e" />
                  : <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'block' }} />
                }
              </div>
              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: step.done ? '#f8fafc' : '#6b7280' }}>
                  {step.label}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#4b5563', marginTop: 2 }}>{step.sub}</div>
              </div>
            </div>
          ))}
        </div>

        <button
          className="auth-btn-primary"
          onClick={() => switchMode('login')}
          style={{ marginBottom: 12 }}
        >
          Back to Sign In <ArrowRight size={16} />
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
      <h1 style={{ fontSize: '1.55rem', fontWeight: 900, letterSpacing: '-0.5px', marginBottom: 4 }}>
        {mode === 'login' ? 'Welcome back' : 'Request Access'}
      </h1>
      <p style={{ fontSize: '0.82rem', color: '#6b7280', marginBottom: 28 }}>
        {mode === 'login'
          ? 'Sign in to your AgentClamp workspace.'
          : 'Submit your details — an admin will review and approve your access.'}
      </p>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: 28, gap: 4 }}>
        <button className={`auth-tab ${mode === 'login' ? 'active' : ''}`} onClick={() => switchMode('login')}>
          Sign In
        </button>
        <button className={`auth-tab ${mode === 'signup' ? 'active' : ''}`} onClick={() => switchMode('signup')}>
          Request Access
        </button>
      </div>

      {/* Error / Pending notice */}
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <label className="auth-label" style={{ margin: 0 }}>Password</label>
            {mode === 'login' && (
              <span style={{ fontSize: '0.72rem', color: '#f97316', cursor: 'pointer', fontWeight: 600 }}>
                Forgot password?
              </span>
            )}
          </div>
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
              aria-label={showPass ? 'Hide password' : 'Show password'}
            >
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {mode === 'signup' && (
            <p style={{ fontSize: '0.68rem', color: '#374151', marginTop: 6 }}>Minimum 8 characters</p>
          )}
        </div>

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
              <span style={{ color: '#f97316', cursor: 'pointer' }}>Terms of Service</span>
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
              {mode === 'login' ? 'Signing In…' : 'Submitting Request…'}
            </>
          ) : (
            <>
              {mode === 'login' ? 'Sign In' : 'Submit Access Request'}
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </form>

      {/* Switch mode */}
      <p style={{ textAlign: 'center', marginTop: 24, fontSize: '0.8rem', color: '#6b7280' }}>
        {mode === 'login' ? (
          <>Need access?{' '}
            <span onClick={() => switchMode('signup')} style={{ color: '#f97316', cursor: 'pointer', fontWeight: 700 }}>
              Request account
            </span>
          </>
        ) : (
          <>Already have access?{' '}
            <span onClick={() => switchMode('login')} style={{ color: '#f97316', cursor: 'pointer', fontWeight: 700 }}>
              Sign in
            </span>
          </>
        )}
      </p>

      {/* Footer note */}
      <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <Lock size={12} color="#374151" />
        <span style={{ fontSize: '0.72rem', color: '#374151' }}>
          End-to-end encrypted · SOC 2 Type II
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

          {/* Headline */}
          <div style={{ marginBottom: 32 }}>
            <span style={{
              fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '1.4px', color: '#f97316', display: 'block', marginBottom: 10,
            }}>
              Enterprise AI Governance
            </span>
            <h2 style={{
              fontSize: 'clamp(1.6rem, 2.8vw, 2.4rem)',
              fontWeight: 900,
              letterSpacing: '-0.04em',
              lineHeight: 1.15,
              marginBottom: 12,
            }}>
              Orchestrate, Observe &{' '}
              <span style={{
                background: 'linear-gradient(135deg, #fbbf24 0%, #f97316 45%, #06b6d4 100%)',
                backgroundSize: '200% auto',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                animation: 'gradient-pan 4s linear infinite',
                display: 'inline-block',
              }}>
                Govern AI Agents
              </span>{' '}
              with Confidence
            </h2>
            <p style={{ fontSize: '0.88rem', color: '#94a3b8', lineHeight: 1.6, maxWidth: 440 }}>
              The enterprise control plane for multi-agent AI workflows — real-time guardrails,
              compliance monitoring, and deep observability in one platform.
            </p>
          </div>

          {/* Stats row */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 28 }}>
            {STATS.map(s => (
              <div key={s.label} className="auth-stat">
                <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#f97316', letterSpacing: '-0.5px' }}>
                  {s.value}
                </div>
                <div style={{ fontSize: '0.65rem', color: '#6b7280', marginTop: 2, fontWeight: 600 }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>

          {/* Feature pills */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 460 }}>
            {FEATURES.map(f => (
              <div key={f.label} className="auth-feature-pill">
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: 'rgba(249,115,22,0.1)',
                  border: '1px solid rgba(249,115,22,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {f.icon}
                </div>
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f8fafc' }}>{f.label}</div>
                  <div style={{ fontSize: '0.7rem', color: '#6b7280', marginTop: 1 }}>{f.sub}</div>
                </div>
                <CheckCircle2 size={14} color="#22c55e" style={{ marginLeft: 'auto', flexShrink: 0 }} />
              </div>
            ))}
          </div>

          {/* Bottom badge */}
          <div style={{ marginTop: 36, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', gap: -6 }}>
              {['#f97316','#06b6d4','#a855f7','#22c55e'].map((c, i) => (
                <div key={c} style={{
                  width: 24, height: 24, borderRadius: '50%', background: c,
                  border: '2px solid #050508', marginLeft: i === 0 ? 0 : -8,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.55rem', color: '#fff', fontWeight: 800,
                }}>
                  {['AI','🔒','📊','✓'][i]}
                </div>
              ))}
            </div>
            <span style={{ fontSize: '0.72rem', color: '#6b7280' }}>
              Trusted by security-conscious teams building enterprise AI
            </span>
          </div>
        </div>

        {/* ── Right form panel ────────────────────────────────── */}
        <div className="auth-right" style={{ zIndex: 1 }}>
          <Suspense fallback={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid rgba(249,115,22,0.3)', borderTopColor: '#f97316', animation: 'spin 0.8s linear infinite' }} />
            </div>
          }>
            <LoginForm />
          </Suspense>
        </div>

      </div>
    </>
  )
}
