<script lang="ts">
  import LoadingIndicator from "@ui/LoadingIndicator.svelte";
  import { SvelteSet } from "svelte/reactivity";
  import {
    adminAuthStore,
    proposalsStore,
    toastStore,
  } from "@lib/store.svelte";
  import { buildFieldDiffs } from "@lib/proposals/diff";
  import { appEntityNameResolver } from "@lib/proposals/entity-names";
  import { afterProposalPublished } from "@lib/proposals/apply-published-entity";
  import { syncOpenEntityQueryAfterPublish } from "@lib/proposals/sync-open-entity-query";
  import { getAppActions, getAppData } from "@lib/context";
  import type { ProposalEntityType } from "@lib/services/proposal-service";
  import { parseBundledRooms } from "@lib/proposals/create-proposal-validation";
  import EntityEditorFormField from "@ui/editor/EntityEditorFormField.svelte";
  import EntityReviewActions from "@ui/editor/EntityReviewActions.svelte";
  import Avatar from "@ui/Avatar.svelte";

  const appActions = getAppActions();
  const appData = getAppData();

  /** Turns buildingId/collegeId/divisionId into names for the diff (#873). */
  const resolveEntityName = $derived(appEntityNameResolver(appData()));

  type ReviewAction = "approve" | "reject" | "request-changes";
  /** Reject may carry a note; request-changes requires one. */
  type NoteAction = Exclude<ReviewAction, "approve">;

  const ACTION_LABELS: Record<NoteAction, string> = {
    reject: "Reject",
    "request-changes": "Request changes",
  };

  const NOTE_HINTS: Record<NoteAction, string> = {
    reject: "Optional. The contributor sees this on their suggestion.",
    "request-changes":
      "Required. Say what needs to change so the contributor can revise.",
  };

  function bundledRoomsSummary(
    entityType: ProposalEntityType,
    patch: Record<string, unknown>,
  ): string | null {
    if (entityType !== "create_building") return null;
    const rooms = parseBundledRooms(patch);
    if (rooms.length === 0) return null;
    return `Will create building + ${rooms.length} room${rooms.length === 1 ? "" : "s"}: ${rooms.map((r) => r.roomCode).join(", ")}`;
  }

  function diffsFor(proposal: {
    currentValues?: Record<string, unknown> | null;
    proposedPatch: Record<string, unknown>;
  }) {
    return buildFieldDiffs(
      proposal.currentValues ?? null,
      proposal.proposedPatch,
      resolveEntityName,
    );
  }

  function isStale(proposal: {
    currentVersion?: number | null;
    baseVersion: number;
  }) {
    return (
      proposal.currentVersion != null &&
      proposal.currentVersion !== proposal.baseVersion
    );
  }

  function submittedOn(createdAt: string | Date | null | undefined) {
    if (!createdAt) return "";
    const date = new Date(createdAt);
    return Number.isNaN(date.getTime())
      ? ""
      : date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  let noteById = $state<Record<number, string>>({});
  let actingId = $state<number | null>(null);
  const selectedIds = new SvelteSet<number>();
  let batchRunning = $state(false);
  // Rows render collapsed. The body is kept out of the DOM until opened so a
  // 59-item queue does not mount 59 diff lists and textareas (#873).
  let openById = $state<Record<number, boolean>>({});
  // Which per-row action is awaiting a note + confirmation, if any.
  let pendingActionById = $state<Record<number, NoteAction | null>>({});
  let bulkAction = $state<NoteAction | null>(null);
  let bulkNote = $state("");

  // Same submitter's suggestions review as a set: one contributor filing many
  // near-identical room edits is the common shape of this queue (#873).
  const groups = $derived.by(() => {
    const bySubmitter = new Map<string, typeof proposalsStore.proposals>();
    for (const proposal of proposalsStore.proposals) {
      const list = bySubmitter.get(proposal.submitterName) ?? [];
      list.push(proposal);
      bySubmitter.set(proposal.submitterName, list);
    }
    return [...bySubmitter].map(([submitterName, proposals]) => ({
      submitterName,
      proposals,
    }));
  });

  // Approve a single proposal: POST + apply the published entity to local
  // state. No toast/refresh — callers (single action, batch) decide those.
  async function approveOne(
    id: number,
  ): Promise<{ ok: boolean; error?: string }> {
    const res = await fetch(`/api/admin/proposals/${id}/approve`, {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ note: noteById[id] ?? "" }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: (data as { error?: string }).error };
    }
    const published = (data as { published?: unknown }).published;
    const entityType = (data as { proposal?: { entityType?: string } }).proposal
      ?.entityType;
    if (entityType) {
      afterProposalPublished(
        appActions,
        appData,
        entityType as ProposalEntityType,
        published,
      );
      syncOpenEntityQueryAfterPublish(
        appData,
        entityType as ProposalEntityType,
        published,
      );
    }
    noteById[id] = "";
    return { ok: true };
  }

  /** Reject / request-changes for one proposal. Note comes from `note`. */
  async function reviewOne(
    id: number,
    action: NoteAction,
    note: string,
  ): Promise<{ ok: boolean; error?: string }> {
    const res = await fetch(`/api/admin/proposals/${id}/${action}`, {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ note }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: (data as { error?: string }).error };
    }
    return { ok: true };
  }

  async function runAction(id: number, action: ReviewAction) {
    actingId = id;
    try {
      if (action === "approve") {
        const result = await approveOne(id);
        if (!result.ok) {
          toastStore.show(
            result.error ?? `Could not approve proposal #${id}.`,
            "error",
          );
          return;
        }
        selectedIds.delete(id);
        toastStore.show("Proposal approved and published.", "success");
        await proposalsStore.refresh();
        return;
      }

      const result = await reviewOne(id, action, noteById[id] ?? "");
      if (!result.ok) {
        toastStore.show(
          result.error ?? `Could not ${action} proposal #${id}.`,
          "error",
        );
        return;
      }
      selectedIds.delete(id);
      pendingActionById[id] = null;
      toastStore.show(
        action === "reject"
          ? "Proposal rejected."
          : "Sent back to contributor with notes.",
        "success",
      );
      noteById[id] = "";
      await proposalsStore.refresh();
    } finally {
      actingId = null;
    }
  }

  function toggleSelected(id: number) {
    if (selectedIds.has(id)) selectedIds.delete(id);
    else selectedIds.add(id);
  }

  const allSelected = $derived(
    proposalsStore.proposals.length > 0 &&
      proposalsStore.proposals.every((p) => selectedIds.has(p.id)),
  );

  function toggleSelectAll() {
    if (allSelected) {
      selectedIds.clear();
    } else {
      for (const p of proposalsStore.proposals) selectedIds.add(p.id);
    }
  }

  function groupSelected(proposals: { id: number }[]) {
    return proposals.length > 0 && proposals.every((p) => selectedIds.has(p.id));
  }

  function toggleGroup(proposals: { id: number }[]) {
    if (groupSelected(proposals)) {
      for (const p of proposals) selectedIds.delete(p.id);
    } else {
      for (const p of proposals) selectedIds.add(p.id);
    }
  }

  // Run one action across every selected proposal. Each request can fail
  // independently (approve conflicts on 409), so aggregate outcomes and report
  // a summary rather than failing the whole batch on the first error.
  async function runBatch(action: ReviewAction) {
    const ids = [...selectedIds];
    if (ids.length === 0 || batchRunning) return;
    if (action === "request-changes" && bulkNote.trim() === "") {
      toastStore.show("A note is required to request changes.", "error");
      return;
    }
    batchRunning = true;
    let done = 0;
    let failed = 0;
    try {
      for (const id of ids) {
        const result =
          action === "approve"
            ? await approveOne(id)
            : await reviewOne(id, action, bulkNote);
        if (result.ok) {
          done += 1;
          selectedIds.delete(id);
        } else {
          failed += 1;
        }
      }
    } finally {
      batchRunning = false;
      bulkAction = null;
      bulkNote = "";
      await proposalsStore.refresh();
    }
    const verb =
      action === "approve"
        ? "Approved"
        : action === "reject"
          ? "Rejected"
          : "Sent back";
    toastStore.show(
      failed === 0
        ? `${verb} ${done} proposal${done === 1 ? "" : "s"}.`
        : `${verb} ${done}, ${failed} failed (likely conflicts) — review the rest.`,
      failed === 0 ? "success" : "error",
    );
  }
