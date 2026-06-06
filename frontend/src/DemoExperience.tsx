import { useState } from 'react'
import { api, DashboardStats } from './api'

interface Props {
  stats: DashboardStats | null
  onRefresh: () => void
  simulationRunning: boolean
}

const SCENARIOS = [
  { id: 'sales', label: 'Sales Workflow', desc: 'CRM proposals, deal strategy, pipeline management' },
  { id: 'support', label: 'Support Workflow', desc: 'Ticket resolution, escalations, SLA management' },
  { id: 'cloud', label: 'Cloud Migration', desc: 'Kubernetes, security hardening, infrastructure' },
  { id: 'healthcare', label: 'Healthcare Admin', desc: 'HIPAA compliance, EHR workflows, patient data' },
  { id: 'legal', label: 'Legal Document Review', desc: 'Contract analysis, compliance, IP review' },
]

const DEMO_STEPS = [
  { step: 1, title: 'Agents produce outputs', desc: 'Each active agent generates a text response to its assigned task.' },
  { step: 2, title: 'Outputs are embedded', desc: 'Each output is converted into a 64-dimensional vector in shared latent space.' },
  { step: 3, title: 'Trust engine scores them', desc: 'Anomaly score computed from neighbor distance, consensus divergence, and contradiction patterns.' },
  { step: 4, title: 'Accepted or quarantined', desc: 'Safe outputs join consensus memory. Suspicious outputs are quarantined for review.' },
  { step: 5, title: 'Consensus updates', desc: 'The shared ground truth vector shifts based on accepted outputs.' },
  { step: 6, title: 'Agents are re-scored', desc: 'Each agent\'s reputation updates based on their contribution quality.' },
]

