#!/usr/bin/env bash
# Контрактные тесты: поднимает сервер на чистой SQLite-базе с демо-данными и прогоняет против него общие сценарии фронтенда.
# Запуск из корня репозитория: bash backend/scripts/contract.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PORT="${PORT:-8765}"
DB="$(mktemp -d)/contract.sqlite3"
cd "$ROOT/backend"
[ -f .venv/bin/activate ] && . .venv/bin/activate
export DATABASE_URL="sqlite:///$DB" CONTRACT_TESTS=1 DEBUG=1 AUTH_THROTTLE=100000/min ALLOWED_ORIGINS=http://localhost:5173
python manage.py migrate -v0
python manage.py seed_demo >/dev/null
python manage.py runserver "127.0.0.1:$PORT" --noreload >/tmp/contract-server.log 2>&1 &
SERVER=$!
trap 'kill $SERVER 2>/dev/null || true' EXIT
for _ in $(seq 1 40); do curl -sf "http://127.0.0.1:$PORT/health" >/dev/null && break; sleep 0.5; done
cd "$ROOT"
CONTRACT_API_URL="http://127.0.0.1:$PORT" pnpm exec vitest run src/new-design/api/http.contract.test.ts
