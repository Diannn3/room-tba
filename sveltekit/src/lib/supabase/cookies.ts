import { parseCookieHeader } from "@supabase/ssr";
import type { Cookies } from "@sveltejs/kit";

// Partial: @supabase/ssr passes serialize options without SvelteKit's
// required `path`; the setAll handler below fills it in.
type CookieOptions = Partial<Parameters<Cookies["set"]>[2]>;

export type SupabaseCookieHandlers = {
  getAll(): { name: string; value: string }[];
  setAll(
    cookiesToSet: { name: string; value: string; options?: CookieOptions }[],
    cacheHeaders?: Record<string, string>,
  ): void;
};

export function astroCookieHandlers(
  request: Request,
  cookies: Cookies,
  onCacheHeaders?: (headers: Record<string, string>) => void,
): SupabaseCookieHandlers {
  return {
    getAll() {
      return parseCookieHeader(request.headers.get("Cookie") ?? "").map(
        ({ name, value }) => ({
          name,
          value: value ?? "",
        }),
      );
    },
    setAll(cookiesToSet, cacheHeaders) {
      cookiesToSet.forEach(({ name, value, options }) => {
        // SvelteKit requires an explicit path on every cookie write.
        cookies.set(name, value, { ...options, path: options?.path ?? "/" });
      });
      if (cacheHeaders && onCacheHeaders) {
        onCacheHeaders(cacheHeaders);
      }
    },
  };
}
