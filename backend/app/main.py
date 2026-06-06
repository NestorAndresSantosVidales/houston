"""
FastAPI application — Houston AI Watchdog backend.

All routes are defined here. The app uses the module-level memory store
singleton and the agent network simulation engine.
"""
from __future__ import annotations

from contextlib import asynccontextmanager
from typing import Any, Dict, List, Optional

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from .auth import AuthContext, get_auth
from .agent_network import run_cycle
from .demo_runner import bootstrap, reset_demo, start_simulation, stop_simulation
from .latent_space import embed_text, compute_viz_position
from .anomaly_detector import compute_anomaly_score
from .trust_engine import evaluate, update_agent_reputation
from .memory_store import store
from .models import AgentStatus, AnchorStatus, Anchor
from .schemas import (
    DashboardResponse,
    HealthResponse,
    OutputRequest,
    SimulateCycleRequest,
)

import uuid
from datetime import datetime


# ─── Lifespan ────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    bootstrap()
    yield


# ─── App ──────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Houston AI Watchdog",
    description="Trust and hallucination-control layer for multi-agent AI systems",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Health ───────────────────────────────────────────────────────────────────

@app.get("/health", response_model=HealthResponse)
def health():
    return {
        "status": "ok",
        "version": "1.0.0",
        "agents_loaded": len(store.agents),
        "anchors_in_memory": len(store.anchors),
        "simulation_running": store.simulation_running,
    }


# ─── Agents ───────────────────────────────────────────────────────────────────

@app.get("/api/agents")
def list_agents(auth: AuthContext = Depends(get_auth)):
    auth.require("read:memory")
    store.log_audit(auth.actor, "list_agents", "read:memory")
    return [a.to_dict() for a in store.list_agents()]


@app.post("/api/agents/{agent_id}/remove")
def remove_agent(agent_id: str, auth: AuthContext = Depends(get_auth)):
    auth.require("admin:agents")
    agent = store.get_agent(agent_id)
    if not agent:
        raise HTTPException(404, "Agent not found")
    if agent.status == AgentStatus.removed:
        raise HTTPException(400, "Agent already removed")
    agent.status = AgentStatus.removed
    store.log_audit(auth.actor, f"remove_agent:{agent_id}", "admin:agents", agent_id)
    store.emit_event(
        event_type="agent_removed",
        message=f"{agent.name} has been removed from the network",
        severity="warning",
        agent_id=agent_id,
        agent_name=agent.name,
    )
    return {"success": True, "agent": agent.to_dict()}


@app.post("/api/agents/{agent_id}/restore")
def restore_agent(agent_id: str, auth: AuthContext = Depends(get_auth)):
    auth.require("admin:agents")
    agent = store.get_agent(agent_id)
    if not agent:
        raise HTTPException(404, "Agent not found")
    agent.status = AgentStatus.active
    agent.trust_score = 70.0  # Restored with reduced trust
    store.log_audit(auth.actor, f"restore_agent:{agent_id}", "admin:agents", agent_id)
    store.emit_event(
        event_type="agent_restored",
        message=f"{agent.name} restored to active — trust score reset to 70",
        severity="info",
        agent_id=agent_id,
        agent_name=agent.name,
    )
    return {"success": True, "agent": agent.to_dict()}


# ─── Anchors / Latent Memory ──────────────────────────────────────────────────

@app.get("/api/anchors")
def list_anchors(
    status: Optional[str] = Query(None),
    limit: int = Query(100, le=500),
    auth: AuthContext = Depends(get_auth),
):
    auth.require("read:memory")
    anchors = store.anchors + store.quarantine
    if status:
        anchors = [a for a in anchors if a.status.value == status]
    anchors = sorted(anchors, key=lambda a: a.timestamp, reverse=True)[:limit]
    return [a.to_dict() for a in anchors]


@app.get("/api/latent/consensus")
def get_consensus(auth: AuthContext = Depends(get_auth)):
    auth.require("read:memory")
    accepted = [a for a in store.anchors if a.status == AnchorStatus.accepted]
    return {
        "vector": store.consensus_vector[:8],  # compact slice
        "stability": store.consensus_stability,
        "total_anchors": len(store.anchors),
        "accepted_anchors": len(accepted),
    }


@app.get("/api/latent/stats")
def latent_stats(auth: AuthContext = Depends(get_auth)):
    auth.require("read:memory")
    all_anchors = store.anchors + store.quarantine
    by_status = {}
    for s in ("accepted", "flagged", "quarantined"):
        by_status[s] = len([a for a in all_anchors if a.status.value == s])

    by_agent: Dict[str, int] = {}
    for a in all_anchors:
        by_agent[a.agent_name] = by_agent.get(a.agent_name, 0) + 1

    avg_trust = 0.0
    if store.anchors:
        avg_trust = sum(a.trust_score for a in store.anchors) / len(store.anchors)

    return {
        "total_anchors": len(all_anchors),
        "by_status": by_status,
        "by_agent": by_agent,
        "average_trust_score": round(avg_trust, 1),
        "consensus_stability": store.consensus_stability,
        "consensus_vector_preview": store.consensus_vector[:4],
    }


# ─── Output Processing ────────────────────────────────────────────────────────

