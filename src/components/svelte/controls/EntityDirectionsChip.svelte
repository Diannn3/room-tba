<script lang="ts">
  import CornerRightUp from "@lucide/svelte/icons/corner-right-up";
  import MapChromeActionChip from "@ui/map-chrome/MapChromeActionChip.svelte";
  import { directionsStore, locationStore } from "@lib/store.svelte";

  type Props = {
    lat: number;
    lon: number;
    destinationLabel?: string;
    label?: string;
    toolbar?: boolean;
  };

  let {
    lat,
    lon,
    destinationLabel,
    label = "Directions",
    toolbar = true,
  }: Props = $props();

  const ariaLabel = $derived(
    destinationLabel
      ? `Get directions to ${destinationLabel}`
      : "Get directions",
  );

  function openDirections() {
    locationStore.requestLocation();
    locationStore.setDestination([lon, lat]);
    // Opens with whatever fix we already have; DirectionsSession replans as
    // soon as the watch delivers one (or a better one).
    void directionsStore.open(
      { lat, lng: lon, label: destinationLabel ?? "Destination" },
      locationStore.coords
        ? {
            lat: locationStore.coords[1],
            lng: locationStore.coords[0],
            label: "Your location",
          }
        : null,
    );
  }
</script>

<MapChromeActionChip {toolbar} {ariaLabel} onclick={openDirections}>
  <CornerRightUp size={14} aria-hidden="true" />
  {label}
</MapChromeActionChip>
