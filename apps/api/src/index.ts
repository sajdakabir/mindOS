import { serve } from "@hono/node-server";
import { MemoryEngine, OpenAIEmbeddingProvider } from "@mindos/core";
import { createDatabase } from "@mindos/db";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { authMiddleware } from "./middleware/auth.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { apiKeyRoutes } from "./routes/apikeys.js";
import { healthRoutes } from "./routes/health.js";
import { memoryRoutes } from "./routes/memories.js";
import { userRoutes } from "./routes/users.js";

// ─── Configuration ──────────────────────────────────────────────────────────

const PORT = Number.parseInt(process.env.PORT ?? "3000", 10);
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
	console.error("DATABASE_URL is required");
	process.exit(1);
}

// ─── Initialize Services ───────────────────────────────────────────────────

const db = createDatabase(DATABASE_URL);

const embeddingProvider = new OpenAIEmbeddingProvider({
	apiKey: process.env.OPENAI_API_KEY,
	model: process.env.EMBEDDING_MODEL,
	dimensions: process.env.EMBEDDING_DIMENSIONS
		? Number.parseInt(process.env.EMBEDDING_DIMENSIONS, 10)
		: undefined,
});

const engine = new MemoryEngine(db, embeddingProvider);

// ─── Hono App ───────────────────────────────────────────────────────────────

const app = new Hono();

// Global middleware
app.use("*", cors());
app.use("*", logger());

// Error handler
app.onError(errorHandler);

// Public routes (no auth)
app.route("/", healthRoutes(db));

// API key creation (bootstrap route — in production, protect this differently)
app.route("/v1/api-keys", apiKeyRoutes(db));

// Protected routes
const api = new Hono();
api.use("*", authMiddleware(db));
api.route("/memories", memoryRoutes(engine));
api.route("/users", userRoutes(engine));

app.route("/v1", api);

// Root
app.get("/", (c) =>
	c.json({
		name: "mindOS",
		version: "0.1.0",
		description: "The open-source AI memory engine",
		docs: "/v1/openapi.json",
	}),
);

// ─── Start Server ───────────────────────────────────────────────────────────

console.log(`
  ╔══════════════════════════════════════╗
  ║         mindOS API Server            ║
  ║      http://localhost:${PORT}           ║
  ╚══════════════════════════════════════╝
`);

serve({ fetch: app.fetch, port: PORT });

export default app;
