import type { EmbeddingProvider } from "./provider.js";

export class OllamaEmbeddingProvider implements EmbeddingProvider {
	private baseUrl: string;
	readonly modelName: string;
	readonly dimensions: number;

	constructor(options?: { baseUrl?: string; model?: string; dimensions?: number }) {
		this.baseUrl = (options?.baseUrl ?? "http://localhost:11434").replace(/\/$/, "");
		this.modelName = options?.model ?? "nomic-embed-text";
		this.dimensions = options?.dimensions ?? 768;
	}

	async embed(text: string): Promise<number[]> {
		const response = await fetch(`${this.baseUrl}/api/embed`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ model: this.modelName, input: text }),
		});

		if (!response.ok) {
			throw new Error(`Ollama embedding failed: ${response.status} ${response.statusText}`);
		}

		const data = (await response.json()) as { embeddings: number[][] };
		return data.embeddings[0];
	}

	async embedBatch(texts: string[]): Promise<number[][]> {
		// Ollama supports batch input in the embed endpoint
		const response = await fetch(`${this.baseUrl}/api/embed`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ model: this.modelName, input: texts }),
		});

		if (!response.ok) {
			throw new Error(`Ollama batch embedding failed: ${response.status}`);
		}

		const data = (await response.json()) as { embeddings: number[][] };
		return data.embeddings;
	}
}
