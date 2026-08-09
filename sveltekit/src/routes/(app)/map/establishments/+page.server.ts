import { loadPlaceIndexPage } from '$lib/services/place-page-seo';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => loadPlaceIndexPage('establishments');
