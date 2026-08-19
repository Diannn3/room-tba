// src/lib/store.svelte.ts

import type { BuildingTypeFilter } from '$lib/constants/content/categories/building.js';
import { getJSONFetch, getLocalRoomByCode } from '../utils/local/data/utils.js';
import { deactivateMapModesExcept, type ExclusiveMapMode, registerMapMode } from './map/map-modes.js';
import {
	type AppBootstrapPhase,
	type EventPlacementDraft,
	type FloatingControlPanel,
	type LandingModalTab,
	type MapProposalTarget,
	type MapToolsSection,
	type OfflineStatus,
	type QueryStoreState,
	type SyncActivity,
	type SyncInfo,
	type SyncTableKey,
	syncTableLabel,
	type TerrainStatus
} from './store-types.js';
import AnnouncementsStore from './AnnouncementStore.svelte.js';
import {
	ClassVenuesStore,
	PlannerBuildingsStore,
	RoomClassesStore,
	TermStore
} from './data-stores.svelte';
import {
	AdditionProposalStore,
	EditorChromeStore,
	EventPlacementStore,
	MapEditStore,
	MapProposalStore
} from './editor/editor-stores.svelte.js';
import {
	Building3DStore,
	MapStore,
	MapToolsStore,
	MapViewStore,
	MeasureRouteStore,
	TerrainStore,
	TrailStore,
	TravelTimeStore
} from './map/map-stores.svelte.js';
import PlannerStore from './PlannerStore.svelte.js';
import TransitStore from './TransitStore.svelte.js';
import QueryStore from './QueryStore.svelte.js';
import SidebarStore from './ui/SidebarStore.svelte.js';
import SidePanelStore from './ui/SidePanelStore.svelte.js';
import ModalStore from './ui/ModalStore.svelte.js';
import ToastStore from './ui/ToastStore.svelte.js';
import FloatingControlPanelStore from './ui/FloatingControlPanelStore.svelte.js';

export type { MeasureLeg, MeasureSummaries } from './map/map-stores.svelte.js';
export type {
	AppBootstrapPhase,
	BuildingTypeFilter,
	EventPlacementDraft,
	ExclusiveMapMode,
	FloatingControlPanel,
	LandingModalTab,
	MapProposalTarget,
	MapToolsSection,
	OfflineStatus,
	QueryStoreState,
	SyncActivity,
	SyncInfo,
	SyncTableKey,
	TerrainStatus
};
export { deactivateMapModesExcept, syncTableLabel };

import type { RoomData } from '$lib/utils/types.js';

export {
	buildingTypeFilter,
	type DormFilterType,
	dormFilter
} from './filter-stores.svelte.js';

import { OfflineStore } from './sync/OfflineStore.svelte.js';
import SyncToastStore from './sync/SyncToastStore.svelte.js';
import AppBootstrapStore from './sync/AppBootstrapStore.svelte.js';
import LocationStore from './map/LocationStore.svelte.js';
import ProposalsStore from './ProposalsStore.svelte.js';
import AdminAuthStore from './AdminAuthStore.svelte.js';
import JeepneyStore from './map/JeepneyStores.svelte.js';
import ScheduleRouteStore from './map/ScheduleRouteStore.svelte.js';

let _currentRoom = $state<RoomData | null>(null);
let _currentRoomNotFound = $state(false);
let roomLoadGeneration = 0;
export const currentRoom = {
	get value() {
		return _currentRoom;
	},
	/** True only after a lookup completed without a match. While null and not
	 * notFound, the room is still being fetched (or a fetch is about to start),
	 * so panels should show a loading state rather than "not found". */
	get notFound() {
		return _currentRoomNotFound;
	},
	async getRoomByCode(code: string) {
		// Overlapping lookups: only the newest may write. Otherwise a slow
		// earlier fetch lands last and stamps notFound from a stale result.
		const generation = ++roomLoadGeneration;
		_currentRoom = null;
		_currentRoomNotFound = false;
		try {
			const localRoom = await getLocalRoomByCode(code);
			if (localRoom === null) {
				const codeParam = encodeURI(code.toUpperCase());
				const remoteRoomReq = await getJSONFetch<{ data: RoomData }>(
					`/api/rooms?code=${codeParam}`
				);
				if (generation !== roomLoadGeneration) return;
				_currentRoom = remoteRoomReq.data;
				return;
			}
			if (generation !== roomLoadGeneration) return;
			_currentRoom = localRoom;
		} catch (e) {
			console.error(e);
			if (generation !== roomLoadGeneration) return;
			_currentRoom = null;
		} finally {
			if (generation === roomLoadGeneration) {
				_currentRoomNotFound = _currentRoom === null;
			}
		}
	},
	async getRoomFromSearch(room: RoomData) {
		roomLoadGeneration++;
		_currentRoom = room;
		_currentRoomNotFound = false;
	},
	setRoom(room: RoomData) {
		roomLoadGeneration++;
		_currentRoom = room;
		_currentRoomNotFound = false;
	}
};


export { plannerRoomCodes } from './data-stores.svelte';


export const queryStore = new QueryStore();
export const termStore = new TermStore();
export const roomClassesStore = new RoomClassesStore();
export const classVenuesStore = new ClassVenuesStore();
export const plannerBuildingsStore = new PlannerBuildingsStore();
export const plannerStore = new PlannerStore(() => termStore.activeTermId);
export const scheduleRouteStore = new ScheduleRouteStore();
export const offlineStore = new OfflineStore();
export const modalStore = new ModalStore();
export const toastStore = new ToastStore();
export const locationStore = new LocationStore();
export const mapStore = new MapStore();
export const mapViewStore = new MapViewStore();
export const floatingControlPanelStore = new FloatingControlPanelStore();
export const mapToolsStore = new MapToolsStore();
export const editorChromeStore = new EditorChromeStore();
export const mapEditStore = new MapEditStore();
export const mapProposalStore = new MapProposalStore();
export const additionProposalStore = new AdditionProposalStore();
export const eventPlacementStore = new EventPlacementStore();
export const terrainStore = new TerrainStore();
export const trailStore = new TrailStore();
export const travelTimeStore = new TravelTimeStore();
export const measureRouteStore = new MeasureRouteStore();
export const jeepneyStore = new JeepneyStore();
export const transitStore = new TransitStore();
export const announcementsStore = new AnnouncementsStore();
export const appBootstrapStore = new AppBootstrapStore();
export const syncToastStore = new SyncToastStore();
export const building3DStore = new Building3DStore();
export const adminAuthStore = new AdminAuthStore();
export const proposalsStore = new ProposalsStore();
export const sidebarStore = new SidebarStore();
export const sidePanelStore = new SidePanelStore();

// Map modes (edit, jeepney routes, Makiling terrain) are mutually exclusive.
registerMapMode('edit', {
	disable: () => {
		mapEditStore.close();
		eventPlacementStore.cancel();
	}
});
registerMapMode('routes', {
	disable: () => {
		jeepneyStore.disableLayer();
	}
});
registerMapMode('terrain', {
	disable: () => {
		terrainStore.disable();
	}
});
registerMapMode('travel-time', {
	disable: () => {
		travelTimeStore.disable();
	}
});
registerMapMode('measure', {
	disable: () => {
		measureRouteStore.disable();
	}
});
