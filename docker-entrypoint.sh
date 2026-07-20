#!/bin/sh
set -e

export DATABASE_URL="file:${DATABASE_PATH:-/data/prod.db}"

npx prisma migrate deploy

exec npm run start
