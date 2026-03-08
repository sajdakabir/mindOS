import type { Database } from "@mindos/db";
import { facts } from "@mindos/db";
import { eq, sql } from "drizzle-orm";
import { ContradictionDetector } from "../contradiction/detector.js";
import type { EmbeddingProvider } from "../embeddings/provider.js";
import { FactExtractor } from "../extraction/fact-extractor.js";
import type { LLMProvider } from "../llm/provider.js";
import { ProfileBuilder } from "../profiles/profile-builder.js";
import { ExpiryManager } from "../temporal/expiry-manager.js";

export interface FactExtractionJob {
	type: "fact-extraction";
	memoryId: string;
	userId: string;
	content: string;
}

export interface ExpiryCleanupJob {
	type: "expiry-cleanup";
}

export type WorkerJob = FactExtractionJob | ExpiryCleanupJob;

export class JobProcessor {
	private factExtractor: FactExtractor;
	private contradictionDetector: ContradictionDetector;
	private profileBuilder: ProfileBuilder;
	private expiryManager: ExpiryManager;

	constructor(
		private db: Database,
		private llm: LLMProvider,
		private embeddingProvider: EmbeddingProvider,
	) {
		this.factExtractor = new FactExtractor(llm, embeddingProvider);
		this.contradictionDetector = new ContradictionDetector(db, llm, embeddingProvider);
		this.profileBuilder = new ProfileBuilder(db, llm);
		this.expiryManager = new ExpiryManager(db);
	}

	async process(job: WorkerJob): Promise<void> {
		switch (job.type) {
			case "fact-extraction":
				await this.processFactExtraction(job);
				break;
			case "expiry-cleanup":
				await this.expiryManager.cleanupExpired();
				break;
		}
	}

	private async processFactExtraction(job: FactExtractionJob): Promise<void> {
		console.log(`Extracting facts from memory ${job.memoryId}`);

		// Extract facts via LLM
		const extractedFacts = await this.factExtractor.extract(job.content);
		if (extractedFacts.length === 0) {
			console.log(`No facts extracted from memory ${job.memoryId}`);
			return;
		}

		console.log(`Extracted ${extractedFacts.length} facts from memory ${job.memoryId}`);

		// Generate embeddings for all facts
		const factEmbeddings = await this.embeddingProvider.embedBatch(
			extractedFacts.map((f) => f.content),
		);

		// Insert facts and check contradictions
		for (let i = 0; i < extractedFacts.length; i++) {
			const fact = extractedFacts[i];
			const embedding = factEmbeddings[i];

			// Resolve temporal reference if present
			let validUntil: Date | undefined;
			if (fact.temporalRef) {
				const resolved = this.expiryManager.resolveTemporalRef(fact.temporalRef);
				if (resolved) validUntil = resolved;
			}

			// Insert the fact
			const [inserted] = await this.db
				.insert(facts)
				.values({
					userId: job.userId,
					memoryId: job.memoryId,
					content: fact.content,
					category: fact.category,
					confidence: fact.confidence,
					validUntil,
				})
				.returning();

			// Set the embedding via raw SQL
			await this.db.execute(
				sql`UPDATE facts SET embedding = ${JSON.stringify(embedding)}::vector WHERE id = ${inserted.id}`,
			);

			// Check for contradictions
			try {
				const contradictions = await this.contradictionDetector.checkAndResolve(
					job.userId,
					fact.content,
					fact.category,
					inserted.id,
					embedding,
				);
				if (contradictions.length > 0) {
					console.log(
						`Resolved ${contradictions.length} contradiction(s) for fact "${fact.content}"`,
					);
				}
			} catch (error) {
				console.error(`Contradiction check failed for fact ${inserted.id}:`, error);
			}
		}

		// Rebuild user profile
		try {
			await this.profileBuilder.buildProfile(job.userId);
			console.log(`Profile rebuilt for user ${job.userId}`);
		} catch (error) {
			console.error(`Profile build failed for user ${job.userId}:`, error);
		}
	}
}
