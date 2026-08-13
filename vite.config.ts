import adapter from '@sveltejs/adapter-auto';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			// adapter-auto only supports some environments, see https://svelte.dev/docs/kit/adapter-auto for a list.
			// If your environment is not supported, or you settled on a specific environment, switch out the adapter.
			// See https://svelte.dev/docs/kit/adapters for more information about adapters.
			adapter: adapter(),

			alias: {
				'@test': 'src/test'
			},

			typescript: {
				config: (config) => {
					config.include.push('../drizzle.config.ts');
				}
			}
		}),
	],
	// @vercel/og loads resvg/yoga WASM through its own resolver. Letting Vite
	// pre-bundle or SSR-transform it breaks that and the /og.png request dies
	// without reaching an error handler, so it stays external on both sides.
	optimizeDeps: {
		exclude: ['@vercel/og']
	},
	ssr: {
		external: ['@vercel/og']
	},
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'client',
					browser: {
						enabled: true,
						provider: playwright(),
						instances: [{ browser: 'chromium', headless: true }]
					},
					include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					exclude: ['src/lib/server/**']
				}
			},

			{
				extends: './vite.config.ts',
				// Without the browser condition Svelte resolves its server build and
				// @testing-library/svelte cannot mount components under happy-dom.
				// $env/dynamic/public needs the kit runtime, absent under vitest.
				resolve: {
					conditions: ['browser'],
					alias: {
						'$env/dynamic/public': new URL('./src/test/env-dynamic-public-stub.ts', import.meta.url)
							.pathname
					}
				},
				test: {
					name: 'component',
					environment: 'happy-dom',
					include: ['src/**/*.{component,store}.test.ts'],
					setupFiles: ['src/test/setup-components.ts']
				}
			},

			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}', 'src/**/*.{component,store}.test.ts']
				}
			}
		]
	}
});
