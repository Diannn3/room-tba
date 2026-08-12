import type { DBData } from "@lib/context";

/**
 * Plain-JSON snapshot of the last applied campus data, read in milliseconds.
 *
 * The offline source of truth stays PGlite, but hydrating ~5 MB of wasm sits
 * between a returning visitor and first paint — the splash screen ran for
 * 10s+ on every visit, including a wiki round-trip (map → wiki → map is a
 * full navigation). Bootstrap applies this snapshot immediately, then lets
 * the PGlite read and the network refresh race behind it as before.
 *
 * Cache Storage, not localStorage: campus data outgrows the 5 MB string
 * quota, and `clear-cached-data.ts` already sweeps every cache on this
 * origin, so "Clear cached data" covers the snapshot for free.
 */
const SNAPSHOT_CACHE = "app-data-snapshot";
/**
 * Bump when the DBData shape changes: a snapshot written by an older deploy
 * is then ignored instead of feeding stale field names to new code. Old
 * entries linger until the next write or a cache clear; that is fine.
 */
const SNAPSHOT_VERSION = 1;
const SNAPSHOT_URL = `/__app-data-snapshot__?v=${SNAPSHOT_VERSION}`;

export async function loadAppDataSnapshot(): Promise<DBData | null> {
  try {
    if (!("caches" in globalThis)) return null;
    const cache = await caches.open(SNAPSHOT_CACHE);
    const hit = await cache.match(SNAPSHOT_URL);
    if (!hit) return null;
    return (await hit.json()) as DBData;
  } catch {
    return null;
  }
}

/** Fire-and-forget; quota or private-mode failures only cost the fast path. */
export function saveAppDataSnapshot(data: DBData): void {
  try {
    if (!("caches" in globalThis)) return;
    void caches
      .open(SNAPSHOT_CACHE)
      .then((cache) =>
        cache.put(
          SNAPSHOT_URL,
          new Response(JSON.stringify(data), {
            headers: { "content-type": "application/json" },
          }),
        ),
      )
      .catch(() => {});
  } catch {
    // ignore: PGlite and network paths still populate the app
  }
}
