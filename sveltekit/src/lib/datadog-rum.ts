import { datadogRum } from "@datadog/browser-rum";
import { env as publicEnv } from "$env/dynamic/public";

// Renamed from astro's DD_* — SvelteKit only exposes PUBLIC_-prefixed vars to the client.
const {
  PUBLIC_DD_ENV: DD_ENV,
  PUBLIC_DD_RUM_APPLICATION_ID: DD_RUM_APPLICATION_ID,
  PUBLIC_DD_RUM_CLIENT_TOKEN: DD_RUM_CLIENT_TOKEN,
  PUBLIC_DD_SERVICE: DD_SERVICE,
  PUBLIC_DD_SITE: DD_SITE,
  PUBLIC_DD_VERSION: DD_VERSION,
} = publicEnv;

let initialized = false;

export function initDatadogRum(): void {
  if (initialized || typeof window === "undefined") return;

  const applicationId = DD_RUM_APPLICATION_ID?.trim();
  const clientToken = DD_RUM_CLIENT_TOKEN?.trim();
  if (!applicationId || !clientToken) return;

  initialized = true;

  const env = DD_ENV?.trim() || "development";
  const origin =
    typeof window.location?.origin === "string"
      ? window.location.origin
      : undefined;

  datadogRum.init({
    applicationId,
    clientToken,
    site: DD_SITE?.trim() || "us5.datadoghq.com",
    service: DD_SERVICE?.trim() || "room-tba",
    env,
    version: DD_VERSION?.trim() || undefined,
    sessionSampleRate: 15,
    sessionReplaySampleRate: 0,
    defaultPrivacyLevel: "mask-user-input",
    trackResources: true,
    trackLongTasks: true,
    trackUserInteractions: true,
    allowedTracingUrls: origin
      ? [{ match: origin, propagatorTypes: ["tracecontext", "datadog"] }]
      : undefined,
  });
}
