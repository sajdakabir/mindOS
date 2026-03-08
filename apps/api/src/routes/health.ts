import type { Database } from "@mindos/db";
import { sql } from "drizzle-orm";
import { Hono } from "hono";

export function healthRoutes(db: Database) {
	const app = new Hono();

	app.get("/healthz", async (c) => {
		try {
			await db.execute(sql`SELECT 1`);
			return c.json({ status: "ok", timestamp: new Date().toISOString() });
		} catch {
			return c.json({ status: "error", message: "Database unreachable" }, 503);
		}
	});

	app.get("/readyz", async (c) => {
		try {
			// Check if tables exist
			await db.execute(sql`SELECT 1 FROM users LIMIT 1`);
			return c.json({ status: "ready", timestamp: new Date().toISOString() });
		} catch {
			return c.json({ status: "not_ready", message: "Migrations not applied" }, 503);
		}
	});

	return app;
}
