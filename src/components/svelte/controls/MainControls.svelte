<script lang="ts">
  import Search from "@ui/search/Search.svelte";
  import { queryStore, sidePanelStore, jeepneyStore } from "@lib/store.svelte";
    import SidePanel from "./SidePanel.svelte";
  let lastPanelIdentity = $state<string | null>(null);
  const panelIdentity = $derived(
    queryStore.category === null
      ? null
      : queryStore.category === "event" && queryStore.selectedEventSlug
        ? `event:${queryStore.selectedEventSlug}`
        : `${queryStore.category}:${queryStore.queryValue}`,
  );

  $effect(() => {
    const identity = panelIdentity;
    if (identity === lastPanelIdentity) return;

    sidePanelStore.expand();
    jeepneyStore.closeStop();
    lastPanelIdentity = identity;
  });

</script>

<div class="side-panel-wrapper">
  <Search />
  <div class="side-panel-controls">
    <SidePanel />
  </div>
</div>

<style>
  .side-panel-wrapper {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    flex: 1;
    min-height: 0;
    overflow: visible;
    pointer-events: none;
  }

  .side-panel-controls {
    display: flex;
    flex: 1;
    align-items: flex-end;
    min-height: 0;
  }
  @media screen and (max-width: 48rem) {
    .side-panel-wrapper {
      position: relative;
      gap: 0;
      margin-inline: var(--map-ui-padding, 0.375rem);
      width: auto;
      max-width: none;
      flex: 1;
      pointer-events: none;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      min-height: 0;
      overflow: visible;
    }

    .side-panel-controls {
      flex: 0 0 auto;
      min-height: 0;
      pointer-events: none;
    }

  }
</style>
