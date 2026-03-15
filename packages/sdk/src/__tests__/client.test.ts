import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HttpClient } from "../client.js";
import { AuthError, MindOSError, NotFoundError, RateLimitError } from "../errors.js";

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("HttpClient", () => {
	const client = new HttpClient("https://api.example.com", "sk_test_key", 5000);

	beforeEach(() => {
		mockFetch.mockReset();
	});

	it("sends correct headers with requests", async () => {
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({ data: { id: "1" } }),
		});

		await client.get("/v1/memories/1");

		expect(mockFetch).toHaveBeenCalledWith(
			"https://api.example.com/v1/memories/1",
			expect.objectContaining({
				method: "GET",
				headers: {
					Authorization: "Bearer sk_test_key",
					"Content-Type": "application/json",
				},
			}),
		);
	});

	it("appends query params for GET requests", async () => {
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({ data: [] }),
		});

		await client.get("/v1/memories", { userId: "user_1", page: "1" });

		const calledUrl = mockFetch.mock.calls[0][0];
		expect(calledUrl).toContain("userId=user_1");
		expect(calledUrl).toContain("page=1");
	});

	it("sends JSON body for POST requests", async () => {
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({ data: { id: "1" } }),
		});

		await client.post("/v1/memories", { content: "hello", userId: "u1" });

		expect(mockFetch).toHaveBeenCalledWith(
			"https://api.example.com/v1/memories",
			expect.objectContaining({
				method: "POST",
				body: JSON.stringify({ content: "hello", userId: "u1" }),
			}),
		);
	});

	it("throws AuthError on 401", async () => {
		mockFetch.mockResolvedValueOnce({
			ok: false,
			status: 401,
			json: async () => ({ error: { code: "AUTH_ERROR", message: "Invalid API key" } }),
		});

		await expect(client.get("/v1/memories")).rejects.toThrow(AuthError);
	});

	it("throws NotFoundError on 404", async () => {
		mockFetch.mockResolvedValueOnce({
			ok: false,
			status: 404,
			json: async () => ({ error: { code: "NOT_FOUND", message: "Memory not found" } }),
		});

		await expect(client.get("/v1/memories/xxx")).rejects.toThrow(NotFoundError);
	});

	it("throws RateLimitError on 429", async () => {
		mockFetch.mockResolvedValueOnce({
			ok: false,
			status: 429,
			json: async () => ({ error: { code: "RATE_LIMIT", message: "Too many requests" } }),
		});

		await expect(client.post("/v1/memories/search", {})).rejects.toThrow(RateLimitError);
	});

	it("throws MindOSError on other error statuses", async () => {
		mockFetch.mockResolvedValueOnce({
			ok: false,
			status: 500,
			json: async () => ({ error: { code: "INTERNAL", message: "Server error" } }),
		});

		await expect(client.get("/v1/memories")).rejects.toThrow(MindOSError);
	});

	it("strips trailing slash from baseUrl", async () => {
		const clientWithSlash = new HttpClient("https://api.example.com/", "key");

		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({ data: {} }),
		});

		await clientWithSlash.get("/v1/test");

		const calledUrl = mockFetch.mock.calls[0][0];
		expect(calledUrl).toBe("https://api.example.com/v1/test");
	});

	it("sends DELETE requests", async () => {
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({ data: { deleted: true } }),
		});

		await client.delete("/v1/memories/1");

		expect(mockFetch).toHaveBeenCalledWith(
			"https://api.example.com/v1/memories/1",
			expect.objectContaining({ method: "DELETE" }),
		);
	});
});
