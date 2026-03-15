<p align="center">
  <h1 align="center">🧠 mindOS</h1>
  <p align="center">The open-source AI memory engine.<br/>Give your AI apps persistent long-term memory.</p>
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> •
  <a href="#features">Features</a> •
  <a href="#api-reference">API</a> •
  <a href="#self-hosting">Self-Hosting</a> •
  <a href="#sdk">SDK</a> •
  <a href="#contributing">Contributing</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License" />
  <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome" />
  <img src="https://img.shields.io/badge/TypeScript-5.7-blue.svg" alt="TypeScript" />
</p>

---

## Why mindOS?

LLMs have no memory between conversations. Users repeat context every time. **mindOS** fixes this with a simple API that stores, retrieves, and manages memories across sessions.

| Feature | Others | mindOS |
|---------|--------|--------|
| Self-hosting | Enterprise/paid | `docker compose up` |
| Infrastructure | Vendor-locked | PostgreSQL + any infra |
| Search latency | ~400ms (proxy) | <200ms (direct API) |
| Memory control | Automatic only | Explicit CRUD + auto |
| Pricing | Usage-based SaaS | Free forever (MIT) |

## Quick Start

### Option 1: Docker (recommended)

```bash
git clone https://github.com/sajdakabir/mindOS.git && cd mindos
cp .env.example .env        # Add your OPENAI_API_KEY
cd docker && docker compose up
```

Your API is running at `http://localhost:3000`.

### Option 2: Local Development

```bash
git clone https://github.com/sajdakabir/mindOS.git && cd mindos
pnpm install
cp .env.example .env        # Configure DATABASE_URL, OPENAI_API_KEY

# Start Postgres (pgvector) and Redis
cd docker && docker compose -f docker-compose.dev.yml up -d && cd ..

# Run migrations
pnpm db:migrate

# Start the API
pnpm dev --filter=@mindos/api
```

### Create an API key

```bash
curl -X POST http://localhost:3000/v1/api-keys \
  -H "Content-Type: application/json" \
  -d '{"name": "my-app"}'
```

### Store a memory

```bash
curl -X POST http://localhost:3000/v1/memories \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_123",
    "content": "I prefer dark mode and use TypeScript daily.",
    "tags": ["preferences"]
  }'
```

### Search memories

```bash
curl -X POST http://localhost:3000/v1/memories/search \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What are their coding preferences?",
    "userId": "user_123"
  }'
```

## Features

### Core Memory Engine
- **Memory CRUD** — Store, retrieve, update, and delete memories via REST API
- **Hybrid Search** — Vector similarity (pgvector) + keyword search (tsvector) combined via Reciprocal Rank Fusion
- **Fact Extraction** — Automatically extract discrete facts from conversations using LLMs
- **Contradiction Resolution** — New facts automatically supersede conflicting older ones
- **Temporal Memory** — Support for expiring context (e.g., "meeting tomorrow")
- **User Profiles** — Static (preferences, traits) + Dynamic (current context) profiles

### Developer Experience
- **REST API** — Clean, versioned API with OpenAPI spec
- **TypeScript SDK** — `@mindos/sdk` for Node.js/browser (`npm install @mindos/sdk`)
- **MCP Server** — Integrates with Claude Desktop, Cursor, VS Code
- **Multi-tenancy** — Scope memories by user, organization, or project

### Benchmarking
- **LoCoMo Benchmark** — Evaluate memory accuracy on the LoCoMo conversational dataset
- **6-Stage Pipeline** — Ingest, index, search, answer, evaluate, report
- **LLM Judge** — GPT-4o/GPT-4o-mini scoring or fast F1-based judge
- **Performance Tests** — Search latency (P50/P95/P99) and ingestion throughput
- **CLI** — `mindos-bench run`, `mindos-bench perf`, `mindos-bench info`

