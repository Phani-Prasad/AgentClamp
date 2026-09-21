const API_BASE = typeof window !== 'undefined' 
  ? `http://${window.location.hostname}:8000` 
  : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000')

const WS_BASE = typeof window !== 'undefined'
  ? `ws://${window.location.hostname}:8000`
  : (process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000')

console.log('[AgentClamp] Dynamic API_BASE:', API_BASE)

async function apiFetch(path: string, options?: RequestInit) {
  const headers: Record<string, string> = { ...(options?.headers as any) }
  if (options?.body) {
    headers['Content-Type'] = 'application/json'
  }

  // Inject JWT token for authenticated requests
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  }).catch(err => {
    console.error(`[AgentClamp] Fetch failed for ${API_BASE}${path}:`, err)
    throw err
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'API error')
  }
  return res.json()
}

// ── Auth ──────────────────────────────────────────────────────
export const api = {
  auth: {
    login:  (data: unknown) => apiFetch('/api/v1/auth/login',  { method: 'POST', body: JSON.stringify(data) }),
    signup: (data: unknown) => apiFetch('/api/v1/auth/signup', { method: 'POST', body: JSON.stringify(data) }),
    me:     ()              => apiFetch('/api/v1/auth/me'),
  },
  admin: {
    listUsers: (adminKey: string) =>
      apiFetch('/api/v1/auth/admin/users', { headers: { 'X-Admin-Key': adminKey } as any }),
    approveUser: (userId: string, adminKey: string) =>
      apiFetch(`/api/v1/auth/admin/users/${userId}/approve`, { method: 'POST', headers: { 'X-Admin-Key': adminKey } as any }),
    rejectUser: (userId: string, adminKey: string) =>
      apiFetch(`/api/v1/auth/admin/users/${userId}/reject`, { method: 'POST', headers: { 'X-Admin-Key': adminKey } as any }),
    deleteUser: (userId: string, adminKey: string) =>
      apiFetch(`/api/v1/auth/admin/users/${userId}`, { method: 'DELETE', headers: { 'X-Admin-Key': adminKey } as any }),
  },
  agents: {
    list: ()                  => apiFetch('/api/v1/agents/'),
    create: (data: unknown)   => apiFetch('/api/v1/agents/', { method: 'POST', body: JSON.stringify(data) }),
    get: (id: string)         => apiFetch(`/api/v1/agents/${id}`),
    update: (id: string, data: unknown) => apiFetch(`/api/v1/agents/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string)      => fetch(`${API_BASE}/api/v1/agents/${id}`, { method: 'DELETE' }),
  },
  runs: {
    list: (agentId?: string)  => apiFetch(`/api/v1/runs/${agentId ? `?agent_id=${agentId}` : ''}`),
    get: (id: string)         => apiFetch(`/api/v1/runs/${id}`),
  },
  kbs: {
    list: ()                  => apiFetch('/api/v1/knowledge-bases/'),
    create: (data: unknown)   => apiFetch('/api/v1/knowledge-bases/', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id: string)      => fetch(`${API_BASE}/api/v1/knowledge-bases/${id}`, { method: 'DELETE' }),
    uploadDoc: (kbId: string, file: File) => {
      const fd = new FormData()
      fd.append('file', file)
      return fetch(`${API_BASE}/api/v1/knowledge-bases/${kbId}/documents`, { method: 'POST', body: fd }).then(r => r.json())
    },
    listDocs: (kbId: string)  => apiFetch(`/api/v1/knowledge-bases/${kbId}/documents`),
    deleteDoc: (kbId: string, docId: string) => fetch(`${API_BASE}/api/v1/knowledge-bases/${kbId}/documents/${docId}`, { method: 'DELETE' }),
  },
  providers: {
    list: ()  => apiFetch('/api/v1/providers/'),
    tools: () => apiFetch('/api/v1/providers/tools'),
    listCustom: () => apiFetch('/api/v1/providers/custom'),
    getCustom: (id: string) => apiFetch(`/api/v1/providers/custom/${id}`),
    createCustom: (data: unknown) => apiFetch('/api/v1/providers/custom', { method: 'POST', body: JSON.stringify(data) }),
    updateCustom: (id: string, data: unknown) => apiFetch(`/api/v1/providers/custom/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    deleteCustom: (id: string) => fetch(`${API_BASE}/api/v1/providers/custom/${id}`, { method: 'DELETE' }),
    testConnection: (data: unknown) => apiFetch('/api/v1/providers/test-connection', { method: 'POST', body: JSON.stringify(data) }),
  },
  analytics: {
    summary: () => apiFetch('/api/v1/analytics/summary'),
    history: (days: number = 7) => apiFetch(`/api/v1/analytics/usage-history?days=${days}`),
    breakdown: () => apiFetch('/api/v1/analytics/agent-breakdown'),
    governanceSummary: () => apiFetch('/api/v1/analytics/governance-summary'),
    auditLogs: () => apiFetch('/api/v1/analytics/audit-logs'),
  },
  governance: {
    listPending: () => apiFetch('/api/v1/governance/pending'),
    resolve: (runId: string, data: { action: string; edited_output?: string }) => 
      apiFetch(`/api/v1/governance/resolve/${runId}`, { method: 'POST', body: JSON.stringify(data) }),
    // Dynamic Policy Builder
    policies: {
      list: () => apiFetch('/api/v1/governance/policies'),
      create: (data: unknown) => apiFetch('/api/v1/governance/policies', { method: 'POST', body: JSON.stringify(data) }),
      update: (id: string, data: unknown) => apiFetch(`/api/v1/governance/policies/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
      toggle: (id: string) => apiFetch(`/api/v1/governance/policies/${id}/toggle`, { method: 'POST' }),
      delete: (id: string) => fetch(`${API_BASE}/api/v1/governance/policies/${id}`, { method: 'DELETE' }),
      test: (data: unknown) => apiFetch('/api/v1/governance/policies/test', { method: 'POST', body: JSON.stringify(data) }),
    },
  },
  eval: {
    run: (data: {
      prompt: string
      response: string
      hallucination_method?: string
      bias_method?: string
      hallucination_threshold?: number
      bias_threshold?: number
    }) => apiFetch('/v1/orgs/me/evaluate', { method: 'POST', body: JSON.stringify(data) }),
  },
  compliance: {
    dashboard: ()                          => apiFetch('/api/v1/compliance/dashboard'),
    frameworks: ()                         => apiFetch('/api/v1/compliance/frameworks'),
    report: ()                             => apiFetch('/api/v1/compliance/report'),
    classifyAgent: (data: unknown)         => apiFetch('/api/v1/compliance/classify-agent', { method: 'POST', body: JSON.stringify(data) }),
    getClassification: (agentId: string)   => apiFetch(`/api/v1/compliance/agents/${agentId}/classification`),
    updateControls: (agentId: string, data: unknown) => apiFetch(`/api/v1/compliance/agents/${agentId}/controls`, { method: 'PATCH', body: JSON.stringify(data) }),
  },
}

export function createWebSocket(agentId: string): WebSocket {
  return new WebSocket(`${WS_BASE}/ws/run/${agentId}`)
}
