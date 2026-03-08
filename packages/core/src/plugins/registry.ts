import type { PluginInfo } from "@mindos/shared";
import type { MindOSPlugin } from "./interface.js";

export class PluginRegistry {
	private plugins = new Map<string, MindOSPlugin>();

	register(plugin: MindOSPlugin): void {
		if (this.plugins.has(plugin.id)) {
			throw new Error(`Plugin "${plugin.id}" is already registered`);
		}
		this.plugins.set(plugin.id, plugin);
		console.log(`Plugin registered: ${plugin.name} v${plugin.version}`);
	}

	get(id: string): MindOSPlugin | undefined {
		return this.plugins.get(id);
	}

	list(): PluginInfo[] {
		return [...this.plugins.values()].map((p) => ({
			id: p.id,
			name: p.name,
			version: p.version,
			description: p.description,
		}));
	}

	has(id: string): boolean {
		return this.plugins.has(id);
	}
}
