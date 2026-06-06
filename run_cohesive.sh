#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# run_cohesive.sh — Houston AI Watchdog launcher
# Starts the FastAPI backend (port 8000) and Vite frontend (port 5173).
# ─────────────────────────────────────────────────────────────────────────────
set -e

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"

echo ""
echo "  ⬡  Houston AI Watchdog"
echo "     Trust layer for multi-agent AI systems"
echo ""

# ── Backend ──────────────────────────────────────────────────────────────────
echo "[ 1/4 ] Setting up Python virtual environment..."
if [ ! -d "$BACKEND/venv" ]; then
  python3 -m venv "$BACKEND/venv"
fi

source "$BACKEND/venv/bin/activate" 2>/dev/null || source "$BACKEND/venv/Scripts/activate"

echo "[ 2/4 ] Installing backend dependencies..."
pip install -q -r "$BACKEND/requirements.txt"

echo "[ 3/4 ] Starting FastAPI backend on http://localhost:8000 ..."
cd "$BACKEND"
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
echo "        Backend PID: $BACKEND_PID"

# Wait for backend to be ready
sleep 2

# ── Frontend ─────────────────────────────────────────────────────────────────
echo "[ 4/4 ] Installing frontend dependencies..."
cd "$FRONTEND"
npm install --silent

echo "        Starting Vite frontend on http://localhost:5173 ..."
npm run dev &
FRONTEND_PID=$!
echo "        Frontend PID: $FRONTEND_PID"

echo ""
echo "  ✓  Houston AI Watchdog is running"
echo "     Frontend  →  http://localhost:5173"
echo "     Backend   →  http://localhost:8000"
echo "     API docs  →  http://localhost:8000/docs"
echo ""
echo "  Press Ctrl+C to stop both servers."
echo ""

# Handle Ctrl+C gracefully
cleanup() {
  echo ""
  echo "  Stopping servers..."
  kill $BACKEND_PID 2>/dev/null || true
  kill $FRONTEND_PID 2>/dev/null || true
  deactivate 2>/dev/null || true
  echo "  Done."
  exit 0
}
trap cleanup INT TERM

wait
