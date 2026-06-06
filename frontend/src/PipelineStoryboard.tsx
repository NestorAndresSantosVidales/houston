import { useEffect, useState } from 'react'
import { Anchor, Event } from './api'

interface Props {
  events: Event[]
  anchors: Anchor[]
}

const PIPELINE_STEPS = [
  { id: 'generate',  icon: '◧', label: 'Agent generates output',     desc: 'Task assigned, response produced' },
  { id: 'embed',     icon: '⬡', label: 'Output is embedded',         desc: '64D vector created in latent space' },
  { id: 'score',     icon: '◈', label: 'Trust engine scores it',     desc: 'Anomaly, consensus, contradiction signals' },
  { id: 'route',     icon: '⇒', label: 'Accepted or quarantined',    desc: 'Safe outputs enter memory; bad outputs blocked' },
  { id: 'consensus', icon: '◉', label: 'Consensus updates',          desc: 'Shared ground truth vector shifts' },
  { id: 'dashboard', icon: '⊞', label: 'Dashboard updates',          desc: 'Agents re-scored, risk level recalculated' },
]

const EVENT_STEP_MAP: Record<string, string> = {
  cycle_start:          'generate',
  output_accepted:      'route',
  output_flagged:       'route',
  output_quarantined:   'route',
  cycle_complete:       'dashboard',
}

