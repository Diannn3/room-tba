import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';


// TODO: port from astro/src/pages/api/admin/proposals/[id]/approve.ts — needs review session, proposal service, notification emit
const notImplemented: RequestHandler = async () =>
	json({ success: false, error: 'Not implemented' }, { status: 501 });

export const POST = notImplemented;
