import { describe, expect, test } from "bun:test";
import {
  computeDirectionsFitExtents,
  directionsEdgeCamera,
  directionsFitPaddingFromRects,
  estimateDestinationLabelHalfWidthPx,
} from "./directions-fit";

describe("computeDirectionsFitExtents", () => {
  test("expands west by GPS accuracy when destination is east", () => {
    const e = computeDirectionsFitExtents({
      origin: { lng: 121.24, lat: 14.16 },
      destination: { lng: 121.245, lat: 14.165 },
      accuracyMeters: 40,
    });
    expect(e.destOnRight).toBe(true);
    expect(e.west).toBeLessThan(121.24 - 0.0002);
    expect(e.east).toBeCloseTo(121.245, 5);
  });

  test("marks destOnRight false when destination is west of origin", () => {
    const e = computeDirectionsFitExtents({
      origin: { lng: 121.25, lat: 14.16 },
      destination: { lng: 121.24, lat: 14.161 },
      accuracyMeters: 20,
    });
    expect(e.destOnRight).toBe(false);
    expect(e.east).toBeGreaterThan(121.25);
  });

  test("ignores a winding polyline by not taking extra points", () => {
    const e = computeDirectionsFitExtents({
      origin: { lng: 121.24, lat: 14.16 },
      destination: { lng: 121.241, lat: 14.161 },
      accuracyMeters: 0,
    });
    // Lat span stays near the two endpoints, not a long detour.
    expect(e.north - e.south).toBeLessThan(0.002);
  });
});

describe("estimateDestinationLabelHalfWidthPx", () => {
  test("scales with label length", () => {
    expect(
      estimateDestinationLabelHalfWidthPx("Old Math/Old Rural Building"),
    ).toBeGreaterThan(estimateDestinationLabelHalfWidthPx("Pool"));
  });
});

describe("directionsFitPaddingFromRects", () => {
  test("pads the destination side for the name tag", () => {
    const rightDest = directionsFitPaddingFromRects(
      { top: 0, bottom: 800, left: 0, right: 360, width: 360, height: 800 },
      {
        topBottom: 160,
        coverBottom: 480,
        destinationLabelHalfWidthPx: 70,
        destOnRight: true,
        edgeGutterPx: 2,
      },
    );
    expect(rightDest.left).toBe(2);
    expect(rightDest.right).toBe(72);

    const leftDest = directionsFitPaddingFromRects(
      { top: 0, bottom: 800, left: 0, right: 360, width: 360, height: 800 },
      {
        topBottom: 160,
        coverBottom: 480,
        destinationLabelHalfWidthPx: 70,
        destOnRight: false,
        edgeGutterPx: 2,
      },
    );
    expect(leftDest.left).toBe(72);
    expect(leftDest.right).toBe(2);
  });
});

describe("directionsEdgeCamera", () => {
  test("uses width-only cameraForBounds zoom and trip midpoint", () => {
    const map = {
      cameraForBounds: () => ({
        center: { lng: 121.242, lat: 14.162 },
        zoom: 16.4,
      }),
    };
    const cam = directionsEdgeCamera(
      map,
      {
        west: 121.24,
        east: 121.245,
        south: 14.16,
        north: 14.165,
        destOnRight: true,
      },
      { top: 100, bottom: 200, left: 2, right: 60 },
    );
    expect(cam.zoom).toBe(16.4);
    expect(cam.center[0]).toBeCloseTo(121.2425, 5);
    expect(cam.center[1]).toBeCloseTo(14.1625, 5);
  });
});
