import { DEFAULT_EMBEDDING_DIMENSIONS, DEFAULT_EMBEDDING_MODEL } from "@mindos/shared";
import OpenAI from "openai";
import type { EmbeddingProvider } from "./provider.js";

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
	private client: OpenAI;
	readonly dimensions: number;
	readonly modelName: string;

	constructor(options?: { apiKey?: string; model?: string; dimensions?: number }) {
		this.client = new OpenAI({ apiKey: options?.apiKey });
		this.modelName = options?.model ?? DEFAULT_EMBEDDING_MODEL;
		this.dimensions = options?.dimensions ?? DEFAULT_EMBEDDING_DIMENSIONS;
	}

	async embed(text: string): Promise<number[]> {
		const response = await this.client.embeddings.create({
			model: this.modelName,
			input: text,
			dimensions: this.dimensions,
		});
		return response.data[0].embedding;
	}

	async embedBatch(texts: string[]): Promise<number[][]> {
		if (texts.length === 0) return [];

		// OpenAI supports up to 2048 inputs per request
		const batchSize = 2048;
		const allEmbeddings: number[][] = [];

		for (let i = 0; i < texts.length; i += batchSize) {
			const batch = texts.slice(i, i + batchSize);
			const response = await this.client.embeddings.create({
				model: this.modelName,
				input: batch,
				dimensions: this.dimensions,
			});
			for (const item of response.data) {
				allEmbeddings.push(item.embedding);
			}
		}

		return allEmbeddings;
	}
}
