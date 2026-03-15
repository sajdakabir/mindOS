import type { BenchmarkReport } from "../types.js";

export function formatReport(report: BenchmarkReport): string {
	const lines: string[] = [];

	lines.push("");
	lines.push("═══════════════════════════════════════════════════════════════");
	lines.push("  mindOS Benchmark Report");
	lines.push("═══════════════════════════════════════════════════════════════");
	lines.push("");
	lines.push(`  Provider:   ${report.provider}`);
	lines.push(`  Dataset:    ${report.dataset}`);
	lines.push(`  Timestamp:  ${report.timestamp}`);
	lines.push(`  Duration:   ${(report.totalDurationMs / 1000).toFixed(1)}s`);
	lines.push("");

	// Overall accuracy
	lines.push("── Accuracy ────────────────────────────────────────────────────");
	lines.push("");
	lines.push(
		`  Overall:  ${(report.overallAccuracy * 100).toFixed(1)}% (${report.totalQuestions} questions)`,
	);
	lines.push("");

	// By category
	const categories = Object.entries(report.accuracyByCategory).sort(
		([, a], [, b]) => b.accuracy - a.accuracy,
	);

	const maxCatLen = Math.max(...categories.map(([cat]) => cat.length));
	for (const [category, data] of categories) {
		const pct = (data.accuracy * 100).toFixed(1).padStart(5);
		const bar = progressBar(data.accuracy, 30);
		lines.push(`  ${category.padEnd(maxCatLen)}  ${pct}%  ${bar}  (n=${data.count})`);
	}

	lines.push("");

	// Latency
	lines.push("── Latency ─────────────────────────────────────────────────────");
	lines.push("");
	lines.push("  Search:");
	lines.push(`    P50:  ${report.latency.searchP50Ms}ms`);
	lines.push(`    P95:  ${report.latency.searchP95Ms}ms`);
	lines.push(`    P99:  ${report.latency.searchP99Ms}ms`);
	lines.push("");
	lines.push("  Answer Generation:");
	lines.push(`    P50:  ${report.latency.answerP50Ms}ms`);
	lines.push(`    P95:  ${report.latency.answerP95Ms}ms`);
	lines.push("");

	// Failures (score < 0.5)
	const failures = report.results.filter((r) => r.score < 0.5);
	if (failures.length > 0) {
		lines.push("── Failures (score < 0.5) ──────────────────────────────────────");
		lines.push("");
		for (const f of failures.slice(0, 10)) {
			lines.push(`  [${f.category}] Q: ${f.question.slice(0, 70)}...`);
			lines.push(`    Expected: ${f.groundTruth.slice(0, 70)}...`);
			lines.push(`    Got:      ${f.generatedAnswer.slice(0, 70)}...`);
			lines.push(`    Score:    ${f.score.toFixed(2)} — ${f.reasoning}`);
			lines.push("");
		}
		if (failures.length > 10) {
			lines.push(`  ... and ${failures.length - 10} more failures`);
			lines.push("");
		}
	}

	lines.push("═══════════════════════════════════════════════════════════════");
	lines.push("");

	return lines.join("\n");
}

function progressBar(ratio: number, width: number): string {
	const filled = Math.round(ratio * width);
	const empty = width - filled;
	return `[${"█".repeat(filled)}${"░".repeat(empty)}]`;
}

export function formatReportMarkdown(report: BenchmarkReport): string {
	const lines: string[] = [];

	lines.push("# mindOS Benchmark Report");
	lines.push("");
	lines.push("| Metric | Value |");
	lines.push("|--------|-------|");
	lines.push(`| Provider | ${report.provider} |`);
	lines.push(`| Dataset | ${report.dataset} |`);
	lines.push(`| Total Questions | ${report.totalQuestions} |`);
	lines.push(`| **Overall Accuracy** | **${(report.overallAccuracy * 100).toFixed(1)}%** |`);
	lines.push(`| Duration | ${(report.totalDurationMs / 1000).toFixed(1)}s |`);
	lines.push("");

	lines.push("## Accuracy by Category");
	lines.push("");
	lines.push("| Category | Accuracy | Count |");
	lines.push("|----------|----------|-------|");
	for (const [category, data] of Object.entries(report.accuracyByCategory)) {
		lines.push(`| ${category} | ${(data.accuracy * 100).toFixed(1)}% | ${data.count} |`);
	}
	lines.push("");

	lines.push("## Latency");
	lines.push("");
	lines.push("| Metric | Value |");
	lines.push("|--------|-------|");
	lines.push(`| Search P50 | ${report.latency.searchP50Ms}ms |`);
	lines.push(`| Search P95 | ${report.latency.searchP95Ms}ms |`);
	lines.push(`| Search P99 | ${report.latency.searchP99Ms}ms |`);
	lines.push(`| Answer P50 | ${report.latency.answerP50Ms}ms |`);
	lines.push(`| Answer P95 | ${report.latency.answerP95Ms}ms |`);
	lines.push("");

	return lines.join("\n");
}
