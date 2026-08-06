import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const ssr = true;

// TODO: port from astro/src/pages/api/donate.ts — needs PayMongo API (PAYMONGO_SECRET_KEY)
const notImplemented: RequestHandler = async () =>
	json({ success: false, error: 'Not implemented' }, { status: 501 });

export const POST = notImplemented;
