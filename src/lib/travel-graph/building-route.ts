/**
 * Pure building-to-building walking routes over Room TBA's vendored campus
 * path graph.
 *
 * This deliberately sits above the generic graph engine instead of the
 * multi-modal journey planner: building routing is walking-only, has an
 * explicit origin and destination, never asks for GPS, and never falls back
 * to OSRM/Haversine when the mapped graph cannot support an endpoint.
 *
 * Endpoint connectors are straight pin<->graph-node approximations. They are
 * included in distance/time so an off-path building pin does not inherit a
 * zero-cost connection to the graph, but they must not be described as
 * surveyed entrances or mapped pedestrian geometry.
 */

import { WALK_KPH } from "@constants/travel-modes";
import { distanceMeters } from "../campus-route";
import { nearestNodeIndex, shortestPath, type TravelGraph } from "./engine";

export type BuildingRouteEndpoint = {
  id: number;
  buildingName: string;
  lat: number | null;
  lon: number | null;
};

export type BuildingRouteCoordinate = [lng: number, lat: number];

export type BuildingEndpointSnap = {
  nodeIndex: number;
  /** Straight-line pin -> snapped graph node distance. */
  snapMeters: number;
  nodeCoordinate: BuildingRouteCoordinate;
  /** Always endpoint pin -> snapped graph node. */
  endpointToNodeCoordinates: [BuildingRouteCoordinate, BuildingRouteCoordinate];
};

export type BuildingWalkRoute = {
  /** Mapped walk-graph segment only. */
  graphMeters: number;
  /** Mapped walk-graph segment only. */
  graphSeconds: number;
  /** Pin connector + graph + pin connector. */
  totalMeters: number;
  /** Pin connector + graph + pin connector, all at WALK_KPH. */
  totalSeconds: number;
  /** Authoritative mapped walking geometry only. */
  graphCoordinates: BuildingRouteCoordinate[];
  /** Approximate origin pin -> graph node connector. */
  originConnectorCoordinates: [
    BuildingRouteCoordinate,
    BuildingRouteCoordinate,
  ];
  /** Approximate graph node -> destination pin connector. */
  destinationConnectorCoordinates: [
    BuildingRouteCoordinate,
    BuildingRouteCoordinate,
  ];
};

export type BuildingRouteStatus =
  | "ok"
  | "same-building"
  | "origin-invalid"
  | "destination-invalid"
  | "origin-off-network"
  | "destination-off-network"
  | "no-route";

type BuildingRouteBase = {
  originBuildingId: number;
  destinationBuildingId: number;
  /** The evidence-backed hard ceiling supplied by the endpoint-audit policy. */
  maxSnapMeters: number;
  /**
   * Captured for debugging/provenance; display copy should stay approximate.
   */
  walkingSpeedKph: number;
};

export type BuildingWalkRouteResult =
  | (BuildingRouteBase & {
      status: "same-building" | "origin-invalid" | "destination-invalid";
      originSnap: null;
      destinationSnap: null;
      route: null;
    })
  | (BuildingRouteBase & {
      status: "origin-off-network";
      originSnap: BuildingEndpointSnap;
      destinationSnap: null;
      route: null;
    })
  | (BuildingRouteBase & {
      status: "destination-off-network";
      originSnap: BuildingEndpointSnap;
      destinationSnap: BuildingEndpointSnap;
      route: null;
    })
  | (BuildingRouteBase & {
      status: "no-route";
      originSnap: BuildingEndpointSnap;
      destinationSnap: BuildingEndpointSnap;
      route: null;
    })
  | (BuildingRouteBase & {
      status: "ok";
      originSnap: BuildingEndpointSnap;
      destinationSnap: BuildingEndpointSnap;
      route: BuildingWalkRoute;
    });

export type RouteBuildingToBuildingInput = {
  graph: TravelGraph;
  origin: BuildingRouteEndpoint;
  destination: BuildingRouteEndpoint;
  /**
   * Hard route-eligibility ceiling established by the endpoint audit.
   * Required on purpose: this core must not silently choose a policy that the
   * building dataset has not justified.
   */
  maxSnapMeters: number;
};

const WALK_MPS = WALK_KPH / 3.6;

const mainComponentCache = new WeakMap<TravelGraph, Uint8Array>();

