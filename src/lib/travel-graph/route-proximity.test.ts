import { describe, expect, test } from "bun:test";
import {
  DIRECTIONS_ROUTE_PIN_BUFFER_M,
  distanceToPolylineMeters,
  isNearRoute,
  journeyLineCoordinates,
} from "./route-proximity";

describe("distanceToPolylineMeters", () => {
  test("returns 0 for a vertex on the line", () => {
    const line: [number, number][] = [
      [121.24, 14.16],
      [121.241, 14.16],
      [121.241, 14.161],
    ];
    expect(
      distanceToPolylineMeters({ lat: 14.16, lon: 121.24 }, line),
    ).toBeLessThan(1);
  });

  test("is small for a point beside the middle of a segment", () => {
    const line: [number, number][] = [
      [121.24, 14.16],
      [121.242, 14.16],
    ];
    // ~11 m north of the mid-point
    const midLon = 121.241;
    const near = { lat: 14.16 + 11 / 111_320, lon: midLon };
    const d = distanceToPolylineMeters(near, line);
    expect(d).toBeGreaterThan(8);
    expect(d).toBeLessThan(15);
  });

  test("isNearRoute uses the 25 m buffer", () => {
    const line: [number, number][] = [
      [121.24, 14.16],
      [121.242, 14.16],
    ];
    const close = {
      lat: 14.16 + 10 / 111_320,
      lon: 121.241,
    };
    const far = {
      lat: 14.16 + 80 / 111_320,
      lon: 121.241,
    };
    expect(isNearRoute(close, line)).toBe(true);
    expect(isNearRoute(far, line)).toBe(false);
    expect(DIRECTIONS_ROUTE_PIN_BUFFER_M).toBe(25);
  });
});

describe("journeyLineCoordinates", () => {
  test("joins legs without duplicating the shared vertex", () => {
    const coords = journeyLineCoordinates([
      {
        coordinates: [
          [121.24, 14.16],
          [121.241, 14.16],
        ],
      },
      {
        coordinates: [
          [121.241, 14.16],
          [121.241, 14.161],
        ],
      },
    ]);
    expect(coords).toEqual([
      [121.24, 14.16],
      [121.241, 14.16],
      [121.241, 14.161],
    ]);
  });
});
