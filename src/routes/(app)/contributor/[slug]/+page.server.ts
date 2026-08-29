import { error } from '@sveltejs/kit';
import type { SeoData } from '$lib/components/seo/seo-data';
import { getPublicContributorProfile, normalizeContributorSlug } from '$lib/services/contribution/contributor-profile';
import { absoluteUrl, breadcrumbSchema, jsonLd, webpageSchema } from '$lib/utils/site';
import type { PageServerLoad } from './$types';

    style: improve Map UX by updating MapEntityPin and Map component
    - used proper zoomlevels and dimmed states to properly convey emphasis on elements
