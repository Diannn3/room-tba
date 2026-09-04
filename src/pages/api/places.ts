import type { APIRoute } from "astro";
import { cachedJsonWithStandaloneFallback } from "@lib/api/standalone-campus";
import { getAllPlaces } from "@lib/services/map-data-service";

export const prerender = false;

export const GET = (async () =>
  cachedJsonWithStandaloneFallback("places", getAllPlaces, [])) satisfies APIRoute;
