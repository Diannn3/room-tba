# Building-to-building walking router

Room TBA's building router is a walking-only Map tools task. It selects exactly
two mapped buildings and estimates the outdoor walk between their map pins.

## Routing contract

- Route authority: `src/generated/walk-graph.json` through the existing
  client-side travel-graph engine.
- Walking speed: the shared `WALK_KPH` constant. The building router does not
  own a second speed.
- Endpoint eligibility: the selected pin must snap within the audited hard
  ceiling, and its snapped node must belong to the graph's largest weakly
  connected component.
- Canonical totals include both approximate building-pin connectors:
  - origin pin → origin walk node
  - mapped graph shortest path
  - destination walk node → destination pin
- The solid map line is authoritative graph geometry. Dashed connector lines
  are approximate and are never presented as surveyed entrances or indoor
  paths.
- Unsupported endpoints and directed `no-route` results fail closed. There is
  no Haversine, OSRM, or other fallback ETA.
- Selecting the same building twice is an explicit non-route state. There is no
  outdoor walking route to estimate.

## Product boundaries

This feature does **not** route individual rooms, infer indoor corridors or
entrances, use live GPS, add waypoints, suggest jeepneys, or alter
Planner/Today/day-route behavior. Generic GPS/transit Directions and the
building router are mutually exclusive task modes.

## Offline behavior

The route core has no routing API dependency. Once the generated walk-graph
chunk is available in the browser, subsequent calculations are local. A cached
session can recalculate or swap a pair while offline. A first-time graph-cache
miss is surfaced as an unavailable/error state rather than replaced by an
approximation.

## QA

Feature-focused checks:

```sh
bun test src/lib/travel-graph/building-route.test.ts \
  src/lib/travel-graph/building-route-map.test.ts \
  src/lib/travel-graph/building-route.baseline.test.ts
bunx vitest run \
  src/components/svelte/building-route/BuildingRoutePanel.component.test.ts \
  src/components/svelte/building-route/BuildingRouteMapOverlay.component.test.ts \
  src/components/svelte/controls/EntityDirectionsChip.component.test.ts \
  src/lib/focus-trap.component.test.ts
bunx playwright test -c playwright.advisory.config.ts \
  e2e/advisory/building-route.spec.ts
```

Before merging, also run `bun run lint`, `bun run test`,
`bun run test:components`, and `bun run build`, plus the relevant advisory E2E.
Validate 320 px, 768 px, and desktop layouts.

Physical campus timing/path checks remain the final evidence for calibration.
Do not change `WALK_KPH` or endpoint ceilings merely to make an estimate look
closer to one anecdotal walk.
