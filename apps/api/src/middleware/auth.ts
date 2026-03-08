import { type Database, getApiKeyByKey, updateApiKeyLastUsed } from "@mindos/db";
import { AuthenticationError } from "@mindos/shared";
import type { Context, Next } from "hono";

export function authMiddleware(db: Database) {
	return async (c: Context, next: Next) => {
		const authHeader = c.req.header("Authorization");
		if (!authHeader?.startsWith("Bearer ")) {
			throw new AuthenticationError("Missing Authorization header. Use: Bearer <api_key>");
		}

		const key = authHeader.slice(7);
		const apiKey = await getApiKeyByKey(db, key);

		if (!apiKey) {
			throw new AuthenticationError("Invalid API key");
		}

		if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
			throw new AuthenticationError("API key has expired");
		}

		// Update last used timestamp (fire and forget)
		updateApiKeyLastUsed(db, apiKey.id).catch(() => {});

		// Store API key info in context for downstream use
		c.set("apiKey", apiKey);
		c.set("orgId", apiKey.orgId);

		await next();
	};
}
