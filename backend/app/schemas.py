"""
Pydantic schemas for API request / response validation.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class OutputRequest(BaseModel):
    agent_id: str
    text: str
    task: Optional[str] = None


class SimulateCycleRequest(BaseModel):
    force_adversarial: bool = False


class AgentResponse(BaseModel):
    agent_id: str
    name: str
    role: str
    status: str
    trust_score: float
    anomaly_rate: float
    total_outputs: int
    flagged_outputs: int
    last_output: Optional[str]
    permissions: List[str]
    created_at: str


class AnchorResponse(BaseModel):
    anchor_id: str
    vector: List[float]
    viz_position: List[float]
    text_payload: str
    agent_id: str
    agent_name: str
    timestamp: str
    impact_score: float
    weight: float
    trust_score: float
    anomaly_score: float
    status: str
    risk_level: str
    reasons: List[str]
    metadata: Dict[str, Any]


class ConsensusResponse(BaseModel):
    vector: List[float]
    stability: float
    total_anchors: int
    accepted_anchors: int


class DashboardResponse(BaseModel):
    total_agents: int
    active_agents: int
    suspicious_agents: int
    removed_agents: int
    total_outputs: int
    flagged_outputs: int
    quarantined_outputs: int
    total_anchors: int
    average_trust_score: float
    current_risk_level: str
    consensus_stability: float
    simulation_running: bool
    cycle_count: int
    recent_events: List[Dict[str, Any]]


class HealthResponse(BaseModel):
    status: str
    version: str
    agents_loaded: int
    anchors_in_memory: int
    simulation_running: bool
