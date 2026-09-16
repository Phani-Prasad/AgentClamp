'use client'

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Handle,
  Position,
  Panel,
  MarkerType,
  useReactFlow,
  ReactFlowProvider
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { api, createWebSocket } from '@/lib/api'
import { 
  Bot, 
  Inbox, 
  Send, 
  ShieldCheck, 
  Layers, 
  Play, 
  Plus, 
  RotateCcw, 
  Trash2, 
  Sparkles 
} from 'lucide-react'

// ── Custom Node Components ────────────────────────────────────

// 1. Agent Node
function AgentNode({ id, data }: any) {
  const { setNodes, setEdges } = useReactFlow()
  return (
    <div 
      className="orchestrator-node-agent" 
      style={{ 
        position: 'relative',
        border: data.isActive ? '2px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
        boxShadow: data.isActive ? '0 0 24px rgba(249, 115, 22, 0.65)' : 'none',
        transition: 'all 0.3s ease',
      }}
    >
      {/* Visual Deletion Button */}
      <button
        className="nodrag"
        onClick={(e) => {
          e.stopPropagation()
          setNodes((nds) => nds.filter((n) => n.id !== id))
          setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id))
        }}
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          width: 20,
          height: 20,
          borderRadius: '50%',
          background: '#f43f5e',
          border: '1.5px solid #fff',
          color: '#fff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.85rem',
          fontWeight: 'bold',
          lineHeight: 1,
          zIndex: 30,
          boxShadow: '0 2px 8px rgba(244, 63, 94, 0.6)',
          transition: 'all 0.2s ease',
          padding: 0,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.15)'
          e.currentTarget.style.background = '#e11d48'
          e.currentTarget.style.boxShadow = '0 0 12px #f43f5e'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)'
          e.currentTarget.style.background = '#f43f5e'
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(244, 63, 94, 0.6)'
        }}
        title="Delete Node"
      >
        ×
      </button>

      <div className="flex items-center gap-2 mb-2" style={{ paddingRight: 12 }}>
        <div className="dash-agent-avatar" style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))' }}>
          <Bot size={16} color="#fff" />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#fff', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{data.label}</div>
          <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>AI Specialist Node</div>
        </div>
      </div>
      <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }} className="flex flex-col gap-1">
        <div className="flex justify-between">
          <span className="text-muted">LLM Model</span>
          <span className="text-accent font-mono">{data.model || 'Unknown'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted">Tools</span>
          <span style={{ color: '#06b6d4', fontWeight: 600 }}>{data.toolsCount || 0} active</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted">Guardrails</span>
          <span style={{ color: '#10b981', fontWeight: 600 }}>{data.guardrailsCount || 0} enabled</span>
        </div>
      </div>
      <Handle type="target" position={Position.Left} style={{ background: '#f97316' }} />
      <Handle type="source" position={Position.Right} style={{ background: '#f97316' }} />
    </div>
  )
}

// 2. Input Node
function InputNode({ id, data }: any) {
  const { setNodes, setEdges } = useReactFlow()
  return (
    <div 
      className="orchestrator-node-input text-center" 
      style={{ 
        position: 'relative',
        border: data.isActive ? '2px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
        boxShadow: data.isActive ? '0 0 24px rgba(6, 182, 212, 0.65)' : 'none',
        transition: 'all 0.3s ease',
      }}
    >
      {/* Visual Deletion Button */}
      <button
        className="nodrag"
        onClick={(e) => {
          e.stopPropagation()
          setNodes((nds) => nds.filter((n) => n.id !== id))
          setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id))
        }}
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          width: 20,
          height: 20,
          borderRadius: '50%',
          background: '#f43f5e',
          border: '1.5px solid #fff',
          color: '#fff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.85rem',
          fontWeight: 'bold',
          lineHeight: 1,
          zIndex: 30,
          boxShadow: '0 2px 8px rgba(244, 63, 94, 0.6)',
          transition: 'all 0.2s ease',
          padding: 0,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.15)'
          e.currentTarget.style.background = '#e11d48'
          e.currentTarget.style.boxShadow = '0 0 12px #f43f5e'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)'
          e.currentTarget.style.background = '#f43f5e'
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(244, 63, 94, 0.6)'
        }}
        title="Delete Node"
      >
        ×
      </button>

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
        <Inbox size={20} color="var(--accent-cyan)" />
      </div>
      <div style={{ fontWeight: 700, fontSize: '0.78rem', color: '#fff' }}>{data.label}</div>
      <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', marginTop: 2 }}>Entry Request Gate</div>
      <Handle type="source" position={Position.Right} style={{ background: '#06b6d4' }} />
    </div>
  )
}

