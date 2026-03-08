import type { LLMProvider } from "./provider.js";

export class OllamaLLMProvider implements LLMProvider {
	private baseUrl: string;
	private model: string;

	constructor(options?: { baseUrl?: string; model?: string }) {
		this.baseUrl = (options?.baseUrl ?? "http://localhost:11434").replace(/\/$/, "");
		this.model = options?.model ?? "llama3.2";
	}

	async complete(
		prompt: string,
		options?: { temperature?: number; maxTokens?: number },
	): Promise<string> {
		const response = await fetch(`${this.baseUrl}/api/generate`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				model: this.model,
				prompt,
				stream: false,
				options: {
					temperature: options?.temperature ?? 0.1,
					num_predict: options?.maxTokens ?? 2048,
				},
			}),
		});

		if (!response.ok) {
			throw new Error(`Ollama completion failed: ${response.status}`);
		}

		const data = (await response.json()) as { response: string };
		return data.response;
	}

	async completeJSON<T>(
		prompt: string,
		options?: { temperature?: number; maxTokens?: number },
	): Promise<T> {
		const response = await fetch(`${this.baseUrl}/api/generate`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				model: this.model,
				prompt: `${prompt}\n\nIMPORTANT: Respond ONLY with valid JSON. No markdown, no explanation.`,
				stream: false,
				format: "json",
				options: {
					temperature: options?.temperature ?? 0.0,
					num_predict: options?.maxTokens ?? 4096,
				},
			}),
		});

		if (!response.ok) {
			throw new Error(`Ollama JSON completion failed: ${response.status}`);
		}

		const data = (await response.json()) as { response: string };
		return JSON.parse(data.response) as T;
	}
}
