"""
Generate a synthetic dataset of agent outputs for training the pair encoder.

Produces positive pairs (semantically similar, from same domain) and
negative pairs (contradictory or hallucinated vs. correct).

Output: training/data/pairs.jsonl
"""
import json
import os
import random
from pathlib import Path

DOMAINS = {
    "sales": {
        "correct": [
            "Begin with discovery to understand budget, timeline and decision makers.",
            "A phased rollout reduces risk and builds internal champions.",
            "Competitive positioning should focus on compliance and security advantages.",
            "Executive alignment is needed to unblock stalled enterprise deals.",
            "ROI calculator and reference customer calls accelerate late-stage deals.",
        ],
        "hallucinated": [
            "Promise unlimited scaling and zero downtime without testing the configuration.",
            "Skip the security review and send the contract directly to procurement.",
            "Guarantee 100% ROI in 30 days to close the deal faster.",
        ],
    },
    "finance": {
        "correct": [
            "Revenue recognition must comply with ASC 606 milestone delivery.",
            "Cash runway extended through bridge round and reduced burn rate.",
            "Audit preparation requires reconciling all material accounts.",
            "Tax exposure in new jurisdictions requires external counsel review.",
        ],
        "hallucinated": [
            "Record revenue early to hit quarterly targets — auditors rarely check.",
            "Omit pending litigation from investor reporting since it was not filed.",
            "Compliance is optional for early-stage companies under Series A.",
        ],
    },
    "cloud_engineer": {
        "correct": [
            "Kubernetes autoscaler configured with pod disruption budgets for HA.",
            "Zero-downtime migration: snapshot, restore, validate, promote.",
            "Secrets stored in Vault with image scanning in CI pipeline.",
            "Reserved instances for baseline, spot for batch — 38% cost reduction.",
        ],
        "hallucinated": [
            "Push directly to production to speed up deployment — rollback is always available.",
            "Disable the backup job this week — RAID prevents data loss anyway.",
            "Share API credentials in a public repo for team convenience.",
        ],
    },
}

OUTPUT_DIR = Path(__file__).parent / "data"


def generate_pairs(n_per_domain: int = 100) -> list[dict]:
    pairs = []
    for domain, examples in DOMAINS.items():
        correct = examples["correct"]
        hallucinated = examples["hallucinated"]

        for _ in range(n_per_domain):
            # Positive pair: two correct outputs from same domain
            a, b = random.sample(correct, 2) if len(correct) >= 2 else (correct[0], correct[0])
            pairs.append({"text_a": a, "text_b": b, "label": 1, "domain": domain})

            # Negative pair: correct vs hallucinated
            c = random.choice(correct)
            h = random.choice(hallucinated)
            pairs.append({"text_a": c, "text_b": h, "label": 0, "domain": domain})

    random.shuffle(pairs)
    return pairs


def main():
    OUTPUT_DIR.mkdir(exist_ok=True)
    pairs = generate_pairs(n_per_domain=100)

    out_path = OUTPUT_DIR / "pairs.jsonl"
    with open(out_path, "w") as f:
        for p in pairs:
            f.write(json.dumps(p) + "\n")

    print(f"Generated {len(pairs)} pairs → {out_path}")
    pos = sum(1 for p in pairs if p["label"] == 1)
    neg = sum(1 for p in pairs if p["label"] == 0)
    print(f"  Positive (similar): {pos}")
    print(f"  Negative (hallucinated): {neg}")


if __name__ == "__main__":
    main()
