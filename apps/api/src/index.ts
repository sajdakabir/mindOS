import { serve } from "@hono/node-server";
import {
	type EmbeddingProvider,
	type LLMProvider,
	MemoryEngine,
	OllamaEmbeddingProvider,
	OllamaLLMProvider,
	OpenAIEmbeddingProvider,
	OpenAILLMProvider,
	ProfileBuilder,
	createJobQueue,
	createWorker,
	scheduleExpiryCleanup,
} from "@mindos/core";
import { createDatabase } from "@mindos/db";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { authMiddleware } from "./middleware/auth.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { apiKeyRoutes } from "./routes/apikeys.js";
import { factRoutes } from "./routes/facts.js";
import { healthRoutes } from "./routes/health.js";
import { memoryRoutes } from "./routes/memories.js";
import { profileRoutes } from "./routes/profiles.js";
import { userRoutes } from "./routes/users.js";

// ─── Configuration ──────────────────────────────────────────────────────────

const PORT = Number.parseInt(process.env.PORT ?? "3000", 10);
const DATABASE_URL = process.env.DATABASE_URL;
const REDIS_URL = process.env.REDIS_URL;
const OLLAMA_URL = process.env.OLLAMA_URL;
const useOllama = !!OLLAMA_URL;

if (!DATABASE_URL) {
	console.error("DATABASE_URL is required");
	process.exit(1);
}

if (!useOllama && !process.env.OPENAI_API_KEY) {
	console.error("Either OPENAI_API_KEY or OLLAMA_URL is required");
	process.exit(1);
}

// ─── Initialize Providers (auto-detect Ollama vs OpenAI) ────────────────────

const db = createDatabase(DATABASE_URL);

let embeddingProvider: EmbeddingProvider;
let llmProvider: LLMProvider;

if (useOllama) {
	console.log(`Using Ollama at ${OLLAMA_URL} (fully local, no API key needed)`);
	embeddingProvider = new OllamaEmbeddingProvider({
		baseUrl: OLLAMA_URL,
		model: process.env.OLLAMA_EMBEDDING_MODEL ?? "nomic-embed-text",
		dimensions: process.env.EMBEDDING_DIMENSIONS
			? Number.parseInt(process.env.EMBEDDING_DIMENSIONS, 10)
			: 768,
	});
	llmProvider = new OllamaLLMProvider({
		baseUrl: OLLAMA_URL,
		model: process.env.OLLAMA_LLM_MODEL ?? "llama3.2",
	});
} else {
	console.log("Using OpenAI");
	embeddingProvider = new OpenAIEmbeddingProvider({
		apiKey: process.env.OPENAI_API_KEY,
		model: process.env.EMBEDDING_MODEL,
		dimensions: process.env.EMBEDDING_DIMENSIONS
			? Number.parseInt(process.env.EMBEDDING_DIMENSIONS, 10)
			: undefined,
	});
	llmProvider = new OpenAILLMProvider({
		apiKey: process.env.OPENAI_API_KEY,
		model: process.env.LLM_MODEL ?? "gpt-4o-mini",
	});
}

const engine = new MemoryEngine(db, embeddingProvider);
const profileBuilder = new ProfileBuilder(db, llmProvider);

// ─── BullMQ Worker (optional, requires Redis) ──────────────────────────────

let jobQueue: ReturnType<typeof createJobQueue> | null = null;

if (REDIS_URL) {
	jobQueue = createJobQueue(REDIS_URL);
	createWorker(REDIS_URL, db, llmProvider, embeddingProvider);
	scheduleExpiryCleanup(jobQueue).catch(console.error);
	console.log("BullMQ worker started (fact extraction + expiry cleanup)");
} else {
	console.warn("REDIS_URL not set — background jobs disabled (fact extraction won't run)");
}

// ─── Hono App ───────────────────────────────────────────────────────────────

const app = new Hono();

app.use("*", cors());
app.use("*", logger());
app.onError(errorHandler);

// Public routes
app.route("/", healthRoutes(db));
app.route("/v1/api-keys", apiKeyRoutes(db));

// Protected routes
const api = new Hono();
api.use("*", authMiddleware(db));
api.route("/memories", memoryRoutes(engine, jobQueue));
api.route("/users", userRoutes(engine));
api.route("/facts", factRoutes(db));
api.route("/profiles", profileRoutes(db, profileBuilder));

app.route("/v1", api);

app.get("/", (c) =>
	c.json({
		name: "mindOS",
		version: "0.3.0",
		description: "The open-source AI memory engine",
		provider: useOllama ? "ollama" : "openai",
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
