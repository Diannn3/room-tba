import { writable } from 'svelte/store';

export const KUBO_RESERVATION_STATUSES = [
	'accepting',
	'waitlist',
	'paused',
	'unavailable',
	'unknown'
] as const;

export type KuboReservationStatus = (typeof KUBO_RESERVATION_STATUSES)[number];

export type KuboDormRecord = {
	roomTbaDormId: number;
	name: string;
	kuboSlug: string;
	listingUrl: string;
	reservationStatus: KuboReservationStatus;
	reservationUrl: string | null;
	updatedAt: string;
};

export type KuboDormDirectoryResponse = {
	version: 1;
	generatedAt: string;
	dorms: KuboDormRecord[];
};

export type KuboDormCta = {
	href: string;
	label: 'Reserve on Kubo' | 'Join waitlist on Kubo' | 'View on Kubo';
	ariaLabel: string;
};

export type KuboDormDirectory = ReadonlyMap<number, KuboDormRecord>;

const RETRY_AFTER_MS = 60_000;

export const kuboDormDirectory = writable<KuboDormDirectory>(new Map());

let loadPromise: Promise<void> | null = null;
let lastAttemptAt = 0;

export function parseKuboDormDirectory(value: unknown): KuboDormDirectoryResponse | null {
	if (!isRecord(value) || value.version !== 1) return null;
	if (!isIsoDate(value.generatedAt) || !Array.isArray(value.dorms)) return null;

	const dorms: KuboDormRecord[] = [];
	const seenIds = new Set<number>();
	for (const item of value.dorms) {
		if (!isKuboDormRecord(item) || seenIds.has(item.roomTbaDormId)) return null;
		seenIds.add(item.roomTbaDormId);
		dorms.push(item);
	}

	return { version: 1, generatedAt: value.generatedAt, dorms };
}

export function getKuboDormCta(
	directory: KuboDormDirectory,
	dormId: number,
	dormName: string
): KuboDormCta | null {
	const match = directory.get(dormId);
	if (!match) return null;

	// Trust boundary: Kubo's feed has served placeholder roomTbaDormIds that
	// collide with real dorms (2026-07-25, demo rows mapped onto Men's RH and
	// New Dormitory RH). An id match alone must not render a reservation CTA;
	// the names have to agree too.
	if (!dormNamesMatch(match.name, dormName)) {
		console.warn(
			`Kubo directory: dorm id ${dormId} name mismatch ("${match.name}" vs "${dormName}"); CTA suppressed`
		);
		return null;
	}

	if (match.reservationStatus === 'accepting' && match.reservationUrl) {
		return {
			href: match.reservationUrl,
			label: 'Reserve on Kubo',
			ariaLabel: `Reserve a place at ${dormName} on Kubo (opens in new tab)`
		};
	}

	if (match.reservationStatus === 'waitlist') {
		return {
			href: match.reservationUrl ?? match.listingUrl,
			label: 'Join waitlist on Kubo',
			ariaLabel: `Join the waitlist for ${dormName} on Kubo (opens in new tab)`
		};
	}

	return {
		href: match.listingUrl,
		label: 'View on Kubo',
		ariaLabel: `Open ${dormName} on Kubo (opens in new tab)`
	};
}

export async function loadKuboDormDirectory(
	fetcher: typeof fetch = fetch,
	now = Date.now()
): Promise<void> {
	if (loadPromise) return loadPromise;
	if (now - lastAttemptAt < RETRY_AFTER_MS) return;
	lastAttemptAt = now;

	loadPromise = (async () => {
		try {
			const response = await fetcher('/api/integrations/kubo/dorms', {
				headers: { Accept: 'application/json' }
			});
			if (!response.ok) return;

			const parsed = parseKuboDormDirectory(await response.json());
			if (parsed) kuboDormDirectory.set(toDirectory(parsed.dorms));
		} catch {
			// Keep the last successful directory. A fresh session fails closed.
		}
	})().finally(() => {
		loadPromise = null;
	});

	return loadPromise;
}

// Exact match after normalization: "Residence Hall" folds to "RH" so
// registrar-style spellings still agree. Containment is deliberately NOT
// allowed — prod has sibling dorms where one name contains the other
// ("Forestry Residence Hall" inside "New Forestry Residence Hall"), so a
// placeholder id from Kubo could otherwise light up the wrong building.
function normalizeDormName(value: string): string {
	return value
		.toLowerCase()
		.replace(/[^a-z0-9]/g, '')
		.replace(/residencehall/g, 'rh');
}

export function dormNamesMatch(kuboName: string, dormName: string): boolean {
	const a = normalizeDormName(kuboName);
	const b = normalizeDormName(dormName);
	if (!a || !b) return false;
	return a === b;
}

function toDirectory(records: KuboDormRecord[]): KuboDormDirectory {
	return new Map(records.map((record) => [record.roomTbaDormId, record]));
}

function isKuboDormRecord(value: unknown): value is KuboDormRecord {
	if (!isRecord(value)) return false;
	return (
		Number.isInteger(value.roomTbaDormId) &&
		Number(value.roomTbaDormId) > 0 &&
		typeof value.name === 'string' &&
		value.name.length > 0 &&
		typeof value.kuboSlug === 'string' &&
		value.kuboSlug.length > 0 &&
		isSafeKuboUrl(value.listingUrl) &&
		KUBO_RESERVATION_STATUSES.includes(value.reservationStatus as KuboReservationStatus) &&
		(value.reservationUrl === null || isSafeKuboUrl(value.reservationUrl)) &&
		isIsoDate(value.updatedAt)
	);
}

function isSafeKuboUrl(value: unknown): value is string {
	if (typeof value !== 'string') return false;
	try {
		const url = new URL(value);
		return (
			url.protocol === 'https:' &&
			(url.hostname === 'kubo.community' || url.hostname.endsWith('.kubo.community'))
		);
	} catch {
		return false;
	}
}

function isIsoDate(value: unknown): value is string {
	return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}
