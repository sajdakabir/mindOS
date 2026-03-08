import { index, integer, jsonb, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const users = pgTable(
	"users",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		externalId: varchar("external_id", { length: 255 }),
		orgId: uuid("org_id"),
		metadata: jsonb("metadata").$type<Record<string, unknown>>(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [index("users_external_id_idx").on(table.externalId)],
);

export const apiKeys = pgTable(
	"api_keys",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		key: varchar("key", { length: 64 }).notNull().unique(),
		name: varchar("name", { length: 255 }).notNull(),
		orgId: uuid("org_id"),
		permissions: jsonb("permissions").$type<string[]>().default(["*"]),
		rateLimit: integer("rate_limit").default(1000),
		lastUsedAt: timestamp("last_used_at"),
		expiresAt: timestamp("expires_at"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [index("api_keys_org_idx").on(table.orgId)],
);
