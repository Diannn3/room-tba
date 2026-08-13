import { expect, test } from "@playwright/test";
import { waitForAppBoot } from "../helpers/app";

// #964: camera debug mode — right-click the map for the options menu, toggle
// the live camera HUD, and confirm Escape/close behavior. First right-click
// spec in the suite; MapLibre fires `contextmenu` for Playwright's right click.
test.describe("map camera debug @advisory", () => {
  test("right-click toggles the camera HUD; Escape and close work", async ({
    page,
  }) => {
    const pageErrors: Error[] = [];
    page.on("pageerror", (error) => pageErrors.push(error));

    await page.goto("/");
    await waitForAppBoot(page);

    const canvas = page.locator(".maplibregl-canvas");
    await expect(canvas).toBeVisible({ timeout: 20_000 });
    const box = await canvas.boundingBox();
    if (!box) throw new Error("map canvas has no bounding box");

    // Off-center to dodge entity pins layered over the canvas middle.
    const position = { x: box.width * 0.35, y: box.height * 0.35 };
    await canvas.click({ button: "right", position });

    const menu = page.getByRole("dialog", { name: "Map options" });
    await expect(menu).toBeVisible();
    // Footnote shows the clicked coordinates (lat, lng to 5 decimals).
    await expect(menu.getByText(/^1?\d\.\d{5}, 1\d{2}\.\d{5}$/)).toBeVisible();

    await menu.getByRole("checkbox", { name: /show camera details/i }).check();

    const hud = page.getByRole("region", { name: "Camera details" });
    await expect(hud).toBeVisible();
    await expect(hud.getByText(/^\d+\.\d{2}$/)).toBeVisible(); // zoom

    // Escape closes the menu, HUD stays.
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
    await expect(hud).toBeVisible();

    // HUD close button turns the readout off.
    await hud.getByRole("button", { name: /hide camera details/i }).click();
    await expect(hud).toBeHidden();

    expect(pageErrors).toEqual([]);
  });
});
