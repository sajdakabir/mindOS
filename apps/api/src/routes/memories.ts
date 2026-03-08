import type { MemoryEngine } from "@mindos/core";
import {
	addMemorySchema,
	batchAddMemorySchema,
	paginationSchema,
	searchQuerySchema,
	updateMemorySchema,
} from "@mindos/shared";
import { Hono } from "hono";

export function memoryRoutes(engine: MemoryEngine) {
	const app = new Hono();

	// POST /v1/memories — Add a memory
	app.post("/", async (c) => {
		const body = await c.req.json();
		const input = addMemorySchema.parse(body);
		const memory = await engine.addMemory(input);
		return c.json({ data: memory }, 202);
	});

	// GET /v1/memories/:id — Get a memory with its facts
	app.get("/:id", async (c) => {
		const id = c.req.param("id");
		const memory = await engine.getMemory(id);
		return c.json({ data: memory });
	});

	// GET /v1/memories — List memories for a user
	app.get("/", async (c) => {
		const userId = c.req.query("userId");
		if (!userId) {
			return c.json({ error: { code: "VALIDATION_ERROR", message: "userId is required" } }, 400);
		}

		const pagination = paginationSchema.parse({
			page: c.req.query("page"),
			limit: c.req.query("limit"),
		});

		const result = await engine.listMemories(userId, pagination);
		return c.json({
			data: result.items,
			meta: {
				page: pagination.page,
				limit: pagination.limit,
				total: result.total,
			},
		});
	});

	// PUT /v1/memories/:id — Update a memory
	app.put("/:id", async (c) => {
		const id = c.req.param("id");
		const body = await c.req.json();
		const input = updateMemorySchema.parse(body);
		const memory = await engine.updateMemory(id, input);
		return c.json({ data: memory });
	});

	// DELETE /v1/memories/:id — Soft delete a memory
	app.delete("/:id", async (c) => {
		const id = c.req.param("id");
		await engine.deleteMemory(id);
		return c.json({ data: { deleted: true } });
	});

	// POST /v1/memories/search — Hybrid search
	app.post("/search", async (c) => {
		const body = await c.req.json();
		const query = searchQuerySchema.parse(body);
		const results = await engine.searchMemories(query);
		return c.json({ data: results });
	});

	// POST /v1/memories/batch — Batch add memories
	app.post("/batch", async (c) => {
		const body = await c.req.json();
		const { memories } = batchAddMemorySchema.parse(body);

		const results = await Promise.allSettled(memories.map((m) => engine.addMemory(m)));

		const succeeded = results
			.filter(
				(r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof engine.addMemory>>> =>
					r.status === "fulfilled",
			)
			.map((r) => r.value);

		const failed = results
			.filter((r): r is PromiseRejectedResult => r.status === "rejected")
			.map((r, i) => ({ index: i, error: r.reason?.message ?? "Unknown error" }));

		return c.json(
			{
				data: {
					succeeded: succeeded.length,
					failed: failed.length,
					memories: succeeded,
					errors: failed,
				},
			},
			202,
		);
	});

	return app;
}
