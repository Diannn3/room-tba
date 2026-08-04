import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { beforeEach, describe, expect, test, vi } from "vitest";
import ProposalReviewPanelHost from "@test/components/ProposalReviewPanelHost.svelte";
import { adminAuthStore, proposalsStore } from "@lib/store.svelte";
import { mountAtWidth } from "@test/layout-assertions";

function baseProposal() {
  return {
    id: 7,
    entityType: "building",
    entityId: 12,
    entityLabel: "Old Hall",
    status: "pending",
    submitterName: "Yeyel",
    proposedPatch: { directions: "Enter from the east gate" },
    adminNote: null,
    createdAt: new Date().toISOString(),
    baseVersion: 3,
    currentValues: { directions: "Enter from the west gate" },
    currentVersion: 3,
  };
}

/** Rows start collapsed (#873), so open one before asserting on its body. */
async function expandFirstRow() {
  const summaries = document.querySelectorAll("summary");
  const first = summaries[0];
  if (!first) throw new Error("no proposal row rendered");
  await fireEvent.click(first);
}

describe("ProposalReviewPanel diffs", () => {
  beforeEach(() => {
    adminAuthStore.isLoggedIn = true;
    adminAuthStore.canReview = true;
    proposalsStore.loading = false;
    proposalsStore.pendingCount = 1;
  });

  test("renders before and after for a changed field at 320px", async () => {
    mountAtWidth(320);
    proposalsStore.proposals = [baseProposal()];
    render(ProposalReviewPanelHost);
    await expandFirstRow();
    expect(screen.getByText("Directions")).toBeVisible();
    expect(screen.getByText("Enter from the west gate")).toBeVisible();
    expect(screen.getByText("Enter from the east gate")).toBeVisible();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  test("collapsed rows keep the diff body out of the DOM", () => {
    proposalsStore.proposals = [baseProposal()];
    render(ProposalReviewPanelHost);
    // The row is listed, but its diffs and buttons are not mounted yet.
    expect(screen.getByText("Old Hall")).toBeVisible();
    expect(screen.queryByText("Enter from the east gate")).toBeNull();
    expect(screen.queryByRole("button", { name: "Approve" })).toBeNull();
  });

  test("shows stale banner when published version moved past baseVersion", async () => {
    proposalsStore.proposals = [{ ...baseProposal(), currentVersion: 5 }];
    render(ProposalReviewPanelHost);
    await expandFirstRow();
    expect(screen.getByRole("alert").textContent).toMatch(
      /published data changed/i,
    );
  });

  test("create proposals show New entry as the before value", async () => {
    proposalsStore.proposals = [
      {
        ...baseProposal(),
        entityType: "create_room",
        entityId: 0,
        baseVersion: 0,
        proposedPatch: { roomCode: "CEM 203" },
        currentValues: null,
        currentVersion: null,
      },
    ];
    render(ProposalReviewPanelHost);
    await expandFirstRow();
    expect(screen.getByText("New entry")).toBeVisible();
    expect(screen.getByText("CEM 203")).toBeVisible();
  });
});

describe("ProposalReviewPanel foreign keys (#873)", () => {
  beforeEach(() => {
    adminAuthStore.isLoggedIn = true;
    adminAuthStore.canReview = true;
    proposalsStore.loading = false;
    proposalsStore.pendingCount = 1;
  });

  test("a building reassignment shows names, not raw row ids", async () => {
    // loadedAppContext() seeds building id 1 as "Class Hall".
    proposalsStore.proposals = [
      {
        ...baseProposal(),
        entityType: "room",
        proposedPatch: { buildingId: 1 },
        currentValues: { buildingId: 99 },
      },
    ];
    render(ProposalReviewPanelHost);
    await expandFirstRow();

    expect(screen.getByText("Building")).toBeVisible();
    expect(screen.getByText("Class Hall")).toBeVisible();
    // The id stays available as secondary text next to the name.
    expect(screen.getByText("#1")).toBeVisible();
    // Unresolvable ids still fall back to the raw number rather than vanishing.
    expect(screen.getByText("99")).toBeVisible();
  });
});

describe("ProposalReviewPanel note flow (#873)", () => {
  beforeEach(() => {
    adminAuthStore.isLoggedIn = true;
    adminAuthStore.canReview = true;
    proposalsStore.loading = false;
    proposalsStore.pendingCount = 1;
    proposalsStore.proposals = [baseProposal()];
  });

  test("the note field appears only after choosing reject", async () => {
    render(ProposalReviewPanelHost);
    await expandFirstRow();

    expect(screen.queryByLabelText(/note to yeyel/i)).toBeNull();

    await fireEvent.click(screen.getByRole("button", { name: "Reject" }));

    const note = screen.getByLabelText(/note to yeyel/i);
    expect(note).toBeVisible();
    // The rule lives in visible hint text, not a placeholder that vanishes.
    expect(
      screen.getByText(/optional\. the contributor sees this/i),
    ).toBeVisible();
  });

  test("request changes keeps confirm disabled until a note is written", async () => {
    render(ProposalReviewPanelHost);
    await expandFirstRow();

    await fireEvent.click(
      screen.getByRole("button", { name: "Request changes" }),
    );
    expect(
      screen.getByText(/required\. say what needs to change/i),
    ).toBeVisible();

    const confirm = screen.getByRole("button", {
      name: /confirm request changes/i,
    });
    expect(confirm).toBeDisabled();

    await fireEvent.input(screen.getByLabelText(/note to yeyel/i), {
      target: { value: "Please cite a source." },
    });
    expect(confirm).toBeEnabled();
  });

  test("shows the contributor's note to the reviewer", async () => {
    proposalsStore.proposals = [
      {
        ...baseProposal(),
        submitterNote: "You may opt to remove this room from the app.",
      },
    ];
    render(ProposalReviewPanelHost);
    await expandFirstRow();

    expect(
      screen.getByText(/you may opt to remove this room from the app/i),
    ).toBeVisible();
  });
});

describe("ProposalReviewPanel bulk actions", () => {
  beforeEach(() => {
    adminAuthStore.isLoggedIn = true;
    adminAuthStore.canReview = true;
    proposalsStore.loading = false;
    proposalsStore.pendingCount = 2;
    proposalsStore.refresh = vi.fn(() => Promise.resolve());
    proposalsStore.proposals = [
      { ...baseProposal(), id: 7, entityLabel: "Old Hall" },
      { ...baseProposal(), id: 8, entityLabel: "New Hall" },
    ];
  });

  test("select all then approve posts an approve for every selected proposal", async () => {
    // Response omits proposal.entityType so approveOne skips the
    // published-entity side effects (no app-context dependency in the test).
    const fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      } as Response),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(ProposalReviewPanelHost);

    const approveBtn = screen.getByRole("button", {
      name: /approve selected/i,
    });
    // The disabled default reads as an action, not "Approve 0 selected".
    expect(approveBtn).toBeDisabled();

    await fireEvent.click(screen.getByLabelText(/^select all$/i));
    expect(approveBtn).toBeEnabled();
    expect(screen.getByText(/2 selected/)).toBeVisible();

    await fireEvent.click(approveBtn);

    await waitFor(() => {
      const urls = fetchMock.mock.calls.map((c) => String(c[0]));
      expect(urls).toContain("/api/admin/proposals/7/approve");
      expect(urls).toContain("/api/admin/proposals/8/approve");
    });

    vi.unstubAllGlobals();
  });

  test("bulk reject posts a reject with the shared note", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      } as Response),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(ProposalReviewPanelHost);
    await fireEvent.click(screen.getByLabelText(/^select all$/i));
    await fireEvent.click(
      screen.getByRole("button", { name: /reject selected/i }),
    );

    await fireEvent.input(screen.getByLabelText(/note for 2 selected/i), {
      target: { value: "Duplicate of an existing entry." },
    });
    await fireEvent.click(screen.getByRole("button", { name: /^reject 2$/i }));

    await waitFor(() => {
      const urls = fetchMock.mock.calls.map((c) => String(c[0]));
      expect(urls).toContain("/api/admin/proposals/7/reject");
      expect(urls).toContain("/api/admin/proposals/8/reject");
    });
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(body.note).toBe("Duplicate of an existing entry.");

    vi.unstubAllGlobals();
  });

  test("groups a submitter's suggestions and selects them as a set", async () => {
    proposalsStore.proposals = [
      { ...baseProposal(), id: 7, submitterName: "Yeyel" },
      { ...baseProposal(), id: 8, submitterName: "Yeyel" },
      { ...baseProposal(), id: 9, submitterName: "Ana" },
    ];
    render(ProposalReviewPanelHost);

    await fireEvent.click(
      screen.getByLabelText(/select all 2 suggestions from yeyel/i),
    );
    expect(screen.getByText(/2 selected/)).toBeVisible();
  });
});
