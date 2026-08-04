import { render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, test, vi } from "vitest";
import SettingsModalHost from "@test/components/SettingsModalHost.svelte";
import {
  expectNoHorizontalOverflow,
  mountAtWidth,
} from "@test/layout-assertions";

const clearCachedData = vi.hoisted(() => vi.fn(async () => {}));
vi.mock("@lib/local/clear-cached-data", () => ({ clearCachedData }));

const reload = vi.fn();

const clearButton = () =>
  screen.getByRole("button", { name: "Clear cached data and reload" });

describe("SettingsModal", () => {
  test("renders every section at 320px without horizontal overflow", () => {
    mountAtWidth(320);
    const { container } = render(SettingsModalHost);

    expect(screen.getByRole("heading", { name: "Settings" })).toBeVisible();
    // Transit moved to the sidebar's Jeepney routes browse panel.
    for (const section of ["View", "Terrain", "Schedule", "Storage"]) {
      expect(
        screen.getByRole("heading", { name: section }),
      ).toBeInTheDocument();
    }
    expectNoHorizontalOverflow(container);
  });
});

describe("SettingsModal storage section (#865)", () => {
  beforeEach(() => {
    clearCachedData.mockReset();
    clearCachedData.mockImplementation(async () => {});
    reload.mockClear();
    vi.spyOn(window.location, "reload").mockImplementation(reload);
  });

  test("promises the user's plans survive", () => {
    render(SettingsModalHost);

    expect(screen.getByText(/Your saved class plans stay/)).toBeInTheDocument();
    expect(clearButton()).toBeInTheDocument();
  });

  test("the first click only asks; it clears nothing", async () => {
    render(SettingsModalHost);

    clearButton().click();
    await Promise.resolve();

    expect(clearCachedData).not.toHaveBeenCalled();
    expect(
      screen.getByText(/Downloaded offline maps go too/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Clear and reload" }),
    ).toBeInTheDocument();
  });

  test("moves focus to the confirm so keyboard users are not dropped on <body>", async () => {
    render(SettingsModalHost);

    clearButton().click();
    const confirm = await screen.findByRole("button", {
      name: "Clear and reload",
    });
    await vi.waitFor(() => expect(document.activeElement).toBe(confirm));
    expect(confirm.getAttribute("aria-describedby")).toBe(
      "settings-storage-warning",
    );
  });

  test("cancel backs out without clearing", async () => {
    render(SettingsModalHost);

    clearButton().click();
    await Promise.resolve();
    screen.getByRole("button", { name: "Cancel" }).click();
    await Promise.resolve();

    expect(clearCachedData).not.toHaveBeenCalled();
    expect(clearButton()).toBeInTheDocument();
  });

  test("confirming clears and reloads", async () => {
    render(SettingsModalHost);

    clearButton().click();
    await Promise.resolve();
    screen.getByRole("button", { name: "Clear and reload" }).click();

    await vi.waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
    expect(clearCachedData).toHaveBeenCalledTimes(1);
  });

  test("disables the buttons while clearing and ignores a second click", async () => {
    let finish = () => {};
    clearCachedData.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    render(SettingsModalHost);

    clearButton().click();
    await Promise.resolve();
    screen.getByRole("button", { name: "Clear and reload" }).click();

    const busy = await screen.findByRole("button", { name: "Clearing…" });
    expect((busy as HTMLButtonElement).disabled).toBe(true);
    expect(
      (screen.getByRole("button", { name: "Cancel" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);

    busy.click();
    expect(clearCachedData).toHaveBeenCalledTimes(1);

    finish();
    await vi.waitFor(() => expect(reload).toHaveBeenCalled());
  });
});
