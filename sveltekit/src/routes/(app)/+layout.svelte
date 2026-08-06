<script lang="ts">
import { pwaInfo } from "virtual:pwa-info";
import { onMount } from "svelte";
import { page } from "$app/state";
import AppRoot from "$lib/components/AppRoot.svelte";
import {
	absoluteUrl,
	breadcrumbSchema,
	DEFAULT_OG_IMAGE,
	jsonLd,
	OG_IMAGE_HEIGHT,
	OG_IMAGE_WIDTH,
	SITE_URL,
	webpageSchema,
	websiteSchema,
} from "$lib/site";

const title =
	"Room TBA | Find Rooms, Dorms, Buildings, Colleges, and Divisions at UPLB";
// Short share title (og:title / twitter:title): og:site_name already says
// "Room TBA", so the full <title> chain is redundant on share cards.
const ogTitle = "Find Rooms, Dorms, Buildings, Colleges, and Divisions at UPLB";
const description =
	"Search rooms, dorms, and buildings at UPLB, then plan your classes. Campus data caches locally for spotty Wi-Fi.";
const imagePath = DEFAULT_OG_IMAGE;
const structuredData = jsonLd(
	websiteSchema(),
	webpageSchema({ title, description, path: "/" }),
	breadcrumbSchema([{ name: "Home", path: "/" }]),
);

const canonicalUrl = $derived(absoluteUrl(page.url.pathname));
const imageUrl = absoluteUrl(imagePath);
const shareTitle = ogTitle ?? title;

onMount(async () => {
	if (pwaInfo) {
		const { registerSW } = await import("virtual:pwa-register");
		registerSW({
			immediate: true,
			onRegistered(r) {
				// uncomment following code if you want check for updates
				// r && setInterval(() => {
				//    console.log('Checking for sw update')
				//    r.update()
				// }, 20000 /* 20s for testing purposes */)
				console.log(`SW Registered: ${r}`);
			},
			onRegisterError(error) {
				console.log("SW registration error", error);
			},
		});
	}
});

const webManifestLink = $derived(pwaInfo ? pwaInfo.webManifest.linkTag : "");
</script>

<svelte:head>
	<meta charset="UTF-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<link rel="icon" href="/favicon.ico" sizes="48x48" />
	<link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
	<meta name="theme-color" content="#a30e00" />
	<title>{title}</title>
	<meta name="description" content={description} />
	<meta name="robots" content="index, follow" />
	<link rel="canonical" href={canonicalUrl} />

	<meta property="og:site_name" content="Room TBA" />
	<meta property="og:url" content={canonicalUrl} />
	<meta property="og:type" content="website" />
	<meta property="og:title" content={shareTitle} />
	<meta property="og:description" content={description} />
	<meta property="og:image" content={imageUrl} />
	<meta property="og:image:url" content={imageUrl} />
	<meta property="og:image:width" content={String(OG_IMAGE_WIDTH)} />
	<meta property="og:image:height" content={String(OG_IMAGE_HEIGHT)} />
	<meta property="og:image:alt" content={shareTitle} />
	<meta property="og:locale" content="en_US" />

	<meta name="twitter:card" content="summary_large_image" />
	<meta property="twitter:domain" content={new URL(SITE_URL).hostname} />
	<meta property="twitter:url" content={canonicalUrl} />
	<meta name="twitter:title" content={shareTitle} />
	<meta name="twitter:description" content={description} />
	<meta name="twitter:image" content={imageUrl} />
	<meta name="twitter:image:alt" content={shareTitle} />

	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Raleway:wght@400;600;700&display=swap"
		rel="stylesheet"
	/>

	{@html webManifestLink}
	<!-- #716: desktop/mobile split is viewport-based (not User-Agent), so the
         same check works for every render path (SSR and prerendered) without
         varying cached HTML per request. CDN/ISR caching stays untouched.
         Synchronous in <head>, before paint: no flash, and the change
         listener keeps it live across resizes (devtools/QA responsive mode). -->
	<!-- <script is:inline define:vars={{ desktopOnlyUrl }}>
      (() => {
        var html = document.documentElement;
        var mql = window.matchMedia("(min-width: 48.0625rem)");
        var link = null;

        function apply(isDesktop) {
          html.classList.toggle("desktop", isDesktop);
          html.classList.toggle("mobile", !isDesktop);
          if (isDesktop && !link) {
            link = document.createElement("link");
            link.rel = "stylesheet";
            link.href = desktopOnlyUrl;
            document.head.appendChild(link);
          } else if (!isDesktop && link) {
            link.remove();
            link = null;
          }
        }

        apply(mql.matches);
        mql.addEventListener("change", (event) => {
          apply(event.matches);
        });
      })();
    </script> -->

	<!-- <style is:global>
      html,
      body {
        overflow-x: clip;
      }

      * {
        font-family:
          "Inter",
          system-ui,
          -apple-system,
          BlinkMacSystemFont,
          "Segoe UI",
          Roboto,
          sans-serif;
        font-variation-settings: "opsz" 14;
      }

      :root {
        --font-display: "Cormorant Garamond", serif;
      }

      button {
        all: unset;
      }
      button,
      a,
      input {
        outline: 2px solid transparent;
        outline-offset: 2px;

        &:focus-visible {
          outline-color: hsl(5, 53%, 32%);
        }
      }
    </style> -->
</svelte:head>

<AppRoot />
<!--
<Layout
	{title}
	ogTitle="Find Rooms, Dorms, Buildings, Colleges, and Divisions at UPLB"
	{description}
	canonicalPath="/"
	{structuredData}
>
</Layout>

<style>
	.directions-status {
		position: fixed;
		bottom: 0.5rem;
		left: 0.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 1rem;
		border-radius: 1rem;
		box-shadow: 0 2px 0.5rem 0 hsla(0, 0%, 0%, 0.2);
		background-color: white;
		width: min(20rem, calc(100% - (2 * 0.5rem)));
		font-size: 0.875rem;
		z-index: 20;

		.directions-header {
			font-weight: 600;
			font-size: 1rem;
		}
		.directions-body {
			display: flex;
			gap: 0.5rem;
			align-items: center;
		}
		.directions-progressbar {
			height: 0.75rem;
			flex: 1 0 0;
			border-radius: 0.5rem;
			background-color: hsl(0, 0%, 89%);
		}
		.directions-progressbar__value {
			position: relative;
			width: calc(attr(data-value number) * 1%);
			height: 100%;
			border-radius: 0.5rem;
			background-color: hsl(135, 100%, 42%);
		}
		a {
			display: inline-block;
			text-decoration: unset;
			padding: 0.25rem 0.75rem;
			border-radius: 0.5rem;
			transition: background-color 0.175s;
			background-color: hsl(5, 53%, 42%);
			&:hover {
				background-color: hsl(5, 53%, 37%);
			}
			&:active {
				background-color: hsl(5, 53%, 32%);
			}
			color: white;
		}
	}
</style> -->
