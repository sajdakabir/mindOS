import OpenAI from "openai";
import type { LLMProvider } from "./provider.js";

export class OpenAILLMProvider implements LLMProvider {
	private client: OpenAI;
	private model: string;

	constructor(options?: { apiKey?: string; model?: string }) {
		this.client = new OpenAI({ apiKey: options?.apiKey });
		this.model = options?.model ?? "gpt-4o-mini";
	}

	async complete(
		prompt: string,
		options?: { temperature?: number; maxTokens?: number },
	): Promise<string> {
		const response = await this.client.chat.completions.create({
			model: this.model,
			messages: [{ role: "user", content: prompt }],
			temperature: options?.temperature ?? 0.1,
			max_tokens: options?.maxTokens ?? 2048,
		});
		return response.choices[0]?.message?.content ?? "";
	}

	async completeJSON<T>(
		prompt: string,
		options?: { temperature?: number; maxTokens?: number },
	): Promise<T> {
		const response = await this.client.chat.completions.create({
			model: this.model,
			messages: [{ role: "user", content: prompt }],
			temperature: options?.temperature ?? 0.0,
			max_tokens: options?.maxTokens ?? 4096,
			response_format: { type: "json_object" },
		});

		const content = response.choices[0]?.message?.content ?? "{}";
		return JSON.parse(content) as T;
	}
}
