/**
 * Read the building, wing, and floor out of a UPLB room code.
 *
 * This is what lets guidance continue past the front door: "Physical Sciences,
 * Wing D, 4th floor" instead of dropping the user at a pin on the lawn.
 *
 * Two hard rules, because a confident wrong direction is worse than none:
 *
 * 1. Only buildings on the allowlist below are parsed for wings. A letter in a
 *    room code does not mean "wing" in general. `CAS B01` is the CAS BASEMENT,
 *    not a wing B, and `AMPED ABC 161` has no wing at all.
 * 2. Anything that does not match a known shape returns nulls rather than a
 *    guess. Callers fall back to the human-written `rooms.directions` prose,
 *    which is the only genuinely surveyed indoor information the app has.
 */

/** Buildings where a letter in the room code really does mean a wing. */
type WingRule = {
  /** Canonical building name, matching the `buildings.building_name` row. */
  building: string;
  /** Wing letters actually in use, so an unexpected letter fails loudly. */
  wings: readonly string[];
  /**
   * Codes seen in the wild for this building, longest first so `PS` does not
   * shadow `PSD`. Compared against the code with separators stripped.
   */
  prefixes: readonly string[];
  /** Human label for a wing, when the bare letter is not what people say. */
  wingLabel?: Readonly<Record<string, string>>;
};

/**
 * Sourced from the AMIS facility strings, the seeded room rows, and campus
 * knowledge contributed by builders. Extend this table rather than loosening
 * the parser: every entry here is a claim that a wing letter is real.
 */
export const WING_RULES: readonly WingRule[] = [
  {
    building: "Physical Sciences Building",
    // Wing D is the computer science wing.
    wings: ["A", "B", "C", "D"],
    prefixes: ["PS"],
    wingLabel: { D: "Wing D (Computer Science)" },
  },
  {
    building: "Biological Sciences Building",
    wings: ["A", "B", "C", "D", "E"],
    prefixes: ["BS"],
  },
  {
    building: "Agricultural Systems Institute Building",
    wings: ["A", "B"],
    prefixes: ["ASI"],
  },
  {
    building: "CEAT Building",
    wings: ["A", "B"],
    prefixes: ["CEAT"],
  },
  {
    building: "Institute of Weed Science, Entomology and Plant Pathology",
    wings: ["A", "B"],
    prefixes: ["IWEP"],
  },
];

export type ParsedRoomCode = {
  /** Canonical building name when recognised, else null. */
  building: string | null;
  /** Wing letter, uppercase, when the building is known to have wings. */
  wing: string | null;
  /** Display label for the wing, e.g. "Wing D (Computer Science)". */
  wingLabel: string | null;
  /** Floor number when the code encodes one. Ground floor is 1. */
  floor: number | null;
  /** Room number within the floor, as written (keeps leading zeros). */
  room: string | null;
  /** True when nothing beyond the raw string could be established. */
  unknown: boolean;
};

const EMPTY: ParsedRoomCode = {
  building: null,
  wing: null,
  wingLabel: null,
  floor: null,
  room: null,
  unknown: true,
};

/** Strip separators and uppercase, so "ps d-401" and "PSD401" compare equal. */
function squash(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/**
 * Parse a room code into building / wing / floor / room.
 *
 * Handles the two shapes actually seen on campus:
 *   "PSD401"    -> PS + wing D + floor 4 + room 01   (squashed form)
 *   "BS A-109"  -> BS + wing A + floor 1 + room 09   (spaced form)
 *
 * The floor is the first digit of a 3-or-4 digit run, which is the convention
 * across every building in the table. A 2-digit tail like `B01` is treated as
 * having no floor rather than as floor 0.
 */
export function parseRoomCode(rawCode: string): ParsedRoomCode {
  const code = rawCode?.trim();
  if (!code) return EMPTY;

  const squashed = squash(code);

  for (const rule of WING_RULES) {
    for (const prefix of rule.prefixes) {
      if (!squashed.startsWith(prefix)) continue;

      const rest = squashed.slice(prefix.length);
      // <wing letter><3 or 4 digits>, e.g. "D401" or "A109".
      const match = rest.match(/^([A-Z])(\d{3,4})$/);
      if (!match) continue;

      const wing = match[1] as string;
      const digits = match[2] as string;
      if (!rule.wings.includes(wing)) {
        // A letter this building does not use. Do not invent a wing for it.
        continue;
      }

      const floor = Number.parseInt(digits[0] as string, 10);
      return {
        building: rule.building,
        wing,
        wingLabel: rule.wingLabel?.[wing] ?? `Wing ${wing}`,
        floor: Number.isFinite(floor) && floor > 0 ? floor : null,
        room: digits.slice(1),
        unknown: false,
      };
    }
  }

  return EMPTY;
}

/** Ordinal for floors the way people say them: 1st, 2nd, 3rd, 4th. */
export function floorLabel(floor: number): string {
  if (floor === 1) return "ground floor";
  const suffix =
    floor % 10 === 1 && floor % 100 !== 11
      ? "st"
      : floor % 10 === 2 && floor % 100 !== 12
        ? "nd"
        : floor % 10 === 3 && floor % 100 !== 13
          ? "rd"
          : "th";
  return `${floor}${suffix} floor`;
}

/**
 * The one-line indoor instruction shown after the user reaches the building.
 *
 * `directions` is the human-written prose from `rooms.directions`. It is the
 * only surveyed indoor detail the app has, so when it exists it wins: a
 * contributor who wrote "take the far stairwell, room is on the left" knows
 * more than any code parser. The parsed wing and floor lead, because that is
 * what you need at the door before you can use the prose.
 */
export function indoorInstruction(
  roomCode: string,
  directions: string | null,
): string | null {
  const parsed = parseRoomCode(roomCode);
  const parts: string[] = [];

  if (parsed.wingLabel) parts.push(parsed.wingLabel);
  if (parsed.floor !== null) parts.push(floorLabel(parsed.floor));

  const head = parts.length > 0 ? parts.join(", ") : null;
  const prose = directions?.trim() || null;

  if (head && prose) return `${head}. ${prose}`;
  return head ?? prose;
}
