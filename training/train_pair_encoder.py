"""
Train a siamese pair encoder to distinguish correct vs hallucinated outputs.

Architecture: two-tower MLP with cosine embedding loss.
Input: 64D hash embeddings (or real embeddings if OPENAI_API_KEY is set).
Output: fine-tuned 64D encoder that pushes correct pairs together
        and hallucinated pairs apart.

Usage:
    python train_pair_encoder.py --epochs 20 --lr 1e-3
"""
import argparse
import json
import math
import random
import sys
from pathlib import Path

try:
    import torch
    import torch.nn as nn
    from torch.utils.data import DataLoader, Dataset
    HAS_TORCH = True
except ImportError:
    HAS_TORCH = False

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))
from app.latent_space import embed_text

DATA_PATH = Path(__file__).parent / "data" / "pairs.jsonl"
MODEL_DIR = Path(__file__).parent.parent / "models"


class PairDataset:
    def __init__(self, pairs):
        self.pairs = pairs

    def __len__(self):
        return len(self.pairs)

    def __getitem__(self, idx):
        p = self.pairs[idx]
        va = embed_text(p["text_a"])
        vb = embed_text(p["text_b"])
        return va, vb, p["label"]


class TowerEncoder(nn.Module):
    def __init__(self, dim=64):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(dim, 128), nn.ReLU(), nn.Dropout(0.1),
            nn.Linear(128, 128), nn.ReLU(),
            nn.Linear(128, dim),
        )

    def forward(self, x):
        out = self.net(x)
        return nn.functional.normalize(out, dim=-1)


def train(epochs: int = 20, lr: float = 1e-3, batch_size: int = 32):
    if not HAS_TORCH:
        print("PyTorch not installed. Install with: pip install torch")
        print("Running in stub mode — no model trained.")
        return

    if not DATA_PATH.exists():
        print(f"Data not found at {DATA_PATH}. Run generate_synthetic_agent_outputs.py first.")
        return

    pairs = [json.loads(l) for l in DATA_PATH.read_text().splitlines()]
    random.shuffle(pairs)
    split = int(0.8 * len(pairs))
    train_data = pairs[:split]
    val_data = pairs[split:]

    model = TowerEncoder(dim=64)
    optimizer = torch.optim.Adam(model.parameters(), lr=lr)
    loss_fn = nn.CosineEmbeddingLoss(margin=0.5)

    print(f"Training on {len(train_data)} pairs, validating on {len(val_data)}")
    for epoch in range(epochs):
        model.train()
        random.shuffle(train_data)
        total_loss = 0.0
        for i in range(0, len(train_data), batch_size):
            batch = train_data[i : i + batch_size]
            va = torch.tensor([[float(v) for v in embed_text(p["text_a"])] for p in batch])
            vb = torch.tensor([[float(v) for v in embed_text(p["text_b"])] for p in batch])
            labels = torch.tensor([1.0 if p["label"] == 1 else -1.0 for p in batch])

            ea = model(va)
            eb = model(vb)
            loss = loss_fn(ea, eb, labels)
            optimizer.zero_grad()
            loss.backward()
            optimizer.step()
            total_loss += loss.item()

        avg = total_loss / max(1, len(train_data) // batch_size)
        print(f"Epoch {epoch+1:3d}/{epochs} | loss={avg:.4f}")

    # Save
    MODEL_DIR.mkdir(exist_ok=True)
    torch.save(model.state_dict(), MODEL_DIR / "pair_encoder_weights.pt")
    print(f"\nModel saved to {MODEL_DIR}/pair_encoder_weights.pt")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--epochs", type=int, default=20)
    parser.add_argument("--lr", type=float, default=1e-3)
    parser.add_argument("--batch-size", type=int, default=32)
    args = parser.parse_args()
    train(epochs=args.epochs, lr=args.lr, batch_size=args.batch_size)
