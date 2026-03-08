import { createHash } from "node:crypto";
import type { Database } from "@mindos/db";
import {
	checkDuplicateContent,
	deleteUser,
	getMemoryById,
	getMemoryWithFacts,
	getUserById,
	getUserStats,
	insertMemory,
	insertUser,
	listMemories,
	setMemoryEmbedding,
	softDeleteMemory,
	updateMemory,
} from "@mindos/db";
import type {
	AddMemoryInput,
	CreateUserInput,
	Memory,
	PaginationParams,
	SearchQuery,
	SearchResponse,
	UpdateMemoryInput,
} from "@mindos/shared";
import { ConflictError, DEFAULT_PAGE_SIZE, NotFoundError } from "@mindos/shared";
import type { EmbeddingProvider } from "./embeddings/provider.js";
import { HybridSearch } from "./search/hybrid-search.js";

export class MemoryEngine {
	private search: HybridSearch;

	constructor(
		private db: Database,
		private embeddingProvider: EmbeddingProvider,
	) {
		this.search = new HybridSearch(db, embeddingProvider);
	}

	// ─── Memory Operations ────────────────────────────────────────────────

	async addMemory(input: AddMemoryInput) {
		const contentHash = createHash("sha256").update(input.content).digest("hex");

		// Check for duplicate content
		const existing = await checkDuplicateContent(this.db, input.userId, contentHash);
		if (existing) {
			throw new ConflictError(`Duplicate memory content (existing id: ${existing.id})`);
		}

		// Store memory immediately (synchronous, fast response)
		const memory = await insertMemory(this.db, {
			userId: input.userId,
			content: input.content,
			contentHash,
			type: input.type ?? "conversation",
			source: input.source,
			tags: input.tags,
			metadata: input.metadata,
			sessionId: input.sessionId,
			expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
		});

		// Generate and store embedding (synchronous for immediate searchability)
		try {
			const embedding = await this.embeddingProvider.embed(input.content);
			await setMemoryEmbedding(this.db, memory.id, embedding);
		} catch (error) {
			// Log but don't fail — memory is stored, embedding can be retried
			console.error(`Failed to generate embedding for memory ${memory.id}:`, error);
		}

		return {
			...memory,
			factExtractionStatus: input.extractFacts !== false ? "pending" : "skipped",
		};
	}

	async getMemory(id: string) {
		const memory = await getMemoryWithFacts(this.db, id);
		if (!memory) throw new NotFoundError("Memory", id);
		return memory;
	}

	async listMemories(userId: string, pagination?: PaginationParams) {
		const page = pagination?.page ?? 1;
		const limit = pagination?.limit ?? DEFAULT_PAGE_SIZE;
		return listMemories(this.db, userId, { page, limit });
	}

	async updateMemory(id: string, input: UpdateMemoryInput) {
		const existing = await getMemoryById(this.db, id);
		if (!existing) throw new NotFoundError("Memory", id);

		const updateData: Parameters<typeof updateMemory>[2] = {};

		if (input.content) {
			updateData.content = input.content;
			updateData.contentHash = createHash("sha256").update(input.content).digest("hex");
		}
		if (input.tags) updateData.tags = input.tags;
		if (input.metadata) updateData.metadata = input.metadata;
		if (input.expiresAt !== undefined) {
			updateData.expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
		}

		const memory = await updateMemory(this.db, id, updateData);

		// Re-embed if content changed
		if (input.content && memory) {
			try {
				const embedding = await this.embeddingProvider.embed(input.content);
				await setMemoryEmbedding(this.db, memory.id, embedding);
			} catch (error) {
				console.error(`Failed to re-embed memory ${id}:`, error);
			}
		}

		return memory;
	}

	async deleteMemory(id: string) {
		const memory = await softDeleteMemory(this.db, id);
		if (!memory) throw new NotFoundError("Memory", id);
		return memory;
	}

	// ─── Search ───────────────────────────────────────────────────────────

	async searchMemories(query: SearchQuery): Promise<SearchResponse> {
		return this.search.search(query);
	}

	// ─── User Operations ──────────────────────────────────────────────────

	async createUser(input: CreateUserInput) {
		return insertUser(this.db, input);
	}

	async getUser(id: string) {
		const user = await getUserById(this.db, id);
		if (!user) throw new NotFoundError("User", id);
		return user;
	}

	async deleteUserAndData(id: string) {
		const user = await deleteUser(this.db, id);
		if (!user) throw new NotFoundError("User", id);
		return user;
	}

	async getUserStats(userId: string) {
		const user = await getUserById(this.db, userId);
		if (!user) throw new NotFoundError("User", userId);
		return getUserStats(this.db, userId);
	}
}
