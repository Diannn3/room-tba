import type { APIRoute } from "astro";
import { cachedJsonWithStandaloneFallback } from "@lib/api/standalone-campus";

export const prerender = false;

export const GET = (async () =>
  cachedJsonWithStandaloneFallback(
    "places",
    async () => {
      const { getAllPlaces } = await import("@lib/services/map-data-service");
      return getAllPlaces();
    },
    [],
  )) satisfies APIRoute;