export default function PipelineStoryboard({ events, anchors }: Props) {
  const [activeStep, setActiveStep] = useState<string | null>(null)
  const [recentOutputs, setRecentOutputs] = useState<Anchor[]>([])

  useEffect(() => {
    if (events.length === 0) return
    const latest = events[0]
    const step = EVENT_STEP_MAP[latest.event_type]
    if (step) {
      setActiveStep(step)
      // Progress through steps with a delay
      const progression: Record<string, string[]> = {
        generate:  ['generate', 'embed'],
        route:     ['embed', 'score', 'route'],
        dashboard: ['consensus', 'dashboard'],
      }
      const sequence = progression[step] ?? [step]
      sequence.forEach((s, i) => {
        setTimeout(() => setActiveStep(s), i * 600)
      })
    }
  }, [events])

  useEffect(() => {
    setRecentOutputs(anchors.slice(0, 5))
  }, [anchors])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Pipeline steps */}
      <div className="card">
        <div className="section-title">Output Pipeline</div>
        <div style={{ display: 'flex', alignItems: 'stretch', gap: 0, overflowX: 'auto', padding: '8px 0' }}>
          {PIPELINE_STEPS.map((step, i) => {
            const isActive = activeStep === step.id
            const color = isActive ? 'var(--accent-blue)' : 'var(--text-muted)'
            return (
              <div key={step.id} style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 120 }}>
                <div style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '12px 8px',
                  background: isActive ? 'rgba(0,212,255,0.08)' : 'transparent',
                  border: `1px solid ${isActive ? 'rgba(0,212,255,0.4)' : 'rgba(255,255,255,0.05)'}`,
                  borderRadius: 'var(--radius-sm)',
                  transition: 'all 0.4s ease',
                  boxShadow: isActive ? '0 0 20px rgba(0,212,255,0.15)' : 'none',
                }}>
                  <span style={{ fontSize: 22, color, transition: 'color 0.3s' }}>
                    {step.icon}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 600, color, textAlign: 'center', marginTop: 6, transition: 'color 0.3s' }}>
                    {step.label}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginTop: 3 }}>
                    {step.desc}
                  </span>
                  {isActive && (
                    <div style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: 'var(--accent-blue)',
                      marginTop: 8,
                      animation: 'pulse-ring 1.2s infinite',
                    }} />
                  )}
                </div>
                {i < PIPELINE_STEPS.length - 1 && (
                  <div style={{
                    padding: '0 4px',
                    color: 'var(--text-muted)',
                    fontSize: 18,
                    flexShrink: 0,
                  }}>
                    →
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Recent output cards */}
      <div className="card">
        <div className="section-title">Recent Outputs Through Pipeline</div>
        {recentOutputs.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 13, fontStyle: 'italic' }}>
            No outputs yet — run a simulation cycle.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {recentOutputs.map((a) => (
              <PipelineOutputCard key={a.anchor_id} anchor={a} />
            ))}
          </div>
        )}
      </div>

      {/* Live event log */}
      <div className="card">
        <div className="section-title">Live Event Log</div>
        <div style={{
          maxHeight: 250,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}>
          {events.slice(0, 20).map((e) => (
            <div key={e.event_id} className="fade-in" style={{
              display: 'flex', gap: 10, alignItems: 'flex-start',
              padding: '5px 0',
              borderBottom: '1px solid rgba(255,255,255,0.04)',
              fontSize: 12,
            }}>
              <span style={{ color: 'var(--text-muted)', fontSize: 11, whiteSpace: 'nowrap', paddingTop: 1 }}>
                {new Date(e.timestamp).toLocaleTimeString()}
              </span>
              <EventDot severity={e.severity} />
              <span style={{
                color: e.severity === 'error' ? 'var(--accent-red)' :
                       e.severity === 'warning' ? 'var(--accent-yellow)' :
                       'var(--text-secondary)',
              }}>
                {e.message}
              </span>
            </div>
          ))}
          {events.length === 0 && (
            <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: 12 }}>
              Waiting for events...
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function PipelineOutputCard({ anchor }: { anchor: Anchor }) {
  const steps: Array<{ id: string; label: string; done: boolean; current: boolean }> = [
    { id: 'generate',  label: 'Generated', done: true, current: false },
    { id: 'embed',     label: 'Embedded',  done: true, current: false },
    { id: 'score',     label: 'Scored',    done: true, current: false },
    { id: 'route',     label: anchor.status === 'accepted' ? 'Accepted' : anchor.status === 'quarantined' ? 'Quarantined' : 'Flagged',
      done: true, current: true },
    { id: 'consensus', label: anchor.status === 'accepted' ? 'In Consensus' : 'Blocked', done: anchor.status === 'accepted', current: false },
  ]

  return (
    <div style={{
      padding: 12,
      background: 'var(--bg-glass)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-sm)',
    }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
        <span className={`badge badge-${anchor.status}`}>{anchor.status}</span>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{anchor.agent_name}</span>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 'auto' }}>
          trust {anchor.trust_score.toFixed(0)}%
        </span>
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8, lineHeight: 1.4 }}>
        {anchor.text_payload.slice(0, 100)}{anchor.text_payload.length > 100 ? '...' : ''}
      </div>
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        {steps.map((s, i) => (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{
              fontSize: 10,
              padding: '2px 7px',
              borderRadius: 10,
              background: s.done
                ? s.current
                  ? anchor.status === 'accepted' ? 'rgba(0,255,136,0.2)' : anchor.status === 'quarantined' ? 'rgba(255,68,102,0.2)' : 'rgba(255,204,0,0.2)'
                  : 'rgba(0,212,255,0.1)'
                : 'rgba(255,255,255,0.05)',
              color: s.done
                ? s.current
                  ? anchor.status === 'accepted' ? 'var(--accent-green)' : anchor.status === 'quarantined' ? 'var(--accent-red)' : 'var(--accent-yellow)'
                  : 'var(--accent-blue)'
                : 'var(--text-muted)',
              fontWeight: 600,
            }}>
              {s.label}
            </span>
            {i < steps.length - 1 && (
              <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>→</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function EventDot({ severity }: { severity: string }) {
  const color = {
    info: 'var(--accent-blue)',
    warning: 'var(--accent-yellow)',
    error: 'var(--accent-red)',
    critical: 'var(--accent-red)',
  }[severity] ?? 'var(--text-muted)'
  return (
    <div style={{
      width: 6, height: 6, borderRadius: '50%',
      background: color, flexShrink: 0, marginTop: 4,
    }} />
  )
}
