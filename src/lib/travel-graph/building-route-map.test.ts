import { describe, expect, test } from "bun:test";
import type { BuildingWalkRoute } from "./building-route";
import {
  buildingRouteCameraAnimationOptions,
  buildingRouteFitCoordinates,
  buildingRouteGeoJson,
} from "./building-route-map";

const route: BuildingWalkRoute = {
  graphMeters: 200,
  graphSeconds: 160,
  totalMeters: 250,
  totalSeconds: 200,
  graphCoordinates: [
    [121.24, 14.16],
    [121.241, 14.161],
  ],
  originConnectorCoordinates: [
    [121.2398, 14.1598],
    [121.24, 14.16],
  ],
  destinationConnectorCoordinates: [
    [121.241, 14.161],
    [121.2412, 14.1612],
  ],
};

describe("building route map data", () => {
  test("keeps authoritative graph geometry separate from approximate connectors", () => {
    const data = buildingRouteGeoJson(route);
    expect(data.graph.features).toHaveLength(1);
    expect(data.graph.features[0]?.geometry.coordinates).toEqual(
      route.graphCoordinates,
    );
    expect(data.connectors.features).toHaveLength(2);
    expect(data.connectors.features[0]?.geometry.coordinates).toEqual(
      route.originConnectorCoordinates,
    );
  });

  test("fit coordinates include both building pins and the graph path", () => {
    const coordinates = buildingRouteFitCoordinates(route);
    expect(coordinates).toContainEqual([121.2398, 14.1598]);
    expect(coordinates).toContainEqual([121.2412, 14.1612]);
    expect(coordinates).toContainEqual([121.24, 14.16]);
  });

  test("camera fit disables animation for reduced-motion users", () => {
    expect(buildingRouteCameraAnimationOptions(true)).toEqual({
      animate: false,
      duration: 0,
    });
    expect(buildingRouteCameraAnimationOptions(false)).toEqual({
      animate: true,
      duration: 650,
    });
  });

  test("omits an invalid one-point graph LineString for same-node routes", () => {
    const sameNodeRoute: BuildingWalkRoute = {
      ...route,
      graphMeters: 0,
      graphSeconds: 0,
      graphCoordinates: [[121.24, 14.16]],
    };
    const data = buildingRouteGeoJson(sameNodeRoute);
    expect(data.graph.features).toEqual([]);
    expect(data.connectors.features).toHaveLength(2);
  });
});
