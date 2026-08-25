import { recordSyncTelemetry } from '../../utils/telemetry.js';
import type { SyncActivity, SyncInfo, SyncTableKey } from '../store-types.js';
import { syncTableLabel } from '../store-types.js';

export default class SyncToastStore {
	activity = $state<SyncActivity>('idle');
	activityTable = $state<SyncTableKey | null>(null);
	fetchProgress = $state<{ done: number; total: number } | null>(null);
	syncError = $state<string | null>(null);

	private _buildings = $state<SyncInfo | null>(null);
	private _colleges = $state<SyncInfo | null>(null);
	private _divisions = $state<SyncInfo | null>(null);
	private _dorms = $state<SyncInfo | null>(null);
	private _events = $state<SyncInfo | null>(null);
	private _aliases = $state<SyncInfo | null>(null);
	private _classes = $state<SyncInfo | null>(null);

	private _syncStartTime = $state<number>(0);

	currentSync = $state<SyncTableKey | null>(null);
	allSynced = $state<boolean>(false);
	recentlySynced = $state<boolean | null>(null);
	fetchingRemote = $state<boolean>(false);

	currentSyncData = $derived.by((): SyncInfo | null => {
		switch (this.currentSync) {
			case 'buildings':
				return this._buildings;
			case 'colleges':
				return this._colleges;
			case 'divisions':
				return this._divisions;
			case 'dorms':
				return this._dorms;
			case 'events':
				return this._events;
			case 'aliases':
				return this._aliases;
			default:
				return null;
		}
	});

	isSyncing = $derived(
		!this.allSynced && this.syncError === null && (this.activity !== 'idle' || this.fetchingRemote)
	);

	hasCountableProgress = $derived.by(() => {
		const data = this.currentSyncData;
		if (data !== null && data.total > 0) return true;
		const fetch = this.fetchProgress;
		return fetch !== null && fetch.total > 0;
	});

	progressPercent = $derived.by(() => {
		const data = this.currentSyncData;
		if (data !== null && data.total > 0) {
			return Math.min(100, Math.round((data.synced / data.total) * 100));
		}
		const fetch = this.fetchProgress;
		if (fetch !== null && fetch.total > 0) {
			return Math.min(100, Math.round((fetch.done / fetch.total) * 100));
		}
		return 0;
	});

	stepLabel = $derived.by(() => {
		if (this.syncError) return this.syncError;
		if (this.allSynced && !this.needRefresh) return 'Up to date';
		if (this.needRefresh) return 'Update ready';
		if (this.activity === 'checking') return 'Connecting to database…';
		if (this.activity === 'fetching') {
			if (this.activityTable !== null) {
				return `Fetching ${syncTableLabel(this.activityTable)}…`;
			}
			const fetch = this.fetchProgress;
			if (fetch !== null && fetch.total > 0) {
				return `Fetching campus data (${fetch.done}/${fetch.total})…`;
			}
			return 'Fetching campus data…';
		}
		if (this.activity === 'writing' && this.currentSync !== null) {
			const label = syncTableLabel(this.currentSync);
			const data = this.currentSyncData;
			if (data !== null && data.total > 0) {
				return `Syncing ${label} (${data.synced}/${data.total})`;
			}
			return `Writing ${label} to offline cache…`;
		}
		if (this.fetchingRemote) return 'Connecting to database…';
		return 'Syncing…';
	});

	stepDetail = $derived.by((): string | null => {
		// The error surface renders a Retry button; a "tap to retry" line would
		// just repeat it.
		if (this.syncError) return null;
		if (this.allSynced && !this.needRefresh) {
			return 'Campus directory cached; room lists load when you open a building';
		}
		if (this.needRefresh) return 'Reload to get the latest updates.';
		if (this.activity === 'checking') {
			return 'Checking if local data is current';
		}
		if (this.activity === 'fetching') {
			return 'Loading latest from server';
		}
		if (this.activity === 'writing') {
			return 'Saving to device for offline use';
		}
		return null;
	});

	needRefresh = $state<boolean>(false);
	private _refresh: (() => void) | null = null;
	private _syncRetry: (() => void) | null = null;

	setRefreshHandler(fn: () => void) {
		this._refresh = fn;
	}
	markNeedRefresh() {
		this.needRefresh = true;
	}
	dismissRefresh() {
		this.needRefresh = false;
	}
	reload() {
		this._refresh?.();
	}

	get canRetrySync() {
		return this._syncRetry !== null;
	}

