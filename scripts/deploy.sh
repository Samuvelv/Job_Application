#!/usr/bin/env bash
#
# Deploy script for Job_Application (backend + frontend).
# Run on the production VPS after merging into main:
#
#     ./scripts/deploy.sh
#
# Steps: git pull -> backup DB -> backend install/migrate/seed/build -> pm2 restart
#        -> health check -> frontend production build -> nginx reload.
#
# Overridable via environment, e.g.  BRANCH=dev ./scripts/deploy.sh
#   BRANCH    git branch to deploy            (default: main)
#   PM2_APP   pm2 process name or "all"       (default: all, same as `pm2 restart all`)
#   WEB_ROOT  optional: rsync the frontend build here. Leave unset if nginx serves
#             frontend/dist/ntl-career-nexus/browser directly (default: unset)
#
# NOTE: the seed creates the admin and super admin users with default passwords
# (see backend/seeds/01_roles_and_admin.ts). Change them after the first deploy.

set -euo pipefail

BRANCH="${BRANCH:-main}"
PM2_APP="${PM2_APP:-all}"
WEB_ROOT="${WEB_ROOT:-}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

if [ ! -f backend/.env ]; then
  echo "ERROR: backend/.env not found. Create it from backend/.env.example first." >&2
  exit 1
fi

# backend/.env and backend/uploads are untracked, but keep a safety copy in case a
# pulled commit ever starts tracking/removing them. Restore anything that went missing.
PRESERVE_DIR="$(mktemp -d)"
trap 'rm -rf "$PRESERVE_DIR"' EXIT
cp -p backend/.env "$PRESERVE_DIR/.env"
[ -d backend/uploads ] && cp -a backend/uploads "$PRESERVE_DIR/uploads"

echo "==> Pulling latest changes from $BRANCH"
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

if [ ! -f backend/.env ]; then
  cp -p "$PRESERVE_DIR/.env" backend/.env
  echo "    restored backend/.env"
fi
if [ -d "$PRESERVE_DIR/uploads" ]; then
  mkdir -p backend/uploads
  cp -a -n "$PRESERVE_DIR/uploads/." backend/uploads/
fi

echo "==> Installing backend dependencies"
cd "$REPO_ROOT/backend"
npm ci --include=dev

# Safety net: dump the database before touching the schema. Aborts the deploy if the
# dump fails, so migrations never run without a restore point. Keeps the last 10.
env_val() { grep -E "^$1=" .env | tail -n1 | cut -d= -f2- | sed -e 's/\r$//' -e "s/^[\"']//" -e "s/[\"']$//"; }
if command -v pg_dump >/dev/null 2>&1; then
  echo "==> Backing up database"
  BACKUP_DIR="${BACKUP_DIR:-$HOME/db-backups}"
  mkdir -p "$BACKUP_DIR"
  BACKUP_FILE="$BACKUP_DIR/$(env_val DB_NAME)_$(date +%F_%H%M%S).sql.gz"
  PGPASSWORD="$(env_val DB_PASSWORD)" pg_dump \
    -h "$(env_val DB_HOST)" -p "$(env_val DB_PORT)" -U "$(env_val DB_USER)" "$(env_val DB_NAME)" \
    | gzip > "$BACKUP_FILE"
  echo "    saved $BACKUP_FILE"
  ls -1t "$BACKUP_DIR"/*.sql.gz | tail -n +11 | xargs -r rm -f
else
  echo "WARNING: pg_dump not found - skipping database backup" >&2
fi

# Knex runs with the 'development' config on purpose: it targets the local Postgres
# on this VPS without SSL (the 'production' block forces SSL and defines no seeds).
# DB credentials still come from backend/.env.
echo "==> Running database migrations"
NODE_ENV=development npm run migrate

# Only the roles/admin seed runs on deploy: it is a non-destructive upsert.
# seeds/02_master_data.ts is NOT run here - it DELETEs every master_* table
# (countries, cities, languages, ...) and re-inserts them with new IDs, which would
# damage live data. Run it by hand only on a brand-new empty database:
#   cd backend && NODE_ENV=development npm run seed -- --specific=02_master_data.ts
echo "==> Running safe seed (roles + admin accounts, never deletes)"
NODE_ENV=development npm run seed -- --specific=01_roles_and_admin.ts

echo "==> Building backend"
npm run build

echo "==> Restarting backend (pm2: $PM2_APP)"
if [ "$PM2_APP" = "all" ] || pm2 describe "$PM2_APP" >/dev/null 2>&1; then
  pm2 restart "$PM2_APP" --update-env
else
  # Named app not registered yet (first deploy): start it.
  NODE_ENV=production pm2 start dist/src/server.js --name "$PM2_APP"
fi
pm2 save

echo "==> Waiting for backend health check"
PORT_VALUE="$(grep -E '^PORT=' .env | tail -n1 | cut -d= -f2 | tr -d '"' | tr -d "'" | tr -d '\r' || true)"
HEALTH_URL="http://127.0.0.1:${PORT_VALUE:-3000}/health"
healthy=0
for _ in $(seq 1 30); do
  if curl -fsS "$HEALTH_URL" >/dev/null 2>&1; then
    healthy=1
    break
  fi
  sleep 1
done
if [ "$healthy" -ne 1 ]; then
  echo "ERROR: backend did not become healthy at $HEALTH_URL" >&2
  pm2 logs "$PM2_APP" --lines 30 --nostream || true
  exit 1
fi
echo "    backend healthy"

echo "==> Building frontend"
cd "$REPO_ROOT/frontend"
npm ci
npx ng build ntl-career-nexus --configuration production

BUILD_DIR="$REPO_ROOT/frontend/dist/ntl-career-nexus/browser"
if [ ! -f "$BUILD_DIR/index.html" ]; then
  echo "ERROR: frontend build output not found at $BUILD_DIR" >&2
  exit 1
fi

# Same as the manual flow: nginx serves the build output in place, nothing is copied.
# Only set WEB_ROOT if nginx points at a separate directory.
if [ -n "$WEB_ROOT" ]; then
  echo "==> Publishing frontend to $WEB_ROOT"
  sudo mkdir -p "$WEB_ROOT"
  sudo rsync -a --delete "$BUILD_DIR/" "$WEB_ROOT/"
fi

echo "==> Reloading nginx"
sudo nginx -t
sudo systemctl reload nginx

echo "==> Deploy complete"
