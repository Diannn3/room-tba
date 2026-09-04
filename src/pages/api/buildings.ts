import type { APIRoute } from "astro";
import {
  cachedJsonWithStandaloneFallback,
  standaloneBuildings,
} from "@lib/api/standalone-campus";
import { getAllBuildings } from "@lib/services/map-data-service";

export const prerender = false;

export const GET = (async () =>
  cachedJsonWithStandaloneFallback(
    "buildings",
    getAllBuildings,
    standaloneBuildings,
  )) satisfies APIRoute;
