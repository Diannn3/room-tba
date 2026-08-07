import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';


// TODO: port from astro/src/pages/api/building-position.ts — needs publish session, CAMPUS_BOUNDS validation, sync key refresh
const notImplemented: RequestHandler = async () =>
	json({ success: false, error: 'Not implemented' }, { status: 501 });

export const PUT = notImplemented;
