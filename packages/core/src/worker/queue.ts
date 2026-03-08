import type { Database } from "@mindos/db";
import { EXPIRY_CHECK_INTERVAL_MS } from "@mindos/shared";
import { Queue, Worker } from "bullmq";
import type { EmbeddingProvider } from "../embeddings/provider.js";
import type { LLMProvider } from "../llm/provider.js";
import { JobProcessor, type WorkerJob } from "./processor.js";

const QUEUE_NAME = "mindos-jobs";

export function createJobQueue(redisUrl: string) {
	const connection = parseRedisUrl(redisUrl);
	return new Queue<WorkerJob>(QUEUE_NAME, { connection });
}

export function createWorker(
	redisUrl: string,
	db: Database,
	llm: LLMProvider,
	embeddingProvider: EmbeddingProvider,
) {
	const connection = parseRedisUrl(redisUrl);
	const processor = new JobProcessor(db, llm, embeddingProvider);

	const worker = new Worker<WorkerJob>(
		QUEUE_NAME,
		async (job) => {
			await processor.process(job.data);
		},
		{
			connection,
			concurrency: 3,
			limiter: {
				max: 10,
				duration: 1000,
			},
		},
	);

	worker.on("completed", (job) => {
		console.log(`Job ${job.id} (${job.data.type}) completed`);
	});

	worker.on("failed", (job, error) => {
		console.error(`Job ${job?.id} (${job?.data.type}) failed:`, error.message);
	});

	return worker;
}

export async function enqueueFactExtraction(
	queue: Queue<WorkerJob>,
	memoryId: string,
	userId: string,
	content: string,
) {
	await queue.add("fact-extraction", {
		type: "fact-extraction",
		memoryId,
		userId,
		content,
	});
}

export async function scheduleExpiryCleanup(queue: Queue<WorkerJob>) {
	// Add a repeatable job for expiry cleanup
	await queue.add(
		"expiry-cleanup",
		{ type: "expiry-cleanup" },
		{
			repeat: { every: EXPIRY_CHECK_INTERVAL_MS },
			removeOnComplete: true,
			removeOnFail: 5,
		},
	);
}

function parseRedisUrl(url: string): { host: string; port: number } {
	try {
		const parsed = new URL(url);
		return {
			host: parsed.hostname || "localhost",
			port: Number.parseInt(parsed.port || "6379", 10),
		};
	} catch {
		return { host: "localhost", port: 6379 };
	}
}
