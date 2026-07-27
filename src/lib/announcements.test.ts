import { describe, expect, test } from "bun:test";
import {
  filterPublished,
  isPublished,
  relativeDateLabel,
  seenStampFor,
  sortNewestFirst,
  unreadCount,
} from "./announcements.js";

// Stored strings are campus wall-clock (Asia/Manila, UTC+8), like events.
const NOW = new Date("2026-07-26T04:00:00Z"); // 12:00 noon in Manila

const row = (id: number, startsOn: string, endsOn: string | null = null) => ({
  id,
  startsOn,
  endsOn,
});

describe("publish window", () => {
  test("live: started, open-ended", () => {
    expect(isPublished(row(1, "2026-07-20 08:00:00"), NOW)).toBe(true);
  });

  test("future-dated rows are not published", () => {
    expect(isPublished(row(1, "2026-07-27 08:00:00"), NOW)).toBe(false);
    // Same day, later in the campus afternoon — must not leak early.
    expect(isPublished(row(1, "2026-07-26 18:00:00"), NOW)).toBe(false);
  });

  test("expired rows are not published", () => {
    expect(
      isPublished(row(1, "2026-07-01 08:00:00", "2026-07-25 08:00:00"), NOW),
    ).toBe(false);
  });

  test("wall-clock strings are read as campus time, not the runner's zone", () => {
    // 12:30 Manila is still ahead of noon Manila even though the process runs
    // in UTC, where a naive `new Date("2026-07-26 12:30:00")` would be past.
    expect(isPublished(row(1, "2026-07-26 12:30:00"), NOW)).toBe(false);
    expect(isPublished(row(1, "2026-07-26 11:30:00"), NOW)).toBe(true);
  });

  test("open window still running is published", () => {
    expect(
      isPublished(row(1, "2026-07-25 08:00:00", "2026-07-30 08:00:00"), NOW),
    ).toBe(true);
  });

  test("unparseable end date does not hide the notice", () => {
    expect(isPublished(row(1, "2026-07-20 08:00:00", "not a date"), NOW)).toBe(
      true,
    );
  });

  test("filterPublished drops future + expired and sorts newest first", () => {
    const rows = [
      row(1, "2026-07-10 08:00:00"),
      row(2, "2026-07-24 08:00:00"),
      row(3, "2026-08-01 08:00:00"), // future
      row(4, "2026-07-01 08:00:00", "2026-07-05 08:00:00"), // expired
    ];
    expect(filterPublished(rows, NOW).map((r) => r.id)).toEqual([2, 1]);
  });

  test("sortNewestFirst breaks ties on id and does not mutate the input", () => {
    const rows = [row(1, "2026-07-10 08:00:00"), row(2, "2026-07-10 08:00:00")];
    expect(sortNewestFirst(rows).map((r) => r.id)).toEqual([2, 1]);
    expect(rows.map((r) => r.id)).toEqual([1, 2]);
  });
});

describe("unread state", () => {
  const rows = [row(1, "2026-07-24 08:00:00"), row(2, "2026-07-20 08:00:00")];

  test("never opened: every live row is unread", () => {
    expect(unreadCount(rows, 0)).toBe(2);
  });

  test("badge clears after reading, and stays cleared", () => {
    const stamp = seenStampFor(rows);
    expect(unreadCount(rows, stamp)).toBe(0);
    expect(unreadCount(rows, seenStampFor(rows, stamp))).toBe(0);
  });

  test("a newer announcement re-raises the badge exactly once", () => {
    const stamp = seenStampFor(rows);
    const withNew = [...rows, row(3, "2026-07-26 09:00:00")];
    expect(unreadCount(withNew, stamp)).toBe(1);
    expect(unreadCount(withNew, seenStampFor(withNew, stamp))).toBe(0);
  });

  test("a back-dated announcement still raises the badge", () => {
    const stamp = seenStampFor(rows);
    const backdated = [...rows, row(3, "2026-07-25 08:00:00")];
    expect(unreadCount(backdated, stamp)).toBe(1);
  });

  test("the stamp never rewinds when the list shrinks", () => {
    const stamp = seenStampFor(rows);
    expect(seenStampFor([], stamp)).toBe(stamp);
  });
});

describe("relativeDateLabel", () => {
  test("past and future read naturally", () => {
    expect(relativeDateLabel("2026-07-24 12:00:00", NOW)).toBe("2 days ago");
    expect(relativeDateLabel("2026-07-26 15:00:00", NOW)).toBe("in 3 hours");
  });

  test("unparseable input yields no label", () => {
    expect(relativeDateLabel("", NOW)).toBe("");
  });
});
