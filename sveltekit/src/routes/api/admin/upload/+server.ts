import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';


// TODO: port from astro/src/pages/api/admin/upload.ts — needs editor session, rate limit, R2 client, image magic-byte sniffing (POST body is multipart/form-data)
const notImplemented: RequestHandler = async () =>
	json({ success: false, error: 'Not implemented' }, { status: 501 });

export const GET = notImplemented;
export const POST = notImplemented;
