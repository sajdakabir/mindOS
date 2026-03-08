// ─── Defaults ───────────────────────────────────────────────────────────────

export const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small";
export const DEFAULT_EMBEDDING_DIMENSIONS = 1536;
export const DEFAULT_SEARCH_LIMIT = 10;
export const DEFAULT_SEARCH_THRESHOLD = 0.5;
export const DEFAULT_SEARCH_MODE = "hybrid" as const;
export const DEFAULT_RATE_LIMIT = 1000;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_CONTENT_LENGTH = 100_000;
export const MAX_BATCH_SIZE = 100;
export const MAX_TAGS = 20;

// ─── RRF (Reciprocal Rank Fusion) ──────────────────────────────────────────

export const RRF_K = 60;

// ─── API Key Prefix ─────────────────────────────────────────────────────────

export const API_KEY_PREFIX = "sk_mindos_";
export const API_KEY_LENGTH = 48;

// ─── Temporal ───────────────────────────────────────────────────────────────

export const EXPIRY_CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
export const DEFAULT_TEMPORAL_BUFFER_HOURS = 1; // Extra time after event before expiring

// ─── Embedding Cache ────────────────────────────────────────────────────────

export const EMBEDDING_CACHE_TTL_SECONDS = 300; // 5 minutes
export const EMBEDDING_CACHE_PREFIX = "emb:";

// ─── Fact Extraction ────────────────────────────────────────────────────────

export const MAX_CHUNK_TOKENS = 2000;
export const CHUNK_OVERLAP_TOKENS = 200;
export const DEDUP_SIMILARITY_THRESHOLD = 0.95;
export const CONTRADICTION_SIMILARITY_THRESHOLD = 0.6;
