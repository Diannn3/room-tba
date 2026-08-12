export type LandingModalAutoOpenInput = {
  /** Set after the one-time bootstrap auto-open has run. */
  consumed: boolean;
  phase: string;
  suppressLandingModal: boolean;
  hideLandingModal: boolean;
  modalOpen: boolean;
};

/**
 * Whether the welcome modal should auto-open once per browser (#302).
 *
 * Opens as soon as the app is interactive rather than waiting for phase
 * "ready": on slow networks "ready" lands 5-10s after first paint, so the
 * modal used to pop up mid-interaction and swallow clicks. Only the error
 * phase blocks it (the error overlay owns the screen then).
 */
export function shouldAutoOpenLandingModal(
  input: LandingModalAutoOpenInput,
): boolean {
  if (input.consumed) return false;
  if (input.phase === "error") return false;
  if (input.suppressLandingModal) return false;
  if (input.hideLandingModal) return false;
  if (input.modalOpen) return false;
  return true;
}
