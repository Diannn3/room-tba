import type { APIRoute } from "astro";
import {
  cachedJsonWithStandaloneFallback,
  standaloneColleges,
} from "@lib/api/standalone-campus";

export const prerender = false;

export const GET = (async () =>
  cachedJsonWithStandaloneFallback(
    "colleges",
    async () => {
      const { getAllColleges } = await import("@lib/services/map-data-service");
      return getAllColleges();
    },
    standaloneColleges,
  )) satisfies APIRoute;
