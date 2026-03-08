import type { Database } from "@mindos/db";
import { insertApiKey } from "@mindos/db";
import { createApiKeySchema } from "@mindos/shared";
import { Hono } from "hono";
import { generateApiKey } from "../lib/api-key.js";

export function apiKeyRoutes(db: Database) {
	const app = new Hono();

	// POST /v1/api-keys — Create a new API key
	app.post("/", async (c) => {
		const body = await c.req.json();
		const input = createApiKeySchema.parse(body);

		const key = generateApiKey();
		const apiKey = await insertApiKey(db, {
			key,
			name: input.name,
			orgId: input.orgId,
			permissions: input.permissions,
			rateLimit: input.rateLimit,
			expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
		});

		// Return the full key only on creation
		return c.json(
			{
				data: {
					id: apiKey.id,
					key,
					name: apiKey.name,
					permissions: apiKey.permissions,
					rateLimit: apiKey.rateLimit,
					createdAt: apiKey.createdAt,
				},
			},
			201,
		);
	});

	return app;
}