/**
 * Weak-component eligibility shared with the endpoint-audit semantics.
 *
 * The walk graph may contain tiny disconnected islands. A building snapped to
 * one of those islands is not a usable campus-routing endpoint even when the
 * pin is physically close to that island. Treat only the largest weak
 * component as the canonical campus network and cache the mask per immutable
 * graph instance. Edges are considered undirected here intentionally: route
 * directionality is still enforced later by shortestPath().
 */
export function mainWalkComponentMask(graph: TravelGraph): Uint8Array {
  const cached = mainComponentCache.get(graph);
  if (cached) return cached;

  const nodeCount = graph.lat.length;
  if (graph.lng.length !== nodeCount) {
    throw new Error(
      "building route: graph coordinate arrays have different lengths",
    );
  }

  const neighbors: number[][] = Array.from({ length: nodeCount }, () => []);
  for (const edge of graph.edges) {
    const from = edge[0];
    const to = edge[1];
    if (
      !Number.isInteger(from) ||
      !Number.isInteger(to) ||
      from < 0 ||
      to < 0 ||
      from >= nodeCount ||
      to >= nodeCount
    ) {
      throw new Error("building route: graph contains an out-of-range edge");
    }
    neighbors[from]?.push(to);
    neighbors[to]?.push(from);
  }

  const component = new Int32Array(nodeCount).fill(-1);
  const sizes: number[] = [];
  let componentId = 0;
  for (let start = 0; start < nodeCount; start++) {
    if (component[start] !== -1) continue;
    const stack = [start];
    component[start] = componentId;
    let size = 0;
    while (stack.length > 0) {
      const node = stack.pop();
      if (node === undefined) break;
      size += 1;
      for (const next of neighbors[node] ?? []) {
        if (component[next] !== -1) continue;
        component[next] = componentId;
        stack.push(next);
      }
    }
    sizes.push(size);
    componentId += 1;
  }

  let mainComponentId = -1;
  let mainSize = -1;
  for (let id = 0; id < sizes.length; id++) {
    const size = sizes[id] ?? 0;
    // Strictly greater preserves the audit's first-component tie behaviour.
    if (size > mainSize) {
      mainSize = size;
      mainComponentId = id;
    }
  }

  const mask = new Uint8Array(nodeCount);
  if (mainComponentId >= 0) {
    for (let i = 0; i < nodeCount; i++) {
      if (component[i] === mainComponentId) mask[i] = 1;
    }
  }
  mainComponentCache.set(graph, mask);
  return mask;
}

export function isMainWalkComponentNode(
  graph: TravelGraph,
  nodeIndex: number,
): boolean {
  return mainWalkComponentMask(graph)[nodeIndex] === 1;
}

export function isValidBuildingRouteCoordinate(
  endpoint: Pick<BuildingRouteEndpoint, "lat" | "lon">,
): endpoint is { lat: number; lon: number } {
  const { lat, lon } = endpoint;
  return (
    typeof lat === "number" &&
    typeof lon === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  );
}

function assertMaxSnapMeters(maxSnapMeters: number): void {
  if (!Number.isFinite(maxSnapMeters) || maxSnapMeters < 0) {
    throw new RangeError(
      "building route maxSnapMeters must be a finite, non-negative number",
    );
  }
}

function assertGraphHasNodes(graph: TravelGraph): void {
  if (graph.lat.length === 0 || graph.lng.length === 0) {
    throw new Error("building route: travel graph has no nodes");
  }
  if (graph.lat.length !== graph.lng.length) {
    throw new Error(
      "building route: graph coordinate arrays have different lengths",
    );
  }
  for (let i = 0; i < graph.lat.length; i++) {
    const lat = graph.lat[i];
    const lng = graph.lng[i];
    if (
      lat === undefined ||
      lng === undefined ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      throw new Error(
        `building route: graph node ${i} has invalid coordinates`,
      );
    }
  }
}

