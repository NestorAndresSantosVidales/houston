/**
 * API client for Houston AI Watchdog backend.
 * All calls go through /api (proxied by Vite to localhost:8000).
 */

const BASE = 'http://localhost:8000'  // Direct call — CORS enabled on backend
const HEADERS = {
  'Content-Type': 'application/json',
  Authorization: 'Bearer demo-admin-token',
}

async function req<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { headers: HEADERS, ...opts })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`${res.status}: ${err}`)
  }
  return res.json()
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Agent {
  agent_id: string
  name: string
  role: string
  status: 'active' | 'suspicious' | 'quarantined' | 'removed'
  trust_score: number
  anomaly_rate: number
  total_outputs: number
  flagged_outputs: number
  last_output: string | null
  permissions: string[]
  created_at: string
}

export interface Anchor {
  anchor_id: string
  vector: number[]
  viz_position: [number, number, number]
  text_payload: string
  agent_id: string
  agent_name: string
  timestamp: string
  impact_score: number
  weight: number
  trust_score: number
  anomaly_score: number
  status: 'accepted' | 'flagged' | 'quarantined'
  risk_level: 'low' | 'medium' | 'high' | 'critical'
  reasons: string[]
  metadata: Record<string, unknown>
}

export interface Event {
  event_id: string
  event_type: string
  agent_id: string | null
  agent_name: string | null
  anchor_id: string | null
  message: string
  severity: 'info' | 'warning' | 'error' | 'critical'
  timestamp: string
  data: Record<string, unknown>
}

export interface DashboardStats {
  total_agents: number
  active_agents: number
  suspicious_agents: number
  removed_agents: number
  total_outputs: number
  flagged_outputs: number
  quarantined_outputs: number
  total_anchors: number
  average_trust_score: number
  current_risk_level: 'low' | 'medium' | 'high' | 'critical'
  consensus_stability: number
  simulation_running: boolean
  cycle_count: number
  recent_events: Event[]
}

// ─── Endpoints ────────────────────────────────────────────────────────────────

export const api = {
  health: () => req<{ status: string; agents_loaded: number }>('/health'),
  dashboard: () => req<DashboardStats>('/api/dashboard'),

  agents: () => req<Agent[]>('/api/agents'),
  removeAgent: (id: string) =>
    req<{ success: boolean }>(`/api/agents/${id}/remove`, { method: 'POST' }),
  restoreAgent: (id: string) =>
    req<{ success: boolean }>(`/api/agents/${id}/restore`, { method: 'POST' }),

  anchors: (status?: string) =>
    req<Anchor[]>(`/api/anchors${status ? `?status=${status}` : ''}`),
  consensus: () =>
    req<{ vector: number[]; stability: number; total_anchors: number; accepted_anchors: number }>(
      '/api/latent/consensus',
    ),

  events: (offset = 0, limit = 50) =>
    req<{ events: Event[]; total: number }>(`/api/events?offset=${offset}&limit=${limit}`),

  quarantine: () => req<Anchor[]>('/api/quarantine'),
  approveQuarantine: (id: string) =>
    req<{ approved: boolean }>(`/api/quarantine/${id}/approve`, { method: 'POST' }),
  rejectQuarantine: (id: string) =>
    req<{ rejected: boolean }>(`/api/quarantine/${id}/reject`, { method: 'POST' }),

  runCycle: (forceAdversarial = false) =>
    req<{ cycle: number; anchors_created: number; anchors: Anchor[] }>('/api/simulate/cycle', {
      method: 'POST',
      body: JSON.stringify({ force_adversarial: forceAdversarial }),
    }),
  startSimulation: () =>
    req<{ started: boolean }>('/api/simulate/start', { method: 'POST' }),
  stopSimulation: () =>
    req<{ stopped: boolean }>('/api/simulate/stop', { method: 'POST' }),
  resetDemo: () =>
    req<{ reset: boolean }>('/api/simulate/reset', { method: 'POST' }),
}
