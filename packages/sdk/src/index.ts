import { HttpClient } from "./client.js";
import type {
	AddMemoryParams,
	CreateUserParams,
	Fact,
	Memory,
	MindOSOptions,
	SearchParams,
	SearchResponse,
	UpdateMemoryParams,
	User,
	UserProfile,
} from "./types.js";

export class MindOS {
	private client: HttpClient;
	public readonly memories: MemoriesAPI;
	public readonly users: UsersAPI;
	public readonly facts: FactsAPI;
	public readonly profiles: ProfilesAPI;

	constructor(options: MindOSOptions) {
		const baseUrl = options.baseUrl ?? "http://localhost:3000";
		this.client = new HttpClient(baseUrl, options.apiKey, options.timeout);
		this.memories = new MemoriesAPI(this.client);
		this.users = new UsersAPI(this.client);
		this.facts = new FactsAPI(this.client);
		this.profiles = new ProfilesAPI(this.client);
	}
}

class MemoriesAPI {
	constructor(private client: HttpClient) {}

	async add(params: AddMemoryParams): Promise<Memory> {
		const res = await this.client.post<Memory>("/v1/memories", params);
		return res.data;
	}

	async get(id: string): Promise<Memory> {
		const res = await this.client.get<Memory>(`/v1/memories/${id}`);
		return res.data;
	}

	async list(userId: string, options?: { page?: number; limit?: number }) {
		const params: Record<string, string> = { userId };
		if (options?.page) params.page = String(options.page);
		if (options?.limit) params.limit = String(options.limit);
		const res = await this.client.get<Memory[]>("/v1/memories", params);
		return { data: res.data, meta: res.meta };
	}

	async update(id: string, params: UpdateMemoryParams): Promise<Memory> {
		const res = await this.client.put<Memory>(`/v1/memories/${id}`, params);
		return res.data;
	}

	async delete(id: string): Promise<void> {
		await this.client.delete(`/v1/memories/${id}`);
	}

	async search(params: SearchParams): Promise<SearchResponse> {
		const res = await this.client.post<SearchResponse>("/v1/memories/search", params);
		return res.data;
	}

	async batch(memories: AddMemoryParams[]) {
		const res = await this.client.post<{
			succeeded: number;
			failed: number;
			memories: Memory[];
			errors: Array<{ index: number; error: string }>;
		}>("/v1/memories/batch", { memories });
		return res.data;
	}
}

class UsersAPI {
	constructor(private client: HttpClient) {}

	async create(params: CreateUserParams): Promise<User> {
		const res = await this.client.post<User>("/v1/users", params);
		return res.data;
	}

	async get(id: string): Promise<User> {
		const res = await this.client.get<User>(`/v1/users/${id}`);
		return res.data;
	}

	async delete(id: string): Promise<void> {
		await this.client.delete(`/v1/users/${id}`);
	}

	async stats(id: string) {
		const res = await this.client.get<{
			memoryCount: number;
			factCount: number;
			profileSummary: string | null;
		}>(`/v1/users/${id}/stats`);
		return res.data;
	}
}

class FactsAPI {
	constructor(private client: HttpClient) {}

	async list(userId: string, options?: { category?: string; page?: number; limit?: number }) {
		const params: Record<string, string> = { userId };
		if (options?.category) params.category = options.category;
		if (options?.page) params.page = String(options.page);
		if (options?.limit) params.limit = String(options.limit);
		const res = await this.client.get<Fact[]>("/v1/facts", params);
		return { data: res.data, meta: res.meta };
	}

	async get(id: string): Promise<Fact> {
		const res = await this.client.get<Fact>(`/v1/facts/${id}`);
		return res.data;
	}

	async history(id: string) {
		const res = await this.client.get<
			Array<{ id: string; content: string; isActive: boolean; createdAt: string }>
		>(`/v1/facts/${id}/history`);
		return res.data;
	}

	async delete(id: string): Promise<void> {
		await this.client.delete(`/v1/facts/${id}`);
	}
}

class ProfilesAPI {
	constructor(private client: HttpClient) {}

	async get(userId: string): Promise<UserProfile> {
		const res = await this.client.get<UserProfile>(`/v1/profiles/${userId}`);
		return res.data;
	}

	async update(userId: string, params: { staticProfile?: object; dynamicContext?: object }) {
		const res = await this.client.put<UserProfile>(`/v1/profiles/${userId}`, params);
		return res.data;
	}

	async refresh(userId: string): Promise<UserProfile> {
		const res = await this.client.post<UserProfile>(`/v1/profiles/${userId}/refresh`);
		return res.data;
	}
}

// Re-export types and errors
export * from "./types.js";
export * from "./errors.js";
