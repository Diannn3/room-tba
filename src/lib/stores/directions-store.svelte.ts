/**
 * Directions session state (#966): where the rider is going, the ranked ways
 * to get there, and which one is drawn on the map.
 *
 * The search itself is pure and lives in lib/travel-graph/journey.ts; this
 * only owns session state and the lazy graph fetch, so the planner stays
 * unit-testable without a store.
 */

import { JEEPNEY_ROUTES } from "@constants/jeepney-routes";
import {
  type Journey,
  type LatLng,
  type PlanStatus,
  planJourneys,
} from "../travel-graph/journey";
import { loadTravelGraph } from "../travel-graph/load";

export type DirectionsPhase = "idle" | "planning" | "ready" | "error";

export type DirectionsEndpoint = LatLng & { label: string };

export class DirectionsStore {
  phase: DirectionsPhase = $state("idle");
  origin: DirectionsEndpoint | null = $state(null);
  destination: DirectionsEndpoint | null = $state(null);
  journeys: Journey[] = $state([]);
  selectedId: string | null = $state(null);
  /** Why an empty result is empty; drives the rider-facing note. */
  status: PlanStatus | null = $state(null);

  /**
   * Turn-by-turn-style follow mode: tilted camera locked to the rider's
   * heading. Separate from `active` because the option list and the follow
   * camera are different screens over the same plan.
   */
  navigating: boolean = $state(false);

  /**
   * Whether the camera is still locked to the rider. A manual pan releases it
   * (as GMaps does) and the recentre button takes it back.
   */
  cameraFollowing: boolean = $state(true);

  /** Guards against a slow plan landing after a newer one. */
  #planToken = 0;

  get active(): boolean {
    return this.phase !== "idle";
  }

  get selected(): Journey | null {
    if (this.journeys.length === 0) return null;
    return (
      this.journeys.find((journey) => journey.id === this.selectedId) ??
      this.journeys[0]
    );
  }

  /** Total seconds for the selected option — the "12 min" headline. */
  get selectedSeconds(): number | null {
    return this.selected?.seconds ?? null;
  }

  open = async (
    destination: DirectionsEndpoint,
    origin: DirectionsEndpoint | null,
  ) => {
    this.destination = destination;
    this.origin = origin;
    this.selectedId = null;
    this.journeys = [];
    this.status = null;

    if (!origin) {
      // Waiting on a GPS fix; replan() runs once coords arrive.
      this.phase = "planning";
      return;
    }
    await this.replan(origin, destination);
  };

  /** Re-run the search, e.g. when the GPS fix finally lands or improves. */
  replan = async (
    origin: DirectionsEndpoint,
    destination: DirectionsEndpoint,
  ) => {
    const token = ++this.#planToken;
    this.phase = "planning";
    this.origin = origin;
    this.destination = destination;

    try {
      const graph = await loadTravelGraph();
      if (token !== this.#planToken) return; // superseded

      const plan = planJourneys({
        graph,
        origin,
        destination,
        routes: JEEPNEY_ROUTES,
      });

      this.journeys = plan.journeys;
      this.status = plan.status;
      this.selectedId = plan.journeys[0]?.id ?? null;
      this.phase = "ready";
    } catch {
      if (token !== this.#planToken) return;
      this.journeys = [];
      this.status = null;
      this.phase = "error";
    }
  };

  select = (id: string) => {
    this.selectedId = id;
  };

  startNavigation = () => {
    if (!this.selected) return;
    this.navigating = true;
    this.cameraFollowing = true;
  };

  stopNavigation = () => {
    this.navigating = false;
    this.cameraFollowing = true;
  };

  /** A manual pan drops the camera lock; the recentre button restores it. */
  releaseCamera = () => {
    this.cameraFollowing = false;
  };

  recenter = () => {
    this.cameraFollowing = true;
  };

  /**
   * Tear down the session. `onClose` clears cross-store leftovers (legacy
   * OSRM destination) without this module importing locationStore.
   */
  onClose: (() => void) | null = null;

  close = () => {
    this.#planToken++;
    this.phase = "idle";
    this.navigating = false;
    this.cameraFollowing = true;
    this.origin = null;
    this.destination = null;
    this.journeys = [];
    this.selectedId = null;
    this.status = null;
    this.onClose?.();
  };
}
