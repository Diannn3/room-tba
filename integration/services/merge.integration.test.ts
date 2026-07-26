import { describe, expect, test } from "bun:test";
import { connectE2eClient } from "../../scripts/e2e-schema";
import { integrationDatabaseUrl, skipWithoutE2eDb } from "../helpers/env";

const describeIntegration = skipWithoutE2eDb() ? describe.skip : describe;

describeIntegration("merge service", () => {
  test("mergeBuildings removes source and keeps survivor", async () => {
    const url = integrationDatabaseUrl();
    if (!url) return;

    const client = await connectE2eClient(url);

    const source = await client.query<{ id: number; version: number }>(
      `INSERT INTO buildings (building_name, lat, lon, type, directions, version)
       VALUES ('E2E Merge Source', 14.165, 121.241, 'non-admin', 'source', 1)
       RETURNING id, version`,
    );
    const sourceId = source.rows[0]?.id;
    const sourceVersion = source.rows[0]?.version ?? 1;
    expect(sourceId).toBeGreaterThan(0);

    const target = await client.query<{ id: number }>(
      `SELECT id FROM buildings WHERE building_name = 'E2E Test Hall' LIMIT 1`,
    );
    const targetId = target.rows[0]?.id ?? 1;
    await client.end();

    const { mergeBuildings } = await import("@lib/services/merge-service");
    const merged = await mergeBuildings({
      sourceId: sourceId!,
      targetId,
      sourceVersion,
      editedBy: "e2e-admin",
    });
    expect(merged.id).toBe(targetId);

    const verify = await connectE2eClient(url);
    const gone = await verify.query("SELECT id FROM buildings WHERE id = $1", [
      sourceId,
    ]);
    expect(gone.rowCount).toBe(0);
    await verify.end();
  }, 60_000);
});
