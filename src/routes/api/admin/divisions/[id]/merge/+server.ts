import { createEntityMergeRoute } from '$lib/admin/entity-merge-route';
import { mergeDivisions } from '$lib/services/contribution/merge';

export const POST = createEntityMergeRoute({
	entityLabel: 'division',
	responseKey: 'division',
	targetIdKey: 'targetDivisionId',
	merge: mergeDivisions
});
