import { AuthError, MindOSError, NotFoundError, RateLimitError } from "./errors.js";
import type { ApiError, ApiResponse } from "./types.js";

export class HttpClient {
	private baseUrl: string;
	private apiKey: string;
	private timeout: number;

	constructor(baseUrl: string, apiKey: string, timeout = 30_000) {
		this.baseUrl = baseUrl.replace(/\/$/, "");
		this.apiKey = apiKey;
		this.timeout = timeout;
	}

	async get<T>(path: string, params?: Record<string, string>): Promise<ApiResponse<T>> {
		const url = new URL(`${this.baseUrl}${path}`);
		if (params) {
			for (const [key, value] of Object.entries(params)) {
				if (value !== undefined) url.searchParams.set(key, value);
			}
		}
		return this.request<T>("GET", url.toString());
	}

	async post<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
		return this.request<T>("POST", `${this.baseUrl}${path}`, body);
	}

	async put<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
		return this.request<T>("PUT", `${this.baseUrl}${path}`, body);
	}

	async delete<T>(path: string): Promise<ApiResponse<T>> {
		return this.request<T>("DELETE", `${this.baseUrl}${path}`);
	}

	private async request<T>(method: string, url: string, body?: unknown): Promise<ApiResponse<T>> {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), this.timeout);

		try {
			const response = await fetch(url, {
				method,
				headers: {
					Authorization: `Bearer ${this.apiKey}`,
					"Content-Type": "application/json",
				},
				body: body ? JSON.stringify(body) : undefined,
				signal: controller.signal,
			});

			const json = await response.json();

			if (!response.ok) {
				const err = json as ApiError;
				const message = err.error?.message ?? "Unknown error";
				const code = err.error?.code ?? "UNKNOWN";

				switch (response.status) {
					case 401:
						throw new AuthError(message);
					case 404:
						throw new NotFoundError(message);
					case 429:
						throw new RateLimitError(message);
					default:
						throw new MindOSError(code, message, response.status, err.error?.details);
				}
			}

			return json as ApiResponse<T>;
		} finally {
			clearTimeout(timeoutId);
		}
	}
}
