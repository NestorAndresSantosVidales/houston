"""
Trust engine.

Converts an anomaly score + contextual signals into a human-readable
trust evaluation with score, risk level, status, reasons, and
a recommended action for the operator.
"""
from __future__ import annotations

from typing import List, Optional

from .models import Agent, AgentStatus, AnchorStatus, RiskLevel, TrustEvaluation


# ─── Thresholds ───────────────────────────────────────────────────────────────

TRUST_ACCEPTED_MIN = 80      # ≥ 80  → accepted
TRUST_WARNING_MIN = 60       # 60–79 → accepted with warning
TRUST_FLAGGED_MIN = 40       # 40–59 → flagged for review
# below 40 → quarantined

REMOVAL_ANOMALY_THRESHOLD = 0.50   # anomaly_rate above this after 10 outputs
REMOVAL_MIN_OUTPUTS = 10


def _anomaly_to_trust(anomaly_score: float) -> float:
    """Linear mapping: anomaly 0 → trust 100, anomaly 1 → trust 0."""
    return max(0.0, min(100.0, (1.0 - anomaly_score) * 100.0))


def _trust_to_risk(trust_score: float) -> RiskLevel:
    if trust_score >= 80:
        return RiskLevel.low
    if trust_score >= 60:
        return RiskLevel.medium
    if trust_score >= 40:
        return RiskLevel.high
    return RiskLevel.critical


def _trust_to_status(trust_score: float) -> AnchorStatus:
    if trust_score >= 60:
        return AnchorStatus.accepted
    if trust_score >= 40:
        return AnchorStatus.flagged
    return AnchorStatus.quarantined


def _build_reasons(
    trust_score: float,
    neighbor_dist: float,
    gt_divergence: float,
    contradiction_penalty: float,
    agent: Optional[Agent] = None,
) -> List[str]:
    reasons: List[str] = []

    if contradiction_penalty > 0.1:
        reasons.append("Output contains contradiction or unsafe language patterns")
    if gt_divergence > 0.4:
        reasons.append("Output diverges significantly from consensus memory")
    elif gt_divergence < 0.15:
        reasons.append("Output aligns closely with consensus memory")

    if neighbor_dist > 0.4:
        reasons.append("Isolated from accepted outputs — no similar precedent found")
    elif neighbor_dist < 0.2:
        reasons.append("Close to accepted neighbors — well-supported by existing memory")

    if trust_score >= 80:
        reasons.append("High source confidence — output accepted")
    elif trust_score >= 60:
        reasons.append("Moderate confidence — accepted but flagged for monitoring")
    elif trust_score >= 40:
        reasons.append("Low confidence — output flagged for human review")
    else:
        reasons.append("Critical anomaly — output quarantined to prevent propagation")

    if agent and agent.anomaly_rate > 0.3:
        reasons.append(f"Agent has elevated anomaly history ({agent.anomaly_rate:.0%} rate)")

    return reasons


def _recommend_action(
    trust_score: float,
    agent: Optional[Agent] = None,
) -> str:
    if agent:
        # Recommend removal when anomaly rate is persistently high
        if (
            agent.total_outputs >= REMOVAL_MIN_OUTPUTS
            and agent.anomaly_rate > REMOVAL_ANOMALY_THRESHOLD
        ):
            return "remove_agent"
        if agent.status.value == "suspicious":
            return "review"

    if trust_score >= 80:
        return "allow"
    if trust_score >= 60:
        return "allow"
    if trust_score >= 40:
        return "review"
    return "quarantine"


# ─── Public API ───────────────────────────────────────────────────────────────

def evaluate(
    anomaly_score: float,
    neighbor_dist: float,
    gt_divergence: float,
    contradiction_penalty: float,
    agent: Optional[Agent] = None,
) -> TrustEvaluation:
    """
    Produce a full trust evaluation from the component anomaly signals.
    """
    trust = _anomaly_to_trust(anomaly_score)
    risk = _trust_to_risk(trust)
    status = _trust_to_status(trust)
    reasons = _build_reasons(
        trust, neighbor_dist, gt_divergence, contradiction_penalty, agent
    )
    action = _recommend_action(trust, agent)

    return TrustEvaluation(
        trust_score=round(trust, 1),
        risk_level=risk,
        status=status,
        reasons=reasons,
        recommended_action=action,
    )


def update_agent_reputation(agent: Agent, new_trust_score: float) -> None:
    """
    Update agent trust_score, anomaly_rate, and status based on
    the new output's result. Modifies agent in place.
    """
    # Exponential moving average for trust score
    alpha = 0.2
    agent.trust_score = round(
        alpha * new_trust_score + (1 - alpha) * agent.trust_score, 1
    )

    # Recompute anomaly rate
    if agent.total_outputs > 0:
        agent.anomaly_rate = round(agent.flagged_outputs / agent.total_outputs, 3)

    # Escalate agent status when warranted
    if (
        agent.total_outputs >= REMOVAL_MIN_OUTPUTS
        and agent.anomaly_rate > REMOVAL_ANOMALY_THRESHOLD
    ):
        agent.status = AgentStatus.suspicious
    elif new_trust_score < 40 and agent.status.value == "active":
        agent.status = AgentStatus.suspicious
