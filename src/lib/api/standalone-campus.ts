import { cachedJson } from "./json";
import type {
  BuildingData,
  CollegeData,
  DivisionData,
  DormData,
} from "@lib/types";
import buildingsJson from "../../../exports/deep-research/buildings.json";
import collegesJson from "../../../exports/deep-research/colleges.json";
import divisionsJson from "../../../exports/deep-research/divisions.json";
import dormsJson from "../../../exports/deep-research/dorms.json";
import roomsJson from "../../../exports/deep-research/rooms.json";

/**
 * Public, vendored campus snapshot used only when the server database is
 * unavailable. This keeps forks/test deployments useful without sharing
 * private Room TBA database credentials.
 *
 * The snapshot is intentionally explicit and stale-by-design: a healthy DB
 * always wins. Responses carry X-Room-TBA-Data-Source so a fallback can never
 * masquerade as current production data.
 */
export const STANDALONE_DATASET_ID = "deep-research-2026-07-13";
export const STANDALONE_SOURCE = `standalone:${STANDALONE_DATASET_ID}`;

export const standaloneBuildings = buildingsJson as BuildingData[];
export const standaloneColleges = collegesJson as CollegeData[];
export const standaloneDivisions = divisionsJson as DivisionData[];
export const standaloneDorms = dormsJson as DormData[];

export const standaloneRoomCounts = {
  totalRooms: roomsJson.length,
  directionCount: roomsJson.filter(
    (room) =>
      typeof room.directions === "string" && room.directions.trim().length > 0,
  ).length,
};

/** Tables currently tracked by the browser sync-key registry. */
export const STANDALONE_SYNC_TABLES = [
  "buildings",
  "colleges",
  "divisions",
  "rooms",
  "dorms",
  "classes",
  "final_exams",
  "events",
  "organizations",
  "places",
  "announcements",
] as const;

export function standaloneSyncKey(tableName: string): string {
  return `${STANDALONE_DATASET_ID}:${tableName}:v1`;
}

export const standaloneSyncKeys: Record<string, string> = Object.fromEntries(
  STANDALONE_SYNC_TABLES.map((tableName) => [
    tableName,
    standaloneSyncKey(tableName),
  ]),
);

export const standaloneHeaders = {
  "X-Room-TBA-Data-Source": STANDALONE_SOURCE,
  "X-Room-TBA-Data-Stale": "true",
} as const;

export function standaloneCachedJson(body: unknown): Response {
  return cachedJson(body, 200, standaloneHeaders);
}

/**
 * Read from the live DB when possible, otherwise fail open to a deliberately
 * labelled vendored snapshot. Callers decide the honest fallback value.
 */
export async function cachedJsonWithStandaloneFallback<T>(
  label: string,
  load: () => Promise<T>,
  fallback: T,
): Promise<Response> {
  try {
    return cachedJson(await load());
  } catch (error) {
    console.error(
      `[standalone fallback] ${label} database read failed; serving vendored data`,
      error,
    );
    return standaloneCachedJson(fallback);
  }
}
