"""
Core data models for Houston AI Watchdog.
All domain objects are defined here as dataclasses to keep schema
definitions and API schemas separate.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional


# ─── Enumerations ────────────────────────────────────────────────────────────

class AgentStatus(str, Enum):
    active = "active"
    suspicious = "suspicious"
    quarantined = "quarantined"
    removed = "removed"


class AnchorStatus(str, Enum):
    accepted = "accepted"
    flagged = "flagged"
    quarantined = "quarantined"


class RiskLevel(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


# ─── Agent ───────────────────────────────────────────────────────────────────

@dataclass
class Agent:
    agent_id: str
    name: str
    role: str
    status: AgentStatus = AgentStatus.active
    trust_score: float = 85.0
    anomaly_rate: float = 0.0
    total_outputs: int = 0
    flagged_outputs: int = 0
    last_output: Optional[str] = None
    permissions: List[str] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.utcnow)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "agent_id": self.agent_id,
            "name": self.name,
            "role": self.role,
            "status": self.status.value,
            "trust_score": round(self.trust_score, 1),
            "anomaly_rate": round(self.anomaly_rate, 3),
            "total_outputs": self.total_outputs,
            "flagged_outputs": self.flagged_outputs,
            "last_output": self.last_output,
            "permissions": self.permissions,
            "created_at": self.created_at.isoformat(),
        }


# ─── Latent Memory Anchor ────────────────────────────────────────────────────

@dataclass
class Anchor:
    anchor_id: str
    vector: List[float]          # 64D embedding
    viz_position: List[float]    # 3D position for visualization [x, y, z]
    text_payload: str
    agent_id: str
    agent_name: str
    timestamp: datetime
    impact_score: float
    weight: float
    trust_score: float
    anomaly_score: float
    status: AnchorStatus
    risk_level: str = "low"
    reasons: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "anchor_id": self.anchor_id,
            "vector": self.vector[:8],           # Compact slice for API
            "viz_position": self.viz_position,   # Full 3D coords for frontend
            "text_payload": self.text_payload,
            "agent_id": self.agent_id,
            "agent_name": self.agent_name,
            "timestamp": self.timestamp.isoformat(),
            "impact_score": round(self.impact_score, 3),
            "weight": round(self.weight, 3),
            "trust_score": round(self.trust_score, 1),
            "anomaly_score": round(self.anomaly_score, 3),
            "status": self.status.value,
            "risk_level": self.risk_level,
            "reasons": self.reasons,
            "metadata": self.metadata,
        }


# ─── Trust Evaluation ────────────────────────────────────────────────────────

@dataclass
class TrustEvaluation:
    trust_score: float
    risk_level: RiskLevel
    status: AnchorStatus
    reasons: List[str]
    recommended_action: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            "trust_score": round(self.trust_score, 1),
            "risk_level": self.risk_level.value,
            "status": self.status.value,
            "reasons": self.reasons,
            "recommended_action": self.recommended_action,
        }


# ─── Event ───────────────────────────────────────────────────────────────────

@dataclass
class Event:
    event_id: str
    event_type: str
    agent_id: Optional[str]
    agent_name: Optional[str]
    anchor_id: Optional[str]
    message: str
    severity: str   # info | warning | error | critical
    timestamp: datetime
    data: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "event_id": self.event_id,
            "event_type": self.event_type,
            "agent_id": self.agent_id,
            "agent_name": self.agent_name,
            "anchor_id": self.anchor_id,
            "message": self.message,
            "severity": self.severity,
            "timestamp": self.timestamp.isoformat(),
            "data": self.data,
        }


# ─── Audit Log ───────────────────────────────────────────────────────────────

@dataclass
class AuditLog:
    log_id: str
    actor: str
    agent_id: Optional[str]
    permission_used: str
    operation: str
    timestamp: datetime
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "log_id": self.log_id,
            "actor": self.actor,
            "agent_id": self.agent_id,
            "permission_used": self.permission_used,
            "operation": self.operation,
            "timestamp": self.timestamp.isoformat(),
            "metadata": self.metadata,
        }
