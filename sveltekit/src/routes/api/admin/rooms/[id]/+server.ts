import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';


// TODO: port from astro/src/pages/api/admin/rooms/[id].ts — needs publish session, version guard, room position service (field vs position updates are mutually exclusive)
const notImplemented: RequestHandler = async () =>
	json({ success: false, error: 'Not implemented' }, { status: 501 });

export const PATCH = notImplemented;
