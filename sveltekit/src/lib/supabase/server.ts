import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Cookies } from "@sveltejs/kit";
import { astroCookieHandlers } from "./cookies";
import { getSupabasePublishableKey, getSupabaseUrl } from "./env";

export type CreateServerSupabaseOptions = {
  request: Request;
  cookies: Cookies;
  /** Apply CDN cache-busting headers when auth cookies refresh. */
  applyCacheHeaders?: (headers: Record<string, string>) => void;
};

/** SSR Supabase client for server load functions, API routes, and hooks. */
export function createServerSupabaseClient({
  request,
  cookies,
  applyCacheHeaders,
}: CreateServerSupabaseOptions): SupabaseClient {
  return createServerClient(getSupabaseUrl(), getSupabasePublishableKey(), {
    cookies: astroCookieHandlers(request, cookies, applyCacheHeaders),
  });
}
