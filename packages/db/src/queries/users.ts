import { eq, sql } from "drizzle-orm";
import type { Database } from "../index.js";
import { facts } from "../schema/facts.js";
import { memories } from "../schema/memories.js";
import { userProfiles } from "../schema/profiles.js";
import { apiKeys, users } from "../schema/users.js";

export async function insertUser(
	db: Database,
	data: {
		externalId?: string;
		orgId?: string;
		metadata?: Record<string, unknown>;
	},
) {
	const [user] = await db.insert(users).values(data).returning();
	return user;
}

export async function getUserById(db: Database, id: string) {
	const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
	return user ?? null;
}

export async function deleteUser(db: Database, id: string) {
	// Cascade delete handles memories, facts, profiles
	const [user] = await db.delete(users).where(eq(users.id, id)).returning();
	return user ?? null;
}

export async function getUserStats(db: Database, userId: string) {
	const [[memoryCount], [factCount], [profile]] = await Promise.all([
		db
			.select({ count: sql<number>`count(*)::int` })
			.from(memories)
			.where(eq(memories.userId, userId)),
		db.select({ count: sql<number>`count(*)::int` }).from(facts).where(eq(facts.userId, userId)),
		db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1),
	]);

	return {
		memoryCount: memoryCount.count,
		factCount: factCount.count,
		profileSummary: profile?.summary ?? null,
	};
}

// ─── API Key Queries ────────────────────────────────────────────────────────

export async function insertApiKey(
	db: Database,
	data: {
		key: string;
		name: string;
		orgId?: string;
		permissions?: string[];
		rateLimit?: number;
		expiresAt?: Date;
	},
) {
	const [apiKey] = await db.insert(apiKeys).values(data).returning();
	return apiKey;
}

export async function getApiKeyByKey(db: Database, key: string) {
	const [apiKey] = await db.select().from(apiKeys).where(eq(apiKeys.key, key)).limit(1);
	return apiKey ?? null;
}

export async function updateApiKeyLastUsed(db: Database, id: string) {
	await db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, id));
}
