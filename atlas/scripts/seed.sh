#!/usr/bin/env bash
# =============================================================
# ATLAS – Database Seed Script
# Seeds the database with initial / test data.
# Only runs in development or test environments.
# =============================================================
set -euo pipefail

NODE_ENV="${NODE_ENV:-development}"

if [ "$NODE_ENV" == "production" ]; then
  echo "ERROR: Seed script cannot run in production environment." >&2
  exit 1
fi

echo "Seeding database for environment: $NODE_ENV"
cd backend && npm run prisma:seed
echo "Seed complete."