	setSyncError(message: string, retry?: () => void) {
		this.syncError = message;
		this._syncRetry = retry ?? null;
		this.activity = 'idle';
		this.activityTable = null;
		this.fetchProgress = null;
		this.fetchingRemote = false;
		this.currentSync = null;
		this.allSynced = false;
		recordSyncTelemetry({ type: 'sync-error', error: message });
	}

	clearSyncError() {
		this.syncError = null;
		this._syncRetry = null;
	}

	retrySync() {
		const handler = this._syncRetry;
		if (!handler) return;
		this.clearSyncError();
		this.allSynced = false;
		this.recentlySynced = true;
		recordSyncTelemetry({ type: 'sync-retry' });
		handler();
	}

	startRemoteFetch() {
		this.clearSyncError();
		this.activity = 'checking';
		this.activityTable = null;
		this.fetchProgress = null;
		this.fetchingRemote = true;
		this.allSynced = false;
		this.recentlySynced = true;
		this.currentSync = null;
		this._buildings = null;
		this._colleges = null;
		this._divisions = null;
		this._dorms = null;
		this._events = null;
		this._aliases = null;
		this._syncStartTime = performance.now();
	}

	beginFetchingCampus(totalFetches: number) {
		this.activity = 'fetching';
		this.activityTable = null;
		this.fetchProgress = { done: 0, total: totalFetches };
		this.fetchingRemote = true;
	}

	reportFetchComplete() {
		if (this.fetchProgress === null) return;
		this.fetchProgress = {
			done: Math.min(this.fetchProgress.done + 1, this.fetchProgress.total),
			total: this.fetchProgress.total
		};
	}

	markWritingPhase(table: SyncTableKey) {
		this.activity = 'writing';
		this.activityTable = table;
		this.fetchingRemote = false;
		this.fetchProgress = null;
		this.currentSync = table;
	}

	private beginWriting(table: SyncTableKey, total: number) {
		this.markWritingPhase(table);
		const info: SyncInfo = { synced: 0, total };
		switch (table) {
			case 'buildings':
				this._buildings = info;
				break;
			case 'colleges':
				this._colleges = info;
				break;
			case 'divisions':
				this._divisions = info;
				break;
			case 'dorms':
				this._dorms = info;
				break;
			case 'events':
				this._events = info;
				break;
			case 'aliases':
				this._aliases = info;
				break;
		}
		this.recentlySynced = true;
	}

	startBuildingsSync(total: number) {
		this.beginWriting('buildings', total);
	}
	startCollegesSync(total: number) {
		this.beginWriting('colleges', total);
	}
	startDivisionsSync(total: number) {
		this.beginWriting('divisions', total);
	}
	startDormsSync(total: number) {
		this.beginWriting('dorms', total);
	}
	startEventsSync(total: number) {
		this.beginWriting('events', total);
	}
	startAliasesSync(total: number) {
		this.beginWriting('aliases', total);
	}
	startClassesSync(total: number) {
		this.beginWriting('classes', total);
	}

	updateBuildingsSync() {
		if (this._buildings === null) return;
		this._buildings.synced++;
	}
	updateCollegesSync() {
		if (this._colleges === null) return;
		this._colleges.synced++;
	}
	updateDivisionsSync() {
		if (this._divisions === null) return;
		this._divisions.synced++;
	}
	updateDormsSync() {
		if (this._dorms === null) return;
		this._dorms.synced++;
	}
	updateEventsSync() {
		if (this._events === null) return;
		this._events.synced++;
	}
	updateAliasesSync() {
		this._aliases!.synced++;
	}
	updateClassesSync() {
		this._classes!.synced++;
	}

	endSync(didSync = true) {
		if (this.syncError !== null) return;
		this.activity = 'idle';
		this.activityTable = null;
		this.fetchProgress = null;
		this.fetchingRemote = false;
		this.currentSync = null;
		this.allSynced = true;
		if (this.recentlySynced === null) {
			this.recentlySynced = didSync;
		} else if (!didSync) {
			this.recentlySynced = false;
		}
		const duration =
			this._syncStartTime > 0 ? Math.round(performance.now() - this._syncStartTime) : undefined;
		recordSyncTelemetry({ type: 'sync-complete', durationMs: duration });
		this._syncStartTime = 0;
	}
}
// Singleton lives beside the class so leaf modules (e.g. local/data/sync) can
// import it without pulling the store barrel — that edge closed a module-init
// cycle: index → data-stores → local/data/utils → sync → barrel → index,
// which left TermStore uninitialized at `new TermStore()` time.
export const syncToastStore = new SyncToastStore();
