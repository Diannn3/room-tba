<script lang="ts">
	import MapBrowseList from "$lib/components/map/MapBrowseList.svelte";
	import { isPlaceLandmark, placeCategoryLabel } from "$lib/constants/content/categories/place"
	import { getAppData } from "$lib/context";
	import { getPlaceCanonicalPath } from "$lib/entity-urls";
	import type { PageData } from "./$types";

	const { data }: { data: PageData } = $props();
	const appData = getAppData();

	// Server list first (crawlers and first paint), cached rows only as the
	// offline fallback. The category filter mirrors the server load's so the
	// offline list never borrows rows from the sibling segment.
	const entries = $derived(
		data.items.length > 0
			? data.items
			: (appData().places ?? [])
					.filter((place) => isPlaceLandmark(place.category))
					.sort((a, b) => a.name.localeCompare(b.name))
					.map((place) => ({
						href: getPlaceCanonicalPath(place),
						label: place.name,
						description: placeCategoryLabel(place.category),
					})),
	);
</script>

<MapBrowseList heading="Landmarks" {entries} />
