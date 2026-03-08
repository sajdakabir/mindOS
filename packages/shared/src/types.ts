// ─── Memory Types ───────────────────────────────────────────────────────────

export type MemoryType = "conversation" | "document" | "note";

export interface Memory {
	id: string;
	userId: string;
	content: string;
	type: MemoryType;
	source?: string;
	tags: string[];
	metadata?: Record<string, unknown>;
	sessionId?: string;
	expiresAt?: Date;
	isActive: boolean;
	createdAt: Date;
	updatedAt: Date;
}

export interface AddMemoryInput {
	userId: string;
	content: string;
	type?: MemoryType;
	source?: string;
	tags?: string[];
	metadata?: Record<string, unknown>;
	sessionId?: string;
	expiresAt?: string;
	extractFacts?: boolean;
}

export interface UpdateMemoryInput {
	content?: string;
	tags?: string[];
	metadata?: Record<string, unknown>;
	expiresAt?: string | null;
}

// ─── Fact Types ─────────────────────────────────────────────────────────────

export type FactCategory = "preference" | "biographical" | "contextual" | "temporal";

export interface Fact {
	id: string;
	userId: string;
	memoryId: string;
	content: string;
	category: FactCategory;
	confidence: number;
	supersededBy?: string;
	supersedes?: string;
	validFrom?: Date;
	validUntil?: Date;
	isActive: boolean;
	createdAt: Date;
}

// ─── Profile Types ──────────────────────────────────────────────────────────

export interface StaticProfile {
	name?: string;
	preferences: Record<string, string>;
	traits: string[];
	demographics: Record<string, string>;
}

export interface DynamicContext {
	currentTopics: string[];
	recentEntities: string[];
	mood?: string;
	activeGoals: string[];
}

export interface UserProfile {
	id: string;
	userId: string;
	staticProfile: StaticProfile;
	dynamicContext: DynamicContext;
	summary?: string;
	factCount: number;
	lastInteractionAt?: Date;
	createdAt: Date;
	updatedAt: Date;
}

// ─── Search Types ───────────────────────────────────────────────────────────

export type SearchMode = "vector" | "keyword" | "hybrid";

export interface SearchQuery {
	query: string;
	userId: string;
	limit?: number;
	threshold?: number;
	searchMode?: SearchMode;
	filters?: SearchFilters;
}

export interface SearchFilters {
	type?: MemoryType;
	tags?: string[];
	source?: string;
	dateRange?: {
		from?: string;
		to?: string;
	};
	sessionId?: string;
}

export interface SearchResult {
	id: string;
	content: string;
	score: number;
	type: MemoryType;
	tags: string[];
	facts: Fact[];
	metadata?: Record<string, unknown>;
	createdAt: Date;
}

export interface SearchResponse {
	results: SearchResult[];
	total: number;
	searchMode: SearchMode;
	latencyMs: number;
}

// ─── User Types ─────────────────────────────────────────────────────────────

export interface User {
	id: string;
	externalId?: string;
	orgId?: string;
	metadata?: Record<string, unknown>;
	createdAt: Date;
	updatedAt: Date;
}

export interface CreateUserInput {
	externalId?: string;
	orgId?: string;
	metadata?: Record<string, unknown>;
}

// ─── Session Types ──────────────────────────────────────────────────────────

export interface Session {
	id: string;
	userId: string;
	name?: string;
	metadata?: Record<string, unknown>;
	startedAt: Date;
	endedAt?: Date;
}

// ─── API Key Types ──────────────────────────────────────────────────────────

export interface ApiKey {
	id: string;
	key: string;
	name: string;
	orgId?: string;
	permissions: string[];
	rateLimit: number;
	lastUsedAt?: Date;
	expiresAt?: Date;
	createdAt: Date;
}

// ─── Plugin Types ───────────────────────────────────────────────────────────

export interface PluginInfo {
	id: string;
	name: string;
	version: string;
	description?: string;
	configSchema?: Record<string, unknown>;
}

export interface PluginConnection {
	id: string;
	userId: string;
	pluginId: string;
	config?: Record<string, unknown>;
	status: string;
	lastSyncAt?: Date;
	createdAt: Date;
}

export interface SyncResult {
	items: SyncItem[];
	nextCursor?: string;
	hasMore: boolean;
}

export interface SyncItem {
	externalId: string;
	content: string;
	title?: string;
	metadata: Record<string, unknown>;
	updatedAt: Date;
}

// ─── API Response Types ─────────────────────────────────────────────────────

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

export interface PaginationParams {
	page?: number;
	limit?: number;
}