// 3. Output Node
function OutputNode({ id, data }: any) {
  const { setNodes, setEdges } = useReactFlow()
  return (
    <div 
      className="orchestrator-node-output text-center" 
      style={{ 
        position: 'relative',
        border: data.isActive ? '2px solid var(--accent-emerald)' : '1px solid var(--border-subtle)',
        boxShadow: data.isActive ? '0 0 24px rgba(16, 185, 129, 0.65)' : 'none',
        transition: 'all 0.3s ease',
      }}
    >
      {/* Visual Deletion Button */}
      <button
        className="nodrag"
        onClick={(e) => {
          e.stopPropagation()
          setNodes((nds) => nds.filter((n) => n.id !== id))
          setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id))
        }}
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          width: 20,
          height: 20,
          borderRadius: '50%',
          background: '#f43f5e',
          border: '1.5px solid #fff',
          color: '#fff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.85rem',
          fontWeight: 'bold',
          lineHeight: 1,
          zIndex: 30,
          boxShadow: '0 2px 8px rgba(244, 63, 94, 0.6)',
          transition: 'all 0.2s ease',
          padding: 0,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.15)'
          e.currentTarget.style.background = '#e11d48'
          e.currentTarget.style.boxShadow = '0 0 12px #f43f5e'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)'
          e.currentTarget.style.background = '#f43f5e'
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(244, 63, 94, 0.6)'
        }}
        title="Delete Node"
      >
        ×
      </button>

      <Handle type="target" position={Position.Left} style={{ background: '#10b981' }} />
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
        <Send size={20} color="#10b981" />
      </div>
      <div style={{ fontWeight: 700, fontSize: '0.78rem', color: '#fff' }}>{data.label}</div>
      <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', marginTop: 2 }}>System Output Gate</div>
    </div>
  )
}

// 4. Guardrail Node
function GuardrailNode({ id, data }: any) {
  const { setNodes, setEdges } = useReactFlow()
  return (
    <div 
      className="orchestrator-node-guardrail text-center" 
      style={{ 
        position: 'relative',
        border: data.isActive ? '2px solid var(--accent-amber)' : '1px solid var(--border-subtle)',
        boxShadow: data.isActive ? '0 0 24px rgba(245, 158, 11, 0.65)' : 'none',
        transition: 'all 0.3s ease',
      }}
    >
      {/* Visual Deletion Button */}
      <button
        className="nodrag"
        onClick={(e) => {
          e.stopPropagation()
          setNodes((nds) => nds.filter((n) => n.id !== id))
          setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id))
        }}
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          width: 20,
          height: 20,
          borderRadius: '50%',
          background: '#f43f5e',
          border: '1.5px solid #fff',
          color: '#fff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.85rem',
          fontWeight: 'bold',
          lineHeight: 1,
          zIndex: 30,
          boxShadow: '0 2px 8px rgba(244, 63, 94, 0.6)',
          transition: 'all 0.2s ease',
          padding: 0,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.15)'
          e.currentTarget.style.background = '#e11d48'
          e.currentTarget.style.boxShadow = '0 0 12px #f43f5e'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)'
          e.currentTarget.style.background = '#f43f5e'
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(244, 63, 94, 0.6)'
        }}
        title="Delete Node"
      >
        ×
      </button>

      <Handle type="target" position={Position.Left} style={{ background: '#f59e0b' }} />
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
        <ShieldCheck size={20} color="#f59e0b" />
      </div>
      <div style={{ fontWeight: 700, fontSize: '0.78rem', color: '#fff' }}>{data.label}</div>
      <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', marginTop: 2 }}>Middle Guard Security</div>
      <Handle type="source" position={Position.Right} style={{ background: '#f59e0b' }} />
    </div>
  )
}

// Register Node Types
const nodeTypes = {
  agentNode: AgentNode,
  inputNode: InputNode,
  outputNode: OutputNode,
  guardrailNode: GuardrailNode,
}

