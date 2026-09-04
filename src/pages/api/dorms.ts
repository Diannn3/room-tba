import type { APIRoute } from "astro";
import {
  cachedJsonWithStandaloneFallback,
  standaloneDorms,
} from "@lib/api/standalone-campus";
import { getAllDorms } from "@lib/services/map-data-service";

export const prerender = false;

export const GET = (async () =>
  cachedJsonWithStandaloneFallback("dorms", getAllDorms, standaloneDorms)) satisfies APIRoute;
