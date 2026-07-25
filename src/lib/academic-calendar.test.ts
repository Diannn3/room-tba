import { describe, expect, it } from "bun:test";
import {
  buildYearTimeline,
  currentAcademicYearTerms,
  resolveTermWindow,
  termWindowStatus,
} from "./academic-calendar";
import type { Term } from "./types";

function term(id: number, overrides: Partial<Term> = {}): Term {
  return {
    id,
    label: `Term ${id}`,
    schoolYear: "2025-2026",
    semester: null,
    startsOn: null,
    endsOn: null,
    isDefault: false,
    isActive: true,
    sortOrder: id,
    classesImportedAt: null,
    version: 1,
    updatedAt: "2026-01-01",
    ...overrides,
  };
}

const manilaNoon = (isoDate: string) => new Date(`${isoDate}T12:00:00+08:00`);

describe("resolveTermWindow", () => {
  it("prefers DB starts_on/ends_on over the hand-kept constants", () => {
    const window = resolveTermWindow(
      term(1252, { startsOn: "2026-01-05", endsOn: "2026-05-20" }),
    );
    expect(window).toEqual({ startsOn: "2026-01-05", endsOn: "2026-05-20" });
  });

  it("falls back to TERM_CALENDAR_WINDOWS when DB dates are missing (#335)", () => {
    expect(resolveTermWindow(term(1253))).toEqual({
      startsOn: "2026-06-08",
      endsOn: "2026-07-26",
    });
  });

  it("returns null for a term with no dates anywhere", () => {
    expect(resolveTermWindow(term(9999))).toBeNull();
  });
});

describe("termWindowStatus", () => {
  const window = { startsOn: "2026-01-19", endsOn: "2026-05-31" };

  it("is inclusive on both edges (Asia/Manila)", () => {
    expect(termWindowStatus(window, manilaNoon("2026-01-19"))).toBe(
      "in-session",
    );
    expect(termWindowStatus(window, manilaNoon("2026-05-31"))).toBe(
      "in-session",
    );
    expect(termWindowStatus(window, manilaNoon("2026-01-18"))).toBe("upcoming");
    expect(termWindowStatus(window, manilaNoon("2026-06-01"))).toBe("past");
  });

  it("uses the Manila calendar day, not the local/UTC one", () => {
    // 2026-01-18T23:00Z is already Jan 19 in Manila.
    expect(termWindowStatus(window, new Date("2026-01-18T23:00:00Z"))).toBe(
      "in-session",
    );
  });
});

describe("buildYearTimeline", () => {
  const terms = [
    term(1251, { startsOn: "2025-09-01", endsOn: "2025-12-31" }),
    term(1252, { startsOn: "2026-01-19", endsOn: "2026-05-31" }),
  ];

  it("pads the strip to month boundaries and positions segments by day", () => {
    const timeline = buildYearTimeline(terms, manilaNoon("2026-02-01"));
    expect(timeline).not.toBeNull();
    // Sep 1 2025 → May 31 2026 = 273 days.
    expect(timeline?.rangeStart).toBe("2025-09-01");
    expect(timeline?.rangeEnd).toBe("2026-05-31");
    expect(timeline?.months.map((month) => month.label)).toEqual([
      "Sep",
      "Oct",
      "Nov",
      "Dec",
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
    ]);

    const [first, second] = timeline?.segments ?? [];
    expect(first?.term.id).toBe(1251);
    expect(first?.startPct).toBe(0);
    // Sep–Dec = 122 of 273 days.
    expect(first?.widthPct).toBeCloseTo((122 / 273) * 100, 5);
    // Jan 19 is day index 140 of the strip.
    expect(second?.startPct).toBeCloseTo((140 / 273) * 100, 5);
    expect(second?.widthPct).toBeCloseTo((133 / 273) * 100, 5);
  });

  it("marks segment status and centers the today marker on its day", () => {
    const timeline = buildYearTimeline(terms, manilaNoon("2026-02-01"));
    expect(timeline?.segments.map((segment) => segment.status)).toEqual([
      "past",
      "in-session",
    ]);
    // Feb 1 is day index 153; marker sits mid-cell.
    expect(timeline?.todayPct).toBeCloseTo((153.5 / 273) * 100, 5);
  });

  it("drops the today marker when today is outside the strip", () => {
    const timeline = buildYearTimeline(terms, manilaNoon("2026-08-01"));
    expect(timeline?.todayPct).toBeNull();
  });

  it("returns null when no term has a resolvable window", () => {
    expect(
      buildYearTimeline([term(9999)], manilaNoon("2026-02-01")),
    ).toBeNull();
  });
});

describe("currentAcademicYearTerms", () => {
  const ay2526 = [
    term(1251, {
      startsOn: "2025-09-01",
      endsOn: "2025-12-31",
      schoolYear: "2025-2026",
    }),
    term(1252, {
      startsOn: "2026-01-19",
      endsOn: "2026-05-31",
      schoolYear: "2025-2026",
    }),
  ];
  const ay2627 = [
    term(1261, {
      startsOn: "2026-08-10",
      endsOn: "2026-12-20",
      schoolYear: "2026-2027",
    }),
  ];
  const all = [...ay2526, ...ay2627];

  it("picks the AY whose term is in session today", () => {
    const picked = currentAcademicYearTerms(all, manilaNoon("2026-02-01"));
    expect(picked.map((entry) => entry.id).sort()).toEqual([1251, 1252]);
  });

  it("between AYs, anchors on the next upcoming term", () => {
    const picked = currentAcademicYearTerms(all, manilaNoon("2026-07-01"));
    expect(picked.map((entry) => entry.id)).toEqual([1261]);
  });

  it("when everything is past, keeps the most recent AY", () => {
    const picked = currentAcademicYearTerms(ay2526, manilaNoon("2027-03-01"));
    expect(picked.map((entry) => entry.id).sort()).toEqual([1251, 1252]);
  });

  it("ignores inactive terms and terms without dates", () => {
    const picked = currentAcademicYearTerms(
      [
        ...ay2526,
        term(1249, {
          isActive: false,
          startsOn: "2026-01-01",
          endsOn: "2026-02-01",
        }),
        term(9999),
      ],
      manilaNoon("2026-02-01"),
    );
    expect(picked.map((entry) => entry.id).sort()).toEqual([1251, 1252]);
  });
});
