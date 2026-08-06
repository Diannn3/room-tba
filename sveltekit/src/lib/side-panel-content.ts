import type { Component } from "svelte";
import BuildingResult from "$lib/components/svelte/controls/BuildingResult.svelte";
import CampusBrowseList from "$lib/components/svelte/controls/CampusBrowseList.svelte";
import ClassQuery from "$lib/components/svelte/controls/ClassQuery.svelte";
import ClassesList from "$lib/components/svelte/controls/ClassesList.svelte";
import CollegeResult from "$lib/components/svelte/controls/CollegeResult.svelte";
import DivisionResult from "$lib/components/svelte/controls/DivisionResult.svelte";
import DormResult from "$lib/components/svelte/controls/DormResult.svelte";
import EventResult from "$lib/components/svelte/controls/EventResult.svelte";
import EventsList from "$lib/components/svelte/controls/EventsList.svelte";
import OrgResult from "$lib/components/svelte/controls/OrgResult.svelte";
import PlaceResult from "$lib/components/svelte/controls/PlaceResult.svelte";
import ProposalReviewPanel from "$lib/components/svelte/ProposalReviewPanel.svelte";
import RoomResult from "$lib/components/svelte/room/RoomResult.svelte";
import type { QueryStoreState, SidePanelMetaData } from "./stores/store-types";

type Category = NonNullable<QueryStoreState["category"]>;

const CATEGORY_PANELS: Record<Category, Component> = {
  building: BuildingResult,
  college: CollegeResult,
  division: DivisionResult,
  room: RoomResult,
  class: ClassQuery,
  classes: ClassesList,
  browse: CampusBrowseList,
  dorm: DormResult,
  organization: OrgResult,
  place: PlaceResult,
  event: EventResult,
  events: EventsList,
};

/**
 * The component the side panel renders.
 *
 * `openPanel()` metadata wins when it names one, but it cannot be the only
 * source. Deep links, browser back/forward and every caller that only sets a
 * query never reach `openPanel()`, so gating the panel on it alone left those
 * paths showing an empty map. Resolving from the query category here keeps one
 * gate for every path instead of pairing `openPanel()` at each call site.
 */
export function resolvePanelContent(
  state: SidePanelMetaData | null,
  category: QueryStoreState["category"],
): Component | null {
  if (state) {
    if (state.type === "admin-suggestions") return ProposalReviewPanel;
    if (state.type === "browsing-events") return EventsList;
    if (state.component) return state.component;
  }
  return category ? (CATEGORY_PANELS[category] ?? null) : null;
}
