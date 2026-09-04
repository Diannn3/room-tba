import type { APIRoute } from "astro";
import { cachedJson, json } from "@lib/api/json";
import {
  standaloneCachedJson,
  standaloneHeaders,
} from "@lib/api/standalone-campus";

export const prerender = false;

function standaloneUncachedJson(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    headers: {
      "Content-Type": "application/json",
      ...standaloneHeaders,
    },
  });
}

export const GET = (async ({ url }) => {
  // Full dump feeds PGlite DELETE+INSERT with no sync-key bust. Never edge-cache it.
  if (url.searchParams.get("export") === "all") {
    try {
      const { listAliasesForCache } = await import(
        "@lib/services/map-data-service"
      );
      const data = await listAliasesForCache();
      return json({ data, success: true });
    } catch (error) {
      console.error(
        "[standalone fallback] alias export module/read failed; serving empty uncached list",
        error,
      );
      return standaloneUncachedJson({ data: [], success: true });
    }
  }

  const q = url.searchParams.get("q") ?? "";
  if (q.trim() === "") {
    return cachedJson({ data: [], success: true });
  }

  try {
    const { searchAliases } = await import("@lib/services/map-data-service");
    const data = await searchAliases(q);
    return cachedJson({ data, success: true });
  } catch (error) {
    console.error(
      "[standalone fallback] alias search module/read failed; serving empty list",
      error,
    );
    return standaloneCachedJson({ data: [], success: true });
  }
}) satisfies APIRoute;
