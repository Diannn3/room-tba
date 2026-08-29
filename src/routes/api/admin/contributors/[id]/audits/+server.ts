import { editorSessionOrUnauthorized } from '$lib/admin/require-editor';
import { listContributorProfileAudits } from '$lib/services/contribution/contributor-profile';
import type { RequestHandler } from './$types';
import {
	errorFromContributorProfile,
	json,
	parsePaginationParam,
	parsePositiveId,
	serverError
} from '../route-utils';

    style: improve Map UX by updating MapEntityPin and Map component
    - used proper zoomlevels and dimmed states to properly convey emphasis on elements
