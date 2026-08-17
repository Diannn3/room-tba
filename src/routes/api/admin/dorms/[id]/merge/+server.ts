import { createEntityMergeRoute } from '$lib/admin/entity-merge-route';
import { mergeDorms } from '$lib/services/contribution/merge';

export const POST = createEntityMergeRoute({
	entityLabel: 'dorm',
	responseKey: 'dorm',
	targetIdKey: 'targetDormId',
	merge: mergeDorms
});
