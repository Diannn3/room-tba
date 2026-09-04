import type { FeatureCollection, LineString } from "geojson";
import type { BuildingWalkRoute } from "./building-route";

export function buildingRouteGeoJson(route: BuildingWalkRoute): {
  graph: FeatureCollection<LineString>;
  connectors: FeatureCollection<LineString>;
} {
  return {
    graph: {
      type: "FeatureCollection",
      // GeoJSON LineString requires at least two positions. Different building
      // pins can legitimately snap to the same graph node, in which case the
      // authoritative graph segment is zero-length and the route consists only
      // of the two connector legs. Emit no invalid one-point LineString.
      features:
        route.graphCoordinates.length >= 2
          ? [
              {
                type: "Feature",
                properties: {},
                geometry: {
                  type: "LineString",
                  coordinates: route.graphCoordinates,
                },
              },
            ]
          : [],
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

export function buildingRouteCameraAnimationOptions(reducedMotion: boolean) {
  return {
    animate: !reducedMotion,
    duration: reducedMotion ? 0 : 650,
  } as const;
}
