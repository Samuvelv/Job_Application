#!/bin/sh
set -e

echo "[entrypoint] Running database migrations…"
npx knex --knexfile dist/knexfile.js migrate:latest

echo "[entrypoint] Running seeds (idempotent)…"
npx knex --knexfile dist/knexfile.js seed:run

echo "[entrypoint] Starting server…"
exec node dist/src/server.js
