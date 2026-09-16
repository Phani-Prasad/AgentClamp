'use client'
import { useEffect, useState, ReactNode } from 'react'
import { api } from '@/lib/api'
import { 
  Settings, 
  Plus, 
  Cpu, 
  Pencil, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  Lightbulb, 
  Wrench, 
  Building2, 
  Zap, 
  Globe, 
  Bot 
} from 'lucide-react'

interface CustomProvider {
  id?: string
  name: string
  provider_key: string
  base_url: string
  api_key?: string
  api_key_masked?: string
  models: string[]
  is_enabled: boolean
  is_default: boolean
  notes: string
}

function CustomProviderModal({ initial, onSave, onClose }: { initial: CustomProvider | null, onSave: (data: CustomProvider) => void, onClose: () => void }) {
  const [form, setForm] = useState<CustomProvider>(initial || {
    name: '',
    provider_key: '',
    base_url: '',
    api_key: '',
    models: [],
    is_enabled: true,
    is_default: false,
    notes: ''
  })
  const [rawModels, setRawModels] = useState(initial?.models.join(', ') || '')
  const [testResult, setTestResult] = useState<{ success?: boolean; message?: string } | null>(null)
  const [testing, setTesting] = useState(false)

  const set = (k: keyof CustomProvider, v: any) => setForm(f => ({ ...f, [k]: v }))

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const modelsList = rawModels.split(',').map(s => s.trim()).filter(Boolean)
      const testModel = modelsList[0] || 'gpt-3.5-turbo'
      
      const res = await api.providers.testConnection({
        base_url: form.base_url,
        api_key: form.api_key || undefined,
        model: testModel
      })
      setTestResult(res)
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'Connection failed' })
    } finally {
      setTesting(false)
    }
  }

  const handleSave = () => {
    const modelsList = rawModels.split(',').map(s => s.trim()).filter(Boolean)
    onSave({
      ...form,
      models: modelsList
    })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 540 }} onClick={e => e.stopPropagation()}>
        <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Settings size={20} color="var(--accent-primary)" />
          {initial ? 'Edit Custom Provider' : 'Add Custom Provider'}
        </div>
        <p className="text-sm text-muted mb-4">
          Add any OpenAI-compatible API endpoint (Azure OpenAI, Ollama, vLLM, LM Studio, etc.).
        </p>

        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Display Name *</label>
            <input className="form-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. My Local vLLM" />
          </div>
          <div className="form-group">
            <label className="form-label">Provider Key (ID) *</label>
            <input className="form-input" value={form.provider_key} disabled={!!initial} onChange={e => set('provider_key', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} placeholder="e.g. local_vllm" />
          </div>
        </div>

        <div className="form-group mt-3">
          <label className="form-label">Base URL *</label>
          <input className="form-input font-mono text-xs" value={form.base_url} onChange={e => set('base_url', e.target.value)} placeholder="e.g. http://192.168.1.50:8000/v1" />
        </div>

        <div className="form-group mt-3">
          <label className="form-label">API Key {initial && <span className="text-muted">(leave blank to keep current)</span>}</label>
          <input type="password" className="form-input" value={form.api_key} onChange={e => set('api_key', e.target.value)} placeholder={initial ? '••••••••••••••••' : 'e.g. sk-...' } />
        </div>

        <div className="form-group mt-3">
          <label className="form-label">Available Models (comma-separated) *</label>
          <input className="form-input text-xs font-mono" value={rawModels} onChange={e => setRawModels(e.target.value)} placeholder="e.g. meta-llama/Llama-3-8B-Instruct, mistralai/Mistral-7B" />
        </div>

        <div className="form-group mt-3">
          <label className="form-label">Notes</label>
          <input className="form-input text-xs" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="e.g. Running on GPU server room 4" />
        </div>

        {testResult && (
          <div style={{
            marginTop: 12,
            padding: '10px 14px',
            borderRadius: 8,
            fontSize: '0.8rem',
            background: testResult.success ? 'rgba(52,211,153,0.1)' : 'rgba(239,68,68,0.1)',
            color: testResult.success ? '#34d399' : '#ef4444',
            border: `1px solid ${testResult.success ? '#34d399' : '#ef4444'}`
          }}>
            {testResult.success ? '✓ Connection successful!' : `Connection failed: ${testResult.message}`}
          </div>
        )}

        <div className="modal-actions mt-4 flex justify-between">
          <button className="btn btn-secondary" onClick={handleTest} disabled={testing || !form.base_url} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Zap size={14} />
            {testing ? 'Testing...' : 'Test Connection'}
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={!form.name || !form.provider_key || !form.base_url || !rawModels}>
              Save Provider
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ProvidersPage() {
  const [providers, setProviders] = useState<any>({})
  const [customProviders, setCustomProviders] = useState<CustomProvider[]>([])
  const [tools, setTools]         = useState<any>({})
  const [loading, setLoading]     = useState(true)
  const [modal, setModal]         = useState<false | 'create' | CustomProvider>(false)

  const reload = () => {
    setLoading(true)
    return Promise.all([api.providers.list(), api.providers.listCustom(), api.providers.tools()])
      .then(([p, cp, t]) => { setProviders(p); setCustomProviders(cp); setTools(t) })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    reload()
  }, [])

  const handleSave = async (data: CustomProvider) => {
    if (modal && typeof modal === 'object' && modal.id) {
      await api.providers.updateCustom(modal.id, data)
    } else {
      await api.providers.createCustom(data)
    }
    setModal(false)
    reload()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this custom provider? Any agents using it will need their model updated.')) return
    await api.providers.deleteCustom(id)
    reload()
  }

  const ICONS: Record<string, ReactNode> = { 
    groq: <Zap size={22} color="var(--accent-primary)" />, 
    openai: <Globe size={22} color="#34d399" />, 
    anthropic: <Bot size={22} color="#a78bfa" />, 
    google: <Globe size={22} color="#38bdf8" />, 
    ollama: <Cpu size={22} color="#fbbf24" />, 
    together: <Cpu size={22} color="#f43f5e" /> 
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Providers</h1>
          <p className="page-subtitle">LLM providers and available tools</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal('create')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Plus size={16} /> Add Custom Provider
        </button>
      </div>

      <div className="page-body">
        {/* Custom Providers Section */}
        {customProviders.length > 0 && (
          <div style={{ marginBottom: 30 }}>
            <h2 style={{ fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Building2 size={20} color="var(--accent-primary)" /> Organization Custom Providers
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
              {customProviders.map((p) => (
                <div key={p.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: '1px solid var(--accent-primary)' }}>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Cpu size={24} color="var(--accent-primary)" />
                        <div>
                          <div style={{ fontWeight: 700, color: '#fff' }}>{p.name}</div>
                          <div className="text-[0.7rem] text-muted font-mono">{p.base_url}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn-icon btn-sm" onClick={() => setModal(p)} title="Edit"><Pencil size={14} /></button>
                        <button className="btn-icon btn-sm" onClick={() => p.id && handleDelete(p.id)} title="Delete"><Trash2 size={14} color="#ef4444" /></button>
                      </div>
                    </div>
                    {p.notes && <p className="text-xs text-secondary mt-1 mb-2">Note: {p.notes}</p>}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                      {p.models.map((m: string) => (
                        <span key={m} className="badge badge-purple font-mono" style={{ fontSize: '0.65rem' }}>{m}</span>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, borderTop: '1px solid #222', paddingTop: 8 }}>
                    <span className="text-[0.7rem] text-muted">Key: {p.api_key_masked || 'None'}</span>
                    <span className="badge badge-green" style={{ fontSize: '0.65rem' }}>OpenAI Compatible</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid-2" style={{ gap: 24, marginBottom: 24 }}>
          {/* LLM Providers */}
          <div>
            <h2 style={{ fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Cpu size={20} color="var(--accent-primary)" /> Built-in Providers
            </h2>
            {loading ? <div className="text-muted">Loading…</div>
              : Object.entries(providers).map(([key, cfg]: any) => (
                <div key={key} className="card" style={{ marginBottom: 12 }}>
                  <div className="flex items-center justify-between">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {ICONS[key] || <Bot size={22} color="var(--accent-primary)" />}
                      <div>
                        <div style={{ fontWeight: 700 }}>{cfg.label}</div>
                        <div className="text-sm text-muted">{cfg.models?.length} models available</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexDirection: 'column', alignItems: 'flex-end' }}>
                      {cfg.key_configured
                        ? <span className="badge badge-green" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><CheckCircle2 size={12} /> Key configured</span>
                        : cfg.requires_key
                        ? <span className="badge badge-amber" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><AlertTriangle size={12} /> Key needed</span>
                        : <span className="badge badge-green" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><CheckCircle2 size={12} /> No key needed</span>
                      }
                    </div>
                  </div>
                  <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {cfg.models?.slice(0, 4).map((m: string) => (
                      <span key={m} className="badge badge-purple font-mono" style={{ fontSize: '0.68rem' }}>{m}</span>
                    ))}
                  </div>
                  {cfg.requires_key && !cfg.key_configured && (
                    <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(245,158,11,0.08)', borderRadius: 8, fontSize: '0.8rem', color: 'var(--accent-amber)', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Lightbulb size={16} />
                      <span>Add <code style={{ background: 'var(--bg-elevated)', padding: '1px 5px', borderRadius: 4 }}>{key.toUpperCase()}_API_KEY</code> to <code>backend/.env</code></span>
                    </div>
                  )}
                </div>
              ))}
          </div>

          {/* Tools */}
          <div>
            <h2 style={{ fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Wrench size={20} color="var(--accent-cyan)" /> Available Tools
            </h2>
            {loading ? <div className="text-muted">Loading…</div>
              : Object.entries(tools).map(([key, tool]: any) => (
                <div key={key} className="card" style={{ marginBottom: 12 }}>
                  <div className="flex items-center gap-3">
                    <Wrench size={20} color="var(--accent-cyan)" />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700 }}>{tool.label}</div>
                      <div className="text-sm text-muted">{tool.description}</div>
                    </div>
                    {tool.requires_config
                      ? <span className="badge badge-amber">Config needed</span>
                      : <span className="badge badge-green">Ready</span>
                    }
                  </div>
                </div>
              ))}
          </div>
        </div>

        <div className="card" style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid var(--border)' }}>
          <h2 style={{ fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Settings size={20} color="#a78bfa" /> Configuration Guide
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 14 }}>
            API keys are stored in <code style={{ background: 'var(--bg-elevated)', padding: '2px 6px', borderRadius: 4 }}>AgenticAI/backend/.env</code>. Edit and restart the backend to apply changes.
          </p>
          <pre style={{ fontSize: '0.78rem' }}>{`# Free (recommended to start)
GROQ_API_KEY=gsk_...          # groq.com — free

# Optional BYOK
OPENAI_API_KEY=sk-...         # platform.openai.com
ANTHROPIC_API_KEY=sk-ant-...  # console.anthropic.com
GOOGLE_API_KEY=AIza...        # aistudio.google.com`}</pre>
        </div>
      </div>

      {modal && (
        <CustomProviderModal
          initial={modal === 'create' ? null : modal}
          onSave={handleSave}
          onClose={() => setModal(false)}
        />
      )}
    </>
  )
}
