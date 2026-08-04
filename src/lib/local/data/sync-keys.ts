/** LocalStorage sync-key helpers (no PGlite imports). */

/**
 * Every table tracked by a sync key. Single source of truth: the stored
 * default is built from this, and callers that invalidate "everything"
 * (Settings → Resync campus data) read it instead of hardcoding a subset that
 * silently rots when a table is added.
 */
export const SYNC_TABLE_NAMES = [
  "buildings",
  "colleges",
  "divisions",
  "rooms",
  "dorms",
  "classes",
  "final_exams",
  "events",
  "organizations",
  "places",
  "announcements",
] as const;

function emptySyncKeys(): string {
  return JSON.stringify(
    Object.fromEntries(SYNC_TABLE_NAMES.map((table) => [table, ""])),
  );
}

export function getSyncKeysFromLs(): {
  [key: string]: string;
} | null {
  const lsStore = localStorage.getItem("sync-key");

  if (lsStore === null) {
    localStorage.setItem("sync-key", emptySyncKeys());
    return null;
  }

  try {
    const keys = JSON.parse(lsStore);
    if (typeof keys === "object" && "buildings" in keys) {
      return keys as {
        [key: string]: string;
      };
    } else {
      return null;
    }
  } catch {
    console.error("Error: the sync keys in the localStorage was corrupted");
    localStorage.setItem("sync-key", emptySyncKeys());
    return null;
  }
}
