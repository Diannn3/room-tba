import { json } from '@sveltejs/kit';
import { desc, eq, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
	buildingsTable,
	classesTable,
	roomPositionsTable,
	roomsTable,
	termsTable
} from '$lib/server/db/schema';
import type { RequestHandler } from './$types';


// Inlined from astro/src/lib/contributor-progress.ts
const ROOM_FIELD_CATEGORIES = ['directions', 'schedule', 'position'] as const;

type RoomFieldCategory = (typeof ROOM_FIELD_CATEGORIES)[number];

type ProgressCount = {
	filled: number;
	total: number;
};

type RoomProgressInput = {
	id: number;
	code: string;
	buildingId: number | null;
	directions: string | null;
	classCount: number;
	hasPosition: boolean;
};

type RoomProgressRow = {
	id: number;
	code: string;
	buildingId: number | null;
	fields: Record<RoomFieldCategory, boolean>;
	missingFields: RoomFieldCategory[];
};

type BuildingProgressBreakdown = {
	buildingId: number;
	buildingName: string;
	roomTotal: number;
	directions: ProgressCount;
	schedule: ProgressCount;
	position: ProgressCount;
	gapScore: number;
};

type CampusContributorProgress = {
	scope: 'campus';
	termId: number | null;
	termLabel: string | null;
	rooms: Record<RoomFieldCategory, ProgressCount>;
	buildings: {
		total: number;
		pins: ProgressCount;
		directions: ProgressCount;
	};
	topBuildings: BuildingProgressBreakdown[];
};

type BuildingContributorProgress = {
	scope: 'building';
	buildingId: number;
	buildingName: string;
	termId: number | null;
	termLabel: string | null;
	rooms: Record<RoomFieldCategory, ProgressCount>;
	roomRows: RoomProgressRow[];
};

const TOP_BUILDINGS_LIMIT = 10;

function isNonEmptyText(value: string | null | undefined): boolean {
	return typeof value === 'string' && value.trim().length > 0;
}

function hasBuildingPin(lat: number | null | undefined, lon: number | null | undefined): boolean {
	return Number.isFinite(lat) && Number.isFinite(lon);
}

function emptyProgressCount(total: number): ProgressCount {
	return { filled: 0, total };
}

function summarizeFieldCounts(rows: RoomProgressRow[]): Record<RoomFieldCategory, ProgressCount> {
	const total = rows.length;
	const counts: Record<RoomFieldCategory, ProgressCount> = {
		directions: emptyProgressCount(total),
		schedule: emptyProgressCount(total),
		position: emptyProgressCount(total)
	};

	for (const row of rows) {
		for (const category of ROOM_FIELD_CATEGORIES) {
			if (row.fields[category]) {
				counts[category].filled += 1;
			}
		}
	}

	return counts;
}

function buildRoomProgressRow(room: RoomProgressInput): RoomProgressRow {
	const fields: Record<RoomFieldCategory, boolean> = {
		directions: isNonEmptyText(room.directions),
		schedule: room.classCount > 0,
		position: room.hasPosition
	};
	const missingFields = ROOM_FIELD_CATEGORIES.filter((category) => !fields[category]);

	return {
		id: room.id,
		code: room.code,
		buildingId: room.buildingId,
		fields,
		missingFields
	};
}

function buildRoomProgressRows(rooms: RoomProgressInput[]): RoomProgressRow[] {
	return rooms.map(buildRoomProgressRow);
}

function buildingGapScore(counts: Record<RoomFieldCategory, ProgressCount>): number {
	return ROOM_FIELD_CATEGORIES.reduce((score, category) => {
		const { filled, total } = counts[category];
		return score + Math.max(0, total - filled);
	}, 0);
}

function computeBuildingBreakdown(
	rows: RoomProgressRow[],
	buildingNames: Map<number, string>
): BuildingProgressBreakdown[] {
	const grouped = new Map<number, RoomProgressRow[]>();

	for (const row of rows) {
		if (row.buildingId == null) continue;
		const list = grouped.get(row.buildingId) ?? [];
		list.push(row);
		grouped.set(row.buildingId, list);
	}

	const breakdown: BuildingProgressBreakdown[] = [];

	for (const [buildingId, buildingRows] of grouped) {
		const counts = summarizeFieldCounts(buildingRows);
		breakdown.push({
			buildingId,
			buildingName: buildingNames.get(buildingId) ?? `Building ${buildingId}`,
			roomTotal: buildingRows.length,
			directions: counts.directions,
			schedule: counts.schedule,
			position: counts.position,
			gapScore: buildingGapScore(counts)
		});
	}

	return breakdown.sort((a, b) => {
		if (b.gapScore !== a.gapScore) return b.gapScore - a.gapScore;
		return a.buildingName.localeCompare(b.buildingName);
	});
}

