import type { APIRoute } from "astro";
import {
  cachedJsonWithStandaloneFallback,
  standaloneDivisions,
} from "@lib/api/standalone-campus";

export const prerender = false;

export const GET = (async () =>
  cachedJsonWithStandaloneFallback(
    "divisions",
    async () => {
      const { getAllDivisions } = await import("@lib/services/map-data-service");
      return getAllDivisions();
    },
    standaloneDivisions,
  )) satisfies APIRoute;
