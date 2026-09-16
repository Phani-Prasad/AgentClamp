'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { 
  RotateCcw, 
  Search, 
  Bot, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  ExternalLink, 
  Wrench, 
  FileText, 
  Flag 
} from 'lucide-react'

export default function RunsPage() {
  const [runs, setRuns]           = useState<any[]>([])
  const [agents, setAgents]       = useState<any[]>([])
  const [loading, setLoading]     = useState(true)
  const [selected, setSelected]   = useState<any | null>(null)
  
  // Local Filters
  const [search, setSearch]       = useState('')
  const [filterAgent, setFilterAgent] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')

  const loadData = () => {
    setLoading(true)
    Promise.all([api.runs.list(), api.agents.list()])
      .then(([r, a]) => { 
        setRuns(r)
        setAgents(a)
        if (r.length > 0 && !selected) {
          setSelected(r[0])
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadData()
  }, [])

  const filteredRuns = runs.filter(r => {
    const matchesSearch = search === '' || 
      (r.input && r.input.toLowerCase().includes(search.toLowerCase())) ||
      (r.output && r.output.toLowerCase().includes(search.toLowerCase()))
    
    const matchesAgent = filterAgent === 'all' || r.agent_id === filterAgent
    const matchesStatus = filterStatus === 'all' || r.status === filterStatus

    return matchesSearch && matchesAgent && matchesStatus
  })

  const activeSelection = filteredRuns.find(r => r.id === selected?.id) || filteredRuns[0] || null

  const getAgentName = (agentId: string) => {
    return agents.find(a => a.id === agentId)?.name || 'Agent'
  }

  const renderStatusDot = (status: string) => {
    if (status === 'completed') return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#22c55e', fontSize: '0.75rem', fontWeight: 600 }}><CheckCircle2 size={13} /> Completed</span>
    if (status === 'failed')    return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#ef4444', fontSize: '0.75rem', fontWeight: 600 }}><XCircle size={13} /> Failed</span>
    if (status === 'pending_review') return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#fbbf24', fontSize: '0.75rem', fontWeight: 600 }}><AlertTriangle size={13} /> Pending Review</span>
    return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#fb923c', fontSize: '0.75rem', fontWeight: 600 }}><Clock size={13} /> Running</span>
  }

  return (
    <>
      {/* Header controls */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
        <div>
          <h1 className="page-title">Run History</h1>
          <p className="page-subtitle">Historical agent executions, cost details, and step traces</p>
        </div>
        <button className="btn btn-secondary" style={{ borderColor: 'var(--text-muted)', padding: '6px 12px', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={loadData}>
          <RotateCcw size={14} /> Refresh History
        </button>
      </div>

      {/* Modern Filters Bar */}
      <div className="card" style={{ display: 'flex', flexWrap: 'wrap', gap: 12, padding: '12px 18px', marginBottom: 16, alignItems: 'center', background: 'rgba(20, 20, 20, 0.4)', border: '1px solid #222' }}>
        {/* Search */}
        <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
          <input
            type="text"
            className="form-input"
            style={{ fontSize: '0.8rem', padding: '6px 12px 6px 32px', width: '100%' }}
            placeholder="Search prompt or output..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: 10, top: 10 }} />
        </div>

        {/* Agent Select */}
        <div style={{ width: 180 }}>
          <select
            className="form-select"
            style={{ fontSize: '0.8rem', padding: '6px 10px', width: '100%' }}
            value={filterAgent}
            onChange={e => setFilterAgent(e.target.value)}
          >
            <option value="all">All Agents</option>
            {agents.map(a => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>

        {/* Status Select */}
        <div style={{ width: 150 }}>
          <select
            className="form-select"
            style={{ fontSize: '0.8rem', padding: '6px 10px', width: '100%' }}
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="running">Running</option>
          </select>
        </div>
      </div>

      {/* Main Split Grid */}
      <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 16, height: 'calc(100vh - 220px)', minHeight: 500 }}>
        
        {/* Left History List */}
        <div style={{ display: 'flex', flexDirection: 'column', border: '1px solid #222', borderRadius: 8, background: 'rgba(10, 10, 10, 0.4)', overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid #222', background: 'rgba(20, 20, 20, 0.2)', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
            Run Executions ({filteredRuns.length})
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {loading ? (
              <div className="text-muted" style={{ padding: 20, fontSize: '0.85rem' }}>Loading runs...</div>
            ) : filteredRuns.length === 0 ? (
              <div className="text-muted" style={{ padding: 20, fontSize: '0.85rem' }}>No runs match your filters</div>
            ) : (
              filteredRuns.map(r => {
                const isSelected = activeSelection?.id === r.id
                return (
                  <div
                    key={r.id}
                    onClick={() => setSelected(r)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 6,
                      border: isSelected ? '1px solid var(--accent-primary)' : '1px solid transparent',
                      background: isSelected ? 'rgba(249, 115, 22, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: isSelected ? 'var(--accent-primary)' : '#fff', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <Bot size={14} /> {getAgentName(r.agent_id)}
                      </span>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                        {new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 8, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{r.input}</div>
                    {renderStatusDot(r.status)}
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Right Detail Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', border: '1px solid #222', borderRadius: 8, background: 'rgba(10, 10, 10, 0.4)', overflow: 'hidden' }}>
          {activeSelection ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {/* Detail Header */}
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #222', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(20, 20, 20, 0.2)' }}>
                <div>
                  <h2 style={{ fontSize: '0.98rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Bot size={18} color="var(--accent-primary)" /> {getAgentName(activeSelection.agent_id)} Execution Details
                  </h2>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2, fontFamily: 'monospace' }}>
                    Run ID: {activeSelection.id} • {new Date(activeSelection.created_at).toLocaleString()}
                  </div>
                </div>
                <Link
                  href={`/traces?run_id=${activeSelection.id}`}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.75rem', borderColor: '#444', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <ExternalLink size={13} /> View Trace Graph
                </Link>
              </div>

              {/* Detail Content Area */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
                {/* Input/Output */}
                <div style={{ marginBottom: 20 }}>
                   <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>User Input</div>
                   <div style={{ background: '#111', padding: 12, borderRadius: 6, fontSize: '0.85rem' }}>{activeSelection.input}</div>
                </div>
                
                {activeSelection.output && (
                  <div style={{ marginBottom: 20 }}>
                     <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Agent Output</div>
                     <div style={{ background: '#111', padding: 12, borderRadius: 6, fontSize: '0.85rem' }}>{activeSelection.output}</div>
                  </div>
                )}

                {/* Timeline */}
                {activeSelection.trace?.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 10 }}>Activation Timeline</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {activeSelection.trace.map((s: any, i: number) => {
                        const isEnd = s.type === 'run_end'
                        const isGuardrail = s.type === 'guardrail_alert'
                        
                        let stepText = ''
                        let stepIcon = <FileText size={14} color="var(--text-muted)" />
                        let stepBg = 'rgba(255,255,255,0.01)'
                        let stepBorder = '#222'

                        if (s.type === 'tool_start') {
                          stepText = `Triggered Tool: '${s.tool}'`
                          stepIcon = <Wrench size={14} color="var(--accent-cyan)" />
                          stepBg = 'rgba(6, 182, 212, 0.02)'
                        } else if (s.type === 'tool_end') {
                          stepText = `Tool Result: '${s.tool}' returned success payload.`
                          stepIcon = <CheckCircle2 size={14} color="#34d399" />
                        } else if (isGuardrail) {
                          stepText = `Policy alert: ${s.policy || 'General compliance trigger'} - ${s.reason || ''}`
                          stepIcon = <AlertTriangle size={14} color="var(--accent-primary)" />
                          stepBg = 'rgba(249, 115, 22, 0.05)'
                          stepBorder = 'rgba(249, 115, 22, 0.2)'
                        } else if (isEnd) {
                          stepText = `Session ended successfully.`
                          stepIcon = <Flag size={14} color="#34d399" />
                        }

                        if (!stepText) return null

                        return (
                          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 12px', background: stepBg, border: `1px solid ${stepBorder}`, borderRadius: 6, fontSize: '0.78rem' }}>
                            <div style={{ marginTop: 2 }}>{stepIcon}</div>
                            <div>
                              <div style={{ fontWeight: 600, color: '#fff' }}>{stepText}</div>
                              {s.output && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2, fontFamily: 'monospace' }}>{typeof s.output === 'string' ? s.output : JSON.stringify(s.output)}</div>}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Select a run from the history list to inspect its execution trace.
            </div>
          )}
        </div>
      </div>
    </>
  )
}
