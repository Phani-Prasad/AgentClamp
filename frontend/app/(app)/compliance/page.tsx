'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import {
  ShieldCheck, Activity, Globe, BookOpen, Scale, AlertTriangle,
  CheckCircle2, XCircle, Clock, ChevronRight, Download, RefreshCw,
  Shield, Lock, Eye, Database, Cpu, FileText, Users, Zap
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────

interface ControlResult {
  id: string
  title: string
  status: 'pass' | 'fail' | 'partial'
  evidence: string
}

interface FrameworkScore {
  score: number
  passed: number
  total: number
  controls: ControlResult[]
}

interface AgentMatrixItem {
  id: string
  name: string
  model: string
  provider: string
  has_guardrails: boolean
  has_hitl: boolean
  has_pii_masking: boolean
  has_prompt_injection: boolean
  risk_tier: string
  status: 'compliant' | 'warning' | 'non_compliant'
  missing_controls: string[]
}

interface DashboardData {
  overall_score: number
  last_updated: string
  summary: {
    total_agents: number
    agents_with_guardrails: number
    agents_with_hitl: number
    active_policies: number
    audit_log_entries: number
    agents_risk_classified: number
  }
  frameworks: {
    nist_ai_rmf: FrameworkScore
    iso_42001: FrameworkScore
    iso_23894: FrameworkScore
    eu_ai_act: FrameworkScore
  }
  agent_matrix?: AgentMatrixItem[]
}

type Tab = 'overview' | 'nist' | 'iso_42001' | 'iso_23894' | 'eu_ai_act'

const isTab = (t: string): t is Tab => ['overview', 'nist', 'iso_42001', 'iso_23894', 'eu_ai_act'].includes(t)

// ── Helpers ──────────────────────────────────────────────────────

function scoreColor(score: number) {
  if (score >= 80) return '#10b981'
  if (score >= 60) return '#f59e0b'
  if (score >= 40) return '#f97316'
  return '#ef4444'
}

function scoreLabel(score: number) {
  if (score >= 80) return 'Compliant'
  if (score >= 60) return 'Partially Compliant'
  if (score >= 40) return 'Needs Attention'
  return 'Non-Compliant'
}

function StatusBadge({ status }: { status: 'pass' | 'fail' | 'partial' }) {
  const styles = {
    pass: { bg: 'rgba(16,185,129,0.15)', color: '#10b981', label: 'Pass', Icon: CheckCircle2 },
    fail: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444', label: 'Fail', Icon: XCircle },
    partial: { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b', label: 'Partial', Icon: Clock },
  }
  const s = styles[status]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: s.bg, color: s.color, borderRadius: 20,
      padding: '2px 10px', fontSize: '0.72rem', fontWeight: 700,
    }}>
      <s.Icon size={11} />
      {s.label}
    </span>
  )
}

function RadialGauge({ score, size = 120 }: { score: number; size?: number }) {
  const r = (size / 2) - 12
  const circ = 2 * Math.PI * r
  const filled = (score / 100) * circ
  const color = scoreColor(score)
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={10} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={10}
        strokeDasharray={`${filled} ${circ - filled}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 1s ease' }}
      />
    </svg>
  )
}

function FrameworkCard({ label, id, score, passed, total, active, onClick, icon: Icon, color }: {
  label: string; id: string; score: number; passed: number; total: number
  active: boolean; onClick: () => void; icon: React.ElementType; color: string
}) {
  return (
    <button onClick={onClick} style={{
      background: active ? `rgba(${color}, 0.12)` : 'var(--surface-1)',
      border: `1.5px solid ${active ? `rgba(${color}, 0.5)` : 'var(--border-subtle)'}`,
      borderRadius: 16, padding: '20px', cursor: 'pointer', textAlign: 'left',
      transition: 'all 0.25s', width: '100%',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10, display: 'flex', alignItems: 'center',
          justifyContent: 'center', background: `rgba(${color}, 0.15)`,
        }}>
          <Icon size={18} color={`rgb(${color})`} />
        </div>
        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>{label}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: '2rem', fontWeight: 800, color: scoreColor(score), lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: 3 }}>/ 100</span>
      </div>
      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: 10 }}>
        {passed} / {total} controls passed
      </div>
      <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 99, height: 4, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${score}%`, background: scoreColor(score),
          borderRadius: 99, transition: 'width 1s ease',
        }} />
      </div>
    </button>
  )
}

