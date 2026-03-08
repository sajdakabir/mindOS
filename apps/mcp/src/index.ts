#!/usr/bin/env node

import { MindOS } from "@mindos/sdk";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// ─── Configuration ──────────────────────────────────────────────────────────

const API_KEY = process.env.MINDOS_API_KEY ?? "";
const BASE_URL = process.env.MINDOS_URL ?? "http://localhost:3000";

if (!API_KEY) {
	console.error("MINDOS_API_KEY environment variable is required");
	process.exit(1);
}

const client = new MindOS({ apiKey: API_KEY, baseUrl: BASE_URL });

// ─── MCP Server ─────────────────────────────────────────────────────────────

const server = new McpServer({
	name: "mindos",
	version: "0.1.0",
});

// ─── Tools ──────────────────────────────────────────────────────────────────

server.tool(
	"add_memory",
	"Store a new memory for a user",
	{
		content: z.string().describe("The content to remember"),
		userId: z.string().describe("The user ID"),
		tags: z.array(z.string()).optional().describe("Tags to categorize the memory"),
		type: z.enum(["conversation", "document", "note"]).optional().describe("Memory type"),
	},
	async ({ content, userId, tags, type }) => {
		const memory = await client.memories.add({ content, userId, tags, type });
		return {
			content: [
				{
					type: "text" as const,
					text: `Memory stored (id: ${memory.id}). Facts will be extracted automatically.`,
				},
			],
		};
	},
);

server.tool(
	"search_memories",
	"Search a user's memories by semantic query",
	{
		query: z.string().describe("What to search for"),
		userId: z.string().describe("The user ID"),
		limit: z.number().optional().default(5).describe("Max results"),
	},
	async ({ query, userId, limit }) => {
		const results = await client.memories.search({ query, userId, limit });
		if (results.results.length === 0) {
			return { content: [{ type: "text" as const, text: "No memories found." }] };
		}

		const text = results.results
			.map(
				(r, i) =>
					`${i + 1}. [score: ${r.score.toFixed(2)}] ${r.content}${
						r.facts.length > 0 ? `\n   Facts: ${r.facts.map((f) => f.content).join("; ")}` : ""
					}`,
			)
			.join("\n\n");

		return {
			content: [
				{
					type: "text" as const,
					text: `Found ${results.total} memories (${results.latencyMs}ms):\n\n${text}`,
				},
			],
		};
	},
);

server.tool(
	"get_profile",
	"Get a user's profile (preferences, traits, context)",
	{
		userId: z.string().describe("The user ID"),
	},
	async ({ userId }) => {
		try {
			const profile = await client.profiles.get(userId);
			const parts: string[] = [];

			if (profile.summary) parts.push(`Summary: ${profile.summary}`);
			if (profile.staticProfile.name) parts.push(`Name: ${profile.staticProfile.name}`);
			if (Object.keys(profile.staticProfile.preferences).length > 0) {
				parts.push(
					`Preferences: ${Object.entries(profile.staticProfile.preferences)
						.map(([k, v]) => `${k}: ${v}`)
						.join(", ")}`,
				);
			}
			if (profile.staticProfile.traits.length > 0) {
				parts.push(`Traits: ${profile.staticProfile.traits.join(", ")}`);
			}
			if (profile.dynamicContext.currentTopics.length > 0) {
				parts.push(`Current topics: ${profile.dynamicContext.currentTopics.join(", ")}`);
			}
			if (profile.dynamicContext.activeGoals.length > 0) {
				parts.push(`Active goals: ${profile.dynamicContext.activeGoals.join(", ")}`);
			}

			return {
				content: [
					{
						type: "text" as const,
						text: parts.length > 0 ? parts.join("\n") : "No profile data yet.",
					},
				],
			};
		} catch {
			return {
				content: [{ type: "text" as const, text: "No profile found for this user." }],
			};
		}
	},
);

server.tool(
	"list_facts",
	"List extracted facts for a user",
	{
		userId: z.string().describe("The user ID"),
		category: z
			.enum(["preference", "biographical", "contextual", "temporal"])
			.optional()
			.describe("Filter by category"),
	},
	async ({ userId, category }) => {
		const result = await client.facts.list(userId, { category, limit: 50 });
		if (result.data.length === 0) {
			return { content: [{ type: "text" as const, text: "No facts found." }] };
		}

		const text = result.data
			.map((f) => `- [${f.category}] ${f.content} (confidence: ${f.confidence})`)
			.join("\n");

		return {
			content: [
				{
					type: "text" as const,
					text: `${result.meta?.total ?? result.data.length} facts:\n${text}`,
				},
			],
		};
	},
);

server.tool(
	"forget_memory",
	"Delete a specific memory",
	{
		memoryId: z.string().describe("The memory ID to delete"),
	},
	async ({ memoryId }) => {
		await client.memories.delete(memoryId);
		return {
			content: [{ type: "text" as const, text: `Memory ${memoryId} deleted.` }],
		};
	},
);

// ─── Start Server ───────────────────────────────────────────────────────────

async function main() {
	const transport = new StdioServerTransport();
	await server.connect(transport);
	console.error("mindOS MCP server started (stdio)");
}

main().catch((error) => {
	console.error("MCP server failed:", error);
	process.exit(1);
});
