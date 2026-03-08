import type { Database } from "@mindos/db";
import { DEFAULT_TEMPORAL_BUFFER_HOURS } from "@mindos/shared";
import { sql } from "drizzle-orm";

export class ExpiryManager {
	constructor(private db: Database) {}

	/**
	 * Resolve relative temporal references to absolute timestamps.
	 * E.g., "tomorrow" on 2026-03-08 → 2026-03-09T23:59:59
	 */
	resolveTemporalRef(ref: string, currentDate: Date = new Date()): Date | null {
		const lower = ref.toLowerCase().trim();

		if (lower.includes("tomorrow")) {
			const d = new Date(currentDate);
			d.setDate(d.getDate() + 1);
			d.setHours(23, 59, 59, 0);
			return d;
		}

		if (lower.includes("today") || lower.includes("tonight")) {
			const d = new Date(currentDate);
			d.setHours(23, 59, 59, 0);
			return d;
		}

		if (lower.includes("next week")) {
			const d = new Date(currentDate);
			d.setDate(d.getDate() + 7);
			d.setHours(23, 59, 59, 0);
			return d;
		}

		if (lower.includes("next month")) {
			const d = new Date(currentDate);
			d.setMonth(d.getMonth() + 1);
			d.setHours(23, 59, 59, 0);
			return d;
		}

		// Match patterns like "in X hours/days/weeks"
		const inMatch = lower.match(/in\s+(\d+)\s+(hour|day|week|month)s?/);
		if (inMatch) {
			const amount = Number.parseInt(inMatch[1], 10);
			const unit = inMatch[2];
			const d = new Date(currentDate);

			switch (unit) {
				case "hour":
					d.setHours(d.getHours() + amount + DEFAULT_TEMPORAL_BUFFER_HOURS);
					break;
				case "day":
					d.setDate(d.getDate() + amount);
					d.setHours(23, 59, 59, 0);
					break;
				case "week":
					d.setDate(d.getDate() + amount * 7);
					d.setHours(23, 59, 59, 0);
					break;
				case "month":
					d.setMonth(d.getMonth() + amount);
					d.setHours(23, 59, 59, 0);
					break;
			}
			return d;
		}

		return null;
	}

	/**
	 * Clean up expired memories and facts.
	 * Should be called periodically (e.g., every 5 minutes via BullMQ).
	 */
	async cleanupExpired(): Promise<{ memoriesExpired: number; factsExpired: number }> {
		const memResult = await this.db.execute(sql`
			UPDATE memories
			SET is_active = false, updated_at = NOW()
			WHERE expires_at < NOW() AND is_active = true
		`);

		const factResult = await this.db.execute(sql`
			UPDATE facts
			SET is_active = false
			WHERE valid_until < NOW() AND is_active = true
		`);

		const memoriesExpired = Number(memResult.rowCount ?? 0);
		const factsExpired = Number(factResult.rowCount ?? 0);

		if (memoriesExpired > 0 || factsExpired > 0) {
			console.log(`Expired: ${memoriesExpired} memories, ${factsExpired} facts`);
		}

		return { memoriesExpired, factsExpired };
	}
}
