<script lang="ts">
  import MapViewControls from "@ui/MapViewControls.svelte";
  import TerrainControl from "@ui/TerrainControl.svelte";
  import ScheduleImportPanel from "@ui/ScheduleImportPanel.svelte";
  import { TERRAIN_ENABLED } from "@constants/map-terrain";
  import { clearCachedData } from "@lib/local/clear-cached-data";
  import "../map-chrome/map-chrome.css";

  let confirming = $state(false);
  let clearing = $state(false);
  let confirmButton = $state<HTMLButtonElement | null>(null);

  // Opening the confirm swaps the button out from under the pointer, which
  // would drop keyboard focus to <body>. Move it to the confirm instead.
  $effect(() => {
    if (confirming) confirmButton?.focus();
  });

  // The reload is the success signal, so there is no toast: either the page
  // comes back clean or the button is still sitting there.
  async function clearAndReload() {
    if (clearing) return;
    clearing = true;
    await clearCachedData();
    location.reload();
  }
</script>

<div class="settings-modal">
  <h2 class="settings-modal__title">Settings</h2>
  <div class="settings-modal__scroll map-chrome-scroll">
    <section class="settings-modal__section">
      <h3>View</h3>
      <MapViewControls embedded variant="modes" />
    </section>
    {#if TERRAIN_ENABLED}
      <section class="settings-modal__section">
        <h3>Terrain</h3>
        <TerrainControl embedded />
      </section>
    {/if}
    <section class="settings-modal__section">
      <h3>Schedule</h3>
      <ScheduleImportPanel embedded />
    </section>
    <section class="settings-modal__section">
      <h3>Storage</h3>
      <p class="settings-modal__hint">
        Fixes a stuck app after a bad update: clears the cached app, saved
        campus data, and downloaded offline maps, then reloads. Your saved
        class plans stay.
      </p>
      {#if confirming}
        <p
          id="settings-storage-warning"
          class="settings-modal__hint settings-modal__hint--warn"
        >
          Downloaded offline maps go too — you will need to download them again
          on a connection.
        </p>
        <div class="settings-modal__actions">
          <button
            type="button"
            class="settings-modal__btn settings-modal__btn--danger"
            aria-describedby="settings-storage-warning"
            disabled={clearing}
            bind:this={confirmButton}
            onclick={clearAndReload}
          >
            {clearing ? "Clearing…" : "Clear and reload"}
          </button>
          <button
            type="button"
            class="settings-modal__btn"
            disabled={clearing}
            onclick={() => (confirming = false)}
          >
            Cancel
          </button>
        </div>
      {:else}
        <div class="settings-modal__actions">
          <button
            type="button"
            class="settings-modal__btn"
            onclick={() => (confirming = true)}
          >
            Clear cached data and reload
          </button>
        </div>
      {/if}
    </section>
  </div>
</div>

<style>
  .settings-modal {
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
    padding: 0.5rem 0.5rem 0.25rem;
    flex: 1 1 auto;
    min-height: 0;
  }

  .settings-modal__title {
    margin: 0;
    padding-right: 2.25rem;
    font-size: 1rem;
    font-weight: 700;
    color: hsl(0, 0%, 15%);
  }

  .settings-modal__scroll {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    /* Left padding keeps glyph edges out of the overflow clip (the "E" in
       Explore was losing its left stem). */
    padding: 0 0.375rem 0 0.25rem;
  }

  .settings-modal__section {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .settings-modal__section h3 {
    margin: 0;
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.02em;
    text-transform: uppercase;
    color: hsl(0, 0%, 40%);
  }

  .settings-modal__hint {
    margin: 0;
    font-size: 0.8125rem;
    line-height: 1.35;
    color: hsl(0, 0%, 40%);
  }

  .settings-modal__hint--warn {
    color: hsl(5, 53%, 32%);
  }

  .settings-modal__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem;
    margin-top: 0.125rem;
  }

  .settings-modal__btn {
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    /* 44px touch target. */
    min-height: 2.75rem;
    border: 1px solid hsl(0, 0%, 82%);
    border-radius: 0.5rem;
    padding: 0.4375rem 0.75rem;
    background-color: white;
    color: hsl(0, 0%, 20%);
    font: inherit;
    font-size: 0.8125rem;
    font-weight: 600;
    line-height: 1.2;
    cursor: pointer;
  }

  .settings-modal__btn:hover:not(:disabled) {
    background-color: hsl(0, 0%, 96%);
  }

  .settings-modal__btn:focus-visible {
    outline: 2px solid hsl(5, 53%, 32%);
    outline-offset: 2px;
  }

  .settings-modal__btn:disabled {
    opacity: 0.6;
    cursor: default;
  }

  .settings-modal__btn--danger {
    border-color: hsl(5, 53%, 32%);
    background-color: hsl(5, 53%, 32%);
    color: white;
  }

  .settings-modal__btn--danger:hover:not(:disabled) {
    background-color: hsl(5, 53%, 27%);
  }
</style>
