import type { MemoryProvider, PerfReport, PerfResult } from "../types.js";

/**
 * Performance benchmark: measures raw search latency and ingestion throughput.
 * Requires a running mindOS instance with data already loaded.
 */
export class PerfBenchmark {
	constructor(private provider: MemoryProvider) {}

	async run(userId: string, queries: string[], iterations = 3): Promise<PerfReport> {
		const results: PerfResult[] = [];

		// Search latency benchmark
		console.log("\n── Search Latency Benchmark ──────────────────────────────");
		const searchResult = await this.benchmarkSearch(userId, queries, iterations);
		results.push(searchResult);
		this.printResult(searchResult);

		// Ingestion throughput benchmark
		console.log("\n── Ingestion Throughput Benchmark ────────────────────────");
		const ingestResult = await this.benchmarkIngest(userId);
		results.push(ingestResult);
		this.printResult(ingestResult);

		return {
			provider: this.provider.name,
			timestamp: new Date().toISOString(),
			results,
		};
	}

	private async benchmarkSearch(
		userId: string,
		queries: string[],
		iterations: number,
	): Promise<PerfResult> {
		const latencies: number[] = [];

		for (let iter = 0; iter < iterations; iter++) {
			for (const query of queries) {
				const start = performance.now();
				await this.provider.search(userId, query, 10);
				const elapsed = Math.round(performance.now() - start);
				latencies.push(elapsed);
			}
		}

		latencies.sort((a, b) => a - b);
		const totalOps = latencies.length;
		const totalMs = latencies.reduce((a, b) => a + b, 0);

		return {
			operation: "search",
			totalOps,
			durationMs: totalMs,
			opsPerSecond: Math.round((totalOps / totalMs) * 1000 * 100) / 100,
			latencyP50Ms: percentile(latencies, 50),
			latencyP95Ms: percentile(latencies, 95),
			latencyP99Ms: percentile(latencies, 99),
			latencies,
		};
	}

	private async benchmarkIngest(userId: string): Promise<PerfResult> {
		const testMemories = Array.from({ length: 50 }, (_, i) => ({
			sessionId: 9000 + i,
			turns: [
				{
					speaker: "User",
					text: `Performance test memory ${i}: The quick brown fox jumps over the lazy dog. This is a test memory for benchmarking ingestion throughput with realistic content length.`,
				},
			],
		}));

		const benchUserId = `${userId}_perf_ingest`;
		await this.provider.cleanup(benchUserId);

		const latencies: number[] = [];
		const batchSize = 10;

		for (let i = 0; i < testMemories.length; i += batchSize) {
			const batch = testMemories.slice(i, i + batchSize);
			const start = performance.now();
			await this.provider.ingest(benchUserId, batch);
			const elapsed = Math.round(performance.now() - start);
			latencies.push(elapsed);
		}

		await this.provider.cleanup(benchUserId);

		latencies.sort((a, b) => a - b);
		const totalMs = latencies.reduce((a, b) => a + b, 0);
		const totalOps = testMemories.length;

		return {
			operation: "ingest",
			totalOps,
			durationMs: totalMs,
			opsPerSecond: Math.round((totalOps / totalMs) * 1000 * 100) / 100,
			latencyP50Ms: percentile(latencies, 50),
			latencyP95Ms: percentile(latencies, 95),
			latencyP99Ms: percentile(latencies, 99),
			latencies,
		};
	}

	private printResult(result: PerfResult): void {
		console.log(`  ${result.operation}:`);
		console.log(`    Total ops:    ${result.totalOps}`);
		console.log(`    Duration:     ${result.durationMs}ms`);
		console.log(`    Throughput:   ${result.opsPerSecond} ops/sec`);
		console.log(`    Latency P50:  ${result.latencyP50Ms}ms`);
		console.log(`    Latency P95:  ${result.latencyP95Ms}ms`);
		console.log(`    Latency P99:  ${result.latencyP99Ms}ms`);
	}
}

function percentile(sortedArr: number[], p: number): number {
	if (sortedArr.length === 0) return 0;
	const index = Math.ceil((p / 100) * sortedArr.length) - 1;
	return sortedArr[Math.max(0, index)];
}
