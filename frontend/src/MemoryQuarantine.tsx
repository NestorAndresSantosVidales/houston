import { useState } from 'react'
import { Anchor, api } from './api'

interface Props {
  quarantine: Anchor[]
  onRefresh: () => void
}

export default function MemoryQuarantine({ quarantine, onRefresh }: Props) {
  const [processing, setProcessing] = useState<string | null>(null)

  async function approve(id: string) {
    setProcessing(id)
    try {
      await api.approveQuarantine(id)
      await onRefresh()
    } catch (e: any) {
      alert(`Error: ${e.message}`)
    } finally {
      setProcessing(null)
    }
  }

  async function reject(id: string) {
    setProcessing(id)
    try {
      await api.rejectQuarantine(id)
      await onRefresh()
    } catch (e: any) {
      alert(`Error: ${e.message}`)
    } finally {
      setProcessing(null)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Header */}
      <div className="card" style={{ background: 'rgba(255,68,102,0.06)', border: '1px solid rgba(255,68,102,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 24, color: 'var(--accent-red)' }}>⊘</span>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
              Memory Quarantine
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {quarantine.length > 0
                ? `${quarantine.length} suspicious output${quarantine.length !== 1 ? 's' : ''} blocked from consensus — awaiting review`
                : 'No items in quarantine — all outputs passed trust scoring'}
            </div>
          </div>
          {quarantine.length > 0 && (
            <span className="badge badge-quarantined" style={{ marginLeft: 'auto', fontSize: 14, padding: '4px 12px' }}>
              {quarantine.length} blocked
            </span>
          )}
        </div>
      </div>

      {/* Quarantine items */}
      {quarantine.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 36, marginBottom: 12, color: 'var(--accent-green)' }}>✓</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
            Quarantine is clear
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            All recent outputs have passed trust scoring and been accepted into consensus memory.
            Run a simulation cycle to generate new outputs.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {quarantine.map((item) => (
            <QuarantineCard
              key={item.anchor_id}
              item={item}
              processing={processing === item.anchor_id}
              onApprove={() => approve(item.anchor_id)}
              onReject={() => reject(item.anchor_id)}
            />
          ))}
        </div>
      )}

      {/* Explanation */}
      <div className="card">
        <div className="section-title">How Quarantine Works</div>
        <div className="grid-3">
          <ExplainCard
            icon="⚡"
            title="Detection"
            color="var(--accent-yellow)"
            desc="When an output's trust score falls below 40%, it is automatically intercepted before reaching the shared memory."
          />
          <ExplainCard
            icon="⊘"
            title="Isolation"
            color="var(--accent-red)"
            desc="The suspicious output is held in quarantine. It cannot influence the consensus vector or propagate to other agents."
          />
          <ExplainCard
            icon="◈"
            title="Human Review"
            color="var(--accent-blue)"
            desc="A human reviewer can approve the output (it joins consensus) or reject it (it is discarded permanently)."
          />
        </div>
      </div>
    </div>
  )
}

function QuarantineCard({
  item, processing, onApprove, onReject,
}: {
  item: Anchor
  processing: boolean
  onApprove: () => void
  onReject: () => void
}) {
  const [expanded, setExpanded] = useState(false)

  const riskColor =
    item.risk_level === 'critical' ? 'var(--accent-red)' :
    item.risk_level === 'high'     ? 'var(--accent-orange)' :
    item.risk_level === 'medium'   ? 'var(--accent-yellow)' :
    'var(--accent-green)'

  return (
    <div className="fade-in" style={{
      background: 'rgba(255,68,102,0.04)',
      border: '1px solid rgba(255,68,102,0.25)',
      borderRadius: 'var(--radius)',
      padding: 16,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
              {item.agent_name}
            </span>
            <span className={`badge badge-${item.risk_level}`}>{item.risk_level} risk</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {new Date(item.timestamp).toLocaleTimeString()}
            </span>
          </div>

          {/* Scores */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 8 }}>
            <ScorePill label="Trust" value={item.trust_score} lowIsBad={false} />
            <ScorePill label="Anomaly" value={item.anomaly_score * 100} lowIsBad={true} />
          </div>

          {/* Output snippet */}
          <div style={{
            fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5,
            background: 'rgba(255,68,102,0.06)', padding: '8px 10px',
            borderRadius: 6, borderLeft: '3px solid rgba(255,68,102,0.5)',
          }}>
            {expanded ? item.text_payload : item.text_payload.slice(0, 160) + (item.text_payload.length > 160 ? '...' : '')}
            {item.text_payload.length > 160 && (
              <button
                onClick={() => setExpanded(!expanded)}
                style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', cursor: 'pointer', fontSize: 12, marginLeft: 6 }}
              >
                {expanded ? 'show less' : 'show more'}
              </button>
            )}
          </div>

          {/* Reasons */}
          {item.reasons.length > 0 && (
            <div style={{ marginTop: 8 }}>
              {item.reasons.map((r, i) => (
                <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', marginBottom: 3 }}>
                  <span style={{ color: 'var(--accent-red)', fontSize: 11, marginTop: 1, flexShrink: 0 }}>✗</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4 }}>{r}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button
          className="btn btn-danger"
          disabled={processing}
          onClick={onReject}
        >
          {processing ? <span className="loading-spinner" /> : '✗'}
          Reject & Discard
        </button>
        <button
          className="btn btn-success"
          disabled={processing}
          onClick={onApprove}
        >
          {processing ? <span className="loading-spinner" /> : '✓'}
          Approve & Merge
        </button>
      </div>
    </div>
  )
}

function ScorePill({ label, value, lowIsBad }: { label: string; value: number; lowIsBad: boolean }) {
  const pct = Math.min(100, Math.max(0, value))
  const bad = lowIsBad ? pct > 40 : pct < 60
  const color = bad ? 'var(--accent-red)' : 'var(--text-muted)'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color }}>{pct.toFixed(0)}%</span>
    </div>
  )
}

function ExplainCard({ icon, title, desc, color }: { icon: string; title: string; desc: string; color: string }) {
  return (
    <div style={{ padding: 12, background: 'var(--bg-glass)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
      <div style={{ fontSize: 20, color, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{title}</div>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>{desc}</p>
    </div>
  )
}
