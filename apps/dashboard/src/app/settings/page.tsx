"use client";

import { useState } from "react";

export default function SettingsPage() {
	const [name, setName] = useState("my-app");
	const [result, setResult] = useState<{ key: string; id: string } | null>(null);
	const [error, setError] = useState<string | null>(null);

	const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

	async function createKey() {
		setError(null);
		setResult(null);
		try {
			const res = await fetch(`${apiUrl}/v1/api-keys`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name }),
			});
			const json = await res.json();
			if (!res.ok) throw new Error(json.error?.message ?? "Failed");
			setResult(json.data);
		} catch (e) {
			setError(e instanceof Error ? e.message : "Failed");
		}
	}

	return (
		<div>
			<h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 24 }}>Settings</h1>

			<div className="card" style={{ maxWidth: 600 }}>
				<h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Create API Key</h2>

				<div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
					<input placeholder="Key name" value={name} onChange={(e) => setName(e.target.value)} />
					<button type="button" className="btn-primary" onClick={createKey}>
						Create
					</button>
				</div>

				{error && <p style={{ color: "var(--danger)", fontSize: 14 }}>{error}</p>}

				{result && (
					<div
						style={{
							background: "var(--bg)",
							padding: 16,
							borderRadius: 8,
							border: "1px solid var(--success)",
						}}
					>
						<p style={{ fontSize: 14, color: "var(--success)", marginBottom: 8 }}>
							API Key created! Save it now — you won&apos;t see it again.
						</p>
						<code
							style={{
								display: "block",
								fontSize: 13,
								wordBreak: "break-all",
								userSelect: "all",
							}}
						>
							{result.key}
						</code>
					</div>
				)}
			</div>

			<div className="card" style={{ maxWidth: 600, marginTop: 24 }}>
				<h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>MCP Server</h2>
				<p style={{ color: "var(--text-secondary)", fontSize: 14, marginBottom: 12 }}>
					Add mindOS to Claude Desktop or Cursor:
				</p>
				<code
					style={{
						display: "block",
						background: "var(--bg)",
						padding: 12,
						borderRadius: 8,
						fontSize: 12,
						whiteSpace: "pre",
						overflowX: "auto",
					}}
				>
					{JSON.stringify(
						{
							mcpServers: {
								mindos: {
									command: "npx",
									args: ["@mindos/mcp"],
									env: {
										MINDOS_API_KEY: "your-api-key",
										MINDOS_URL: "http://localhost:3000",
									},
								},
							},
						},
						null,
						2,
					)}
				</code>
			</div>
		</div>
	);
}
