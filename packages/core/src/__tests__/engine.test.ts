import { describe, expect, it, vi } from "vitest";
import { MemoryEngine } from "../engine.js";

// We mock @mindos/db at module level so MemoryEngine uses our fakes
vi.mock("@mindos/db", () => {
	const fakeMemory = {
		id: "mem_1",
		userId: "user_1",
		content: "I like TypeScript",
		contentHash: "abc123",
		type: "conversation",
		source: null,
		tags: [],
		metadata: null,
		sessionId: null,
		expiresAt: null,
		isActive: true,
		createdAt: new Date(),
		updatedAt: new Date(),
	};

	return {
		checkDuplicateContent: vi.fn().mockResolvedValue(null),
		insertMemory: vi.fn().mockResolvedValue(fakeMemory),
		setMemoryEmbedding: vi.fn().mockResolvedValue(undefined),
		getMemoryWithFacts: vi.fn().mockResolvedValue({ ...fakeMemory, facts: [] }),
		getMemoryById: vi.fn().mockResolvedValue(fakeMemory),
		getUserById: vi.fn().mockResolvedValue({ id: "user_1" }),
		getUserStats: vi.fn().mockResolvedValue({ totalMemories: 5, totalFacts: 12 }),
		insertUser: vi.fn().mockResolvedValue({ id: "user_1" }),
		deleteUser: vi.fn().mockResolvedValue({ id: "user_1" }),
		listMemories: vi.fn().mockResolvedValue({ items: [fakeMemory], total: 1 }),
		softDeleteMemory: vi.fn().mockResolvedValue(fakeMemory),
		updateMemory: vi.fn().mockResolvedValue(fakeMemory),
	};
});

const mockEmbedding = {
	dimensions: 3,
	modelName: "mock",
	embed: vi.fn().mockResolvedValue([0.1, 0.2, 0.3]),
	embedBatch: vi.fn().mockResolvedValue([[0.1, 0.2, 0.3]]),
};

const fakeDb = {} as never;

describe("MemoryEngine", () => {
	it("addMemory stores memory and generates embedding", async () => {
		const engine = new MemoryEngine(fakeDb, mockEmbedding);
		const result = await engine.addMemory({
			userId: "user_1",
			content: "I like TypeScript",
		});

		expect(result.id).toBe("mem_1");
		expect(result.factExtractionStatus).toBe("pending");
		expect(mockEmbedding.embed).toHaveBeenCalledWith("I like TypeScript");
	});

	it("addMemory with extractFacts=false returns skipped status", async () => {
		const engine = new MemoryEngine(fakeDb, mockEmbedding);
		const result = await engine.addMemory({
			userId: "user_1",
			content: "No extraction needed",
			extractFacts: false,
		});

		expect(result.factExtractionStatus).toBe("skipped");
	});

	it("addMemory throws ConflictError on duplicate", async () => {
		const { checkDuplicateContent } = await import("@mindos/db");
		(checkDuplicateContent as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			id: "existing_1",
		});

		const engine = new MemoryEngine(fakeDb, mockEmbedding);
		await expect(engine.addMemory({ userId: "user_1", content: "duplicate" })).rejects.toThrow(
			"Duplicate",
		);
	});

	it("getMemory throws NotFoundError for missing ID", async () => {
		const { getMemoryWithFacts } = await import("@mindos/db");
		(getMemoryWithFacts as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

		const engine = new MemoryEngine(fakeDb, mockEmbedding);
		await expect(engine.getMemory("nonexistent")).rejects.toThrow("not found");
	});

	it("deleteMemory soft-deletes and returns memory", async () => {
		const engine = new MemoryEngine(fakeDb, mockEmbedding);
		const result = await engine.deleteMemory("mem_1");
		expect(result.id).toBe("mem_1");
	});

	it("deleteMemory throws NotFoundError for missing ID", async () => {
		const { softDeleteMemory } = await import("@mindos/db");
		(softDeleteMemory as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

		const engine = new MemoryEngine(fakeDb, mockEmbedding);
		await expect(engine.deleteMemory("nonexistent")).rejects.toThrow("not found");
	});

	it("getUserStats throws NotFoundError for missing user", async () => {
		const { getUserById } = await import("@mindos/db");
		(getUserById as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

		const engine = new MemoryEngine(fakeDb, mockEmbedding);
		await expect(engine.getUserStats("nonexistent")).rejects.toThrow("not found");
	});
});
