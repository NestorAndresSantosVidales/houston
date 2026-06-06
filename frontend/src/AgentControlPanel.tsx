import { useState } from 'react'
import { Agent, api } from './api'

interface Props {
  agents: Agent[]
  onRefresh: () => void
}

export default function AgentControlPanel({ agents, onRefresh }: Props) {
  const [processing, setProcessing] = useState<string | null>(null)
  const [selected, setSelected] = useState<Agent | null>(null)

  async function doAction(agentId: string, action: 'remove' | 'restore') {
    setProcessing(agentId)
    try {
      if (action === 'remove') await api.removeAgent(agentId)
      else await api.restoreAgent(agentId)
      await onRefresh()
      setSelected(null)
    } catch (e: any) {
      alert(`Error: ${e.message}`)
    } finally {
      setProcessing(null)
    }
  }

  const active   = agents.filter((a) => a.status === 'active')
  const suspicious = agents.filter((a) => a.status === 'suspicious')
  const removed  = agents.filter((a) => a.status === 'removed')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Summary */}
      <div className="grid-3">
        <SummaryCard label="Active" value={active.length} color="var(--accent-green)" icon="◧" />
        <SummaryCard label="Suspicious" value={suspicious.length} color="var(--accent-orange)" icon="⚠" />
        <SummaryCard label="Removed" value={removed.length} color="var(--text-muted)" icon="⊘" />
      </div>

      {/* Agent table */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 16 }}>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
            <span className="section-title" style={{ margin: 0 }}>All Agents</span>
          </div>
          <div>
            {agents.map((agent) => (
              <AgentRow
                key={agent.agent_id}
                agent={agent}
                selected={selected?.agent_id === agent.agent_id}
                processing={processing === agent.agent_id}
                onSelect={() => setSelected(selected?.agent_id === agent.agent_id ? null : agent)}
                onRemove={() => doAction(agent.agent_id, 'remove')}
                onRestore={() => doAction(agent.agent_id, 'restore')}
              />
            ))}
          </div>
        </div>

        {/* Inspector panel */}
        <div>
          {selected ? (
            <AgentInspector agent={selected} />
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: 32 }}>
              <div style={{ fontSize: 28, color: 'var(--text-muted)', marginBottom: 10 }}>◧</div>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Select an agent to inspect its reputation, last output, and anomaly history.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function AgentRow({ agent, selected, processing, onSelect, onRemove, onRestore }: {
  agent: Agent
  selected: boolean
  processing: boolean
  onSelect: () => void
  onRemove: () => void
  onRestore: () => void
}) {
  const trustColor =
    agent.trust_score >= 80 ? 'var(--accent-green)' :
    agent.trust_score >= 60 ? 'var(--accent-yellow)' :
    agent.trust_score >= 40 ? 'var(--accent-orange)' : 'var(--accent-red)'

  return (
    <div
      onClick={onSelect}
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 90px 80px 80px 90px',
        gap: 8,
        alignItems: 'center',
        padding: '10px 16px',
        borderBottom: '1px solid var(--border)',
        cursor: 'pointer',
        background: selected ? 'rgba(0,212,255,0.05)' : 'transparent',
        transition: 'background 0.15s',
      }}
    >
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{agent.name}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{agent.role}</div>
      </div>
      <span className={`badge badge-${agent.status}`}>{agent.status}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: trustColor }}>
        {agent.trust_score.toFixed(0)}%
      </span>
      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
        {agent.total_outputs} outputs
      </span>
      <div style={{ display: 'flex', gap: 6 }} onClick={(e) => e.stopPropagation()}>
        {agent.status !== 'removed' ? (
          <button
            className="btn btn-danger"
            style={{ padding: '4px 10px', fontSize: 11 }}
            disabled={processing}
            onClick={onRemove}
          >
            {processing ? <span className="loading-spinner" /> : 'Remove'}
          </button>
        ) : (
          <button
            className="btn btn-ghost"
            style={{ padding: '4px 10px', fontSize: 11 }}
            disabled={processing}
            onClick={onRestore}
          >
            {processing ? <span className="loading-spinner" /> : 'Restore'}
          </button>
        )}
      </div>
    </div>
  )
}

function AgentInspector({ agent }: { agent: Agent }) {
  const trustColor =
    agent.trust_score >= 80 ? 'var(--accent-green)' :
    agent.trust_score >= 60 ? 'var(--accent-yellow)' :
    agent.trust_score >= 40 ? 'var(--accent-orange)' : 'var(--accent-red)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div className="card">
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
          {agent.name}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          <Metric label="Status" value={<span className={`badge badge-${agent.status}`}>{agent.status}</span>} />
          <Metric label="Role" value={agent.role} />
          <Metric label="Trust Score" value={<span style={{ color: trustColor, fontWeight: 700 }}>{agent.trust_score.toFixed(1)}%</span>} />
          <Metric label="Anomaly Rate" value={
            <span style={{ color: agent.anomaly_rate > 0.3 ? 'var(--accent-red)' : 'var(--text-secondary)' }}>
              {(agent.anomaly_rate * 100).toFixed(0)}%
            </span>
          } />
          <Metric label="Total Outputs" value={agent.total_outputs} />
          <Metric label="Flagged Outputs" value={
            <span style={{ color: agent.flagged_outputs > 0 ? 'var(--accent-yellow)' : 'var(--text-secondary)' }}>
              {agent.flagged_outputs}
            </span>
          } />
        </div>

        {/* Trust bar */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
            <span>Reputation score</span>
            <span style={{ color: trustColor }}>{agent.trust_score.toFixed(1)}%</span>
          </div>
          <div className="score-bar" style={{ height: 6 }}>
            <div className="score-bar-fill" style={{ width: `${agent.trust_score}%`, background: trustColor }} />
          </div>
        </div>
      </div>

      {/* Last output */}
      {agent.last_output && (
        <div className="card">
          <div className="section-title">Last Output</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, fontStyle: 'italic' }}>
            "{agent.last_output}"
          </div>
        </div>
      )}

      {/* Permissions */}
      <div className="card">
        <div className="section-title">Permissions</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {agent.permissions.map((p) => (
            <span key={p} style={{
              fontSize: 11, padding: '3px 8px',
              background: 'rgba(0,212,255,0.1)',
              border: '1px solid rgba(0,212,255,0.2)',
              borderRadius: 4, color: 'var(--accent-blue)',
              fontFamily: 'monospace',
            }}>
              {p}
            </span>
          ))}
        </div>
      </div>

      {/* Member since */}
      <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
        Active since {new Date(agent.created_at).toLocaleDateString()}
      </div>
    </div>
  )
}

function SummaryCard({ label, value, color, icon }: { label: string; value: number; color: string; icon: string }) {
  return (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <span style={{ fontSize: 28, color }}>{icon}</span>
      <div>
        <div style={{ fontSize: 26, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
        {label}
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{value}</div>
    </div>
  )
}
