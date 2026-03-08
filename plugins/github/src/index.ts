import type { MindOSPlugin, PluginConfig } from "@mindos/core";
import type { SyncResult } from "@mindos/shared";

export class GitHubPlugin implements MindOSPlugin {
	readonly id = "github";
	readonly name = "GitHub";
	readonly version = "0.1.0";
	readonly description = "Sync issues, PRs, and README content from GitHub repositories";

	private token: string | null = null;

	async initialize(config: PluginConfig): Promise<void> {
		this.token = config.token as string;
	}

	async destroy(): Promise<void> {
		this.token = null;
	}

	async sync(config: PluginConfig, cursor?: string): Promise<SyncResult> {
		const owner = config.owner as string;
		const repo = config.repo as string;
		const token = (config.token as string) || this.token;

		if (!owner || !repo) {
			return { items: [], hasMore: false };
		}

		const headers: Record<string, string> = {
			Accept: "application/vnd.github.v3+json",
			"User-Agent": "mindOS-plugin",
		};
		if (token) headers.Authorization = `Bearer ${token}`;

		// Fetch recent issues
		const page = cursor ? Number.parseInt(cursor, 10) : 1;
		const url = `https://api.github.com/repos/${owner}/${repo}/issues?state=all&per_page=30&page=${page}&sort=updated&direction=desc`;

		const response = await fetch(url, { headers });
		if (!response.ok) {
			throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
		}

		const issues = (await response.json()) as Array<{
			id: number;
			number: number;
			title: string;
			body: string | null;
			state: string;
			labels: Array<{ name: string }>;
			user: { login: string };
			updated_at: string;
			pull_request?: unknown;
		}>;

		const items = issues.map((issue) => ({
			externalId: `github:${owner}/${repo}#${issue.number}`,
			content:
				`[${issue.pull_request ? "PR" : "Issue"} #${issue.number}] ${issue.title}\n\n${issue.body ?? ""}`.trim(),
			title: `${issue.pull_request ? "PR" : "Issue"} #${issue.number}: ${issue.title}`,
			metadata: {
				source: "github",
				repo: `${owner}/${repo}`,
				number: issue.number,
				state: issue.state,
				type: issue.pull_request ? "pull_request" : "issue",
				author: issue.user.login,
				labels: issue.labels.map((l) => l.name),
			},
			updatedAt: new Date(issue.updated_at),
		}));

		return {
			items,
			nextCursor: issues.length === 30 ? String(page + 1) : undefined,
			hasMore: issues.length === 30,
		};
	}
}

export default new GitHubPlugin();
