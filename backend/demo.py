"""
Standalone demo script — runs a few cycles and prints results to stdout.
Useful for quick backend validation without starting the full server.

Usage:
    python demo.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.demo_runner import bootstrap, reset_demo
from app.agent_network import run_cycle
from app.memory_store import store


def main():
    print("=" * 60)
    print("  Houston AI Watchdog — Demo Mode")
    print("=" * 60)

    bootstrap()
    print(f"\nAgents loaded: {len(store.agents)}")
    for a in store.list_agents():
        print(f"  [{a.status.value:12s}] {a.name} (trust: {a.trust_score})")

    print("\nRunning 3 simulation cycles...\n")
    for i in range(3):
        print(f"--- Cycle {i + 1} ---")
        anchors = run_cycle(force_adversarial=(i == 1))
        for a in anchors:
            status_icon = {"accepted": "[OK]", "flagged": "[WRN]", "quarantined": "[BLK]"}.get(a["status"], "[?]")
            print(f"  {status_icon} [{a['status']:12s}] trust={a['trust_score']:5.1f}  {a['agent_name']:25s}  {a['text_payload'][:60]}...")
        print()

    print("Dashboard stats:")
    stats = store.dashboard_stats()
    for k, v in stats.items():
        if k != "recent_events":
            print(f"  {k}: {v}")

    print(f"\nQuarantine queue: {len(store.quarantine)} items")
    for q in store.quarantine:
        print(f"  [BLK] [{q.agent_name}] anomaly={q.anomaly_score:.2f}  {q.text_payload[:80]}...")

    print("\nDemo complete. Start the server for the full experience.")


if __name__ == "__main__":
    main()
