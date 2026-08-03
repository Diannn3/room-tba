import { describe, expect, it } from "bun:test";
import {
  activeCue,
  arrivalPhase,
  buildCues,
  computeProgress,
  cumulativeDistances,
  formatCueDistance,
  isOffRoute,
  OFF_ROUTE_ENTER_M,
  type LngLat,
} from "./route-progress";

/**
 * An L-shaped route near the UPLB campus centre: ~100 m east, then ~100 m
 * north. Coordinates are [lon, lat]; at this latitude 0.001 deg lon is ~108 m
 * and 0.001 deg lat is ~111 m.
 */
const CORNER: LngLat = [121.2431, 14.1651];
const ROUTE: LngLat[] = [
  [121.2422, 14.1651],
  CORNER,
  [121.2431, 14.1661],
];

describe("cumulativeDistances", () => {
  it("starts at zero and increases monotonically", () => {
    const cum = cumulativeDistances(ROUTE);
    expect(cum).toHaveLength(ROUTE.length);
    expect(cum[0]).toBe(0);
    expect(cum[1]).toBeGreaterThan(0);
    expect(cum[2]).toBeGreaterThan(cum[1] as number);
  });
});

describe("computeProgress", () => {
  it("returns null for a route with no segment", () => {
    expect(computeProgress([121.24, 14.16], [])).toBeNull();
    expect(computeProgress([121.24, 14.16], [CORNER])).toBeNull();
  });

  it("snaps a point standing exactly on the line with no offset", () => {
    const progress = computeProgress(CORNER, ROUTE);
    expect(progress).not.toBeNull();
    expect(progress?.offsetMeters ?? 99).toBeLessThan(0.5);
  });

  it("reports remaining distance that shrinks as the user advances", () => {
    const start = computeProgress(ROUTE[0] as LngLat, ROUTE);
    const middle = computeProgress(CORNER, ROUTE);
    const end = computeProgress(ROUTE[2] as LngLat, ROUTE);
    expect(start?.remainingMeters ?? 0).toBeGreaterThan(
      middle?.remainingMeters ?? 0,
    );
    expect(middle?.remainingMeters ?? 0).toBeGreaterThan(
      end?.remainingMeters ?? 0,
    );
    expect(end?.remainingMeters ?? 99).toBeLessThan(1);
  });

  it("measures how far off the line a wandering user is", () => {
    // ~55 m north of the first (east-west) leg.
    const off = computeProgress([121.2426, 14.16560], ROUTE);
    expect(off?.offsetMeters ?? 0).toBeGreaterThan(40);
    expect(off?.offsetMeters ?? 0).toBeLessThan(70);
  });

  it("clamps to the segment instead of projecting past the route start", () => {
    // Well west of the start: the nearest point must be the start vertex.
    const before = computeProgress([121.2400, 14.1651], ROUTE);
    expect(before?.alongMeters ?? 99).toBeLessThan(0.5);
  });

  it("relocates a user who jumps rather than pinning them to a stale segment", () => {
    // A point on the second (north-bound) leg must snap there, not to leg one.
    const jumped = computeProgress([121.2431, 14.16585], ROUTE);
    expect(jumped?.segmentIndex).toBe(1);
  });
});

describe("isOffRoute", () => {
  it("needs a bigger error to leave the route than to rejoin it", () => {
    // 20 m: not enough to declare off-route from a clean state...
    expect(isOffRoute(20, false)).toBe(false);
    // ...but enough to stay off-route once already there. That gap is what
    // stops the banner flickering while the user stands still.
    expect(isOffRoute(20, true)).toBe(true);
  });

  it("declares off-route past the enter threshold", () => {
    expect(isOffRoute(OFF_ROUTE_ENTER_M + 5, false)).toBe(true);
  });

  it("rejoins the route once well back on the line", () => {
    expect(isOffRoute(5, true)).toBe(false);
  });

  it("does not accuse the user when the GPS fix itself is vague", () => {
    // 30 m off the line, but the fix is only accurate to 40 m: no evidence.
    expect(isOffRoute(30, false, 40)).toBe(false);
    // Same offset with a sharp fix is a real departure.
    expect(isOffRoute(30, false, 3)).toBe(true);
  });
});

describe("buildCues", () => {
  const describe_ = (s: { maneuver: string; modifier: string | null }) =>
    `${s.maneuver} ${s.modifier ?? ""}`.trim();

  it("pins each maneuver at the distance BEFORE its own leg", () => {
    // The classic off-by-one: a turn belongs at the running total so far, not
    // after adding its own length, or every instruction fires one turn late.
    const cues = buildCues(
      [
        { maneuver: "depart", modifier: null, meters: 100 },
        { maneuver: "turn", modifier: "left", meters: 50 },
        { maneuver: "arrive", modifier: null, meters: 0 },
      ],
      describe_,
    );
    expect(cues.map((c) => c.atMeters)).toEqual([0, 100, 150]);
  });
});

describe("activeCue", () => {
  const cues = [
    { atMeters: 0, text: "depart", modifier: null },
    { atMeters: 100, text: "turn left", modifier: "left" },
    { atMeters: 150, text: "arrive", modifier: null },
  ];

  it("counts down the distance to the next maneuver", () => {
    const active = activeCue(60, cues);
    expect(active?.cue.text).toBe("turn left");
    expect(active?.metersToCue).toBeCloseTo(40, 5);
  });

  it("keeps the turn on screen briefly after it is passed", () => {
    // 5 m past the corner: the user is mid-turn and still looking at the phone.
    expect(activeCue(105, cues)?.cue.text).toBe("turn left");
  });

  it("advances once the turn is properly behind them", () => {
    expect(activeCue(120, cues)?.cue.text).toBe("arrive");
  });

  it("returns null past the last cue", () => {
    expect(activeCue(500, cues)).toBeNull();
  });
});

describe("arrivalPhase", () => {
  it("moves from travelling to approaching to arrived", () => {
    expect(arrivalPhase(300)).toBe("travelling");
    expect(arrivalPhase(50)).toBe("approaching");
    expect(arrivalPhase(5)).toBe("arrived");
  });
});

describe("formatCueDistance", () => {
  it("rounds coarser as distance grows, and says 'now' up close", () => {
    expect(formatCueDistance(4)).toBe("now");
    expect(formatCueDistance(43)).toBe("in 40 m");
    expect(formatCueDistance(430)).toBe("in 450 m");
    expect(formatCueDistance(1240)).toBe("in 1.2 km");
  });
});
