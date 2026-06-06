"""
Latent space engine.

Provides deterministic 64-dimensional embeddings, cosine similarity,
consensus vector computation, impact-weighted aggregation, and 3D
visualization coordinates for the frontend.

Falls back to a hash-based deterministic embedding when no OpenAI key
is present, so the demo runs fully offline.
"""
from __future__ import annotations

import hashlib
import math
import os
import random
from typing import List, Optional, Tuple

VECTOR_DIM = 64


# ─── Embedding ────────────────────────────────────────────────────────────────

def _hash_embed(text: str, dim: int = VECTOR_DIM) -> List[float]:
    """
    Deterministic embedding via SHA-256 chaining.
    Each dimension gets its own 32-byte hash seeded with the dimension index.
    Produces stable, reproducible vectors — not semantically meaningful, but
    sufficient for the trust/anomaly scoring pipeline in demo mode.
    """
    raw = text.encode("utf-8")
    vec: List[float] = []
    for i in range(dim):
        h = hashlib.sha256(raw + i.to_bytes(4, "big")).digest()
        # Map first 4 bytes to [-1, 1]
        val = (int.from_bytes(h[:4], "big") / 0xFFFF_FFFF) * 2 - 1
        vec.append(val)
    return _normalize(vec)


def embed_text(text: str) -> List[float]:
    """
    Embed a text string into a 64D float vector.
    Uses OpenAI embeddings when OPENAI_API_KEY is set, otherwise falls back
    to the deterministic hash embedding.
    """
    api_key = os.environ.get("OPENAI_API_KEY", "")
    if api_key:
        try:
            import openai  # type: ignore
            client = openai.OpenAI(api_key=api_key)
            resp = client.embeddings.create(
                model="text-embedding-3-small",
                input=text,
                dimensions=VECTOR_DIM,
            )
            raw = resp.data[0].embedding
            return _normalize(raw)
        except Exception:
            pass
    return _hash_embed(text)


# ─── Vector Math ──────────────────────────────────────────────────────────────

def _normalize(vec: List[float]) -> List[float]:
    norm = math.sqrt(sum(v * v for v in vec)) or 1e-9
    return [v / norm for v in vec]


def cosine_similarity(a: List[float], b: List[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a)) or 1e-9
    nb = math.sqrt(sum(x * x for x in b)) or 1e-9
    return dot / (na * nb)


def cosine_distance(a: List[float], b: List[float]) -> float:
    return 1.0 - cosine_similarity(a, b)


def euclidean_distance(a: List[float], b: List[float]) -> float:
    return math.sqrt(sum((x - y) ** 2 for x, y in zip(a, b)))


def weighted_average(vectors: List[List[float]], weights: List[float]) -> List[float]:
    """Impact-weighted mean of a set of vectors, returned L2-normalized."""
    if not vectors:
        return [0.0] * VECTOR_DIM
    total_w = sum(weights) or 1.0
    result = [0.0] * VECTOR_DIM
    for vec, w in zip(vectors, weights):
        for i, v in enumerate(vec):
            result[i] += v * (w / total_w)
    return _normalize(result)


def drift_toward(vec: List[float], target: List[float], rate: float = 0.08) -> List[float]:
    """Interpolate a vector slightly toward a target (consensus pull)."""
    blended = [v + rate * (t - v) for v, t in zip(vec, target)]
    return _normalize(blended)


# ─── 3D Visualization Position ────────────────────────────────────────────────

def compute_viz_position(
    vector: List[float],
    trust_score: float,
    seed_extra: int = 0,
) -> List[float]:
    """
    Map a 64D vector to a 3D position suitable for the latent space viewer.

    Strategy:
    - Use the first 3 dimensions of the unit-normalized vector as direction.
    - Scale the radial distance based on trust score so accepted anchors
      cluster near the center and quarantined ones sit far out.
    - Add small deterministic jitter for visual separation.
    """
    direction = _normalize(vector[:3] + [0.0] * max(0, 3 - len(vector)))

    # Target radius by trust level
    if trust_score >= 80:
        radius = 20.0
    elif trust_score >= 60:
        radius = 45.0
    elif trust_score >= 40:
        radius = 75.0
    else:
        radius = 115.0

    # Deterministic jitter so identical texts don't perfectly overlap
    jitter_seed = int(abs(vector[3] * 1000)) + seed_extra
    rng = random.Random(jitter_seed)
    jitter = [rng.uniform(-8, 8) for _ in range(3)]

    return [
        direction[0] * radius + jitter[0],
        direction[1] * radius + jitter[1],
        direction[2] * radius + jitter[2],
    ]


# ─── Consensus ────────────────────────────────────────────────────────────────

def compute_consensus_stability(
    anchors_vectors: List[List[float]],
    consensus: List[float],
) -> float:
    """
    Stability score 0-1: average cosine similarity of accepted anchors
    to the consensus vector. 1.0 = perfect agreement.
    """
    if not anchors_vectors:
        return 1.0
    similarities = [cosine_similarity(v, consensus) for v in anchors_vectors]
    avg = sum(similarities) / len(similarities)
    # Map from [-1,1] to [0,1]
    return round((avg + 1) / 2, 4)
