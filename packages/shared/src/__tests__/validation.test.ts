import { describe, expect, it } from "vitest";
import {
	addMemorySchema,
	createApiKeySchema,
	createUserSchema,
	paginationSchema,
	searchQuerySchema,
	updateMemorySchema,
} from "../validation.js";

describe("addMemorySchema", () => {
	it("accepts valid input", () => {
		const result = addMemorySchema.parse({
			userId: "user_1",
			content: "Hello world",
		});
		expect(result.userId).toBe("user_1");
		expect(result.type).toBe("conversation"); // default
		expect(result.tags).toEqual([]); // default
		expect(result.extractFacts).toBe(true); // default
	});

	it("accepts all optional fields", () => {
		const result = addMemorySchema.parse({
			userId: "user_1",
			content: "Meeting notes",
			type: "document",
			source: "google-docs",
			tags: ["meeting", "q1"],
			metadata: { priority: "high" },
			extractFacts: false,
		});
		expect(result.type).toBe("document");
		expect(result.source).toBe("google-docs");
		expect(result.tags).toEqual(["meeting", "q1"]);
		expect(result.extractFacts).toBe(false);
	});

	it("rejects empty userId", () => {
		expect(() => addMemorySchema.parse({ userId: "", content: "test" })).toThrow();
	});

	it("rejects empty content", () => {
		expect(() => addMemorySchema.parse({ userId: "u1", content: "" })).toThrow();
	});

	it("rejects invalid type", () => {
		expect(() =>
			addMemorySchema.parse({ userId: "u1", content: "test", type: "invalid" }),
		).toThrow();
	});

	it("rejects too many tags", () => {
		const tags = Array.from({ length: 21 }, (_, i) => `tag${i}`);
		expect(() => addMemorySchema.parse({ userId: "u1", content: "test", tags })).toThrow();
	});
});

describe("searchQuerySchema", () => {
	it("accepts valid search query", () => {
		const result = searchQuerySchema.parse({
			query: "dark mode preferences",
			userId: "user_1",
		});
		expect(result.limit).toBe(10); // default
		expect(result.threshold).toBe(0.5); // default
		expect(result.searchMode).toBe("hybrid"); // default
	});

	it("accepts all search modes", () => {
		for (const mode of ["vector", "keyword", "hybrid"]) {
			const result = searchQuerySchema.parse({
				query: "test",
				userId: "u1",
				searchMode: mode,
			});
			expect(result.searchMode).toBe(mode);
		}
	});

	it("rejects empty query", () => {
		expect(() => searchQuerySchema.parse({ query: "", userId: "u1" })).toThrow();
	});

	it("rejects limit > 100", () => {
		expect(() => searchQuerySchema.parse({ query: "test", userId: "u1", limit: 101 })).toThrow();
	});

	it("rejects threshold > 1", () => {
		expect(() =>
			searchQuerySchema.parse({ query: "test", userId: "u1", threshold: 1.5 }),
		).toThrow();
	});
});

describe("updateMemorySchema", () => {
	it("accepts partial updates", () => {
		const result = updateMemorySchema.parse({ tags: ["updated"] });
		expect(result.tags).toEqual(["updated"]);
		expect(result.content).toBeUndefined();
	});

	it("accepts nullable expiresAt", () => {
		const result = updateMemorySchema.parse({ expiresAt: null });
		expect(result.expiresAt).toBeNull();
	});

	it("accepts empty object", () => {
		const result = updateMemorySchema.parse({});
		expect(result).toBeDefined();
	});
});

describe("paginationSchema", () => {
	it("coerces string values to numbers", () => {
		const result = paginationSchema.parse({ page: "3", limit: "25" });
		expect(result.page).toBe(3);
		expect(result.limit).toBe(25);
	});

	it("uses defaults for missing values", () => {
		const result = paginationSchema.parse({});
		expect(result.page).toBe(1);
		expect(result.limit).toBe(20);
	});

	it("rejects page < 1", () => {
		expect(() => paginationSchema.parse({ page: 0 })).toThrow();
	});

	it("rejects limit > 100", () => {
		expect(() => paginationSchema.parse({ limit: 101 })).toThrow();
	});
});

describe("createApiKeySchema", () => {
	it("accepts valid input with defaults", () => {
		const result = createApiKeySchema.parse({ name: "my-app" });
		expect(result.name).toBe("my-app");
		expect(result.permissions).toEqual(["*"]);
		expect(result.rateLimit).toBe(1000);
	});

	it("rejects empty name", () => {
		expect(() => createApiKeySchema.parse({ name: "" })).toThrow();
	});
});

describe("createUserSchema", () => {
	it("accepts empty object", () => {
		const result = createUserSchema.parse({});
		expect(result).toBeDefined();
	});

	it("accepts optional fields", () => {
		const result = createUserSchema.parse({
			externalId: "ext_123",
			metadata: { role: "admin" },
		});
		expect(result.externalId).toBe("ext_123");
	});
});
