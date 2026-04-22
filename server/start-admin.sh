#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ADMIN_DIR="$(cd "$SCRIPT_DIR/../admin" && pwd)"
PACKAGE_JSON="$ADMIN_DIR/package.json"
VITE_BIN="$ADMIN_DIR/node_modules/.bin/vite"
HOST="${ADMIN_HOST:-127.0.0.1}"
PORT="${ADMIN_PORT:-5173}"

cd "$ADMIN_DIR"

if [ ! -f "$PACKAGE_JSON" ]; then
  echo "Missing admin package.json: $PACKAGE_JSON" >&2
  exit 1
fi

if [ ! -x "$VITE_BIN" ]; then
  echo "Missing vite binary: $VITE_BIN" >&2
  echo "Please run npm install in $ADMIN_DIR first." >&2
  exit 1
fi

echo "Starting admin panel in $ADMIN_DIR"
echo "Preferred address: http://$HOST:$PORT"

exec "$VITE_BIN" --host "$HOST" --port "$PORT"
