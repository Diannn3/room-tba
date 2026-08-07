import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';


// TODO: port from astro/src/pages/api/account/export.ts — needs editor session, export service (Content-Disposition attachment)
const notImplemented: RequestHandler = async () =>
	json({ success: false, error: 'Not implemented' }, { status: 501 });

export const GET = notImplemented;
