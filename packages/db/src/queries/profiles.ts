import type { DynamicContext, StaticProfile } from "@mindos/shared";
import { eq } from "drizzle-orm";
import type { Database } from "../index.js";
import { userProfiles } from "../schema/profiles.js";

export async function getProfile(db: Database, userId: string) {
	const [profile] = await db
		.select()
		.from(userProfiles)
		.where(eq(userProfiles.userId, userId))
		.limit(1);
	return profile ?? null;
}

export async function updateProfile(
	db: Database,
	userId: string,
	data: {
		staticProfile?: Partial<StaticProfile>;
		dynamicContext?: Partial<DynamicContext>;
	},
) {
	const existing = await getProfile(db, userId);
	if (!existing) return null;

	const updates: Record<string, unknown> = { updatedAt: new Date() };

	if (data.staticProfile) {
		updates.staticProfile = {
			...(existing.staticProfile as StaticProfile),
			...data.staticProfile,
		};
	}

	if (data.dynamicContext) {
		updates.dynamicContext = {
			...(existing.dynamicContext as DynamicContext),
			...data.dynamicContext,
		};
	}

	const [profile] = await db
		.update(userProfiles)
		.set(updates)
		.where(eq(userProfiles.userId, userId))
		.returning();

	return profile ?? null;
}
