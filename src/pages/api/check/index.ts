import type { APIRoute } from "astro";
import {
  standaloneCachedJson,
  standaloneSyncKeys,
} from "@lib/api/standalone-campus";

export const prerender = false;

/**
 * Every table's sync key in one response (#866). A standalone deployment has
 * no private Room TBA database, so a labelled vendored key set keeps the normal
 * client bootstrap path alive instead of trapping it on an empty PGlite cache.
 */
export const GET = (async () => {
  try {
    const [{ db }, { updateTable }] = await Promise.all([
      import("@lib/db"),
      import("@drizzle/schema"),
    ]);
    const rows = await db.select().from(updateTable);

    const data: Record<string, string | null> = {};
    for (const row of rows) {
      if (row.tableName) data[row.tableName] = row.syncKey;
    }

    return new Response(JSON.stringify({ success: true, error: null, data }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(
      "[standalone fallback] sync registry module/read unavailable; serving vendored sync keys",
      error,
    );
    return standaloneCachedJson({
      success: true,
      error: null,
      data: standaloneSyncKeys,
    });
  }
}) satisfies APIRoute;
