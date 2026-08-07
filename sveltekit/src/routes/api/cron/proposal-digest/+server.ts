import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';


// TODO: port from astro/src/pages/api/cron/proposal-digest.ts — needs CRON_SECRET timingSafeEqual check, digest service
const notImplemented: RequestHandler = async () =>
	json({ success: false, error: 'Not implemented' }, { status: 501 });

export const GET = notImplemented;
