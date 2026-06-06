import { useEffect, useState, useCallback } from 'react'
import { api, DashboardStats, Agent, Anchor, Event } from './api'
import TrustDashboard from './TrustDashboard'
import DemoExperience from './DemoExperience'
import VectorSpace3D from './VectorSpace3D'
import ClusterScatter from './ClusterScatter'
import AgentTopology from './AgentTopology'
import PipelineStoryboard from './PipelineStoryboard'
import MemoryQuarantine from './MemoryQuarantine'
import AgentControlPanel from './AgentControlPanel'
import './App.css'

type Page =
  | 'dashboard'
  | 'demo'
  | 'latent'
  | 'cluster'
  | 'topology'
  | 'pipeline'
  | 'quarantine'
  | 'agents'

const NAV: { id: Page; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '◈' },
  { id: 'demo', label: 'Live Demo', icon: '▶' },
  { id: 'latent', label: 'Latent Space', icon: '◉' },
  { id: 'cluster', label: 'Cluster Analysis', icon: '⊞' },
  { id: 'topology', label: 'Agent Topology', icon: '⬡' },
  { id: 'pipeline', label: 'Pipeline', icon: '⇒' },
  { id: 'quarantine', label: 'Quarantine', icon: '⊘' },
  { id: 'agents', label: 'Agents', icon: '◧' },
]

export default function App() {
  const [page, setPage] = useState<Page>('dashboard')
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [agents, setAgents] = useState<Agent[]>([])
  const [anchors, setAnchors] = useState<Anchor[]>([])
  const [quarantine, setQuarantine] = useState<Anchor[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [connected, setConnected] = useState(false)
  const [lastRefresh, setLastRefresh] = useState(0)

  const refresh = useCallback(async () => {
    try {
      const [s, ag, an, q, ev] = await Promise.all([
        api.dashboard(),
        api.agents(),
        api.anchors(),
        api.quarantine(),
        api.events(0, 40),
      ])
      setStats(s)
      setAgents(ag)
      setAnchors(an)
      setQuarantine(q)
      setEvents(ev.events)
      setConnected(true)
      setLastRefresh(Date.now())
    } catch {
      setConnected(false)
    }
  }, [])

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 3000)
    return () => clearInterval(id)
  }, [refresh])

  const simulationRunning = stats?.simulation_running ?? false

  return (
    <div className="app-shell">
      {/* Left Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-icon">⬡</div>
          <div>
            <div className="brand-name">Houston</div>
            <div className="brand-sub">AI Watchdog</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {NAV.map((n) => (
            <button
              key={n.id}
              className={`nav-item ${page === n.id ? 'active' : ''} ${
                n.id === 'quarantine' && quarantine.length > 0 ? 'has-badge' : ''
              }`}
              onClick={() => setPage(n.id)}
            >
              <span className="nav-icon">{n.icon}</span>
              <span>{n.label}</span>
              {n.id === 'quarantine' && quarantine.length > 0 && (
                <span className="nav-count">{quarantine.length}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className={`conn-dot ${connected ? 'ok' : 'err'}`} />
          <span>{connected ? 'Backend connected' : 'Connecting...'}</span>
        </div>
      </aside>

      {/* Main area */}
      <div className="main-area">
        {/* Top status bar */}
        <header className="topbar">
          <div className="topbar-left">
            <h2 className="page-title">{NAV.find((n) => n.id === page)?.label}</h2>
            {simulationRunning && (
              <div className="sim-badge">
                <span className="sim-dot" />
                Live simulation
              </div>
            )}
          </div>
          <div className="topbar-stats">
            {stats && (
              <>
                <StatChip label="Agents" value={stats.active_agents} total={stats.total_agents} />
                <StatChip label="Trust" value={`${stats.average_trust_score}%`} />
                <StatChip label="Stability" value={`${(stats.consensus_stability * 100).toFixed(0)}%`} />
                <span className={`badge badge-${stats.current_risk_level}`}>
                  {stats.current_risk_level} risk
                </span>
              </>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="content">
          {page === 'dashboard' && <TrustDashboard stats={stats} agents={agents} onRefresh={refresh} />}
          {page === 'demo' && (
            <DemoExperience
              stats={stats}
              onRefresh={refresh}
              simulationRunning={simulationRunning}
            />
          )}
          {page === 'latent' && <VectorSpace3D anchors={anchors} />}
          {page === 'cluster' && <ClusterScatter anchors={anchors} />}
          {page === 'topology' && <AgentTopology agents={agents} />}
          {page === 'pipeline' && <PipelineStoryboard events={events} anchors={anchors} />}
          {page === 'quarantine' && (
            <MemoryQuarantine quarantine={quarantine} onRefresh={refresh} />
          )}
          {page === 'agents' && (
            <AgentControlPanel agents={agents} onRefresh={refresh} />
          )}
        </main>

        {/* Bottom event stream */}
        <footer className="event-stream">
          <span className="stream-label">Event stream</span>
          <div className="stream-items">
            {events.slice(0, 8).map((e) => (
              <div key={e.event_id} className={`stream-item sev-${e.severity}`}>
                <span className="stream-time">
                  {new Date(e.timestamp).toLocaleTimeString()}
                </span>
                <span>{e.message}</span>
              </div>
            ))}
            {events.length === 0 && (
              <span className="stream-empty">Waiting for events...</span>
            )}
          </div>
        </footer>
      </div>
    </div>
  )
}

function StatChip({ label, value, total }: { label: string; value: string | number; total?: number }) {
  return (
    <div className="stat-chip">
      <span className="stat-label">{label}</span>
      <span className="stat-value">
        {value}
        {total !== undefined ? <span className="stat-total">/{total}</span> : null}
      </span>
    </div>
  )
}
