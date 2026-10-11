# =============================================================
# ATLAS Backend – Dockerfile
# Multi-stage build: development | production
# Monorepo / npm workspaces compatible
# =============================================================

# ── Base ──────────────────────────────────────────────────────
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# ── Development ───────────────────────────────────────────────
FROM base AS development
ENV NODE_ENV=development

COPY package.json package-lock.json ./
COPY backend/package.json ./backend/package.json
COPY shared/package.json ./shared/package.json

RUN npm ci

COPY backend ./backend
COPY shared ./shared

WORKDIR /app/backend

RUN npx prisma generate

EXPOSE 3001
CMD ["npm", "run", "start:dev"]

# ── Builder ───────────────────────────────────────────────────
FROM base AS builder
ENV NODE_ENV=development

COPY package.json package-lock.json ./
COPY backend/package.json ./backend/package.json
COPY shared/package.json ./shared/package.json

RUN npm ci

COPY backend ./backend
COPY shared ./shared

WORKDIR /app/backend

RUN npx prisma generate
RUN npm run build

# ── Production ────────────────────────────────────────────────
FROM base AS production
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

COPY package.json package-lock.json ./
COPY backend/package.json ./backend/package.json
COPY shared/package.json ./shared/package.json

RUN npm ci --omit=dev --workspace=backend --ignore-scripts && npm cache clean --force

COPY --from=builder --chown=nestjs:nodejs /app/backend/dist ./backend/dist
COPY --from=builder --chown=nestjs:nodejs /app/backend/prisma ./backend/prisma
COPY --from=builder --chown=nestjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma

USER nestjs
WORKDIR /app/backend

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3001/health/liveness || exit 1

CMD ["node", "dist/src/main.js"]