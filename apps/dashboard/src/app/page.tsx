"use client";

import { useEffect, useState } from "react";

export default function DashboardPage() {
	const [health, setHealth] = useState<{ status: string } | null>(null);
	const [apiUrl] = useState(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000");

	useEffect(() => {
		fetch(`${apiUrl}/healthz`)
			.then((r) => r.json())
			.then(setHealth)
			.catch(() => setHealth({ status: "unreachable" }));
	}, [apiUrl]);

	return (
		<div>
			<h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Dashboard</h1>
			<p style={{ color: "var(--text-secondary)", marginBottom: 32 }}>
				Monitor and manage your mindOS instance
			</p>

			<div className="stat-grid">
				<div className="card stat-card">
					<div
						className="value"
						style={{
							color: health?.status === "ok" ? "var(--success)" : "var(--danger)",
						}}
					>
						{health?.status === "ok" ? "Online" : (health?.status ?? "...")}
					</div>
					<div className="label">API Status</div>
				</div>
				<div className="card stat-card">
					<div className="value">{apiUrl.replace("http://", "").replace("https://", "")}</div>
					<div className="label">API Endpoint</div>
				</div>
			</div>

			<div style={{ marginTop: 32 }}>
				<h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>Quick Start</h2>
				<div className="card">
					<p style={{ marginBottom: 12, color: "var(--text-secondary)", fontSize: 14 }}>
						1. Create an API key:
					</p>
					<code
						style={{
							display: "block",
							background: "var(--bg)",
							padding: 12,
							borderRadius: 8,
							fontSize: 13,
							marginBottom: 16,
							overflowX: "auto",
						}}
					>
						curl -X POST {apiUrl}/v1/api-keys -H &quot;Content-Type: application/json&quot; -d
						&apos;{`{"name":"my-app"}`}&apos;
					</code>

					<p style={{ marginBottom: 12, color: "var(--text-secondary)", fontSize: 14 }}>
						2. Store a memory:
					</p>
					<code
						style={{
							display: "block",
							background: "var(--bg)",
							padding: 12,
							borderRadius: 8,
							fontSize: 13,
							overflowX: "auto",
						}}
					>
						curl -X POST {apiUrl}/v1/memories -H &quot;Authorization: Bearer YOUR_KEY&quot; -H
						&quot;Content-Type: application/json&quot; -d &apos;
						{`{"userId":"user_1","content":"I prefer dark mode"}`}&apos;
					</code>
				</div>
			</div>
		</div>
	);
}
