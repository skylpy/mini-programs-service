#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_ENTRY="$SCRIPT_DIR/app.js"
ENV_FILE="$SCRIPT_DIR/.env.development"
NODEMON_BIN="$SCRIPT_DIR/node_modules/.bin/nodemon"

cd "$SCRIPT_DIR"

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing environment file: $ENV_FILE" >&2
  exit 1
fi

if [ ! -f "$APP_ENTRY" ]; then
  echo "Missing app entry: $APP_ENTRY" >&2
  exit 1
fi

if [ ! -x "$NODEMON_BIN" ]; then
  echo "Missing nodemon binary: $NODEMON_BIN" >&2
  echo "Please run npm install first." >&2
  exit 1
fi

export NODE_ENV=development

exec "$NODEMON_BIN" "$APP_ENTRY"
