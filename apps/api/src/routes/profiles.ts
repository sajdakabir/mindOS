import type { ProfileBuilder } from "@mindos/core";
import type { Database } from "@mindos/db";
import { getProfile, updateProfile } from "@mindos/db";
import { NotFoundError, updateProfileSchema } from "@mindos/shared";
import { Hono } from "hono";

export function profileRoutes(db: Database, profileBuilder?: ProfileBuilder) {
	const app = new Hono();

	// GET /v1/profiles/:userId — Get computed user profile
	app.get("/:userId", async (c) => {
		const userId = c.req.param("userId");
		const profile = await getProfile(db, userId);
		if (!profile) throw new NotFoundError("Profile", userId);
		return c.json({ data: profile });
	});

	// PUT /v1/profiles/:userId — Manually update profile fields
	app.put("/:userId", async (c) => {
		const userId = c.req.param("userId");
		const body = await c.req.json();
		const input = updateProfileSchema.parse(body);

		const profile = await updateProfile(db, userId, input);
		if (!profile) throw new NotFoundError("Profile", userId);
		return c.json({ data: profile });
	});

	// POST /v1/profiles/:userId/refresh — Force profile recomputation
	app.post("/:userId/refresh", async (c) => {
		const userId = c.req.param("userId");

		if (!profileBuilder) {
			return c.json(
				{ error: { code: "SERVICE_UNAVAILABLE", message: "Profile builder not configured" } },
				503,
			);
		}

		await profileBuilder.buildProfile(userId);
		const profile = await getProfile(db, userId);
		return c.json({ data: profile });
	});

	return app;
}
