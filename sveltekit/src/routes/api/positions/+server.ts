import { error, json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { buildingsTable, roomPositionsTable, roomsTable } from '$lib/server/db/schema';
import type { RequestHandler } from './$types';

export const ssr = true;

export const GET: RequestHandler = async ({ url }) => {
	const buildingName = url.searchParams.get('building');
	if (!buildingName) {
		return json({ error: 'Missing required ?building= query param' }, { status: 400 });
	}

	try {
		const rows = await db
			.select({
				roomCode: roomsTable.roomCode,
				floor: roomPositionsTable.floor,
				x: roomPositionsTable.posX,
				y: roomPositionsTable.posY
			})
			.from(roomPositionsTable)
			.innerJoin(roomsTable, eq(roomsTable.id, roomPositionsTable.roomId))
			.innerJoin(buildingsTable, eq(buildingsTable.id, roomsTable.buildingId))
			.where(eq(buildingsTable.buildingName, buildingName));

		return json({
			positions: rows.map((row) => ({
				roomCode: row.roomCode,
				floor: row.floor,
				x: Number(row.x),
				y: Number(row.y)
			}))
		});
	} catch (e) {
		console.error(e);
		throw error(500, {
			message: 'Cannot query room positions'
		});
	}
};

export const PUT: RequestHandler = async () => {
	return json(
		{
			error: 'Position writes must use /api/admin/rooms/:id with a room version.'
		},
		{
			status: 405,
			headers: {
				allow: 'GET, DELETE'
			}
		}
	);
};

export const DELETE: RequestHandler = async () => {
	// TODO: needs editor session auth (astro/src/lib/admin) before the
	// position-delete logic from astro/src/pages/api/positions.ts can be ported.
	return json({ success: false, error: 'Not implemented' }, { status: 501 });
};
