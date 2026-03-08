// ─── Client Options ─────────────────────────────────────────────────────────

export interface MindOSOptions {
	apiKey: string;
	baseUrl?: string;
	timeout?: number;
}

// ─── Memory Types ───────────────────────────────────────────────────────────

export interface Memory {
	id: string;
	userId: string;
	content: string;
	type: string;
	source?: string;
	tags: string[];
	metadata?: Record<string, unknown>;
	sessionId?: string;
	expiresAt?: string;
	isActive: boolean;
	factExtractionStatus?: string;
	createdAt: string;
	updatedAt: string;
}

export interface AddMemoryParams {
	userId: string;
	content: string;
	type?: "conversation" | "document" | "note";
	source?: string;
	tags?: string[];
	metadata?: Record<string, unknown>;
	sessionId?: string;
	expiresAt?: string;
	extractFacts?: boolean;
}

export interface UpdateMemoryParams {
	content?: string;
	tags?: string[];
	metadata?: Record<string, unknown>;
	expiresAt?: string | null;
}

export interface SearchParams {
	query: string;
	userId: string;
	limit?: number;
	threshold?: number;
	searchMode?: "vector" | "keyword" | "hybrid";
	filters?: {
		type?: string;
		tags?: string[];
		source?: string;
		dateRange?: { from?: string; to?: string };
		sessionId?: string;
	};
}

export interface SearchResult {
	id: string;
	content: string;
	score: number;
	type: string;
	tags: string[];
	facts: Fact[];
	metadata?: Record<string, unknown>;
	createdAt: string;
}

export interface SearchResponse {
	results: SearchResult[];
	total: number;
	searchMode: string;
	latencyMs: number;
}

// ─── Fact Types ─────────────────────────────────────────────────────────────

export interface Fact {
	id: string;
	userId: string;
	memoryId: string;
	content: string;
	category: string;
	confidence: number;
	supersededBy?: string;
	supersedes?: string;
	isActive: boolean;
	createdAt: string;
}

// ─── Profile Types ──────────────────────────────────────────────────────────

export interface UserProfile {
	id: string;
	userId: string;
	staticProfile: {
		name?: string;
		preferences: Record<string, string>;
		traits: string[];
		demographics: Record<string, string>;
	};
	dynamicContext: {
		currentTopics: string[];
		recentEntities: string[];
		mood?: string;
		activeGoals: string[];
	};
	summary?: string;
	factCount: number;
	lastInteractionAt?: string;
	createdAt: string;
	updatedAt: string;
}

// ─── User Types ─────────────────────────────────────────────────────────────

export interface User {
	id: string;
	externalId?: string;
	orgId?: string;
	metadata?: Record<string, unknown>;
	createdAt: string;
	updatedAt: string;
}

export interface CreateUserParams {
	externalId?: string;
	orgId?: string;
	metadata?: Record<string, unknown>;
}

// ─── API Response ───────────────────────────────────────────────────────────

export interface ApiResponse<T> {
	data: T;
	meta?: {
		page?: number;
		limit?: number;
		total?: number;
	};
}

export interface ApiError {
	error: {
		code: string;
		message: string;
		details?: unknown;
	};
}
