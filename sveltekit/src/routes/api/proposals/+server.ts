import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';


// TODO: port from astro/src/pages/api/proposals/index.ts — needs proposal service, anon/auth rate limits, honeypot, notification emit
const notImplemented: RequestHandler = async () =>
	json({ success: false, error: 'Not implemented' }, { status: 501 });

export const POST = notImplemented;
