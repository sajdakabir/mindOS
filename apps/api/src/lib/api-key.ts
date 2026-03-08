import { randomBytes } from "node:crypto";
import { API_KEY_LENGTH, API_KEY_PREFIX } from "@mindos/shared";

export function generateApiKey(): string {
	const random = randomBytes(API_KEY_LENGTH).toString("base64url").slice(0, API_KEY_LENGTH);
	return `${API_KEY_PREFIX}${random}`;
}
