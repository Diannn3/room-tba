import type { APIRoute } from "astro";
import { standaloneCachedJson } from "@lib/api/standalone-campus";

export const prerender = false;

export const GET = (async () => {
  try {
    const { listPublishedAnnouncements } = await import(
      "@lib/services/announcement-service"
    );
    const data = await listPublishedAnnouncements();
    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(
      "[standalone fallback] announcements database module/read failed; serving empty list",
      error,
    );
    return standaloneCachedJson([]);
  }
}) satisfies APIRoute;
