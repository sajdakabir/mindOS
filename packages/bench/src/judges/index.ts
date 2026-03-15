import type { Judge } from "../types.js";
import { F1Judge, LLMJudge } from "./llm-judge.js";

export { LLMJudge, F1Judge } from "./llm-judge.js";

export function createJudge(name: string, openaiApiKey: string): Judge {
	switch (name) {
		case "llm":
		case "gpt-4o-mini":
			return new LLMJudge(openaiApiKey, "gpt-4o-mini");
		case "gpt-4o":
			return new LLMJudge(openaiApiKey, "gpt-4o");
		case "f1":
			return new F1Judge();
		default:
			throw new Error(`Unknown judge: ${name}. Available: llm, gpt-4o-mini, gpt-4o, f1`);
	}
}
