import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const ssr = true;

// TODO: port from astro/src/pages/api/admin/organizations/index.ts — needs publish session, org category constants
const notImplemented: RequestHandler = async () =>
	json({ success: false, error: 'Not implemented' }, { status: 501 });

export const POST = notImplemented;
