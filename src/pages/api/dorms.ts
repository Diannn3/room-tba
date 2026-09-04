import type { APIRoute } from "astro";
import {
  cachedJsonWithStandaloneFallback,
  standaloneDorms,
} from "@lib/api/standalone-campus";

export const prerender = false;

export const GET = (async () =>
  cachedJsonWithStandaloneFallback(
    "dorms",
    async () => {
      const { getAllDorms } = await import("@lib/services/map-data-service");
      return getAllDorms();
    },
    standaloneDorms,
  )) satisfies APIRoute;
