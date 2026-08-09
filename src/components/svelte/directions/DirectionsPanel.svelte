<script lang="ts">
  /**
   * Google-Maps-shaped directions: a ranked option list with a headline ETA,
   * rendered inside the existing mobile sheet / desktop drawer (#966).
   *
   * The map stays live behind this panel — see BottomSheet, which no longer
   * lays a dismiss scrim over the map strip.
   */
  import { untrack } from "svelte";
  import Footprints from "@lucide/svelte/icons/footprints";
  import Bus from "@lucide/svelte/icons/bus";
  import X from "@lucide/svelte/icons/x";
  import Crosshair from "@lucide/svelte/icons/crosshair";
  import Navigation from "@lucide/svelte/icons/navigation";
  import MapPin from "@lucide/svelte/icons/map-pin";
  import { directionsStore, locationStore, mapStore } from "@lib/store.svelte";
  import { formatDistance, formatDuration } from "@lib/campus-route";
  import {
    describeJourney,
    PLAN_STATUS_NOTES,
    type Journey,
    type RideLeg,
  } from "@lib/travel-graph/journey";
  import NavigationBar from "./NavigationBar.svelte";
  import { JEEPNEY_FARE_NOTE } from "@constants/jeepney-routes";
  import {
    JEEPNEY_KPH,
    JEEPNEY_WAIT_SECONDS,
    WALK_KPH,
  } from "@constants/travel-modes";

  const journeys = $derived(directionsStore.journeys);
  const selected = $derived(directionsStore.selected);

  /** Clock time the rider actually arrives — the "how long till" answer. */
  function arrivalLabel(seconds: number): string {
    const at = new Date(Date.now() + seconds * 1000);
    return at.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function rideLeg(journey: Journey): RideLeg | undefined {
    return journey.legs.find((leg): leg is RideLeg => leg.kind === "ride");
  }

  function fitSelected() {
    const map = mapStore.mapInstance;
    const journey = selected;
    if (!map || !journey) return;
    const coords = journey.legs.flatMap((leg) => leg.coordinates);
    if (coords.length === 0) return;
    let [minLng, minLat] = coords[0];
    let [maxLng, maxLat] = coords[0];
    for (const [lng, lat] of coords) {
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
    }
    map.fitBounds(
      [
        [minLng, minLat],
        [maxLng, maxLat],
      ],
      { padding: { top: 72, bottom: 72, left: 48, right: 48 }, maxZoom: 18 },
    );
  }

  const statusNote = $derived(
    directionsStore.status ? PLAN_STATUS_NOTES[directionsStore.status] : null,
  );

  /**
   * The chip fires before the GPS watch has a fix, so the first plan often has
   * no origin. Replan when coordinates land, and again when they move far
   * enough to matter — a drifting fix must not re-run Dijkstra every tick.
   */
  const REPLAN_THRESHOLD_METERS = 25;
  /**
   * Plain `let`, not `$state`: this is bookkeeping the effect both reads and
   * writes, and as reactive state it would retrigger the very effect that set
   * it.
   */
  let plannedFrom: [number, number] | null = null;

  $effect(() => {
    // Only the GPS fix is a tracked dependency. Everything below is read and
    // written inside untrack, because replan() writes back to
    // directionsStore.origin/destination/phase — tracking those here would
    // make the effect retrigger itself (effect_update_depth_exceeded).
    const coords = locationStore.coords;
    if (!coords) return;

    untrack(() => {
      const destination = directionsStore.destination;
      if (!destination) return;

      if (plannedFrom) {
        const movedMeters = Math.hypot(
          (coords[0] - plannedFrom[0]) *
            111_320 *
            Math.cos((coords[1] * Math.PI) / 180),
          (coords[1] - plannedFrom[1]) * 111_320,
        );
        if (movedMeters < REPLAN_THRESHOLD_METERS) return;
      }

      plannedFrom = [coords[0], coords[1]];
      void directionsStore.replan(
        { lat: coords[1], lng: coords[0], label: "Your location" },
        destination,
      );
    });
  });
</script>

<section class="directions" aria-label="Directions">
  {#if directionsStore.navigating}
    <NavigationBar />
  {:else}
  <header class="directions__head">
    <div class="directions__ends">
      <p class="directions__end">
        <Crosshair size={14} aria-hidden="true" />
        <span>{directionsStore.origin?.label ?? "Your location"}</span>
      </p>
      <p class="directions__end directions__end--to">
        <MapPin size={14} aria-hidden="true" />
        <span>{directionsStore.destination?.label ?? "Destination"}</span>
      </p>
    </div>
    <button
      type="button"
      class="directions__close"
      aria-label="Close directions"
      onclick={() => directionsStore.close()}
    >
      <X size={18} aria-hidden="true" />
    </button>
  </header>

  {#if directionsStore.phase === "planning"}
    <p class="directions__note" role="status">
      {locationStore.coords
        ? "Finding the best ways there…"
        : "Waiting for your location…"}
    </p>
  {:else if directionsStore.phase === "error"}
    <p class="directions__note directions__note--warn" role="status">
      Could not load the campus path map. Check your connection and try again.
    </p>
  {:else if journeys.length === 0}
    <p class="directions__note directions__note--warn" role="status">
      {statusNote ?? "No route found."}
    </p>
  {:else}
    <ul class="directions__options">
      {#each journeys as journey (journey.id)}
        {@const ride = rideLeg(journey)}
        {@const isSelected = selected?.id === journey.id}
        <li>
          <button
            type="button"
            class="option"
            class:option--selected={isSelected}
            aria-pressed={isSelected}
            onclick={() => directionsStore.select(journey.id)}
          >
            <span
              class="option__icon"
              style:color={ride ? ride.color : "var(--color-brand, #8d1437)"}
              aria-hidden="true"
            >
              {#if ride}
                <Bus size={20} />
              {:else}
                <Footprints size={20} />
              {/if}
            </span>

            <span class="option__body">
              <span class="option__time">{formatDuration(journey.seconds)}</span>
              <span class="option__meta">
                {formatDistance(journey.meters)} · arrives {arrivalLabel(
                  journey.seconds,
                )}
              </span>
              <span class="option__desc">{describeJourney(journey)}</span>
              {#if ride}
                <span class="option__desc">
                  Board at {ride.boardStopName} · alight at {ride.alightStopName}
                </span>
                <span class="option__fare">
                  ₱{ride.fare.regular} · ₱{ride.fare.discounted} student/senior/PWD
                </span>
              {/if}
            </span>
          </button>
        </li>
      {/each}
    </ul>

    <div class="directions__actions">
      <button type="button" class="directions__ghost" onclick={fitSelected}>
        Show on map
      </button>
      <button
        type="button"
        class="directions__show"
        onclick={() => directionsStore.startNavigation()}
      >
        <Navigation size={16} aria-hidden="true" />
        Start
      </button>
    </div>

    <p class="directions__caveat">
      Estimated from campus path data at {WALK_KPH} km/h walking. Jeep times
      assume a {Math.round(JEEPNEY_WAIT_SECONDS / 60)} min wait and a {JEEPNEY_KPH}
      km/h average — there is no live tracking.
      {#if selected && rideLeg(selected)}
        {JEEPNEY_FARE_NOTE}
      {/if}
    </p>
  {/if}
  {/if}
</section>

<style>
  .directions {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    width: 100%;
  }

  .directions__head {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .directions__ends {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    gap: 0.25rem;
    min-width: 0;
  }

  .directions__end {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    margin: 0;
    color: #52525b;
    font-size: 0.8125rem;
    line-height: 1.3;
  }

  .directions__end span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .directions__end--to {
    color: #18181b;
    font-weight: 600;
  }

  .directions__close {
    display: flex;
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;
    width: 2.25rem;
    height: 2.25rem;
    padding: 0;
    border: none;
    border-radius: 999px;
    background: #f4f4f5;
    color: #3f3f46;
    cursor: pointer;
  }

  .directions__close:hover,
  .directions__close:focus-visible {
    background: #e4e4e7;
  }

  .directions__note {
    margin: 0;
    color: #52525b;
    font-size: 0.875rem;
  }

  .directions__note--warn {
    color: #92400e;
  }

  .directions__options {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .option {
    display: flex;
    gap: 0.625rem;
    width: 100%;
    /* 44px minimum target, matching the browse chips (#942). */
    min-height: 2.75rem;
    padding: 0.625rem;
    border: 1px solid transparent;
    border-radius: 0.75rem;
    background: #fafafa;
    text-align: left;
    cursor: pointer;
  }

  .option:hover {
    background: #f4f4f5;
  }

  .option--selected {
    border-color: var(--color-brand, #8d1437);
    background: #fff;
    box-shadow: var(--shadow-results, 0 2px 6px rgb(36 37 46 / 0.2));
  }

  .option__icon {
    display: flex;
    flex: 0 0 auto;
    align-items: flex-start;
    padding-top: 0.125rem;
  }

  .option__body {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    gap: 0.125rem;
    min-width: 0;
  }

  .option__time {
    color: #18181b;
    font-size: 1.125rem;
    font-weight: 700;
    line-height: 1.2;
  }

  .option__meta {
    color: #3f3f46;
    font-size: 0.8125rem;
  }

  .option__desc,
  .option__fare {
    color: #52525b;
    font-size: 0.75rem;
    line-height: 1.35;
  }

  .option__fare {
    color: #3f3f46;
    font-weight: 600;
  }

  .directions__actions {
    display: flex;
    gap: 0.5rem;
  }

  .directions__ghost {
    flex: 0 1 auto;
    min-height: 2.75rem;
    padding: 0.625rem 1rem;
    border: 1px solid #e4e4e7;
    border-radius: 999px;
    background: #fff;
    color: #3f3f46;
    font-size: 0.9375rem;
    font-weight: 600;
    cursor: pointer;
  }

  .directions__ghost:hover,
  .directions__ghost:focus-visible {
    background: #f4f4f5;
  }

  .directions__show {
    display: flex;
    flex: 1 1 auto;
    align-items: center;
    justify-content: center;
    gap: 0.375rem;
    min-height: 2.75rem;
    padding: 0.625rem 1rem;
    border: none;
    border-radius: 999px;
    background: var(--color-brand, #8d1437);
    color: #fff;
    font-size: 0.9375rem;
    font-weight: 600;
    cursor: pointer;
  }

  .directions__show:hover,
  .directions__show:focus-visible {
    filter: brightness(1.08);
  }

  .directions__caveat {
    margin: 0;
    color: #71717a;
    font-size: 0.6875rem;
    line-height: 1.4;
  }
</style>
