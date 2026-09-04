import type { APIRoute } from "astro";
import {
  cachedJsonWithStandaloneFallback,
  standaloneColleges,
} from "@lib/api/standalone-campus";
import { getAllColleges } from "@lib/services/map-data-service";

export const prerender = false;

export const GET = (async () =>
  cachedJsonWithStandaloneFallback(
    "colleges",
    getAllColleges,
    standaloneColleges,
  )) satisfies APIRoute;
