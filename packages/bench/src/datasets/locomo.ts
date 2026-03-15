import type {
	BenchmarkQuestion,
	BenchmarkSample,
	ConversationSession,
	QuestionCategory,
} from "../types.js";

const LOCOMO_URL = "https://raw.githubusercontent.com/snap-research/LoCoMo/main/data/locomo10.json";

interface RawLoCoMoSample {
	sample_id: string;
	conversation: Array<{
		session_id: number;
		dialogue: Array<{
			dialog_id: string;
			speaker: string;
			text: string;
			timestamp?: string;
		}>;
	}>;
	qa: Array<{
		question: string;
		answer: string;
		category: string;
		evidence?: string[];
	}>;
}

function mapCategory(raw: string): QuestionCategory {
	const lower = raw.toLowerCase().replace(/[_\s-]+/g, "-");
	if (lower.includes("single")) return "single-hop";
	if (lower.includes("multi")) return "multi-hop";
	if (lower.includes("temporal")) return "temporal";
	if (lower.includes("adversarial")) return "adversarial";
	return "knowledge";
}

export async function loadLoCoMo(limit?: number): Promise<BenchmarkSample[]> {
	console.log("Downloading LoCoMo dataset...");

	const response = await fetch(LOCOMO_URL);
	if (!response.ok) {
		throw new Error(`Failed to download LoCoMo: ${response.status} ${response.statusText}`);
	}

	const raw = (await response.json()) as RawLoCoMoSample[];
	console.log(`Loaded ${raw.length} conversations from LoCoMo`);

	const samples: BenchmarkSample[] = raw.map((sample) => {
		const sessions: ConversationSession[] = sample.conversation.map((sess) => ({
			sessionId: sess.session_id,
			turns: sess.dialogue.map((d) => ({
				speaker: d.speaker,
				text: d.text,
				timestamp: d.timestamp,
				dialogId: d.dialog_id,
			})),
		}));

		const questions: BenchmarkQuestion[] = sample.qa.map((qa, i) => ({
			id: `${sample.sample_id}_q${i}`,
			question: qa.question,
			answer: qa.answer,
			category: mapCategory(qa.category),
			evidence: qa.evidence,
		}));

		return {
			sampleId: sample.sample_id,
			sessions,
			questions,
		};
	});

	if (limit) {
		// Limit total questions across all samples
		let count = 0;
		const limited: BenchmarkSample[] = [];
		for (const sample of samples) {
			if (count >= limit) break;
			const remaining = limit - count;
			const qs = sample.questions.slice(0, remaining);
			limited.push({ ...sample, questions: qs });
			count += qs.length;
		}
		return limited;
	}

	return samples;
}

export function getDatasetStats(samples: BenchmarkSample[]) {
	const totalQuestions = samples.reduce((sum, s) => sum + s.questions.length, 0);
	const totalSessions = samples.reduce((sum, s) => sum + s.sessions.length, 0);
	const totalTurns = samples.reduce(
		(sum, s) => sum + s.sessions.reduce((ss, sess) => ss + sess.turns.length, 0),
		0,
	);

	const byCategory: Record<string, number> = {};
	for (const sample of samples) {
		for (const q of sample.questions) {
			byCategory[q.category] = (byCategory[q.category] ?? 0) + 1;
		}
	}

	return {
		totalConversations: samples.length,
		totalSessions,
		totalTurns,
		totalQuestions,
		byCategory,
	};
}
