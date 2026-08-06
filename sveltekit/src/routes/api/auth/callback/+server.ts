import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const ssr = true;

// TODO: port from astro/src/pages/api/auth/callback.ts — needs Supabase OAuth exchange, session cookie signing
// Astro 303-redirects to / (or /?auth_error=...)
const notImplemented: RequestHandler = async () =>
	json({ success: false, error: 'Not implemented' }, { status: 501 });

export const GET = notImplemented;
