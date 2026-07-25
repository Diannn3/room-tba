import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import pg from "pg";
import { integrationDatabaseUrl, skipWithoutE2eDb } from "../helpers/env";

const describeIntegration = skipWithoutE2eDb() ? describe.skip : describe;

describeIntegration("room class queries", () => {
  let client: pg.Client;
  let courseCode: string;
  let roomIds: number[] = [];
  let termId: number;

  beforeAll(async () => {
    client = new pg.Client({ connectionString: integrationDatabaseUrl()! });
    await client.connect();
    courseCode = `ROOMTEST${Date.now()}`.slice(0, 16);

    const terms = await client.query<{ id: number }>(
      "SELECT id FROM terms ORDER BY id DESC LIMIT 1",
    );
    termId = terms.rows[0]!.id;

    const rooms = await client.query<{ id: number }>(
      "INSERT INTO rooms (room_code) VALUES ($1), ($2) RETURNING id",
      [`${courseCode}-A`, `${courseCode}-B`],
    );
    roomIds = rooms.rows.map((room) => room.id);

    await client.query(
      `INSERT INTO classes
        (course_code, section, type, schedule, room_id, course_title, term_id)
       VALUES
        ($1, 'A', 'LEC', ARRAY['WF 07:00AM-08:30AM'], $2, 'Room query test', $4),
        ($1, 'A', 'LAB', ARRAY['T 01:00PM-04:00PM'], $3, 'Room query test', $4)`,
      [courseCode, roomIds[0], roomIds[1], termId],
    );
  });

  afterAll(async () => {
    if (!client) return;
    await client.query("DELETE FROM classes WHERE course_code = $1", [
      courseCode,
    ]);
    await client.query("DELETE FROM rooms WHERE id = ANY($1::int[])", [
      roomIds,
    ]);
    await client.end();
  });

  test("returns only classes assigned to the requested room", async () => {
    const { getClassesForRoom } = await import(
      "@lib/services/map-data-service"
    );
    const rows = await getClassesForRoom(`${courseCode}-A`, termId);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.type).toBe("LEC");
    expect(rows[0]?.roomCode).toBe(`${courseCode}-A`);
  });
});

describeIntegration("queryClasses cursor pagination (#412)", () => {
  let client: pg.Client;
  let courseCode: string;
  let termId: number;
  const sections = ["A", "B", "C", "D", "E"];

  beforeAll(async () => {
    client = new pg.Client({ connectionString: integrationDatabaseUrl()! });
    await client.connect();
    courseCode = `CURTEST${Date.now()}`.slice(0, 16);

    const terms = await client.query<{ id: number }>(
      "SELECT id FROM terms ORDER BY id DESC LIMIT 1",
    );
    termId = terms.rows[0]!.id;

    for (const section of sections) {
      await client.query(
        `INSERT INTO classes
          (course_code, section, type, schedule, course_title, term_id)
         VALUES ($1, $2, 'LEC', ARRAY['M 08:00AM-09:00AM'], 'Cursor test', $3)`,
        [courseCode, section, termId],
      );
    }
  });

  afterAll(async () => {
    if (!client) return;
    await client.query("DELETE FROM classes WHERE course_code = $1", [
      courseCode,
    ]);
    await client.end();
  });

  test("walks every row exactly once and stays stable under inserts", async () => {
    const { queryClasses } = await import("@lib/services/map-data-service");
    const { decodeClassCursor } = await import("@lib/api/class-cursor");

    const first = await queryClasses({
      termId,
      courseCodePrefix: courseCode,
      limit: 2,
    });
    expect(first.rows.map((r) => r.section)).toEqual(["A", "B"]);
    expect(first.hasMore).toBe(true);
    expect(first.nextCursor).not.toBeNull();

    // A row inserted before the cursor position must not shift later pages
    // (the offset-pagination duplicate/skip bug this replaces).
    await client.query(
      `INSERT INTO classes
        (course_code, section, type, schedule, course_title, term_id)
       VALUES ($1, 'AA', 'LEC', ARRAY['T 08:00AM-09:00AM'], 'Cursor test', $2)`,
      [courseCode, termId],
    );

    const second = await queryClasses({
      termId,
      courseCodePrefix: courseCode,
      limit: 2,
      cursor: decodeClassCursor(first.nextCursor!) ?? undefined,
    });
    expect(second.rows.map((r) => r.section)).toEqual(["C", "D"]);
    expect(second.hasMore).toBe(true);

    const third = await queryClasses({
      termId,
      courseCodePrefix: courseCode,
      limit: 2,
      cursor: decodeClassCursor(second.nextCursor!) ?? undefined,
    });
    expect(third.rows.map((r) => r.section)).toEqual(["E"]);
    expect(third.hasMore).toBe(false);
    expect(third.nextCursor).toBeNull();
  });
});
