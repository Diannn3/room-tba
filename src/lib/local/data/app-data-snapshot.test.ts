import { afterEach, describe, expect, it } from "bun:test";
import type { DBData } from "@lib/context";
import { loadAppDataSnapshot, saveAppDataSnapshot } from "./app-data-snapshot";

const sample = { buildings: [{ buildingName: "ICS" }], totalRooms: 3 };

function stubCaches() {
  const store = new Map<string, Response>();
  const cache = {
    match: (url: string) => Promise.resolve(store.get(url) ?? undefined),
    put: (url: string, res: Response) => {
      store.set(url, res);
      return Promise.resolve();
    },
  };
  (globalThis as { caches?: unknown }).caches = {
    open: () => Promise.resolve(cache),
  };
}

afterEach(() => {
  delete (globalThis as { caches?: unknown }).caches;
});

describe("app data snapshot", () => {
  it("round-trips the saved data", async () => {
    stubCaches();
    saveAppDataSnapshot(sample as unknown as DBData);
    // save is fire-and-forget; let the cache.put microtask settle
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(await loadAppDataSnapshot()).toEqual(sample);
  });

  it("returns null with no snapshot and without Cache Storage", async () => {
    stubCaches();
    expect(await loadAppDataSnapshot()).toBeNull();
    delete (globalThis as { caches?: unknown }).caches;
    expect(await loadAppDataSnapshot()).toBeNull();
    // save must not throw either
    saveAppDataSnapshot(sample as unknown as DBData);
  });
});