function ControlsTable({ controls }: { controls: ControlResult[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {controls.map(c => (
        <div key={c.id} style={{
          background: 'var(--surface-1)', border: '1px solid var(--border-subtle)',
          borderRadius: 12, padding: '14px 18px',
          display: 'grid', gridTemplateColumns: '80px 1fr auto', gap: 14, alignItems: 'center',
        }}>
          <span style={{
            fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)',
            background: 'rgba(255,255,255,0.06)', padding: '3px 8px', borderRadius: 6,
            fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'nowrap',
          }}>{c.id}</span>
          <div>
            <div style={{ fontSize: '0.83rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{c.title}</div>
            <div style={{ fontSize: '0.73rem', color: 'var(--text-secondary)' }}>{c.evidence}</div>
          </div>
          <StatusBadge status={c.status} />
        </div>
      ))}
    </div>
  )
}

function AgentMatrixTable({ agents }: { agents: AgentMatrixItem[] }) {
  const getTierBadge = (tier: string) => {
    switch (tier.toLowerCase()) {
      case 'unacceptable':
        return { bg: 'rgba(239,68,68,0.15)', color: '#ef4444', label: 'Unacceptable' }
      case 'high':
        return { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b', label: 'High Risk' }
      case 'limited':
        return { bg: 'rgba(99,102,241,0.15)', color: '#6366f1', label: 'Limited' }
      case 'minimal':
        return { bg: 'rgba(16,185,129,0.15)', color: '#10b981', label: 'Minimal' }
      default:
        return { bg: 'rgba(255,255,255,0.08)', color: 'var(--text-secondary)', label: 'Unclassified' }
    }
  }

  const getStatusBadge = (status: 'compliant' | 'warning' | 'non_compliant') => {
    switch (status) {
      case 'compliant':
        return { bg: 'rgba(16,185,129,0.15)', color: '#10b981', label: 'Compliant', Icon: CheckCircle2 }
      case 'warning':
        return { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b', label: 'Action Needed', Icon: AlertTriangle }
      case 'non_compliant':
        return { bg: 'rgba(239,68,68,0.15)', color: '#ef4444', label: 'Non-Compliant', Icon: XCircle }
    }
  }

  return (
    <div style={{
      background: 'var(--surface-1)', border: '1px solid var(--border-subtle)',
      borderRadius: 16, overflow: 'hidden',
    }}>
      <div style={{
        padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            🤖 Agent-by-Agent Compliance Matrix
          </h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '3px 0 0' }}>
            Live assessment of individual agent guardrails, oversight controls, and risk tiers
          </p>
        </div>
        <a href="/agents" style={{
          fontSize: '0.75rem', color: '#6366f1', textDecoration: 'none', fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          Manage Agents &rarr;
        </a>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <th style={{ padding: '12px 18px' }}>Agent</th>
              <th style={{ padding: '12px 14px' }}>Risk Tier</th>
              <th style={{ padding: '12px 14px' }}>Guardrails</th>
              <th style={{ padding: '12px 14px' }}>Human Oversight (HITL)</th>
              <th style={{ padding: '12px 14px' }}>Compliance Status</th>
              <th style={{ padding: '12px 18px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {agents.map((ag) => {
              const tb = getTierBadge(ag.risk_tier)
              const sb = getStatusBadge(ag.status)
              return (
                <tr key={ag.id} style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.2s' }}>
                  <td style={{ padding: '14px 18px' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 3 }}>
                      {ag.name}
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono, monospace' }}>
                        {ag.model || 'Default Model'}
                      </span>
                      {ag.provider && (
                        <span style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.06)', padding: '1px 6px', borderRadius: 4, color: 'var(--text-secondary)' }}>
                          {ag.provider}
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '14px 14px' }}>
                    <span style={{
                      background: tb.bg, color: tb.color, padding: '3px 8px', borderRadius: 6,
                      fontSize: '0.72rem', fontWeight: 600, display: 'inline-block',
                    }}>
                      {tb.label}
                    </span>
                  </td>
                  <td style={{ padding: '14px 14px' }}>
                    {ag.has_guardrails ? (
                      <div>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#10b981', fontWeight: 600, fontSize: '0.75rem' }}>
                          <CheckCircle2 size={13} /> Active
                        </span>
                        <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                          {ag.has_pii_masking && (
                            <span style={{ fontSize: '0.65rem', background: 'rgba(99,102,241,0.15)', color: '#818cf8', padding: '1px 5px', borderRadius: 4 }}>
                              PII Mask
                            </span>
                          )}
                          {ag.has_prompt_injection && (
                            <span style={{ fontSize: '0.65rem', background: 'rgba(245,158,11,0.15)', color: '#fbbf24', padding: '1px 5px', borderRadius: 4 }}>
                              Anti-Injection
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#ef4444', fontWeight: 600, fontSize: '0.75rem' }}>
                        <XCircle size={13} /> Missing
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '14px 14px' }}>
                    {ag.has_hitl ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#10b981', fontWeight: 600, fontSize: '0.75rem' }}>
                        <CheckCircle2 size={13} /> Enabled
                      </span>
                    ) : (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#f59e0b', fontWeight: 600, fontSize: '0.75rem' }}>
                        <XCircle size={13} /> Disabled
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '14px 14px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: sb.bg, color: sb.color, padding: '3px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700 }}>
                      <sb.Icon size={12} />
                      {sb.label}
                    </div>
                    {ag.missing_controls.length > 0 && (
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                        {ag.missing_controls.join(' · ')}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                    <a
                      href={`/agents/${ag.id}`}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '5px 12px', borderRadius: 8, fontSize: '0.72rem', fontWeight: 600,
                        background: 'rgba(99,102,241,0.15)', color: '#818cf8', textDecoration: 'none',
                        transition: 'background 0.2s',
                      }}
                    >
                      Configure
                    </a>
                  </td>
                </tr>
              )
            })}
            {agents.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No agents created yet. Create an agent in the Agents tab to assess compliance.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── EU AI Act Risk Tier Section ──────────────────────────────────

const RISK_TIERS = [
  {
    tier: 'unacceptable', label: 'Unacceptable Risk', color: '#ef4444',
    description: 'AI systems posing unacceptable risk. PROHIBITED by EU law.',
    examples: ['Social scoring by governments', 'Real-time biometric mass surveillance', 'AI exploiting psychological vulnerabilities'],
    icon: AlertTriangle,
  },
  {
    tier: 'high', label: 'High Risk', color: '#f59e0b',
    description: 'Significant potential impact. Strict obligations including HITL, logging, transparency.',
    examples: ['HR / Recruitment tools', 'Credit scoring & loan decisions', 'Medical diagnosis AI', 'Law enforcement tools'],
    icon: Shield,
  },
  {
    tier: 'limited', label: 'Limited Risk', color: '#6366f1',
    description: 'Specific transparency obligations. Must disclose AI interaction to users.',
    examples: ['Customer chatbots', 'Deepfake generators', 'Emotion recognition systems'],
    icon: Eye,
  },
  {
    tier: 'minimal', label: 'Minimal Risk', color: '#10b981',
    description: 'No specific obligations. Most general AI tools fall here.',
    examples: ['Spam filters', 'AI in video games', 'Productivity assistants'],
    icon: CheckCircle2,
  },
]

const MANDATORY_CONTROLS = [
  { id: 'Art. 10', title: 'Data & Data Governance', icon: Database, description: 'Training data must meet quality criteria and be free from discriminatory patterns.' },
  { id: 'Art. 11', title: 'Technical Documentation', icon: FileText, description: 'Comprehensive technical documentation must be maintained before market deployment.' },
  { id: 'Art. 12', title: 'Logging & Traceability', icon: Activity, description: 'Automatic logging of events for post-market monitoring and incident investigation.' },
  { id: 'Art. 13', title: 'Transparency & Info', icon: Eye, description: 'AI systems must be transparent and provide adequate information to deployers and users.' },
  { id: 'Art. 14', title: 'Human Oversight', icon: Users, description: 'High-risk AI must be designed to be effectively overseen by natural persons.' },
  { id: 'Art. 15', title: 'Accuracy & Robustness', icon: Cpu, description: 'High-risk AI must achieve appropriate levels of accuracy, robustness and cybersecurity.' },
]

// ── NIST AI RMF Section ──────────────────────────────────────────

const NIST_PILLARS = [
  { id: 'GOVERN', color: '#6366f1', icon: Scale, description: 'Cultivate a culture of risk awareness. Establish AI policies, roles, and accountability structures.' },
  { id: 'MAP', color: '#f59e0b', icon: Globe, description: 'Categorize and contextualize AI risks. Identify threats, biases, and system vulnerabilities.' },
  { id: 'MEASURE', color: '#10b981', icon: Activity, description: 'Analyze, assess, and track AI risks using quantifiable metrics like hallucination rate and bias scores.' },
  { id: 'MANAGE', color: '#ef4444', icon: Shield, description: 'Prioritize and address risks. Implement HITL, incident response, and continuous improvement plans.' },
]

// ── Main Page ────────────────────────────────────────────────────

export default function CompliancePage() {
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboard = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.compliance.dashboard()
      setData(res)
    } catch {
      setError('Cannot connect to backend. Is it running?')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchDashboard() }, [])

  const handleExport = async () => {
    try {
      const res = await api.compliance.report()
      const blob = new Blob([JSON.stringify(res, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `agentclamp-compliance-report-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch { alert('Export failed') }
  }

  const overallScore = data?.overall_score ?? 0

  return (
    <div style={{ padding: '32px 36px', maxWidth: 1200, margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center',
              justifyContent: 'center', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              boxShadow: '0 0 20px rgba(99,102,241,0.4)',
            }}>
              <ShieldCheck size={22} color="#fff" />
            </div>
            <div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Compliance Hub
              </h1>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
                Enterprise AI Governance · NIST AI RMF · ISO 42001 · ISO 23894 · EU AI Act
              </p>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={fetchDashboard} disabled={loading} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px',
            background: 'var(--surface-1)', border: '1px solid var(--border-subtle)',
            borderRadius: 10, color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.82rem',
          }}>
            <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            Refresh
          </button>
          <button onClick={handleExport} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            border: 'none', borderRadius: 10, color: '#fff', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600,
          }}>
            <Download size={14} />
            Export Report
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: '14px 18px', marginBottom: 24, color: '#f87171', fontSize: '0.85rem' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Overall Score Banner */}
      {data && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.08))',
          border: '1px solid rgba(99,102,241,0.25)', borderRadius: 20, padding: '28px 32px',
          display: 'flex', alignItems: 'center', gap: 32, marginBottom: 32,
        }}>
          <div style={{ position: 'relative', width: 120, height: 120 }}>
            <RadialGauge score={overallScore} size={120} />
            <div style={{
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: scoreColor(overallScore), lineHeight: 1 }}>{overallScore}</div>
              <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>/ 100</div>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
              Overall Compliance: <span style={{ color: scoreColor(overallScore) }}>{scoreLabel(overallScore)}</span>
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 14 }}>
              Across NIST AI RMF · ISO 42001 · ISO 23894 · EU AI Act • Last updated: {new Date(data.last_updated).toLocaleString()}
            </div>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              {[
                { label: 'Total Agents', value: data.summary.total_agents, icon: Cpu },
                { label: 'With Guardrails', value: data.summary.agents_with_guardrails, icon: Shield },
                { label: 'HITL Enabled', value: data.summary.agents_with_hitl, icon: Users },
                { label: 'Active Policies', value: data.summary.active_policies, icon: Scale },
                { label: 'Audit Logs', value: data.summary.audit_log_entries, icon: Activity },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon size={14} color="var(--text-secondary)" />
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{label}:</span>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)' }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24, background: 'var(--surface-1)', padding: 5, borderRadius: 14, border: '1px solid var(--border-subtle)', width: 'fit-content' }}>
        {[
          { id: 'overview', label: 'Overview', icon: ShieldCheck },
          { id: 'eu_ai_act', label: '🇪🇺 EU AI Act', icon: Globe },
          { id: 'nist', label: '🏛️ NIST AI RMF', icon: Scale },
          { id: 'iso_42001', label: '📋 ISO 42001', icon: BookOpen },
          { id: 'iso_23894', label: '🛡️ ISO 23894', icon: Lock },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as Tab)} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
            background: activeTab === tab.id ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'transparent',
            border: 'none', borderRadius: 10, color: activeTab === tab.id ? '#fff' : 'var(--text-secondary)',
            cursor: 'pointer', fontSize: '0.8rem', fontWeight: activeTab === tab.id ? 700 : 500,
            transition: 'all 0.2s', whiteSpace: 'nowrap',
          }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ─────────────────────────────────────────── */}
      {activeTab === ('overview' as Tab) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
              {[1, 2, 3, 4].map(i => (
                <div key={i} style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', borderRadius: 16, padding: 20, height: 140, animation: 'pulse 1.5s infinite' }} />
              ))}
            </div>
          ) : data ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                <FrameworkCard
                  label="NIST AI RMF" id="nist" icon={Scale} color="99,102,241"
                  score={data.frameworks.nist_ai_rmf.score}
                  passed={data.frameworks.nist_ai_rmf.passed}
                  total={data.frameworks.nist_ai_rmf.total}
                  active={activeTab === 'nist'} onClick={() => setActiveTab('nist')}
                />
                <FrameworkCard
                  label="ISO 42001 — AIMS" id="iso_42001" icon={BookOpen} color="16,185,129"
                  score={data.frameworks.iso_42001.score}
                  passed={data.frameworks.iso_42001.passed}
                  total={data.frameworks.iso_42001.total}
                  active={activeTab === 'iso_42001'} onClick={() => setActiveTab('iso_42001')}
                />
                <FrameworkCard
                  label="ISO 23894 — AI Risk" id="iso_23894" icon={Lock} color="249,115,22"
                  score={data.frameworks.iso_23894.score}
                  passed={data.frameworks.iso_23894.passed}
                  total={data.frameworks.iso_23894.total}
                  active={activeTab === 'iso_23894'} onClick={() => setActiveTab('iso_23894')}
                />
                <FrameworkCard
                  label="EU AI Act 2024" id="eu_ai_act" icon={Globe} color="99,102,241"
                  score={data.frameworks.eu_ai_act.score}
                  passed={data.frameworks.eu_ai_act.passed}
                  total={data.frameworks.eu_ai_act.total}
                  active={activeTab === 'eu_ai_act'} onClick={() => setActiveTab('eu_ai_act')}
                />
              </div>

              {/* Agent-by-Agent Compliance Matrix */}
              {data.agent_matrix && (
                <AgentMatrixTable agents={data.agent_matrix} />
              )}
            </>
          ) : null}
        </div>
      )}

      {/* ── EU AI ACT TAB ─────────────────────────────────────────── */}
      {activeTab === ('eu_ai_act' as Tab) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          {/* Risk Tier Matrix */}
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14 }}>
              🇪🇺 Risk Classification Matrix
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
              {RISK_TIERS.map(t => (
                <div key={t.tier} style={{
                  background: `linear-gradient(160deg, rgba(${t.color === '#ef4444' ? '239,68,68' : t.color === '#f59e0b' ? '245,158,11' : t.color === '#6366f1' ? '99,102,241' : '16,185,129'},0.1) 0%, var(--surface-1) 100%)`,
                  border: `1.5px solid ${t.color}33`,
                  borderRadius: 16, padding: 20,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <t.icon size={18} color={t.color} />
                    <span style={{ fontWeight: 700, fontSize: '0.85rem', color: t.color }}>{t.label}</span>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 12, lineHeight: 1.5 }}>{t.description}</p>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                    {t.examples.map(e => (
                      <div key={e} style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                        <ChevronRight size={10} color={t.color} />
                        {e}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mandatory Controls */}
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14 }}>
              ⚖️ Mandatory Controls (High-Risk AI)
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {MANDATORY_CONTROLS.map(c => (
                <div key={c.id} style={{
                  background: 'var(--surface-1)', border: '1px solid var(--border-subtle)',
                  borderRadius: 14, padding: 16,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8, background: 'rgba(99,102,241,0.15)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <c.icon size={16} color="#6366f1" />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono, monospace' }}>{c.id}</div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>{c.title}</div>
                    </div>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>{c.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Live Controls */}
          {data && (
            <div>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14 }}>
                ✅ Live Control Assessment
              </h2>
              <ControlsTable controls={data.frameworks.eu_ai_act.controls} />
            </div>
          )}
        </div>
      )}

      {/* ── NIST TAB ───────────────────────────────────────────────── */}
      {activeTab === ('nist' as Tab) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
            {NIST_PILLARS.map(p => (
              <div key={p.id} style={{
                background: `linear-gradient(160deg, rgba(${p.color === '#6366f1' ? '99,102,241' : p.color === '#f59e0b' ? '245,158,11' : p.color === '#10b981' ? '16,185,129' : '239,68,68'},0.1) 0%, var(--surface-1) 100%)`,
                border: `1.5px solid ${p.color}44`, borderRadius: 16, padding: 20,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: `${p.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <p.icon size={18} color={p.color} />
                  </div>
                  <span style={{ fontSize: '1.1rem', fontWeight: 800, color: p.color }}>{p.id}</span>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>{p.description}</p>
              </div>
            ))}
          </div>
          {data && (
            <div>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14 }}>
                🏛️ NIST AI RMF — Live Control Assessment
              </h2>
              <ControlsTable controls={data.frameworks.nist_ai_rmf.controls} />
            </div>
          )}
        </div>
      )}

      {/* ── ISO 42001 TAB ─────────────────────────────────────────── */}
      {activeTab === ('iso_42001' as Tab) && (
        <div>
          <div style={{
            background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(16,185,129,0.05))',
            border: '1px solid rgba(16,185,129,0.25)', borderRadius: 16, padding: '20px 24px', marginBottom: 24,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <BookOpen size={20} color="#10b981" />
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>ISO/IEC 42001:2023 — AI Management System</h2>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
              International standard specifying requirements for establishing, implementing, maintaining and continually improving an Artificial Intelligence Management System (AIMS).
            </p>
          </div>
          {data && <ControlsTable controls={data.frameworks.iso_42001.controls} />}
        </div>
      )}

      {/* ── ISO 23894 TAB ─────────────────────────────────────────── */}
      {activeTab === ('iso_23894' as Tab) && (
        <div>
          <div style={{
            background: 'linear-gradient(135deg, rgba(249,115,22,0.1), rgba(249,115,22,0.05))',
            border: '1px solid rgba(249,115,22,0.25)', borderRadius: 16, padding: '20px 24px', marginBottom: 24,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <Lock size={20} color="#f97316" />
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>ISO/IEC 23894:2023 — AI Risk Management</h2>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
              Guidance on how organizations that develop, produce, deploy or use AI can manage risks specifically related to AI.
            </p>
          </div>
          {data && <ControlsTable controls={data.frameworks.iso_23894.controls} />}
        </div>
      )}

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
