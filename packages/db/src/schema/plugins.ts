import { index, jsonb, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { users } from "./users.js";

export const pluginConnections = pgTable(
	"plugin_connections",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: uuid("user_id")
			.references(() => users.id, { onDelete: "cascade" })
			.notNull(),
		pluginId: varchar("plugin_id", { length: 64 }).notNull(),
		config: jsonb("config").$type<Record<string, unknown>>(),
		status: varchar("status", { length: 32 }).default("active"),
		lastSyncAt: timestamp("last_sync_at"),
		syncCursor: varchar("sync_cursor", { length: 512 }),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [index("plugin_connections_user_idx").on(table.userId, table.pluginId)],
);
