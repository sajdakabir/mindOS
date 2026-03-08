import { describe, expect, it } from "vitest";
import { ExpiryManager } from "../temporal/expiry-manager.js";

// Mock database - we only test the temporal resolution logic
const mockDb = {} as never;

describe("ExpiryManager", () => {
	const manager = new ExpiryManager(mockDb);
	const baseDate = new Date("2026-03-08T12:00:00Z");

	describe("resolveTemporalRef", () => {
		it("resolves 'tomorrow' to end of next day", () => {
			const result = manager.resolveTemporalRef("tomorrow", baseDate);
			expect(result).not.toBeNull();
			expect(result?.getDate()).toBe(9);
			expect(result?.getHours()).toBe(23);
		});

		it("resolves 'today' to end of today", () => {
			const result = manager.resolveTemporalRef("today", baseDate);
			expect(result).not.toBeNull();
			expect(result?.getDate()).toBe(8);
			expect(result?.getHours()).toBe(23);
		});

		it("resolves 'tonight' to end of today", () => {
			const result = manager.resolveTemporalRef("tonight", baseDate);
			expect(result).not.toBeNull();
			expect(result?.getDate()).toBe(8);
		});

		it("resolves 'next week' to 7 days later", () => {
			const result = manager.resolveTemporalRef("next week", baseDate);
			expect(result).not.toBeNull();
			expect(result?.getDate()).toBe(15);
		});

		it("resolves 'next month' to next month", () => {
			const result = manager.resolveTemporalRef("next month", baseDate);
			expect(result).not.toBeNull();
			expect(result?.getMonth()).toBe(3); // April (0-indexed)
		});

		it("resolves 'in 3 days' correctly", () => {
			const result = manager.resolveTemporalRef("in 3 days", baseDate);
			expect(result).not.toBeNull();
			expect(result?.getDate()).toBe(11);
		});

		it("resolves 'in 2 hours' correctly", () => {
			const result = manager.resolveTemporalRef("in 2 hours", baseDate);
			expect(result).not.toBeNull();
			// baseDate local hours + 2 + 1 (buffer)
			const expectedHours = baseDate.getHours() + 2 + 1;
			expect(result?.getHours()).toBe(expectedHours % 24);
		});

		it("resolves 'in 1 week' correctly", () => {
			const result = manager.resolveTemporalRef("in 1 week", baseDate);
			expect(result).not.toBeNull();
			expect(result?.getDate()).toBe(15);
		});

		it("returns null for unrecognized references", () => {
			expect(manager.resolveTemporalRef("sometime")).toBeNull();
			expect(manager.resolveTemporalRef("eventually")).toBeNull();
			expect(manager.resolveTemporalRef("")).toBeNull();
		});
	});
});
