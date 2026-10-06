#!/usr/bin/env bash
# =============================================================
# ATLAS – Database Migration Script
# Wraps Prisma migrate commands for safe execution.
# =============================================================
set -euo pipefail

ENV="${1:-development}"

echo "Running migrations for environment: $ENV"

case "$ENV" in
  development)
    cd backend && npm run prisma:migrate
    ;;
  production)
    echo "Running production migration (deploy only – no schema changes)..."
    cd backend && npm run prisma:migrate:prod
    ;;
  reset)
    echo "WARNING: This will reset the database. Press Ctrl+C to cancel."
    sleep 3
    cd backend && npm run prisma:reset
    ;;
  *)
    echo "Usage: $0 [development|production|reset]"
    exit 1
    ;;
esac

echo "Migration complete."
