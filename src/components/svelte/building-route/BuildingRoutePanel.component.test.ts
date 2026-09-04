import { fireEvent, render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  expectNoHorizontalOverflow,
  mountAtWidth,
} from "@test/layout-assertions";
import { buildingRouteStore } from "@lib/stores/building-route-store.svelte";
import BuildingRoutePanel from "./BuildingRoutePanel.svelte";

const { buildingRows } = vi.hoisted(() => ({
  buildingRows: [
    {
      id: 31,
      buildingName: "New Math Building",
      lat: 14.1646268,
      lon: 121.2436644,
    },
    {
      id: 35,
      buildingName: "Physical Sciences Building",
      lat: 14.1643788,
      lon: 121.2418036,
    },
  ],
}));

vi.mock("@lib/context", () => ({
  getAppData: () => () => ({
    buildings: buildingRows,
    colleges: [],
    divisions: [],
    dorms: [],
    events: [],
    organizations: [],
    places: [],
    totalRooms: 0,
    directionCount: 0,
    loaded: true,
  }),
}));

describe("BuildingRoutePanel", () => {
  beforeEach(() => buildingRouteStore.close());

  test.each([320, 768])("fits the two-building picker at %ipx", (width) => {
    mountAtWidth(width);
    buildingRouteStore.open();
    const { container } = render(BuildingRoutePanel);
    expect(screen.getByLabelText("From")).toBeVisible();
    expect(screen.getByLabelText("To")).toBeVisible();
    expectNoHorizontalOverflow(container as HTMLElement);
  });

  test("search suggestions contain buildings only", async () => {
    buildingRouteStore.open();
    render(BuildingRoutePanel);
    const from = screen.getByLabelText("From");
    await fireEvent.input(from, { target: { value: "math" } });
    expect(
      screen.getByRole("option", { name: "New Math Building" }),
    ).toBeVisible();
    expect(screen.queryByText("room")).toBeNull();
  });

  test("restores selected building names when the panel remounts", () => {
    buildingRouteStore.open();
    buildingRouteStore.origin = {
      id: 31,
      buildingName: "New Math Building",
      lat: 14.1646268,
      lon: 121.2436644,
    };
    buildingRouteStore.destination = {
      id: 35,
      buildingName: "Physical Sciences Building",
      lat: 14.1643788,
      lon: 121.2418036,
    };

    render(BuildingRoutePanel);
    expect(screen.getByLabelText("From")).toHaveValue("New Math Building");
    expect(screen.getByLabelText("To")).toHaveValue(
      "Physical Sciences Building",
    );
  });

  test("keyboard selection chooses a building without requiring a pointer", async () => {
    buildingRouteStore.open();
    render(BuildingRoutePanel);
    const from = screen.getByLabelText("From");
    await fireEvent.input(from, { target: { value: "math" } });
    await fireEvent.keyDown(from, { key: "Enter" });

    expect(buildingRouteStore.origin?.id).toBe(31);
    expect(from).toHaveValue("New Math Building");
  });

  test("empty suggestions stay safe under arrow-key navigation", async () => {
    buildingRouteStore.open();
    render(BuildingRoutePanel);
    const from = screen.getByLabelText("From");
    await fireEvent.input(from, { target: { value: "not-a-building" } });
    await fireEvent.keyDown(from, { key: "ArrowDown" });

    expect(screen.getByText("No matching buildings.")).toBeVisible();
    expect(from.getAttribute("aria-activedescendant")).not.toBe(
      "building-route-origin--1",
    );
  });

  test("shows connector-inclusive ETA and distance from the ready result", () => {
    buildingRouteStore.open();
    buildingRouteStore.origin = {
      id: 31,
      buildingName: "New Math Building",
      lat: 14.1646268,
      lon: 121.2436644,
    };
    buildingRouteStore.destination = {
      id: 35,
      buildingName: "Physical Sciences Building",
      lat: 14.1643788,
      lon: 121.2418036,
    };
    buildingRouteStore.phase = "ready";
    buildingRouteStore.result = {
      status: "ok",
      originBuildingId: 31,
      destinationBuildingId: 35,
      maxSnapMeters: 250,
      walkingSpeedKph: 4.5,
      originSnap: {
        nodeIndex: 1,
        snapMeters: 20,
        nodeCoordinate: [121.2435, 14.1646],
        endpointToNodeCoordinates: [
          [121.2436644, 14.1646268],
          [121.2435, 14.1646],
        ],
      },
      destinationSnap: {
        nodeIndex: 2,
        snapMeters: 10,
        nodeCoordinate: [121.2419, 14.1644],
        endpointToNodeCoordinates: [
          [121.2418036, 14.1643788],
          [121.2419, 14.1644],
        ],
      },
      route: {
        graphMeters: 270,
        graphSeconds: 216,
        totalMeters: 300,
        totalSeconds: 240,
        graphCoordinates: [
          [121.2435, 14.1646],
          [121.2419, 14.1644],
        ],
        originConnectorCoordinates: [
          [121.2436644, 14.1646268],
          [121.2435, 14.1646],
        ],
        destinationConnectorCoordinates: [
          [121.2419, 14.1644],
          [121.2418036, 14.1643788],
        ],
      },
    };

    render(BuildingRoutePanel);
    expect(screen.getByText("About 4 min walk")).toBeVisible();
    expect(screen.getByText("300 m")).toBeVisible();
    expect(screen.getByText(/approximate connectors/i)).toBeVisible();
  });
});
