import type { Database } from "@mindos/db";
import { facts, userProfiles } from "@mindos/db";
import type { DynamicContext, StaticProfile } from "@mindos/shared";
import { and, eq, sql } from "drizzle-orm";
import { PROFILE_SUMMARY_PROMPT } from "../extraction/prompts.js";
import type { LLMProvider } from "../llm/provider.js";

interface ProfileSummaryResponse {
	summary: string;
	name?: string | null;
	preferences?: Record<string, string>;
	traits?: string[];
	currentTopics?: string[];
	activeGoals?: string[];
}

export class ProfileBuilder {
	constructor(
		private db: Database,
		private llm: LLMProvider,
	) {}

	async buildProfile(userId: string): Promise<void> {
		// Get all active facts for user
		const activeFacts = await this.db
			.select({ content: facts.content, category: facts.category })
			.from(facts)
			.where(and(eq(facts.userId, userId), eq(facts.isActive, true)))
			.limit(200);

		if (activeFacts.length === 0) return;

		const factsText = activeFacts.map((f) => `[${f.category}] ${f.content}`).join("\n");

		// Generate profile summary via LLM
		const prompt = PROFILE_SUMMARY_PROMPT.replace("{{facts}}", factsText);
		let result: ProfileSummaryResponse;
		try {
			result = await this.llm.completeJSON<ProfileSummaryResponse>(prompt);
		} catch (error) {
			console.error(`Profile build failed for user ${userId}:`, error);
			return;
		}

		const staticProfile: StaticProfile = {
			name: result.name ?? undefined,
			preferences: result.preferences ?? {},
			traits: result.traits ?? [],
			demographics: {},
		};

		const dynamicContext: DynamicContext = {
			currentTopics: result.currentTopics ?? [],
			recentEntities: [],
			activeGoals: result.activeGoals ?? [],
		};

		// Upsert profile
		const existing = await this.db
			.select({ id: userProfiles.id })
			.from(userProfiles)
			.where(eq(userProfiles.userId, userId))
			.limit(1);

		if (existing.length > 0) {
			await this.db
				.update(userProfiles)
				.set({
					staticProfile,
					dynamicContext,
					summary: result.summary,
					factCount: activeFacts.length,
					lastInteractionAt: new Date(),
					updatedAt: new Date(),
				})
				.where(eq(userProfiles.userId, userId));
		} else {
			await this.db.insert(userProfiles).values({
				userId,
				staticProfile,
				dynamicContext,
				summary: result.summary,
				factCount: activeFacts.length,
				lastInteractionAt: new Date(),
			});
		}
	}
}
