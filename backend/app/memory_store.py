"""
In-memory data store — single module-level singleton.

Holds all runtime state: agents, anchors, quarantine queue, events,
audit logs, consensus vector and simulation control flags.
Thread safety is not a concern for a single-process FastAPI demo.
"""
from __future__ import annotations

from datetime import datetime
from typing import Dict, List, Optional
import uuid

from .latent_space import VECTOR_DIM, weighted_average, compute_consensus_stability
from .models import Agent, AgentStatus, Anchor, AnchorStatus, AuditLog, Event


# ─── Store ────────────────────────────────────────────────────────────────────

class MemoryStore:
    def __init__(self) -> None:
        self.agents: Dict[str, Agent] = {}
        self.anchors: List[Anchor] = []
        self.quarantine: List[Anchor] = []
        self.events: List[Event] = []
        self.audit_logs: List[AuditLog] = []

        # Consensus vector starts as uniform
        self.consensus_vector: List[float] = [1.0 / (VECTOR_DIM ** 0.5)] * VECTOR_DIM
        self.consensus_stability: float = 1.0

        self.simulation_running: bool = False
        self.cycle_count: int = 0

    # ── Agents ──────────────────────────────────────────────────────────────

    def add_agent(self, agent: Agent) -> None:
        self.agents[agent.agent_id] = agent

    def get_agent(self, agent_id: str) -> Optional[Agent]:
        return self.agents.get(agent_id)

    def list_agents(self) -> List[Agent]:
        return list(self.agents.values())

    # ── Anchors ─────────────────────────────────────────────────────────────

    def insert_anchor(self, anchor: Anchor) -> None:
        """Add an anchor to latent memory and recompute consensus."""
        if anchor.status == AnchorStatus.quarantined:
            self.quarantine.append(anchor)
        else:
            self.anchors.append(anchor)
            self._recompute_consensus()

    def accept_quarantined(self, anchor_id: str) -> Optional[Anchor]:
        for i, a in enumerate(self.quarantine):
            if a.anchor_id == anchor_id:
                anchor = self.quarantine.pop(i)
                anchor.status = AnchorStatus.accepted
                self.anchors.append(anchor)
                self._recompute_consensus()
                self.emit_event(
                    event_type="quarantine_approved",
                    message=f"Quarantined memory approved and merged into consensus",
                    severity="info",
                    agent_id=anchor.agent_id,
                    agent_name=anchor.agent_name,
                    anchor_id=anchor_id,
                )
                return anchor
        return None

    def reject_quarantined(self, anchor_id: str) -> Optional[Anchor]:
        for i, a in enumerate(self.quarantine):
            if a.anchor_id == anchor_id:
                anchor = self.quarantine.pop(i)
                self.emit_event(
                    event_type="quarantine_rejected",
                    message=f"Quarantined memory rejected and discarded",
                    severity="warning",
                    agent_id=anchor.agent_id,
                    agent_name=anchor.agent_name,
                    anchor_id=anchor_id,
                )
                return anchor
        return None

    def _recompute_consensus(self) -> None:
        """Recompute the consensus vector from all accepted anchors."""
        accepted = [a for a in self.anchors if a.status == AnchorStatus.accepted]
        if not accepted:
            return
        vectors = [a.vector for a in accepted]
        weights = [a.weight * (1.0 + a.impact_score) for a in accepted]
        self.consensus_vector = weighted_average(vectors, weights)
        self.consensus_stability = compute_consensus_stability(
            vectors, self.consensus_vector
        )

    # ── Events ───────────────────────────────────────────────────────────────

    def emit_event(
        self,
        event_type: str,
        message: str,
        severity: str = "info",
        agent_id: Optional[str] = None,
        agent_name: Optional[str] = None,
        anchor_id: Optional[str] = None,
        data: Optional[dict] = None,
    ) -> Event:
        event = Event(
            event_id=str(uuid.uuid4()),
            event_type=event_type,
            agent_id=agent_id,
            agent_name=agent_name,
            anchor_id=anchor_id,
            message=message,
            severity=severity,
            timestamp=datetime.utcnow(),
            data=data or {},
        )
        self.events.append(event)
        # Keep only last 500 events
        if len(self.events) > 500:
            self.events = self.events[-500:]
        return event

    def get_events(self, offset: int = 0, limit: int = 50) -> List[Event]:
        """Return events newest-first."""
        reversed_events = list(reversed(self.events))
        return reversed_events[offset : offset + limit]

    # ── Audit ────────────────────────────────────────────────────────────────

    def log_audit(
        self,
        actor: str,
        operation: str,
        permission_used: str,
        agent_id: Optional[str] = None,
        metadata: Optional[dict] = None,
    ) -> None:
        log = AuditLog(
            log_id=str(uuid.uuid4()),
            actor=actor,
            agent_id=agent_id,
            permission_used=permission_used,
            operation=operation,
            timestamp=datetime.utcnow(),
            metadata=metadata or {},
        )
        self.audit_logs.append(log)

    # ── Dashboard Stats ──────────────────────────────────────────────────────

    def dashboard_stats(self) -> dict:
        agents = self.list_agents()
        active = [a for a in agents if a.status == AgentStatus.active]
        suspicious = [a for a in agents if a.status == AgentStatus.suspicious]
        removed = [a for a in agents if a.status == AgentStatus.removed]

        all_anchors = self.anchors + self.quarantine
        flagged = [a for a in all_anchors if a.status == AnchorStatus.flagged]
        quarantined = [a for a in all_anchors if a.status == AnchorStatus.quarantined]

        total_outputs = sum(a.total_outputs for a in agents)
        avg_trust = (
            round(sum(a.trust_score for a in active) / len(active), 1)
            if active else 0.0
        )

        # Overall risk level
        if suspicious or len(quarantined) > 3:
            risk = "high"
        elif len(flagged) > 5:
            risk = "medium"
        else:
            risk = "low"

        recent = self.get_events(limit=10)

        return {
            "total_agents": len(agents),
            "active_agents": len(active),
            "suspicious_agents": len(suspicious),
            "removed_agents": len(removed),
            "total_outputs": total_outputs,
            "flagged_outputs": len(flagged),
            "quarantined_outputs": len(quarantined),
            "total_anchors": len(self.anchors),
            "average_trust_score": avg_trust,
            "current_risk_level": risk,
            "consensus_stability": self.consensus_stability,
            "simulation_running": self.simulation_running,
            "cycle_count": self.cycle_count,
            "recent_events": [e.to_dict() for e in recent],
        }


# ─── Global Singleton ────────────────────────────────────────────────────────

store = MemoryStore()
