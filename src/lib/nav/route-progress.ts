/**
 * Live progress along a walking route: where the user is on the line, how far
 * is left, which maneuver is next, and whether they have wandered off.
 *
 * Deliberately engine-agnostic. It takes a plain `[lon, lat][]` polyline, so
 * the same code works against the OSRM foot service used today and against the
 * vendored campus walk graph (#847/#848) when that lands, without a rewrite.
 *
 * Pure functions only: no map handle, no store, no Svelte. That is what makes
 * live navigation testable without a device walking around campus.
 */

import { distanceMeters } from "../campus-route";

export type LngLat = [number, number];

/** Where the user actually is, relative to the route line. */
export type RouteProgress = {
  /** Closest point on the route to the user, [lon, lat]. */
  snapped: LngLat;
  /** Index of the polyline segment the user is on (segment i = pts[i]..pts[i+1]). */
  segmentIndex: number;
  /** Metres from the user's raw position to the route. The off-route signal. */
  offsetMeters: number;
  /** Metres travelled along the route to the snapped point. */
  alongMeters: number;
  /** Metres from the snapped point to the end of the route. */
  remainingMeters: number;
};

/**
 * Perpendicular projection of `point` onto segment `a`-`b`, in local metres.
 *
 * Works in a flat local frame rather than on the sphere: campus segments are
 * tens of metres, where the flat-earth error is well under a centimetre and far
 * below GPS noise.
 */
function projectOntoSegment(
  point: LngLat,
  a: LngLat,
  b: LngLat,
): { t: number; snapped: LngLat } {
  const meanLatRad = ((a[1] + b[1]) / 2) * (Math.PI / 180);
  const kx = Math.cos(meanLatRad);

  // Local planar coordinates in degrees, longitude compressed by latitude.
  const ax = a[0] * kx;
  const ay = a[1];
  const bx = b[0] * kx;
  const by = b[1];
  const px = point[0] * kx;
  const py = point[1];

  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;

  // Degenerate segment (duplicate points): the projection is the vertex itself.
  if (lenSq === 0) return { t: 0, snapped: a };

  // Clamp so the projection never runs past either end of the segment.
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  const snappedX = ax + t * dx;
  const snappedY = ay + t * dy;
  return { t, snapped: [snappedX / kx, snappedY] };
}

/** Cumulative distance to each vertex, so progress is a lookup, not a re-walk. */
export function cumulativeDistances(coordinates: readonly LngLat[]): number[] {
  const out = [0];
  for (let i = 1; i < coordinates.length; i++) {
    const prev = coordinates[i - 1] as LngLat;
    const curr = coordinates[i] as LngLat;
    out.push(
      (out[i - 1] as number) +
        distanceMeters(
          { lon: prev[0], lat: prev[1] },
          { lon: curr[0], lat: curr[1] },
        ),
    );
  }
  return out;
}

/**
 * Snap a live position onto the route and report progress.
 *
 * Checks every segment rather than only the ones near the last known position.
 * A campus route is a few hundred points, so this is microseconds, and it means
 * a user who teleports (tunnel, long GPS dropout, jumping in a jeepney) is
 * relocated correctly instead of being pinned to a stale segment.
 *
 * Returns null for a route too short to have a segment.
 */
export function computeProgress(
  position: LngLat,
  coordinates: readonly LngLat[],
  cumulative?: readonly number[],
): RouteProgress | null {
  if (coordinates.length < 2) return null;
  const cum = cumulative ?? cumulativeDistances(coordinates);
  const total = cum[cum.length - 1] as number;

  let best: RouteProgress | null = null;

  for (let i = 0; i < coordinates.length - 1; i++) {
    const a = coordinates[i] as LngLat;
    const b = coordinates[i + 1] as LngLat;
    const { t, snapped } = projectOntoSegment(position, a, b);
    const offsetMeters = distanceMeters(
      { lon: position[0], lat: position[1] },
      { lon: snapped[0], lat: snapped[1] },
    );
    if (best && offsetMeters >= best.offsetMeters) continue;

    const segmentLength = (cum[i + 1] as number) - (cum[i] as number);
    const alongMeters = (cum[i] as number) + t * segmentLength;
    best = {
      snapped,
      segmentIndex: i,
      offsetMeters,
      alongMeters,
      remainingMeters: Math.max(0, total - alongMeters),
    };
  }

  return best;
}

