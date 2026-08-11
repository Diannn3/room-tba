if (!self.define) {
	let e,
		s = {};
	const n = (n, t) => (
		(n = new URL(n + '.js', t).href),
		s[n] ||
			new Promise((s) => {
				if ('document' in self) {
					const e = document.createElement('script');
					(e.src = n), (e.onload = s), document.head.appendChild(e);
				} else (e = n), importScripts(n), s();
			}).then(() => {
				const e = s[n];
				if (!e) throw new Error(`Module ${n} didn’t register its module`);
				return e;
			})
	);
	self.define = (t, a) => {
		const i = e || ('document' in self ? document.currentScript.src : '') || location.href;
		if (s[i]) return;
		const o = {};
		const r = (e) => n(e, i),
			c = { module: { uri: i }, exports: o, require: r };
		s[i] = Promise.all(t.map((e) => c[e] || r(e))).then((e) => (a(...e), o));
	};
}
define(['./workbox-835c8c05'], (e) => {
	self.skipWaiting(),
		e.clientsClaim(),
		e.precacheAndRoute(
			[{ url: 'manifest.webmanifest', revision: '94c5fd6e04cfcef881894f4287dfaf0c' }],
			{}
		),
		e.cleanupOutdatedCaches(),
		e.registerRoute(
			new e.NavigationRoute(e.createHandlerBoundToURL('/'), {
				denylist: [
					/^\/api\//,
					/^\/privacy(\/|\?|$)/,
					/^\/terms(\/|\?|$)/,
					/^\/faq(\/|\?|$)/,
					/^\/changelog(\/|\?|$)/,
					/^\/sponsors(\/|\?|$)/,
					/^\/donate(\/|\?|$)/,
					/^\/wiki(\/|\?|$)/,
					/^\/route(\/|\?|$)/,
					/^\/planner(\/|\?|$)/,
					/^\/final-exams(\/|\?|$)/,
					/^\/calendar(\/|\?|$)/,
					/^\/today(\/|\?|$)/,
					/^\/messenger(\/|\?|$)/,
					/^\/maintain(\/|\?|$)/,
					/^\/discord(\/|\?|$)/
				]
			})
		),
		e.registerRoute(
			/\/desktop-only.*\.css$/,
			new e.CacheFirst({
				cacheName: 'desktop-only-css',
				plugins: [
					new e.ExpirationPlugin({ maxEntries: 2, maxAgeSeconds: 2592e3 }),
					new e.CacheableResponsePlugin({ statuses: [0, 200] })
				]
			}),
			'GET'
		),
		e.registerRoute(
			/\/_astro\/(pglite|initdb)\.[^/?]*\.(wasm|data)(\?|$)/,
			new e.CacheFirst({
				cacheName: 'pglite-wasm',
				plugins: [
					new e.ExpirationPlugin({ maxEntries: 8, maxAgeSeconds: 31536e3, purgeOnQuotaError: !0 }),
					new e.CacheableResponsePlugin({ statuses: [0, 200] })
				]
			}),
			'GET'
		),
		e.registerRoute(
			/^https:\/\/api\.maptiler\.com\/.*/i,
			new e.CacheFirst({
				cacheName: 'map-tiles',
				plugins: [
					new e.ExpirationPlugin({ maxEntries: 4e3, maxAgeSeconds: 2592e3, purgeOnQuotaError: !0 }),
					new e.CacheableResponsePlugin({ statuses: [0, 200] })
				]
			}),
			'GET'
		),
		e.registerRoute(
			/^https:\/\/(maputnik|orangemug|klokantech)\.github\.io\/.*/i,
			new e.CacheFirst({
				cacheName: 'map-assets',
				plugins: [
					new e.ExpirationPlugin({ maxEntries: 800, maxAgeSeconds: 2592e3, purgeOnQuotaError: !0 }),
					new e.CacheableResponsePlugin({ statuses: [0, 200] })
				]
			}),
			'GET'
		);
});
