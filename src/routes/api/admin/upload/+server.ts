import { env } from '$env/dynamic/private';
import { getEditorSession } from '$lib/admin/require-editor';
import { checkRateLimit, clientIp, rateLimitResponse } from '$lib/api/rate-limit';
import {
	buildUploadKey,
	detectImageContentType,
	isR2Configured,
	UPLOAD_MAX_BYTES,
	uploadImageToR2
} from '$lib/r2-upload';
import type { RequestHandler } from './$types';

// Image upload endpoint for contributors and editors.

/** Per editor session (or IP fallback): 30 uploads / 10 minutes. */
const UPLOAD_LIMIT = { max: 30, windowMs: 10 * 60 * 1000 };

export const GET: RequestHandler = async () => {
	return json({
		configured: isR2Configured(),
		maxBytes: UPLOAD_MAX_BYTES,
		allowedTypes: ['image/jpeg', 'image/png', 'image/webp']
	});
};

export const POST: RequestHandler = async ({ cookies, request }) => {
	const session = getEditorSession(cookies);

	const ip = clientIp(request);
	const rate = checkRateLimit(
		`upload:${session?.id ?? 'anonymous'}:${ip}`,
		UPLOAD_LIMIT.max,
		UPLOAD_LIMIT.windowMs
	);
	if (!rate.allowed) {
		return rateLimitResponse(rate.resetAt);
	}

	if (!isR2Configured()) {
		return json(
			{
				error:
					'Image uploads are not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET_NAME.'
			},
			503
		);
	}

	if (!env.R2_PUBLIC_URL?.trim()) {
		return json(
			{
				error: 'Image uploads require R2_PUBLIC_URL so saved URLs can be validated.'
			},
			503
		);
	}

	let formData: FormData;
	try {
		formData = await request.formData();
	} catch {
		return json({ error: 'Expected multipart form data' }, 400);
	}

	const file = formData.get('file');
	if (!(file instanceof File)) {
		return json({ error: 'Missing image file' }, 400);
	}

	if (file.size === 0) {
		return json({ error: 'Image file is empty' }, 400);
	}
	if (file.size > UPLOAD_MAX_BYTES) {
		return json({ error: 'Image must be 5 MB or smaller' }, 413);
	}

	const bytes = new Uint8Array(await file.arrayBuffer());
	const contentType = detectImageContentType(bytes);
	if (!contentType) {
		return json({ error: 'Only JPEG, PNG, and WebP images are allowed' }, 415);
	}

	const prefix = typeof formData.get('prefix') === 'string' ? formData.get('prefix') : 'uploads';

	try {
		const key = buildUploadKey(String(prefix), contentType);
		const uploaded = await uploadImageToR2({ key, body: bytes, contentType });
		return json({
			success: true,
			url: uploaded.url,
			key: uploaded.key,
			uploadedBy: session ? session.displayName || session.username : 'anonymous contributor'
		});
	} catch (error) {
		console.error('Failed to upload image:', error);
		return json({ error: 'Failed to upload image' }, 500);
	}
};

function json(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});
}
