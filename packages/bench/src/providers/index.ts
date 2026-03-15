import type { MemoryProvider } from "../types.js";
import { MindOSProvider } from "./mindos.js";

export { MindOSProvider } from "./mindos.js";

export function createProvider(name: string, apiUrl: string, apiKey: string): MemoryProvider {
	switch (name) {
		case "mindos":
			return new MindOSProvider(apiUrl, apiKey);
		default:
			throw new Error(`Unknown provider: ${name}. Available: mindos`);
	}
}