@app.post("/api/outputs")
def process_output(body: OutputRequest, auth: AuthContext = Depends(get_auth)):
    auth.require("write:memory")

    agent = store.get_agent(body.agent_id)
    if not agent:
        raise HTTPException(404, f"Agent '{body.agent_id}' not found")
    if agent.status == AgentStatus.removed:
        raise HTTPException(400, "Cannot accept output from removed agent")

    accepted_vectors = [a.vector for a in store.anchors if a.status == AnchorStatus.accepted]
    vector = embed_text(body.text)
    anomaly, nd, gtd, cp = compute_anomaly_score(
        vector, body.text, store.consensus_vector, accepted_vectors
    )
    evaluation = evaluate(anomaly, nd, gtd, cp, agent)
    viz = compute_viz_position(vector, evaluation.trust_score)

    anchor = Anchor(
        anchor_id=str(uuid.uuid4()),
        vector=vector,
        viz_position=viz,
        text_payload=body.text,
        agent_id=agent.agent_id,
        agent_name=agent.name,
        timestamp=datetime.utcnow(),
        impact_score=round(evaluation.trust_score / 100, 3),
        weight=1.0,
        trust_score=evaluation.trust_score,
        anomaly_score=anomaly,
        status=evaluation.status,
        risk_level=evaluation.risk_level.value,
        reasons=evaluation.reasons,
        metadata={"task": body.task, "nd": nd, "gtd": gtd, "cp": cp},
    )

    agent.total_outputs += 1
    agent.last_output = body.text[:120]
    if evaluation.status != AnchorStatus.accepted:
        agent.flagged_outputs += 1
    update_agent_reputation(agent, evaluation.trust_score)
    store.insert_anchor(anchor)
    store.log_audit(auth.actor, "process_output", "write:memory", agent.agent_id)

    return {
        "anchor": anchor.to_dict(),
        "evaluation": evaluation.to_dict(),
    }


# ─── Simulation ───────────────────────────────────────────────────────────────

@app.post("/api/simulate/cycle")
def simulate_one_cycle(
    body: SimulateCycleRequest = SimulateCycleRequest(),
    auth: AuthContext = Depends(get_auth),
):
    auth.require("write:memory")
    events = run_cycle(force_adversarial=body.force_adversarial)
    store.log_audit(auth.actor, "simulate_cycle", "write:memory")
    return {
        "cycle": store.cycle_count,
        "anchors_created": len(events),
        "consensus_stability": store.consensus_stability,
        "anchors": events,
    }


@app.post("/api/simulate/start")
def sim_start(auth: AuthContext = Depends(get_auth)):
    auth.require("write:memory")
    started = start_simulation()
    store.log_audit(auth.actor, "simulation_start", "write:memory")
    return {"started": started, "simulation_running": store.simulation_running}


@app.post("/api/simulate/stop")
def sim_stop(auth: AuthContext = Depends(get_auth)):
    auth.require("write:memory")
    stopped = stop_simulation()
    store.log_audit(auth.actor, "simulation_stop", "write:memory")
    return {"stopped": stopped, "simulation_running": store.simulation_running}


@app.post("/api/simulate/reset")
def sim_reset(auth: AuthContext = Depends(get_auth)):
    auth.require("admin:agents")
    reset_demo()
    store.log_audit(auth.actor, "demo_reset", "admin:agents")
    return {"reset": True, "message": "Demo state reset — all agents reloaded"}


# ─── Events ───────────────────────────────────────────────────────────────────

@app.get("/api/events")
def get_events(
    offset: int = Query(0, ge=0),
    limit: int = Query(50, le=200),
    auth: AuthContext = Depends(get_auth),
):
    auth.require("read:memory")
    events = store.get_events(offset=offset, limit=limit)
    return {
        "events": [e.to_dict() for e in events],
        "total": len(store.events),
    }


# ─── Quarantine ───────────────────────────────────────────────────────────────

@app.get("/api/quarantine")
def list_quarantine(auth: AuthContext = Depends(get_auth)):
    auth.require("review:quarantine")
    return [a.to_dict() for a in store.quarantine]


@app.post("/api/quarantine/{anchor_id}/approve")
def approve_quarantine(anchor_id: str, auth: AuthContext = Depends(get_auth)):
    auth.require("review:quarantine")
    anchor = store.accept_quarantined(anchor_id)
    if not anchor:
        raise HTTPException(404, "Quarantined anchor not found")
    store.log_audit(auth.actor, f"approve_quarantine:{anchor_id}", "review:quarantine")
    return {"approved": True, "anchor": anchor.to_dict()}


@app.post("/api/quarantine/{anchor_id}/reject")
def reject_quarantine(anchor_id: str, auth: AuthContext = Depends(get_auth)):
    auth.require("review:quarantine")
    anchor = store.reject_quarantined(anchor_id)
    if not anchor:
        raise HTTPException(404, "Quarantined anchor not found")
    store.log_audit(auth.actor, f"reject_quarantine:{anchor_id}", "review:quarantine")
    return {"rejected": True, "anchor_id": anchor_id}


# ─── Dashboard ────────────────────────────────────────────────────────────────

@app.get("/api/dashboard")
def dashboard(auth: AuthContext = Depends(get_auth)):
    auth.require("read:memory")
    return store.dashboard_stats()
