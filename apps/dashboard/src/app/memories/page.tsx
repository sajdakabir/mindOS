"use client";

import { useState } from "react";

interface Memory {
	id: string;
	content: string;
	type: string;
	tags: string[];
	createdAt: string;
	facts?: Array<{ id: string; content: string; category: string; confidence: number }>;
}

interface SearchResult {
	id: string;
	content: string;
	score: number;
	type: string;
	tags: string[];
	facts: Array<{ id: string; content: string; category: string; confidence: number }>;
	createdAt: string;
}

export default function MemoriesPage() {
	const [apiKey, setApiKey] = useState("");
	const [userId, setUserId] = useState("");
	const [query, setQuery] = useState("");
	const [results, setResults] = useState<SearchResult[]>([]);
	const [memories, setMemories] = useState<Memory[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [mode, setMode] = useState<"list" | "search">("list");

	const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

	const headers = {
		"Content-Type": "application/json",
		Authorization: `Bearer ${apiKey}`,
	};

	async function loadMemories() {
		if (!apiKey || !userId) return;
		setLoading(true);
		setError(null);
		try {
			const res = await fetch(`${apiUrl}/v1/memories?userId=${userId}&limit=50`, { headers });
			const json = await res.json();
			if (!res.ok) throw new Error(json.error?.message ?? "Failed");
			setMemories(json.data);
			setMode("list");
		} catch (e) {
			setError(e instanceof Error ? e.message : "Failed to load");
		} finally {
			setLoading(false);
		}
	}

	async function searchMemories() {
		if (!apiKey || !userId || !query) return;
		setLoading(true);
		setError(null);
		try {
			const res = await fetch(`${apiUrl}/v1/memories/search`, {
				method: "POST",
				headers,
				body: JSON.stringify({ query, userId, limit: 20 }),
			});
			const json = await res.json();
			if (!res.ok) throw new Error(json.error?.message ?? "Failed");
			setResults(json.data.results);
			setMode("search");
		} catch (e) {
			setError(e instanceof Error ? e.message : "Search failed");
		} finally {
			setLoading(false);
		}
	}

	return (
		<div>
			<h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 24 }}>Memories</h1>

			<div className="card" style={{ marginBottom: 24 }}>
				<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
					<input
						placeholder="API Key (sk_mindos_...)"
						type="password"
						value={apiKey}
						onChange={(e) => setApiKey(e.target.value)}
					/>
					<input placeholder="User ID" value={userId} onChange={(e) => setUserId(e.target.value)} />
				</div>
				<div className="search-box">
					<input
						placeholder="Search memories..."
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						onKeyDown={(e) => e.key === "Enter" && searchMemories()}
					/>
					<button className="btn-primary" onClick={searchMemories} disabled={loading}>
						Search
					</button>
					<button onClick={loadMemories} disabled={loading}>
						List All
					</button>
				</div>
			</div>

			{error && (
				<div className="card" style={{ borderColor: "var(--danger)", marginBottom: 16 }}>
					<span style={{ color: "var(--danger)" }}>{error}</span>
				</div>
			)}

			{loading && <p style={{ color: "var(--text-secondary)" }}>Loading...</p>}

			{mode === "search" && results.length > 0 && (
				<div className="memory-list">
					<p style={{ color: "var(--text-secondary)", fontSize: 14, marginBottom: 8 }}>
						{results.length} results
					</p>
					{results.map((r) => (
						<div key={r.id} className="memory-item">
							<div className="content">{r.content}</div>
							<div className="meta">
								<span className="badge">{r.type}</span>
								<span>Score: {r.score.toFixed(3)}</span>
								{r.tags.map((t) => (
									<span key={t} className="badge">
										{t}
									</span>
								))}
								<span>{new Date(r.createdAt).toLocaleDateString()}</span>
							</div>
							{r.facts.length > 0 && (
								<div className="facts-list">
									{r.facts.map((f) => (
										<div key={f.id}>
											<span className={`badge ${f.category}`}>{f.category}</span> {f.content}
										</div>
									))}
								</div>
							)}
						</div>
					))}
				</div>
			)}

			{mode === "list" && memories.length > 0 && (
				<div className="memory-list">
					<p style={{ color: "var(--text-secondary)", fontSize: 14, marginBottom: 8 }}>
						{memories.length} memories
					</p>
					{memories.map((m) => (
						<div key={m.id} className="memory-item">
							<div className="content">{m.content}</div>
							<div className="meta">
								<span className="badge">{m.type}</span>
								{m.tags?.map((t) => (
									<span key={t} className="badge">
										{t}
									</span>
								))}
								<span>{new Date(m.createdAt).toLocaleDateString()}</span>
							</div>
						</div>
					))}
				</div>
			)}

			{!loading && mode === "list" && memories.length === 0 && apiKey && userId && (
				<div className="empty-state">No memories found. Add some via the API!</div>
			)}
		</div>
	);
}
