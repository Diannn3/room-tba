<script lang="ts">
	import MapBrowseList from "$lib/components/map/MapBrowseList.svelte";
	import { isStudentOrganization } from "$lib/constants/content/categories/org"
	import { getAppData } from "$lib/context";
	import { getOrganizationCanonicalPath } from "$lib/entity-urls";
	import type { PageData } from "./$types";

	const { data }: { data: PageData } = $props();
	const appData = getAppData();

	// Server list first (crawlers and first paint), cached rows only as the
	// offline fallback — same split the server load uses, inverted here because
	// units are the non-student half of the organizations table.
	const entries = $derived(
		data.items.length > 0
			? data.items
			: (appData().organizations ?? [])
					.filter((organization) => !isStudentOrganization(organization.category))
					.sort((a, b) => a.name.localeCompare(b.name))
					.map((organization) => ({
						href: getOrganizationCanonicalPath(organization),
						label: organization.name,
					})),
	);
</script>

<MapBrowseList heading="Offices & units" {entries} />
