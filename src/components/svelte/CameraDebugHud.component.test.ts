import { render, screen } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { mapStore, mapViewStore } from "@lib/store.svelte";
import {
  expectNoHorizontalOverflow,
  mountAtWidth,
} from "@test/layout-assertions";
import CameraDebugHud from "./CameraDebugHud.svelte";

type Handler = () => void;

function fakeMap(values: {
  zoom: number;
  pitch: number;
  bearing: number;
  lat: number;
  lng: number;
}) {
  const handlers = new Map<string, Handler>();
  const off = vi.fn((event: string) => handlers.delete(event));
  return {
    values,
    handlers,
    off,
    instance: {
      getZoom: () => values.zoom,
      getPitch: () => values.pitch,
      getBearing: () => values.bearing,
      getCenter: () => ({ lat: values.lat, lng: values.lng }),
      on: (event: string, handler: Handler) => handlers.set(event, handler),
      off,
    } as never,
  };
}

describe("CameraDebugHud", () => {
  beforeEach(() => {
    mapViewStore.cameraDebug = true;
  });

  afterEach(() => {
    mapStore.mapInstance = undefined;
    mapViewStore.cameraDebug = false;
  });

  test.each([320, 768])("fits without horizontal overflow at %ipx", (width) => {
    mapStore.mapInstance = fakeMap({
      zoom: 16.2,
      pitch: 48,
      bearing: 322.5,
      lat: 14.16512,
      lng: 121.24138,
    }).instance;
    mountAtWidth(width);
    const { container } = render(CameraDebugHud);
    expectNoHorizontalOverflow(container as HTMLElement);
  });

  test("renders the camera values and updates on map events", async () => {
    const map = fakeMap({
      zoom: 16.204,
      pitch: 48.04,
      bearing: 322.51,
      lat: 14.16512,
      lng: 121.24138,
    });
    mapStore.mapInstance = map.instance;
    render(CameraDebugHud);

    expect(screen.getByText("16.20")).toBeInTheDocument();
    expect(screen.getByText("48.0°")).toBeInTheDocument();
    expect(screen.getByText("322.5°")).toBeInTheDocument();
    expect(screen.getByText("14.16512, 121.24138")).toBeInTheDocument();

    map.values.zoom = 17.5;
    map.handlers.get("move")?.();
    expect(await screen.findByText("17.50")).toBeInTheDocument();
  });

  test("close button turns the readout off; unmount unsubscribes", () => {
    const map = fakeMap({
      zoom: 16,
      pitch: 0,
      bearing: 0,
      lat: 14.165,
      lng: 121.243,
    });
    mapStore.mapInstance = map.instance;
    const { unmount } = render(CameraDebugHud);

    screen.getByRole("button", { name: /hide camera details/i }).click();
    expect(mapViewStore.cameraDebug).toBe(false);

    unmount();
    const offEvents = map.off.mock.calls.map((call) => call[0]).sort();
    expect(offEvents).toEqual(["move", "pitch", "rotate", "zoom"]);
  });
});
