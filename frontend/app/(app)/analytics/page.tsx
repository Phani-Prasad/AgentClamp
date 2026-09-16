'use client'
import { useEffect, useState, ReactNode } from 'react'
import { api } from '@/lib/api'
import { 
  BarChart3, 
  Target, 
  Clock, 
  DollarSign, 
  RotateCcw, 
  TrendingUp, 
  Bot,
  ShieldCheck,
  CheckCircle2,
  Zap
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

/* ── Stat Card (Matching Dashboard) ───────────────────────── */
function StatCard({ icon, value, label, color, loading, suffix = '' }: {
  icon: ReactNode; value: number | string; label: string; color: string; loading: boolean; suffix?: string
}) {
  const numValue = typeof value === 'number' ? value : parseFloat(value) || 0
  const count = useCounter(loading ? 0 : numValue)
  const displayValue = typeof value === 'string' && value.includes('.') 
    ? (loading ? '—' : numValue.toFixed(2)) 
    : (loading ? '—' : count)

  return (
    <div className="dash-stat-card" style={{ '--card-color': color } as any}>
      <div className="dash-stat-icon" style={{ background: `${color}18`, color }}>
        {icon}
      </div>
      <div className="dash-stat-body">
        <div className="dash-stat-value">{displayValue}{suffix}</div>
        <div className="dash-stat-label">{label}</div>
      </div>
      <div className="dash-stat-glow" style={{ background: color }} />
    </div>
  )
}

export default function AnalyticsPage() {
  const [summary, setSummary]     = useState<any>(null)
  const [history, setHistory]     = useState<any[]>([])
  const [breakdown, setBreakdown] = useState<any[]>([])
  const [loading, setLoading]     = useState(true)
  const [mounted, setMounted]     = useState(false)
  const [time, setTime]           = useState(new Date())

  useEffect(() => {
    setMounted(true)
    const tick = setInterval(() => setTime(new Date()), 1000)
    loadData()
    return () => clearInterval(tick)
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [s, h, b] = await Promise.all([
        api.analytics.summary(),
        api.analytics.history(),
        api.analytics.breakdown()
      ])
      setSummary(s)
      setHistory(h)
      setBreakdown(b)
    } catch (err) {
      console.error('Failed to load analytics:', err)
    } finally {
      setLoading(false)
    }
  }

  const maxRuns = history.length > 0 ? Math.max(...history.map(h => h.count), 1) : 1

  return (
    <>
      {/* ── Welcome Banner ────────────────────────────────────── */}
      <div className="dash-banner">
        <div className="dash-banner-grid" />
        <div className="dash-banner-content">
          <div>
            <div className="dash-banner-eyebrow">
              <span className="dash-live-dot" />
              Observability Core · {mounted ? time.toLocaleTimeString() : ''}
            </div>
            <h1 className="dash-banner-title">
              System <span className="dash-banner-brand">Insights</span>
            </h1>
            <p className="dash-banner-sub">
              Monitor agent performance, latency, and operational costs across the forge.
            </p>
          </div>
          <div className="dash-banner-actions">
            <button onClick={loadData} className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <RotateCcw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="page-body" style={{ paddingTop: 24 }}>
        
        {/* ── Stats Grid ─────────────────────────────────────────── */}
        <div className="dash-stats-grid">
          <StatCard icon={<BarChart3 size={20} color="var(--accent-primary)" />} value={summary?.total_runs || 0}      label="Total Executions"   color="var(--accent-primary)" loading={loading} />
          <StatCard icon={<Target size={20} color="var(--accent-emerald)" />} value={summary?.success_rate || 0}    label="Avg Success Rate"   color="var(--accent-emerald)" loading={loading} suffix="%" />
          <StatCard icon={<Clock size={20} color="var(--accent-cyan)" />} value={summary?.avg_duration_ms / 1000 || 0} label="Avg Latency"  color="var(--accent-cyan)"    loading={loading} suffix="s" />
          <StatCard icon={<DollarSign size={20} color="var(--accent-amber)" />} value={summary?.total_cost_usd || 0}   label="Estimated Cost"     color="var(--accent-amber)"   loading={loading} suffix="$" />
        </div>

        <div className="dash-main-grid">
          {/* ── Usage History ───────────────────────────────────── */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
            <h2 className="dash-section-title mb-6" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <TrendingUp size={18} color="var(--accent-primary)" /> Usage History (7 Days)
            </h2>
            <div className="insight-chart-container">
              {loading ? (
                <div className="dash-skeleton-list w-full" style={{ height: 200 }}>
                   <div className="dash-skeleton-row" style={{ height: '100%' }} />
                </div>
              ) : history.length === 0 ? (
                <div className="empty-state w-full">No history data available</div>
              ) : (
                history.map((h, i) => (
                  <div key={i} className="insight-bar-wrapper">
                    <div className="insight-tooltip">{h.count} runs</div>
                    <div 
                      className="insight-bar" 
                      style={{ height: `${Math.max(8, (h.count / maxRuns) * 100)}%`, background: `linear-gradient(to top, var(--accent-glow), ${i === history.length - 1 ? 'var(--accent-light)' : 'var(--accent-primary)'})` }} 
                    />
                    <div className="insight-bar-label">{h.date.split('-').slice(1).join('/')}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ── Agent Performance Breakdown ─────────────────────── */}
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h2 className="dash-section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Bot size={18} color="var(--accent-primary)" /> Agent Performance
              </h2>
            </div>
            {loading ? (
              <div className="dash-skeleton-list">
                {[...Array(5)].map((_, i) => <div key={i} className="dash-skeleton-row" />)}
              </div>
            ) : breakdown.length === 0 ? (
              <div className="empty-state">No agent data available</div>
            ) : (
              <div className="table-wrap">
                <table className="performance-table">
                  <thead>
                    <tr>
                      <th>AGENT NAME</th>
                      <th>RUNS</th>
                      <th>COST (EST)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {breakdown.map((agent, i) => (
                      <tr key={i}>
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="dash-agent-avatar" style={{ width: 28, height: 28, fontSize: '0.75rem' }}>{agent.name?.[0]}</div>
                            <span className="font-medium text-sm">{agent.name}</span>
                          </div>
                        </td>
                        <td className="text-sm">{agent.runs}</td>
                        <td className="text-sm font-mono text-accent">${agent.cost}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* ── System Health / Info ──────────────────────────────── */}
        <div className="card" style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.05), rgba(124,58,237,0.05))' }}>
           <h2 className="dash-section-title mb-4" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
             <ShieldCheck size={18} color="var(--accent-primary)" /> Observability Status
           </h2>
           <div className="grid-3">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/5">
                 <CheckCircle2 size={24} color="var(--accent-emerald)" />
                 <div>
                    <div className="text-xs text-muted font-bold uppercase">Log Stream</div>
                    <div className="text-sm font-medium">Active & Secure</div>
                 </div>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/5">
                 <Zap size={24} color="var(--accent-cyan)" />
                 <div>
                    <div className="text-xs text-muted font-bold uppercase">Trace Engine</div>
                    <div className="text-sm font-medium">LangGraph Optimized</div>
                 </div>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/5">
                 <ShieldCheck size={24} color="var(--accent-amber)" />
                 <div>
                    <div className="text-xs text-muted font-bold uppercase">Guardrails</div>
                    <div className="text-sm font-medium">Active (0 violations)</div>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </>
  )

}
