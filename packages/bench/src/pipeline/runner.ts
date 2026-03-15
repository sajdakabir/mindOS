import OpenAI from "openai";
import type {
	BenchmarkConfig,
	BenchmarkReport,
	BenchmarkSample,
	Judge,
	MemoryProvider,
	QuestionCategory,
	QuestionResult,
} from "../types.js";

const ANSWER_SYSTEM_PROMPT = `You are a helpful assistant answering questions about past conversations.
Use the provided context to answer the question accurately and concisely.
If the context doesn't contain enough information, say "I don't have enough information to answer this."
Keep answers brief — 1-3 sentences.`;

export class BenchmarkRunner {
	private openai: OpenAI;

	constructor(
		private provider: MemoryProvider,
		private judge: Judge,
		private config: BenchmarkConfig,
	) {
		this.openai = new OpenAI({ apiKey: config.openaiApiKey });
	}

	async run(samples: BenchmarkSample[]): Promise<BenchmarkReport> {
		const startTime = Date.now();
		const allResults: QuestionResult[] = [];

		for (let i = 0; i < samples.length; i++) {
			const sample = samples[i];
			const userId = `bench_${sample.sampleId}`;
			console.log(
				`\n── Sample ${i + 1}/${samples.length}: ${sample.sampleId} (${sample.questions.length} questions) ──`,
			);

			// Stage 1: INGEST
			console.log("  [1/6] INGEST — Loading conversations into provider...");
			const ingestStart = Date.now();
			await this.provider.cleanup(userId);
			await this.provider.ingest(userId, sample.sessions);
			const ingestMs = Date.now() - ingestStart;
			console.log(`  [1/6] INGEST — Done (${ingestMs}ms)`);

			// Stage 2: INDEX
			console.log("  [2/6] INDEX — Waiting for indexing...");
			await this.provider.waitForIndexing();
			console.log("  [2/6] INDEX — Done");

			// Process each question through stages 3-5
			for (let q = 0; q < sample.questions.length; q++) {
				const question = sample.questions[q];
				console.log(
					`  [Q${q + 1}/${sample.questions.length}] ${question.category}: "${question.question.slice(0, 60)}..."`,
				);

				// Stage 3: SEARCH
				const searchStart = Date.now();
				const context = await this.provider.search(
					userId,
					question.question,
					this.config.searchLimit,
				);
				const searchLatencyMs = Date.now() - searchStart;
				const contextTexts = context.map((r) => r.content);

				// Stage 4: ANSWER
				const answerStart = Date.now();
				const generatedAnswer = await this.generateAnswer(question.question, contextTexts);
				const answerLatencyMs = Date.now() - answerStart;

				// Stage 5: EVALUATE
				const judgeResult = await this.judge.evaluate(
					question.question,
					question.answer,
					generatedAnswer,
					contextTexts,
				);

				const result: QuestionResult = {
					questionId: question.id,
					question: question.question,
					category: question.category,
					groundTruth: question.answer,
					retrievedContext: contextTexts,
					generatedAnswer,
					score: judgeResult.score,
					reasoning: judgeResult.reasoning,
					searchLatencyMs,
					answerLatencyMs,
				};

				allResults.push(result);

				const icon = judgeResult.score >= 0.5 ? "✓" : "✗";
				console.log(
					`         ${icon} score=${judgeResult.score.toFixed(2)} search=${searchLatencyMs}ms answer=${answerLatencyMs}ms`,
				);
			}

			// Cleanup
			await this.provider.cleanup(userId);
		}

		// Stage 6: REPORT
		const totalDurationMs = Date.now() - startTime;
		return this.generateReport(allResults, totalDurationMs);
	}

	private async generateAnswer(question: string, context: string[]): Promise<string> {
		const contextBlock =
			context.length > 0
				? context.map((c, i) => `[Context ${i + 1}]:\n${c}`).join("\n\n")
				: "No relevant context found.";

		try {
			const response = await this.openai.chat.completions.create({
				model: this.config.answerModel,
				messages: [
					{ role: "system", content: ANSWER_SYSTEM_PROMPT },
					{
						role: "user",
						content: `Context:\n${contextBlock}\n\nQuestion: ${question}`,
					},
				],
				temperature: 0,
				max_tokens: 512,
			});

			return response.choices[0]?.message?.content ?? "No answer generated";
		} catch (error) {
			console.error("Answer generation failed:", error);
			return "Answer generation failed";
		}
	}

	private generateReport(results: QuestionResult[], totalDurationMs: number): BenchmarkReport {
		const totalQuestions = results.length;
		const overallAccuracy =
			totalQuestions > 0 ? results.reduce((sum, r) => sum + r.score, 0) / totalQuestions : 0;

		// Accuracy by category
		const byCategory: Record<string, { total: number; sum: number }> = {};
		for (const r of results) {
			if (!byCategory[r.category]) {
				byCategory[r.category] = { total: 0, sum: 0 };
			}
			byCategory[r.category].total++;
			byCategory[r.category].sum += r.score;
		}

		const accuracyByCategory: Record<string, { accuracy: number; count: number }> = {};
		for (const [cat, data] of Object.entries(byCategory)) {
			accuracyByCategory[cat] = {
				accuracy: data.total > 0 ? data.sum / data.total : 0,
				count: data.total,
			};
		}

		// Latency percentiles
		const searchLatencies = results.map((r) => r.searchLatencyMs).sort((a, b) => a - b);
		const answerLatencies = results.map((r) => r.answerLatencyMs).sort((a, b) => a - b);

		return {
			provider: this.config.provider,
			dataset: this.config.dataset,
			timestamp: new Date().toISOString(),
			totalQuestions,
			overallAccuracy: Math.round(overallAccuracy * 10000) / 10000,
			accuracyByCategory,
			latency: {
				searchP50Ms: percentile(searchLatencies, 50),
				searchP95Ms: percentile(searchLatencies, 95),
				searchP99Ms: percentile(searchLatencies, 99),
				answerP50Ms: percentile(answerLatencies, 50),
				answerP95Ms: percentile(answerLatencies, 95),
			},
			ingestDurationMs: 0, // tracked per-sample, aggregated here for simplicity
			totalDurationMs,
			results,
		};
	}
}

function percentile(sortedArr: number[], p: number): number {
	if (sortedArr.length === 0) return 0;
	const index = Math.ceil((p / 100) * sortedArr.length) - 1;
	return sortedArr[Math.max(0, index)];
}
