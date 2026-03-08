import { describe, expect, it } from "vitest";
import type { EmbeddingProvider } from "../embeddings/provider.js";
import { FactExtractor } from "../extraction/fact-extractor.js";
import type { LLMProvider } from "../llm/provider.js";

// Create mock providers
const mockLLM: LLMProvider = {
	complete: async () => "",
	completeJSON: async <T>() =>
		({
			facts: [
				{
					content: "User prefers dark mode",
					category: "preference",
					confidence: 0.95,
					temporalRef: null,
				},
				{
					content: "User's name is Alice",
					category: "biographical",
					confidence: 1.0,
					temporalRef: null,
				},
			],
		}) as T,
};

// Embedding provider that returns simple deterministic vectors
const mockEmbedding: EmbeddingProvider = {
	dimensions: 3,
	modelName: "mock",
	embed: async (text) => {
		// Different texts get different embeddings
		const hash = [...text].reduce((a, c) => a + c.charCodeAt(0), 0);
		return [(hash % 10) / 10, ((hash * 2) % 10) / 10, ((hash * 3) % 10) / 10];
	},
	embedBatch: async (texts) => {
		return Promise.all(
			texts.map(async (t) => {
				const hash = [...t].reduce((a, c) => a + c.charCodeAt(0), 0);
				return [(hash % 10) / 10, ((hash * 2) % 10) / 10, ((hash * 3) % 10) / 10];
			}),
		);
	},
};

describe("FactExtractor", () => {
	it("extracts facts from content", async () => {
		const extractor = new FactExtractor(mockLLM, mockEmbedding);
		const facts = await extractor.extract("My name is Alice and I prefer dark mode.");

		expect(facts).toHaveLength(2);
		expect(facts[0].content).toBe("User prefers dark mode");
		expect(facts[0].category).toBe("preference");
		expect(facts[1].content).toBe("User's name is Alice");
		expect(facts[1].category).toBe("biographical");
	});

	it("handles empty extraction", async () => {
		const emptyLLM: LLMProvider = {
			complete: async () => "",
			completeJSON: async <T>() => ({ facts: [] }) as T,
		};

		const extractor = new FactExtractor(emptyLLM, mockEmbedding);
		const facts = await extractor.extract("Hello world");
		expect(facts).toHaveLength(0);
	});

	it("clamps confidence to 0-1 range", async () => {
		const overflowLLM: LLMProvider = {
			complete: async () => "",
			completeJSON: async <T>() =>
				({
					facts: [
						{ content: "Test fact", category: "contextual", confidence: 1.5, temporalRef: null },
					],
				}) as T,
		};

		const extractor = new FactExtractor(overflowLLM, mockEmbedding);
		const facts = await extractor.extract("test");
		expect(facts[0].confidence).toBe(1.0);
	});
});
