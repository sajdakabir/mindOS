import { MindOSError, ValidationError } from "@mindos/shared";
import type { Context } from "hono";
import type { ZodError } from "zod";

export function errorHandler(err: Error, c: Context) {
	// Handle Zod validation errors
	if (err.name === "ZodError" && "errors" in err) {
		const validationError = new ValidationError("Validation failed", (err as ZodError).errors);
		return c.json(
			{
				error: {
					code: validationError.code,
					message: validationError.message,
					details: validationError.details,
				},
			},
			400,
		);
	}

	// Handle our custom errors
	if (err instanceof MindOSError) {
		return c.json(
			{
				error: {
					code: err.code,
					message: err.message,
					details: err.details,
				},
			},
			err.statusCode as 400,
		);
	}

	// Unknown errors
	console.error("Unhandled error:", err);
	return c.json(
		{
			error: {
				code: "INTERNAL_ERROR",
				message: "An unexpected error occurred",
			},
		},
		500,
	);
}
