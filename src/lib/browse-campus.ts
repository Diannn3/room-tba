import { dismissEphemeralOverlays } from "./overlay-stack.js";
import {
  campusBrowseQuery,
  type CampusBrowseTab,
} from "./browse-campus-shared.js";
import type { SidePanelStore, QueryStore } from "./stores/ui-stores.svelte.js";

export type { CampusBrowseTab } from "./browse-campus-shared.js";
import CampusBrowseList from "@ui/controls/CampusBrowseList.svelte";
import ClassesList from "@ui/controls/CampusBrowseList.svelte";

export function openCampusBrowse(
  queryStore: QueryStore,
  sidePanelStore: SidePanelStore,
  tab: CampusBrowseTab = "buildings",
) {
  dismissEphemeralOverlays();
  queryStore.updateQuery(campusBrowseQuery(tab));
  queryStore.inputValue = "";
}

export function openBrowseClasses(queryStore: QueryStore) {
  dismissEphemeralOverlays();
  queryStore.updateQuery({
    category: "classes",
    type: "result",
    value: "All classes",
  });
  queryStore.inputValue = "";
  // sidePanelStore.expand();
}
