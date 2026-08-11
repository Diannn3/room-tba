import { env } from '$env/dynamic/private';
import { parseEntityPhotoUrls, reconcileEntityPhotos } from '$lib/entity-photos';
import { resolvePhotoAttribution } from '$lib/services/entity-photo-service';
import { editorSessionOrUnauthorized } from '$lib/admin/require-editor';
import { createBuilding } from '$lib/services/admin-service';
import type { RequestHandler } from './$types';

function json(data: unknown, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});
}

export const POST: RequestHandler = async ({ cookies, request }) => {
	const auth = await editorSessionOrUnauthorized(cookies, {
		requirePublish: true
	});
	if (auth instanceof Response) return auth;

	let body: Record<string, unknown>;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, 400);
	}

	const buildingName = typeof body.buildingName === 'string' ? body.buildingName.trim() : '';
	const lat = Number(body.lat);
	const lon = Number(body.lon);

	if (!buildingName) {
		return json({ error: 'Building name is required' }, 400);
	}
	if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
		return json({ error: 'Building map pin (lat and lon) is required' }, 400);
	}

	const buildingType =
		body.buildingType === 'admin' || body.buildingType === 'non-admin'
			? body.buildingType
			: 'non-admin';
	const directions = typeof body.directions === 'string' ? body.directions.trim() : '';
	const parsedPhotoUrls = parseEntityPhotoUrls(body.photoUrls, env.R2_PUBLIC_URL);
	if (!parsedPhotoUrls.ok) return json({ error: parsedPhotoUrls.error }, 400);

	try {
		const attribution = await resolvePhotoAttribution(
			auth.session.id,
			auth.session.displayName
		);
		const photos = reconcileEntityPhotos([], parsedPhotoUrls.photoUrls, attribution);
		const building = await createBuilding(
			{ buildingName, lat, lon, buildingType, directions, photos },
			auth.editedBy
		);
		if (!building) {
			return json({ error: 'Failed to create building' }, 500);
		}
		return json({ success: true, building }, 201);
	} catch (err) {
		console.error('Failed to create building:', err);
		return json({ error: 'Failed to create building' }, 500);
	}
};
