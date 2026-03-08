const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

export async function apiFetch<T>(
	path: string,
	options?: { method?: string; body?: unknown; apiKey?: string },
): Promise<T> {
	const headers: Record<string, string> = {
		"Content-Type": "application/json",
	};
	if (options?.apiKey) {
		headers.Authorization = `Bearer ${options.apiKey}`;
	}

	const res = await fetch(`${API_URL}${path}`, {
		method: options?.method ?? "GET",
		headers,
		body: options?.body ? JSON.stringify(options.body) : undefined,
		cache: "no-store",
	});

	if (!res.ok) {
		const error = await res.json().catch(() => ({ error: { message: "Request failed" } }));
		throw new Error(error.error?.message ?? `API error: ${res.status}`);
	}

	return res.json();
}
