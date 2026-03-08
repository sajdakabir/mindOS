import type { Database } from "@mindos/db";
import { deactivateFact, getFactById, getFactHistory, listFacts } from "@mindos/db";
import { NotFoundError, paginationSchema } from "@mindos/shared";
import { Hono } from "hono";

export function factRoutes(db: Database) {
	const app = new Hono();

	// GET /v1/facts — List active facts for a user
	app.get("/", async (c) => {
		const userId = c.req.query("userId");
		if (!userId) {
			return c.json({ error: { code: "VALIDATION_ERROR", message: "userId is required" } }, 400);
		}

		const category = c.req.query("category") || undefined;
		const pagination = paginationSchema.parse({
			page: c.req.query("page"),
			limit: c.req.query("limit"),
		});

		const result = await listFacts(db, userId, {
			category,
			page: pagination.page,
			limit: pagination.limit,
		});

		return c.json({
			data: result.items,
			meta: { page: pagination.page, limit: pagination.limit, total: result.total },
		});
	});

	// GET /v1/facts/:id — Get a single fact
	app.get("/:id", async (c) => {
		const id = c.req.param("id");
		const fact = await getFactById(db, id);
		if (!fact) throw new NotFoundError("Fact", id);
		return c.json({ data: fact });
	});

	// GET /v1/facts/:id/history — View contradiction resolution chain
	app.get("/:id/history", async (c) => {
		const id = c.req.param("id");
		const fact = await getFactById(db, id);
		if (!fact) throw new NotFoundError("Fact", id);

		const history = await getFactHistory(db, id);
		return c.json({ data: history });
	});

	// DELETE /v1/facts/:id — Manually invalidate a fact
	app.delete("/:id", async (c) => {
		const id = c.req.param("id");
		const fact = await deactivateFact(db, id);
		if (!fact) throw new NotFoundError("Fact", id);
		return c.json({ data: { deleted: true } });
	});

	return app;
}
