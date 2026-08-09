import { loadOrganizationPage } from '$lib/services/organization-page-seo';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => loadOrganizationPage(params.slug);
