'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { 
  ShieldCheck, 
  RotateCcw, 
  Inbox, 
  FileText, 
  Bot, 
  CheckCircle2, 
  XCircle, 
  Pencil, 
  Check, 
  Ban, 
  Edit3,
  Sliders
} from 'lucide-react'

interface AuditLog {
  id: string
  action: string
  resource: string
  resource_id: string
  details: {
    agent_id: string
    agent_name: string
    policy: string
    policy_category?: string
    reason: string
    flagged_text: string
    action: string
    edited_output?: string
    original_output?: string
    resolved_output?: string
  }
  created_at: string
}

interface GovernanceSummary {
  total_runs: number
  total_violations: number
  total_blocked: number
  total_approved: number
  total_edited: number
  compliance_rate: number
  policy_breakdown: Record<string, number>
}

export default function GovernancePage() {
  const [summary, setSummary] = useState<GovernanceSummary | null>(null)
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [pending, setPending] = useState<any[]>([])
  const [agents, setAgents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  // Custom Option A Tab & Filtering States
  const [selectedAgentId, setSelectedAgentId] = useState<string>('all')
  const [activeTab, setActiveTab] = useState<'inbox' | 'logs' | 'policies'>('inbox')
  
  const [activeLogDetail, setActiveLogDetail] = useState<AuditLog | null>(null)
  const [selectedPending, setSelectedPending] = useState<any>(null)
  const [editText, setEditText] = useState<string>('')
  const [resolvingId, setResolvingId] = useState<string | null>(null)

  const loadData = async () => {
    try {
      const [sumData, logsData, pendingData, agentsData] = await Promise.all([
        api.analytics.governanceSummary(),
        api.analytics.auditLogs(),
        api.governance.listPending(),
        api.agents.list()
      ])
      setSummary(sumData)
      setLogs(logsData)
      setPending(pendingData)
      setAgents(agentsData)
    } catch (err) {
      console.error('Failed to load governance data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleResolve = async (runId: string, action: string, editedOutput?: string) => {
    setResolvingId(runId)
    try {
      await api.governance.resolve(runId, {
        action,
        edited_output: editedOutput
      })
      setSelectedPending(null)
      setEditText('')
      await loadData()
    } catch (err) {
      console.error('Failed to resolve governance review:', err)
    } finally {
      setResolvingId(null)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  if (loading) {
    return (
      <div className="page-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
        <div className="text-muted">Loading Governance Center…</div>
      </div>
    )
  }

  const policyLabels: Record<string, string> = {
    prompt_injection: 'Prompt Injection Prevention',
    bias_detection: 'Fairness & Bias Stereotypes',
    hallucination_check: 'Hallucination Watchdog',
    data_compliance: 'Data Secrets Compliance',
    regulatory_disclaimer: 'Regulatory Warnings'
  }

  // ── Agent-Wise Local Data Calculations ───────────────────────
  const filteredLogs = selectedAgentId === 'all'
    ? logs
    : logs.filter(l => l.details?.agent_id === selectedAgentId)

  const filteredPending = selectedAgentId === 'all'
    ? pending
    : pending.filter(p => p.agent_id === selectedAgentId)

  // Local metric computations for dynamic, instant UI feedback
  const totalRuns = summary ? (selectedAgentId === 'all' ? summary.total_runs : filteredLogs.length + filteredPending.length) : 0
  const totalBlocked = filteredLogs.filter(l => l.action === 'guardrails.block').length
  const totalResolved = filteredLogs.filter(l => l.action.startsWith('guardrails.resolve') || l.action === 'guardrails.approve' || l.action === 'guardrails.edit').length
  const totalViolations = filteredLogs.filter(l => ['guardrails.block', 'guardrails.pending_review'].includes(l.action)).length + filteredPending.length
  
  const complianceRate = totalRuns > 0 
    ? Math.round(((totalRuns - totalViolations) / totalRuns) * 100) 
    : 100

  return (
    <>
      {/* Scope Selector in Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldCheck size={24} color="var(--accent-primary)" /> Governance Center
          </h1>
          <p className="page-subtitle">Real-time safety policy compliance, threat defenses, and operator audit trails</p>
        </div>
        
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Scope:</span>
            <select
              value={selectedAgentId}
              onChange={e => {
                setSelectedAgentId(e.target.value)
                setSelectedPending(null)
                setEditText('')
              }}
              className="form-input"
              style={{ padding: '6px 12px', fontSize: '0.82rem', background: '#111', border: '1px solid #333', color: '#fff', borderRadius: 6, minWidth: 160 }}
            >
              <option value="all">All Agents</option>
              {agents.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
          <Link href="/governance/policy-builder">
            <button className="btn-primary" style={{ padding: '6px 14px', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Sliders size={14} /> Policy Builder
            </button>
          </Link>
          <button className="btn btn-secondary" style={{ borderColor: 'var(--text-muted)', padding: '6px 12px', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={loadData}>
            <RotateCcw size={14} /> Refresh Feed
          </button>
        </div>
      </div>

      <div className="page-body">
        {/* Dynamic Metric Dashboard Row */}
        {summary && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 20 }}>
            {/* Card 1: Compliance */}
            <div className="card" style={{
              background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.05) 0%, rgba(20, 20, 20, 0.4) 100%)',
              border: '1px solid rgba(34, 197, 94, 0.2)',
              position: 'relative'
            }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 600 }}>Compliance Index</div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#22c55e', margin: '8px 0' }}>{complianceRate}%</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="badge" style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', border: '1px solid rgba(34, 197, 94, 0.3)', fontSize: '0.62rem', fontWeight: 800 }}>
                  {complianceRate > 90 ? 'OPTIMAL ENFORCEMENT' : 'ATTENTION REQUIRED'}
                </span>
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 8 }}>{totalRuns} runs verified</div>
            </div>

            {/* Card 2: Attacks Shielded */}
            <div className="card" style={{
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.05) 0%, rgba(20, 20, 20, 0.4) 100%)',
              border: '1px solid rgba(239, 68, 68, 0.2)'
            }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 600 }}>Attacks Shielded</div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#ef4444', margin: '8px 0' }}>{totalBlocked} blocked</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="badge" style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', fontSize: '0.62rem', fontWeight: 800 }}>
                  SHIELD ACTIVE
                </span>
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 8 }}>Adversarial prompt injections rejected</div>
            </div>

            {/* Card 3: Data Leaks Scrubbed */}
            <div className="card" style={{
              background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.05) 0%, rgba(20, 20, 20, 0.4) 100%)',
              border: '1px solid rgba(6, 182, 212, 0.2)'
            }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 600 }}>Data Leaks Scrubbed</div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#06b6d4', margin: '8px 0' }}>{totalResolved} resolved</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="badge" style={{ backgroundColor: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4', border: '1px solid rgba(6, 182, 212, 0.3)', fontSize: '0.62rem', fontWeight: 800 }}>
                  SECURE VAULT
                </span>
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 8 }}>API secrets and PII data masked</div>
            </div>

            {/* Card 4: HITL Reviews */}
            <div className="card" style={{
              background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.05) 0%, rgba(20, 20, 20, 0.4) 100%)',
              border: '1px solid rgba(249, 115, 22, 0.2)'
            }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 600 }}>Operator Interventions</div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#f97316', margin: '8px 0' }}>{filteredPending.length} pending</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="badge" style={{ backgroundColor: 'rgba(249, 115, 22, 0.15)', color: '#f97316', border: '1px solid rgba(249, 115, 22, 0.3)', fontSize: '0.62rem', fontWeight: 800 }}>
                  HITL QUEUE
                </span>
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 8 }}>Operator actions waiting sign-off</div>
            </div>
          </div>
        )}

        {/* Tabbed Navigation Menu */}
        <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid #222', marginBottom: 20, paddingBottom: 1 }}>
          <button 
            onClick={() => setActiveTab('inbox')} 
            style={{
              padding: '10px 16px',
              fontSize: '0.85rem',
              fontWeight: 600,
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'inbox' ? '2px solid var(--accent-primary)' : '2px solid transparent',
              color: activeTab === 'inbox' ? 'var(--accent-primary)' : 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <Inbox size={15} /> Review Inbox ({filteredPending.length})
          </button>
          <button 
            onClick={() => setActiveTab('logs')} 
            style={{
              padding: '10px 16px',
              fontSize: '0.85rem',
              fontWeight: 600,
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'logs' ? '2px solid var(--accent-primary)' : '2px solid transparent',
              color: activeTab === 'logs' ? 'var(--accent-primary)' : 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <FileText size={15} /> Audit Logs ({filteredLogs.length})
          </button>
          <button 
            onClick={() => setActiveTab('policies')} 
            style={{
              padding: '10px 16px',
              fontSize: '0.85rem',
              fontWeight: 600,
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'policies' ? '2px solid var(--accent-primary)' : '2px solid transparent',
              color: activeTab === 'policies' ? 'var(--accent-primary)' : 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <ShieldCheck size={15} /> Security Policies
          </button>
        </div>

        {/* Tab Panels */}
        {activeTab === 'inbox' && (
          <div>
            {filteredPending.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {filteredPending.map(run => {
                  const isSelected = selectedPending?.id === run.id;
                  const agentName = agents.find(a => a.id === run.agent_id)?.name || 'Agent';
                  return (
                    <div key={run.id} className="card" style={{ border: '1px solid #333', borderRadius: 8, padding: 16 }}>
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-2">
                          <span className="badge badge-amber" style={{ fontSize: '0.62rem', fontWeight: 800 }}>AWAITING COMPLIANCE ACTION</span>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}><Bot size={14} /> {agentName}</span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>• ID: {run.id}</span>
                        </div>
                        <button className="btn btn-secondary btn-sm" onClick={() => {
                          if (isSelected) {
                            setSelectedPending(null);
                            setEditText('');
                          } else {
                            setSelectedPending(run);
                            setEditText(run.output || '');
                          }
                        }}>
                          {isSelected ? 'Collapse' : 'Review & Action ➔'}
                        </button>
                      </div>

                      <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        <strong>Prompt:</strong> "{run.input}"
                      </div>

                      {isSelected && (
                        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #222', display: 'flex', flexDirection: 'column', gap: 12 }}>
                          <div>
                            <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.72rem', textTransform: 'uppercase', marginBottom: 4 }}>Flagged LLM Output Draft</span>
                            <pre style={{ whiteSpace: 'pre-wrap', backgroundColor: 'rgba(0,0,0,0.4)', padding: 12, borderRadius: 6, fontSize: '0.76rem', border: '1px solid #333', color: '#f59e0b' }}>
                              {run.output}
                            </pre>
                          </div>

                          <div>
                            <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.72rem', textTransform: 'uppercase', marginBottom: 4 }}>Edit Response (Required only for Edit resolution)</span>
                            <textarea 
                              className="form-textarea font-mono" 
                              style={{ fontSize: '0.78rem', backgroundColor: 'rgba(0,0,0,0.3)', border: '1px solid #444', color: '#fff', width: '100%', borderRadius: 6, padding: 8 }} 
                              rows={4} 
                              value={editText} 
                              onChange={e => setEditText(e.target.value)} 
                            />
                          </div>

                          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                            <button 
                              className="btn btn-primary btn-sm" 
                              style={{ background: '#22c55e', borderColor: '#22c55e', color: '#fff', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                              disabled={resolvingId === run.id}
                              onClick={() => handleResolve(run.id, 'approve')}
                            >
                              <Check size={14} /> Approve As-Is
                            </button>
                            <button 
                              className="btn btn-primary btn-sm" 
                              style={{ background: '#f97316', borderColor: '#f97316', color: '#fff', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                              disabled={resolvingId === run.id || !editText}
                              onClick={() => handleResolve(run.id, 'edit', editText)}
                            >
                              <Pencil size={14} /> Edit & Release
                            </button>
                            <button 
                              className="btn btn-primary btn-sm" 
                              style={{ background: '#ef4444', borderColor: '#ef4444', color: '#fff', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                              disabled={resolvingId === run.id}
                              onClick={() => handleResolve(run.id, 'block')}
                            >
                              <Ban size={14} /> Block Output
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="card" style={{ border: '1px dashed #22c55e', background: 'rgba(34, 197, 94, 0.02)', padding: '30px 20px', borderRadius: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                <CheckCircle2 size={36} color="#22c55e" />
                <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>All safety queues are clear</span>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center' }}>No pending items require human operator review. Safety compliance checks are running normally.</span>
              </div>
            )}
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', borderBottom: '1px solid #222', paddingBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><FileText size={16} color="var(--accent-primary)" /> Historical Compliance Audit Logs</span>
              <span className="badge badge-cyan">{filteredLogs.length} entries</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filteredLogs.length === 0 ? (
                <div className="text-muted" style={{ padding: 40, textAlign: 'center' }}>No audit logs recorded for this scope.</div>
              ) : (
                filteredLogs.map((log) => {
                  const isBlocked = log.action === 'guardrails.block'
                  const isApprove = log.action === 'guardrails.approve' || log.action.includes('approve')
                  const isEdit = log.action === 'guardrails.edit' || log.action.includes('edit')

                  let actionText = 'PAUSED'
                  let badgeColor = '#f59e0b'
                  if (isBlocked || log.action.includes('block')) { actionText = 'BLOCKED'; badgeColor = '#ef4444' }
                  else if (isApprove) { actionText = 'APPROVED'; badgeColor = '#22c55e' }
                  else if (isEdit) { actionText = 'EDITED'; badgeColor = '#f97316' }

                  return (
                    <div key={log.id} 
                      className={`audit-log-row ${activeLogDetail?.id === log.id ? 'active' : ''}`}
                      onClick={() => setActiveLogDetail(activeLogDetail?.id === log.id ? null : log)}
                      style={{
                        padding: '12px 14px',
                        backgroundColor: activeLogDetail?.id === log.id ? 'rgba(249, 115, 22, 0.04)' : 'rgba(255,255,255,0.01)',
                        border: activeLogDetail?.id === log.id ? '1px solid rgba(249,115,22,0.3)' : '1px solid #222',
                        borderRadius: 8,
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}><Bot size={14} /> {log.details?.agent_name}</span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>• {new Date(log.created_at).toLocaleDateString()} {new Date(log.created_at).toLocaleTimeString()}</span>
                        </div>
                        <span className="badge" style={{ backgroundColor: badgeColor, color: 'white', textTransform: 'uppercase', fontSize: '0.62rem', fontWeight: 800 }}>
                          {actionText}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Triggered Policy:</span>
                        <strong style={{ color: 'white' }}>{policyLabels[log.details?.policy] || log.details?.policy || 'System Security Gate'}</strong>
                        {log.details?.policy_category && (
                          <span className="badge" style={{ backgroundColor: 'rgba(139, 92, 246, 0.15)', color: '#c084fc', border: '1px solid rgba(139, 92, 246, 0.3)', fontSize: '0.65rem', padding: '2px 6px', borderRadius: 4 }}>
                            {log.details.policy_category}
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: 4 }}>
                        {log.details?.reason || 'Adversarial check complete.'}
                      </div>

                      {activeLogDetail?.id === log.id && (
                        <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #333', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: 8 }} onClick={e => e.stopPropagation()}>
                          <div>
                            <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.72rem', textTransform: 'uppercase', marginBottom: 2 }}>Flagged Text / Output:</span>
                            <pre style={{
                              whiteSpace: 'pre-wrap',
                              fontFamily: 'monospace',
                              backgroundColor: 'rgba(0,0,0,0.4)',
                              padding: 10,
                              borderRadius: 6,
                              fontSize: '0.76rem',
                              border: '1px solid #333',
                              color: '#fff'
                            }}>{log.details?.flagged_text || log.details?.original_output}</pre>
                          </div>

                          {(log.details?.edited_output || log.details?.resolved_output) && (
                            <div>
                              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.72rem', textTransform: 'uppercase', marginBottom: 2 }}>Resolved Action Output:</span>
                              <pre style={{
                                whiteSpace: 'pre-wrap',
                                fontFamily: 'monospace',
                                backgroundColor: 'rgba(34, 197, 94, 0.05)',
                                padding: 10,
                                borderRadius: 6,
                                fontSize: '0.76rem',
                                border: '1px solid rgba(34, 197, 94, 0.2)',
                                color: '#22c55e'
                              }}>{log.details?.edited_output || log.details?.resolved_output}</pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}

        {activeTab === 'policies' && (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', borderBottom: '1px solid #222', paddingBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShieldCheck size={18} color="var(--accent-primary)" /> Active Policy Guardrails (5 Core Checks)
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Check 1 */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 4 }}>
                  <span style={{ fontWeight: 600 }}>1. Prompt Injection Filter</span>
                  <span style={{ color: '#22c55e', fontSize: '0.75rem', fontWeight: 700 }}>SHIELDING</span>
                </div>
                <div style={{ height: 6, width: '100%', backgroundColor: '#222', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: '100%', backgroundColor: '#22c55e' }}></div>
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 3 }}>
                  Blocks override strings immediately on input validation
                </div>
              </div>

              {/* Check 2 */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 4 }}>
                  <span style={{ fontWeight: 600 }}>2. Secrets & Keys Compliance</span>
                  <span style={{ color: '#06b6d4', fontSize: '0.75rem', fontWeight: 700 }}>MASKING ACTIVE</span>
                </div>
                <div style={{ height: 6, width: '100%', backgroundColor: '#222', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: '98%', backgroundColor: '#06b6d4' }}></div>
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 3 }}>
                  Presidio PII anonymizer and regex scrubbers for API tokens
                </div>
              </div>

              {/* Check 3 */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 4 }}>
                  <span style={{ fontWeight: 600 }}>3. Fairness & Bias Detector</span>
                  <span style={{ color: '#f59e0b', fontSize: '0.75rem', fontWeight: 700 }}>SCANNING ({summary ? summary.policy_breakdown.bias_detection : 0} flags)</span>
                </div>
                <div style={{ height: 6, width: '100%', backgroundColor: '#222', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${summary ? Math.max(70, 100 - summary.policy_breakdown.bias_detection * 10) : 100}%`, backgroundColor: '#f59e0b' }}></div>
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 3 }}>
                  Checks output stereotyping and inserts warning banners
                </div>
              </div>

              {/* Check 4 */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 4 }}>
                  <span style={{ fontWeight: 600 }}>4. Hallucination Watchdog</span>
                  <span style={{ color: '#f59e0b', fontSize: '0.75rem', fontWeight: 700 }}>WATCHING ({summary ? summary.policy_breakdown.hallucination_check : 0} flags)</span>
                </div>
                <div style={{ height: 6, width: '100%', backgroundColor: '#222', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${summary ? Math.max(70, 100 - summary.policy_breakdown.hallucination_check * 10) : 100}%`, backgroundColor: '#f59e0b' }}></div>
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 3 }}>
                  Heuristics check speculative generations and alert operators
                </div>
              </div>

              {/* Check 5 */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 4 }}>
                  <span style={{ fontWeight: 600 }}>5. Regulatory Disclaimer</span>
                  <span style={{ color: '#22c55e', fontSize: '0.75rem', fontWeight: 700 }}>ENFORCING</span>
                </div>
                <div style={{ height: 6, width: '100%', backgroundColor: '#222', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: '100%', backgroundColor: '#22c55e' }}></div>
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 3 }}>
                  Appends disclaimers for Medical/Financial/Legal keywords
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
