import { createEntityMergeRoute } from '$lib/admin/entity-merge-route';
import { mergeBuildings } from '$lib/services/contribution/merge';

export const POST = createEntityMergeRoute({
	entityLabel: 'building',
	responseKey: 'building',
	targetIdKey: 'targetBuildingId',
	merge: mergeBuildings
});
