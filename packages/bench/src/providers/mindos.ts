import { MindOS } from "@mindos/sdk";
import type { ConversationSession, MemoryProvider, SearchResult } from "../types.js";

export class MindOSProvider implements MemoryProvider {
	name = "mindos";
	private client: MindOS;

	constructor(apiUrl: string, apiKey: string) {
		this.client = new MindOS({ apiKey, baseUrl: apiUrl });
	}

	async initialize(): Promise<void> {
		// mindOS doesn't need explicit initialization
	}

	async ingest(userId: string, sessions: ConversationSession[]): Promise<void> {
		// Convert conversation sessions into memories
		// Each session becomes one memory for better context grouping
		const memories = sessions.map((session) => {
			const content = session.turns.map((t) => `${t.speaker}: ${t.text}`).join("\n");

			return {
				userId,
				content,
				type: "conversation" as const,
				tags: [`session_${session.sessionId}`],
				metadata: {
					sessionId: session.sessionId,
					turnCount: session.turns.length,
				},
			};
		});

		// Batch ingest (max 100 per batch)
		for (let i = 0; i < memories.length; i += 100) {
			const batch = memories.slice(i, i + 100);
			await this.client.memories.batch(batch);
		}
	}

	async waitForIndexing(): Promise<void> {
		// mindOS embeds synchronously on ingest, but fact extraction is async.
		// Wait a bit for the BullMQ workers to process fact extraction.
		await sleep(3000);
	}

	async search(userId: string, query: string, limit = 10): Promise<SearchResult[]> {
		const response = await this.client.memories.search({
			query,
			userId,
			limit,
			searchMode: "hybrid",
		});

		return response.results.map((r) => ({
			content: r.content,
			score: r.score,
			metadata: r.metadata,
		}));
	}

	async cleanup(userId: string): Promise<void> {
		try {
			await this.client.users.delete(userId);
		} catch {
			// Ignore if user doesn't exist
		}
	}
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
