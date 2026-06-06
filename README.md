<div align="center">

# Houston AI Watchdog

### Trust and hallucination-control layer for multi-agent AI systems

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Three.js](https://img.shields.io/badge/Three.js-r165-black?style=flat-square&logo=threedotjs&logoColor=white)](https://threejs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)

**[Live Demo](#quick-start) · [Architecture](#architecture) · [API Docs](#api-overview) · [Roadmap](#roadmap)**

</div>

---

> **Houston AI Watchdog** is a real-time trust layer for multi-agent AI systems.
> It detects hallucinations, scores agent reliability, quarantines suspicious memory,
> and prevents bad outputs from spreading across an agent network — before one bad output poisons the whole workflow.


## Screenshots

<p align="center">
  <img src="./Captura%20de%20pantalla%202026-06-06%20170812.png" width="800" alt="Houston AI Screenshot 1" />
</p>

<p align="center">
  <img src="./Captura%20de%20pantalla%202026-06-06%20170829.png" width="800" alt="Houston AI Screenshot 2" />
</p>

<p align="center">
  <img src="./Captura%20de%20pantalla%202026-06-06%20170841.png" width="800" alt="Houston AI Screenshot 3" />
</p>

<p align="center">
  <img src="./Captura%20de%20pantalla%202026-06-06%20170848.png" width="800" alt="Houston AI Screenshot 4" />
</p>

<p align="center">
  <img src="./Captura%20de%20pantalla%202026-06-06%20170856.png" width="800" alt="Houston AI Screenshot 5" />
</p>

<p align="center">
  <img src="./Captura%20de%20pantalla%202026-06-06%20170906.png" width="800" alt="Houston AI Screenshot 6" />
</p>

<p align="center">
  <img src="./Captura%20de%20pantalla%202026-06-06%20170912.png" width="800" alt="Houston AI Screenshot 7" />
</p>

<p align="center">
  <img src="./Captura%20de%20pantalla%202026-06-06%20170919.png" width="800" alt="Houston AI Screenshot 8" />
</p>

<p align="center">
  <img src="./Captura%20de%20pantalla%202026-06-06%20170929.png" width="800" alt="Houston AI Screenshot 9" />
</p>

---

## The Problem: Hallucination Contagion

When AI agents share a workflow, one hallucinating agent can silently corrupt every other agent's ground truth. There is no firewall. There is no rollback. There is no audit trail.

A Sales Agent that invents product capabilities. A Legal Agent that misreads a compliance requirement. A Finance Agent that records revenue early. In a traditional multi-agent architecture, these outputs become everyone's shared reality.

**This is hallucination contagion. It is real. It is unsolved by default.**

---

## How It Works

```
Agent Output
     │
     ▼
[ Embed ]       text → 64-dimensional vector in shared latent space
     │
     ▼
[ Score ]       anomaly_score = 0.35 × neighbor_distance
     │                        + 0.15 × consensus_divergence
     │                        + 0.50 × contradiction_penalty
     ▼
[ Route ]
  trust ≥ 80  ──► Accepted  → updates consensus memory
  60–79       ──► Warning   → accepted, flagged for monitoring
  40–59       ──► Flagged   → held for human review
  < 40        ──► Quarantined → blocked, awaiting approve/reject
     │
     ▼
[ Consensus Updates ]   shared ground truth shifts toward verified outputs
     │
     ▼
[ Agent Reputation ]    each agent's trust score updates via EMA (α = 0.2)
```

Every output is embedded, scored, routed, and either accepted into the shared latent memory or quarantined for human review — before it can influence any other agent.

---

## Features

| Feature | Description |
|---------|-------------|
| **Real-time trust scoring** | Every agent output scored in milliseconds against consensus memory |
| **3D latent space** | Three.js visualization of accepted, flagged and quarantined anchors |
| **Memory quarantine** | Suspicious outputs blocked from consensus with approve/reject workflow |
| **Topology comparison** | Interactive O(n²) mesh vs O(n) watchdog architecture view |
| **Cluster scatter plot** | 2D anomaly signal visualization across all outputs |
| **Live pipeline view** | Step-by-step animation of each output's journey through the system |
| **Agent control panel** | Inspect reputation, remove/restore agents, view last outputs |
| **Event stream** | Real-time log of every pipeline decision at the bottom of the UI |
| **Audit trail** | Every operation logged with actor, permission used, and timestamp |
| **Zero API keys** | Runs fully offline with deterministic hash-based embeddings |

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                     HOUSTON AI WATCHDOG                          │
│                                                                  │
│   Sales Agent    ──┐                                             │
│   Support Agent  ──┤                                             │
│   Finance Agent  ──┤──► Embed ──► Trust Engine ──► Accept        │
│   Legal Agent    ──┤        ↑           ↑          Quarantine    │
│   Cloud Agent    ──┤   Anomaly     Memory Store                  │
│   Medical Agent  ──┤   Detector    Consensus Vec                 │
│   Data Agent     ──┤   K-NN Dist   Audit Log                     │
│   Adversarial    ──┘   Contradiction                             │
│                                                                  │
│   Quarantine Queue ◄── Flagged outputs                           │
│   Human Review → Approve / Reject → Merge or Discard            │
└──────────────────────────────────────────────────────────────────┘
```

### O(n²) → O(n) Topology Reduction

| Architecture | Connections (8 agents) | Contagion risk |
|---|---|---|
| Traditional mesh | 28 connections | Any agent can poison any other |
| Houston Watchdog | 8 connections | Bad outputs quarantined before reaching memory |
| **Reduction** | **72% fewer connections** | **Zero direct agent-to-agent propagation** |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.11, FastAPI, Uvicorn, Pydantic v2 |
| Embeddings | Deterministic SHA-256 hash (demo) / OpenAI `text-embedding-3-small` (optional) |
| Frontend | React 18, TypeScript 5, Vite 5 |
| 3D Visualization | Three.js r165 |
| 2D Charts | HTML5 Canvas 2D |
| Auth | Bearer token middleware (Auth0-ready) |
| Storage | In-memory (PostgreSQL + pgvector ready) |

---

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- npm 9+

### Option A — Linux / macOS

```bash
git clone https://github.com/NestorAndresSantosVidales/houston.git
cd houston
chmod +x run_cohesive.sh
./run_cohesive.sh
```

### Option B — Windows (PowerShell)

```powershell
git clone https://github.com/NestorAndresSantosVidales/houston.git
cd houston
.\run_cohesive.ps1
```

### Manual Start

**Terminal 1 — Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**

### Environment Variables (all optional)

```bash
cp .env.example .env
```

| Variable | Purpose |
|---|---|
| `OPENAI_API_KEY` | Enable real semantic embeddings instead of hash-based |
| `AUTH0_DOMAIN` | Enable real JWT validation |
| `AUTH0_AUDIENCE` | Auth0 API audience |

The system runs fully in demo mode without any of these.

---

## Demo Walkthrough

1. Open **http://localhost:5173** — 8 agents load automatically
2. Go to **Live Demo** → click **Run One Cycle**
3. Watch the event stream — most outputs accepted, adversarial output flagged
4. Click **Force Adversarial Cycle** — guarantees dangerous outputs are generated
5. Go to **Quarantine** — read the reasons, click **Reject & Discard**
6. Go to **Latent Space** — accepted anchors cluster near the consensus sphere; quarantined ones drift to the edge
7. Go to **Agent Topology** — toggle Mesh vs. Watchdog to see the O(n²)→O(n) collapse
8. Go to **Agents** — inspect trust scores, remove the adversarial agent
9. Back to **Live Demo** → **Start Simulation** for continuous live updates

---

## API Overview

Base URL: `http://localhost:8000`
Interactive docs: **http://localhost:8000/docs**

```
GET  /health                        system health check
GET  /api/dashboard                 full KPI summary
GET  /api/agents                    list all agents
POST /api/agents/{id}/remove        take agent offline
POST /api/agents/{id}/restore       restore removed agent
GET  /api/anchors                   list latent memory anchors
GET  /api/latent/consensus          consensus vector + stability score
GET  /api/latent/stats              aggregate stats by status and agent
POST /api/outputs                   process a single agent output
POST /api/simulate/cycle            run one simulation cycle
POST /api/simulate/start            start continuous simulation
POST /api/simulate/stop             pause simulation
POST /api/simulate/reset            reset all state
GET  /api/events                    event stream (newest first)
GET  /api/quarantine                quarantine queue
POST /api/quarantine/{id}/approve   merge quarantined output into memory
POST /api/quarantine/{id}/reject    discard quarantined output
```

---

## Project Structure

```
houston-ai-watchdog/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app and all routes
│   │   ├── models.py            # Domain dataclasses
│   │   ├── schemas.py           # Pydantic API schemas
│   │   ├── latent_space.py      # Embedding, cosine similarity, consensus
│   │   ├── anomaly_detector.py  # Composite anomaly scoring
│   │   ├── trust_engine.py      # Trust evaluation and agent reputation
│   │   ├── memory_store.py      # In-memory singleton store
│   │   ├── agent_network.py     # Agent definitions and simulation cycles
│   │   ├── demo_runner.py       # Start/stop/reset simulation loop
│   │   └── auth.py              # Bearer token → permission scopes
│   ├── requirements.txt
│   └── demo.py                  # CLI demo (no server needed)
├── frontend/
│   └── src/
│       ├── App.tsx              # Shell layout, routing, polling
│       ├── api.ts               # Typed API client
│       ├── TrustDashboard.tsx   # KPI cards and agent table
│       ├── DemoExperience.tsx   # Simulation controls and results
│       ├── VectorSpace3D.tsx    # Three.js latent space viewer
│       ├── ClusterScatter.tsx   # Canvas 2D scatter plot
│       ├── AgentTopology.tsx    # SVG mesh vs watchdog topology
│       ├── PipelineStoryboard.tsx # Animated pipeline steps
│       ├── MemoryQuarantine.tsx # Quarantine approve/reject
│       └── AgentControlPanel.tsx # Agent inspector and controls
├── training/
│   ├── generate_synthetic_agent_outputs.py
│   ├── train_pair_encoder.py    # Siamese pair encoder (requires PyTorch)
│   └── evaluate_anomaly_detection.py  # AUROC, precision, recall
├── docs/
│   ├── architecture.md
│   ├── api.md
│   ├── demo_script.md           # 2-minute hackathon pitch script
│   └── pitch.md
├── demo/                        # Sample JSON data
├── models/                      # Model config and training artifacts
├── run_cohesive.sh              # One-command launcher (Linux/macOS)
├── run_cohesive.ps1             # One-command launcher (Windows)
└── .env.example
```

---

## Evaluation Results

Tested against a 16-sample hallucination detection benchmark:

| Metric | Score |
|---|---|
| AUROC | 1.000 |
| Precision | 1.000 |
| Recall | 0.750 |
| F1 | 0.857 |
| Accuracy | 0.875 |

Zero false positives. The two false negatives use indirect phrasing that does not match the contradiction vocabulary — they are still flagged by geometric distance signals in a live session with established consensus memory.

---

## Known Limitations

- In-memory storage only — state resets on server restart
- Hash-based embeddings are deterministic but not semantically meaningful; set `OPENAI_API_KEY` for real clustering
- No WebSocket push — frontend polls every 3 seconds
- Single-process server — not multi-tenant without Redis/Postgres

---

## Roadmap

- [ ] PostgreSQL + pgvector for persistent latent memory
- [ ] Real semantic embeddings (OpenAI or self-hosted via Ollama)
- [ ] Auth0 JWT validation (`auth.py::resolve_token()` is already the hook)
- [ ] WebSocket event streaming for sub-second UI updates
- [ ] Domain-specific contradiction libraries (HIPAA, SOX, contract law, clinical)
- [ ] Multi-tenant workspace isolation
- [ ] Autonomous remediation — Watchdog proposes corrected outputs
- [ ] Federated trust — cross-organization consensus without raw data sharing

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m "Add your feature"`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

---

## License

MIT — see [LICENSE](LICENSE) for details.

---

<div align="center">

**Build agents. Trust agents. Control agents.**

*Houston AI does not just create agents — it supervises them, scores them,*
*quarantines suspicious memory, and prevents hallucination contagion*
*before one bad output poisons the whole workflow.*

</div>
