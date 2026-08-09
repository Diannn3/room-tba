import { createEntityMergeRoute } from '$lib/admin/entity-merge-route';
import { mergeColleges } from '$lib/services/merge-service';

export const POST = createEntityMergeRoute({
	entityLabel: 'college',
	responseKey: 'college',
	targetIdKey: 'targetCollegeId',
	merge: mergeColleges
});
