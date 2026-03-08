import { z } from "zod";

// ─── Memory Schemas ─────────────────────────────────────────────────────────

export const memoryTypeSchema = z.enum(["conversation", "document", "note"]);

export const addMemorySchema = z.object({
	userId: z.string().min(1, "userId is required"),
	content: z.string().min(1, "content is required").max(100_000, "content too long"),
	type: memoryTypeSchema.optional().default("conversation"),
	source: z.string().max(64).optional(),
	tags: z.array(z.string().max(64)).max(20).optional().default([]),
	metadata: z.record(z.unknown()).optional(),
	sessionId: z.string().uuid().optional(),
	expiresAt: z.string().datetime().optional(),
	extractFacts: z.boolean().optional().default(true),
});

export const updateMemorySchema = z.object({
	content: z.string().min(1).max(100_000).optional(),
	tags: z.array(z.string().max(64)).max(20).optional(),
	metadata: z.record(z.unknown()).optional(),
	expiresAt: z.string().datetime().nullable().optional(),
});

export const batchAddMemorySchema = z.object({
	memories: z.array(addMemorySchema).min(1).max(100),
});

// ─── Search Schemas ─────────────────────────────────────────────────────────

export const searchModeSchema = z.enum(["vector", "keyword", "hybrid"]);

export const searchFiltersSchema = z.object({
	type: memoryTypeSchema.optional(),
	tags: z.array(z.string()).optional(),
	source: z.string().optional(),
	dateRange: z
		.object({
			from: z.string().datetime().optional(),
			to: z.string().datetime().optional(),
		})
		.optional(),
	sessionId: z.string().uuid().optional(),
});

export const searchQuerySchema = z.object({
	query: z.string().min(1, "query is required").max(2000),
	userId: z.string().min(1, "userId is required"),
	limit: z.number().int().min(1).max(100).optional().default(10),
	threshold: z.number().min(0).max(1).optional().default(0.5),
	searchMode: searchModeSchema.optional().default("hybrid"),
	filters: searchFiltersSchema.optional(),
});

// ─── User Schemas ───────────────────────────────────────────────────────────

export const createUserSchema = z.object({
	externalId: z.string().max(255).optional(),
	orgId: z.string().uuid().optional(),
	metadata: z.record(z.unknown()).optional(),
});

// ─── Profile Schemas ────────────────────────────────────────────────────────

export const updateProfileSchema = z.object({
	staticProfile: z
		.object({
			name: z.string().optional(),
			preferences: z.record(z.string()).optional(),
			traits: z.array(z.string()).optional(),
			demographics: z.record(z.string()).optional(),
		})
		.optional(),
	dynamicContext: z
		.object({
			currentTopics: z.array(z.string()).optional(),
			recentEntities: z.array(z.string()).optional(),
			mood: z.string().optional(),
			activeGoals: z.array(z.string()).optional(),
		})
		.optional(),
});

// ─── Pagination Schema ──────────────────────────────────────────────────────

export const paginationSchema = z.object({
	page: z.coerce.number().int().min(1).optional().default(1),
	limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

// ─── API Key Schemas ────────────────────────────────────────────────────────

export const createApiKeySchema = z.object({
	name: z.string().min(1).max(255),
	orgId: z.string().uuid().optional(),
	permissions: z.array(z.string()).optional().default(["*"]),
	rateLimit: z.number().int().min(1).max(100_000).optional().default(1000),
	expiresAt: z.string().datetime().optional(),
});
