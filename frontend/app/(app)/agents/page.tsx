'use client'
import { useEffect, useState, ReactNode } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { 
  Bot, 
  Plus, 
  Search, 
  Calculator, 
  Clock, 
  FileCode, 
  BookOpen, 
  ShieldCheck, 
  Pencil, 
  Trash2, 
  Play, 
  AlertTriangle 
} from 'lucide-react'

// Providers and models are fetched dynamically from the backend API
const AVAILABLE_TOOLS = [
  { id: 'web_search',          label: 'Web Search',    icon: <Search size={14} color="var(--accent-primary)" />, desc: 'DuckDuckGo (free)' },
  { id: 'calculator',          label: 'Calculator',    icon: <Calculator size={14} color="var(--accent-cyan)" />, desc: 'Math expressions' },
  { id: 'get_current_datetime',label: 'Date & Time',   icon: <Clock size={14} color="#34d399" />, desc: 'Current UTC time' },
  { id: 'format_json',         label: 'JSON Format',   icon: <FileCode size={14} color="#a78bfa" />, desc: 'Pretty-print JSON' },
  { id: 'rag_retrieval',       label: 'RAG Retrieval', icon: <BookOpen size={14} color="#fbbf24" />, desc: 'Search knowledge base' },
]

function AgentModal({ initial, kbs, providers = {}, onSave, onClose }: any) {
  const providerKeys = Object.keys(providers)
  const defaultProvider = providerKeys.includes('groq') ? 'groq' : (providerKeys[0] || '')
  const defaultModel = providers[defaultProvider]?.models?.[0] || ''

  const [form, setForm] = useState(initial || {
    name: '', description: '', system_prompt: 'You are a helpful AI assistant.',
    provider: defaultProvider, model: defaultModel,
    temperature: 0.7, max_iterations: 10, tools: [], knowledge_base_id: null,
    guardrails_config: initial?.guardrails_config || {
      pii_detection: false,
      prompt_injection: false,
      bias_detection: false,
      hallucination_check: false,
      data_compliance: false,
      regulatory_disclaimer: false,
      competitors: []
    }
  })
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }))
  const toggleTool = (t: string) => set('tools', form.tools.includes(t) ? form.tools.filter((x: string) => x !== t) : [...form.tools, t])

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 640, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div className="modal-title">🤖 {initial ? 'Edit Agent' : 'Create Agent'}</div>

        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Name *</label>
            <input className="form-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="My Research Agent" />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <input className="form-input" value={form.description} onChange={e => set('description', e.target.value)} placeholder="What does this agent do?" />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">System Prompt</label>
          <textarea className="form-textarea" value={form.system_prompt} onChange={e => set('system_prompt', e.target.value)} rows={3} />
        </div>

        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Provider</label>
            <select className="form-select" value={form.provider} onChange={e => { set('provider', e.target.value); set('model', providers[e.target.value]?.models?.[0] || '') }}>
              {providerKeys.map(p => <option key={p} value={p}>{providers[p]?.label || p}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Model</label>
            <select className="form-select" value={form.model} onChange={e => set('model', e.target.value)}>
              {(providers[form.provider]?.models || []).map((m: string) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>

        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Temperature: {form.temperature}</label>
            <input type="range" min="0" max="2" step="0.1" value={form.temperature} onChange={e => set('temperature', parseFloat(e.target.value))} />
          </div>
          <div className="form-group">
            <label className="form-label">Max Iterations: {form.max_iterations}</label>
            <input type="range" min="1" max="30" step="1" value={form.max_iterations} onChange={e => set('max_iterations', parseInt(e.target.value))} />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Tools</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {AVAILABLE_TOOLS.map(t => (
              <button key={t.id} onClick={() => toggleTool(t.id)}
                className={`btn btn-sm ${form.tools.includes(t.id) ? 'btn-primary' : 'btn-secondary'}`}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>

        {form.tools.includes('rag_retrieval') && (
          <div className="form-group">
            <label className="form-label">Knowledge Base</label>
            <select className="form-select" value={form.knowledge_base_id || ''} onChange={e => set('knowledge_base_id', e.target.value || null)}>
              <option value="">— Select a KB —</option>
              {kbs.map((kb: any) => <option key={kb.id} value={kb.id}>{kb.name}</option>)}
            </select>
          </div>
        )}

        <div className="form-divider" style={{ margin: '20px 0', borderTop: '1px solid #333' }}></div>
        <div className="modal-title" style={{ fontSize: '1.1rem', opacity: 0.9, color: 'var(--accent-primary)', fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <ShieldCheck size={18} color="var(--accent-primary)" /> Safety Governance Configuration
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 16 }}>
          {/* Column 1: Input Filters */}
          <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid #222', borderRadius: 8, padding: 12 }}>
            <div style={{ fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', color: '#f97316', marginBottom: 10, letterSpacing: '0.05em' }}>Input Security Filters</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer', fontSize: '0.82rem' }}>
                <input type="checkbox" style={{ marginTop: 2 }} checked={!!form.guardrails_config?.prompt_injection} 
                  onChange={e => set('guardrails_config', { ...form.guardrails_config, prompt_injection: e.target.checked })} />
                <div>
                  <strong style={{ display: 'block', color: 'white' }}>Prompt Injection Block</strong>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Prevent adversarial jailbreaks and system override attempts.</span>
                </div>
              </label>

              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer', fontSize: '0.82rem' }}>
                <input type="checkbox" style={{ marginTop: 2 }} checked={!!form.guardrails_config?.pii_detection} 
                  onChange={e => set('guardrails_config', { ...form.guardrails_config, pii_detection: e.target.checked })} />
                <div>
                  <strong style={{ display: 'block', color: 'white' }}>PII Anonymizer</strong>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Scrub or mask names, phone numbers, and emails automatically.</span>
                </div>
              </label>
            </div>
          </div>

          {/* Column 2: Output Filters */}
          <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid #222', borderRadius: 8, padding: 12 }}>
            <div style={{ fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', color: '#06b6d4', marginBottom: 10, letterSpacing: '0.05em' }}>Output Safeguard Filters</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer', fontSize: '0.82rem' }}>
                <input type="checkbox" style={{ marginTop: 2 }} checked={!!form.guardrails_config?.data_compliance} 
                  onChange={e => set('guardrails_config', { ...form.guardrails_config, data_compliance: e.target.checked })} />
                <div>
                  <strong style={{ display: 'block', color: 'white' }}>Secrets Scrubbing (API keys)</strong>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Shield leaked access tokens and credential patterns.</span>
                </div>
              </label>

              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer', fontSize: '0.82rem' }}>
                <input type="checkbox" style={{ marginTop: 2 }} checked={!!form.guardrails_config?.bias_detection} 
                  onChange={e => set('guardrails_config', { ...form.guardrails_config, bias_detection: e.target.checked })} />
                <div>
                  <strong style={{ display: 'block', color: 'white' }}>Bias & Stereotypes Scan</strong>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Detect generalization patterns and attach warning labels.</span>
                </div>
              </label>

              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer', fontSize: '0.82rem' }}>
                <input type="checkbox" style={{ marginTop: 2 }} checked={!!form.guardrails_config?.hallucination_check} 
                  onChange={e => set('guardrails_config', { ...form.guardrails_config, hallucination_check: e.target.checked })} />
                <div>
                  <strong style={{ display: 'block', color: 'white' }}>Hallucination Watchdog</strong>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Flag ungrounded claims or speculative responses.</span>
                </div>
              </label>

              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer', fontSize: '0.82rem' }}>
                <input type="checkbox" style={{ marginTop: 2 }} checked={!!form.guardrails_config?.regulatory_disclaimer} 
                  onChange={e => set('guardrails_config', { ...form.guardrails_config, regulatory_disclaimer: e.target.checked })} />
                <div>
                  <strong style={{ display: 'block', color: 'white' }}>Regulatory Warnings</strong>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Auto-append Finance/Medicine/Law disclaimers.</span>
                </div>
              </label>
            </div>
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 16 }}>
          <label className="form-label" style={{ fontWeight: 700, fontSize: '0.78rem' }}>Competitor Blocklist (comma separated)</label>
          <input className="form-input" 
            value={(form.guardrails_config.competitors || []).join(', ')} 
            onChange={e => set('guardrails_config', { ...form.guardrails_config, competitors: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
            placeholder="e.g. AWS, Azure, Google Cloud" />
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => onSave(form)} disabled={!form.name}>
            {initial ? 'Save Changes' : 'Create Agent'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<any[]>([])
  const [kbs, setKbs]       = useState<any[]>([])
  const [providers, setProviders] = useState<any>({})
  const [modal, setModal]   = useState<false | 'create' | any>(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = () => {
    setError(null)
    return Promise.all([api.agents.list(), api.kbs.list(), api.providers.list()])
      .then(([a, k, p]) => { setAgents(a); setKbs(k); setProviders(p) })
      .catch(err => {
        console.error('Agents load failed:', err)
        setError('Could not connect to backend. Please ensure python main.py is running on port 8000.')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleSave = async (data: any) => {
    if (modal && modal.id) await api.agents.update(modal.id, data)
    else await api.agents.create(data)
    setModal(false); load()
  }
  const handleDelete = async (id: string) => {
    if (!confirm('Delete this agent?')) return
    await api.agents.delete(id); load()
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Agents</h1>
          <p className="page-subtitle">Create and manage your AI agents</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal('create')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Plus size={16} /> New Agent
        </button>
      </div>

      <div className="page-body">
        {error && (
          <div className="card animate-pulse-glow" style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid #f43f5e', color: '#f43f5e', padding: '12px 18px', borderRadius: 8, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={16} /> {error}
          </div>
        )}
        {loading
          ? <div className="text-muted">Loading agents…</div>
          : agents.length === 0
          ? <div className="empty-state">
              <div className="empty-state-icon" style={{ display: 'flex', justifyContent: 'center' }}>
                <Bot size={36} color="var(--text-muted)" />
              </div>
              <div className="empty-state-title">No agents yet</div>
              <div className="empty-state-desc">Create your first agent to get started</div>
              <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={() => setModal('create')}>Create Agent</button>
            </div>
          : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {agents.map((a: any) => {
                // Calculate active input and output filters
                const activeInput: string[] = []
                if (a.guardrails_config?.prompt_injection) activeInput.push('Prompt Injection')
                if (a.guardrails_config?.pii_detection) activeInput.push('PII Anonymizer')

                const activeOutput: string[] = []
                if (a.guardrails_config?.data_compliance) activeOutput.push('Secrets')
                if (a.guardrails_config?.bias_detection) activeOutput.push('Bias Scan')
                if (a.guardrails_config?.hallucination_check) activeOutput.push('Hallucination')
                if (a.guardrails_config?.regulatory_disclaimer) activeOutput.push('Regulatory')
                if ((a.guardrails_config?.competitors || []).length > 0) activeOutput.push('Competitors')

                return (
                  <div key={a.id} className="agent-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '340px' }}>
                    <div>
                      <div className="agent-card-header">
                        <div className="agent-avatar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Bot size={22} color="var(--accent-primary)" />
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn-icon" onClick={() => setModal(a)} title="Edit"><Pencil size={14} /></button>
                          <button className="btn-icon" onClick={() => handleDelete(a.id)} title="Delete"><Trash2 size={14} color="#ef4444" /></button>
                        </div>
                      </div>
                      <div className="agent-card-name">{a.name}</div>
                      <div className="agent-card-desc" style={{ marginBottom: 12 }}>{a.description || 'No description'}</div>

                      {/* Safety Governance Summary */}
                      <div style={{ borderTop: '1px solid #222', paddingTop: 10, marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#f97316', fontWeight: 700, letterSpacing: '0.03em', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <ShieldCheck size={12} color="#f97316" /> Input Governance
                        </div>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {activeInput.length === 0 ? (
                            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>None (Unshielded)</span>
                          ) : (
                            activeInput.map(f => <span key={f} className="badge" style={{ backgroundColor: 'rgba(249, 115, 22, 0.08)', color: '#f97316', border: '1px solid rgba(249, 115, 22, 0.2)', fontSize: '0.6rem', padding: '1px 5px', borderRadius: 4 }}>{f}</span>)
                          )}
                        </div>

                        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#06b6d4', fontWeight: 700, letterSpacing: '0.03em', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <ShieldCheck size={12} color="#06b6d4" /> Output Governance
                        </div>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {activeOutput.length === 0 ? (
                            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>None (Unshielded)</span>
                          ) : (
                            activeOutput.map(f => <span key={f} className="badge" style={{ backgroundColor: 'rgba(6, 182, 212, 0.08)', color: '#06b6d4', border: '1px solid rgba(6, 182, 212, 0.2)', fontSize: '0.6rem', padding: '1px 5px', borderRadius: 4 }}>{f}</span>)
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="agent-card-footer" style={{ borderTop: '1px solid #222', paddingTop: 10, marginTop: 12 }}>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <span className="badge badge-purple">{a.provider}</span>
                        <span className="badge badge-cyan">{(a.tools || []).length} tools</span>
                      </div>
                      <Link href={`/agents/${a.id}`} className="btn btn-primary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        Run <Play size={12} />
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
        }
      </div>

      {modal && <AgentModal initial={modal === 'create' ? null : modal} kbs={kbs} providers={providers} onSave={handleSave} onClose={() => setModal(false)} />}
    </>
  )
}
