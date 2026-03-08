import type { Database } from "@mindos/db";
import { getFactsForMemories, keywordSearch, vectorSearch } from "@mindos/db";
import { RRF_K } from "@mindos/shared";
import type { Fact, SearchMode, SearchQuery, SearchResponse, SearchResult } from "@mindos/shared";
import type { EmbeddingProvider } from "../embeddings/provider.js";

export class HybridSearch {
	constructor(
		private db: Database,
		private embeddingProvider: EmbeddingProvider,
	) {}

	async search(query: SearchQuery): Promise<SearchResponse> {
		const startTime = Date.now();
		const mode = query.searchMode ?? "hybrid";
		const limit = query.limit ?? 10;
		const threshold = query.threshold ?? 0.5;

		let results: SearchResult[];

		switch (mode) {
			case "vector":
				results = await this.vectorOnly(query, limit, threshold);
				break;
			case "keyword":
				results = await this.keywordOnly(query, limit);
				break;
			case "hybrid":
				results = await this.hybridMerge(query, limit, threshold);
				break;
		}

		const latencyMs = Date.now() - startTime;
		return { results, total: results.length, searchMode: mode, latencyMs };
	}

	private async vectorOnly(
		query: SearchQuery,
		limit: number,
		threshold: number,
	): Promise<SearchResult[]> {
		const embedding = await this.embeddingProvider.embed(query.query);
		const rawResults = await vectorSearch(
			this.db,
			embedding,
			query.userId,
			limit,
			threshold,
			query.filters,
		);

		return this.attachFacts(
			rawResults.slice(0, limit).map((r) => ({
				id: r.id,
				content: r.content,
				score: r.score,
				type: r.type as SearchResult["type"],
				tags: r.tags ?? [],
				facts: [],
				metadata: r.metadata ?? undefined,
				createdAt: r.createdAt,
			})),
		);
	}

	private async keywordOnly(query: SearchQuery, limit: number): Promise<SearchResult[]> {
		const rawResults = await keywordSearch(
			this.db,
			query.query,
			query.userId,
			limit,
			query.filters,
		);

		return this.attachFacts(
			rawResults.slice(0, limit).map((r) => ({
				id: r.id,
				content: r.content,
				score: r.score,
				type: r.type as SearchResult["type"],
				tags: r.tags ?? [],
				facts: [],
				metadata: r.metadata ?? undefined,
				createdAt: r.createdAt,
			})),
		);
	}

	private async hybridMerge(
		query: SearchQuery,
		limit: number,
		threshold: number,
	): Promise<SearchResult[]> {
		// Run both searches in parallel
		const embedding = await this.embeddingProvider.embed(query.query);
		const [vectorResults, kwResults] = await Promise.all([
			vectorSearch(this.db, embedding, query.userId, limit, threshold, query.filters),
			keywordSearch(this.db, query.query, query.userId, limit, query.filters),
		]);

		// Reciprocal Rank Fusion
		const scores = new Map<string, { score: number; data: (typeof vectorResults)[0] }>();

		vectorResults.forEach((result, rank) => {
			const rrfScore = 1 / (RRF_K + rank + 1);
			const existing = scores.get(result.id);
			scores.set(result.id, {
				score: (existing?.score ?? 0) + rrfScore,
				data: result,
			});
		});

		kwResults.forEach((result, rank) => {
			const rrfScore = 1 / (RRF_K + rank + 1);
			const existing = scores.get(result.id);
			scores.set(result.id, {
				score: (existing?.score ?? 0) + rrfScore,
				data: existing?.data ?? result,
			});
		});

		// Sort by RRF score and take top N
		const merged = [...scores.values()]
			.sort((a, b) => b.score - a.score)
			.slice(0, limit)
			.map(({ score, data }) => ({
				id: data.id,
				content: data.content,
				score,
				type: data.type as SearchResult["type"],
				tags: data.tags ?? [],
				facts: [] as Fact[],
				metadata: data.metadata ?? undefined,
				createdAt: data.createdAt,
			}));

		return this.attachFacts(merged);
	}

	private async attachFacts(results: SearchResult[]): Promise<SearchResult[]> {
		if (results.length === 0) return results;

		const memoryIds = results.map((r) => r.id);
		const allFacts = await getFactsForMemories(this.db, memoryIds);

		const factsByMemory = new Map<string, Fact[]>();
		for (const fact of allFacts) {
			const existing = factsByMemory.get(fact.memoryId) ?? [];
			existing.push({
				id: fact.id,
				userId: fact.userId,
				memoryId: fact.memoryId,
				content: fact.content,
				category: fact.category as Fact["category"],
				confidence: fact.confidence,
				supersededBy: fact.supersededBy ?? undefined,
				supersedes: fact.supersedes ?? undefined,
				validFrom: fact.validFrom ?? undefined,
				validUntil: fact.validUntil ?? undefined,
				isActive: fact.isActive,
				createdAt: fact.createdAt,
			});
			factsByMemory.set(fact.memoryId, existing);
		}

		return results.map((r) => ({
			...r,
			facts: factsByMemory.get(r.id) ?? [],
		}));
	}
}
