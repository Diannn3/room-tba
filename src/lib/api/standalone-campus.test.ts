import { describe, expect, test } from "bun:test";
import {
  STANDALONE_DATASET_ID,
  STANDALONE_SOURCE,
  cachedJsonWithStandaloneFallback,
  standaloneBuildings,
  standaloneColleges,
  standaloneDivisions,
  standaloneDorms,
  standaloneRoomCounts,
  standaloneSyncKey,
  standaloneSyncKeys,
} from "./standalone-campus";

describe("standalone campus snapshot", () => {
  test("matches the checked-in export inventory", () => {
    expect(standaloneBuildings).toHaveLength(52);
    expect(standaloneColleges).toHaveLength(11);
    expect(standaloneDivisions).toHaveLength(43);
    expect(standaloneDorms).toHaveLength(14);
    expect(standaloneRoomCounts.totalRooms).toBe(530);
    expect(standaloneRoomCounts.directionCount).toBeGreaterThan(0);
  });

  test("contains audited building-router fixtures", () => {
    const newMath = standaloneBuildings.find(
      (building) => building.buildingName === "New Math Building",
    );
    const physicalSciences = standaloneBuildings.find(
      (building) => building.buildingName === "Physical Sciences Building",
    );
    expect(newMath?.lat).toBeCloseTo(14.164626812368, 8);
    expect(newMath?.lon).toBeCloseTo(121.243664369023, 8);
    expect(physicalSciences?.lat).toBeCloseTo(14.164378759022, 8);
    expect(physicalSciences?.lon).toBeCloseTo(121.241803648353, 8);
  });

  test("publishes stable non-empty bootstrap sync keys", () => {
    for (const table of [
      "buildings",
      "colleges",
      "divisions",
      "dorms",
      "events",
      "classes",
      "organizations",
      "places",
    ]) {
      expect(standaloneSyncKeys[table]).toBe(standaloneSyncKey(table));
      expect(standaloneSyncKeys[table]).toContain(STANDALONE_DATASET_ID);
    }
  });

  test("prefers a healthy live read", async () => {
    const response = await cachedJsonWithStandaloneFallback(
      "buildings",
      async () => [{ id: 999 }],
      standaloneBuildings,
    );
    expect(response.headers.get("X-Room-TBA-Data-Source")).toBeNull();
    expect(await response.json()).toEqual([{ id: 999 }]);
  });

  test("labels a vendored fallback when the live read fails", async () => {
    const response = await cachedJsonWithStandaloneFallback(
      "buildings",
      async () => {
        throw new Error("database unavailable");
      },
      standaloneBuildings,
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("X-Room-TBA-Data-Source")).toBe(
      STANDALONE_SOURCE,
    );
    expect(response.headers.get("X-Room-TBA-Data-Stale")).toBe("true");
    expect((await response.json()) as unknown[]).toHaveLength(52);
  });
});
