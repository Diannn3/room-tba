/**
 * Load gitignored env files in precedence order (later overrides earlier).
 * Astro/Vite also loads `.env` + `.env.local` for dev/build; scripts use this helper.
 */

import { existsSync } from 'node:fs';
import { config } from 'dotenv';

const DEFAULT_FILES = ['.env', '.env.local'] as const;

export function loadEnv(extraFiles: string[] = []): void {
	for (const path of [...DEFAULT_FILES, ...extraFiles]) {
		if (!existsSync(path)) continue;
		config({ path, override: path !== '.env', quiet: true });
	}
}
