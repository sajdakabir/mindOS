import { CHUNK_OVERLAP_TOKENS, DEDUP_SIMILARITY_THRESHOLD, MAX_CHUNK_TOKENS } from "@mindos/shared";
import type { EmbeddingProvider } from "../embeddings/provider.js";
import type { LLMProvider } from "../llm/provider.js";
import { FACT_EXTRACTION_PROMPT } from "./prompts.js";

export interface ExtractedFact {
	content: string;
	category: "preference" | "biographical" | "contextual" | "temporal";
	confidence: number;
	temporalRef: string | null;
}

interface ExtractionResponse {
	facts: ExtractedFact[];
}

export class FactExtractor {
	constructor(
		private llm: LLMProvider,
		private embeddingProvider: EmbeddingProvider,
	) {}

	async extract(content: string): Promise<ExtractedFact[]> {
		const chunks = this.chunkContent(content);
		const allFacts: ExtractedFact[] = [];

		for (const chunk of chunks) {
			const prompt = FACT_EXTRACTION_PROMPT.replace("{{content}}", chunk).replace(
				"{{currentDate}}",
				new Date().toISOString().split("T")[0],
			);

			try {
				const result = await this.llm.completeJSON<ExtractionResponse>(prompt);
				if (result.facts && Array.isArray(result.facts)) {
					for (const fact of result.facts) {
						if (fact.content && fact.category && typeof fact.confidence === "number") {
							allFacts.push({
								content: fact.content,
								category: fact.category,
								confidence: Math.min(1, Math.max(0, fact.confidence)),
								temporalRef: fact.temporalRef ?? null,
							});
						}
					}
				}
			} catch (error) {
				console.error("Fact extraction failed for chunk:", error);
			}
		}

		// Deduplicate facts within the same extraction
		return this.deduplicateFacts(allFacts);
	}

	private async deduplicateFacts(facts: ExtractedFact[]): Promise<ExtractedFact[]> {
		if (facts.length <= 1) return facts;

		const embeddings = await this.embeddingProvider.embedBatch(facts.map((f) => f.content));
		const unique: ExtractedFact[] = [facts[0]];
		const uniqueEmbeddings: number[][] = [embeddings[0]];

		for (let i = 1; i < facts.length; i++) {
			let isDuplicate = false;
			for (const uEmb of uniqueEmbeddings) {
				const similarity = cosineSimilarity(embeddings[i], uEmb);
				if (similarity >= DEDUP_SIMILARITY_THRESHOLD) {
					isDuplicate = true;
					break;
				}
			}
			if (!isDuplicate) {
				unique.push(facts[i]);
				uniqueEmbeddings.push(embeddings[i]);
			}
		}

		return unique;
	}

	private chunkContent(content: string): string[] {
		// Rough estimation: 1 token ≈ 4 characters
		const charLimit = MAX_CHUNK_TOKENS * 4;
		const overlapChars = CHUNK_OVERLAP_TOKENS * 4;

		if (content.length <= charLimit) return [content];

		const chunks: string[] = [];
		let start = 0;
		while (start < content.length) {
			const end = Math.min(start + charLimit, content.length);
			chunks.push(content.slice(start, end));
			start = end - overlapChars;
			if (start >= content.length) break;
		}

		return chunks;
	}
}

function cosineSimilarity(a: number[], b: number[]): number {
	let dotProduct = 0;
	let normA = 0;
	let normB = 0;
	for (let i = 0; i < a.length; i++) {
		dotProduct += a[i] * b[i];
		normA += a[i] * a[i];
		normB += b[i] * b[i];
	}
	return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
