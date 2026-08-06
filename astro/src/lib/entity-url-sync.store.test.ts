// Vitest, not bun test: this module reaches store.svelte, which needs runes.
import { describe, expect, it } from "vitest";
import { isScreenId } from "./entity-url-sync";

// A screen missing here never syncs its path, so the sidebar entry opens it
// while the URL stays on "/" (unshareable, wrong on back/forward).
describe("isScreenId", () => {
  it("recognizes every full-screen route", () => {
    expect(isScreenId("today")).toBe(true);
    expect(isScreenId("planner")).toBe(true);
    expect(isScreenId("finals")).toBe(true);
    expect(isScreenId("calendar")).toBe(true);
  });

  it("rejects sidebar panels that are not screens", () => {
    expect(isScreenId("map")).toBe(false);
    expect(isScreenId("settings")).toBe(false);
  });
});
