import type { APIRoute } from "astro";
import {
  standaloneCachedJson,
  standaloneRoomCounts,
} from "@lib/api/standalone-campus";

export const prerender = false;

export const GET = (async () => {
  try {
    const [{ db }, { roomsTable }, { count, isNotNull }] = await Promise.all([
      import("@lib/db"),
      import("@drizzle/schema"),
      import("drizzle-orm"),
    ]);

    const directionRows = await db
      .select({ count: count() })
      .from(roomsTable)
      .where(isNotNull(roomsTable.directions));
    const totalRows = await db.select({ count: count() }).from(roomsTable);

    const directionCount = Number(directionRows[0]?.count ?? 0);
    const totalRooms = Number(totalRows[0]?.count ?? 0);

    return new Response(JSON.stringify({ directionCount, totalRooms }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(
      "[standalone fallback] room count module/read failed; serving vendored counts",
      error,
    );
    return standaloneCachedJson(standaloneRoomCounts);
  }
}) satisfies APIRoute;
