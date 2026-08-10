<script lang="ts">
  /**
   * Origin → stops → destination under the search bar while Get Directions
   * is open. Reorder/remove waypoints here; the bottom sheet only shows options.
   */
  import Crosshair from "@lucide/svelte/icons/crosshair";
  import MapPin from "@lucide/svelte/icons/map-pin";
  import ChevronUp from "@lucide/svelte/icons/chevron-up";
  import ChevronDown from "@lucide/svelte/icons/chevron-down";
  import X from "@lucide/svelte/icons/x";
  import { directionsStore } from "@lib/store.svelte";

  const waypoints = $derived(directionsStore.waypoints);
</script>

{#if directionsStore.active && !directionsStore.navigating}
  <div class="directions-route-chips">
    <div
      class="directions-route-chips__list"
      role="list"
      aria-label="Directions stop sequence"
    >
      <p class="directions-route-chips__end" role="listitem">
        <Crosshair size={14} aria-hidden="true" />
        <span>{directionsStore.origin?.label ?? "Your location"}</span>
      </p>

      {#each waypoints as stop, index (stop.label + index)}
        <div class="directions-route-chips__stop" role="listitem">
          <span class="directions-route-chips__badge" aria-hidden="true"
            >{index + 1}</span
          >
          <span class="directions-route-chips__label">{stop.label}</span>
          <div class="directions-route-chips__actions">
            <button
              type="button"
              class="directions-route-chips__icon"
              aria-label={`Move ${stop.label} up`}
              disabled={index === 0}
              onmousedown={(event) => event.preventDefault()}
              onclick={() => void directionsStore.moveWaypoint(index, index - 1)}
            >
              <ChevronUp size={14} aria-hidden="true" />
            </button>
            <button
              type="button"
              class="directions-route-chips__icon"
              aria-label={`Move ${stop.label} down`}
              disabled={index === waypoints.length - 1}
              onmousedown={(event) => event.preventDefault()}
              onclick={() => void directionsStore.moveWaypoint(index, index + 1)}
            >
              <ChevronDown size={14} aria-hidden="true" />
            </button>
            <button
              type="button"
              class="directions-route-chips__icon"
              aria-label={`Remove stop ${stop.label}`}
              onmousedown={(event) => event.preventDefault()}
              onclick={() => void directionsStore.removeWaypoint(index)}
            >
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        </div>
      {/each}

      <p
        class="directions-route-chips__end directions-route-chips__end--to"
        role="listitem"
      >
        <MapPin size={14} aria-hidden="true" />
        <span>{directionsStore.destination?.label ?? "Destination"}</span>
      </p>
    </div>

    <button
      type="button"
      class="directions-route-chips__close"
      aria-label="Close directions"
      onmousedown={(event) => event.preventDefault()}
      onclick={() => directionsStore.close()}
    >
      <X size={16} aria-hidden="true" />
    </button>
  </div>
{/if}

<style>
  .directions-route-chips {
    display: flex;
    align-items: flex-start;
    gap: 0.375rem;
    max-width: 100%;
    min-width: 0;
    margin-top: 0.375rem;
    padding: 0.5rem 0.55rem;
    border-radius: 0.875rem;
    background: #fff;
    border: 1px solid hsl(5 10% 86%);
    box-shadow: var(--shadow-search, 0 1px 3.5px rgb(58 58 71 / 0.12));
    pointer-events: auto;
  }

  .directions-route-chips__list {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    gap: 0.3rem;
    min-width: 0;
  }

  .directions-route-chips__end {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    margin: 0;
    min-width: 0;
    color: #52525b;
    font-size: 0.8125rem;
    line-height: 1.3;
  }

  .directions-route-chips__end span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .directions-route-chips__end--to {
    color: #18181b;
    font-weight: 600;
  }

  .directions-route-chips__stop {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    min-width: 0;
  }

  .directions-route-chips__badge {
    display: flex;
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;
    width: 1.15rem;
    height: 1.15rem;
    border-radius: 999px;
    background: var(--color-brand, #8d1437);
    color: #fff;
    font-size: 0.625rem;
    font-weight: 700;
  }

  .directions-route-chips__label {
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: #18181b;
    font-size: 0.8125rem;
    font-weight: 500;
  }

  .directions-route-chips__actions {
    display: flex;
    flex: 0 0 auto;
    gap: 0.1rem;
  }

  .directions-route-chips__icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.5rem;
    height: 1.5rem;
    padding: 0;
    border: none;
    border-radius: 0.35rem;
    background: #f4f4f5;
    color: #3f3f46;
    cursor: pointer;
  }

  .directions-route-chips__icon:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  .directions-route-chips__icon:not(:disabled):hover,
  .directions-route-chips__icon:not(:disabled):focus-visible {
    background: #e4e4e7;
  }

  .directions-route-chips__close {
    display: flex;
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    padding: 0;
    border: none;
    border-radius: 999px;
    background: #f4f4f5;
    color: #3f3f46;
    cursor: pointer;
  }

  .directions-route-chips__close:hover,
  .directions-route-chips__close:focus-visible {
    background: #e4e4e7;
  }

  @media (max-width: 48rem) {
    .directions-route-chips {
      margin-top: 0.5rem;
      padding: 0.55rem 0.6rem;
    }
  }
</style>
