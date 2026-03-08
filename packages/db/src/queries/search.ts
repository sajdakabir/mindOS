import type { SearchFilters } from "@mindos/shared";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import type { Database } from "../index.js";
import { facts } from "../schema/facts.js";
import { memories } from "../schema/memories.js";

interface VectorSearchResult {
	id: string;
	content: string;
	type: string;
	tags: string[];
	metadata: Record<string, unknown> | null;
	createdAt: Date;
	score: number;
}

export async function vectorSearch(
	db: Database,
	embedding: number[],
	userId: string,
	limit: number,
	threshold: number,
	filters?: SearchFilters,
): Promise<VectorSearchResult[]> {
	const embeddingStr = JSON.stringify(embedding);
	const conditions = buildFilterConditions(userId, filters);

	const results = await db.execute(sql`
		SELECT
			id,
			content,
			type,
			tags,
			metadata,
			created_at as "createdAt",
			1 - (embedding <=> ${embeddingStr}::vector) as score
		FROM memories
		WHERE embedding IS NOT NULL
			AND is_active = true
			${conditions}
			AND 1 - (embedding <=> ${embeddingStr}::vector) >= ${threshold}
		ORDER BY embedding <=> ${embeddingStr}::vector
		LIMIT ${limit * 2}
	`);

	return results.rows as unknown as VectorSearchResult[];
}

export async function keywordSearch(
	db: Database,
	query: string,
	userId: string,
	limit: number,
	filters?: SearchFilters,
): Promise<VectorSearchResult[]> {
	const conditions = buildFilterConditions(userId, filters);

	const results = await db.execute(sql`
		SELECT
			id,
			content,
			type,
			tags,
			metadata,
			created_at as "createdAt",
			ts_rank(search_vector, plainto_tsquery('english', ${query})) as score
		FROM memories
		WHERE search_vector @@ plainto_tsquery('english', ${query})
			AND is_active = true
			${conditions}
		ORDER BY score DESC
		LIMIT ${limit * 2}
	`);

	return results.rows as unknown as VectorSearchResult[];
}

export async function getFactsForMemories(db: Database, memoryIds: string[]) {
	if (memoryIds.length === 0) return [];

	return db
		.select()
		.from(facts)
		.where(and(sql`${facts.memoryId} = ANY(${memoryIds}::uuid[])`, eq(facts.isActive, true)));
}

function buildFilterConditions(userId: string, filters?: SearchFilters) {
	const parts: ReturnType<typeof sql>[] = [sql`AND user_id = ${userId}`];

	if (filters?.type) {
		parts.push(sql`AND type = ${filters.type}`);
	}

	if (filters?.tags && filters.tags.length > 0) {
		parts.push(sql`AND tags ?| ${filters.tags}::text[]`);
	}

	if (filters?.source) {
		parts.push(sql`AND source = ${filters.source}`);
	}

	if (filters?.sessionId) {
		parts.push(sql`AND session_id = ${filters.sessionId}`);
	}

	if (filters?.dateRange?.from) {
		parts.push(sql`AND created_at >= ${filters.dateRange.from}::timestamp`);
	}

	if (filters?.dateRange?.to) {
		parts.push(sql`AND created_at <= ${filters.dateRange.to}::timestamp`);
	}

	return sql.join(parts, sql` `);
}
