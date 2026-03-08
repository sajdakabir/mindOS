import { jsonb, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { users } from "./users.js";

export const sessions = pgTable("sessions", {
	id: uuid("id").primaryKey().defaultRandom(),
	userId: uuid("user_id")
		.references(() => users.id, { onDelete: "cascade" })
		.notNull(),
	name: varchar("name", { length: 255 }),
	metadata: jsonb("metadata").$type<Record<string, unknown>>(),
	startedAt: timestamp("started_at").defaultNow().notNull(),
	endedAt: timestamp("ended_at"),
});
