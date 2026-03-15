#!/usr/bin/env node

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { Command } from "commander";
import { getDatasetStats, loadDataset } from "./datasets/index.js";
import { createJudge } from "./judges/index.js";
import { PerfBenchmark } from "./perf/index.js";
import { BenchmarkRunner, formatReport, formatReportMarkdown } from "./pipeline/index.js";
import { createProvider } from "./providers/index.js";
import type { BenchmarkConfig } from "./types.js";

const program = new Command();

program
	.name("mindos-bench")
	.description("Benchmark suite for mindOS — the open-source AI memory engine")
	.version("0.1.0");

// ─── Main benchmark command ──────────────────────────────────────────────────

program
	.command("run")
	.description(
		"Run the full benchmark pipeline (ingest → index → search → answer → evaluate → report)",
	)
	.option("-p, --provider <name>", "Memory provider", "mindos")
	.option("-b, --dataset <name>", "Benchmark dataset", "locomo")
	.option("-j, --judge <name>", "Judge type (llm, gpt-4o, f1)", "f1")
	.option("-m, --model <name>", "Answer generation model", "gpt-4o-mini")
	.option("-l, --limit <n>", "Limit total questions", Number.parseInt)
	.option("-k, --search-limit <n>", "Search results per query", Number.parseInt, 10)
	.option("--api-url <url>", "mindOS API URL", "http://localhost:3000")
	.option("--api-key <key>", "mindOS API key")
	.option("--openai-key <key>", "OpenAI API key")
	.option("-o, --output <dir>", "Output directory", "./bench-results")
	.action(async (opts) => {
		const config: BenchmarkConfig = {
			provider: opts.provider,
			dataset: opts.dataset,
			judge: opts.judge,
			answerModel: opts.model,
			limit: opts.limit,
			searchLimit: opts.searchLimit,
			apiUrl: opts.apiUrl,
			apiKey: opts.apiKey ?? process.env.MINDOS_API_KEY ?? "",
			openaiApiKey: opts.openaiKey ?? process.env.OPENAI_API_KEY ?? "",
			outputDir: opts.output,
		};

		console.log("═══════════════════════════════════════════════════════════════");
		console.log("  mindOS Benchmark Suite");
		console.log("═══════════════════════════════════════════════════════════════");
		console.log(`  Provider:  ${config.provider}`);
		console.log(`  Dataset:   ${config.dataset}`);
		console.log(`  Judge:     ${config.judge}`);
		console.log(`  Model:     ${config.answerModel}`);
		console.log(`  Limit:     ${config.limit ?? "all"}`);

		// Load dataset
		console.log("\nLoading dataset...");
		const samples = await loadDataset(config.dataset, config.limit);
		const stats = getDatasetStats(samples);
		console.log(`  Conversations: ${stats.totalConversations}`);
		console.log(`  Sessions:      ${stats.totalSessions}`);
		console.log(`  Turns:         ${stats.totalTurns}`);
		console.log(`  Questions:     ${stats.totalQuestions}`);
		console.log(`  By category:   ${JSON.stringify(stats.byCategory)}`);

		// Create provider and judge
		const provider = createProvider(config.provider, config.apiUrl, config.apiKey);
		const judge = createJudge(config.judge, config.openaiApiKey);

		await provider.initialize();

		// Run benchmark
		const runner = new BenchmarkRunner(provider, judge, config);
		const report = await runner.run(samples);

		// Output report
		const textReport = formatReport(report);
		console.log(textReport);

		// Save results
		if (!existsSync(config.outputDir)) {
			mkdirSync(config.outputDir, { recursive: true });
		}

		const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
		const baseName = `${config.provider}-${config.dataset}-${timestamp}`;

		writeFileSync(`${config.outputDir}/${baseName}.json`, JSON.stringify(report, null, 2));

		writeFileSync(`${config.outputDir}/${baseName}.md`, formatReportMarkdown(report));

		console.log(`Results saved to ${config.outputDir}/${baseName}.{json,md}`);
	});

// ─── Performance benchmark command ───────────────────────────────────────────

program
	.command("perf")
	.description("Run performance benchmarks (search latency, ingestion throughput)")
	.option("-p, --provider <name>", "Memory provider", "mindos")
	.option("--api-url <url>", "mindOS API URL", "http://localhost:3000")
	.option("--api-key <key>", "mindOS API key")
	.option("-i, --iterations <n>", "Iterations per query", Number.parseInt, 3)
	.option("-o, --output <dir>", "Output directory", "./bench-results")
	.action(async (opts) => {
		const apiKey = opts.apiKey ?? process.env.MINDOS_API_KEY ?? "";
		const provider = createProvider(opts.provider, opts.apiUrl, apiKey);
		await provider.initialize();

		console.log("═══════════════════════════════════════════════════════════════");
		console.log("  mindOS Performance Benchmark");
		console.log("═══════════════════════════════════════════════════════════════");

		const testQueries = [
			"What are their coding preferences?",
			"Where do they work?",
			"What programming languages do they use?",
			"Do they have any pets?",
			"What did they mention about their weekend plans?",
			"What is their favorite food?",
			"When did they start their current job?",
			"What hobbies do they enjoy?",
		];

		const perf = new PerfBenchmark(provider);
		const report = await perf.run("bench_perf_user", testQueries, opts.iterations);

		// Save results
		if (!existsSync(opts.output)) {
			mkdirSync(opts.output, { recursive: true });
		}

		const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
		writeFileSync(
			`${opts.output}/perf-${opts.provider}-${timestamp}.json`,
			JSON.stringify(report, null, 2),
		);

		console.log(`\nResults saved to ${opts.output}/`);
	});

// ─── Dataset info command ────────────────────────────────────────────────────

program
	.command("info")
	.description("Show dataset information")
	.option("-b, --dataset <name>", "Benchmark dataset", "locomo")
	.option("-l, --limit <n>", "Limit questions", Number.parseInt)
	.action(async (opts) => {
		const samples = await loadDataset(opts.dataset, opts.limit);
		const stats = getDatasetStats(samples);

		console.log("\n── Dataset Info ──────────────────────────────────────────────");
		console.log(`  Name:          ${opts.dataset}`);
		console.log(`  Conversations: ${stats.totalConversations}`);
		console.log(`  Sessions:      ${stats.totalSessions}`);
		console.log(`  Turns:         ${stats.totalTurns}`);
		console.log(`  Questions:     ${stats.totalQuestions}`);
		console.log("");
		console.log("  Questions by category:");
		for (const [cat, count] of Object.entries(stats.byCategory)) {
			console.log(`    ${cat}: ${count}`);
		}
		console.log("");
	});

program.parse();
