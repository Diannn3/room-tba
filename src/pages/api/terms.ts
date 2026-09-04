import type { APIRoute } from "astro";
import { cachedJsonWithStandaloneFallback } from "@lib/api/standalone-campus";

export const prerender = false;

export const GET = (async () =>
  cachedJsonWithStandaloneFallback(
    "terms",
    async () => {
      const { getAllTerms } = await import("@lib/services/term-service");
      return getAllTerms();
    },
    [],
  )) satisfies APIRoute;
