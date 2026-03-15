# Contributing to mindOS

Thanks for your interest in contributing to mindOS! This guide will help you get started.

## Development Setup

### Prerequisites

- **Node.js** >= 20.0.0
- **pnpm** >= 9.15.0
- **Docker** + Docker Compose (for Postgres and Redis)

### Getting Started

```bash
# Clone the repo
git clone https://github.com/sajdakabir/mindOS.git && cd mindOS

# Install dependencies
pnpm install

# Copy environment config
cp .env.example .env
# Edit .env — add your OPENAI_API_KEY (or set OLLAMA_URL for local)

# Start Postgres (pgvector) and Redis
cd docker && docker compose -f docker-compose.dev.yml up -d && cd ..

# Run database migrations
pnpm db:migrate

# Start the API server
pnpm dev --filter=@mindos/api
```

The API will be available at `http://localhost:3000`.

## Project Structure

| Package | Description |
|---------|-------------|
| `apps/api` | Hono REST API server |
| `apps/dashboard` | Next.js admin dashboard |
| `apps/mcp` | MCP server for IDE integration |
| `packages/core` | Memory engine (search, extraction, profiles) |
| `packages/db` | Drizzle schema, migrations, queries |
| `packages/sdk` | TypeScript SDK |
| `packages/shared` | Types, validation schemas, constants |
| `plugins/*` | Connector plugins |

## Development Workflow

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests for a specific package
pnpm test --filter=@mindos/core

# Run tests in watch mode
cd packages/core && npx vitest
```

### Linting & Formatting

We use [Biome](https://biomejs.dev) for both linting and formatting.

```bash
# Check for issues
pnpm lint

# Auto-fix issues
pnpm lint:fix

# Format code
pnpm format
```

### Building

```bash
# Build all packages
pnpm build

# Build a specific package
pnpm build --filter=@mindos/core
```

### End-to-End Tests

```bash
# Requires Docker
./scripts/test-e2e.sh
```

## Code Style

- **Indentation**: Tabs
- **Quotes**: Double quotes
- **Semicolons**: Always
- **Line width**: 100 characters
- **Formatter**: Biome (not Prettier)
- **Linter**: Biome (not ESLint)

These are enforced by the Biome config in `biome.json`.

## Making Changes

1. **Fork** the repository
2. **Create a branch** from `master`: `git checkout -b feat/my-feature`
3. **Make your changes** — keep commits focused and descriptive
4. **Run checks**: `pnpm lint && pnpm build && pnpm test`
5. **Push** and open a **Pull Request**

### Commit Messages

Use clear, descriptive commit messages:

- `feat: add memory tagging support`
- `fix: handle null embeddings in search`
- `docs: update API reference for batch endpoint`
- `refactor: simplify RRF scoring logic`

### PR Guidelines

- Keep PRs focused — one feature or fix per PR
- Include tests for new functionality
- Update types in `packages/shared` if you change API contracts
- Make sure CI passes before requesting review

## Architecture Notes

### Database

Single PostgreSQL instance with pgvector. No separate vector database needed.

- **Embeddings**: Stored as `vector(1536)` with HNSW index
- **Full-text search**: `tsvector` column with GIN index
- **Hybrid search**: Vector + keyword results merged via Reciprocal Rank Fusion (RRF)

### Async Processing

Fact extraction runs asynchronously via BullMQ workers:

1. API stores memory and returns immediately (202)
2. Worker extracts facts via LLM
3. Worker checks for contradictions against existing facts
4. Worker rebuilds user profile

### Provider Abstraction

The system supports multiple embedding/LLM providers:

- **OpenAI** (default): `text-embedding-3-small` + `gpt-4o-mini`
- **Ollama** (local): `nomic-embed-text` + any local model

Set `OLLAMA_URL` in `.env` to use Ollama instead of OpenAI.

## Getting Help

- Open an [issue](https://github.com/sajdakabir/mindOS/issues) for bugs or feature requests
- Check existing issues before creating a new one

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
