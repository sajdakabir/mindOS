import type { Database } from "@mindos/db";
import { facts } from "@mindos/db";
import { CONTRADICTION_SIMILARITY_THRESHOLD } from "@mindos/shared";
import { and, eq, sql } from "drizzle-orm";
import type { EmbeddingProvider } from "../embeddings/provider.js";
import { CONTRADICTION_DETECTION_PROMPT } from "../extraction/prompts.js";
import type { LLMProvider } from "../llm/provider.js";

interface ContradictionResult {
	contradicts: boolean;
	existingFactId: string;
	explanation: string;
}

export class ContradictionDetector {
	constructor(
		private db: Database,
		private llm: LLMProvider,
		private embeddingProvider: EmbeddingProvider,
	) {}

	async checkAndResolve(
		userId: string,
		newFactContent: string,
		newFactCategory: string,
		newFactId: string,
		newFactEmbedding: number[],
	): Promise<ContradictionResult[]> {
		// Find similar existing active facts in the same category
		const embeddingStr = JSON.stringify(newFactEmbedding);
		const candidates = await this.db.execute(sql`
			SELECT id, content, embedding
			FROM facts
			WHERE user_id = ${userId}
				AND category = ${newFactCategory}
				AND is_active = true
				AND id != ${newFactId}
				AND embedding IS NOT NULL
				AND 1 - (embedding <=> ${embeddingStr}::vector) >= ${CONTRADICTION_SIMILARITY_THRESHOLD}
			ORDER BY embedding <=> ${embeddingStr}::vector
			LIMIT 5
		`);

		const rows = candidates.rows as Array<{ id: string; content: string }>;
		if (rows.length === 0) return [];

		const results: ContradictionResult[] = [];

		for (const candidate of rows) {
			const prompt = CONTRADICTION_DETECTION_PROMPT.replace(
				"{{existingFact}}",
				candidate.content,
			).replace("{{newFact}}", newFactContent);

			try {
				const result = await this.llm.completeJSON<{
					contradicts: boolean;
					explanation: string;
				}>(prompt);

				if (result.contradicts) {
					// Resolve: mark old fact as superseded
					await this.db
						.update(facts)
						.set({
							isActive: false,
							supersededBy: newFactId,
						})
						.where(eq(facts.id, candidate.id));

					// Mark new fact as superseding
					await this.db
						.update(facts)
						.set({ supersedes: candidate.id })
						.where(eq(facts.id, newFactId));

					results.push({
						contradicts: true,
						existingFactId: candidate.id,
						explanation: result.explanation,
					});
				}
			} catch (error) {
				console.error(`Contradiction check failed for fact ${candidate.id}:`, error);
			}
		}

		return results;
	}
}
