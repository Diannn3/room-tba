import { describe, expect, it } from "bun:test";
import { buildEntitySuggestions, nameMatchScore } from "./search-suggestions";
import type { BuildingData } from "./types";

function building(name: string): BuildingData {
  return { buildingName: name, lat: 14.16, lon: 121.24 } as BuildingData;
}

const emptyData = {
  loaded: true,
  filteredBuildings: [] as BuildingData[],
  filteredDorms: [],
  colleges: [],
  divisions: [],
  events: [],
  organizations: [],
  places: [],
};

describe("nameMatchScore", () => {
  it("scores exact and parenthesized-acronym matches best", () => {
    expect(nameMatchScore("ICS", "ics")).toBe(0);
    expect(nameMatchScore("Institute of Computer Science (ICS)", "ics")).toBe(
      0,
    );
  });

  it("scores word-start above mid-word substring", () => {
    expect(nameMatchScore("Computer Science", "comp")).toBe(1);
    expect(nameMatchScore("College of Economics", "ics")).toBe(2);
  });

  it("misses cleanly", () => {
    expect(nameMatchScore("Baker Hall", "ics")).toBeNull();
    expect(nameMatchScore(undefined, "ics")).toBeNull();
  });
});

describe("buildEntitySuggestions", () => {
  it("ranks the ICS building above mid-word -ics- matches (prod bug)", () => {
    const suggestions = buildEntitySuggestions("ics", {
      ...emptyData,
      // Alphabetical data order used to fill the per-category cap with
      // mid-word matches before the ICS building was ever considered.
      filteredBuildings: [
        building("CEM Building"),
        building("Department of Human Kinetics"),
        building("Hydraulics Laboratory"),
        building("Institute of Statistics"),
        building("Institute of Computer Science (ICS)"),
      ],
      colleges: [{ collegeName: "College of Economics and Management" }],
    });

    expect(suggestions[0]?.value).toBe("Institute of Computer Science (ICS)");
  });

  it("still caps per category and overall", () => {
    const many = Array.from({ length: 10 }, (_, i) =>
      building(`Physics Building ${i}`),
    );
    const suggestions = buildEntitySuggestions("physics", {
      ...emptyData,
      filteredBuildings: many,
    });
    expect(suggestions.length).toBe(4);
  });
});
