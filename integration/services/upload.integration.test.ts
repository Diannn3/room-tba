import { beforeAll, describe, expect, test } from "bun:test";
import { E2E_FIXTURES, loginViaApi } from "../helpers/http";
import {
  PREVIEW_BASE,
  previewFetchInit,
  requirePreview,
  skipWithoutE2eDb,
} from "../helpers/env";

const describeIntegration = skipWithoutE2eDb() ? describe.skip : describe;

describeIntegration("admin upload access HTTP", () => {
  beforeAll(async () => {
    await requirePreview(PREVIEW_BASE);
  });

  test("anonymous upload configuration request is unauthorized", async () => {
    const response = await fetch(
      `${PREVIEW_BASE}/api/admin/upload`,
      previewFetchInit(),
    );
    expect(response.status).toBe(401);
  });

  test("admin, editor, and contributor sessions may inspect upload access", async () => {
    for (const username of [
      E2E_FIXTURES.users.admin,
      E2E_FIXTURES.users.editor,
      E2E_FIXTURES.users.contributor,
    ]) {
      const cookie = await loginViaApi(username);
      expect(cookie).toBeTruthy();
      const response = await fetch(
        `${PREVIEW_BASE}/api/admin/upload`,
        previewFetchInit({ headers: { Cookie: cookie! } }),
      );
      expect(response.status).toBe(200);
      const body = (await response.json()) as { configured?: unknown };
      expect(typeof body.configured).toBe("boolean");
    }
  });
});
