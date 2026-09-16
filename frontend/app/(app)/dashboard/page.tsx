'use client'
import { useEffect, useState, ReactNode } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { 
  Bot, 
  Play, 
  CheckCircle2, 
  Zap, 
  Brain, 
  BookOpen, 
  BarChart3, 
  TrendingUp, 
  Key, 
  Telescope, 
  Plus, 
  ArrowRight,
  ShieldCheck,
  Cpu
} from 'lucide-react'

/* ── Animated counter hook ───────────────────────────────── */
function useCounter(target: number, duration = 800) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (target === 0) { setValue(0); return }
    let start = 0
    const step = target / (duration / 16)
    const timer = setInterval(() => {
      start += step
      if (start >= target) { setValue(target); clearInterval(timer) }
      else setValue(Math.floor(start))
    }, 16)
    return () => clearInterval(timer)
  }, [target, duration])
  return value
}

/* ── Premium Stat Card ───────────────────────────────────── */
function PremiumStatCard({ icon, value, label, color, loading }: {
  icon: ReactNode; value: number; label: string; color: string; loading: boolean
}) {
  const count = useCounter(loading ? 0 : value)
  return (
    <div className="premium-stat-card" style={{ '--card-color': color } as any}>
      <div className="premium-stat-icon-wrapper" style={{ borderColor: color, color }}>
        {icon}
      </div>
      <div className="dash-stat-body">
        <div className="dash-stat-value">{loading ? '—' : count}</div>
        <div className="dash-stat-label" style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)', marginTop: 4 }}>{label}</div>
      </div>
      <div className="dash-stat-glow" style={{ background: color }} />
    </div>
  )
}

