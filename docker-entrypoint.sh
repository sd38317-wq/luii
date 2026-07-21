#!/bin/sh
set -e

export DATABASE_URL="file:${DATABASE_PATH:-/data/prod.db}"

echo "[entrypoint] $(date -u) starting, DATABASE_URL=$DATABASE_URL" | tee -a /data/boot.log

npx prisma migrate deploy 2>&1 | tee -a /data/boot.log

echo "[entrypoint] $(date -u) starting app" | tee -a /data/boot.log

exec npm run start 2>&1 | tee -a /data/boot.log