</script>

{#snippet diffValue(text: string | null, id: number | undefined)}
  {text ?? "—"}{#if id != null}<small class="entity-review-diff-id">#{id}</small
    >{/if}
{/snippet}

{#if adminAuthStore.canReview}
  <section class="entity-review-panel" aria-label="Edit proposals review queue">
    <div class="entity-review-heading">
      <strong>Suggested edits</strong>
      {#if proposalsStore.pendingCount > 0}
        <span class="entity-review-count"
          >{proposalsStore.pendingCount} pending</span
        >
      {/if}
    </div>

    {#if proposalsStore.loading}
      <p class="entity-review-empty">
        <LoadingIndicator label="Loading proposals…" />
      </p>
    {:else if proposalsStore.proposals.length === 0}
      <p class="entity-review-empty">No pending suggestions.</p>
    {:else}
      <div class="entity-review-batch">
        <label class="entity-review-select-all">
          <input
            type="checkbox"
            checked={allSelected}
            onchange={toggleSelectAll}
            aria-label="Select all"
          />
          Select all
          <span class="entity-review-selected-count">
            {selectedIds.size} selected
          </span>
        </label>
        <div class="entity-review-batch-actions">
          <button
            type="button"
            class="entity-review-batch-approve"
            disabled={selectedIds.size === 0 || batchRunning}
            onclick={() => runBatch("approve")}
          >
            {batchRunning && bulkAction === null
              ? "Approving…"
              : "Approve selected"}
          </button>
          <button
            type="button"
            disabled={selectedIds.size === 0 || batchRunning}
            onclick={() => (bulkAction = "request-changes")}
          >
            Request changes on selected
          </button>
          <button
            type="button"
            class="entity-review-batch-reject"
            disabled={selectedIds.size === 0 || batchRunning}
            onclick={() => (bulkAction = "reject")}
          >
            Reject selected
          </button>
        </div>
      </div>

      {#if bulkAction}
        <div class="entity-review-bulk-note">
          <EntityEditorFormField
            label={`Note for ${selectedIds.size} selected`}
            inputId="proposal-bulk-note"
            hint={NOTE_HINTS[bulkAction]}
          >
            {#snippet control()}
              <textarea
                id="proposal-bulk-note"
                rows="2"
                bind:value={bulkNote}
                aria-describedby="proposal-bulk-note-hint"
              ></textarea>
            {/snippet}
          </EntityEditorFormField>
          <div class="entity-review-actions">
            <button
              type="button"
              class={bulkAction === "reject" ? "reject" : ""}
              disabled={batchRunning ||
                (bulkAction === "request-changes" && bulkNote.trim() === "")}
              onclick={() => bulkAction && runBatch(bulkAction)}
            >
              {batchRunning
                ? "Working…"
                : `${ACTION_LABELS[bulkAction]} ${selectedIds.size}`}
            </button>
            <button
              type="button"
              disabled={batchRunning}
              onclick={() => {
                bulkAction = null;
                bulkNote = "";
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      {/if}

      <ul class="entity-review-list">
        {#each groups as group (group.submitterName)}
          <li class="entity-review-group">
            <div class="entity-review-group-head">
              <label class="entity-review-select-all">
                <input
                  type="checkbox"
                  checked={groupSelected(group.proposals)}
                  onchange={() => toggleGroup(group.proposals)}
                  aria-label={`Select all ${group.proposals.length} suggestions from ${group.submitterName}`}
                />
                <Avatar name={group.submitterName} size={20} />
                {group.submitterName}
              </label>
              <span class="entity-review-count">
                {group.proposals.length} suggestion{group.proposals.length === 1
                  ? ""
                  : "s"}
              </span>
            </div>

            <ul class="entity-review-list entity-review-sublist">
              {#each group.proposals as proposal (proposal.id)}
                {@const diffs = diffsFor(proposal)}
                {@const stale = isStale(proposal)}
                <li class="entity-review-item">
                  <div class="entity-review-row">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(proposal.id)}
                      onchange={() => toggleSelected(proposal.id)}
                      aria-label={`Select ${proposal.entityLabel} for batch review`}
                    />
                    <details bind:open={openById[proposal.id]}>
                      <summary>
                        <span class="entity-review-entity">
                          {proposal.entityLabel}
                        </span>
                        <span class="entity-review-summary-meta">
                          {proposal.entityType} · {diffs.length} field{diffs.length ===
                          1
                            ? ""
                            : "s"}
                          {#if submittedOn(proposal.createdAt)}
                            · {submittedOn(proposal.createdAt)}
                          {/if}
                        </span>
                        {#if proposal.status === "needs_changes"}
                          <span class="entity-review-badge">needs changes</span>
                        {/if}
                        {#if stale}
                          <span class="entity-review-badge stale">stale</span>
                        {/if}
                      </summary>

                      {#if openById[proposal.id]}
                        {#if stale}
                          <p class="entity-review-stale" role="alert">
                            Published data changed since this was submitted.
                            Compare carefully — approving may conflict.
                          </p>
                        {/if}

                        <ul class="entity-review-changes">
                          {#each diffs as diff (diff.field)}
                            <li class="entity-review-diff">
                              <span class="entity-review-diff-label"
                                >{diff.label}</span
                              >
                              <span class="entity-review-diff-values">
                                <span
                                  class="entity-review-diff-old"
                                  class:entity-review-diff-before={diff.before !=
                                    null}
                                >
                                  {#if proposal.currentValues == null && proposal.entityType.startsWith("create_")}
                                    New entry
                                  {:else}
                                    {@render diffValue(
                                      diff.before,
                                      diff.beforeId,
                                    )}
                                  {/if}
                                </span>
                                <span aria-hidden="true">→</span>
                                <span class="entity-review-diff-after">
                                  {@render diffValue(diff.after, diff.afterId)}
                                </span>
                              </span>
                            </li>
                          {/each}
                        </ul>

                        {#if bundledRoomsSummary(proposal.entityType as ProposalEntityType, proposal.proposedPatch as Record<string, unknown>)}
                          <p class="entity-review-bundled">
                            {bundledRoomsSummary(
                              proposal.entityType as ProposalEntityType,
                              proposal.proposedPatch as Record<string, unknown>,
                            )}
                          </p>
                        {/if}

                        {#if proposal.submitterNote}
                          <p class="entity-review-submitter-note">
                            <strong>Note from {proposal.submitterName}:</strong>
                            {proposal.submitterNote}
                          </p>
                        {/if}

                        {#if proposal.status === "needs_changes" && proposal.adminNote}
                          <p class="entity-review-note">
                            Previous note: {proposal.adminNote}
                          </p>
                        {/if}

                        {#if pendingActionById[proposal.id]}
                          {@const action = pendingActionById[
                            proposal.id
                          ] as NoteAction}
                          <EntityEditorFormField
                            label={`Note to ${proposal.submitterName}`}
                            inputId="proposal-note-{proposal.id}"
                            hint={NOTE_HINTS[action]}
                          >
                            {#snippet control()}
                              <textarea
                                id="proposal-note-{proposal.id}"
                                rows="2"
                                bind:value={noteById[proposal.id]}
                                aria-describedby="proposal-note-{proposal.id}-hint"
                              ></textarea>
                            {/snippet}
                          </EntityEditorFormField>
                          <div class="entity-review-actions">
                            <button
                              type="button"
                              class={action === "reject" ? "reject" : ""}
                              disabled={actingId === proposal.id ||
                                (action === "request-changes" &&
                                  (noteById[proposal.id] ?? "").trim() === "")}
                              onclick={() => runAction(proposal.id, action)}
                            >
                              {actingId === proposal.id
                                ? "Working…"
                                : `Confirm ${ACTION_LABELS[action].toLowerCase()}`}
                            </button>
                            <button
                              type="button"
                              disabled={actingId === proposal.id}
                              onclick={() =>
                                (pendingActionById[proposal.id] = null)}
                            >
                              Cancel
                            </button>
                          </div>
                        {:else}
                          <EntityReviewActions
                            disabled={actingId === proposal.id}
                            onapprove={() => runAction(proposal.id, "approve")}
                            onrequestChanges={() =>
                              (pendingActionById[proposal.id] =
                                "request-changes")}
                            onreject={() =>
                              (pendingActionById[proposal.id] = "reject")}
                          />
                        {/if}
                      {/if}
                    </details>
                  </div>
                </li>
              {/each}
            </ul>
          </li>
        {/each}
      </ul>
    {/if}
  </section>
{/if}

<style>
  @import "./editor/review-panel.css";
  @import "./editor/entity-editor.css";

  .entity-review-batch {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.375rem;
    margin-bottom: 0.5rem;
    padding: 0.375rem 0.5rem;
    border: 1px solid hsl(0, 0%, 88%);
    border-radius: 8px;
    background: hsl(0, 0%, 98%);
  }

  .entity-review-batch-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
  }

  .entity-review-batch-actions button {
    padding: 0.3rem 0.6rem;
    border: 1px solid hsl(0, 0%, 78%);
    border-radius: 999px;
    background: white;
    color: hsl(0, 0%, 16%);
    font: inherit;
    font-size: 0.8rem;
    font-weight: 700;
    cursor: pointer;
  }

  .entity-review-batch-actions button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .entity-review-batch-actions .entity-review-batch-approve {
    border-color: hsl(140, 45%, 38%);
    background: hsl(140, 45%, 38%);
    color: white;
  }

  .entity-review-batch-actions .entity-review-batch-approve:hover:not(:disabled) {
    background: hsl(140, 45%, 44%);
  }

  .entity-review-batch-actions .entity-review-batch-reject {
    border-color: hsl(0, 70%, 78%);
    color: hsl(0, 70%, 32%);
  }

  .entity-review-select-all {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.8rem;
    font-weight: 600;
    color: hsl(0, 0%, 30%);
    cursor: pointer;
    min-width: 0;
  }

  .entity-review-selected-count {
    font-weight: 500;
    color: hsl(0, 0%, 42%);
  }

  .entity-review-bulk-note {
    margin-bottom: 0.5rem;
    padding: 0.5rem;
    border: 1px solid hsl(0, 0%, 88%);
    border-radius: 8px;
  }

  .entity-review-group {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .entity-review-group-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.25rem;
    padding: 0.125rem 0.125rem 0;
  }

  .entity-review-sublist {
    max-height: none;
    overflow: visible;
  }

  .entity-review-list {
    max-height: 22rem;
  }

  .entity-review-row {
    display: flex;
    align-items: flex-start;
    gap: 0.375rem;
    min-width: 0;
  }

  .entity-review-row > input {
    margin-top: 0.3rem;
    flex-shrink: 0;
  }

  .entity-review-row > details {
    flex: 1;
    min-width: 0;
  }

  .entity-review-row summary {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0.25rem 0.375rem;
    cursor: pointer;
    padding: 0.125rem 0;
    border-radius: 0.375rem;
  }

  .entity-review-row summary:focus-visible {
    outline: 2px solid hsl(5, 53%, 40%);
    outline-offset: 2px;
  }

  .entity-review-summary-meta {
    font-size: 0.75rem;
    color: hsl(0, 0%, 40%);
  }

  .entity-review-badge {
    padding: 0 0.3125rem;
    border-radius: 999px;
    background: hsl(0, 0%, 92%);
    color: hsl(0, 0%, 25%);
    font-size: 0.6875rem;
    font-weight: 700;
  }

  .entity-review-badge.stale {
    background: hsl(40, 90%, 88%);
    color: hsl(30, 60%, 25%);
  }

  /* Matches .entity-review-stale's shape so the two reviewer callouts read as
     one family. */
  .entity-review-submitter-note {
    margin: 0.375rem 0 0;
    padding: 0.35rem 0.5rem;
    border: 1px solid hsl(210, 45%, 82%);
    border-radius: 6px;
    background: hsl(210, 60%, 97%);
    font-size: 0.8125rem;
    line-height: 1.4;
    color: hsl(210, 40%, 22%);
  }

  .entity-review-bundled {
    margin: 0.35rem 0 0;
    font-size: 0.85rem;
    font-weight: 600;
    line-height: 1.35;
  }

  .entity-review-stale {
    margin: 0.35rem 0;
    padding: 0.35rem 0.5rem;
    border-radius: 6px;
    background: hsl(40 90% 92%);
    border: 1px solid hsl(40 70% 70%);
    color: hsl(30 60% 25%);
    font-size: 0.8rem;
    line-height: 1.35;
  }

  .entity-review-diff {
    display: flex;
    flex-wrap: wrap;
    gap: 0.15rem 0.5rem;
    font-size: 0.85rem;
    line-height: 1.4;
  }

  .entity-review-diff-label {
    font-weight: 600;
  }

  .entity-review-diff-values {
    display: inline-flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    min-width: 0;
  }

  .entity-review-diff-old {
    color: hsl(0 0% 45%);
    overflow-wrap: anywhere;
  }

  .entity-review-diff-before {
    text-decoration: line-through;
  }

  .entity-review-diff-after {
    font-weight: 600;
    overflow-wrap: anywhere;
  }

  .entity-review-diff-id {
    margin-left: 0.25rem;
    font-weight: 400;
    font-size: 0.6875rem;
    color: hsl(0, 0%, 50%);
  }
</style>
