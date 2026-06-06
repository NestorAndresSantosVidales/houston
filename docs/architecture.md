# Architecture — Houston AI Watchdog

## Overview

Houston AI Watchdog is a trust layer that sits between individual AI agents
and the shared knowledge state they collectively build. Rather than allowing
agents to read and write each other's outputs directly (O(n²) mesh), all
agent outputs flow through a central latent memory where they are embedded,
scored, and either accepted or quarantined before influencing the consensus.

```
┌─────────────────────────────────────────────────────────────────┐
│                     HOUSTON AI WATCHDOG                         │
│                                                                 │
│  Agent 1 ──┐                                                    │
│  Agent 2 ──┤                                                    │
│  Agent 3 ──┤──► Embed → Score → Accept/Quarantine ──► Consensus │
│  Agent N ──┘          ↑                              ↑          │
│              Trust Engine                    Shared Latent      │
│              Anomaly Detector                Memory Store       │
│                                                                 │
│  Quarantine Queue ◄── Flagged outputs                           │
│  Human Review → Approve/Reject                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Components

### 1. Agent Network (`agent_network.py`)

Each agent has a defined role, trust score, anomaly rate, and output history.
The simulation cycles through active agents, assigns tasks, generates outputs,
and submits them to the pipeline.

Agent statuses:
- **active** — processing normally
- **suspicious** — elevated anomaly rate, under monitoring
- **quarantined** — output blocked, human action required
- **removed** — taken offline by admin

### 2. Latent Space Engine (`latent_space.py`)

Converts text outputs to 64-dimensional unit-normalized vectors.

In demo mode: deterministic SHA-256 hash embedding (no API key needed).
In production: OpenAI `text-embedding-3-small` (set `OPENAI_API_KEY`).

The **consensus vector** is the impact-weighted mean of all accepted anchor
vectors. It represents the current "ground truth" of the agent network.

Consensus updates incrementally on each accepted anchor insertion, weighted
by the anchor's impact score (derived from trust score).

### 3. Anomaly Detector (`anomaly_detector.py`)

Computes a composite anomaly score for each new output:

```
anomaly_score = 0.45 × neighbor_distance
              + 0.35 × gt_divergence
              + 0.20 × contradiction_penalty
```

Where:
- **neighbor_distance** — average cosine distance to the K=5 nearest accepted anchors
- **gt_divergence** — cosine distance from the consensus vector
- **contradiction_penalty** — keyword/pattern matching against unsafe/hallucinated language

### 4. Trust Engine (`trust_engine.py`)

Maps anomaly score to human-readable trust evaluation:

| Trust Score | Status    | Action      |
|-------------|-----------|-------------|
| ≥ 80        | accepted  | allow        |
| 60–79       | accepted* | allow + warn |
| 40–59       | flagged   | review       |
| < 40        | quarantined | quarantine |

Agent reputation updates via exponential moving average (α=0.2).
Agents with anomaly_rate > 50% after 10+ outputs are marked suspicious
and flagged for removal.

### 5. Memory Store (`memory_store.py`)

In-memory singleton holding:
- `agents` — dict of Agent objects
- `anchors` — list of accepted/flagged anchors
- `quarantine` — list of quarantined anchors (not in consensus)
- `events` — circular buffer of last 500 events
- `consensus_vector` — 64D weighted mean of accepted anchors

### 6. Memory Quarantine

Suspicious outputs are held in a quarantine queue, isolated from consensus.
They cannot influence other agents' scoring until a human reviewer approves
or rejects them via the `/api/quarantine/{id}/approve` or `reject` endpoints.

Approved outputs are inserted into the main memory and update consensus.
Rejected outputs are discarded permanently.

### 7. Identity and Scopes (`auth.py`)

Every API request carries a bearer token mapped to a permission scope set:

| Token                | Scopes                                    |
|----------------------|-------------------------------------------|
| demo-admin-token     | read, write, update:latent, admin, review |
| demo-analyst-token   | read, write, update:latent                |
| demo-viewer-token    | read:memory only                          |

In production, replace `resolve_token()` with Auth0 JWT verification.
The `AuthContext` interface and scope enforcement remain unchanged.

Every operation is logged to the audit trail with actor, operation,
permission used, and timestamp.

## Topology: O(n²) → O(n)

Traditional multi-agent architectures route messages between agents directly.
With n=8 agents this creates n×(n-1)/2 = 28 connections, each a potential
propagation path for a hallucinated output.

Houston Watchdog replaces this mesh with a hub-and-spoke model:
- Each agent connects only to the shared latent memory (n=8 connections)
- Bad outputs are quarantined before reaching the hub
- No direct agent-to-agent propagation is possible

This is a 72% reduction in connections for 8 agents, and scales better as n grows.

## Technology Stack

| Layer     | Technology                    |
|-----------|-------------------------------|
| Backend   | Python 3.11+, FastAPI, Uvicorn |
| Embeddings| SHA-256 hash (demo) / OpenAI   |
| Frontend  | React 18, TypeScript, Vite     |
| 3D Viz    | Three.js                       |
| Charts    | HTML5 Canvas 2D                |
| Auth      | Bearer token (Auth0-ready)     |
| Storage   | In-memory (Redis/Postgres-ready)|
