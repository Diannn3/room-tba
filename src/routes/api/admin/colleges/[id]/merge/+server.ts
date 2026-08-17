import { createEntityMergeRoute } from '$lib/admin/entity-merge-route';
import { mergeColleges } from '$lib/services/contribution/merge';

export const POST = createEntityMergeRoute({
	entityLabel: 'college',
	responseKey: 'college',
	targetIdKey: 'targetCollegeId',
	merge: mergeColleges
});
