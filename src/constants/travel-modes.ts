/**
 * Travel-time calibration knobs for the campus path network (#847, #848).
 *
 * ponytail: flat per-mode speeds, no slope/surface factors; calibrate here
 * against real campus timings (walk speed matches the research notebook),
 * and fold into campus.config.ts if per-campus config sections land (#844).
 */

export const WALK_KPH = 4.5;
export const CYCLE_KPH = 15;
/** Campus posted limit; caps tagged maxspeed and fills in untagged edges. */
export const DRIVE_CAP_KPH = 30;

/** OSM highway classes cars / e-bikes may use; everything else is footpath. */
export const DRIVE_HIGHWAY_CLASSES: ReadonlySet<string> = new Set([
  "service",
  "tertiary",
  "residential",
  "unclassified",
]);

/** Cycling skips stairs. */
export const CYCLE_EXCLUDED_CLASS = "steps";

/** Isochrone color ramp caps here; farther edges keep the last color. */
export const ISOCHRONE_CAP_MINUTES = 30;

/**
 * Campus jeepney knobs for multi-modal journey planning (#966).
 *
 * ponytail: flat averages, no timetable — the campus jeeps run on headway, not
 * a published schedule, so a planned trip can only ever be indicative. Every
 * number here is a stated assumption the UI surfaces rather than hides.
 */

/** Door-to-door average including stops, not the cruising speed. */
export const JEEPNEY_KPH = 14;

/**
 * Average wait at a stop. Campus jeeps are frequency-based; half a ~10 min
 * headway is the standard expected-wait approximation.
 */
export const JEEPNEY_WAIT_SECONDS = 5 * 60;

/** Beyond this, walking to a stop costs more than the ride saves. */
export const MAX_ACCESS_WALK_METERS = 900;

/**
 * How far a stop may sit from the nearest walk-graph node and still count as
 * served by it. Snapping is unconditional, so without this a stop off the
 * mapped network silently inherits its neighbour's walk time and looks
 * reachable when there is no path to it at all.
 */
export const STOP_SNAP_TOLERANCE_METERS = 120;

/**
 * The same guard for trip endpoints, but looser: a GPS fix indoors or a pin
 * dropped mid-building is legitimately off-path, whereas the town-side stops
 * sit over a kilometre outside the mapped campus. Past this we cannot plan
 * honestly, and saying so beats inventing a walk from the nearest node.
 */
export const ENDPOINT_SNAP_TOLERANCE_METERS = 250;

/**
 * Drop a ride that only beats walking by less than this — a jeep that saves
 * two minutes is not worth the wait, and offering it reads as noise.
 */
export const MIN_RIDE_SAVING_SECONDS = 3 * 60;

/** Walk plus at most three ride variants, matching the GMaps option list. */
export const MAX_JOURNEY_OPTIONS = 4;

/** Standard viridis ramp (8 stops, matplotlib): near = dark purple, far = yellow. */
export const VIRIDIS_STOPS = [
  "#440154",
  "#46327e",
  "#365c8d",
  "#277f8e",
  "#1fa187",
  "#4ac16d",
  "#a0da39",
  "#fde725",
] as const;
