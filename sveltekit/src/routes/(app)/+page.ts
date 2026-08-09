// The app shell is prerendered at build time for two reasons:
//   1. Astro served `/` as a static page whose only dynamic part was the
//      client-only app, so there is nothing here for the server to render.
//   2. The service worker's `navigateFallback` is "/", and workbox can only
//      fall back to a document that is precached. @vite-pwa/sveltekit maps
//      prerendered/pages/index.html onto "/", so without this the offline
//      navigation fallback has no shell to serve.
export const prerender = true;
