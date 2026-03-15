import OpenAI from "openai";
import type { Judge, JudgeScore } from "../types.js";

const JUDGE_PROMPT = `You are an expert evaluator for a memory retrieval system benchmark.

Given a question, the ground truth answer, and a generated answer (based on retrieved context), score the generated answer on a scale of 0 to 1.

Scoring guidelines:
- 1.0: Generated answer is correct and complete, matching the ground truth
- 0.75-0.99: Answer is mostly correct with minor missing details
- 0.5-0.74: Answer is partially correct but missing significant information
- 0.25-0.49: Answer has some relevant information but is mostly incorrect
- 0.01-0.24: Answer is mostly wrong but shows some awareness of the topic
- 0.0: Answer is completely wrong, irrelevant, or says "I don't know"

Be strict but fair. Focus on factual accuracy, not style.

Question: {{question}}

Ground Truth Answer: {{groundTruth}}

Generated Answer: {{generatedAnswer}}

Respond in JSON format:
{
  "score": <number 0-1>,
  "reasoning": "<brief explanation>"
}`;

export class LLMJudge implements Judge {
	name: string;
	private openai: OpenAI;
	private model: string;

	constructor(apiKey: string, model = "gpt-4o-mini") {
		this.openai = new OpenAI({ apiKey });
		this.model = model;
		this.name = `llm-judge-${model}`;
	}

	async evaluate(
		question: string,
		groundTruth: string,
		generatedAnswer: string,
		_context: string[],
	): Promise<JudgeScore> {
		const prompt = JUDGE_PROMPT.replace("{{question}}", question)
			.replace("{{groundTruth}}", groundTruth)
			.replace("{{generatedAnswer}}", generatedAnswer);

		try {
			const response = await this.openai.chat.completions.create({
				model: this.model,
				messages: [{ role: "user", content: prompt }],
				response_format: { type: "json_object" },
				temperature: 0,
				max_tokens: 256,
			});

			const content = response.choices[0]?.message?.content ?? "{}";
			const parsed = JSON.parse(content) as { score?: number; reasoning?: string };

			return {
				score: Math.min(1, Math.max(0, parsed.score ?? 0)),
				reasoning: parsed.reasoning ?? "No reasoning provided",
			};
		} catch (error) {
			console.error("Judge evaluation failed:", error);
			return { score: 0, reasoning: "Judge evaluation failed" };
		}
	}
}

/**
 * Simple F1-score based judge (no LLM needed, good for quick runs)
 */
export class F1Judge implements Judge {
	name = "f1-judge";

	async evaluate(
		_question: string,
		groundTruth: string,
		generatedAnswer: string,
		_context: string[],
	): Promise<JudgeScore> {
		const truthTokens = new Set(tokenize(groundTruth));
		const answerTokens = new Set(tokenize(generatedAnswer));

		if (truthTokens.size === 0 || answerTokens.size === 0) {
			return { score: 0, reasoning: "Empty answer or ground truth" };
		}

		let overlap = 0;
		for (const token of answerTokens) {
			if (truthTokens.has(token)) overlap++;
		}

		const precision = overlap / answerTokens.size;
		const recall = overlap / truthTokens.size;
		const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

		return {
			score: Math.round(f1 * 100) / 100,
			reasoning: `F1=${f1.toFixed(3)} (P=${precision.toFixed(3)}, R=${recall.toFixed(3)})`,
		};
	}
}

function tokenize(text: string): string[] {
	return text
		.toLowerCase()
		.replace(/[^\w\s]/g, " ")
		.split(/\s+/)
		.filter((t) => t.length > 0);
}
