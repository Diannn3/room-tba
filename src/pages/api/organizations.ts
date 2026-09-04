import type { APIRoute } from "astro";
import { cachedJsonWithStandaloneFallback } from "@lib/api/standalone-campus";

export const prerender = false;

export const GET = (async () =>
  cachedJsonWithStandaloneFallback(
    "organizations",
    async () => {
      const { getAllOrganizations } = await import("@lib/services/map-data-service");
      return getAllOrganizations();
    },
    [],
  )) satisfies APIRoute;
