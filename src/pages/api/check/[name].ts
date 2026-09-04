import type { APIRoute } from "astro";
import { db } from "@lib/db";
import { updateTable } from "@drizzle/schema";
import { eq } from "drizzle-orm";
import {
  standaloneCachedJson,
  standaloneSyncKey,
} from "@lib/api/standalone-campus";

export const prerender = false;

const PATHS = [
  "announcements",
  "buildings",
  "colleges",
  "divisions",
  "dorms",
  "rooms",
  "classes",
  "final_exams",
  "events",
  "organizations",
  "places",
  "event_locations",
  "event_routes",
  "event_route_stops",
  "jeepney_routes",
];

export const GET = (async ({ params }) => {
  const tableName = params.name as string;
  if (!PATHS.includes(tableName)) {
    return new Response(
      JSON.stringify({ success: false, data: null, error: "Invalid table name" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  let rows: (typeof updateTable.$inferSelect)[];
  try {
    rows = await db
      .select()
      .from(updateTable)
      .where(eq(updateTable.tableName, tableName));
  } catch (error) {
    console.error(
      `[standalone fallback] sync registry unavailable for ${tableName}; serving vendored key`,
      error,
    );
    return standaloneCachedJson({
      success: true,
      error: null,
      data: { tableName, syncKey: standaloneSyncKey(tableName) },
    });
  }

  if (rows.length === 0 || !rows[0]) {
    return new Response(
      JSON.stringify({
        success: false,
        data: null,
        error: `Missing sync registry row for ${tableName}. Apply drizzle/0016_ensure_update_sync_table.sql.`,
      }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }

  return new Response(
    JSON.stringify({ success: true, error: null, data: rows[0] }),
    { headers: { "Content-Type": "application/json" } },
  );
}) satisfies APIRoute;
