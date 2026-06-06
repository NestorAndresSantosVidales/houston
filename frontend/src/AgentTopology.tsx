import { useState } from 'react'
import { Agent } from './api'

interface Props {
  agents: Agent[]
}

type Mode = 'mesh' | 'watchdog'

const STATUS_COLORS: Record<string, string> = {
  active:     '#00d4ff',
  suspicious: '#ff8800',
  quarantined:'#ff4466',
  removed:    '#445566',
}

export default function AgentTopology({ agents }: Props) {
  const [mode, setMode] = useState<Mode>('watchdog')

  const activeAgents = agents.filter((a) => a.status !== 'removed')
  const n = activeAgents.length

  const meshConnections = n > 1 ? (n * (n - 1)) / 2 : 0
  const watchdogConnections = n
  const reduction = meshConnections > 0
    ? Math.round((1 - watchdogConnections / meshConnections) * 100)
    : 0

  // SVG layout
  const W = 680
  const H = 400
  const CX = W / 2
  const CY = H / 2
  const RADIUS = 150

  // Agent node positions around a circle
  const positions = activeAgents.map((_, i) => {
    const angle = (i / n) * 2 * Math.PI - Math.PI / 2
    return {
      x: CX + RADIUS * Math.cos(angle),
      y: CY + RADIUS * Math.sin(angle),
    }
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Mode toggle */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Topology view:</span>
        <button
          className={`btn ${mode === 'mesh' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setMode('mesh')}
        >
          Mesh (traditional)
        </button>
        <button
          className={`btn ${mode === 'watchdog' ? 'btn-success' : 'btn-ghost'}`}
          onClick={() => setMode('watchdog')}
        >
          Watchdog (shared memory)
        </button>
      </div>

      {/* Metrics */}
      <div className="grid-3">
        <MetricCard
          label="Mesh connections"
          value={meshConnections}
          sub={`n × (n−1) / 2 = ${n} × ${n - 1} / 2`}
          color="var(--accent-red)"
        />
        <MetricCard
          label="Watchdog connections"
          value={watchdogConnections}
          sub={`n = ${n} (one per agent)`}
          color="var(--accent-green)"
        />
        <MetricCard
          label="Complexity reduction"
          value={`${reduction}%`}
          sub="fewer connections, same intelligence"
          color="var(--accent-blue)"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
        {/* SVG topology */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            style={{ width: '100%', display: 'block', background: 'var(--bg-primary)' }}
          >
            <defs>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Mesh mode: draw all edges between agents */}
            {mode === 'mesh' &&
              activeAgents.flatMap((_, i) =>
                activeAgents.slice(i + 1).map((_, jOffset) => {
                  const j = i + 1 + jOffset
                  return (
                    <line
                      key={`${i}-${j}`}
                      x1={positions[i].x} y1={positions[i].y}
                      x2={positions[j].x} y2={positions[j].y}
                      stroke="rgba(255,68,102,0.25)"
                      strokeWidth="1"
                    />
                  )
                })
              )
            }

            {/* Watchdog mode: draw edges to central memory node */}
            {mode === 'watchdog' &&
              positions.map((pos, i) => (
                <line
                  key={i}
                  x1={pos.x} y1={pos.y}
                  x2={CX} y2={CY}
                  stroke={`${STATUS_COLORS[activeAgents[i].status]}55`}
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />
              ))
            }

            {/* Central node (Watchdog mode) */}
            {mode === 'watchdog' && (
              <g filter="url(#glow)">
                <circle cx={CX} cy={CY} r={28} fill="rgba(0,212,255,0.1)" stroke="rgba(0,212,255,0.5)" strokeWidth="1.5" />
                <circle cx={CX} cy={CY} r={18} fill="rgba(0,212,255,0.2)" />
                <text x={CX} y={CY - 2} textAnchor="middle" fill="#00d4ff" fontSize="9" fontWeight="600">LATENT</text>
                <text x={CX} y={CY + 9} textAnchor="middle" fill="#00d4ff" fontSize="9" fontWeight="600">MEMORY</text>
              </g>
            )}

            {/* Agent nodes */}
            {activeAgents.map((agent, i) => {
              const { x, y } = positions[i]
              const color = STATUS_COLORS[agent.status] ?? '#8899aa'
              const label = agent.name.replace(' Agent', '').slice(0, 10)
              return (
                <g key={agent.agent_id} filter="url(#glow)">
                  <circle cx={x} cy={y} r={20} fill={`${color}22`} stroke={color} strokeWidth="1.5" />
                  <text x={x} y={y + 4} textAnchor="middle" fill={color} fontSize="11" fontWeight="600">
                    {label}
                  </text>
                  {/* Trust score indicator */}
                  <text x={x} y={y + 32} textAnchor="middle" fill="rgba(136,153,170,0.7)" fontSize="9">
                    {agent.trust_score.toFixed(0)}%
                  </text>
                </g>
              )
            })}
          </svg>
        </div>

        {/* Explanation */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card">
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
              {mode === 'mesh' ? 'Traditional Mesh Architecture' : 'Watchdog Architecture'}
            </div>
            {mode === 'mesh' ? (
              <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Every agent communicates directly with every other agent.
                Complexity grows as <strong style={{ color: 'var(--accent-red)' }}>O(n²)</strong>.
                With {n} agents: <strong style={{ color: 'var(--accent-red)' }}>{meshConnections} connections</strong>.
                One compromised agent can poison all others.
              </p>
            ) : (
              <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Every agent connects only to the shared latent memory.
                Complexity is <strong style={{ color: 'var(--accent-green)' }}>O(n)</strong>.
                With {n} agents: <strong style={{ color: 'var(--accent-green)' }}>{watchdogConnections} connections</strong>.
                Quarantine intercepts bad outputs before they reach consensus.
              </p>
            )}
          </div>

          <div className="card">
            <div className="section-title">Agent Status</div>
            {activeAgents.map((a) => (
              <div key={a.agent_id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '5px 0', borderBottom: '1px solid var(--border)', fontSize: 12,
              }}>
                <span style={{ color: 'var(--text-secondary)' }}>
                  {a.name.replace(' Agent', '')}
                </span>
                <span className={`badge badge-${a.status}`}>{a.status}</span>
              </div>
            ))}
          </div>

          <div className="card" style={{ background: 'rgba(0,255,136,0.05)', border: '1px solid rgba(0,255,136,0.2)' }}>
            <div style={{ fontSize: 12, color: 'var(--accent-green)', fontWeight: 600, marginBottom: 6 }}>
              Why this matters
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Houston AI Watchdog reduces agent interconnect from{' '}
              <strong style={{ color: 'var(--accent-red)' }}>{meshConnections}</strong> to{' '}
              <strong style={{ color: 'var(--accent-green)' }}>{watchdogConnections}</strong> connections
              — a <strong style={{ color: 'var(--accent-green)' }}>{reduction}% reduction</strong> —
              while adding trust scoring, quarantine, and hallucination prevention that the mesh topology cannot provide.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function MetricCard({ label, value, sub, color }: {
  label: string; value: string | number; sub: string; color: string
}) {
  return (
    <div className="card">
      <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 32, fontWeight: 700, color, letterSpacing: '-0.02em', lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>{sub}</div>
    </div>
  )
}
