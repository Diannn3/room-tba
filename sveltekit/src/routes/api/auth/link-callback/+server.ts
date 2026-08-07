import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';


// TODO: port from astro/src/pages/api/auth/link-callback.ts — needs editor session, Supabase OAuth
// Astro 303-redirects to /?account=google-linked (or /?account_error=...)
const notImplemented: RequestHandler = async () =>
	json({ success: false, error: 'Not implemented' }, { status: 501 });

export const GET = notImplemented;
