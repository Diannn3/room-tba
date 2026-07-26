import { beforeAll, describe, expect, test } from "bun:test";
import { integrationDatabaseUrl, skipWithoutE2eDb } from "../helpers/env";
import { connectE2eClient } from "../../scripts/e2e-schema";

const describeIntegration = skipWithoutE2eDb() ? describe.skip : describe;

describeIntegration("jeepney stop service", () => {
  beforeAll(async () => {
    // A previous run's soft-removed stop still holds sort_order 0 and the
    // (route_id, sort_order) unique constraint would reject reusing it.
    // Only clear leftovers from earlier test runs: the seeded "E2E Stop"
    // (scripts/e2e-reset-db.ts) must survive because the Playwright deep-link
    // spec (e2e/browse/transit-stop-panel.spec.ts) runs after this suite on
    // the same database and navigates to /transit/e2e-route/e2e-stop.
    const client = await connectE2eClient(integrationDatabaseUrl()!);
    await client.query(
      "DELETE FROM jeepney_stops WHERE route_id = $1 AND name <> $2",
      ["e2e-route", "E2E Stop"],
    );
    await client.end();
  });

  test("creates, edits, and soft-removes a stop", async () => {
    const { createJeepneyStop, updateJeepneyStop } = await import(
      "@lib/services/transit-service"
    );
    const name = `Integration stop ${Date.now()}`;
    const created = await createJeepneyStop({
      routeId: "e2e-route",
      name,
      description: "Initial transit integration stop.",
      lat: 14.1656,
      lon: 121.2413,
    });
    expect(created?.id).toBeNumber();
    expect(created?.version).toBe(1);

    const updated = await updateJeepneyStop(
      created!.id,
      { description: "Updated transit integration stop." },
      created!.version,
      "e2e-editor",
    );
    expect(updated?.version).toBe(2);

    const reordered = await updateJeepneyStop(
      created!.id,
      { sortOrder: 0 },
      updated!.version,
      "e2e-editor",
    );
    expect(reordered?.sortOrder).toBe(0);

    const removed = await updateJeepneyStop(
      created!.id,
      { isActive: false },
      reordered!.version,
      "e2e-editor",
    );
    expect(removed?.isActive).toBe(false);
  });
});

describeIntegration("jeepney stop proposal", () => {
  test("approves a suggested stop into the route", async () => {
    const { approveProposal, submitProposal } = await import(
      "@lib/services/proposal-service"
    );
    const proposal = await submitProposal({
      entityType: "create_jeepney_stop",
      entityId: 0,
      baseVersion: 0,
      patch: {
        routeId: "e2e-route",
        name: `Suggested stop ${Date.now()}`,
        description: "Suggested through the contributor review queue.",
        lat: 14.1657,
        lon: 121.2414,
      },
      submitterName: "Transit contributor",
      submitterUserId: null,
      proposalId: null,
    });
    const approved = await approveProposal(proposal.id, {
      id: 2,
      username: "e2e-editor",
      displayName: "e2e-editor",
      role: "editor",
    });
    expect(approved.proposal.status).toBe("approved");
    expect((approved.published as { routeId?: string }).routeId).toBe(
      "e2e-route",
    );
  });
});
