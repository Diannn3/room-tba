import type { APIRoute } from "astro";
import { cachedJsonWithStandaloneFallback } from "@lib/api/standalone-campus";
import { getAllTerms } from "@lib/services/term-service";

export const prerender = false;

export const GET = (async () =>
  cachedJsonWithStandaloneFallback("terms", getAllTerms, [])) satisfies APIRoute;
