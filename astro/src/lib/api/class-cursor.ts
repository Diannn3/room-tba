/**
 * Opaque keyset cursor for GET /api/classes (#412).
 *
 * Encodes the stable sort key of the last row on a page —
 * (courseCode, section, id) matching queryClasses' ORDER BY — as base64url
 * JSON. Deterministic and unsigned on purpose: a tampered cursor can only
 * reposition the keyset scan, never widen access.
 */
export type ClassCursor = {
  courseCode: string;
  section: string;
  id: number;
};

export function encodeClassCursor(cursor: ClassCursor): string {
  return Buffer.from(
    JSON.stringify([cursor.courseCode, cursor.section, cursor.id]),
  ).toString("base64url");
}

/** Returns null on any malformed token; callers should 400. */
export function decodeClassCursor(raw: string): ClassCursor | null {
  if (!raw || raw.length > 256 || !/^[A-Za-z0-9_-]+$/.test(raw)) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (!Array.isArray(parsed) || parsed.length !== 3) return null;
  const [courseCode, section, id] = parsed;
  if (typeof courseCode !== "string" || typeof section !== "string")
    return null;
  if (typeof id !== "number" || !Number.isSafeInteger(id)) return null;
  return { courseCode, section, id };
}
