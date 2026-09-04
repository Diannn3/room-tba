import type { APIRoute } from "astro";
import { standaloneCachedJson } from "@lib/api/standalone-campus";
import {
  getActiveEvents,
  getAllEvents,
  getUpcomingEvents,
} from "@lib/services/event-service";

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  try {
    const activeOnly = url.searchParams.get("active") === "1";
    const upcomingOnly = url.searchParams.get("upcoming") === "1";

    if (activeOnly) {
      return new Response(JSON.stringify(await getActiveEvents()), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (upcomingOnly) {
      return new Response(JSON.stringify(await getUpcomingEvents()), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(await getAllEvents()), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(
      "[standalone fallback] events database read failed; serving empty event list",
      error,
    );
    return standaloneCachedJson([]);
  }
};
