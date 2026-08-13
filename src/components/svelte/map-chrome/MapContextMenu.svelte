<script lang="ts">
  import type * as mapGl from "maplibre-gl";
  import { onMount } from "svelte";
  import { trapFocus } from "@lib/focus-trap";
  import { portal } from "@lib/portal";
  import {
    registerEphemeralOverlayDismisser,
    openEphemeralOverlay,
  } from "@lib/overlay-stack";
  import { mapStore, mapViewStore } from "@lib/store.svelte";
  import "./map-chrome.css";

  type MenuState = { x: number; y: number; lat: number; lng: number };

  let menu = $state<MenuState | null>(null);
  let panelEl = $state<HTMLDivElement | null>(null);

  onMount(() => registerEphemeralOverlayDismisser(() => (menu = null)));

  // #964: right-click opens map options. Registered here rather than in
  // Map.svelte so the whole feature stays in one component (the same shape
  // MapControlsStack uses to subscribe to camera events).
  $effect(() => {
    const map = mapStore.mapInstance;
    if (!map) return;
    const handleContextMenu = (event: mapGl.MapMouseEvent) => {
      // MapLibre suppresses the native menu once a listener exists; keep the
      // explicit call so a future listener reshuffle cannot regress it.
      event.originalEvent.preventDefault();
      openEphemeralOverlay(() => {
        menu = {
          x: event.originalEvent.clientX,
          y: event.originalEvent.clientY,
          lat: event.lngLat.lat,
          lng: event.lngLat.lng,
        };
      });
    };
    map.on("contextmenu", handleContextMenu);
    return () => {
      map.off("contextmenu", handleContextMenu);
    };
  });

  // Clamp to the viewport once the panel has a size; right-clicks near the
  // bottom/right edge would otherwise push the menu off-screen.
  const clamped = $derived.by(() => {
    const state = menu;
    if (!state) return null;
    const width = panelEl?.offsetWidth ?? 0;
    const height = panelEl?.offsetHeight ?? 0;
    if (typeof window === "undefined") return { left: state.x, top: state.y };
    return {
      left: Math.max(8, Math.min(state.x, window.innerWidth - width - 8)),
      top: Math.max(8, Math.min(state.y, window.innerHeight - height - 8)),
    };
  });

  function close() {
    menu = null;
  }

  $effect(() => {
    if (!menu || !panelEl) return;
    return trapFocus(panelEl, { onEscape: close });
  });

  function handleDocumentPointerDown(event: PointerEvent) {
    if (!menu) return;
    const target = event.target;
    if (!(target instanceof Node)) return;
    if (panelEl?.contains(target)) return;
    close();
  }
</script>

<svelte:window onpointerdown={handleDocumentPointerDown} />

{#if menu && clamped}
  <div
    bind:this={panelEl}
    class="map-context-menu map-chrome-popover"
    style={`left: ${clamped.left}px; top: ${clamped.top}px;`}
    role="dialog"
    aria-label="Map options"
    use:portal
  >
    <label class="map-context-menu__toggle">
      <input
        type="checkbox"
        checked={mapViewStore.cameraDebug}
        onchange={mapViewStore.toggleCameraDebug}
      />
      Show camera details
    </label>
    <p class="map-chrome-popover-footnote">
      {menu.lat.toFixed(5)}, {menu.lng.toFixed(5)}
    </p>
  </div>
{/if}

<style>
  .map-context-menu {
    position: fixed;
    z-index: var(--z-chrome-popover, 17);
    width: min(13rem, calc(100vw - 1rem));
    padding: 0.375rem;
  }

  .map-context-menu__toggle {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.375rem;
    border-radius: 0.5rem;
    font-size: 0.8125rem;
    font-weight: 600;
    color: hsl(0, 0%, 13%);
    cursor: pointer;
  }

  .map-context-menu__toggle:hover {
    background-color: hsl(5, 20%, 95%);
  }

  .map-context-menu__toggle input {
    accent-color: hsl(5, 53%, 32%);
    width: 0.9375rem;
    height: 0.9375rem;
  }
</style>
