import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema/index.js";

export type Database = ReturnType<typeof createDatabase>;

export function createDatabase(connectionString: string) {
	const pool = new pg.Pool({
		connectionString,
		max: 20,
		idleTimeoutMillis: 30_000,
		connectionTimeoutMillis: 5_000,
	});

	return drizzle(pool, { schema });
}

export { schema };
export * from "./schema/index.js";
export * from "./queries/memories.js";
export * from "./queries/users.js";
export * from "./queries/search.js";