// ── Main Canvas View ──────────────────────────────────────────
function OrchestratorCanvas() {
  const [agents, setAgents] = useState<any[]>([])
  const [selectedAgentId, setSelectedAgentId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // React Flow states
  const [nodes, setNodes, onNodesChange] = useNodesState<any>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<any>([])

  // Multiple templates states
  const [templates, setTemplates] = useState<Record<string, any>>({})
  const [activeTemplate, setActiveTemplate] = useState<string>('Default Flow')
  const [showNewModal, setShowNewModal] = useState(false)
  const [newTemplateName, setNewTemplateName] = useState('')

  // Visual Simulator states
  const [showSimulator, setShowSimulator] = useState(false)
  const [simulatorInput, setSimulatorInput] = useState('')
  const [simulatorMessages, setSimulatorMessages] = useState<any[]>([])
  const [simulatorRunning, setSimulatorRunning] = useState(false)
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null)
  const wsRef = useRef<WebSocket | null>(null)

  // Fetch initial data
  const load = async () => {
    try {
      setLoading(true)
      const list = await api.agents.list()
      setAgents(list)
      if (list.length > 0) {
        // Default to the first agent
        setSelectedAgentId(list[0].id)
      }
    } catch (err) {
      console.error('Failed to load agents for orchestrator:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  // Load the graph and templates for the currently selected agent
  useEffect(() => {
    if (!selectedAgentId) return
    const agent = agents.find(a => a.id === selectedAgentId)
    if (!agent) return

    const graph = agent.graph_definition

    // Helper to generate default initial layout
    const getInitialFlow = () => {
      const activeTools = agent.tools || []
      const guardrails = agent.guardrails_config || {}
      const activeGuardrailsCount = Object.values(guardrails).filter(Boolean).length

      const initialNodes = [
        {
          id: 'input-1',
          type: 'inputNode',
          data: { label: 'User Request' },
          position: { x: 50, y: 180 },
        },
        {
          id: `agent-${agent.id}`,
          type: 'agentNode',
          data: {
            label: agent.name,
            model: agent.model,
            toolsCount: activeTools.length,
            guardrailsCount: activeGuardrailsCount,
          },
          position: { x: 300, y: 130 },
        },
        {
          id: 'output-1',
          type: 'outputNode',
          data: { label: 'Final Output' },
          position: { x: 650, y: 180 },
        },
      ]

      const initialEdges = [
        {
          id: 'e1-2',
          source: 'input-1',
          target: `agent-${agent.id}`,
          animated: true,
          style: { stroke: 'var(--accent-primary)' },
          markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--accent-primary)' },
        },
        {
          id: 'e2-3',
          source: `agent-${agent.id}`,
          target: 'output-1',
          animated: true,
          style: { stroke: 'var(--accent-emerald)' },
          markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--accent-emerald)' },
        },
      ]

      return { nodes: initialNodes, edges: initialEdges }
    }

    let parsedTemplates: Record<string, any> = {}
    let activeName = 'Default Flow'

    if (graph && graph.templates) {
      // 1. New Templates Format already exists
      parsedTemplates = graph.templates
      activeName = graph.active_template || Object.keys(graph.templates)[0] || 'Default Flow'
    } else if (graph && graph.nodes && graph.nodes.length > 0) {
      // 2. Old format exists -> migrate to templates format in-memory
      parsedTemplates = {
        'Default Flow': {
          nodes: graph.nodes,
          edges: graph.edges || [],
        }
      }
      activeName = 'Default Flow'
    } else {
      // 3. Brand new empty flow -> generate initial layout
      const initialFlow = getInitialFlow()
      parsedTemplates = {
        'Default Flow': initialFlow
      }
      activeName = 'Default Flow'
    }

    setTemplates(parsedTemplates)
    setActiveTemplate(activeName)

    const activeFlow = parsedTemplates[activeName] || { nodes: [], edges: [] }
    setNodes(activeFlow.nodes)
    setEdges(activeFlow.edges)
  }, [selectedAgentId, agents, setNodes, setEdges])

  // Handle template selection change
  const handleTemplateChange = (newTemplateName: string) => {
    if (!newTemplateName) return
    
    // Save current nodes/edges of active template into templates map
    const updatedTemplates = {
      ...templates,
      [activeTemplate]: { nodes, edges }
    }
    setTemplates(updatedTemplates)
    setActiveTemplate(newTemplateName)

    const targetFlow = updatedTemplates[newTemplateName] || { nodes: [], edges: [] }
    setNodes(targetFlow.nodes)
    setEdges(targetFlow.edges)
  }

  // Create a new template copy
  const handleCreateTemplate = () => {
    const trimmed = newTemplateName.trim()
    if (!trimmed) return
    if (templates[trimmed]) {
      alert('A template with this name already exists!')
      return
    }

    const updatedTemplates = {
      ...templates,
      [activeTemplate]: { nodes, edges },
      [trimmed]: { nodes, edges }
    }

    setTemplates(updatedTemplates)
    setActiveTemplate(trimmed)
    setNewTemplateName('')
    setShowNewModal(false)
  }

  // Delete current template
  const handleDeleteTemplate = () => {
    const keys = Object.keys(templates)
    if (keys.length <= 1) {
      alert('You must keep at least one template!')
      return
    }

    if (!confirm(`Are you sure you want to delete the template "${activeTemplate}"?`)) {
      return
    }

    const nextTemplates = { ...templates }
    delete nextTemplates[activeTemplate]

    const remainingKeys = Object.keys(nextTemplates)
    const fallbackName = remainingKeys[0]

    setTemplates(nextTemplates)
    setActiveTemplate(fallbackName)

    const fallbackFlow = nextTemplates[fallbackName] || { nodes: [], edges: [] }
    setNodes(fallbackFlow.nodes)
    setEdges(fallbackFlow.edges)
  }

  // Handle visual connections added by dragging edges
  const onConnect = useCallback(
    (params: any) =>
      setEdges(eds =>
        addEdge(
          {
            ...params,
            animated: true,
            style: { stroke: 'var(--accent-primary)' },
            markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--accent-primary)' },
          },
          eds
        )
      ),
    [setEdges]
  )

  // Save the current templates definition back to the active agent
  const handleSave = async () => {
    if (!selectedAgentId) return
    try {
      setSaving(true)
      
      const fullGraphDefinition = {
        active_template: activeTemplate,
        templates: {
          ...templates,
          [activeTemplate]: { nodes, edges }
        }
      }

      await api.agents.update(selectedAgentId, { graph_definition: fullGraphDefinition })
      
      // Update local state list to reflect the updated agent layout
      setAgents(prev =>
        prev.map(a => (a.id === selectedAgentId ? { ...a, graph_definition: fullGraphDefinition } : a))
      )
      alert(`Successfully saved templates! Active flow: "${activeTemplate}"`)
    } catch (err: any) {
      console.error('Failed to save layout:', err)
      alert(`Save failed: ${err.message || 'Unknown error'}`)
    } finally {
      setSaving(false)
    }
  }

  // Toolbox actions: click to insert new node
  const addAgentNodeToCanvas = (agentItem: any) => {
    const activeTools = agentItem.tools || []
    const guardrails = agentItem.guardrails_config || {}
    const activeGuardrailsCount = Object.values(guardrails).filter(Boolean).length

    const newNode = {
      id: `agent-${agentItem.id}-${Date.now()}`,
      type: 'agentNode',
      data: {
        label: agentItem.name,
        model: agentItem.model,
        toolsCount: activeTools.length,
        guardrailsCount: activeGuardrailsCount,
      },
      position: { x: 320, y: 150 },
    }
    setNodes(nds => [...nds, newNode])
  }

  const addUtilityNode = (type: 'guardrailNode' | 'inputNode' | 'outputNode', label: string) => {
    const newNode = {
      id: `${type}-${Date.now()}`,
      type: type,
      data: { label: label },
      position: { x: 180, y: 220 },
    }
    setNodes(nds => [...nds, newNode])
  }
  // ── Simulator Effects & Functions ───────────────────────────
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [])

  useEffect(() => {
    setNodes(nds =>
      nds.map(n => ({
        ...n,
        data: {
          ...n.data,
          isActive: n.id === activeNodeId
        }
      }))
    )

    setEdges(eds =>
      eds.map(edge => {
        const isActiveConnection = edge.target === activeNodeId || edge.source === activeNodeId
        return {
          ...edge,
          animated: isActiveConnection,
          style: isActiveConnection
            ? { stroke: 'var(--accent-primary)', strokeWidth: 3 }
            : { stroke: 'rgba(255, 255, 255, 0.15)', strokeWidth: 1.5 }
        }
      })
    )
  }, [activeNodeId, setNodes, setEdges])

  const runSimulatorWorkflow = () => {
    if (!simulatorInput.trim() || simulatorRunning || !selectedAgentId) return
    const userMsg = simulatorInput.trim()
    setSimulatorInput('')
    
    setSimulatorMessages(prev => [
      ...prev, 
      { role: 'user', content: userMsg }
    ])
    setSimulatorRunning(true)
    
    // 1. Highlight Input Gate immediately!
    const inputNode = nodes.find((n: any) => n.type === 'inputNode')
    if (inputNode) {
      setActiveNodeId(inputNode.id)
    }

    const ws = createWebSocket(selectedAgentId)
    wsRef.current = ws
    let buffer = ''
    
    setSimulatorMessages(prev => [
      ...prev,
      { role: 'ai', content: '' }
    ])

    ws.onopen = () => ws.send(JSON.stringify({ message: userMsg }))

    ws.onmessage = (e) => {
      const event = JSON.parse(e.data)
      if (event.active_node_id) {
        setActiveNodeId(event.active_node_id)
      }

      if (event.type === 'token') {
        buffer += event.content
        
        // 2. Highlight the specific executing Agent Node matching the selectedAgentId!
        const agentNode = nodes.find((n: any) => 
          n.type === 'agentNode' && 
          (n.id === `agent-${selectedAgentId}` || n.id.startsWith(`agent-${selectedAgentId}-`))
        ) || nodes.find((n: any) => n.type === 'agentNode')

        if (agentNode) {
          setActiveNodeId(agentNode.id)
        }

        setSimulatorMessages(prev => {
          const copy = [...prev]
          copy[copy.length - 1] = { role: 'ai', content: buffer }
          return copy
        })
      } else if (event.type === 'tool_start') {
        // Highlight the specific executing Agent Node matching the selectedAgentId!
        const agentNode = nodes.find((n: any) => 
          n.type === 'agentNode' && 
          (n.id === `agent-${selectedAgentId}` || n.id.startsWith(`agent-${selectedAgentId}-`))
        ) || nodes.find((n: any) => n.type === 'agentNode')

        if (agentNode) {
          setActiveNodeId(agentNode.id)
        }
      } else if (event.type === 'guardrail_alert') {
        const guardNode = nodes.find((n: any) => n.type === 'guardrailNode')
        if (guardNode) {
          setActiveNodeId(guardNode.id)
        }
      } else if (event.type === 'run_end') {
        const outputNode = nodes.find((n: any) => n.type === 'outputNode')
        if (outputNode) {
          setActiveNodeId(outputNode.id)
        }

        setSimulatorRunning(false)
        if (event.output && !buffer) {
          setSimulatorMessages(prev => {
            const copy = [...prev]
            copy[copy.length - 1] = { role: 'ai', content: event.output }
            return copy
          })
        }
        
        setTimeout(() => {
          setActiveNodeId(null)
        }, 3500)
      } else if (event.type === 'error') {
        setSimulatorMessages(prev => {
          const copy = [...prev]
          copy[copy.length - 1] = { role: 'ai', content: `❌ Error: ${event.error}` }
          return copy
        })
        setSimulatorRunning(false)
        setActiveNodeId(null)
      }
    }

    ws.onerror = () => {
      setSimulatorRunning(false)
      setActiveNodeId(null)
    }
    ws.onclose = () => {
      setSimulatorRunning(false)
      setActiveNodeId(null)
    }
  }

  return (
    <>
      {/* ── Page Header ────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Layers size={24} color="var(--accent-primary)" /> Multi-Agent Orchestrator
          </h1>
          <p className="page-subtitle">
            Visually link user inputs, security guardrails, and active agent execution nodes in real-time.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
          {/* Coordinator Agent Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Coordinator Agent:
            </span>
            <select
              className="form-select"
              style={{ width: 180, padding: '7px 12px', fontSize: '0.8rem' }}
              value={selectedAgentId}
              onChange={e => setSelectedAgentId(e.target.value)}
            >
              {agents.map(a => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          {/* Active Template Selector */}
          {selectedAgentId && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Template:
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <select
                  className="form-select"
                  style={{ width: 150, padding: '7px 12px', fontSize: '0.8rem' }}
                  value={activeTemplate}
                  onChange={e => handleTemplateChange(e.target.value)}
                >
                  {Object.keys(templates).map(name => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '7px 12px', fontSize: '0.8rem', height: 34, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                  onClick={() => setShowNewModal(true)}
                  title="Create New Template"
                >
                  <Plus size={14} /> New
                </button>
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  style={{
                    padding: '7px 12px',
                    fontSize: '0.8rem',
                    height: 34,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4
                  }}
                  onClick={handleDeleteTemplate}
                  title="Delete Template"
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </div>
          )}

          <button
            className="btn btn-secondary"
            style={{
              borderColor: showSimulator ? 'var(--accent-primary)' : 'var(--border-subtle)',
              color: showSimulator ? '#fff' : 'var(--text-secondary)',
              background: showSimulator ? 'var(--accent-glow)' : 'var(--bg-elevated)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6
            }}
            onClick={() => setShowSimulator(prev => !prev)}
            disabled={!selectedAgentId}
          >
            <Play size={14} /> {showSimulator ? 'Hide Simulator' : 'Run Simulator'}
          </button>

          <button className="btn btn-primary" onClick={handleSave} disabled={saving || !selectedAgentId}>
            {saving ? 'Saving...' : 'Save Canvas'}
          </button>
        </div>
      </div>

      <div className="page-body">
        {loading ? (
          <div className="text-muted">Loading visual orchestrator layout…</div>
        ) : agents.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon" style={{ display: 'flex', justifyContent: 'center' }}>
              <Layers size={36} color="var(--text-muted)" />
            </div>
            <div className="empty-state-title">No agents found</div>
            <div className="empty-state-desc">You need to create at least one agent before using the orchestrator canvas.</div>
            <a href="/agents" className="btn btn-primary" style={{ marginTop: 20 }}>
              Go to Agents Page
            </a>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: showSimulator ? '260px 1fr 350px' : '260px 1fr', gap: 20, height: 'calc(100vh - 200px)', transition: 'all 0.3s ease' }}>
            
            {/* ── Drag & Click Toolbox Panel ─────────────────────── */}
            <div className="premium-glass-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <h3 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent-primary)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Layers size={14} color="var(--accent-primary)" /> Canvas Toolbox
                </h3>
                <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                  Click items below to insert them into your live active workspace.
                </p>
              </div>

              {/* Utility Nodes Toolbox */}
              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 8 }}>
                  Gateways & Controls
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <button
                    onClick={() => addUtilityNode('inputNode', 'User Request')}
                    className="btn btn-secondary btn-sm"
                    style={{ justifyContent: 'flex-start', padding: '6px 10px', fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    <Inbox size={14} color="var(--accent-cyan)" /> User Input Gate
                  </button>
                  <button
                    onClick={() => addUtilityNode('guardrailNode', 'Safety Shield')}
                    className="btn btn-secondary btn-sm"
                    style={{ justifyContent: 'flex-start', padding: '6px 10px', fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    <ShieldCheck size={14} color="#f59e0b" /> Security Guardrail
                  </button>
                  <button
                    onClick={() => addUtilityNode('outputNode', 'Final Response')}
                    className="btn btn-secondary btn-sm"
                    style={{ justifyContent: 'flex-start', padding: '6px 10px', fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    <Send size={14} color="#10b981" /> System Output Gate
                  </button>
                </div>
              </div>

              {/* Agent Nodes Toolbox */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 8 }}>
                  Your Modular Agents
                </div>
                <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, flex: 1, paddingRight: 4 }}>
                  {agents.map(a => (
                    <div
                      key={a.id}
                      onClick={() => addAgentNodeToCanvas(a)}
                      className="dash-agent-row"
                      style={{ cursor: 'pointer', padding: '8px 10px', background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', gap: 8 }}
                    >
                      <div className="dash-agent-avatar" style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Bot size={14} color="var(--accent-primary)" />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.74rem', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {a.name}
                        </div>
                        <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)' }}>
                          {a.model}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── React Flow Workspace Canvas ────────────────────── */}
            <div className="react-flow-wrapper" style={{ height: '100%' }}>
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                nodeTypes={nodeTypes}
                fitView
              >
                <Background color="#555" gap={20} size={1} />
                <Controls style={{ background: '#12121c', border: '1px solid #333', color: '#fff' }} />
                <MiniMap
                  nodeColor={(n: any) => {
                    if (n.type === 'inputNode') return 'rgba(6, 182, 212, 0.4)'
                    if (n.type === 'outputNode') return 'rgba(16, 185, 129, 0.4)'
                    if (n.type === 'guardrailNode') return 'rgba(245, 158, 11, 0.4)'
                    return 'rgba(249, 115, 22, 0.4)'
                  }}
                  maskColor="rgba(0,0,0,0.6)"
                  style={{ background: '#09090e', border: '1px solid #222' }}
                />
                
                {/* Visual Canvas Info Legend */}
                <Panel position="bottom-left" style={{ background: 'rgba(9,9,14,0.85)', border: '1px solid #222', borderRadius: 8, padding: '8px 12px', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#06b6d4' }} /> Input</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#f97316' }} /> Agent</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }} /> Guardrail</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} /> Output</div>
                    <div style={{ borderLeft: '1px solid #333', paddingLeft: 10, color: 'var(--text-muted)' }}>
                      Click node [×] to remove elements | Click connection line and press [Backspace] or [Delete] to remove connections
                    </div>
                  </div>
                </Panel>
              </ReactFlow>
            </div>

            {/* ── Slide-Out execution simulator drawer ─────────── */}
            {showSimulator && (
              <div className="premium-glass-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14, minHeight: 0 }}>
                <div>
                  <h3 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent-cyan)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Play size={14} color="var(--accent-cyan)" /> Run Simulator
                  </h3>
                  <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                    Type a query to run the live workflow and watch the nodes light up on the canvas.
                  </p>
                </div>

                <div style={{
                  flex: 1,
                  background: 'rgba(0,0,0,0.3)',
                  borderRadius: 12,
                  border: '1px solid var(--border-subtle)',
                  padding: 10,
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  fontSize: '0.78rem'
                }}>
                  {simulatorMessages.length === 0 ? (
                    <div className="text-muted text-center" style={{ margin: 'auto', fontSize: '0.72rem' }}>
                      Ask a question to trigger the visual execution tracer
                    </div>
                  ) : (
                    simulatorMessages.map((msg, i) => (
                      <div key={i} style={{ display: 'flex', gap: 8, flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
                        <div style={{
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          background: msg.role === 'user' ? 'var(--bg-hover)' : 'var(--accent-cyan)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.6rem',
                          flexShrink: 0
                        }}>
                          {msg.role === 'user' ? <Bot size={12} color="#fff" /> : <Play size={12} color="#fff" />}
                        </div>
                        <div style={{
                          maxWidth: '82%',
                          background: msg.role === 'user' ? 'var(--accent-glow)' : 'var(--bg-hover)',
                          padding: '6px 10px',
                          borderRadius: 8,
                          whiteSpace: 'pre-wrap',
                          color: '#fff',
                          lineHeight: 1.4
                        }}>
                          {msg.content || (simulatorRunning && i === simulatorMessages.length - 1 ? <span className="typing-indicator" style={{ display: 'inline-flex', gap: 3 }}><span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" /></span> : '')}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Enter query..."
                    style={{ fontSize: '0.78rem', padding: '6px 10px' }}
                    value={simulatorInput}
                    onChange={e => setSimulatorInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && runSimulatorWorkflow()}
                    disabled={simulatorRunning}
                  />
                  <button
                    className="btn btn-primary"
                    style={{ padding: '6px 14px', fontSize: '0.78rem' }}
                    onClick={runSimulatorWorkflow}
                    disabled={simulatorRunning || !simulatorInput.trim()}
                  >
                    {simulatorRunning ? 'Executing...' : 'Run'}
                  </button>
                </div>
              </div>
            )}
            
          </div>
        )}
      </div>

      {/* ── New Template Name Input Modal ─────────────────────── */}
      {showNewModal && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal" style={{ maxWidth: 440 }}>
            <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Plus size={18} color="var(--accent-primary)" /> Create New Flow Template
            </h3>
            <div className="form-group">
              <label className="form-label">Template Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Debugging Flow, Custom Pipeline"
                value={newTemplateName}
                onChange={e => setNewTemplateName(e.target.value)}
                autoFocus
              />
              <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 8 }}>
                This creates a new custom layout template by copying the current active canvas configuration.
              </p>
            </div>
            <div className="modal-footer" style={{ borderTop: 'none', marginTop: 12, paddingTop: 0 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setShowNewModal(false)
                  setNewTemplateName('')
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleCreateTemplate}
                disabled={!newTemplateName.trim()}
              >
                Create Template
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// Export wrapped with ReactFlowProvider
export default function OrchestratorPage() {
  return (
    <ReactFlowProvider>
      <OrchestratorCanvas />
    </ReactFlowProvider>
  )
}
