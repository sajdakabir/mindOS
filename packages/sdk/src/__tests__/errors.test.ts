import { describe, expect, it } from "vitest";
import { AuthError, MindOSError, NotFoundError, RateLimitError } from "../errors.js";

describe("SDK Errors", () => {
	it("creates MindOSError with correct properties", () => {
		const err = new MindOSError("TEST", "test message", 500);
		expect(err.code).toBe("TEST");
		expect(err.message).toBe("test message");
		expect(err.status).toBe(500);
		expect(err.name).toBe("MindOSError");
	});

	it("creates NotFoundError with 404 status", () => {
		const err = new NotFoundError("Resource not found");
		expect(err.status).toBe(404);
		expect(err.code).toBe("NOT_FOUND");
	});

	it("creates AuthError with 401 status", () => {
		const err = new AuthError();
		expect(err.status).toBe(401);
		expect(err.code).toBe("AUTH_ERROR");
	});

	it("creates RateLimitError with 429 status", () => {
		const err = new RateLimitError();
		expect(err.status).toBe(429);
		expect(err.code).toBe("RATE_LIMIT");
	});
});
