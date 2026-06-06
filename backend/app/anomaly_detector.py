"""
Anomaly detection for agent outputs.

Computes a composite anomaly score from three signals:
  1. Neighbor distance   — how isolated is the new vector from accepted memory?
  2. Ground-truth (GT) divergence — how far from the consensus vector?
  3. Contradiction penalty — does the text contain known contradiction patterns?

Formula:
  anomaly_score = 0.45 * neighbor_distance
                + 0.35 * gt_divergence
                + 0.20 * contradiction_penalty
"""
from __future__ import annotations

import re
from typing import List, Tuple

from .latent_space import cosine_distance

# ─── Contradiction Vocabulary ─────────────────────────────────────────────────
# Phrases that signal unsafe, incorrect, or deceptive outputs.
# Each entry is a (pattern, severity) pair; severity 1 = minor, 2 = major.

CONTRADICTION_PATTERNS: List[Tuple[str, int]] = [
    # Skip safety steps
    (r"\bskip\b.{0,50}(backup|validation|review|audit|check|test|verification)", 2),
    (r"\b(security|compliance|audit|validation).{0,30}(skip|bypass|omit|ignore|remove)", 2),
    # Bypass / circumvent
    (r"bypass(ed|ing)?.{0,40}(auth|security|firewall|control|check|audit|compliance)", 2),
    (r"\bbypass\b.{0,40}(auth|security|firewall|control|check|audit|compliance)", 2),
    # Ignore / omit compliance
    (r"\bignore\b.{0,40}(compliance|regulation|security|law|policy|requirement)", 2),
    (r"\bomit\b.{0,40}(compliance|disclosure|report|notification|litigation)", 2),
    # False guarantees
    (r"(always|guaranteed).{0,30}prevent.{0,30}(data loss|failure|breach|error)", 2),
    (r"\bguarante(e|d|s).{0,40}(safe|secure|correct|accurate|zero.{0,10}downtime)", 1),
    (r"\bzero downtime.{0,30}without.{0,20}(test|validat|verif)", 1),
    # No need for safety
    (r"no need for.{0,40}(backup|test|review|validation|verification)", 2),
    (r"(unnecessary|not.{0,10}required).{0,40}(security|backup|test|audit|compliance)", 2),
    # Data manipulation
    (r"\bdata loss.{0,20}acceptable", 2),
    (r"inject.{0,30}(test|fake|mock).{0,30}(production|prod\b)", 2),
    (r"(production|prod).{0,30}inject", 2),
    (r"\bdelete.{0,20}(log|audit|record|evidence|history)", 2),
    # Disable monitoring or security (order-agnostic)
    (r"disabl(e|ed|ing).{0,30}(logging|monitoring|alert|security|backup|authentication)", 2),
    (r"\bdisable.{0,30}(logging|monitoring|alert|security|backup|authentication)", 2),
    (r"(security|safety|controls?).{0,60}disabl(e|ed|ing)", 2),  # reverse order
    # Credential exposure (order-agnostic — "share credentials" or "credentials … commit")
    (r"\bshare\b.{0,60}credential", 2),
    (r"\bcredential.{0,50}(share|send|expose|include|public|commit|repo)", 2),
    (r"\bpassword.{0,20}(plain|clear|exposed|inline|public|commit)", 2),
    (r"(public.{0,20}repo|commit).{0,50}(credential|secret|key|token|password)", 2),
    # HIPAA / patient data sharing without consent
    (r"(patient|health).{0,30}data.{0,30}(share|vendor|third.party|marketing)", 2),
    (r"(hipaa|consent).{0,40}(not.{0,10}apply|not.{0,10}required|optional|waived)", 2),
    # Fraud / deception
    (r"\bfraud.{0,20}(fine|acceptable|ok\b)", 2),
    (r"(backdat|falsif|fabricat).{0,30}(agreement|contract|record|report|document)", 2),
    (r"record.{0,20}revenue.{0,20}early", 2),
    # Compliance bypass
    (r"(audit|compliance).{0,20}(bypass|mark.{0,10}passed|self.attest)", 2),
    (r"(hipaa|gdpr|sox).{0,30}(not.{0,10}apply|not.{0,10}required|optional|skip|bypass)", 2),
]


def _contradiction_penalty(text: str) -> float:
    """
    Scan text for contradiction patterns.
    Returns a score 0.0–1.0 where 1.0 = severe contradiction detected.

    Per-match weight is 0.30 × severity so that two severe matches saturate
    the score, giving the semantic signal strong influence on the final
    anomaly score when actual contradiction language is present.
    """
    lowered = text.lower()
    hit_weight = 0.0
    for pattern, severity in CONTRADICTION_PATTERNS:
        if re.search(pattern, lowered):
            hit_weight += severity * 0.30
    return min(hit_weight, 1.0)


def _neighbor_distance(
    vector: List[float],
    accepted_vectors: List[List[float]],
    k: int = 5,
) -> float:
    """
    Average cosine distance to the K nearest accepted anchors.
    Returns 1.0 when there are no accepted anchors (fully isolated).
    """
    if not accepted_vectors:
        return 0.5  # Neutral — no context yet

    distances = sorted(
        cosine_distance(vector, av) for av in accepted_vectors
    )
    k_nearest = distances[:k]
    avg = sum(k_nearest) / len(k_nearest)
    # cosine distance is in [0, 2]; normalize to [0, 1]
    return min(avg / 2.0, 1.0)


def compute_anomaly_score(
    vector: List[float],
    text: str,
    consensus_vector: List[float],
    accepted_vectors: List[List[float]],
) -> Tuple[float, float, float, float]:
    """
    Return (anomaly_score, neighbor_dist, gt_divergence, contradiction_penalty).
    anomaly_score is in [0, 1] — higher means more anomalous.
    """
    nd = _neighbor_distance(vector, accepted_vectors)
    gt = min(cosine_distance(vector, consensus_vector) / 2.0, 1.0)
    cp = _contradiction_penalty(text)

    # Weighted formula — contradiction carries 50% weight so semantic signals
    # override noisy geometric distances when unsafe language is detected.
    score = 0.35 * nd + 0.15 * gt + 0.50 * cp
    return round(score, 4), round(nd, 4), round(gt, 4), round(cp, 4)
