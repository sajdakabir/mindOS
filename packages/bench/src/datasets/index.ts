export { loadLoCoMo, getDatasetStats } from "./locomo.js";

import type { BenchmarkSample } from "../types.js";
import { loadLoCoMo } from "./locomo.js";

export async function loadDataset(name: string, limit?: number): Promise<BenchmarkSample[]> {
	switch (name) {
		case "locomo":
			return loadLoCoMo(limit);
		default:
			throw new Error(`Unknown dataset: ${name}. Available: locomo`);
	}
}
