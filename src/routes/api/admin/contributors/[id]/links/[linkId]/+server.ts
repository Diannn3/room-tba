import { editorSessionOrUnauthorized } from '$lib/admin/require-editor';
import { removeContributorSocialLink } from '$lib/services/contribution/contributor-profile';
import type { RequestHandler } from './$types';
import {
	errorFromContributorProfile,
	json,
	parsePositiveId,
	readReason,
	serverError
} from '../../route-utils';

    style: improve Map UX by updating MapEntityPin and Map component
    - used proper zoomlevels and dimmed states to properly convey emphasis on elements
