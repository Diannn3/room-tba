/**
 * Per-page metadata that (app)/+layout.svelte renders into <svelte:head>.
 *
 * Astro gave every page its own <Layout> instance, so each one passed these
 * directly. SvelteKit has a single layout for the group, so pages hand the
 * same fields up through `load` as `data.seo` instead and the layout falls
 * back to the home-page defaults when a route does not set them.
 */
export type SeoData = {
	title: string;
	/**
	 * Short share title for og:title / twitter:title. og:site_name already says
	 * "Room TBA", so the full <title> chain is redundant on share cards.
	 */
	ogTitle?: string | null;
	description: string;
	canonicalPath: string;
	imagePath?: string | null;
	structuredData?: Record<string, unknown>[];
	/** Defaults to "index, follow"; /route/ pages ship noindex. */
	robots?: string;
};

/** One row in an entity index page (the /building/, /college/ ... listings). */
export type EntityIndexItem = {
	href: string;
	label: string;
	description?: string;
	copyUrl?: string;
	copyLabel?: string;
};
