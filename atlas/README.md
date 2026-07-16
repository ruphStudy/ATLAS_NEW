# ATLAS – AI Commerce Operating System

> Enterprise-grade AI-powered commerce platform built for scale.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 15, React 19, TypeScript, Tailwind CSS, TanStack Query v5, Zustand v5, React Hook Form, Zod |
| **Backend** | NestJS 10, TypeScript (Strict), Prisma 5, PostgreSQL 17 |
| **Cache / Queue** | Redis 7, BullMQ 5 |
| **Infrastructure** | Docker, Docker Compose |
| **Code Quality** | ESLint, Prettier, Husky, lint-staged, Commitlint |
| **Testing** | Jest, Supertest |

---

## Prerequisites

- Node.js >= 20.0.0
- npm >= 10.0.0
- Docker & Docker Compose

---

## Getting Started

### 1. Clone and install

```bash
git clone <repo-url> atlas
cd atlas
npm install
```

### 2. Configure environment

```bash
# Root
cp .env.example .env

# Backend
cp backend/.env.example backend/.env

# Frontend
cp frontend/.env.example frontend/.env
```

### 3. Start infrastructure

```bash
npm run docker:up
```

### 4. Run database migrations

```bash
cd backend
npm run prisma:migrate
npm run prisma:generate
```

### 5. Start development servers

```bash
# Terminal 1 – Backend
npm run dev:backend

# Terminal 2 – Frontend
npm run dev:frontend
```

---

## Services

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:3001/api/v1 |
| Swagger Docs | http://localhost:3001/api/docs |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |

---

## Project Structure

```
atlas/
├── backend/          # NestJS API Server
├── frontend/         # Next.js Application
├── shared/           # Shared Types, Constants, Utils
├── docker/           # Dockerfiles
├── scripts/          # Automation Scripts
├── docs/             # Project Documentation
├── .github/          # CI/CD Workflows
└── docker-compose.yml
```

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev:backend` | Start backend in watch mode |
| `npm run dev:frontend` | Start frontend in dev mode |
| `npm run docker:up` | Start all Docker services |
| `npm run docker:down` | Stop all Docker services |
| `npm run docker:reset` | Reset volumes and restart |
| `npm run lint` | Run ESLint across all packages |
| `npm run format` | Run Prettier across all files |

---

## Commit Convention

This project follows [Conventional Commits](https://www.conventionalcommits.org/).

```
feat: add product listing module skeleton
fix: resolve pagination offset calculation
docs: update API contract for workspace endpoints
chore: upgrade prisma to 5.18
```

---

## Architecture

- **Modular Monolith** – Clean module boundaries, easy to extract to microservices
- **Clean Architecture** – Controllers → Services → Repositories → Database
- **Repository Pattern** – Repositories are the only layer that access Prisma
- **Event-Driven** – Long-running operations via BullMQ queues

---

## License

UNLICENSED – Proprietary
