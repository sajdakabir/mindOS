import type { SyncItem, SyncResult } from "@mindos/shared";

export interface PluginConfig {
	[key: string]: unknown;
}

export interface OAuthTokens {
	accessToken: string;
	refreshToken?: string;
	expiresAt?: Date;
}

export interface MindOSPlugin {
	readonly id: string;
	readonly name: string;
	readonly version: string;
	readonly description?: string;

	initialize(config: PluginConfig): Promise<void>;
	destroy(): Promise<void>;

	getAuthUrl?(redirectUri: string): string;
	handleAuthCallback?(code: string): Promise<OAuthTokens>;

	sync(config: PluginConfig, cursor?: string): Promise<SyncResult>;
}
