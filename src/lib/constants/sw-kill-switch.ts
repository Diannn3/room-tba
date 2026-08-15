/**
 * Emergency off switch for the service worker.
 *
 * Flip to `true`, deploy, and every client recovers on its next visit: the
 * worker tears itself down (caches dropped, registration removed, open tabs
 * reloaded) and `vite.config.ts` stops the app from registering a new one.
 * Flip back to `false` once a healthy worker is out.
 *
 * Why this has to live in the worker rather than in page code: a bad worker
 * serves the shell, so a user can be stuck on a broken bundle that never boots
 * far enough to reach Settings → "clear cached data". The browser's own update
 * check re-fetches `/service-worker.js` on navigation regardless of what the
 * page does, which makes the worker the only reliable delivery channel.
 *
 * Typed `boolean` rather than left as a literal so both branches stay
 * type-checked while the switch is off.
 */
export const SW_KILL_SWITCH: boolean = true;
