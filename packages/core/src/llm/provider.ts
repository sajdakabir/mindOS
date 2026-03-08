export interface LLMProvider {
	complete(prompt: string, options?: { temperature?: number; maxTokens?: number }): Promise<string>;
	completeJSON<T>(
		prompt: string,
		options?: { temperature?: number; maxTokens?: number },
	): Promise<T>;
}
