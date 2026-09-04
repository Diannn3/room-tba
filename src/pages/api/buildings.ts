import type { APIRoute } from "astro";
import {
  cachedJsonWithStandaloneFallback,
  standaloneBuildings,
} from "@lib/api/standalone-campus";

export const prerender = false;

export const GET = (async () =>
  cachedJsonWithStandaloneFallback(
    "buildings",
    async () => {
      const { getAllBuildings } = await import("@lib/services/map-data-service");
      return getAllBuildings();
    },
    standaloneBuildings,
  )) satisfies APIRoute;
