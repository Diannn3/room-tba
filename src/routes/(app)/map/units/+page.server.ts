import { loadOrganizationIndexPage } from '$lib/services/organization-page-seo';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => loadOrganizationIndexPage('units');