export default function DemoExperience({ stats, onRefresh, simulationRunning }: Props) {
  const [loading, setLoading] = useState<string | null>(null)
  const [lastResult, setLastResult] = useState<any>(null)
  const [scenario, setScenario] = useState('sales')

  async function runAction(action: string, fn: () => Promise<any>) {
    setLoading(action)
    try {
      const result = await fn()
      setLastResult(result)
      await onRefresh()
    } catch (e: any) {
      alert(`Error: ${e.message}`)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Controls */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
              Simulation Controls
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Orchestrate the multi-agent watchdog pipeline
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {simulationRunning ? (
              <div className="sim-badge" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', background: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.3)', borderRadius: 20 }}>
                <span className="sim-dot" style={{ width: 8, height: 8, background: 'var(--accent-green)', borderRadius: '50%', animation: 'pulse-ring 1.5s infinite' }} />
                <span style={{ color: 'var(--accent-green)', fontWeight: 600, fontSize: 13 }}>Simulation running</span>
              </div>
            ) : (
              <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Simulation paused</span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            className="btn btn-success"
            disabled={simulationRunning || loading !== null}
            onClick={() => runAction('start', api.startSimulation)}
          >
            {loading === 'start' ? <span className="loading-spinner" /> : '▶'}
            Start Simulation
          </button>

          <button
            className="btn btn-primary"
            disabled={loading !== null}
            onClick={() => runAction('cycle', () => api.runCycle(false))}
          >
            {loading === 'cycle' ? <span className="loading-spinner" /> : '⇒'}
            Run One Cycle
          </button>

          <button
            className="btn btn-warning"
            disabled={loading !== null}
            onClick={() => runAction('advcycle', () => api.runCycle(true))}
          >
            {loading === 'advcycle' ? <span className="loading-spinner" /> : '⚡'}
            Force Adversarial Cycle
          </button>

          <button
            className="btn btn-ghost"
            disabled={!simulationRunning || loading !== null}
            onClick={() => runAction('stop', api.stopSimulation)}
          >
            {loading === 'stop' ? <span className="loading-spinner" /> : '■'}
            Pause
          </button>

          <button
            className="btn btn-danger"
            disabled={loading !== null}
            onClick={() => {
              if (confirm('Reset all demo data? This will clear all anchors and events.')) {
                runAction('reset', api.resetDemo)
              }
            }}
          >
            {loading === 'reset' ? <span className="loading-spinner" /> : '↺'}
            Reset Demo
          </button>
        </div>
      </div>

      {/* Scenario selector */}
      <div className="card">
        <div className="section-title">Current Scenario</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {SCENARIOS.map((s) => (
            <button
              key={s.id}
              onClick={() => setScenario(s.id)}
              style={{
                padding: '8px 14px',
                border: `1px solid ${scenario === s.id ? 'var(--accent-blue)' : 'var(--border)'}`,
                borderRadius: 'var(--radius-sm)',
                background: scenario === s.id ? 'rgba(0,212,255,0.1)' : 'transparent',
                color: scenario === s.id ? 'var(--accent-blue)' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: scenario === s.id ? 600 : 400,
                transition: 'all 0.15s',
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div style={{ marginTop: 10, fontSize: 13, color: 'var(--text-muted)' }}>
          {SCENARIOS.find((s) => s.id === scenario)?.desc}
        </div>
      </div>

      {/* Stats summary */}
      {stats && (
        <div className="grid-4">
          <MiniStat icon="◉" label="Cycle" value={stats.cycle_count} color="var(--accent-blue)" />
          <MiniStat icon="✓" label="Accepted" value={stats.total_anchors - stats.flagged_outputs - stats.quarantined_outputs} color="var(--accent-green)" />
          <MiniStat icon="⚠" label="Flagged" value={stats.flagged_outputs} color="var(--accent-yellow)" />
          <MiniStat icon="⊘" label="Quarantined" value={stats.quarantined_outputs} color="var(--accent-red)" />
        </div>
      )}

      {/* Last cycle result */}
      {lastResult && lastResult.anchors && (
        <div className="card">
          <div className="section-title">Last Cycle — {lastResult.anchors_created} outputs processed</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {lastResult.anchors.map((a: any) => (
              <div key={a.anchor_id} className="fade-in" style={{
                display: 'flex', gap: 10, alignItems: 'flex-start',
                padding: '8px 10px',
                background: statusBg(a.status),
                border: `1px solid ${statusBorder(a.status)}`,
                borderRadius: 'var(--radius-sm)',
              }}>
                <span className={`badge badge-${a.status}`} style={{ flexShrink: 0, marginTop: 2 }}>
                  {a.status}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 3 }}>
                    <strong style={{ color: 'var(--text-secondary)' }}>{a.agent_name}</strong>
                    {' · '}trust {a.trust_score.toFixed(0)}% · anomaly {(a.anomaly_score * 100).toFixed(0)}%
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    {a.text_payload.slice(0, 140)}{a.text_payload.length > 140 ? '...' : ''}
                  </div>
                  {a.reasons?.[0] && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, fontStyle: 'italic' }}>
                      {a.reasons[0]}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* How it works */}
      <div className="card">
        <div className="section-title">How the Pipeline Works</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {DEMO_STEPS.map((s) => (
            <div key={s.step} style={{
              padding: '12px',
              background: 'var(--bg-glass)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{
                  width: 22, height: 22, borderRadius: '50%',
                  background: 'var(--accent-blue)', color: '#000',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, flexShrink: 0,
                }}>
                  {s.step}
                </span>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {s.title}
                </span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function MiniStat({ icon, label, value, color }: { icon: string; label: string; value: number; color: string }) {
  return (
    <div className="card" style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 24, color }}>{icon}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color, marginTop: 4 }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
    </div>
  )
}

function statusBg(status: string) {
  return { accepted: 'rgba(0,255,136,0.05)', flagged: 'rgba(255,204,0,0.05)', quarantined: 'rgba(255,68,102,0.05)' }[status] ?? 'transparent'
}
function statusBorder(status: string) {
  return { accepted: 'rgba(0,255,136,0.2)', flagged: 'rgba(255,204,0,0.2)', quarantined: 'rgba(255,68,102,0.2)' }[status] ?? 'var(--border)'
}
