<script lang="ts">
  import type { FeatureCollection, LineString } from "geojson";
  import {
    LngLatBounds,
    type GeoJSONSource,
    type MapLibreMap,
  } from "maplibre-gl";
  import { buildingRouteStore, mapStore } from "@lib/store.svelte";
  import {
    buildingRouteCameraAnimationOptions,
    buildingRouteFitCoordinates,
    buildingRouteGeoJson,
  } from "@lib/travel-graph/building-route-map";

  const GRAPH_SOURCE = "building-walk-route-graph";
  const GRAPH_LAYER = "building-walk-route-graph";
  const CONNECTOR_SOURCE = "building-walk-route-connectors";
  const CONNECTOR_LAYER = "building-walk-route-connectors";

  let lastFitKey: string | null = null;

  function removeRouteLayers(map: MapLibreMap) {
    if (map.getLayer(CONNECTOR_LAYER)) map.removeLayer(CONNECTOR_LAYER);
    if (map.getLayer(GRAPH_LAYER)) map.removeLayer(GRAPH_LAYER);
    if (map.getSource(CONNECTOR_SOURCE)) map.removeSource(CONNECTOR_SOURCE);
    if (map.getSource(GRAPH_SOURCE)) map.removeSource(GRAPH_SOURCE);
  }

  function setOrAddLine(
    map: MapLibreMap,
    sourceId: string,
    layerId: string,
    data: FeatureCollection<LineString>,
    dashed: boolean,
  ) {
    const source = map.getSource(sourceId) as GeoJSONSource | undefined;
    if (source) {
      source.setData(data);
    } else {
      map.addSource(sourceId, { type: "geojson", data });
    }

    if (map.getLayer(layerId)) return;
    map.addLayer({
      id: layerId,
      type: "line",
      source: sourceId,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": dashed ? "#71717a" : "#8d1437",
        "line-width": dashed ? 3 : 5,
        "line-opacity": dashed ? 0.78 : 0.95,
        ...(dashed ? { "line-dasharray": [1.5, 1.5] } : {}),
      },
    });
  }

  function syncRoute(map: MapLibreMap) {
    const route = buildingRouteStore.route;
    if (!map.isStyleLoaded()) return;
    if (!route) {
      lastFitKey = null;
      removeRouteLayers(map);
      return;
    }

    const data = buildingRouteGeoJson(route);
    setOrAddLine(map, GRAPH_SOURCE, GRAPH_LAYER, data.graph, false);
    setOrAddLine(
      map,
      CONNECTOR_SOURCE,
      CONNECTOR_LAYER,
      data.connectors,
      true,
    );
  }

  function routeFitPadding(map: MapLibreMap) {
    const mapRect = map.getContainer().getBoundingClientRect();
    const panelRect = document
      .getElementById("map-tools-panel")
      ?.getBoundingClientRect();
    const mobile = window.matchMedia("(max-width: 48rem)").matches;
    const gutter = 24;

    if (mobile) {
      const panelTop = panelRect?.top ?? mapRect.bottom - 156;
      return {
        top: 96,
        right: 36,
        bottom: Math.max(156, mapRect.bottom - panelTop + gutter),
        left: 36,
      };
    }

    const panelLeft = panelRect?.left ?? mapRect.right - 384;
    return {
      top: 96,
      right: Math.max(72, mapRect.right - panelLeft + gutter),
      bottom: 72,
      left: 72,
    };
  }

  function fitRoute(map: MapLibreMap) {
    const route = buildingRouteStore.route;
    const origin = buildingRouteStore.origin;
    const destination = buildingRouteStore.destination;
    if (!route || !origin || !destination) return;

    const key = [
      origin.id,
      destination.id,
      route.totalMeters.toFixed(1),
    ].join(":");
    if (key === lastFitKey) return;
    lastFitKey = key;

    const bounds = new LngLatBounds();
    for (const coordinate of buildingRouteFitCoordinates(route)) {
      bounds.extend(coordinate);
    }
    if (bounds.isEmpty()) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    map.fitBounds(bounds, {
      padding: routeFitPadding(map),
      maxZoom: 18,
      ...buildingRouteCameraAnimationOptions(reducedMotion),
    });
  }

  $effect(() => {
    const map = mapStore.mapInstance ?? null;
    // Track route identity so clear/replan immediately updates the layers.
    const route = buildingRouteStore.route;
    if (!map) return;

    const sync = () => {
      syncRoute(map);
      if (route) fitRoute(map);
    };

    sync();
    // Restore our app-owned sources only after a replacement style is fully
    // loaded. `styledata` fires during intermediate style mutations as well;
    // `style.load` is the stable seam documented by MapLibre for a completed
    // style change.
    map.on("style.load", sync);

    return () => {
      map.off("style.load", sync);
      if (map.isStyleLoaded()) removeRouteLayers(map);
    };
  });
</script>
