import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import adapter from '@sveltejs/adapter-auto';
import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from "@vite-pwa/sveltekit"

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
		SvelteKitPWA({
      registerType: "autoUpdate",
      workbox: {
        // AppRoot includes map + editor + PGlite; auth/proposals pushed it past 2 MiB.
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        // The Vercel adapter otherwise points globDirectory at dist/server,
        // so nothing client-side gets precached and the app can't load
        // offline. Glob the actual client output instead.
        globDirectory: "dist/client",
        // Precache app assets plus the home shell (only the root index.html,
        // not the ~650 entity SEO pages) so the app loads offline. The
        // navigate fallback serves that shell for offline navigations.
        globPatterns: [
          "**/*.{js,css,ico,png,svg,webmanifest,json,jpg}",
          "index.html",
          "privacy/index.html",
          "terms/index.html",
          "faq/index.html",
          "changelog/index.html",
          "sponsors/index.html",
          "donate/index.html",
        ],
        // #716: desktop-only.css is never fetched by mobile viewports at
        // runtime — don't undo that by precaching it into every install
        // (including mobile) regardless of device. Cache it on-demand
        // instead, via the runtimeCaching rule below.
        globIgnores: ["**/desktop-only*"],
        navigateFallback: "/",
        navigateFallbackDenylist: [
          /^\/api\//,
          /^\/privacy(\/|\?|$)/,
          /^\/terms(\/|\?|$)/,
          /^\/faq(\/|\?|$)/,
          /^\/changelog(\/|\?|$)/,
          /^\/sponsors(\/|\?|$)/,
          /^\/donate(\/|\?|$)/,
          /^\/wiki(\/|\?|$)/,
          // Server-rendered per pair; the offline app shell would replace the
          // directions with an empty map.
          /^\/route(\/|\?|$)/,
          // /planner is its own page; without this the nav fallback serves the
          // map shell and the planner never opens for returning (SW-cached)
          // users. The `\?` matters: workbox matches denylist against
          // pathname+search, so /planner?term=… must be covered too (#planner).
          // Network-first; the in-app planner button covers offline.
          /^\/planner(\/|\?|$)/,
          /^\/final-exams(\/|\?|$)/,
          /^\/calendar(\/|\?|$)/,
          /^\/today(\/|\?|$)/,
          // Server redirects — must hit network, not offline app shell (#471).
          /^\/messenger(\/|\?|$)/,
          /^\/maintain(\/|\?|$)/,
          /^\/discord(\/|\?|$)/,
        ],
        swDest: "dist/client/sw.js",
        // Cache third-party map resources at runtime so the campus map works
        // offline once visited (or after an explicit "download offline maps").
        runtimeCaching: [
          {
            // #716: desktop-only.css, excluded from precache above so mobile
            // installs never fetch it — cached the first time a desktop
            // viewport actually requests it, so repeat offline visits still work.
            urlPattern: /\/desktop-only.*\.css$/,
            handler: "CacheFirst",
            options: {
              cacheName: "desktop-only-css",
              expiration: { maxEntries: 2, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // #866: PGlite ships ~5 MB of wasm + data. Too big to precache
            // (that would download Postgres during service worker install),
            // but content-hashed, so CacheFirst is safe — a new build emits a
            // new filename and never hits this entry. As with the navigate
            // denylist above, the pattern must tolerate a `?` suffix: workbox
            // matches the full URL, so a `$` anchor alone would miss.
            urlPattern: /\/_astro\/(pglite|initdb)\.[^/?]*\.(wasm|data)(\?|$)/,
            handler: "CacheFirst",
            options: {
              cacheName: "pglite-wasm",
              expiration: {
                maxEntries: 8,
                maxAgeSeconds: 60 * 60 * 24 * 365,
                purgeOnQuotaError: true,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // MapTiler vector tiles + tiles.json
            urlPattern: /^https:\/\/api\.maptiler\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "map-tiles",
              expiration: {
                maxEntries: 4000,
                maxAgeSeconds: 60 * 60 * 24 * 30,
                purgeOnQuotaError: true,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Sprites, glyphs, and shaded-relief rasters used by the map style
            urlPattern:
              /^https:\/\/(maputnik|orangemug|klokantech)\.github\.io\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "map-assets",
              expiration: {
                maxEntries: 800,
                maxAgeSeconds: 60 * 60 * 24 * 30,
                purgeOnQuotaError: true,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      includeAssets: ["favicon.ico", "apple-touch-icon.png"],
      manifest: {
        name: "Room TBA",
        description:
          "An open-source website built to help UPLB students find their rooms across the Los Baños campus",
        theme_color: "#a30e00",
        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
        display_override: ["standalone"],
      },
    })
	],
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
						'$env/dynamic/public': new URL(
							'./src/test/env-dynamic-public-stub.ts',
							import.meta.url
						).pathname
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
					exclude: [
						'src/**/*.svelte.{test,spec}.{js,ts}',
						'src/**/*.{component,store}.test.ts'
					]
				}
			}
		]
	}
});
