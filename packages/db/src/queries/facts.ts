import { and, desc, eq, sql } from "drizzle-orm";
import type { Database } from "../index.js";
import { facts } from "../schema/facts.js";

export async function listFacts(
	db: Database,
	userId: string,
	options?: { category?: string; page?: number; limit?: number },
) {
	const page = options?.page ?? 1;
	const limit = options?.limit ?? 50;
	const offset = (page - 1) * limit;

	const conditions = [eq(facts.userId, userId), eq(facts.isActive, true)];
	if (options?.category) {
		conditions.push(eq(facts.category, options.category));
	}

	const items = await db
		.select()
		.from(facts)
		.where(and(...conditions))
		.orderBy(desc(facts.createdAt))
		.limit(limit)
		.offset(offset);

	const [{ count }] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(facts)
		.where(and(...conditions));

	return { items, total: count };
}

export async function getFactById(db: Database, id: string) {
	const [fact] = await db.select().from(facts).where(eq(facts.id, id)).limit(1);
	return fact ?? null;
}

export async function getFactHistory(db: Database, factId: string) {
	// Walk the supersession chain in both directions
	const chain: Array<{ id: string; content: string; isActive: boolean; createdAt: Date }> = [];

	// Walk backwards to find the root
	let currentId: string | null = factId;
	const visited = new Set<string>();

	while (currentId && !visited.has(currentId)) {
		visited.add(currentId);
		const [fact] = await db.select().from(facts).where(eq(facts.id, currentId)).limit(1);

		if (!fact) break;
		chain.unshift({
			id: fact.id,
			content: fact.content,
			isActive: fact.isActive,
			createdAt: fact.createdAt,
		});

		currentId = fact.supersedes;
	}

	// Walk forward from original fact
	currentId = factId;
	const forwardVisited = new Set<string>([factId]);

	while (currentId) {
		const [fact] = await db.select().from(facts).where(eq(facts.id, currentId)).limit(1);

		if (!fact || !fact.supersededBy || forwardVisited.has(fact.supersededBy)) break;
		forwardVisited.add(fact.supersededBy);

		const [next] = await db.select().from(facts).where(eq(facts.id, fact.supersededBy)).limit(1);

		if (!next) break;
		chain.push({
			id: next.id,
			content: next.content,
			isActive: next.isActive,
			createdAt: next.createdAt,
		});
		currentId = next.id;
	}

	return chain;
}

export async function deactivateFact(db: Database, id: string) {
	const [fact] = await db
		.update(facts)
		.set({ isActive: false })
		.where(eq(facts.id, id))
		.returning();
	return fact ?? null;
}
