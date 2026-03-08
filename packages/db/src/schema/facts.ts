import { boolean, index, pgTable, real, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { memories } from "./memories.js";
import { users } from "./users.js";

export const facts = pgTable(
	"facts",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: uuid("user_id")
			.references(() => users.id, { onDelete: "cascade" })
			.notNull(),
		memoryId: uuid("memory_id")
			.references(() => memories.id, { onDelete: "cascade" })
			.notNull(),
		content: text("content").notNull(),
		category: varchar("category", { length: 64 }).notNull(),
		confidence: real("confidence").default(1.0).notNull(),
		supersededBy: uuid("superseded_by"),
		supersedes: uuid("supersedes"),
		validFrom: timestamp("valid_from").defaultNow(),
		validUntil: timestamp("valid_until"),
		isActive: boolean("is_active").default(true).notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		index("facts_user_idx").on(table.userId),
		index("facts_memory_idx").on(table.memoryId),
		index("facts_category_idx").on(table.category),
		index("facts_user_active_idx").on(table.userId, table.isActive),
	],
);
