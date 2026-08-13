import { fireEvent, render, screen } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { mapStore, mapViewStore } from "@lib/store.svelte";
import MapContextMenu from "./MapContextMenu.svelte";

type ContextHandler = (event: {
  lngLat: { lat: number; lng: number };
  originalEvent: {
    clientX: number;
    clientY: number;
    preventDefault: () => void;
  };
}) => void;

function fakeMap() {
  let contextHandler: ContextHandler | undefined;
  const off = vi.fn();
  return {
    fire: (lat: number, lng: number, x = 200, y = 150) =>
      contextHandler?.({
        lngLat: { lat, lng },
        originalEvent: { clientX: x, clientY: y, preventDefault: vi.fn() },
      }),
    off,
    instance: {
      on: (event: string, handler: ContextHandler) => {
        if (event === "contextmenu") contextHandler = handler;
      },
      off,
    } as never,
  };
}

describe("MapContextMenu", () => {
  beforeEach(() => {
    localStorage.removeItem("camera-debug");
    mapViewStore.cameraDebug = false;
  });

  afterEach(() => {
    mapStore.mapInstance = undefined;
    mapViewStore.cameraDebug = false;
    localStorage.removeItem("camera-debug");
  });

  test("right-click opens the dialog with the clicked coordinates", async () => {
    const map = fakeMap();
    mapStore.mapInstance = map.instance;
    render(MapContextMenu);

    expect(screen.queryByRole("dialog", { name: "Map options" })).toBeNull();
    map.fire(14.16512, 121.24138);
    expect(
      await screen.findByRole("dialog", { name: "Map options" }),
    ).toBeInTheDocument();
    expect(screen.getByText("14.16512, 121.24138")).toBeInTheDocument();
  });

  test("checkbox reflects and toggles the camera debug flag", async () => {
    const map = fakeMap();
    mapStore.mapInstance = map.instance;
    render(MapContextMenu);
    map.fire(14.165, 121.243);

    const checkbox = await screen.findByRole("checkbox", {
      name: /show camera details/i,
    });
    expect((checkbox as HTMLInputElement).checked).toBe(false);
    await fireEvent.click(checkbox);
    expect(mapViewStore.cameraDebug).toBe(true);
  });

  test("Escape closes the menu; unmount unsubscribes", async () => {
    const map = fakeMap();
    mapStore.mapInstance = map.instance;
    const { unmount } = render(MapContextMenu);
    map.fire(14.165, 121.243);

    const dialog = await screen.findByRole("dialog", { name: "Map options" });
    await fireEvent.keyDown(dialog, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Map options" })).toBeNull();

    unmount();
    expect(map.off).toHaveBeenCalledWith("contextmenu", expect.any(Function));
  });

  test("outside pointerdown closes the menu", async () => {
    const map = fakeMap();
    mapStore.mapInstance = map.instance;
    render(MapContextMenu);
    map.fire(14.165, 121.243);
    await screen.findByRole("dialog", { name: "Map options" });

    await fireEvent.pointerDown(document.body);
    expect(screen.queryByRole("dialog", { name: "Map options" })).toBeNull();
  });
});
