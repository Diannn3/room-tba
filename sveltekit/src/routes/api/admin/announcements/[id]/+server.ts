import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';


// TODO: port from astro/src/pages/api/admin/announcements/[id].ts — needs publish session, version guard
const notImplemented: RequestHandler = async () =>
	json({ success: false, error: 'Not implemented' }, { status: 501 });

export const PATCH = notImplemented;
export const DELETE = notImplemented;
