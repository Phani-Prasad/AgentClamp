'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { 
  Telescope, 
  RotateCcw, 
  ChevronDown, 
  ChevronRight, 
  ExternalLink, 
  Wrench 
} from 'lucide-react'

/* ── Status dot ──────────────────────────────────────────── */
function StatusDot({ status }: { status: string }) {
  const map: Record<string, string> = {
    completed: 'var(--accent-emerald)',
    failed: 'var(--accent-rose)',
    running: 'var(--accent-cyan)',
    pending: 'var(--accent-amber)',
  }
  return (
    <span style={{
      display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
      background: map[status] ?? 'var(--text-muted)',
      boxShadow: `0 0 6px ${map[status] ?? 'transparent'}`,
      flexShrink: 0,
    }} />
  )
}

/* ── Time formatter ──────────────────────────────────────── */
function fmtTime(iso: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function TracesPage() {
  const [agents, setAgents] = useState<any[]>([])
  const [runs, setRuns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRun, setSelectedRun] = useState<any>(null)
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    setMounted(true)
    const tick = setInterval(() => setTime(new Date()), 1000)
    loadData()
    return () => clearInterval(tick)
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [agentList, runList] = await Promise.all([
        api.agents.list(),
        api.runs.list()
      ])
      setAgents(agentList)
      setRuns(runList)

      if (runList.length > 0 && !selectedRun) {
        setSelectedRun(runList[0])
        setExpandedAgent(runList[0].agent_id)
      }
    } catch (err) {
      console.error('Failed to load traces data:', err)
    } finally {
      setLoading(false)
    }
  }

  // Group runs by agent
  const groupedRuns = agents.map(agent => ({
    ...agent,
    runs: runs.filter(r => r.agent_id === agent.id).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  })).filter(a => a.runs.length > 0)

  return (
    <>
      {/* ── Welcome Banner ────────────────────────────────────── */}
      <div className="dash-banner">
        <div className="dash-banner-grid" />
        <div className="dash-banner-content">
          <div>
            <div className="dash-banner-eyebrow">
              <span className="dash-live-dot" />
              Agent Fleet Monitoring · {mounted ? time.toLocaleTimeString() : ''}
            </div>
            <h1 className="dash-banner-title">
              Agent <span className="dash-banner-brand">Intelligence</span> Traces
            </h1>
            <p className="dash-banner-sub">
              Grouped by agent fleet. Analyze decision paths and tool utilization patterns.
            </p>
          </div>
          <div className="dash-banner-actions">
            <button onClick={loadData} className="btn btn-secondary">
              <span className={loading ? 'animate-spin' : ''}>↻</span> Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="page-body" style={{ display: 'flex', gap: 24, height: 'calc(100vh - 240px)', paddingTop: 20 }}>

        {/* ── Left Side: Agent-Wise History ───────────────────── */}
        <div className="card" style={{ flex: '0 0 320px', padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Agent History
          </div>
          <div className="trace-history-list" style={{ overflowY: 'auto', flex: 1, overflowX: 'hidden' }}>
            {loading ? (
              <div className="dash-skeleton-list p-4">
                {[...Array(6)].map((_, i) => <div key={i} className="dash-skeleton-row" />)}
              </div>
            ) : groupedRuns.length === 0 ? (
              <div className="empty-state">No executions</div>
            ) : (
              groupedRuns.map(group => (
                <div key={group.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <div
                    onClick={() => setExpandedAgent(expandedAgent === group.id ? null : group.id)}
                    style={{
                      padding: '12px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      background: expandedAgent === group.id ? 'var(--bg-hover)' : 'transparent'
                    }}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div className="dash-agent-avatar" style={{ width: 20, height: 20, fontSize: '0.6rem', flexShrink: 0 }}>{group.name[0]}</div>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }} className="truncate">{group.name}</span>
                    </div>
                    <span style={{ fontSize: '0.7rem', transform: expandedAgent === group.id ? 'rotate(90deg)' : 'none' }}>▶</span>
                  </div>

                  {expandedAgent === group.id && (
                    <div style={{ background: 'rgba(0,0,0,0.15)' }}>
                      {group.runs.map((run: any) => (
                        <div
                          key={run.id}
                          onClick={() => setSelectedRun(run)}
                          className={`trace-history-row ${selectedRun?.id === run.id ? 'active' : ''}`}
                          style={{ padding: '10px 16px 10px 36px' }}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <StatusDot status={run.status} />
                            <span className="text-[9px] font-mono text-muted">{fmtTime(run.created_at)}</span>
                          </div>
                          <div className="text-[11px] font-medium text-primary truncate" title={run.input}>
                            {run.input}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Right Side: Deep Dive ────────────────────────────── */}
        <div className="card" style={{ flex: 1, padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {selectedRun ? (
            <>
              <div style={{ padding: '20px 28px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}>
                <div className="flex justify-between items-start gap-4">
                  <div className="overflow-hidden">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <span className={`badge ${selectedRun.status === 'completed' ? 'badge-green' : 'badge-rose'}`}>
                        {selectedRun.status.toUpperCase()}
                      </span>
                      <h2 style={{ fontSize: '1rem', fontWeight: 700 }} className="truncate">
                        {agents.find(a => a.id === selectedRun.agent_id)?.name || 'Agent'} Reasoning
                      </h2>
                    </div>
                    <div className="text-[10px] font-mono text-muted truncate">ID: {selectedRun.id}</div>
                  </div>
                  <div className="flex gap-6 flex-shrink-0 items-center">
                     {selectedRun.langsmith_url && (
                       <a 
                         href={selectedRun.langsmith_url} 
                         target="_blank" 
                         rel="noopener noreferrer" 
                         className="btn btn-secondary btn-sm flex items-center gap-1.5"
                         style={{ borderColor: '#fbbf24', color: '#fbbf24', background: 'rgba(251, 191, 36, 0.05)', fontSize: '0.72rem', height: 'fit-content' }}
                       >
                         <ExternalLink size={12} /> LangSmith
                       </a>
                     )}
                     <div className="text-right">
                       <div className="text-md font-bold text-cyan">{selectedRun.duration_ms || '—'}ms</div>
                       <div className="text-[9px] text-muted font-bold uppercase">Time</div>
                     </div>
                     <div className="text-right">
                       <div className="text-md font-bold text-accent">${selectedRun.cost_usd || '0.00'}</div>
                       <div className="text-[9px] text-muted font-bold uppercase">Cost</div>
                     </div>
                  </div>
                </div>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                <div style={{ maxWidth: 800, margin: '0 auto' }}>

                  {/* User Input Section */}
                  <div className="mb-8">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="chat-avatar user" style={{ width: 20, height: 20, fontSize: '0.65rem' }}>U</div>
                      <span style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Input</span>
                    </div>
                    <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-sm leading-relaxed text-primary">
                      {selectedRun.input}
                    </div>
                  </div>

                  {/* Execution Timeline */}
                  <div className="mb-8">
                    <div className="flex items-center gap-3 mb-5">
                      <span style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Timeline</span>
                    </div>

                    <div className="trace-timeline">
                      {(selectedRun.trace || []).length === 0 ? (
                        <div className="text-sm text-muted italic p-4 bg-white/5 rounded-xl border border-dashed border-white/10 text-center">
                          Zero tool steps.
                        </div>
                      ) : (
                        selectedRun.trace.map((step: any, i: number) => (
                          <div key={i} className="trace-step-card">
                            <div className="trace-step-dot" />
                            <div className="trace-step-content">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <Wrench size={16} color="var(--accent-cyan)" />
                                  <span className="font-bold text-xs text-primary">{step.tool}</span>
                                </div>
                                <span className="badge badge-purple" style={{ fontSize: '0.55rem' }}>{step.type}</span>
                              </div>

                              {step.input && (
                                <div className="mb-3 rounded-lg overflow-hidden border border-white/5">
                                  <div className="trace-code-header">Payload</div>
                                  <pre className="p-2 text-[10px] bg-black/40 text-cyan-400 overflow-x-auto">
                                    {JSON.stringify(step.input, null, 2)}
                                  </pre>
                                </div>
                              )}

                              {step.output && (
                                <div className="rounded-lg overflow-hidden border border-white/5">
                                  <div className="trace-code-header" style={{ color: 'var(--accent-emerald)' }}>Result</div>
                                  <div className="p-2 text-[10px] text-secondary leading-relaxed bg-black/20">
                                    {typeof step.output === 'object' ? JSON.stringify(step.output, null, 2) : String(step.output)}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Final Response */}
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="chat-avatar ai" style={{ width: 20, height: 20, fontSize: '0.65rem' }}>A</div>
                      <span style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Response</span>
                    </div>
                    <div className="p-5 rounded-xl bg-accent-glow/5 border border-accent-glow/20 text-sm leading-relaxed text-primary shadow-lg shadow-purple-500/5">
                      {selectedRun.output}
                    </div>
                  </div>

                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center">
              <Telescope size={48} color="var(--text-muted)" style={{ marginBottom: 16, opacity: 0.3 }} />
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Select a trace</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Choose an agent run to view reasoning.</p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
