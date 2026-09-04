import { describe, expect, test } from "bun:test";
import { WALK_KPH } from "@constants/travel-modes";
import { distanceMeters } from "../campus-route";
import { buildTravelGraph, type WalkGraphData } from "./engine";
import {
  isValidBuildingRouteCoordinate,
  routeBuildingToBuilding,
  snapBuildingEndpoint,
  type BuildingRouteEndpoint,
} from "./building-route";

const METERS_PER_DEGREE = 111_320;
const WALK_MPS = WALK_KPH / 3.6;

/** Three walk nodes in a line, two 100 m graph edges. */
const lineFixture: WalkGraphData = {
  meta: { coordScale: 1e6, nodeCount: 3, edgeCount: 2 },
  nodes: [
    [100, 14, 121],
    [101, 14, 121.001],
    [102, 14, 121.002],
  ],
  edges: [
    [0, 1, 100, "footway", null, []],
    [1, 2, 100, "footway", null, []],
  ],
};
const lineGraph = buildTravelGraph(lineFixture);

function building(
  id: number,
  buildingName: string,
  lat: number | null,
  lon: number | null,
): BuildingRouteEndpoint {
  return { id, buildingName, lat, lon };
}

describe("building route endpoint validation", () => {
  test("accepts finite geographic coordinates only", () => {
    expect(
      isValidBuildingRouteCoordinate(building(1, "A", 14.16, 121.24)),
    ).toBe(true);
    expect(
      isValidBuildingRouteCoordinate(building(1, "A", null, 121.24)),
    ).toBe(false);
    expect(
      isValidBuildingRouteCoordinate(building(1, "A", Number.NaN, 121.24)),
    ).toBe(false);
    expect(
      isValidBuildingRouteCoordinate(building(1, "A", 91, 121.24)),
    ).toBe(false);
    expect(isValidBuildingRouteCoordinate(building(1, "A", 14.16, 181))).toBe(
      false,
    );
  });

  test("snap exposes the nearest node and endpoint-to-node connector", () => {
    const endpoint = building(1, "A", 14 + 30 / METERS_PER_DEGREE, 121);
    if (!isValidBuildingRouteCoordinate(endpoint)) throw new Error("fixture");
    const snap = snapBuildingEndpoint(lineGraph, endpoint);

    expect(snap.nodeIndex).toBe(0);
    expect(snap.snapMeters).toBeCloseTo(30, 6);
    expect(snap.nodeCoordinate).toEqual([121, 14]);
    expect(snap.endpointToNodeCoordinates).toEqual([
      [121, endpoint.lat],
      [121, 14],
    ]);
  });
});

