'use client'
import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { api, createWebSocket } from '@/lib/api'

interface Message { role: 'user' | 'ai'; content: string; steps?: any[] }

export default function AgentRunPage() {
  const { id } = useParams<{ id: string }>()
  const [agent, setAgent]     = useState<any>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput]     = useState('')
  const [running, setRunning] = useState(false)
  const [trace, setTrace]     = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'chat' | 'trace'>('chat')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const wsRef = useRef<WebSocket | null>(null)

  // Safety & Human-in-the-loop states
  const [pausedAlert, setPausedAlert] = useState<any>(null)
  const [editedText, setEditedText] = useState('')
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    api.agents.get(id).then(setAgent).catch(console.error)
  }, [id])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleDecision = (decision: 'approve' | 'edit' | 'block') => {
    if (!wsRef.current || !pausedAlert) return
    
    const payload: any = {
      action: 'resume',
      decision: decision
    }
    
    if (decision === 'edit') {
      payload.edited_output = editedText
    }
    
    wsRef.current.send(JSON.stringify(payload))
    setPausedAlert(null)
    setIsEditing(false)
    setEditedText('')
  }

  const sendMessage = () => {
    if (!input.trim() || running) return
    const userMsg = input.trim()
    setInput('')
    setMessages(m => [...m, { role: 'user', content: userMsg }])
    setRunning(true)
    setTrace([])
    setPausedAlert(null)
    setIsEditing(false)
    setEditedText('')

    // Add AI placeholder
    setMessages(m => [...m, { role: 'ai', content: '', steps: [] }])

    const ws = createWebSocket(id)
    wsRef.current = ws
    let buffer = ''
    let steps: any[] = []

    ws.onopen = () => ws.send(JSON.stringify({ message: userMsg }))

    ws.onmessage = (e) => {
      const event = JSON.parse(e.data)
      if (event.type === 'token') {
        buffer += event.content
        setMessages(m => {
          const copy = [...m]
          copy[copy.length - 1] = { role: 'ai', content: buffer, steps }
          return copy
        })
      } else if (event.type === 'tool_start') {
        steps = [...steps, event]
        setMessages(m => {
          const copy = [...m]
          copy[copy.length - 1] = { role: 'ai', content: buffer, steps }
          return copy
        })
      } else if (event.type === 'tool_end') {
        steps = [...steps, event]
        setMessages(m => {
          const copy = [...m]
          copy[copy.length - 1] = { role: 'ai', content: buffer, steps }
          return copy
        })
      } else if (event.type === 'guardrail_alert') {
        if (event.hitl_required) {
          setPausedAlert({
            run_id: event.run_id,
            policy: event.policy,
            reason: event.reason,
            flagged_text: event.flagged_text,
            output: event.output
          })
        }
      } else if (event.type === 'run_end') {
        setTrace(event.trace || [])
        setRunning(false)
        if (event.output && !buffer) {
          setMessages(m => {
            const copy = [...m]
            copy[copy.length - 1] = { role: 'ai', content: event.output, steps }
            return copy
          })
        }
      } else if (event.type === 'error') {
        setMessages(m => {
          const copy = [...m]
          copy[copy.length - 1] = { role: 'ai', content: `❌ Error: ${event.error}`, steps: [] }
          return copy
        })
        setRunning(false)
      }
    }

    ws.onerror = () => { setRunning(false) }
    ws.onclose = () => { setRunning(false) }
  }

  if (!agent) return (
    <div className="page-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
      <div className="text-muted">Loading agent…</div>
    </div>
  )

  return (
    <>
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Link href="/agents" className="btn btn-ghost btn-sm">← Back</Link>
            <h1 className="page-title">{agent.name}</h1>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <span className="badge badge-purple">{agent.provider}</span>
            <span className="badge badge-cyan">{agent.model}</span>
            {(agent.tools || []).map((t: string) => <span key={t} className="badge badge-amber">{t}</span>)}
          </div>
        </div>
      </div>

      <div className="page-body" style={{ display: 'flex', gap: 20, height: 'calc(100vh - 140px)' }}>
        {/* Chat Panel */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div className="tabs" style={{ marginBottom: 12 }}>
            <button className={`tab ${activeTab === 'chat' ? 'active' : ''}`} onClick={() => setActiveTab('chat')}>💬 Chat</button>
            <button className={`tab ${activeTab === 'trace' ? 'active' : ''}`} onClick={() => setActiveTab('trace')}>
              🔭 Trace {trace.length > 0 && <span className="badge badge-cyan" style={{ marginLeft: 4 }}>{trace.length}</span>}
            </button>
          </div>

          {activeTab === 'chat' && (
            <div className="chat-container" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div className="chat-messages" style={{ flex: 1, overflowY: 'auto' }}>
                {messages.length === 0 && (
                  <div className="empty-state" style={{ margin: 'auto' }}>
                    <div className="empty-state-icon">💬</div>
                    <div className="empty-state-title">Start a conversation</div>
                    <div className="empty-state-desc">Send a message to run your agent</div>
                  </div>
                )}
                {messages.map((msg, i) => (
                  <div key={i} className={`chat-message ${msg.role}`}>
                    <div className={`chat-avatar ${msg.role}`}>{msg.role === 'ai' ? '⚡' : '👤'}</div>
                    <div>
                      {/* Tool steps */}
                      {msg.role === 'ai' && msg.steps && msg.steps.filter((s: any) => s.type === 'tool_start').map((s: any, j: number) => (
                        <div key={j} className="tool-step" style={{ marginBottom: 8 }}>
                          🔧 Calling <strong>{s.tool}</strong>…
                        </div>
                      ))}
                      {/* Message bubble */}
                      {(msg.content || (msg.role === 'ai' && running && i === messages.length - 1)) && (
                        <div className={`chat-bubble ${msg.role}`} style={{ whiteSpace: 'pre-wrap' }}>
                          {msg.content || (
                            <div className="typing-indicator">
                              <div className="typing-dot" /><div className="typing-dot" /><div className="typing-dot" />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Operator Panel / Input Box Area */}
              {pausedAlert ? (
                <div className="hitl-intercept-panel animate-pulse-glow" style={{
                  padding: 16,
                  margin: '12px 0 0 0',
                  border: '1px solid #f97316',
                  borderRadius: 12,
                  background: 'rgba(249, 115, 22, 0.06)',
                  boxShadow: '0 0 20px rgba(249, 115, 22, 0.12)',
                  backdropFilter: 'blur(10px)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, color: '#f97316' }}>
                      <span>🛡️ Operator Decision Required</span>
                      <span className="badge badge-amber" style={{ textTransform: 'uppercase', fontSize: '0.65rem', backgroundColor: '#c2410c' }}>
                        {pausedAlert.policy?.replace('_', ' ')}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Run ID: {pausedAlert.run_id?.slice(0, 8)}</div>
                  </div>

                  <div style={{ fontSize: '0.82rem', lineHeight: '1.4', backgroundColor: 'rgba(0,0,0,0.3)', padding: '10px 14px', borderRadius: 8, borderLeft: '4px solid #f97316' }}>
                    <strong>Violation Flagged:</strong> {pausedAlert.reason}
                  </div>

                  {!isEditing ? (
                    <>
                      <div style={{ fontSize: '0.85rem' }}>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: 4, textTransform: 'uppercase', fontWeight: 600 }}>Proposed Output Content:</div>
                        <pre style={{
                          whiteSpace: 'pre-wrap',
                          fontFamily: 'inherit',
                          backgroundColor: 'rgba(0,0,0,0.4)',
                          padding: 12,
                          borderRadius: 8,
                          fontSize: '0.82rem',
                          maxHeight: 140,
                          overflowY: 'auto',
                          border: '1px solid #333',
                          lineHeight: '1.5'
                        }}>{pausedAlert.output}</pre>
                      </div>

                      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                        <button className="btn btn-secondary" style={{ borderColor: '#ef4444', color: '#ef4444', transition: 'all 0.2s' }} onClick={() => handleDecision('block')}>
                          Block Response 🛑
                        </button>
                        <button className="btn btn-secondary" onClick={() => { setIsEditing(true); setEditedText(pausedAlert.output) }}>
                          Edit Output ✏️
                        </button>
                        <button className="btn btn-primary" style={{ backgroundColor: '#22c55e', borderColor: '#22c55e', color: 'white', transition: 'all 0.2s' }} onClick={() => handleDecision('approve')}>
                          Approve & Release ✅
                        </button>
                      </div>
                    </>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <label style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600 }}>Modify Response Content:</label>
                      <textarea
                        className="form-textarea"
                        style={{ backgroundColor: 'rgba(0,0,0,0.4)', minHeight: 120, fontSize: '0.85rem', border: '1px solid #444', color: 'white', padding: 10, borderRadius: 8, outline: 'none' }}
                        value={editedText}
                        onChange={e => setEditedText(e.target.value)}
                      />
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => setIsEditing(false)}>Cancel</button>
                        <button className="btn btn-primary btn-sm" style={{ backgroundColor: '#22c55e', borderColor: '#22c55e', color: 'white' }} onClick={() => handleDecision('edit')}>
                          Confirm & Release ✏️
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="chat-input-bar">
                  <input
                    className="chat-input"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                    placeholder="Message your agent…"
                    disabled={running}
                  />
                  <button className="btn btn-primary" onClick={sendMessage} disabled={running || !input.trim()}>
                    {running ? <span className="animate-spin">⟳</span> : '▶'}
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'trace' && (
            <div className="card" style={{ flex: 1, overflowY: 'auto' }}>
              {trace.length === 0
                ? <div className="empty-state"><div className="empty-state-icon">🔭</div><div className="empty-state-title">No trace yet</div><div className="empty-state-desc">Run the agent to see execution steps</div></div>
                : <div className="trace-timeline">
                    {trace.map((step: any, i: number) => (
                      <div key={i} className={`trace-step ${step.type}`}>
                        <span className="trace-step-icon">
                          {step.type === 'tool_start' ? '⚙️' : step.type === 'tool_end' ? '✅' : '❌'}
                        </span>
                        <div>
                          <strong>{step.tool}</strong>
                          {step.type === 'tool_start' && step.input && (
                            <pre style={{ marginTop: 4, fontSize: '0.75rem' }}>{JSON.stringify(step.input, null, 2)}</pre>
                          )}
                          {step.type === 'tool_end' && step.output && (
                            <div style={{ marginTop: 4, fontSize: '0.75rem', opacity: 0.8 }}>{step.output.slice(0, 200)}{step.output.length > 200 ? '…' : ''}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
              }
            </div>
          )}
        </div>

        {/* Agent Info Panel */}
        <div style={{ width: 260 }}>
          <div className="card" style={{ marginBottom: 14 }}>
            <div style={{ fontWeight: 700, marginBottom: 12, fontSize: '0.875rem' }}>⚙️ Agent Config</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              {[
                ['System Prompt', agent.system_prompt?.slice(0, 80) + (agent.system_prompt?.length > 80 ? '…' : '')],
                ['Temperature', agent.temperature],
                ['Max Iterations', agent.max_iterations],
              ].map(([k, v]) => (
                <div key={String(k)} style={{ marginBottom: 8 }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{k}</div>
                  <div>{String(v)}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div style={{ fontWeight: 700, marginBottom: 12, fontSize: '0.875rem' }}>🛠 Active Tools</div>
            {(agent.tools || []).length === 0
              ? <div className="text-muted text-sm">No tools enabled</div>
              : (agent.tools || []).map((t: string) => (
                <div key={t} className="badge badge-cyan" style={{ display: 'flex', marginBottom: 6, borderRadius: 6, padding: '5px 10px' }}>{t}</div>
              ))
            }
          </div>
        </div>
      </div>
    </>
  )
}
