# API Reference — Houston AI Watchdog

Base URL: `http://localhost:8000`

All endpoints require `Authorization: Bearer demo-admin-token` header.
In demo mode, the header is optional (admin context used by default).

---

## Health

### GET /health
Returns system health status.

```json
{
  "status": "ok",
  "version": "1.0.0",
  "agents_loaded": 8,
  "anchors_in_memory": 42,
  "simulation_running": false
}
```

---

## Agents

### GET /api/agents
List all agents with their current trust scores and statuses.

### POST /api/agents/{agent_id}/remove
Take an agent offline. Requires `admin:agents` scope.

### POST /api/agents/{agent_id}/restore
Restore a removed agent. Trust score resets to 70. Requires `admin:agents`.

---

## Latent Memory

### GET /api/anchors
List memory anchors. Optional query params: `status`, `limit`.

### GET /api/latent/consensus
Return the current consensus vector and stability score.

```json
{
  "vector": [0.12, -0.08, 0.31, 0.04, ...],
  "stability": 0.93,
  "total_anchors": 42,
  "accepted_anchors": 39
}
```

### GET /api/latent/stats
Aggregate statistics: breakdown by status, by agent, average trust.

---

## Output Processing

### POST /api/outputs
Process a single agent output through the trust pipeline.

Request:
```json
{
  "agent_id": "sales_agent",
  "text": "Customer should start with discovery before proposal.",
  "task": "Prepare an enterprise deal strategy"
}
```

Response:
```json
{
  "anchor": { ... },
  "evaluation": {
    "trust_score": 87.4,
    "risk_level": "low",
    "status": "accepted",
    "reasons": ["Close to consensus memory", "No contradiction detected"],
    "recommended_action": "allow"
  }
}
```

---

## Simulation

### POST /api/simulate/cycle
Run one cycle across all active agents.

Body: `{ "force_adversarial": false }`

### POST /api/simulate/start
Start the continuous background simulation.

### POST /api/simulate/stop
Pause the simulation.

### POST /api/simulate/reset
Reset all state and reload agents.

---

## Events

### GET /api/events
Get recent events (newest first). Params: `offset`, `limit`.

```json
{
  "events": [
    {
      "event_id": "...",
      "event_type": "output_quarantined",
      "agent_name": "Adversarial Agent",
      "message": "Output quarantined — propagation prevented (trust 18)",
      "severity": "error",
      "timestamp": "2025-01-15T10:00:04Z"
    }
  ],
  "total": 128
}
```

---

## Quarantine

### GET /api/quarantine
List all quarantined outputs awaiting review.

### POST /api/quarantine/{anchor_id}/approve
Merge a quarantined output into main consensus memory.
Requires `review:quarantine` scope.

### POST /api/quarantine/{anchor_id}/reject
Discard a quarantined output permanently.
Requires `review:quarantine` scope.

---

## Dashboard

### GET /api/dashboard
Full dashboard summary.

```json
{
  "total_agents": 8,
  "active_agents": 7,
  "suspicious_agents": 1,
  "removed_agents": 0,
  "total_outputs": 128,
  "flagged_outputs": 14,
  "quarantined_outputs": 6,
  "total_anchors": 108,
  "average_trust_score": 86.2,
  "current_risk_level": "medium",
  "consensus_stability": 0.91,
  "simulation_running": true,
  "cycle_count": 16,
  "recent_events": [...]
}
```
