import { render, screen } from "@testing-library/svelte";
import { describe, expect, test, vi } from "vitest";
import BottomSheetHost from "../../test/components/BottomSheetHost.svelte";

/**
 * Regression cover for #966: the sheet used to lay a full-bleed "Close
 * details" button across the whole root, so every tap, pan and pinch on the
 * map strip above the sheet hit that button instead of the map. Details were
 * readable but the map underneath was inert.
 */
describe("bottom sheet does not capture the map", () => {
  test("renders no full-bleed dismiss overlay over the map strip", () => {
    render(BottomSheetHost, { open: true });

    expect(screen.queryByRole("button", { name: "Close details" })).toBeNull();
    expect(document.querySelector(".bottom-sheet__scrim")).toBeNull();
  });

  test("the root lets pointer events through; only the sheet takes them", () => {
    const { container } = render(BottomSheetHost, { open: true });

    const root = container.querySelector(".bottom-sheet-root");
    const sheet = container.querySelector(".bottom-sheet");
    expect(root).not.toBeNull();
    expect(sheet).not.toBeNull();

    // Scoped <style> is not applied by happy-dom, so assert on the contract
    // that matters instead: nothing between the root and the sheet claims the
    // area above the sheet.
    const interactiveChildren = Array.from(root?.children ?? []).filter(
      (child) => !child.classList.contains("bottom-sheet"),
    );
    expect(interactiveChildren).toEqual([]);
  });

  test("dismissal is still reachable from the drag handle", () => {
    render(BottomSheetHost, { open: true });

    expect(
      screen.getByRole("button", { name: /Expand details|Collapse details/ }),
    ).toBeVisible();
  });

  test("renders nothing at all when closed", () => {
    const { container } = render(BottomSheetHost, { open: false });
    expect(container.querySelector(".bottom-sheet-root")).toBeNull();
  });

  test("a drag down past the dismiss threshold still dismisses", async () => {
    const onDismiss = vi.fn();
    const { container } = render(BottomSheetHost, { open: true, onDismiss });

    const sheet = container.querySelector(".bottom-sheet") as HTMLElement;
    const handle = container.querySelector(
      ".bottom-sheet__handle",
    ) as HTMLElement;

    handle.dispatchEvent(
      new PointerEvent("pointerdown", {
        clientY: 100,
        bubbles: true,
        pointerId: 1,
      }),
    );
    sheet.dispatchEvent(
      new PointerEvent("pointermove", {
        clientY: 400,
        bubbles: true,
        pointerId: 1,
      }),
    );
    sheet.dispatchEvent(
      new PointerEvent("pointerup", {
        clientY: 400,
        bubbles: true,
        pointerId: 1,
      }),
    );

    expect(onDismiss).toHaveBeenCalled();
  });
});
