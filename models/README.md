# Models

This directory contains model configuration and training artifacts.

## Current mode: Deterministic Hash Embedding

In demo mode, `houston-ai-watchdog` uses a deterministic SHA-256 based
embedding function that requires no external API and produces stable,
reproducible 64-dimensional vectors.

To upgrade to real semantic embeddings, set `OPENAI_API_KEY` in your
environment and the system automatically switches to `text-embedding-3-small`.

## encoder_config.json

Defines the embedding strategy, anomaly formula weights, trust thresholds,
and decay parameters used by the latent space engine.

## Training artifacts (produced by training/ scripts)

After running the training scripts, trained weights would appear here:
- `pair_encoder_weights.pt` — PyTorch model checkpoint
- `pair_encoder_scaler.pkl` — input normalization scaler
- `evaluation_results.json` — AUROC, precision, recall on test set
