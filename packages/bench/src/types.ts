// ─── Dataset Types ───────────────────────────────────────────────────────────

export interface ConversationTurn {
	speaker: string;
	text: string;
	timestamp?: string;
	dialogId?: string;
}

export interface ConversationSession {
	sessionId: number;
	turns: ConversationTurn[];
}

export interface BenchmarkQuestion {
	id: string;
	question: string;
	answer: string;
	category: QuestionCategory;
	evidence?: string[];
}

export type QuestionCategory =
	| "single-hop"
	| "multi-hop"
	| "temporal"
	| "knowledge"
	| "adversarial";

export interface BenchmarkSample {
	sampleId: string;
	sessions: ConversationSession[];
	questions: BenchmarkQuestion[];
}

// ─── Provider Types ──────────────────────────────────────────────────────────

export interface MemoryProvider {
	name: string;
	initialize(): Promise<void>;
	ingest(userId: string, sessions: ConversationSession[]): Promise<void>;
	waitForIndexing(): Promise<void>;
	search(userId: string, query: string, limit?: number): Promise<SearchResult[]>;
	cleanup(userId: string): Promise<void>;
}

export interface SearchResult {
	content: string;
	score: number;
	metadata?: Record<string, unknown>;
}

// ─── Judge Types ─────────────────────────────────────────────────────────────

export interface Judge {
	name: string;
	evaluate(
		question: string,
		groundTruth: string,
		generatedAnswer: string,
		context: string[],
	): Promise<JudgeScore>;
}

export interface JudgeScore {
	score: number; // 0-1
	reasoning: string;
}

// ─── Pipeline Types ──────────────────────────────────────────────────────────

export type PipelineStage = "ingest" | "index" | "search" | "answer" | "evaluate" | "report";

export interface QuestionResult {
	questionId: string;
	question: string;
	category: QuestionCategory;
	groundTruth: string;
	retrievedContext: string[];
	generatedAnswer: string;
	score: number;
	reasoning: string;
	searchLatencyMs: number;
	answerLatencyMs: number;
}

export interface BenchmarkReport {
	provider: string;
	dataset: string;
	timestamp: string;
	totalQuestions: number;
	overallAccuracy: number;
	accuracyByCategory: Record<string, { accuracy: number; count: number }>;
	latency: {
		searchP50Ms: number;
		searchP95Ms: number;
		searchP99Ms: number;
		answerP50Ms: number;
		answerP95Ms: number;
	};
	ingestDurationMs: number;
	totalDurationMs: number;
	results: QuestionResult[];
}

// ─── Config ──────────────────────────────────────────────────────────────────

export interface BenchmarkConfig {
	provider: string;
	dataset: string;
	judge: string;
	answerModel: string;
	limit?: number;
	searchLimit: number;
	apiUrl: string;
	apiKey: string;
	openaiApiKey: string;
	outputDir: string;
}

// ─── Performance Benchmark Types ─────────────────────────────────────────────

export interface PerfResult {
	operation: string;
	totalOps: number;
	durationMs: number;
	opsPerSecond: number;
	latencyP50Ms: number;
	latencyP95Ms: number;
	latencyP99Ms: number;
	latencies: number[];
}

export interface PerfReport {
	provider: string;
	timestamp: string;
	results: PerfResult[];
}
