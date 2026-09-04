import { describe, expect, test } from "bun:test";
import { ENDPOINT_SNAP_TOLERANCE_METERS } from "../../src/constants/travel-modes";
import {
  auditBuildingEndpoints,
  type AuditBuilding,
  type AuditWalkGraph,
} from "./building-route-audit";

const BUILDINGS_PATH = "exports/deep-research/buildings.json";
const GRAPH_PATH = "src/generated/walk-graph.json";

let baselinePromise: Promise<{
  buildings: AuditBuilding[];
  graph: AuditWalkGraph;
  report: ReturnType<typeof auditBuildingEndpoints>;
}> | null = null;

function loadBaseline() {
  baselinePromise ??= (async () => {
    const [buildings, graph] = await Promise.all([
      Bun.file(BUILDINGS_PATH).json() as Promise<AuditBuilding[]>,
      Bun.file(GRAPH_PATH).json() as Promise<AuditWalkGraph>,
    ]);
    return {
      buildings,
      graph,
      report: auditBuildingEndpoints(buildings, graph, {
        hardSnapLimitMeters: ENDPOINT_SNAP_TOLERANCE_METERS,
      }),
    };
  })();
  return baselinePromise;
}

describe("building route audit baseline", () => {
  test("audits the complete checked-in building export without invalid coordinates", async () => {
    const { buildings, graph, report } = await loadBaseline();

    expect(buildings.length).toBe(52);
    expect(graph.nodes.length).toBe(1014);
    expect(graph.edges.length).toBe(1468);
    expect(report.summary.buildingCount).toBe(buildings.length);
    expect(report.summary.invalidCoordinateCount).toBe(0);
    expect(
      report.summary.supportedCount +
        report.summary.reviewCount +
        report.summary.unsupportedCount,
    ).toBe(buildings.length);
  });

  test("keeps known off-campus teaching sites outside ordinary campus routing", async () => {
    const { report } = await loadBaseline();
    const byName = new Map(
      report.buildings.map((building) => [building.buildingName.trim(), building]),
    );

    for (const name of ["UPRHS Building", "Veterinary Teaching Hospital"]) {
      const building = byName.get(name);
      expect(building, `${name} must exist in the checked-in export`).toBeDefined();
      expect(building?.status).toBe("unsupported");
      expect(building?.snapMeters ?? 0).toBeGreaterThan(
        ENDPOINT_SNAP_TOLERANCE_METERS,
      );
    }
  });

  test("derives the review threshold from current building pins", async () => {
    const { report } = await loadBaseline();
    expect(report.policy.hardSnapLimitMeters).toBe(
      ENDPOINT_SNAP_TOLERANCE_METERS,
    );
    expect(report.policy.reviewThresholdBasis).toBe(
      "p95-or-tukey-upper-fence",
    );
    expect(report.policy.reviewSnapThresholdMeters).toBeLessThanOrEqual(
      ENDPOINT_SNAP_TOLERANCE_METERS,
    );
    expect(report.eligibleSnapDistribution?.count ?? 0).toBeGreaterThan(0);
  });
});
