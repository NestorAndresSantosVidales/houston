import { useEffect, useRef } from 'react'
import { Anchor } from './api'

interface Props {
  anchors: Anchor[]
}

const STATUS_COLORS: Record<string, string> = {
  accepted:    '#00ff88',
  flagged:     '#ffcc00',
  quarantined: '#ff4466',
}

export default function ClusterScatter({ anchors }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const W = canvas.width
    const H = canvas.height
    const PAD = 60

    ctx.clearRect(0, 0, W, H)

    // Background
    ctx.fillStyle = '#080c14'
    ctx.fillRect(0, 0, W, H)

    // Axes
    const plotW = W - PAD * 2
    const plotH = H - PAD * 2

    // Grid lines
    ctx.strokeStyle = 'rgba(0,212,255,0.07)'
    ctx.lineWidth = 1
    for (let i = 0; i <= 4; i++) {
      const x = PAD + (plotW / 4) * i
      const y = PAD + (plotH / 4) * i
      ctx.beginPath()
      ctx.moveTo(x, PAD)
      ctx.lineTo(x, H - PAD)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(PAD, y)
      ctx.lineTo(W - PAD, y)
      ctx.stroke()
    }

    // Threshold boundary (diagonal-ish line at anomaly = 0.4)
    const threshX = PAD + plotW * 0.4
    ctx.setLineDash([6, 4])
    ctx.strokeStyle = 'rgba(255,204,0,0.5)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(threshX, PAD)
    ctx.lineTo(threshX, H - PAD)
    ctx.stroke()

    const threshY = PAD + plotH * 0.4
    ctx.beginPath()
    ctx.moveTo(PAD, threshY)
    ctx.lineTo(W - PAD, threshY)
    ctx.stroke()
    ctx.setLineDash([])

    // Threshold labels
    ctx.fillStyle = 'rgba(255,204,0,0.7)'
    ctx.font = '11px Inter, system-ui, sans-serif'
    ctx.fillText('Review threshold', threshX + 4, PAD + 14)

    // Axis labels
    ctx.fillStyle = 'rgba(136,153,170,0.8)'
    ctx.font = '12px Inter, system-ui, sans-serif'
    ctx.fillText('Distance from consensus  →', PAD, H - 12)

    ctx.save()
    ctx.translate(16, H / 2)
    ctx.rotate(-Math.PI / 2)
    ctx.fillText('Neighbor distance  →', 0, 0)
    ctx.restore()

    // Plot anchors
    anchors.forEach((a) => {
      // Map anomaly scores to canvas coords
      // x = gt_divergence (distance from consensus)
      // y = neighbor_distance
      const meta = a.metadata as any
      const ndVal = Math.min(meta?.nd ?? a.anomaly_score * 0.6, 1)
      const gtVal = Math.min(meta?.gtd ?? a.anomaly_score * 0.8, 1)

      const px = PAD + gtVal * plotW
      const py = H - PAD - ndVal * plotH

      // Point size = impact score
      const r = 3 + a.impact_score * 12

      const color = STATUS_COLORS[a.status] ?? '#8899aa'

      // Glow
      const grd = ctx.createRadialGradient(px, py, 0, px, py, r * 2.5)
      grd.addColorStop(0, color + 'aa')
      grd.addColorStop(1, 'transparent')
      ctx.fillStyle = grd
      ctx.beginPath()
      ctx.arc(px, py, r * 2.5, 0, Math.PI * 2)
      ctx.fill()

      // Dot
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(px, py, r, 0, Math.PI * 2)
      ctx.fill()

      // Ring for flagged/quarantined
      if (a.status !== 'accepted') {
        ctx.strokeStyle = color
        ctx.lineWidth = 1.5
        ctx.globalAlpha = 0.5
        ctx.beginPath()
        ctx.arc(px, py, r + 4, 0, Math.PI * 2)
        ctx.stroke()
        ctx.globalAlpha = 1
      }
    })

    // Axis ticks
    ctx.fillStyle = 'rgba(136,153,170,0.5)'
    ctx.font = '10px Inter, system-ui, sans-serif'
    for (let i = 0; i <= 4; i++) {
      const val = (i / 4).toFixed(1)
      ctx.fillText(val, PAD + (plotW / 4) * i - 6, H - PAD + 14)
      ctx.fillText(val, PAD - 28, H - PAD - (plotH / 4) * i + 4)
    }

  }, [anchors])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Anomaly cluster scatter</span>
        {Object.entries(STATUS_COLORS).map(([k, c]) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{k}</span>
          </div>
        ))}
        <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 'auto' }}>
          Point size = impact score · {anchors.length} anchors
        </span>
      </div>

      <div style={{ flex: 1, minHeight: 420, border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
        <canvas
          ref={canvasRef}
          width={900}
          height={520}
          style={{ width: '100%', height: '100%', display: 'block' }}
        />
      </div>

      {anchors.length === 0 && (
        <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center' }}>
          No anchors yet — run a simulation cycle first
        </p>
      )}
    </div>
  )
}
