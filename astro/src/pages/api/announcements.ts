import type { APIRoute } from "astro";
import { listPublishedAnnouncements } from "@lib/services/announcement-service";

export const prerender = false;

export const GET = (async (_) => {
  try {
    const data = await listPublishedAnnouncements();
    return new Response(JSON.stringify(data));
  } catch (error) {
    // Degrade to empty so the app still boots before the table exists on a
    // given environment (AGENTS.md: migrations are hand-applied).
    console.error("Failed to load announcements:", error);
    return new Response(JSON.stringify([]));
  }
}) satisfies APIRoute;
