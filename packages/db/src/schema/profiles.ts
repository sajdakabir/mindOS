import type { DynamicContext, StaticProfile } from "@mindos/shared";
import { integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./users.js";

export const userProfiles = pgTable("user_profiles", {
	id: uuid("id").primaryKey().defaultRandom(),
	userId: uuid("user_id")
		.references(() => users.id, { onDelete: "cascade" })
		.notNull()
		.unique(),
	staticProfile: jsonb("static_profile")
		.$type<StaticProfile>()
		.default({ preferences: {}, traits: [], demographics: {} }),
	dynamicContext: jsonb("dynamic_context")
		.$type<DynamicContext>()
		.default({ currentTopics: [], recentEntities: [], activeGoals: [] }),
	summary: text("summary"),
	factCount: integer("fact_count").default(0),
	lastInteractionAt: timestamp("last_interaction_at"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
