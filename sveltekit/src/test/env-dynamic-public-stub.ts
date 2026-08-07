/**
 * Test stand-in for `$env/dynamic/public`: the real virtual module reads
 * SvelteKit's runtime environment, which never boots under vitest.
 * Aliased in the `component` project in vite.config.ts.
 */
export const env: Record<string, string | undefined> = {};
