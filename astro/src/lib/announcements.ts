/**
 * In-app announcements (#777): publish-window filtering, unread state, and
 * date labels. Pure helpers only — the API route, the offline cache reader and
 * the panel all run the *same* filter so a cached row that expired while the
 * user was offline stops showing without a refetch.
 *
 * `starts_on` / `ends_on` are campus wall-clock strings, like events.
 */
import { campusWallTimeToInstant } from "./event-time";

/** Minimal shape the window/unread helpers need (row or draft). */
export type AnnouncementWindow = {
  startsOn: string;
  endsOn: string | null;
};

function instant(value: string): number {
  return campusWallTimeToInstant(value).getTime();
}

/** Live right now: started, and not yet ended (null end = open-ended). */
export function isPublished(
  row: AnnouncementWindow,
  now: Date = new Date(),
): boolean {
  const startedAt = instant(row.startsOn);
  if (Number.isNaN(startedAt) || startedAt > now.getTime()) return false;
  if (row.endsOn === null) return true;
  const endedAt = instant(row.endsOn);
  // An unparseable end date must not hide the notice; treat it as open-ended.
  if (Number.isNaN(endedAt)) return true;
  return endedAt > now.getTime();
}

/** A wall-clock string Postgres will accept, or null when unusable. */
export function parseWallTimestamp(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const trimmed = value.trim();
  return Number.isNaN(instant(trimmed)) ? null : trimmed;
}

/** Newest first by publish time; `id` breaks ties so the order is stable. */
export function sortNewestFirst<T extends AnnouncementWindow & { id: number }>(
  rows: T[],
): T[] {
  return [...rows].sort(
    (a, b) => instant(b.startsOn) - instant(a.startsOn) || b.id - a.id,
  );
}

/** Currently-published rows, newest first. */
export function filterPublished<T extends AnnouncementWindow & { id: number }>(
  rows: T[],
  now: Date = new Date(),
): T[] {
  return sortNewestFirst(rows.filter((row) => isPublished(row, now)));
}

/**
 * Rows published after the user last opened the panel. `lastSeenAt` is an
 * epoch ms stamp (0 = never opened, so everything live counts as unread).
 */
export function unreadAnnouncements<T extends AnnouncementWindow>(
  rows: T[],
  lastSeenAt: number,
): T[] {
  return rows.filter((row) => {
    const startedAt = instant(row.startsOn);
    return !Number.isNaN(startedAt) && startedAt > lastSeenAt;
  });
}

export function unreadCount(
  rows: AnnouncementWindow[],
  lastSeenAt: number,
): number {
  return unreadAnnouncements(rows, lastSeenAt).length;
}

/**
 * Stamp to persist once the panel has been read: the newest publish time in
 * the list, never rewinding past `previous`. Deliberately not `Date.now()` —
 * a back-dated announcement published after the last read would otherwise
 * land silently below the stamp and never raise the badge.
 */
export function seenStampFor(rows: AnnouncementWindow[], previous = 0): number {
  return rows.reduce((max, row) => {
    const startedAt = instant(row.startsOn);
    return Number.isNaN(startedAt) ? max : Math.max(max, startedAt);
  }, previous);
}

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 60 * 60 * 1000],
  ["month", 30 * 24 * 60 * 60 * 1000],
  ["week", 7 * 24 * 60 * 60 * 1000],
  ["day", 24 * 60 * 60 * 1000],
  ["hour", 60 * 60 * 1000],
  ["minute", 60 * 1000],
];

/** "3 days ago" / "in 2 hours" from a stored campus wall-clock string. */
export function relativeDateLabel(
  value: string,
  now: Date = new Date(),
): string {
  const at = instant(value);
  if (Number.isNaN(at)) return "";
  const diff = at - now.getTime();
  const format = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  for (const [unit, ms] of RELATIVE_UNITS) {
    if (Math.abs(diff) >= ms) return format.format(Math.round(diff / ms), unit);
  }
  return format.format(Math.round(diff / 1000), "second");
}
