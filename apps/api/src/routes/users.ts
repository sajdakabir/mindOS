import type { MemoryEngine } from "@mindos/core";
import { createUserSchema } from "@mindos/shared";
import { Hono } from "hono";

export function userRoutes(engine: MemoryEngine) {
	const app = new Hono();

	// POST /v1/users — Create a user
	app.post("/", async (c) => {
		const body = await c.req.json();
		const input = createUserSchema.parse(body);
		const user = await engine.createUser(input);
		return c.json({ data: user }, 201);
	});

	// GET /v1/users/:id — Get a user
	app.get("/:id", async (c) => {
		const id = c.req.param("id");
		const user = await engine.getUser(id);
		return c.json({ data: user });
	});

	// GET /v1/users/:id/stats — Get user stats
	app.get("/:id/stats", async (c) => {
		const id = c.req.param("id");
		const stats = await engine.getUserStats(id);
		return c.json({ data: stats });
	});

	// DELETE /v1/users/:id — Delete user and all their data
	app.delete("/:id", async (c) => {
		const id = c.req.param("id");
		await engine.deleteUserAndData(id);
		return c.json({ data: { deleted: true } });
	});

	return app;
}
