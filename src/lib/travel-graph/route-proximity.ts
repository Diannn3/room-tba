/**
 * Distance from a point to a drawn journey polyline — used to keep landmark
 * pins near the active directions route readable while de-emphasizing the rest.
 */

import { distanceMeters } from "../campus-route";

/** Pins within this buffer stay undimmed while Get Directions is open. */
export const DIRECTIONS_ROUTE_PIN_BUFFER_M = 25;

type LngLat = [number, number];
type LatLon = { lat: number; lon: number };

function lngLatToLatLon([lng, lat]: LngLat): LatLon {
  return { lat, lon: lng };
}

/**
 * Shortest distance from `point` to any segment of `lineCoords` ([lng, lat]).
 * Equirectangular, matching `distanceMeters` campus precision.
 */
export function distanceToPolylineMeters(
  point: { lat: number; lon: number },
  lineCoords: LngLat[],
): number {
  if (lineCoords.length === 0) return Number.POSITIVE_INFINITY;
  if (lineCoords.length === 1) {
    return distanceMeters(point, lngLatToLatLon(lineCoords[0]));
  }

  let best = Number.POSITIVE_INFINITY;
  for (let i = 0; i < lineCoords.length - 1; i++) {
    const a = lngLatToLatLon(lineCoords[i]);
    const b = lngLatToLatLon(lineCoords[i + 1]);
    best = Math.min(best, distanceToSegmentMeters(point, a, b));
  }
  return best;
}

/** Project `p` onto segment ab in local metres, then distance to the clamp. */
function distanceToSegmentMeters(p: LatLon, a: LatLon, b: LatLon): number {
  const metersPerDegree = 111_320;
  const meanLat = ((a.lat + b.lat + p.lat) / 3) * (Math.PI / 180);
  const cos = Math.cos(meanLat);

  const ax = a.lon * cos * metersPerDegree;
  const ay = a.lat * metersPerDegree;
  const bx = b.lon * cos * metersPerDegree;
  const by = b.lat * metersPerDegree;
  const px = p.lon * cos * metersPerDegree;
  const py = p.lat * metersPerDegree;

  const abx = bx - ax;
  const aby = by - ay;
  const apx = px - ax;
  const apy = py - ay;
  const abLen2 = abx * abx + aby * aby;
  if (abLen2 === 0) return Math.hypot(apx, apy);

  const t = Math.max(0, Math.min(1, (apx * abx + apy * aby) / abLen2));
  const qx = ax + t * abx;
  const qy = ay + t * aby;
  return Math.hypot(px - qx, py - qy);
}

export function isNearRoute(
  point: { lat: number; lon: number },
  lineCoords: LngLat[],
  bufferM = DIRECTIONS_ROUTE_PIN_BUFFER_M,
): boolean {
  return distanceToPolylineMeters(point, lineCoords) <= bufferM;
}

/** Flatten journey legs into one [lng, lat] polyline for proximity checks. */
export function journeyLineCoordinates(
  legs: { coordinates: LngLat[] }[],
): LngLat[] {
  const out: LngLat[] = [];
  for (const leg of legs) {
    for (let i = 0; i < leg.coordinates.length; i++) {
      if (out.length > 0 && i === 0) continue; // shared vertex
      out.push(leg.coordinates[i]);
    }
  }
  return out;
}
