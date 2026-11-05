#!/usr/bin/env bash
# Translates the Greek reviews in data/reviews*.csv to English with a local Ollama model.
# Output goes to output/reviews/.
# Runs in the background, survives a closed terminal, restarts itself after a crash or
# freeze and resumes from the cache, so finished translations are never lost.
# Usage:      ./scripts/run_reviews.sh [MODEL=gemma3:4b] [LIMIT]
# Progress:   tail -f output/reviews/translation.log
# Foreground: FOREGROUND=1 ./scripts/run_reviews.sh
set -euo pipefail

SCRIPT="$(cd "$(dirname "$0")" && pwd)/$(basename "$0")"
cd "$(dirname "$0")/.."

MODEL="${1:-gemma3:4b}"
LIMIT="${2:-}"
MAX_RESTARTS="${MAX_RESTARTS:-100}"
OUT_DIR="output/reviews"
LOG="$OUT_DIR/translation.log"
PIDFILE="$OUT_DIR/translation.pid"

mkdir -p "$OUT_DIR"

if [ -z "${FOREGROUND:-}" ] && [ -z "${REVIEWS_CHILD:-}" ]; then
  REVIEWS_CHILD=1 nohup "$SCRIPT" "$@" >> "$LOG" 2>&1 &
  echo "Started in the background (pid $!). Follow progress with: tail -f $LOG"
  exit 0
fi

if [ -f "$PIDFILE" ] && kill -0 "$(cat "$PIDFILE")" 2>/dev/null; then
  echo "Already running (pid $(cat "$PIDFILE"))." >&2
  exit 1
fi
echo $$ > "$PIDFILE"
trap 'rm -f "$PIDFILE"' EXIT

if [ -x ".venv/Scripts/python.exe" ]; then
  PYTHON=".venv/Scripts/python.exe"
elif [ -x ".venv/bin/python" ]; then
  PYTHON=".venv/bin/python"
else
  PYTHON="python"
fi

export PYTHONIOENCODING=utf-8
export PYTHONUNBUFFERED=1

# Lower priority so the laptop stays responsive while translating.
NICE=()
if command -v nice >/dev/null 2>&1; then
  NICE=(nice -n 10)
fi

OLLAMA_BIN="$(command -v ollama || true)"
if [ -z "$OLLAMA_BIN" ] && [ -n "${LOCALAPPDATA:-}" ]; then
  CANDIDATE="$(cygpath -u "$LOCALAPPDATA" 2>/dev/null || echo "$LOCALAPPDATA")/Programs/Ollama/ollama.exe"
  if [ -x "$CANDIDATE" ]; then
    OLLAMA_BIN="$CANDIDATE"
  fi
fi

ollama_up() {
  curl -s -m 5 http://localhost:11434/api/version >/dev/null
}

ensure_ollama() {
  if ollama_up; then
    return 0
  fi
  if [ -z "$OLLAMA_BIN" ]; then
    echo "Ollama is not running and was not found. Install it from https://ollama.com" >&2
    return 1
  fi
  echo "$(date) Starting Ollama..."
  OLLAMA_NUM_PARALLEL=1 OLLAMA_MAX_LOADED_MODELS=1 nohup "${NICE[@]}" "$OLLAMA_BIN" serve >/dev/null 2>&1 &
  for _ in $(seq 30); do
    if ollama_up; then
      return 0
    fi
    sleep 2
  done
  echo "Ollama did not start in time." >&2
  return 1
}

ARGS=(--model "$MODEL")
if [ -n "$LIMIT" ]; then
  ARGS+=(--limit "$LIMIT")
fi

echo "$(date) ==> Translating Greek reviews with $MODEL"
ensure_ollama
if [ -n "$OLLAMA_BIN" ] && ! "$OLLAMA_BIN" list | grep -q "^$MODEL"; then
  "$OLLAMA_BIN" pull "$MODEL"
fi

restarts=0
until ensure_ollama && "${NICE[@]}" "$PYTHON" backend/reviews/translation.py "${ARGS[@]}"; do
  restarts=$((restarts + 1))
  if [ "$restarts" -ge "$MAX_RESTARTS" ]; then
    echo "$(date) Giving up after $restarts restarts." >&2
    exit 1
  fi
  echo "$(date) Translation stopped; restart $restarts/$MAX_RESTARTS in 30 s (progress is cached)."
  sleep 30
done

echo "$(date) ==> Reviews finished ($OUT_DIR)"
