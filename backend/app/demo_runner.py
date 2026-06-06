"""
Demo runner — background simulation loop.

Starts/stops a continuous asyncio task that fires run_cycle() every
few seconds, creating a live-updating demo experience.
"""
from __future__ import annotations

import asyncio
import random
from typing import Optional

from .agent_network import initialize_agents, run_cycle
from .memory_store import store


_simulation_task: Optional[asyncio.Task] = None


async def _simulation_loop() -> None:
    """Run cycles indefinitely until store.simulation_running is False."""
    cycle = 0
    while store.simulation_running:
        try:
            # Occasionally force an adversarial cycle for demo drama
            force_adv = (cycle % 5 == 4)
            run_cycle(force_adversarial=force_adv)
            cycle += 1
        except Exception as exc:
            store.emit_event(
                event_type="simulation_error",
                message=f"Simulation error: {exc}",
                severity="error",
            )
        # Vary interval slightly for a natural feel
        await asyncio.sleep(random.uniform(3.5, 5.5))


def start_simulation() -> bool:
    """Start the background simulation. Returns False if already running."""
    global _simulation_task
    if store.simulation_running:
        return False

    store.simulation_running = True
    loop = asyncio.get_event_loop()
    _simulation_task = loop.create_task(_simulation_loop())

    store.emit_event(
        event_type="simulation_started",
        message="Continuous simulation started — agents processing outputs",
        severity="info",
    )
    return True


def stop_simulation() -> bool:
    """Stop the background simulation. Returns False if not running."""
    global _simulation_task
    if not store.simulation_running:
        return False

    store.simulation_running = False
    if _simulation_task and not _simulation_task.done():
        _simulation_task.cancel()
    _simulation_task = None

    store.emit_event(
        event_type="simulation_stopped",
        message="Simulation paused — manual control active",
        severity="info",
    )
    return True


def reset_demo() -> None:
    """Reset all runtime data and re-initialize agents."""
    stop_simulation()

    store.agents.clear()
    store.anchors.clear()
    store.quarantine.clear()
    store.events.clear()
    store.audit_logs.clear()
    store.cycle_count = 0
    from .latent_space import VECTOR_DIM
    store.consensus_vector = [1.0 / (VECTOR_DIM ** 0.5)] * VECTOR_DIM
    store.consensus_stability = 1.0

    initialize_agents()

    store.emit_event(
        event_type="demo_reset",
        message="Demo reset — fresh state, all agents reloaded",
        severity="info",
    )


def bootstrap() -> None:
    """Called on FastAPI startup to pre-load agents."""
    initialize_agents()