function topBuildingsByGap(
	breakdown: BuildingProgressBreakdown[],
	limit = TOP_BUILDINGS_LIMIT
): BuildingProgressBreakdown[] {
	return breakdown.slice(0, limit);
}

// Inlined default-term lookup from astro/src/lib/services/term-service.ts and
// astro/src/lib/term-calendar.ts (resolveDefaultTermFromList and helpers).
type TermRow = typeof termsTable.$inferSelect & { classCount?: number };

/** YYYY-MM-DD for `date` as seen in Asia/Manila — the app's notion of "today". */
function toManilaDateKey(date: Date) {
	return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
}

function termDateKey(value: string | null | undefined) {
	if (!value) return null;
	if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
	return toManilaDateKey(new Date(value));
}

/** True when `date` falls on an instructional day for the term (inclusive). */
function isDateWithinTerm(term: Pick<TermRow, 'startsOn' | 'endsOn'>, date: Date) {
	const day = toManilaDateKey(date);
	const start = termDateKey(term.startsOn);
	const end = termDateKey(term.endsOn);
	if (!start || !end) return false;
	return day >= start && day <= end;
}

/** Pick the active term for a calendar day; null when between terms. */
function resolveActiveTermByDate<T extends TermRow>(terms: T[], date = new Date()): T | null {
	const active = terms.filter((term) => term.isActive && isDateWithinTerm(term, date));
	if (active.length === 0) return null;
	return active.sort((a, b) => b.sortOrder - a.sortOrder || b.id - a.id)[0] ?? null;
}

function pickTermWithClasses<T extends TermRow>(terms: T[]): T | null {
	return (
		terms
			.filter((term) => term.isActive && (term.classCount ?? 0) > 0)
			.sort((a, b) => b.sortOrder - a.sortOrder || b.id - a.id)[0] ?? null
	);
}

/** Default term for visitors: in-session window, then legacy flag, then newest active. */
function resolveDefaultTermFromList<T extends TermRow>(terms: T[], date = new Date()): T | null {
	const calendarTerm = resolveActiveTermByDate(terms, date);
	if (calendarTerm) {
		if ((calendarTerm.classCount ?? 0) > 0) return calendarTerm;
		return pickTermWithClasses(terms) ?? calendarTerm;
	}

	return (
		terms.find((term) => term.isDefault && term.isActive) ??
		pickTermWithClasses(terms) ??
		terms.find((term) => term.isActive) ??
		terms[0] ??
		null
	);
}

async function getDefaultTerm(): Promise<TermRow | null> {
	try {
		const terms = await db
			.select()
			.from(termsTable)
			.where(eq(termsTable.isActive, true))
			.orderBy(desc(termsTable.sortOrder), desc(termsTable.id));

		return resolveDefaultTermFromList(terms);
	} catch (e) {
		console.error('Failed to resolve default term:', e);
		return null;
	}
}

