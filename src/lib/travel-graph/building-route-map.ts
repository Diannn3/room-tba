import type { FeatureCollection, LineString } from "geojson";
import type { BuildingWalkRoute } from "./building-route";

export function buildingRouteGeoJson(route: BuildingWalkRoute): {
  graph: FeatureCollection<LineString>;
  connectors: FeatureCollection<LineString>;
} {
  return {
    graph: {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: route.graphCoordinates,
          },
        },
      ],
    },
    connectors: {
      type: "FeatureCollection",
      features: [
        route.originConnectorCoordinates,
        route.destinationConnectorCoordinates,
      ].map((coordinates) => ({
        type: "Feature" as const,
        properties: {},
        geometry: { type: "LineString" as const, coordinates },
      })),
    },
  };
}

/** Every coordinate that must remain visible when framing a building route. */
export function buildingRouteFitCoordinates(
  route: BuildingWalkRoute,
): [number, number][] {
  return [
    ...route.originConnectorCoordinates,
    ...route.graphCoordinates,
    ...route.destinationConnectorCoordinates,
  ];
}