/**
 * Off-route decision, with hysteresis and GPS-accuracy awareness.
 *
 * Two separate thresholds on purpose. A single threshold makes the banner
 * flicker between "on route" and "rerouting" while the user stands still and
 * GPS jitters across it. Leaving requires a bigger error than returning.
 *
 * `accuracyMeters` (from `GeolocationCoordinates.accuracy`) widens the gate:
 * under tree cover or between concrete buildings a 30 m fix is not evidence the
 * user left the path, so we must not accuse them of it.
 */
export const OFF_ROUTE_ENTER_M = 25;
export const OFF_ROUTE_EXIT_M = 15;

export function isOffRoute(
  offsetMeters: number,
  wasOffRoute: boolean,
  accuracyMeters: number | null = null,
): boolean {
  // A fix this vague cannot prove anything; hold the previous verdict.
  const slack = accuracyMeters && accuracyMeters > 0 ? accuracyMeters : 0;
  const enter = OFF_ROUTE_ENTER_M + slack;
  const exit = OFF_ROUTE_EXIT_M + slack;
  return wasOffRoute ? offsetMeters > exit : offsetMeters > enter;
}

/** A maneuver pinned to its distance along the route. */
export type RouteCue = {
  /** Metres from route start to this maneuver. */
  atMeters: number;
  /** Human instruction, e.g. "Turn left at the Copeland Gym". */
  text: string;
  /** OSRM modifier for the arrow glyph: "left" | "right" | "straight" | null. */
  modifier: string | null;
};

/**
 * Place each step's maneuver along the route.
 *
 * OSRM reports each step's distance as the length of that step, so a maneuver
 * happens at the running total BEFORE its own distance is added. Getting this
 * off by one step is the classic turn-by-turn bug where every instruction fires
 * one turn late.
 */
export function buildCues(
  steps: readonly { maneuver: string; modifier: string | null; meters: number }[],
  describe: (step: {
    maneuver: string;
    modifier: string | null;
    meters: number;
  }) => string,
): RouteCue[] {
  const cues: RouteCue[] = [];
  let running = 0;
  for (const step of steps) {
    cues.push({ atMeters: running, text: describe(step), modifier: step.modifier });
    running += step.meters;
  }
  return cues;
}

/** The cue the user is currently walking toward, and how far it is. */
export type ActiveCue = {
  cue: RouteCue;
  metersToCue: number;
  /** Index into the cue list, for keying UI. */
  index: number;
};

/**
 * The next cue at or ahead of the user.
 *
 * A cue stays active until it is passed by more than `passedSlackM`, so a
 * "turn left" does not vanish the instant the GPS crosses the corner, which is
 * exactly when the user is looking at the screen to confirm the turn.
 */
export function activeCue(
  alongMeters: number,
  cues: readonly RouteCue[],
  passedSlackM = 10,
): ActiveCue | null {
  for (let i = 0; i < cues.length; i++) {
    const cue = cues[i] as RouteCue;
    if (cue.atMeters >= alongMeters - passedSlackM) {
      return { cue, metersToCue: Math.max(0, cue.atMeters - alongMeters), index: i };
    }
  }
  return null;
}

/** Arrival phases, so the UI can hand off to indoor guidance at the right moment. */
export type ArrivalPhase = "travelling" | "approaching" | "arrived";

/** Inside this, "walk 40 m" is noise; the building is already in view. */
export const APPROACHING_M = 60;
export const ARRIVED_M = 20;

export function arrivalPhase(remainingMeters: number): ArrivalPhase {
  if (remainingMeters <= ARRIVED_M) return "arrived";
  if (remainingMeters <= APPROACHING_M) return "approaching";
  return "travelling";
}

/**
 * Round a distance the way navigation apps do: precise when it matters, vague
 * when precision would be a lie. A GPS fix is not accurate to the metre at
 * 400 m out, and "in 400 m" reads as more honest than "in 412 m".
 */
export function formatCueDistance(meters: number): string {
  if (meters < 10) return "now";
  if (meters < 100) return `in ${Math.round(meters / 10) * 10} m`;
  if (meters < 1000) return `in ${Math.round(meters / 50) * 50} m`;
  return `in ${(meters / 1000).toFixed(1)} km`;
}
