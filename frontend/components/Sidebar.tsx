'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { getUser, logout } from '@/lib/auth'

import { 
  LayoutDashboard, 
  Zap, 
  Bot, 
  BookOpen, 
  Play, 
  BarChart3, 
  Telescope, 
  ShieldCheck, 
  Cpu, 
  FlaskConical,
  Sliders,
  Scale,
  LogOut
} from 'lucide-react'

const NAV = [
  { label: 'Platform', items: [
    { href: '/dashboard',      icon: <LayoutDashboard size={18} color="#a78bfa" />, label: 'Dashboard' },
    { href: '/orchestrator',   icon: <Zap size={18} color="#f97316" />, label: 'Orchestrator' },
    { href: '/agents',         icon: <Bot size={18} color="#fbbf24" />, label: 'Agents' },
    { href: '/knowledge-bases',icon: <BookOpen size={18} color="#38bdf8" />, label: 'Knowledge Bases' },
    { href: '/runs',           icon: <Play size={18} color="#34d399" />, label: 'Run History' },
  ]},
  { label: 'Observability', items: [
    { href: '/analytics',      icon: <BarChart3 size={18} color="#38bdf8" />, label: 'Insights' },
    { href: '/traces',         icon: <Telescope size={18} color="#a855f7" />, label: 'Traces' },
  ]},
  { label: 'Governance', items: [
    { href: '/governance',                icon: <ShieldCheck size={18} color="#f97316" />, label: 'Guardrails' },
    { href: '/governance/policy-builder', icon: <Sliders size={18} color="#a78bfa" />,    label: 'Policy Builder' },
    { href: '/providers',                 icon: <Cpu size={18} color="#06b6d4" />,        label: 'Providers' },
    { href: '/eval-playground',           icon: <FlaskConical size={18} color="#f43f5e" />, label: 'Eval Playground' },
    { href: '/compliance',                icon: <Scale size={18} color="#6366f1" />,       label: 'Compliance Hub' },
  ]},
]

export default function Sidebar() {
  const pathname = usePathname()
  const [user, setUser] = useState<{ full_name: string; email: string } | null>(null)

  useEffect(() => {
    setUser(getUser())
  }, [])

  const initials = user?.full_name
    ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'OP'

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon" style={{ width: 28, height: 28, background: 'transparent', boxShadow: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="28" height="28" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M75 22C60 10 32 15 22 36C12 57 17 83 38 93C54 100 75 93 80 82" stroke="#f97316" strokeWidth="14" strokeLinecap="round" />
            <rect x="60" y="44" width="32" height="18" rx="6" fill="#f97316" />
            <circle cx="48" cy="52" r="11" fill="#ffffff" />
          </svg>
        </div>
        <div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1 }}>
            <span style={{ color: '#f97316' }}>Agent</span><span style={{ color: '#ffffff' }}>Clamp</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5 }}>
            <span style={{ fontSize: '0.72rem', color: '#a0aec0', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>Govern with Confidence</span>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {NAV.map(section => (
          <div key={section.label}>
            <div className="sidebar-section-label">{section.label}</div>
            {section.items.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar-item ${pathname === item.href || pathname.startsWith(item.href + '/') ? 'active' : ''}`}
              >
                <span className="sidebar-item-icon" style={{ display: 'flex', alignItems: 'center' }}>{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* User Profile Badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '8px 10px',
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 10
        }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #f97316 0%, #d97706 100%)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.85rem',
            fontWeight: 800,
            flexShrink: 0
          }}>
            {initials}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f8fafc', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
              {user?.full_name || 'Operator'}
            </span>
            <span style={{ fontSize: '0.68rem', color: '#94a3b8', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
              {user?.email || 'operator@agentclamp.io'}
            </span>
          </div>
        </div>

        {/* Visible Logout Button */}
        <button
          onClick={() => logout()}
          type="button"
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            gap: 8, 
            color: '#f87171', 
            fontSize: '0.85rem', 
            fontWeight: 600, 
            padding: '9px 12px', 
            borderRadius: 8, 
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            cursor: 'pointer',
            width: '100%',
            transition: 'all 0.2s',
            fontFamily: 'inherit'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
            e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.4)';
            e.currentTarget.style.color = '#ffffff';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
            e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.25)';
            e.currentTarget.style.color = '#f87171';
          }}
        >
          <LogOut size={16} />
          <span>Log Out</span>
        </button>
        <div className="sidebar-version" style={{ fontSize: '0.68rem', color: '#64748b', textAlign: 'center' }}>
          AgentClamp v0.1 · Open Source
        </div>
      </div>
    </aside>
  )
}
