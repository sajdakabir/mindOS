import { RRF_K } from "@mindos/shared";
import { describe, expect, it, vi } from "vitest";

// Test the RRF merge algorithm in isolation
// We don't import HybridSearch directly because it needs a real DB connection,
// instead we test the core algorithm: Reciprocal Rank Fusion scoring

function rrfMerge(
	vectorResults: Array<{ id: string; content: string; score: number }>,
	keywordResults: Array<{ id: string; content: string; score: number }>,
	limit: number,
) {
	const scores = new Map<string, { score: number; data: { id: string; content: string } }>();

	vectorResults.forEach((result, rank) => {
		const rrfScore = 1 / (RRF_K + rank + 1);
		const existing = scores.get(result.id);
		scores.set(result.id, {
			score: (existing?.score ?? 0) + rrfScore,
			data: result,
		});
	});

	keywordResults.forEach((result, rank) => {
		const rrfScore = 1 / (RRF_K + rank + 1);
		const existing = scores.get(result.id);
		scores.set(result.id, {
			score: (existing?.score ?? 0) + rrfScore,
			data: existing?.data ?? result,
		});
	});

	return [...scores.values()]
		.sort((a, b) => b.score - a.score)
		.slice(0, limit)
		.map(({ score, data }) => ({ ...data, score }));
}

describe("Reciprocal Rank Fusion", () => {
	it("ranks items appearing in both lists higher", () => {
		const vectorResults = [
			{ id: "a", content: "A", score: 0.9 },
			{ id: "b", content: "B", score: 0.8 },
			{ id: "c", content: "C", score: 0.7 },
		];
		const keywordResults = [
			{ id: "b", content: "B", score: 5.0 },
			{ id: "d", content: "D", score: 3.0 },
			{ id: "a", content: "A", score: 2.0 },
		];

		const merged = rrfMerge(vectorResults, keywordResults, 10);

		// "a" appears at rank 0 in vector + rank 2 in keyword
		// "b" appears at rank 1 in vector + rank 0 in keyword
		// Both should score highest since they appear in both lists
		const ids = merged.map((r) => r.id);
		expect(ids[0]).toBe("b"); // rank 1 + rank 0 = highest combined
		expect(ids[1]).toBe("a"); // rank 0 + rank 2
		expect(ids.includes("c")).toBe(true);
		expect(ids.includes("d")).toBe(true);
	});

	it("returns correct RRF scores", () => {
		const vectorResults = [{ id: "a", content: "A", score: 0.95 }];
		const keywordResults = [{ id: "a", content: "A", score: 4.5 }];

		const merged = rrfMerge(vectorResults, keywordResults, 10);

		// Both at rank 0: 1/(60+0+1) + 1/(60+0+1) = 2/61
		const expectedScore = 2 / (RRF_K + 1);
		expect(merged[0].score).toBeCloseTo(expectedScore);
	});

	it("handles disjoint result sets", () => {
		const vectorResults = [
			{ id: "a", content: "A", score: 0.9 },
			{ id: "b", content: "B", score: 0.8 },
		];
		const keywordResults = [
			{ id: "c", content: "C", score: 5.0 },
			{ id: "d", content: "D", score: 3.0 },
		];

		const merged = rrfMerge(vectorResults, keywordResults, 10);
		expect(merged).toHaveLength(4);
		// All items at rank 0 or 1 in their respective lists should have same scores
		// rank 0 items: 1/(60+1) = 0.01639
		// rank 1 items: 1/(60+2) = 0.01613
		expect(merged[0].score).toBeCloseTo(1 / (RRF_K + 1));
	});

	it("respects limit parameter", () => {
		const vectorResults = [
			{ id: "a", content: "A", score: 0.9 },
			{ id: "b", content: "B", score: 0.8 },
			{ id: "c", content: "C", score: 0.7 },
		];
		const keywordResults = [
			{ id: "d", content: "D", score: 5.0 },
			{ id: "e", content: "E", score: 3.0 },
		];

		const merged = rrfMerge(vectorResults, keywordResults, 3);
		expect(merged).toHaveLength(3);
	});

	it("handles empty inputs", () => {
		expect(rrfMerge([], [], 10)).toHaveLength(0);
		expect(rrfMerge([{ id: "a", content: "A", score: 1 }], [], 10)).toHaveLength(1);
		expect(rrfMerge([], [{ id: "a", content: "A", score: 1 }], 10)).toHaveLength(1);
	});
});
