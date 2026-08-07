import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';


// TODO: port from astro/src/pages/api/proposals/[id].ts — needs session role-based visibility (reviewer/submitter/public views)
const notImplemented: RequestHandler = async () =>
	json({ success: false, error: 'Not implemented' }, { status: 501 });

export const GET = notImplemented;