### Infrastructure
- **Zero vendor lock-in** — PostgreSQL + any S3-compatible storage
- **One-click deploy** — Docker Compose, Railway, Render
- **Lightweight** — Single Postgres instance handles vectors, full-text search, and relational data
- **Plugin system** — Extensible connectors for Google Drive, Notion, GitHub

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  Client Apps                     │
│         (SDK / REST API / MCP Server)            │
└─────────────────┬───────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────┐
│              Hono API Server                     │
│    ┌──────┐ ┌──────────┐ ┌──────────────────┐   │
│    │ Auth │ │ Rate     │ │ Error Handler    │   │
│    │      │ │ Limiter  │ │                  │   │
│    └──────┘ └──────────┘ └──────────────────┘   │
└─────────────────┬───────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────┐
│              Memory Engine (Core)                │
│  ┌───────────┐ ┌──────────┐ ┌────────────────┐  │
│  │ Hybrid    │ │ Fact     │ │ Contradiction  │  │
│  │ Search    │ │ Extractor│ │ Resolver       │  │
│  └───────────┘ └──────────┘ └────────────────┘  │
│  ┌───────────┐ ┌──────────┐ ┌────────────────┐  │
│  │ Profile   │ │ Temporal │ │ Embedding      │  │
│  │ Builder   │ │ Manager  │ │ Provider       │  │
│  └───────────┘ └──────────┘ └────────────────┘  │
└─────────────────┬───────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────┐
│     PostgreSQL (pgvector) + Redis (BullMQ)       │
│                                                  │
│  memories ──► embeddings (HNSW index)            │
│           ──► search_vector (GIN index)          │
│  facts ────► contradiction chains                │
│  profiles ─► static + dynamic context            │
└──────────────────────────────────────────────────┘
```

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/v1/memories` | Add a memory |
| `GET` | `/v1/memories/:id` | Get memory with facts |
| `PUT` | `/v1/memories/:id` | Update memory |
| `DELETE` | `/v1/memories/:id` | Delete memory |
| `POST` | `/v1/memories/search` | Hybrid search |
| `POST` | `/v1/memories/batch` | Batch add memories |
| `POST` | `/v1/users` | Create a user |
| `GET` | `/v1/users/:id` | Get user |
| `DELETE` | `/v1/users/:id` | Delete user + all data |
| `GET` | `/v1/users/:id/stats` | User memory stats |
| `POST` | `/v1/api-keys` | Create API key |
| `GET` | `/healthz` | Health check |

All protected endpoints require `Authorization: Bearer <api_key>` header.

## Self-Hosting

### Docker Compose (easiest)

```bash
cp .env.example .env
# Set OPENAI_API_KEY in .env
cd docker && docker compose up -d
```

This starts:
- **API server** on port 3000
- **PostgreSQL 17** with pgvector on port 5432
- **Redis 7** on port 6379

### Railway

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template)

### Render

Use the included `deploy/render.yaml` Blueprint.

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `REDIS_URL` | No | — | Redis connection string |
| `OPENAI_API_KEY` | Yes* | — | OpenAI API key for embeddings |
| `EMBEDDING_MODEL` | No | `text-embedding-3-small` | Embedding model |
| `EMBEDDING_DIMENSIONS` | No | `1536` | Embedding dimensions |
| `PORT` | No | `3000` | API server port |

*Not required if using Ollama for local embeddings.

## Project Structure

```
mindOS/
├── apps/
│   ├── api/          # Hono REST API server
│   ├── dashboard/    # Next.js admin UI
│   └── mcp/          # MCP server for IDE integration
├── packages/
│   ├── bench/        # Benchmark suite (LoCoMo, perf tests)
│   ├── core/         # Memory engine (search, extraction, profiles)
│   ├── db/           # Drizzle schema, migrations, queries
│   ├── sdk/          # TypeScript SDK
│   └── shared/       # Types, validation, constants
├── plugins/          # Connector plugins
├── docker/           # Docker Compose configs
└── deploy/           # Railway, Render configs
```

## Tech Stack

- **API**: [Hono](https://hono.dev) — ultrafast, runs on Node/Bun/Deno/Edge
- **Database**: [PostgreSQL](https://www.postgresql.org) + [pgvector](https://github.com/pgvector/pgvector) — vectors + full-text search + relational in one DB
- **ORM**: [Drizzle](https://orm.drizzle.team) — type-safe, zero overhead
- **Search**: Hybrid (vector + keyword) with [Reciprocal Rank Fusion](https://plg.uwaterloo.ca/~gvcormac/cormacksigir09-rrf.pdf)
- **Monorepo**: [Turborepo](https://turbo.build) + [pnpm](https://pnpm.io)
- **Quality**: [Biome](https://biomejs.dev) (lint + format)

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

```bash
# Clone and install
git clone https://github.com/sajdakabir/mindOS.git && cd mindos
pnpm install

# Start infra
cd docker && docker compose -f docker-compose.dev.yml up -d && cd ..

# Run migrations
pnpm db:migrate

# Start dev server
pnpm dev --filter=@mindos/api

# Run tests
pnpm test

# Lint & format
pnpm lint:fix
```

## Roadmap

- [x] Memory CRUD API
- [x] Hybrid search (vector + keyword + RRF)
- [x] Docker Compose self-hosting
- [x] Fact extraction pipeline
- [x] Contradiction resolution
- [x] User profiles (static + dynamic)
- [x] MCP server for IDE integration
- [x] TypeScript SDK (`@mindos/sdk`)
- [x] Dashboard UI
- [x] Plugin system (Google Drive, Notion, GitHub)
- [x] Ollama support (fully local, no API key needed)
- [x] CI/CD (GitHub Actions)
- [x] Test suite (Vitest)
- [ ] Python SDK

## License

[MIT](LICENSE) — use it however you want.

---

<p align="center">
  Built with care for the AI community.
  <br/>
  <strong>Star this repo</strong> if you find it useful!
</p>
