export class MindOSError extends Error {
	constructor(
		public readonly code: string,
		message: string,
		public readonly statusCode: number = 500,
		public readonly details?: unknown,
	) {
		super(message);
		this.name = "MindOSError";
	}
}

export class NotFoundError extends MindOSError {
	constructor(resource: string, id: string) {
		super("NOT_FOUND", `${resource} with id '${id}' not found`, 404);
	}
}

export class ValidationError extends MindOSError {
	constructor(message: string, details?: unknown) {
		super("VALIDATION_ERROR", message, 400, details);
	}
}

export class AuthenticationError extends MindOSError {
	constructor(message = "Invalid or missing API key") {
		super("AUTHENTICATION_ERROR", message, 401);
	}
}

export class RateLimitError extends MindOSError {
	constructor(retryAfter?: number) {
		super("RATE_LIMIT_EXCEEDED", "Rate limit exceeded", 429, { retryAfter });
	}
}

export class ConflictError extends MindOSError {
	constructor(message: string) {
		super("CONFLICT", message, 409);
	}
}

export class ExternalServiceError extends MindOSError {
	constructor(service: string, message: string) {
		super("EXTERNAL_SERVICE_ERROR", `${service}: ${message}`, 502);
	}
}
