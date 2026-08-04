/**
 * Reclassify "4Boys House" from a building into a dorm.
 *
 * buildings #59 was entered as a `non-admin` building and carries zero rooms.
 * It is a private residence, not an academic building, so it belongs in
 * `dorms`. There is no `dorm` value in the `building_type` enum (only `admin`
 * and `non-admin`), so reclassifying means creating the dorms row and removing
 * the buildings row, not flipping a column.
 *
 * Usage:
 *   bun run scripts/reclassify-4boys-house.ts            # dry run, prints the plan
 *   bun run scripts/reclassify-4boys-house.ts --apply    # write
 *
 * Re-running is safe: the dorm is matched by name before inserting, and the
 * building delete is skipped when the row is already gone.
 *
 * The delete is refused outright if anything still references the building
 * (rooms, or a proposal / contribution / history row pointing at it), so a
 * silent orphan is impossible. Resolve the references first, then re-run.
 */

import pg from "pg";
import { loadEnv } from "./load-env";

const BUILDING_ID = 59;
const DORM_NAME = "4Boys House";
const GENDER = "male";
const OP_KEY = "2026-08-04-4boys-house-building-to-dorm";

type Building = {
  id: number;
  building_name: string;
  type: string;
  lat: number | null;
  lon: number | null;
  directions: string | null;
  image_url: string | null;
  version: number;
};

async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");
  loadEnv();
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }

  const client = new pg.Client({ connectionString });
  await client.connect();

  try {
    const { rows: buildings } = await client.query<Building>(
      "SELECT id, building_name, type, lat, lon, directions, image_url, version FROM buildings WHERE id = $1",
      [BUILDING_ID],
    );
    const building = buildings[0];

    if (!building) {
      console.log(`buildings #${BUILDING_ID} is already gone.`);
    } else {
      console.log(
        `buildings #${building.id}: ${building.building_name} (${building.type}) at ${building.lat}, ${building.lon}`,
      );
      if (!/4\s*boys/i.test(building.building_name)) {
        // Ids drift between environments. Refuse rather than delete whatever
        // happens to sit at 59 in this database.
        console.error(
          `Refusing to continue: buildings #${BUILDING_ID} is "${building.building_name}", not ${DORM_NAME}.`,
        );
        process.exit(1);
      }
    }

    // Anything still pointing at the building blocks the delete.
    const blockers: string[] = [];
    const countWhere = async (
      label: string,
      sql: string,
      params: unknown[],
    ) => {
      const { rows } = await client.query<{ n: string }>(sql, params);
      const n = Number(rows[0]?.n ?? 0);
      if (n > 0) blockers.push(`${label}: ${n}`);
      return n;
    };

    await countWhere(
      "rooms",
      "SELECT count(*) AS n FROM rooms WHERE building_id = $1",
      [BUILDING_ID],
    );
    await countWhere(
      "edit_proposals",
      "SELECT count(*) AS n FROM edit_proposals WHERE entity_type = 'building' AND entity_id = $1",
      [BUILDING_ID],
    );
    await countWhere(
      "contributions",
      "SELECT count(*) AS n FROM contributions WHERE entity_type = 'building' AND entity_id = $1",
      [BUILDING_ID],
    );
    await countWhere(
      "editor_history",
      "SELECT count(*) AS n FROM editor_history WHERE entity_type = 'building' AND entity_id = $1",
      [BUILDING_ID],
    );

    const { rows: existingDorms } = await client.query<{
      id: number;
      dorm_name: string;
    }>("SELECT id, dorm_name FROM dorms WHERE dorm_name ILIKE $1", [DORM_NAME]);
    const existingDorm = existingDorms[0];

    console.log("\nPlan:");
    console.log(
      existingDorm
        ? `  dorms: "${existingDorm.dorm_name}" already exists (#${existingDorm.id}), insert skipped`
        : `  dorms: insert "${DORM_NAME}" (gender=${GENDER}, is_up_managed=false)`,
    );
    console.log(
      building
        ? blockers.length > 0
          ? `  buildings: BLOCKED, still referenced by ${blockers.join(", ")}`
          : `  buildings: delete #${BUILDING_ID}`
        : "  buildings: nothing to delete",
    );

    if (!apply) {
      console.log("\nDry run. Pass --apply to write.");
      return;
    }

    if (building && blockers.length > 0) {
      console.error(
        `\nRefusing to delete buildings #${BUILDING_ID}: still referenced by ${blockers.join(", ")}.`,
      );
      console.error("Resolve those references, then re-run.");
      process.exit(1);
    }

    await client.query("BEGIN");

    let dormId = existingDorm?.id ?? null;
    if (!existingDorm) {
      const { rows } = await client.query<{ id: number }>(
        `INSERT INTO dorms (dorm_name, lat, lon, gender, is_up_managed, description)
         VALUES ($1, $2, $3, $4, false, $5)
         RETURNING id`,
        [
          DORM_NAME,
          building?.lat ?? null,
          building?.lon ?? null,
          GENDER,
          building?.directions ?? null,
        ],
      );
      dormId = rows[0]!.id;
      console.log(`\nInserted dorms #${dormId}.`);
    }

    if (building) {
      await client.query("DELETE FROM buildings WHERE id = $1", [BUILDING_ID]);
      console.log(`Deleted buildings #${BUILDING_ID}.`);
    }

    // Direct data edits must leave an audit trail, otherwise the entity's
    // history lies about how it changed. See scripts/record-bulk-history.ts.
    await client.query(
      `INSERT INTO editor_history (entity_type, entity_id, action, before_snapshot, after_snapshot, edited_by, summary)
       VALUES ('dorm', $1, 'create', $2, $3, 'maintenance-script', $4)`,
      [
        dormId,
        building ? JSON.stringify({ buildings: building }) : null,
        JSON.stringify({ dormName: DORM_NAME, gender: GENDER, id: dormId }),
        `${OP_KEY} — 4Boys House was a building with no rooms; moved to dorms and the building row removed`,
      ],
    );

    await client.query("COMMIT");
    console.log("Done.");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
