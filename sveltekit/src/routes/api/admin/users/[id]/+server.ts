import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const ssr = true;

// TODO: port from astro/src/pages/api/admin/users/[id].ts — needs admin session
const notImplemented: RequestHandler = async () =>
	json({ success: false, error: 'Not implemented' }, { status: 501 });

export const PATCH = notImplemented;
