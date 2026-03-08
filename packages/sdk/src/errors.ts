export class MindOSError extends Error {
	constructor(
		public readonly code: string,
		message: string,
		public readonly status: number,
		public readonly details?: unknown,
	) {
		super(message);
		this.name = "MindOSError";
	}
}

export class NotFoundError extends MindOSError {
	constructor(message: string) {
		super("NOT_FOUND", message, 404);
	}
}

export class AuthError extends MindOSError {
	constructor(message = "Invalid or missing API key") {
		super("AUTH_ERROR", message, 401);
	}
}

export class RateLimitError extends MindOSError {
	constructor(message = "Rate limit exceeded") {
		super("RATE_LIMIT", message, 429);
	}
}