describe("routeBuildingToBuilding", () => {
  test(
    "uses graph-only metrics when both building pins are exact graph nodes",
    () => {
      const result = routeBuildingToBuilding({
        graph: lineGraph,
        origin: building(1, "A", 14, 121),
        destination: building(2, "B", 14, 121.002),
        maxSnapMeters: 100,
      });

      expect(result.status).toBe("ok");
      if (result.status !== "ok") return;
      expect(result.originSnap.snapMeters).toBeCloseTo(0, 9);
      expect(result.destinationSnap.snapMeters).toBeCloseTo(0, 9);
      expect(result.route.graphMeters).toBe(200);
      expect(result.route.totalMeters).toBeCloseTo(200, 9);
      expect(result.route.graphSeconds).toBeCloseTo(200 / WALK_MPS, 9);
      expect(result.route.totalSeconds).toBeCloseTo(200 / WALK_MPS, 9);
    },
  );

  test("adds both endpoint connectors to canonical distance and ETA", () => {
    const originLat = 14 - 30 / METERS_PER_DEGREE;
    const destinationLat = 14 + 20 / METERS_PER_DEGREE;
    const result = routeBuildingToBuilding({
      graph: lineGraph,
      origin: building(1, "A", originLat, 121),
      destination: building(2, "B", destinationLat, 121.002),
      maxSnapMeters: 100,
    });

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;

    expect(result.originSnap.snapMeters).toBeCloseTo(30, 6);
    expect(result.destinationSnap.snapMeters).toBeCloseTo(20, 6);
    expect(result.route.graphMeters).toBe(200);
    expect(result.route.graphSeconds).toBeCloseTo(160, 9);
    expect(result.route.totalMeters).toBeCloseTo(250, 6);
    expect(result.route.totalSeconds).toBeCloseTo(200, 6);
    expect(result.walkingSpeedKph).toBe(WALK_KPH);

    // Geometry is deliberately split so the UI cannot accidentally style
    // approximate pin connectors as authoritative mapped footpaths.
    expect(result.route.graphCoordinates[0]).toEqual([121, 14]);
    expect(result.route.graphCoordinates.at(-1)).toEqual([121.002, 14]);
    expect(result.route.originConnectorCoordinates).toEqual([
      [121, originLat],
      [121, 14],
    ]);
    expect(result.route.destinationConnectorCoordinates).toEqual([
      [121.002, 14],
      [121.002, destinationLat],
    ]);
  });

  test(
    "same snapped node still charges both connectors for different buildings",
    () => {
      const result = routeBuildingToBuilding({
        graph: lineGraph,
        origin: building(1, "A", 14 - 10 / METERS_PER_DEGREE, 121),
        destination: building(2, "B", 14 + 15 / METERS_PER_DEGREE, 121),
        maxSnapMeters: 50,
      });

      expect(result.status).toBe("ok");
      if (result.status !== "ok") return;
      expect(result.originSnap.nodeIndex).toBe(
        result.destinationSnap.nodeIndex,
      );
      expect(result.route.graphMeters).toBe(0);
      expect(result.route.graphSeconds).toBe(0);
      expect(result.route.totalMeters).toBeCloseTo(25, 6);
      expect(result.route.totalSeconds).toBeCloseTo(25 / WALK_MPS, 6);
    },
  );

  test(
    "same building is an explicit non-route state keyed by id, not name",
    () => {
      const same = routeBuildingToBuilding({
        graph: lineGraph,
        origin: building(7, "Old name", null, null),
        destination: building(7, "Renamed building", 14, 121),
        maxSnapMeters: 100,
      });
      expect(same).toMatchObject({
        status: "same-building",
        originBuildingId: 7,
        destinationBuildingId: 7,
        route: null,
      });

      const sameLabelDifferentIds = routeBuildingToBuilding({
        graph: lineGraph,
        origin: building(7, "Shared label", 14, 121),
        destination: building(8, "Shared label", 14, 121.002),
        maxSnapMeters: 100,
      });
      expect(sameLabelDifferentIds.status).toBe("ok");
    },
  );

  test("invalid coordinates fail before nearest-node routing", () => {
    const badOrigin = routeBuildingToBuilding({
      graph: lineGraph,
      origin: building(1, "A", null, 121),
      destination: building(2, "B", 14, 121.002),
      maxSnapMeters: 100,
    });
    expect(badOrigin.status).toBe("origin-invalid");

    const badDestination = routeBuildingToBuilding({
      graph: lineGraph,
      origin: building(1, "A", 14, 121),
      destination: building(2, "B", 14, Number.NaN),
      maxSnapMeters: 100,
    });
    expect(badDestination.status).toBe("destination-invalid");
  });

  test(
    "snap ceiling is inclusive and fails closed immediately above it",
    () => {
      const origin = building(1, "A", 14 - 40 / METERS_PER_DEGREE, 121);
      const exactSnapMeters = distanceMeters(
        { lat: origin.lat as number, lon: origin.lon as number },
        { lat: 14, lon: 121 },
      );

      const onBoundary = routeBuildingToBuilding({
        graph: lineGraph,
        origin,
        destination: building(2, "B", 14, 121.002),
        maxSnapMeters: exactSnapMeters,
      });
      expect(onBoundary.status).toBe("ok");

      const overBoundary = routeBuildingToBuilding({
        graph: lineGraph,
        origin,
        destination: building(2, "B", 14, 121.002),
        maxSnapMeters: exactSnapMeters - 0.001,
      });
      expect(overBoundary.status).toBe("origin-off-network");
      if (overBoundary.status === "origin-off-network") {
        expect(overBoundary.originSnap.snapMeters).toBeCloseTo(
          exactSnapMeters,
          9,
        );
        expect(overBoundary.route).toBeNull();
      }
    },
  );

  test(
    "destination off-network preserves audited origin snap but returns no ETA",
    () => {
      const result = routeBuildingToBuilding({
        graph: lineGraph,
        origin: building(1, "A", 14, 121),
        destination: building(
          2,
          "Far B",
          14 + 500 / METERS_PER_DEGREE,
          121.002,
        ),
        maxSnapMeters: 100,
      });

      expect(result.status).toBe("destination-off-network");
      if (result.status !== "destination-off-network") return;
      expect(result.originSnap.nodeIndex).toBe(0);
      expect(result.destinationSnap.snapMeters).toBeGreaterThan(100);
      expect(result.route).toBeNull();
    },
  );

  test(
    "disconnected nodes return no-route with no straight-line fallback",
    () => {
      const disconnected = buildTravelGraph({
        meta: { coordScale: 1e6, nodeCount: 2, edgeCount: 0 },
        nodes: [
          [1, 14, 121],
          [2, 14, 121.001],
        ],
        edges: [],
      });
      const result = routeBuildingToBuilding({
        graph: disconnected,
        origin: building(1, "A", 14, 121),
        destination: building(2, "B", 14, 121.001),
        maxSnapMeters: 10,
      });

      expect(result.status).toBe("no-route");
      if (result.status !== "no-route") return;
      expect(result.route).toBeNull();
      expect(result.originSnap.snapMeters).toBeCloseTo(0, 9);
      expect(result.destinationSnap.snapMeters).toBeCloseTo(0, 9);
    },
  );

  test("preserves one-way graph direction instead of assuming symmetry", () => {
    const oneWay = buildTravelGraph({
      meta: { coordScale: 1e6, nodeCount: 2, edgeCount: 1 },
      nodes: [
        [1, 14, 121],
        [2, 14, 121.001],
      ],
      edges: [[0, 1, 100, "footway", null, [], 1]],
    });

    expect(
      routeBuildingToBuilding({
        graph: oneWay,
        origin: building(1, "A", 14, 121),
        destination: building(2, "B", 14, 121.001),
        maxSnapMeters: 10,
      }).status,
    ).toBe("ok");
    expect(
      routeBuildingToBuilding({
        graph: oneWay,
        origin: building(2, "B", 14, 121.001),
        destination: building(1, "A", 14, 121),
        maxSnapMeters: 10,
      }).status,
    ).toBe("no-route");
  });

  test("rejects an empty travel graph instead of inventing a route", () => {
    const empty = buildTravelGraph({
      meta: { coordScale: 1e6, nodeCount: 0, edgeCount: 0 },
      nodes: [],
      edges: [],
    });

    expect(() =>
      routeBuildingToBuilding({
        graph: empty,
        origin: building(1, "A", 14, 121),
        destination: building(2, "B", 14, 121.001),
        maxSnapMeters: 10,
      }),
    ).toThrow("travel graph has no nodes");
  });

  test(
    "rejects invalid policy values instead of silently changing routing policy",
    () => {
      for (const maxSnapMeters of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
        expect(() =>
          routeBuildingToBuilding({
            graph: lineGraph,
            origin: building(1, "A", 14, 121),
            destination: building(2, "B", 14, 121.002),
            maxSnapMeters,
          }),
        ).toThrow("maxSnapMeters");
      }
    },
  );

  test(
    "positive very-short routes retain positive exact seconds for UI rounding",
    () => {
      const result = routeBuildingToBuilding({
        graph: lineGraph,
        origin: building(1, "A", 14 - 1 / METERS_PER_DEGREE, 121),
        destination: building(2, "B", 14 + 1 / METERS_PER_DEGREE, 121),
        maxSnapMeters: 10,
      });
      expect(result.status).toBe("ok");
      if (result.status !== "ok") return;
      expect(result.route.totalMeters).toBeCloseTo(2, 6);
      expect(result.route.totalSeconds).toBeGreaterThan(0);
      expect(result.route.totalSeconds).toBeLessThan(60);
    },
  );
});