async function loadRoomInputs(
	termId: number | null,
	buildingId?: number
): Promise<{
	roomInputs: RoomProgressInput[];
	buildingNames: Map<number, string>;
	buildings: Array<{
		id: number;
		buildingName: string;
		lat: number;
		lon: number;
		directions: string;
	}>;
}> {
	const roomsQuery = db
		.select({
			id: roomsTable.id,
			code: roomsTable.roomCode,
			buildingId: roomsTable.buildingId,
			directions: roomsTable.directions
		})
		.from(roomsTable);

	const rooms =
		buildingId != null
			? await roomsQuery.where(eq(roomsTable.buildingId, buildingId))
			: await roomsQuery;

	const classCounts =
		termId != null
			? await db
					.select({
						roomId: classesTable.roomId,
						count: sql<number>`count(*)::int`
					})
					.from(classesTable)
					.where(eq(classesTable.termId, termId))
					.groupBy(classesTable.roomId)
			: [];

	const classCountByRoom = new Map<number, number>();
	for (const row of classCounts) {
		if (row.roomId != null) {
			classCountByRoom.set(row.roomId, row.count);
		}
	}

	const positionRows = await db
		.select({ roomId: roomPositionsTable.roomId })
		.from(roomPositionsTable);
	const positionedRoomIds = new Set(positionRows.map((row) => row.roomId));

	const buildings = await db
		.select({
			id: buildingsTable.id,
			buildingName: buildingsTable.buildingName,
			lat: buildingsTable.lat,
			lon: buildingsTable.lon,
			directions: buildingsTable.directions
		})
		.from(buildingsTable);

	const buildingNames = new Map(buildings.map((building) => [building.id, building.buildingName]));

	const roomInputs: RoomProgressInput[] = rooms.map((room) => ({
		id: room.id,
		code: room.code,
		buildingId: room.buildingId,
		directions: room.directions,
		classCount: classCountByRoom.get(room.id) ?? 0,
		hasPosition: positionedRoomIds.has(room.id)
	}));

	return { roomInputs, buildingNames, buildings };
}

async function fetchCampusProgress(): Promise<{
	success: true;
	data: CampusContributorProgress;
}> {
	const term = await getDefaultTerm();
	const { roomInputs, buildingNames, buildings } = await loadRoomInputs(term?.id ?? null);
	const roomRows = buildRoomProgressRows(roomInputs);
	const roomCounts = summarizeFieldCounts(roomRows);
	const breakdown = topBuildingsByGap(computeBuildingBreakdown(roomRows, buildingNames));

	const buildingTotal = buildings.length;
	let pinFilled = 0;
	let directionsFilled = 0;

	for (const building of buildings) {
		if (hasBuildingPin(building.lat, building.lon)) pinFilled += 1;
		if (isNonEmptyText(building.directions)) directionsFilled += 1;
	}

	return {
		success: true,
		data: {
			scope: 'campus',
			termId: term?.id ?? null,
			termLabel: term?.label ?? null,
			rooms: roomCounts,
			buildings: {
				total: buildingTotal,
				pins: { filled: pinFilled, total: buildingTotal },
				directions: { filled: directionsFilled, total: buildingTotal }
			},
			topBuildings: breakdown
		}
	};
}

async function fetchBuildingProgress(
	buildingId: number
): Promise<{ success: true; data: BuildingContributorProgress } | Response> {
	const building = await db
		.select({
			id: buildingsTable.id,
			buildingName: buildingsTable.buildingName
		})
		.from(buildingsTable)
		.where(eq(buildingsTable.id, buildingId))
		.limit(1);

	if (building.length === 0) {
		return json(
			{ success: false, error: 'Building not found' },
			{
				status: 404
			}
		);
	}

	const term = await getDefaultTerm();
	const { roomInputs } = await loadRoomInputs(term?.id ?? null, buildingId);
	const roomRows = buildRoomProgressRows(roomInputs).sort((a, b) => a.code.localeCompare(b.code));

	return {
		success: true,
		data: {
			scope: 'building',
			buildingId,
			buildingName: building[0].buildingName,
			termId: term?.id ?? null,
			termLabel: term?.label ?? null,
			rooms: summarizeFieldCounts(roomRows),
			roomRows
		}
	};
}

export const GET: RequestHandler = async ({ url }) => {
	const scope = url.searchParams.get('scope') ?? 'campus';
	const buildingIdRaw = url.searchParams.get('buildingId');

	try {
		if (scope === 'mine') {
			// TODO: needs session auth (editor session + sessionEditedBy) before the
			// editor-history aggregation from the Astro route can be ported.
			return json(
				{ success: false, error: 'Not implemented' },
				{
					status: 501
				}
			);
		}

		if (scope === 'building') {
			const buildingId = Number(buildingIdRaw);
			if (!Number.isFinite(buildingId)) {
				return json(
					{ success: false, error: 'buildingId is required' },
					{
						status: 400
					}
				);
			}
			const result = await fetchBuildingProgress(buildingId);
			if (result instanceof Response) return result;
			return json(result);
		}

		if (scope === 'campus') {
			return json(await fetchCampusProgress());
		}

		return json({ success: false, error: 'Invalid scope' }, { status: 400 });
	} catch (e) {
		console.error(e);
		return json({ success: false, error: 'Failed to load contributor progress' }, { status: 500 });
	}
};
