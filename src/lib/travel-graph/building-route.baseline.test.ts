import { describe, expect, test } from "bun:test";
import {
  ENDPOINT_SNAP_TOLERANCE_METERS,
  WALK_KPH,
} from "@constants/travel-modes";
import buildingsJson from "../../../exports/deep-research/buildings.json";
import walkGraphJson from "../../generated/walk-graph.json";
import { buildTravelGraph, type WalkGraphData } from "./engine";
import {
  routeBuildingToBuilding,
  snapBuildingEndpoint,
  type BuildingRouteEndpoint,
} from "./building-route";

const buildings = buildingsJson as BuildingRouteEndpoint[];
const campus = buildTravelGraph(walkGraphJson as unknown as WalkGraphData);
const WALK_MPS = WALK_KPH / 3.6;

function findBuilding(name: string): BuildingRouteEndpoint {
  const building = buildings.find(
    (candidate) => candidate.buildingName.trim() === name,
  );
  if (!building) throw new Error(`missing baseline building: ${name}`);
  return building;
}

describe("building route real campus baseline", () => {
  test(
    "routes every endpoint inside the current hard snap ceiling to the core",
    () => {
      const anchor = findBuilding("CAS Main Building");
      let routed = 0;
      let offNetwork = 0;

      for (const endpoint of buildings) {
        if (endpoint.id === anchor.id) continue;
        if (endpoint.lat === null || endpoint.lon === null) {
          throw new Error(
            `${endpoint.buildingName} unexpectedly lacks a map pin`,
          );
        }

        const snap = snapBuildingEndpoint(campus, {
          ...endpoint,
          lat: endpoint.lat,
          lon: endpoint.lon,
        });
        const result = routeBuildingToBuilding({
          graph: campus,
          origin: endpoint,
          destination: anchor,
          maxSnapMeters: ENDPOINT_SNAP_TOLERANCE_METERS,
        });

        if (snap.snapMeters > ENDPOINT_SNAP_TOLERANCE_METERS) {
          offNetwork++;
          expect(result.status, endpoint.buildingName).toBe(
            "origin-off-network",
          );
          continue;
        }

        routed++;
        expect(result.status, endpoint.buildingName).toBe("ok");
        if (result.status !== "ok") continue;

        expect(result.originSnap.snapMeters, endpoint.buildingName).toBeCloseTo(
          snap.snapMeters,
          8,
        );
        expect(result.route.totalMeters, endpoint.buildingName).toBeCloseTo(
          result.route.graphMeters +
            result.originSnap.snapMeters +
            result.destinationSnap.snapMeters,
          8,
        );
        expect(result.route.totalSeconds, endpoint.buildingName).toBeCloseTo(
          result.route.graphSeconds +
            (result.originSnap.snapMeters + result.destinationSnap.snapMeters) /
              WALK_MPS,
          8,
        );
        expect(
          result.route.graphCoordinates.length,
          endpoint.buildingName,
        ).toBeGreaterThan(0);
      }

      expect(routed).toBeGreaterThan(0);
      // The checked-in dataset intentionally includes sites outside the main
      // campus graph; Pass 0 protects them from inheriting a remote graph node.
      expect(offNetwork).toBeGreaterThan(0);
    },
  );

  test("known off-campus teaching sites fail closed", () => {
    const anchor = findBuilding("CAS Main Building");
    for (const name of ["UPRHS Building", "Veterinary Teaching Hospital"]) {
      const result = routeBuildingToBuilding({
        graph: campus,
        origin: findBuilding(name),
        destination: anchor,
        maxSnapMeters: ENDPOINT_SNAP_TOLERANCE_METERS,
      });
      expect(result.status, name).toBe("origin-off-network");
      if (result.status === "origin-off-network") {
        expect(result.originSnap.snapMeters, name).toBeGreaterThan(
          ENDPOINT_SNAP_TOLERANCE_METERS,
        );
      }
    }
  });

  test(
    "a central route uses connector-inclusive canonical totals",
    () => {
      const origin = findBuilding("New Math Building");
      const destination = findBuilding("Physical Sciences Building");
      const result = routeBuildingToBuilding({
        graph: campus,
        origin,
        destination,
        maxSnapMeters: ENDPOINT_SNAP_TOLERANCE_METERS,
      });

      expect(result.status).toBe("ok");
      if (result.status !== "ok") return;
      expect(result.route.graphMeters).toBeGreaterThan(0);
      expect(result.route.totalMeters).toBeGreaterThanOrEqual(
        result.route.graphMeters,
      );
      expect(result.route.totalSeconds).toBeCloseTo(
        result.route.graphSeconds +
          (result.originSnap.snapMeters + result.destinationSnap.snapMeters) /
            WALK_MPS,
        5,
      );
      expect(result.route.originConnectorCoordinates[0]).toEqual([
        origin.lon,
        origin.lat,
      ]);
      expect(result.route.destinationConnectorCoordinates.at(-1)).toEqual([
        destination.lon,
        destination.lat,
      ]);
    },
  );

  test(
    "a cross-campus route remains graph-backed and finite",
    () => {
      const result = routeBuildingToBuilding({
        graph: campus,
        origin: findBuilding("CAS Main Building"),
        destination: findBuilding("CFNR Admin Building"),
        maxSnapMeters: ENDPOINT_SNAP_TOLERANCE_METERS,
      });

      expect(result.status).toBe("ok");
      if (result.status !== "ok") return;
      expect(result.route.graphMeters).toBeGreaterThan(500);
      expect(result.route.totalMeters).toBeGreaterThanOrEqual(
        result.route.graphMeters,
      );
      expect(Number.isFinite(result.route.totalSeconds)).toBe(true);
      expect(result.route.totalSeconds).toBeGreaterThan(60);
    },
  );
});