/** Snap a valid building pin to the closest walking-graph node. */
export function snapBuildingEndpoint(
  graph: TravelGraph,
  endpoint: BuildingRouteEndpoint & { lat: number; lon: number },
): BuildingEndpointSnap {
  assertGraphHasNodes(graph);
  const nodeIndex = nearestNodeIndex(graph, endpoint.lat, endpoint.lon, "walk");
  const nodeLng = graph.lng[nodeIndex];
  const nodeLat = graph.lat[nodeIndex];
  if (nodeLng === undefined || nodeLat === undefined) {
    throw new Error(
      `building route: nearest node ${nodeIndex} is out of bounds`,
    );
  }
  const nodeCoordinate: BuildingRouteCoordinate = [nodeLng, nodeLat];
  const endpointCoordinate: BuildingRouteCoordinate = [
    endpoint.lon,
    endpoint.lat,
  ];
  const snapMeters = distanceMeters(
    { lat: endpoint.lat, lon: endpoint.lon },
    { lat: nodeCoordinate[1], lon: nodeCoordinate[0] },
  );

  return {
    nodeIndex,
    snapMeters,
    nodeCoordinate,
    endpointToNodeCoordinates: [endpointCoordinate, nodeCoordinate],
  };
}

/**
 * Calculate one walking route between two building pins.
 *
 * No network request, no multi-modal alternatives, and no straight-line route
 * fallback. The only straight segments are the explicitly exposed endpoint
 * connectors whose cost is included in the canonical totals.
 */
export function routeBuildingToBuilding({
  graph,
  origin,
  destination,
  maxSnapMeters,
}: RouteBuildingToBuildingInput): BuildingWalkRouteResult {
  assertMaxSnapMeters(maxSnapMeters);

  const base: BuildingRouteBase = {
    originBuildingId: origin.id,
    destinationBuildingId: destination.id,
    maxSnapMeters,
    walkingSpeedKph: WALK_KPH,
  };

  // Identity, not label text, determines whether both selections are the same
  // building. No outdoor graph route is useful in this state.
  if (origin.id === destination.id) {
    return {
      ...base,
      status: "same-building",
      originSnap: null,
      destinationSnap: null,
      route: null,
    };
  }

  if (!isValidBuildingRouteCoordinate(origin)) {
    return {
      ...base,
      status: "origin-invalid",
      originSnap: null,
      destinationSnap: null,
      route: null,
    };
  }
  if (!isValidBuildingRouteCoordinate(destination)) {
    return {
      ...base,
      status: "destination-invalid",
      originSnap: null,
      destinationSnap: null,
      route: null,
    };
  }

  const originSnap = snapBuildingEndpoint(graph, origin);
  if (
    originSnap.snapMeters > maxSnapMeters ||
    !isMainWalkComponentNode(graph, originSnap.nodeIndex)
  ) {
    return {
      ...base,
      status: "origin-off-network",
      originSnap,
      destinationSnap: null,
      route: null,
    };
  }

  const destinationSnap = snapBuildingEndpoint(graph, destination);
  if (
    destinationSnap.snapMeters > maxSnapMeters ||
    !isMainWalkComponentNode(graph, destinationSnap.nodeIndex)
  ) {
    return {
      ...base,
      status: "destination-off-network",
      originSnap,
      destinationSnap,
      route: null,
    };
  }

  // Reuse the existing target-bounded Dijkstra implementation. This preserves
  // one-way semantics and guarantees the rendered graph path is the same path
  // whose metrics feed the estimate.
  const graphRoute = shortestPath(
    graph,
    originSnap.nodeIndex,
    destinationSnap.nodeIndex,
    "walk",
  );
  if (!graphRoute) {
    return {
      ...base,
      status: "no-route",
      originSnap,
      destinationSnap,
      route: null,
    };
  }

  const connectorMeters = originSnap.snapMeters + destinationSnap.snapMeters;
  const connectorSeconds = connectorMeters / WALK_MPS;

  return {
    ...base,
    status: "ok",
    originSnap,
    destinationSnap,
    route: {
      graphMeters: graphRoute.meters,
      graphSeconds: graphRoute.seconds,
      totalMeters: graphRoute.meters + connectorMeters,
      totalSeconds: graphRoute.seconds + connectorSeconds,
      graphCoordinates: graphRoute.coordinates,
      originConnectorCoordinates: originSnap.endpointToNodeCoordinates,
      destinationConnectorCoordinates: [
        destinationSnap.nodeCoordinate,
        destinationSnap.endpointToNodeCoordinates[0],
      ],
    },
  };
}
