import { describe, expect, it } from "bun:test";
import { shouldAutoOpenLandingModal } from "./landing-modal-auto-open";

describe("shouldAutoOpenLandingModal", () => {
  const ready = {
    consumed: false,
    phase: "ready",
    suppressLandingModal: false,
    hideLandingModal: false,
    modalOpen: false,
  };

  it("opens once when bootstrap is ready", () => {
    expect(shouldAutoOpenLandingModal(ready)).toBe(true);
  });

  it("opens while data is still loading (no waiting for phase ready)", () => {
    expect(shouldAutoOpenLandingModal({ ...ready, phase: "remote" })).toBe(
      true,
    );
    expect(shouldAutoOpenLandingModal({ ...ready, phase: "sync" })).toBe(true);
  });

  it("stays closed on the bootstrap error overlay", () => {
    expect(shouldAutoOpenLandingModal({ ...ready, phase: "error" })).toBe(
      false,
    );
  });

  it("does not reopen after the auto-open slot was consumed", () => {
    expect(shouldAutoOpenLandingModal({ ...ready, consumed: true })).toBe(
      false,
    );
  });

  it("does not reopen when the user closes the modal", () => {
    expect(
      shouldAutoOpenLandingModal({
        ...ready,
        consumed: true,
        modalOpen: false,
      }),
    ).toBe(false);
  });

  it("respects hideLandingModal", () => {
    expect(
      shouldAutoOpenLandingModal({ ...ready, hideLandingModal: true }),
    ).toBe(false);
  });
});