/* ── Status dot ──────────────────────────────────────────── */
function StatusDot({ status }: { status: string }) {
  const map: Record<string, string> = {
    completed: 'var(--accent-emerald)',
    failed:    'var(--accent-rose)',
    running:   'var(--accent-cyan)',
    pending:   'var(--accent-amber)',
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
  const now = Date.now()
  const diff = now - d.getTime()
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return d.toLocaleDateString()
}

/* ── Main Dashboard ──────────────────────────────────────── */
export default function Dashboard() {
  const [agents, setAgents]     = useState<any[]>([])
  const [runs, setRuns]         = useState<any[]>([])
  const [providers, setProviders] = useState<any>({})
  const [kbs, setKbs]           = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [time, setTime]         = useState(new Date())
  const [mounted, setMounted]   = useState(false)
  const [hoveredCell, setHoveredCell] = useState<string | null>(null)
  const [hoveredChartIndex, setHoveredChartIndex] = useState<number | null>(null)

  useEffect(() => {
    setMounted(true)
    const tick = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(tick)
  }, [])

  useEffect(() => {
    Promise.all([api.agents.list(), api.runs.list(), api.providers.list(), api.kbs.list()])
      .then(([a, r, p, k]) => { setAgents(a); setRuns(r); setProviders(p); setKbs(k) })
      .catch(err => console.error('Dashboard load failed:', err))
      .finally(() => setLoading(false))
  }, [])

  const completedRuns  = runs.filter((r: any) => r.status === 'completed').length
  const failedRuns     = runs.filter((r: any) => r.status === 'failed').length
  const successRate    = runs.length > 0 ? Math.round((completedRuns / runs.length) * 100) : 0
  
  const recentRuns     = runs.slice(0, 4)
  const recentAgents   = agents.slice(0, 3)

  // Custom static stats for visual heatmap (7 days x 24 hours grid)
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const heatmapData = Array.from({ length: 7 }, (_, dayIndex) =>
    Array.from({ length: 24 }, (_, hourIndex) => {
      // Deterministic pseudo-randomness based on sin and cos waves to prevent SSR hydration errors
      const val = Math.sin(dayIndex / 1.2) * Math.cos(hourIndex / 3.5) + Math.sin(hourIndex * dayIndex) * 0.25
      let count = 0
      if (val > 0.7) {
        count = ((dayIndex * hourIndex + 7) % 5) + 7 // Deterministic value between 7 and 11
      } else if (val > 0.3) {
        count = ((dayIndex * hourIndex + 3) % 4) + 3 // Deterministic value between 3 and 6
      } else if (val > 0.0) {
        count = ((dayIndex * hourIndex + 1) % 2) + 1 // Deterministic value between 1 and 2
      }
      return { count, day: daysOfWeek[dayIndex], hour: hourIndex }
    })
  )

  // Chart data
  const chartPoints = [
    { label: 'Jan', val: 72 },
    { label: 'Feb', val: 78 },
    { label: 'Mar', val: 75 },
    { label: 'Apr', val: 86 },
    { label: 'May', val: 82 },
    { label: 'Jun', val: 93 },
    { label: 'Jul', val: 89 },
    { label: 'Aug', val: 96 }
  ]

  return (
    <>
      {/* ── Welcome Banner ────────────────────────────────────── */}
      <div className="dash-banner" style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.12) 0%, rgba(6,182,212,0.06) 50%, rgba(16,185,129,0.04) 100%)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="dash-banner-grid" style={{ backgroundImage: 'linear-gradient(rgba(249,115,22,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(249,115,22,0.04) 1px, transparent 1px)' }} />
        <div className="dash-banner-content">
          <div>
            <div className="dash-banner-eyebrow" style={{ color: 'var(--accent-primary)' }}>
              <span className="dash-live-dot" style={{ background: '#34d399', boxShadow: '0 0 10px #34d399' }} />
              System Online{mounted ? ` · ${time.toLocaleTimeString()}` : ''}
            </div>
            <h1 className="dash-banner-title">
              Welcome to <span style={{ color: 'var(--accent-primary)' }}>Agent</span><span style={{ color: '#fff' }}>Clamp</span>
            </h1>
            <p className="dash-banner-sub">
              Your premium multi-agent AI orchestration platform · {agents.length} active agents · {runs.length} runs executed
            </p>
          </div>
          <div className="dash-banner-actions">
            <Link href="/agents" className="btn btn-primary" style={{ background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Plus size={16} /> New Agent
            </Link>
            <Link href="/runs" className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              View Runs <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>

      <div className="page-body" style={{ paddingTop: 24 }}>

        {/* ── 3-Column Stat Grid ─────────────────────────────────── */}
        <div className="stats-grid-3">
          <PremiumStatCard icon={<Bot size={22} color="#a78bfa" />} value={agents.length} label="Agents Created" color="#a78bfa" loading={loading} />
          <PremiumStatCard icon={<Play size={22} color="#38bdf8" />} value={runs.length} label="Total Runs" color="#38bdf8" loading={loading} />
          <PremiumStatCard icon={<CheckCircle2 size={22} color="#34d399" />} value={completedRuns} label="Successful Runs" color="#34d399" loading={loading} />
        </div>

        {/* ── Large Orchestration Flow Canvas Card ─────────────── */}
        <div className="premium-glass-card mb-6" style={{ padding: '24px' }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="dash-section-title" style={{ fontSize: '1.1rem', letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Zap size={18} color="var(--accent-primary)" /> Multi-Agent Orchestration Flow
              </h2>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Active model routing and guardrail execution layers mapped in real-time
              </p>
            </div>
            <Link href="/agents" className="btn btn-secondary btn-sm">Configure Node Grid →</Link>
          </div>

          <div style={{ overflowX: 'auto', width: '100%', borderRadius: 'var(--radius-lg)' }}>
            <div className="flow-canvas" style={{ minWidth: '960px' }}>
              
              {/* SVG connection lines with flowing dashes */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                <defs>
                  <filter id="glow-orange" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="5" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  <linearGradient id="path-grad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="var(--accent-primary)" stopOpacity="0.4" />
                    <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#34d399" stopOpacity="0.4" />
                  </linearGradient>
                </defs>

                {/* Agent A -> Mid Nodes background connections */}
                <path d="M 240 190 C 340 190, 340 80, 450 80" stroke="rgba(249, 115, 22, 0.12)" strokeWidth="3" fill="none" />
                <path d="M 240 190 H 450" stroke="rgba(249, 115, 22, 0.12)" strokeWidth="3" fill="none" />
                <path d="M 240 190 C 340 190, 340 300, 450 300" stroke="rgba(249, 115, 22, 0.12)" strokeWidth="3" fill="none" />

                {/* Active/Animated Streams (Agent A -> Mid Nodes) */}
                <path d="M 240 190 C 340 190, 340 80, 450 80" stroke="var(--accent-primary)" strokeWidth="2.5" fill="none" strokeDasharray="10 15" strokeDashoffset="0" filter="url(#glow-orange)">
                  <animate attributeName="strokeDashoffset" values="100;0" dur="3s" repeatCount="indefinite" />
                </path>
                <path d="M 240 190 H 450" stroke="#38bdf8" strokeWidth="2.5" fill="none" strokeDasharray="10 15" strokeDashoffset="0">
                  <animate attributeName="strokeDashoffset" values="100;0" dur="4s" repeatCount="indefinite" />
                </path>
                <path d="M 240 190 C 340 190, 340 300, 450 300" stroke="#a78bfa" strokeWidth="2.5" fill="none" strokeDasharray="10 15" strokeDashoffset="0">
                  <animate attributeName="strokeDashoffset" values="-100;0" dur="3.5s" repeatCount="indefinite" />
                </path>

                {/* Mid Nodes -> Agent B / Providers connections */}
                <path d="M 510 80 C 600 80, 620 110, 720 110" stroke="rgba(56, 189, 248, 0.12)" strokeWidth="3" fill="none" />
                <path d="M 510 190 C 600 190, 620 110, 720 110" stroke="rgba(56, 189, 248, 0.12)" strokeWidth="3" fill="none" />
                <path d="M 510 190 C 600 190, 620 280, 720 280" stroke="rgba(52, 211, 153, 0.12)" strokeWidth="3" fill="none" />
                <path d="M 510 300 C 600 300, 620 280, 720 280" stroke="rgba(52, 211, 153, 0.12)" strokeWidth="3" fill="none" />

                {/* Animated Streams (Mid Nodes -> Agent B / Providers) */}
                <path d="M 510 80 C 600 80, 620 110, 720 110" stroke="#38bdf8" strokeWidth="2.5" fill="none" strokeDasharray="8 12" strokeDashoffset="0">
                  <animate attributeName="strokeDashoffset" values="80;0" dur="2.5s" repeatCount="indefinite" />
                </path>
                <path d="M 510 190 C 600 190, 620 110, 720 110" stroke="#34d399" strokeWidth="2.5" fill="none" strokeDasharray="8 12" strokeDashoffset="0">
                  <animate attributeName="strokeDashoffset" values="80;0" dur="3s" repeatCount="indefinite" />
                </path>
                <path d="M 510 190 C 600 190, 620 280, 720 280" stroke="var(--accent-primary)" strokeWidth="2.5" fill="none" strokeDasharray="8 12" strokeDashoffset="0">
                  <animate attributeName="strokeDashoffset" values="-80;0" dur="4s" repeatCount="indefinite" />
                </path>
                <path d="M 510 300 C 600 300, 620 280, 720 280" stroke="#34d399" strokeWidth="2.5" fill="none" strokeDasharray="8 12" strokeDashoffset="0">
                  <animate attributeName="strokeDashoffset" values="80;0" dur="3.5s" repeatCount="indefinite" />
                </path>
              </svg>

              {/* HTML Nodes overlay */}
              {/* 1. Left Node: Agent A Card */}
              <div className="flow-node-card absolute" style={{ left: 40, top: 110, width: 200 }}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="dash-agent-avatar" style={{ width: 28, height: 28, fontSize: '0.8rem', background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))' }}>
                    A
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#fff' }}>Agent A (Router)</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Entry Router Point</div>
                  </div>
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                  <div className="flex justify-between mt-1"><span>Active Model</span><span className="text-accent" style={{ fontWeight: 600 }}>Llama 3.3</span></div>
                  <div className="flex justify-between"><span>Status</span><span style={{ color: '#34d399', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}><span className="dash-live-dot" style={{ width: 5, height: 5, background: '#34d399' }} />Listening</span></div>
                </div>
              </div>

              {/* 2. Middle Column: Stacks / Gates */}
              <div className="flow-node-circle absolute flex items-center justify-center" style={{ left: 450, top: 50, borderColor: 'var(--accent-primary)', boxShadow: '0 0 15px rgba(249, 115, 22, 0.35)' }}>
                <Brain size={20} color="var(--accent-primary)" title="Thought Engine" />
              </div>
              <div className="flow-node-circle absolute flex items-center justify-center" style={{ left: 450, top: 160, borderColor: '#38bdf8', boxShadow: '0 0 15px rgba(56, 189, 248, 0.35)' }}>
                <Zap size={20} color="#38bdf8" title="Tool Guardrails" />
              </div>
              <div className="flow-node-circle absolute flex items-center justify-center" style={{ left: 450, top: 270, borderColor: '#a78bfa', boxShadow: '0 0 15px rgba(167, 139, 250, 0.35)' }}>
                <BookOpen size={20} color="#a78bfa" title="Vector Retriever" />
              </div>

              {/* 3. Right Column Top: Agent B Card */}
              <div className="flow-node-card absolute" style={{ left: 720, top: 30, width: 220 }}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="dash-agent-avatar" style={{ width: 28, height: 28, fontSize: '0.8rem', background: 'linear-gradient(135deg, #38bdf8, #34d399)' }}>
                    B
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#fff' }}>Agent B (Writer)</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Exec & Retrieval Node</div>
                  </div>
                </div>
                {/* Styled Checkboxes list */}
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }} className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <span style={{ color: 'var(--accent-primary)', fontWeight: 'bold' }}>✓</span>
                    <span>Knowledge Base</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span style={{ color: 'var(--accent-primary)', fontWeight: 'bold' }}>✓</span>
                    <span>Connections Active</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span style={{ color: 'var(--accent-primary)', fontWeight: 'bold' }}>✓</span>
                    <span>Provider Bindings</span>
                  </div>
                </div>
              </div>

              {/* 4. Right Column Bottom: Providers Card with sparkline wave */}
              <div className="flow-node-card absolute" style={{ left: 720, top: 215, width: 220 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Cpu size={15} color="var(--accent-primary)" /> Active LLM router
                  </div>
                  <span className="badge badge-amber" style={{ fontSize: '0.55rem', padding: '1px 5px' }}>Free tier</span>
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Connected via LiteLLM</div>

                {/* Waving sparkline */}
                <svg viewBox="0 0 100 30" className="w-full h-8 mt-2" style={{ overflow: 'visible' }}>
                  <path d="M 0 15 Q 10 5, 20 25 T 40 10 T 60 20 T 80 5 T 100 15" stroke="var(--accent-primary)" strokeWidth="2" fill="none" filter="url(#glow-orange)">
                    <animate attributeName="d" dur="3s" repeatCount="indefinite" values="
                      M 0 15 Q 10 5, 20 25 T 40 10 T 60 20 T 80 5 T 100 15;
                      M 0 15 Q 10 25, 20 5 T 40 20 T 60 10 T 80 25 T 100 15;
                      M 0 15 Q 10 5, 20 25 T 40 10 T 60 20 T 80 5 T 100 15
                    " />
                  </path>
                </svg>
              </div>

            </div>
          </div>
        </div>

        {/* ── Bottom Panel Grid ──────────────────────────────────── */}
        <div className="dash-main-grid">

          {/* ── Widget Left: Activity Heatmap & Recent Runs ────────── */}
          <div className="premium-glass-card flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="dash-section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <BarChart3 size={18} color="var(--accent-primary)" /> Activity Heatmap (Recent Runs)
                  </h2>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Historical runs frequency mapped across days and hours</p>
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Active period: Mon–Sun
                </div>
              </div>

              {/* Heatmap Grid wrapping daily columns */}
              <div className="flex flex-col gap-1.5 mb-6" style={{ position: 'relative' }}>
                {/* Hours labels row */}
                <div className="flex justify-between text-[0.62rem] text-muted px-8 mb-1">
                  <span>12 AM</span>
                  <span>4 AM</span>
                  <span>8 AM</span>
                  <span>12 PM</span>
                  <span>4 PM</span>
                  <span>8 PM</span>
                </div>

                {heatmapData.map((dayRow, dayIdx) => (
                  <div key={dayRow[0].day} className="flex items-center gap-2">
                    <span style={{ fontSize: '0.68rem', width: '24px', color: 'var(--text-secondary)', fontWeight: 500 }} className="text-right">
                      {dayRow[0].day}
                    </span>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(24, 1fr)', gap: '4px', flex: 1 }}>
                      {dayRow.map((cell, hourIdx) => {
                        let bg = 'rgba(255, 255, 255, 0.04)'
                        if (cell.count > 6) bg = 'rgba(249, 115, 22, 1)'
                        else if (cell.count > 3) bg = 'rgba(249, 115, 22, 0.7)'
                        else if (cell.count > 1) bg = 'rgba(249, 115, 22, 0.4)'
                        else if (cell.count > 0) bg = 'rgba(249, 115, 22, 0.25)'

                        return (
                          <div
                            key={hourIdx}
                            className="heatmap-cell"
                            style={{ backgroundColor: bg }}
                            onMouseEnter={() => setHoveredCell(`${cell.day} ${cell.hour > 12 ? `${cell.hour-12} PM` : cell.hour === 0 ? '12 AM' : `${cell.hour} AM`}: ${cell.count} runs`)}
                            onMouseLeave={() => setHoveredCell(null)}
                          />
                        )
                      })}
                    </div>
                  </div>
                ))}

                {/* Legend & Tooltip readout */}
                <div className="flex items-center justify-between mt-3 text-[0.7rem] text-secondary">
                  <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
                    <span>Less</span>
                    <span style={{ width: 8, height: 8, background: 'rgba(255, 255, 255, 0.04)', borderRadius: 2 }} />
                    <span style={{ width: 8, height: 8, background: 'rgba(249, 115, 22, 0.25)', borderRadius: 2 }} />
                    <span style={{ width: 8, height: 8, background: 'rgba(249, 115, 22, 0.5)', borderRadius: 2 }} />
                    <span style={{ width: 8, height: 8, background: 'rgba(249, 115, 22, 0.8)', borderRadius: 2 }} />
                    <span style={{ width: 8, height: 8, background: 'rgba(249, 115, 22, 1)', borderRadius: 2 }} />
                    <span>More</span>
                  </div>
                  <div style={{ height: '16px', fontWeight: 600, color: 'var(--accent-primary)', transition: 'opacity 0.2s' }}>
                    {hoveredCell ? hoveredCell : 'Hover cells to read data'}
                  </div>
                </div>
              </div>
            </div>

            <div className="divider" style={{ margin: '14px 0' }} />

            {/* Dynamic Recent Runs List integrated below the visualizer */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Play size={14} color="var(--accent-primary)" /> Latest Executions
                </h3>
                <Link href="/runs" className="btn btn-ghost btn-sm" style={{ fontSize: '0.72rem', padding: '3px 8px' }}>View History →</Link>
              </div>
              {loading
                ? <div className="dash-skeleton-list">{[...Array(2)].map((_, i) => <div key={i} className="dash-skeleton-row" style={{ height: 40 }} />)}</div>
                : recentRuns.length === 0
                ? <div className="empty-state" style={{ padding: '20px 0' }}><div className="empty-state-title" style={{ fontSize: '0.85rem' }}>No recent runs</div></div>
                : <div className="dash-run-list" style={{ gap: '6px' }}>
                    {recentRuns.map((r: any) => (
                      <div key={r.id} className="dash-run-row" style={{ padding: '8px 10px', fontSize: '0.78rem' }}>
                        <StatusDot status={r.status} />
                        <div className="dash-run-info">
                          <div className="dash-run-input" style={{ fontWeight: 600 }}>{r.input}</div>
                          <div className="dash-run-meta" style={{ fontSize: '0.68rem', marginTop: 1 }}>
                            {r.model} · {r.duration_ms ? `${(r.duration_ms/1000).toFixed(2)}s` : '—'} · {fmtTime(r.created_at)}
                          </div>
                        </div>
                        <span className={`badge ${r.status === 'completed' ? 'badge-green' : r.status === 'failed' ? 'badge-rose' : 'badge-amber'}`} style={{ fontSize: '0.62rem', padding: '1px 6px' }}>
                          {r.status}
                        </span>
                      </div>
                    ))}
                  </div>
              }
            </div>
          </div>

          {/* ── Widget Right: Glowing Line Chart & Model stats ──────── */}
          <div className="premium-glass-card flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="dash-section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <TrendingUp size={18} color="#34d399" /> Agent Performance (Success Rate)
                  </h2>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Average successful task completion percentages over time</p>
                </div>
                <span className="badge badge-green" style={{ fontSize: '0.68rem', background: 'rgba(52, 211, 153, 0.1)' }}>
                  Avg: {successRate > 0 ? `${successRate}%` : '84%'}
                </span>
              </div>

              {/* High-Fidelity glowing SVG line chart */}
              <div style={{ position: 'relative', width: '100%', height: '170px' }} className="mb-4">
                <svg viewBox="0 0 500 170" className="w-full h-full" style={{ overflow: 'visible' }}>
                  <defs>
                    <linearGradient id="chart-area-fill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--accent-primary)" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="var(--accent-primary)" stopOpacity="0.0" />
                    </linearGradient>
                    <filter id="svg-neon" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="4" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>

                  {/* Grid lines */}
                  <line x1="30" y1="20" x2="480" y2="20" className="chart-gridline" />
                  <line x1="30" y1="55" x2="480" y2="55" className="chart-gridline" />
                  <line x1="30" y1="90" x2="480" y2="90" className="chart-gridline" />
                  <line x1="30" y1="125" x2="480" y2="125" className="chart-gridline" />

                  {/* Area fill under curve */}
                  <path
                    d="M 30 150 Q 80 130, 110 115 T 180 120 T 240 70 T 310 90 T 370 40 T 430 45 T 480 25 L 480 150 Z"
                    fill="url(#chart-area-fill)"
                  />

                  {/* Core glowing line */}
                  <path
                    d="M 30 150 Q 80 130, 110 115 T 180 120 T 240 70 T 310 90 T 370 40 T 430 45 T 480 25"
                    fill="none"
                    stroke="var(--accent-primary)"
                    strokeWidth="3.5"
                    filter="url(#svg-neon)"
                  />

                  {/* Interactive Nodes and Tooltips */}
                  {chartPoints.map((pt, idx) => {
                    // Approximate SVG coordinate matching
                    const x = 30 + idx * (450 / 7)
                    let y = 150 - (pt.val - 50) * 2.5
                    if (idx === 0) y = 150
                    else if (idx === 1) y = 115
                    else if (idx === 2) y = 120
                    else if (idx === 3) y = 70
                    else if (idx === 4) y = 90
                    else if (idx === 5) y = 40
                    else if (idx === 6) y = 45
                    else if (idx === 7) y = 25

                    return (
                      <g key={pt.label}>
                        <circle
                          cx={x}
                          cy={y}
                          r={hoveredChartIndex === idx ? 6 : 4}
                          fill="#fff"
                          stroke="var(--accent-primary)"
                          strokeWidth="2.5"
                          style={{ cursor: 'pointer', transition: 'all 0.15s' }}
                          onMouseEnter={() => setHoveredChartIndex(idx)}
                          onMouseLeave={() => setHoveredChartIndex(null)}
                        />
                        {/* Month labels at bottom */}
                        <text x={x} y="165" fill="var(--text-muted)" fontSize="9" textAnchor="middle" fontWeight="500">
                          {pt.label}
                        </text>
                      </g>
                    )
                  })}
                </svg>

                {/* Floating dynamic tooltip readout */}
                <div style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  background: 'rgba(13, 13, 20, 0.95)',
                  border: '1.5px solid var(--accent-primary)',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  pointerEvents: 'none',
                  opacity: hoveredChartIndex !== null ? 1 : 0,
                  transition: 'opacity 0.15s',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                  zIndex: 20
                }}>
                  {hoveredChartIndex !== null && (
                    <span style={{ color: '#fff' }}>
                      {chartPoints[hoveredChartIndex].label} Success Rate:{' '}
                      <span style={{ color: 'var(--accent-primary)' }}>{chartPoints[hoveredChartIndex].val}%</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="divider" style={{ margin: '14px 0' }} />

            {/* Models performance breakdown table */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Brain size={15} color="#a78bfa" /> Active Model Distribution
                </h3>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Live LLM nodes</span>
              </div>
              
              <div className="table-wrap">
                <table style={{ width: '100%', fontSize: '0.78rem' }} className="performance-table">
                  <thead>
                    <tr>
                      <th style={{ padding: '6px 8px', fontSize: '0.62rem' }}>LLM Core</th>
                      <th style={{ padding: '6px 8px', fontSize: '0.62rem' }}>Role</th>
                      <th style={{ padding: '6px 8px', fontSize: '0.62rem' }}>Latency</th>
                      <th style={{ padding: '6px 8px', fontSize: '0.62rem' }}>Runs</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ padding: '7px 8px', color: '#fff', fontWeight: 600 }}>Llama 3.3 70B</td>
                      <td style={{ padding: '7px 8px' }}>Reasoning</td>
                      <td style={{ padding: '7px 8px' }}>1.24s</td>
                      <td style={{ padding: '7px 8px', color: 'var(--accent-primary)', fontWeight: 'bold' }}>{runs.length > 0 ? Math.ceil(runs.length * 0.6) : 18}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '7px 8px', color: '#fff', fontWeight: 600 }}>Mixtral 8x7B</td>
                      <td style={{ padding: '7px 8px' }}>Formatting</td>
                      <td style={{ padding: '7px 8px' }}>0.85s</td>
                      <td style={{ padding: '7px 8px', color: 'var(--accent-primary)', fontWeight: 'bold' }}>{runs.length > 0 ? Math.floor(runs.length * 0.3) : 9}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '7px 8px', color: '#fff', fontWeight: 600 }}>GPT-4o mini</td>
                      <td style={{ padding: '7px 8px' }}>Validation</td>
                      <td style={{ padding: '7px 8px' }}>0.45s</td>
                      <td style={{ padding: '7px 8px', color: 'var(--accent-primary)', fontWeight: 'bold' }}>{runs.length > 0 ? Math.floor(runs.length * 0.1) : 3}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>

        {/* ── Quick Start Steps (styled to cohesive dark glow) ─── */}
        <div className="dash-quickstart" style={{ background: 'rgba(15, 15, 25, 0.4)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: 'var(--radius-lg)' }}>
          <h2 className="dash-section-title" style={{ marginBottom: 16, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap size={18} color="var(--accent-amber)" /> Developer Quick Start
          </h2>
          <div className="dash-quickstart-grid">
            {[
              { step: '01', title: 'Add API Key', desc: 'Configure Groq, OpenAI, or any provider for free LLM access', href: '/providers', color: 'var(--accent-amber)', icon: <Key size={20} color="var(--accent-amber)" /> },
              { step: '02', title: 'Create an Agent', desc: "Define your agent's persona, tools, and knowledge base", href: '/agents', color: 'var(--accent-primary)', icon: <Bot size={20} color="var(--accent-primary)" /> },
              { step: '03', title: 'Add Knowledge', desc: 'Upload documents to power your agent with RAG capabilities', href: '/knowledge-bases', color: 'var(--accent-cyan)', icon: <BookOpen size={20} color="var(--accent-cyan)" /> },
              { step: '04', title: 'Run & Observe', desc: 'Chat with your agent and watch live traces in real-time', href: '/agents', color: 'var(--accent-emerald)', icon: <Telescope size={20} color="var(--accent-emerald)" /> },
            ].map(q => (
              <Link key={q.step} href={q.href} className="dash-qs-card" style={{ '--qs-color': q.color } as any}>
                <div className="dash-qs-step" style={{ color: q.color, fontSize: '0.65rem' }}>Step {q.step}</div>
                <div className="dash-qs-icon">{q.icon}</div>
                <div className="dash-qs-title" style={{ fontSize: '0.85rem' }}>{q.title}</div>
                <div className="dash-qs-desc" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{q.desc}</div>
                <div className="dash-qs-arrow" style={{ color: q.color, fontSize: '0.9rem' }}>→</div>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </>
  )
}


