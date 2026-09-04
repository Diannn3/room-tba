import type { APIRoute } from "astro";
import { roomsTable } from "@drizzle/schema";
import { count, isNotNull } from "drizzle-orm";
import { db } from "@lib/db";
import {
  standaloneCachedJson,
  standaloneRoomCounts,
} from "@lib/api/standalone-campus";

export const prerender = false;

export const GET = (async () => {
  try {
    // @ts-expect-error drizzle returns count as a scalar row here.
    const [{ count: directionCount }] = await db
      .select({ count: count() })
      .from(roomsTable)
      .where(isNotNull(roomsTable.directions));

    // @ts-expect-error drizzle returns count as a scalar row here.
    const [{ count: totalRooms }] = await db
      .select({ count: count() })
      .from(roomsTable);

    return new Response(JSON.stringify({ directionCount, totalRooms }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(
      "[standalone fallback] room counts database read failed; serving vendored counts",
      error,
    );
    return standaloneCachedJson(standaloneRoomCounts);
  }
}) satisfies APIRoute;
