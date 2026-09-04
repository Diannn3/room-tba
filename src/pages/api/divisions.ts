import type { APIRoute } from "astro";
import {
  cachedJsonWithStandaloneFallback,
  standaloneDivisions,
} from "@lib/api/standalone-campus";
import { getAllDivisions } from "@lib/services/map-data-service";

export const prerender = false;

export const GET = (async () =>
  cachedJsonWithStandaloneFallback(
    "divisions",
    getAllDivisions,
    standaloneDivisions,
  )) satisfies APIRoute;
