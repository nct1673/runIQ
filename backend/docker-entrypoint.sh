#!/bin/sh
# Container start-up for the packaged (non-dev) stack:
#   1. make sure the secrets that aren't user-chosen exist (generated once,
#      kept in the data volume so they survive restarts),
#   2. apply database migrations,
#   3. refuse to start without a login password (first run only),
#   4. hand over to the server.
set -e

DATA_DIR="${RUNIQ_DATA_DIR:-/app/data}"
SECRETS="$DATA_DIR/.secrets.env"
mkdir -p "$DATA_DIR"
touch "$SECRETS"
chmod 600 "$SECRETS"

# ensure NAME: keep the value from the environment/.env if one was given,
# otherwise generate it once and persist it.
ensure() {
  eval "current=\${$1:-}"
  if [ -n "$current" ]; then
    return
  fi
  if ! grep -q "^$1=" "$SECRETS"; then
    echo "$1=$(python -c 'import secrets; print(secrets.token_hex(32))')" >> "$SECRETS"
  fi
  export "$1=$(grep "^$1=" "$SECRETS" | head -n1 | cut -d= -f2-)"
}

ensure SESSION_SECRET_KEY
ensure COACH_DB_PASSWORD

alembic upgrade head
python scripts/preflight.py

exec "$@"
