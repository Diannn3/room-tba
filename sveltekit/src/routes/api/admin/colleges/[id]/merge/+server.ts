import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';


// TODO: port from astro/src/pages/api/admin/colleges/[id]/merge.ts — needs publish session, entity merge factory
const notImplemented: RequestHandler = async () =>
	json({ success: false, error: 'Not implemented' }, { status: 501 });

export const POST = notImplemented;
