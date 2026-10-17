#!/usr/bin/env bash
# Сквозной тест в браузере против настоящего Django: сайт собирается с VITE_API_URL, сервер идёт на чистой базе с демо-данными.
# Запуск из корня репозитория: bash backend/scripts/e2e.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
API_PORT="${API_PORT:-8766}"
WEB_PORT="${WEB_PORT:-4174}"
DB="$(mktemp -d)/e2e.sqlite3"
cd "$ROOT/backend"
[ -f .venv/bin/activate ] && . .venv/bin/activate
export DATABASE_URL="sqlite:///$DB" DEBUG=1 AUTH_THROTTLE=100000/min ALLOWED_ORIGINS="http://127.0.0.1:$WEB_PORT"
python manage.py migrate -v0
python manage.py seed_demo >/dev/null
python manage.py runserver "127.0.0.1:$API_PORT" --noreload >/tmp/e2e-api.log 2>&1 &
API=$!
cd "$ROOT"
VITE_API_URL="http://127.0.0.1:$API_PORT" pnpm exec vite build --outDir dist-real >/dev/null
pnpm exec vite preview --outDir dist-real --host 127.0.0.1 --port "$WEB_PORT" --strictPort >/tmp/e2e-web.log 2>&1 &
WEB=$!
trap 'kill $API $WEB 2>/dev/null || true' EXIT
for _ in $(seq 1 40); do curl -sf "http://127.0.0.1:$API_PORT/health" >/dev/null && curl -sf "http://127.0.0.1:$WEB_PORT/" >/dev/null && break; sleep 0.5; done
E2E_API_URL="http://127.0.0.1:$API_PORT" E2E_BASE_URL="http://127.0.0.1:$WEB_PORT" pnpm exec playwright test e2e/real-backend.spec.ts --project=desktop
