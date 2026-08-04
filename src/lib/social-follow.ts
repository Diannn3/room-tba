/**
 * One-time "follow the UPLB Tools accounts" suggestion.
 *
 * The whole point of this module is the frequency cap: the app asks once. Both
 * outcomes retire the prompt for good — dismissing it because the reader said
 * no, opening an account because the reader said yes. There is no snooze, no
 * timer, and no second ask, so this is deliberately a one-way switch with no
 * un-retire function.
 *
 * The key is in `PRESERVED_LOCAL_KEYS` (`src/lib/local/clear-cached-data.ts`)
 * alongside `hideLandingModal`: "stop showing me this" is a preference, and
 * clearing a broken bundle's cache must not resurrect it.
 */

export const FOLLOW_PROMPT_KEY = "social-follow-prompt";

export type FollowPromptOutcome = "dismissed" | "followed";

/** True once the reader has dismissed or acted on the prompt, on any visit. */
export function isFollowPromptRetired(): boolean {
  try {
    return localStorage.getItem(FOLLOW_PROMPT_KEY) !== null;
  } catch {
    // SSR, or storage blocked. Never treat "cannot read" as "already asked".
    return false;
  }
}

/** Retire the prompt permanently. Idempotent. */
export function retireFollowPrompt(outcome: FollowPromptOutcome): void {
  try {
    localStorage.setItem(FOLLOW_PROMPT_KEY, outcome);
  } catch {
    // Private mode / storage full: the dismissal cannot be remembered. Nothing
    // to fall back to, and a silent failure beats blocking the click.
  }
}
