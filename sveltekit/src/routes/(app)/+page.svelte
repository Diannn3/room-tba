<script lang="ts">
	import { onMount } from "svelte";
	import { goto } from "$app/navigation";
	import { MAP_BASE_PATH } from "$lib/entity-urls";

	// This shell stays prerendered and client-only because the service worker's
	// navigateFallback is "/" and workbox can only fall back to a precached
	// document (see +page.ts). The app itself lives at /map, so hand off as soon
	// as the router is live — which also works offline, since /map needs no
	// server data of its own.
	onMount(() => {
		void goto(`${MAP_BASE_PATH}/`, { replaceState: true });
	});
</script>
