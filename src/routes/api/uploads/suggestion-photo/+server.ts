import { uploadConfigurationResponse, uploadImageRequest, scopedUploadPrefix } from '$lib/uploads/image-upload';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => uploadConfigurationResponse();

export const POST: RequestHandler = async ({ request }) =>
	uploadImageRequest({
		request,
		prefix: (formData) => scopedUploadPrefix(formData, ['buildings', 'events', 'dorms', 'rooms']),
		uploadedBy: 'anonymous contributor'
	});
