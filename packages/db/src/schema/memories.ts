import {
	boolean,
	index,
	jsonb,
	pgTable,
	text,
	timestamp,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";
import { users } from "./users.js";

// Note: The vector and tsvector columns require custom SQL setup.
// pgvector extension must be enabled: CREATE EXTENSION IF NOT EXISTS vector;
// The embedding column uses vector(1536) for text-embedding-3-small.
// The search_vector column is auto-populated via a trigger.

export const memories = pgTable(
	"memories",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: uuid("user_id")
			.references(() => users.id, { onDelete: "cascade" })
			.notNull(),
		content: text("content").notNull(),
		contentHash: varchar("content_hash", { length: 64 }),
		type: varchar("type", { length: 32 }).notNull().default("conversation"),
		source: varchar("source", { length: 64 }),
		tags: jsonb("tags").$type<string[]>().default([]),
		metadata: jsonb("metadata").$type<Record<string, unknown>>(),
		sessionId: uuid("session_id"),
		expiresAt: timestamp("expires_at"),
		isActive: boolean("is_active").default(true).notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		index("memories_user_idx").on(table.userId),
		index("memories_session_idx").on(table.sessionId),
		index("memories_expires_idx").on(table.expiresAt),
		index("memories_user_active_idx").on(table.userId, table.isActive),
	],
);
