import { DashboardStats, Agent } from './api'

interface Props {
  stats: DashboardStats | null
  agents: Agent[]
  onRefresh: () => void
}

export default function TrustDashboard({ stats, agents }: Props) {
  if (!stats) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div className="loading-spinner" />
        <span style={{ marginLeft: 12, color: 'var(--text-muted)' }}>Loading dashboard...</span>
      </div>
    )
  }

  const trustColor =
    stats.average_trust_score >= 80
      ? 'var(--accent-green)'
      : stats.average_trust_score >= 60
      ? 'var(--accent-yellow)'
      : 'var(--accent-red)'

  const stabilityColor =
    stats.consensus_stability >= 0.9
      ? 'var(--accent-green)'
      : stats.consensus_stability >= 0.7
      ? 'var(--accent-yellow)'
      : 'var(--accent-red)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* KPI row */}
      <div className="grid-4">
        <KpiCard
          label="Average Trust Score"
          value={`${stats.average_trust_score}%`}
          color={trustColor}
          sub="across active agents"
          icon="◈"
        />
        <KpiCard
          label="Consensus Stability"
          value={`${(stats.consensus_stability * 100).toFixed(1)}%`}
          color={stabilityColor}
          sub="shared memory coherence"
          icon="◉"
        />
        <KpiCard
          label="Quarantined Outputs"
          value={stats.quarantined_outputs}
          color={stats.quarantined_outputs > 0 ? 'var(--accent-red)' : 'var(--accent-green)'}
          sub="blocked from memory"
          icon="⊘"
        />
        <KpiCard
          label="Overall Risk"
          value={stats.current_risk_level.toUpperCase()}
          color={riskColor(stats.current_risk_level)}
          sub={`${stats.suspicious_agents} suspicious agent${stats.suspicious_agents !== 1 ? 's' : ''}`}
          icon="⚠"
        />
      </div>

      {/* Second row */}
      <div className="grid-4">
        <KpiCard label="Active Agents"      value={`${stats.active_agents}/${stats.total_agents}`}  color="var(--accent-blue)"   sub="online and processing" icon="◧" />
        <KpiCard label="Total Outputs"      value={stats.total_outputs}                              color="var(--accent-blue)"   sub="processed this session" icon="⇒" />
        <KpiCard label="Flagged Outputs"    value={stats.flagged_outputs}                            color="var(--accent-yellow)" sub="under monitoring" icon="⚡" />
        <KpiCard label="Memory Anchors"     value={stats.total_anchors}                              color="var(--accent-purple)" sub="in latent store" icon="⬡" />
      </div>

      {/* Agents trust table */}
      <div className="card">
        <div className="section-title">Agent Reputation Scores</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {agents.map((a) => (
            <AgentRow key={a.agent_id} agent={a} />
          ))}
        </div>
      </div>

      {/* Recent events */}
      <div className="card">
        <div className="section-title">Recent Activity</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {stats.recent_events.slice(0, 8).map((e: any) => (
            <div key={e.event_id} style={{
              display: 'flex', gap: 10, alignItems: 'flex-start',
              padding: '6px 0',
              borderBottom: '1px solid var(--border)',
              fontSize: 13,
            }}>
              <span style={{ color: 'var(--text-muted)', fontSize: 11, whiteSpace: 'nowrap', marginTop: 2 }}>
                {new Date(e.timestamp).toLocaleTimeString()}
              </span>
              <span className={`badge badge-${e.severity === 'error' ? 'quarantined' : e.severity === 'warning' ? 'flagged' : 'accepted'}`}
                style={{ flexShrink: 0 }}>
                {e.severity}
              </span>
              <span style={{ color: 'var(--text-secondary)' }}>{e.message}</span>
            </div>
          ))}
          {stats.recent_events.length === 0 && (
            <p style={{ color: 'var(--text-muted)', fontSize: 13, fontStyle: 'italic' }}>
              No events yet — run a cycle to start.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function KpiCard({ label, value, color, sub, icon }: {
  label: string; value: string | number; color: string; sub: string; icon: string
}) {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {label}
        </span>
        <span style={{ fontSize: 18, color }}>{icon}</span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color, lineHeight: 1, letterSpacing: '-0.02em' }}>
        {value}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{sub}</div>
    </div>
  )
}

function AgentRow({ agent }: { agent: Agent }) {
  const trust = agent.trust_score
  const barColor =
    trust >= 80 ? 'var(--accent-green)' :
    trust >= 60 ? 'var(--accent-yellow)' :
    trust >= 40 ? 'var(--accent-orange)' : 'var(--accent-red)'

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '160px 80px 1fr 80px 80px',
      gap: 12,
      alignItems: 'center',
      padding: '6px 0',
      borderBottom: '1px solid rgba(255,255,255,0.04)',
    }}>
      <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>
        {agent.name}
      </span>
      <span className={`badge badge-${agent.status}`}>{agent.status}</span>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Trust</span>
          <span style={{ fontSize: 11, color: barColor, fontWeight: 600 }}>{trust.toFixed(0)}%</span>
        </div>
        <div className="score-bar">
          <div className="score-bar-fill" style={{ width: `${trust}%`, background: barColor }} />
        </div>
      </div>
      <span style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
        {agent.total_outputs} out
      </span>
      <span style={{ fontSize: 12, color: agent.anomaly_rate > 0.2 ? 'var(--accent-red)' : 'var(--text-muted)', textAlign: 'center' }}>
        {(agent.anomaly_rate * 100).toFixed(0)}% anom
      </span>
    </div>
  )
}

function riskColor(risk: string) {
  return { low: 'var(--accent-green)', medium: 'var(--accent-yellow)', high: 'var(--accent-orange)', critical: 'var(--accent-red)' }[risk] ?? 'var(--text-secondary)'
}
