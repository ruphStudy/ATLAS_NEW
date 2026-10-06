#!/usr/bin/env bash
# =============================================================
# ATLAS – Project Setup Script
# Run once after cloning the repository.
# =============================================================
set -euo pipefail

echo ""
echo "============================================"
echo "  ATLAS Project Setup"
echo "============================================"
echo ""

# ── Check prerequisites ───────────────────────────────────────
check_command() {
  if ! command -v "$1" &>/dev/null; then
    echo "ERROR: '$1' is required but not installed." >&2
    exit 1
  fi
}

check_command node
check_command npm
check_command docker
check_command docker-compose

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
  echo "ERROR: Node.js >= 20 is required. Found: $(node -v)" >&2
  exit 1
fi

echo "✓ Prerequisites verified"

# ── Install root dependencies ────────────────────────────────
echo ""
echo "Installing root dependencies..."
npm install
echo "✓ Root dependencies installed"

# ── Install workspace dependencies ──────────────────────────
echo ""
echo "Installing backend dependencies..."
(cd backend && npm install)

echo "Installing frontend dependencies..."
(cd frontend && npm install)

echo "Installing shared dependencies..."
(cd shared && npm install)

echo "✓ All dependencies installed"

# ── Configure environment files ───────────────────────────────
echo ""
echo "Setting up environment files..."

if [ ! -f ".env" ]; then
  cp .env.example .env
  echo "✓ Root .env created from .env.example"
else
  echo "  Root .env already exists, skipping"
fi

if [ ! -f "backend/.env" ]; then
  cp backend/.env.example backend/.env
  echo "✓ Backend .env created"
else
  echo "  Backend .env already exists, skipping"
fi

if [ ! -f "frontend/.env.local" ]; then
  cp frontend/.env.example frontend/.env.local
  echo "✓ Frontend .env.local created"
else
  echo "  Frontend .env.local already exists, skipping"
fi

# ── Configure Husky ───────────────────────────────────────────
echo ""
echo "Setting up Husky git hooks..."
npx husky install
chmod +x .husky/commit-msg
chmod +x .husky/pre-commit
echo "✓ Husky hooks configured"

# ── Start Docker services ────────────────────────────────────
echo ""
echo "Starting Docker infrastructure..."
docker-compose up -d postgres redis
echo "✓ PostgreSQL and Redis started"

# ── Wait for Postgres ─────────────────────────────────────────
echo ""
echo "Waiting for PostgreSQL to be ready..."
sleep 5

# ── Run Prisma migrations ─────────────────────────────────────
echo ""
echo "Running Prisma migrations..."
(cd backend && npm run prisma:generate && npm run prisma:migrate)
echo "✓ Database migrated"

# ── Done ──────────────────────────────────────────────────────
echo ""
echo "============================================"
echo "  Setup complete!"
echo ""
echo "  Next steps:"
echo "    npm run dev:backend   → Start backend"
echo "    npm run dev:frontend  → Start frontend"
echo ""
echo "  Services:"
echo "    Frontend:  http://localhost:3000"
echo "    Backend:   http://localhost:3001/api/v1"
echo "    Swagger:   http://localhost:3001/api/docs"
echo "============================================"
echo ""
