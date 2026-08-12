import { afterEach, describe, expect, it } from "vitest";
import { trapFocus } from "./focus-trap";

function dialogWithButtons(): HTMLElement {
  const container = document.createElement("div");
  const first = document.createElement("button");
  first.textContent = "first";
  const last = document.createElement("button");
  last.textContent = "last";
  container.append(first, last);
  document.body.append(container);
  return container;
}

function pressEscape(target: EventTarget = document.body) {
  target.dispatchEvent(
    new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
  );
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("trapFocus", () => {
  it("fires onEscape even when focus sits outside the container", () => {
    // The app menu restores focus to its trigger after opening a modal, so
    // Escape must be caught at the document level, not on the container.
    const outside = document.createElement("button");
    document.body.append(outside);
    const container = dialogWithButtons();
    let escaped = 0;
    const release = trapFocus(container, { onEscape: () => escaped++ });

    outside.focus();
    pressEscape(outside);

    expect(escaped).toBe(1);
    release();
  });

  it("routes Escape to the innermost trap only, and back after release", () => {
    const outerEl = dialogWithButtons();
    const innerEl = dialogWithButtons();
    const hits: string[] = [];
    const releaseOuter = trapFocus(outerEl, {
      onEscape: () => hits.push("outer"),
    });
    const releaseInner = trapFocus(innerEl, {
      onEscape: () => hits.push("inner"),
    });

    pressEscape();
    expect(hits).toEqual(["inner"]);

    releaseInner();
    pressEscape();
    expect(hits).toEqual(["inner", "outer"]);
    releaseOuter();
  });

  it("stops handling after release and restores previous focus", async () => {
    const outside = document.createElement("button");
    document.body.append(outside);
    outside.focus();

    const container = dialogWithButtons();
    let escaped = 0;
    const release = trapFocus(container, { onEscape: () => escaped++ });
    await Promise.resolve(); // initial-focus microtask
    expect(container.contains(document.activeElement)).toBe(true);

    release();
    pressEscape();
    expect(escaped).toBe(0);
    expect(document.activeElement).toBe(outside);
  });
});
