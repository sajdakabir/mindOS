import { and, desc, eq, sql } from "drizzle-orm";
import type { Database } from "../index.js";
import { facts } from "../schema/facts.js";
import { memories } from "../schema/memories.js";

export async function insertMemory(
	db: Database,
	data: {
		userId: string;
		content: string;
		contentHash: string;
		type: string;
		source?: string;
		tags?: string[];
		metadata?: Record<string, unknown>;
		sessionId?: string;
		expiresAt?: Date;
	},
) {
	const [memory] = await db
		.insert(memories)
		.values({
			userId: data.userId,
			content: data.content,
			contentHash: data.contentHash,
			type: data.type,
			source: data.source,
			tags: data.tags ?? [],
			metadata: data.metadata,
			sessionId: data.sessionId,
			expiresAt: data.expiresAt,
		})
		.returning();
	return memory;
}

export async function getMemoryById(db: Database, id: string) {
	const [memory] = await db.select().from(memories).where(eq(memories.id, id)).limit(1);
	return memory ?? null;
}

export async function getMemoryWithFacts(db: Database, id: string) {
	const [memory] = await db.select().from(memories).where(eq(memories.id, id)).limit(1);
	if (!memory) return null;

	const memoryFacts = await db
		.select()
		.from(facts)
		.where(and(eq(facts.memoryId, id), eq(facts.isActive, true)));

	return { ...memory, facts: memoryFacts };
}

export async function listMemories(
	db: Database,
	userId: string,
	options: { page: number; limit: number },
) {
	const offset = (options.page - 1) * options.limit;

	const items = await db
		.select()
		.from(memories)
		.where(and(eq(memories.userId, userId), eq(memories.isActive, true)))
		.orderBy(desc(memories.createdAt))
		.limit(options.limit)
		.offset(offset);

	const [{ count }] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(memories)
		.where(and(eq(memories.userId, userId), eq(memories.isActive, true)));

	return { items, total: count };
}

export async function updateMemory(
	db: Database,
	id: string,
	data: {
		content?: string;
		contentHash?: string;
		tags?: string[];
		metadata?: Record<string, unknown>;
		expiresAt?: Date | null;
	},
) {
	const [memory] = await db
		.update(memories)
		.set({ ...data, updatedAt: new Date() })
		.where(eq(memories.id, id))
		.returning();
	return memory ?? null;
}

export async function softDeleteMemory(db: Database, id: string) {
	const [memory] = await db
		.update(memories)
		.set({ isActive: false, updatedAt: new Date() })
		.where(eq(memories.id, id))
		.returning();

	// Also deactivate associated facts
	if (memory) {
		await db.update(facts).set({ isActive: false }).where(eq(facts.memoryId, id));
	}

	return memory ?? null;
}

export async function setMemoryEmbedding(db: Database, id: string, embedding: number[]) {
	await db.execute(
		sql`UPDATE memories SET embedding = ${JSON.stringify(embedding)}::vector WHERE id = ${id}`,
	);
}

export async function checkDuplicateContent(db: Database, userId: string, contentHash: string) {
	const [existing] = await db
		.select({ id: memories.id })
		.from(memories)
		.where(
			and(
				eq(memories.userId, userId),
				eq(memories.contentHash, contentHash),
				eq(memories.isActive, true),
			),
		)
		.limit(1);
	return existing ?? null;
}
