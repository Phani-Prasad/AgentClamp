'use client'
import { useEffect, useState, useCallback } from 'react'
import { api } from '@/lib/api'
import {
  ShieldCheck, Plus, Pencil, Trash2, ToggleLeft, ToggleRight,
  FlaskConical, X, ChevronDown, AlertTriangle, CheckCircle2,
  Lock, Eye, BellRing, ShieldOff, Filter
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────

interface Policy {
  id: string
  name: string
  description: string
  is_active: boolean
  severity: 'critical' | 'high' | 'medium' | 'low'
  scope_agent_id: string | null
  trigger_type: 'keyword' | 'regex' | 'cost_threshold' | 'tool_call'
  trigger_value: string
  action: 'block' | 'mask' | 'hitl' | 'alert' | 'redact'
  created_at: string
  updated_at: string
}

interface Agent { id: string; name: string }

const TRIGGER_TYPES = [
  { value: 'keyword',        label: 'Keyword Match',      hint: 'e.g. SSN, credit card, password' },
  { value: 'regex',          label: 'Regex Pattern',      hint: 'e.g. \\d{16} for 16-digit numbers' },
  { value: 'cost_threshold', label: 'Cost Threshold ($)', hint: 'e.g. 2.50 to flag runs > $2.50' },
  { value: 'tool_call',      label: 'Tool Call Name',     hint: 'e.g. write_file, send_email' },
]

const ACTIONS = [
  { value: 'block',  label: 'Block',                   icon: ShieldOff,    color: '#ef4444' },
  { value: 'mask',   label: 'Mask Content',            icon: Eye,          color: '#f59e0b' },
  { value: 'hitl',   label: 'Route to HITL Queue',     icon: Filter,       color: '#8b5cf6' },
  { value: 'alert',  label: 'Alert & Pass Through',    icon: BellRing,     color: '#3b82f6' },
  { value: 'redact', label: 'Redact All Tokens',       icon: Lock,         color: '#64748b' },
]

const SEVERITIES = [
  { value: 'critical', color: '#ef4444' },
  { value: 'high',     color: '#f59e0b' },
  { value: 'medium',   color: '#3b82f6' },
  { value: 'low',      color: '#22c55e' },
]

const EMPTY_FORM = {
  name: '',
  description: '',
  severity: 'medium',
  scope_agent_id: '',
  trigger_type: 'keyword',
  trigger_value: '',
  action: 'block',
  is_active: true,
}

// ── Main Component ─────────────────────────────────────────────

export default function PolicyBuilderPage() {
  const [policies, setPolicies] = useState<Policy[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<any>(EMPTY_FORM)

  // Test sandbox state
  const [testText, setTestText] = useState('')
  const [testCost, setTestCost] = useState('')
  const [testResult, setTestResult] = useState<any>(null)
  const [testing, setTesting] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const [p, a] = await Promise.all([api.governance.policies.list(), api.agents.list()])
      setPolicies(p)
      setAgents(a)
    } catch (e) {
      console.error('Failed to load policies:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const openCreate = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setTestText('')
    setTestResult(null)
    setDrawerOpen(true)
  }

  const openEdit = (p: Policy) => {
    setEditingId(p.id)
    setForm({
      name: p.name,
      description: p.description,
      severity: p.severity,
      scope_agent_id: p.scope_agent_id || '',
      trigger_type: p.trigger_type,
      trigger_value: p.trigger_value,
      action: p.action,
      is_active: p.is_active,
    })
    setTestText('')
    setTestResult(null)
    setDrawerOpen(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = {
        ...form,
        scope_agent_id: form.scope_agent_id || null,
      }
      if (editingId) {
        await api.governance.policies.update(editingId, payload)
      } else {
        await api.governance.policies.create(payload)
      }
      setDrawerOpen(false)
      await loadData()
    } catch (e: any) {
      alert(e.message || 'Failed to save policy')
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (id: string) => {
    setTogglingId(id)
    try {
      await api.governance.policies.toggle(id)
      await loadData()
    } catch (e) {
      console.error('Toggle failed:', e)
    } finally {
      setTogglingId(null)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    await api.governance.policies.delete(deleteId)
    setDeleteId(null)
    await loadData()
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const result = await api.governance.policies.test({
        trigger_type: form.trigger_type,
        trigger_value: form.trigger_value,
        action: form.action,
        sample_text: testText,
        sample_cost: parseFloat(testCost) || 0,
      })
      setTestResult(result)
    } catch (e: any) {
      setTestResult({ error: e.message })
    } finally {
      setTesting(false)
    }
  }

  const setField = (key: string, val: any) => setForm((f: any) => ({ ...f, [key]: val }))

  const severityColor = (s: string) => SEVERITIES.find(x => x.value === s)?.color || '#64748b'
  const actionMeta = (a: string) => ACTIONS.find(x => x.value === a)

  if (loading) {
    return (
      <div className="page-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
        <div className="text-muted">Loading Policy Builder...</div>
      </div>
    )
  }

  return (
    <>
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldCheck size={24} color="var(--accent-primary)" /> Dynamic Policy Builder
          </h1>
          <p className="page-subtitle">
            Create, configure, and activate governance rules — no code required. Rules are evaluated live on every agent run.
          </p>
        </div>
        <button className="btn-primary" onClick={openCreate} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={16} /> New Policy
        </button>
      </div>

      <div className="page-body">
        {/* ── Stats Bar ──────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Total Rules', value: policies.length, color: 'var(--accent-primary)' },
            { label: 'Active Rules', value: policies.filter(p => p.is_active).length, color: '#22c55e' },
            { label: 'Critical / High', value: policies.filter(p => ['critical','high'].includes(p.severity)).length, color: '#ef4444' },
            { label: 'Scoped Agents', value: new Set(policies.filter(p => p.scope_agent_id).map(p => p.scope_agent_id)).size, color: '#f59e0b' },
          ].map(s => (
            <div key={s.label} className="card" style={{ padding: '14px 18px', textAlign: 'center' }}>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── Policy Cards Grid ──────────────────────────────── */}
        {policies.length === 0 ? (
          <div className="card" style={{ padding: 48, textAlign: 'center' }}>
            <ShieldCheck size={40} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
            <div style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: 12 }}>No policies yet</div>
            <button className="btn-primary" onClick={openCreate} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Plus size={15} /> Create Your First Policy
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
            {policies.map(p => {
              const am = actionMeta(p.action)
              const ActionIcon = am?.icon || ShieldCheck
              return (
                <div key={p.id} className="card" style={{
                  padding: 20,
                  borderLeft: `3px solid ${severityColor(p.severity)}`,
                  opacity: p.is_active ? 1 : 0.55,
                  transition: 'opacity 0.2s',
                }}>
                  {/* Card Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{
                          fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1,
                          color: severityColor(p.severity),
                          background: `${severityColor(p.severity)}20`,
                          padding: '2px 8px', borderRadius: 20,
                        }}>{p.severity}</span>
                        {!p.is_active && (
                          <span style={{ fontSize: '0.6rem', fontWeight: 600, color: 'var(--text-muted)', background: 'var(--surface-2)', padding: '2px 8px', borderRadius: 20 }}>
                            INACTIVE
                          </span>
                        )}
                      </div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.name}
                      </div>
                      {p.description && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.description}
                        </div>
                      )}
                    </div>
                    {/* Toggle */}
                    <button
                      onClick={() => handleToggle(p.id)}
                      disabled={togglingId === p.id}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: p.is_active ? '#22c55e' : 'var(--text-muted)' }}
                      title={p.is_active ? 'Deactivate' : 'Activate'}
                    >
                      {p.is_active ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                    </button>
                  </div>

                  {/* Trigger & Action */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, minWidth: 54 }}>Trigger</span>
                      <span style={{ fontSize: '0.78rem', fontFamily: 'monospace', background: 'var(--surface-2)', padding: '2px 8px', borderRadius: 6, color: 'var(--text-primary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        [{p.trigger_type}] {p.trigger_value}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, minWidth: 54 }}>Action</span>
                      <span style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 4, color: am?.color || 'var(--text-primary)', fontWeight: 600 }}>
                        <ActionIcon size={13} /> {am?.label || p.action}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, minWidth: 54 }}>Scope</span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        {p.scope_agent_id
                          ? (agents.find(a => a.id === p.scope_agent_id)?.name || 'Specific Agent')
                          : 'All Agents'}
                      </span>
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div style={{ display: 'flex', gap: 8, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                    <button className="btn-secondary" onClick={() => openEdit(p)} style={{ flex: 1, fontSize: '0.75rem', padding: '5px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                      <Pencil size={12} /> Edit
                    </button>
                    <button
                      onClick={() => setDeleteId(p.id)}
                      style={{ background: '#ef444415', border: '1px solid #ef444430', color: '#ef4444', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Create / Edit Drawer ───────────────────────────────── */}
      {drawerOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'flex-end',
        }} onClick={e => { if (e.target === e.currentTarget) setDrawerOpen(false) }}>
          <div style={{
            width: 520, height: '100%', overflowY: 'auto',
            background: 'var(--surface-1)',
            borderLeft: '1px solid var(--border)',
            padding: 28,
            display: 'flex', flexDirection: 'column', gap: 20,
            animation: 'slideIn 0.22s ease',
          }}>
            {/* Drawer Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                {editingId ? 'Edit Policy Rule' : 'New Policy Rule'}
              </h2>
              <button onClick={() => setDrawerOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            {/* Name */}
            <div>
              <label className="form-label">Rule Name *</label>
              <input className="form-input" placeholder="e.g. Block PII in Financial Agent" value={form.name} onChange={e => setField('name', e.target.value)} />
            </div>

            {/* Description */}
            <div>
              <label className="form-label">Description</label>
              <input className="form-input" placeholder="Optional notes about this rule" value={form.description} onChange={e => setField('description', e.target.value)} />
            </div>

            {/* Severity */}
            <div>
              <label className="form-label">Severity</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {SEVERITIES.map(s => (
                  <button
                    key={s.value}
                    onClick={() => setField('severity', s.value)}
                    style={{
                      flex: 1, padding: '7px 4px', borderRadius: 8, cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, textTransform: 'capitalize',
                      border: `2px solid ${form.severity === s.value ? s.color : 'var(--border)'}`,
                      background: form.severity === s.value ? `${s.color}20` : 'var(--surface-2)',
                      color: form.severity === s.value ? s.color : 'var(--text-muted)',
                      transition: 'all 0.15s',
                    }}
                  >{s.value}</button>
                ))}
              </div>
            </div>

            {/* Scope */}
            <div>
              <label className="form-label">Apply To (Scope)</label>
              <select className="form-input" value={form.scope_agent_id} onChange={e => setField('scope_agent_id', e.target.value)}>
                <option value="">All Agents (Global)</option>
                {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>

            {/* Trigger Type */}
            <div>
              <label className="form-label">Trigger Type *</label>
              <select className="form-input" value={form.trigger_type} onChange={e => setField('trigger_type', e.target.value)}>
                {TRIGGER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                {TRIGGER_TYPES.find(t => t.value === form.trigger_type)?.hint}
              </div>
            </div>

            {/* Trigger Value */}
            <div>
              <label className="form-label">Trigger Value *</label>
              <input
                className="form-input"
                placeholder={TRIGGER_TYPES.find(t => t.value === form.trigger_type)?.hint || ''}
                value={form.trigger_value}
                onChange={e => setField('trigger_value', e.target.value)}
                style={{ fontFamily: form.trigger_type === 'regex' ? 'monospace' : 'inherit' }}
              />
            </div>

            {/* Action */}
            <div>
              <label className="form-label">Action When Triggered *</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {ACTIONS.map(a => {
                  const Icon = a.icon
                  return (
                    <button
                      key={a.value}
                      onClick={() => setField('action', a.value)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
                        borderRadius: 8, cursor: 'pointer', textAlign: 'left',
                        border: `2px solid ${form.action === a.value ? a.color : 'var(--border)'}`,
                        background: form.action === a.value ? `${a.color}15` : 'var(--surface-2)',
                        color: form.action === a.value ? a.color : 'var(--text-secondary)',
                        fontWeight: form.action === a.value ? 700 : 500,
                        fontSize: '0.82rem',
                        transition: 'all 0.15s',
                      }}
                    >
                      <Icon size={16} /> {a.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Active Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <label className="form-label" style={{ margin: 0 }}>Activate immediately</label>
              <button
                onClick={() => setField('is_active', !form.is_active)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: form.is_active ? '#22c55e' : 'var(--text-muted)', display: 'flex' }}
              >
                {form.is_active ? <ToggleRight size={26} /> : <ToggleLeft size={26} />}
              </button>
            </div>

            {/* ── Test Sandbox ─────────────────────────────────── */}
            <div style={{ background: 'var(--surface-2)', borderRadius: 10, padding: 16, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <FlaskConical size={15} color="var(--accent-primary)" /> Test This Rule (Dry Run)
              </div>
              <textarea
                className="form-input"
                placeholder="Paste sample prompt or output text to test..."
                value={testText}
                onChange={e => setTestText(e.target.value)}
                rows={3}
                style={{ resize: 'vertical', marginBottom: 8, fontFamily: 'monospace', fontSize: '0.78rem' }}
              />
              {form.trigger_type === 'cost_threshold' && (
                <input
                  className="form-input"
                  type="number"
                  placeholder="Simulated cost in USD (e.g. 3.50)"
                  value={testCost}
                  onChange={e => setTestCost(e.target.value)}
                  style={{ marginBottom: 8 }}
                />
              )}
              <button
                className="btn-secondary"
                onClick={handleTest}
                disabled={testing || !testText.trim() || !form.trigger_value.trim()}
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem' }}
              >
                <FlaskConical size={13} /> {testing ? 'Testing...' : 'Run Test'}
              </button>

              {testResult && (
                <div style={{
                  marginTop: 10, padding: 12, borderRadius: 8,
                  background: testResult.error ? '#ef444415' : testResult.matched ? '#f59e0b15' : '#22c55e15',
                  border: `1px solid ${testResult.error ? '#ef444430' : testResult.matched ? '#f59e0b40' : '#22c55e40'}`,
                }}>
                  {testResult.error ? (
                    <div style={{ color: '#ef4444', fontSize: '0.8rem', display: 'flex', gap: 6 }}>
                      <AlertTriangle size={14} /> {testResult.error}
                    </div>
                  ) : testResult.matched ? (
                    <>
                      <div style={{ color: '#f59e0b', fontWeight: 700, fontSize: '0.8rem', marginBottom: 4, display: 'flex', gap: 6 }}>
                        <AlertTriangle size={14} /> Rule MATCHED — Action would trigger: {testResult.action_taken?.toUpperCase()}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>{testResult.match_detail}</div>
                      <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-secondary)', background: 'var(--surface-1)', padding: '6px 10px', borderRadius: 6 }}>
                        {testResult.result_text}
                      </div>
                    </>
                  ) : (
                    <div style={{ color: '#22c55e', fontSize: '0.8rem', display: 'flex', gap: 6 }}>
                      <CheckCircle2 size={14} /> No match — this rule would NOT trigger on the sample text.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Save / Cancel */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* Inline validation hint */}
              {(!form.name.trim() || !form.trigger_value.trim()) && (
                <div style={{ fontSize: '0.75rem', color: '#f59e0b', background: '#f59e0b10', border: '1px solid #f59e0b30', borderRadius: 6, padding: '6px 10px' }}>
                  ⚠️ Required: {[!form.name.trim() && 'Rule Name', !form.trigger_value.trim() && 'Trigger Value'].filter(Boolean).join(' & ')} must be filled in before saving.
                </div>
              )}
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  className="btn-primary"
                  onClick={async () => {
                    if (!form.name.trim() || !form.trigger_value.trim()) return
                    await handleSave()
                  }}
                  disabled={saving}
                  style={{
                    flex: 1,
                    opacity: (!form.name.trim() || !form.trigger_value.trim()) ? 0.4 : 1,
                    cursor: (!form.name.trim() || !form.trigger_value.trim()) ? 'not-allowed' : 'pointer',
                  }}
                >
                  {saving ? 'Saving...' : editingId ? 'Update Policy' : 'Create Policy'}
                </button>
                <button className="btn-secondary" onClick={() => setDrawerOpen(false)} style={{ flex: 1 }}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ───────────────────────────────── */}
      {deleteId && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div className="card" style={{ padding: 28, maxWidth: 400, width: '90%', textAlign: 'center' }}>
            <AlertTriangle size={36} color="#ef4444" style={{ margin: '0 auto 12px' }} />
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Delete Policy?</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 20 }}>
              This action cannot be undone. The rule will be permanently removed and will stop evaluating immediately.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={handleDelete} style={{ flex: 1, background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 0', cursor: 'pointer', fontWeight: 700 }}>
                Yes, Delete
              </button>
              <button className="btn-secondary" onClick={() => setDeleteId(null)} style={{ flex: 1 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      `}</style>
    </>
  )
}
