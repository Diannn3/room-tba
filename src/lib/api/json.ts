/**
 * Shared API response helpers.
 *
 * Every API route should use these instead of reinventing
 * `new Response(JSON.stringify(...), { status, headers })`.
 */

/**
 * Vercel CDN cache for anonymous campus reads.
 * One hour fresh at the edge; serve stale up to a day while revalidating.
 * Do not use on auth, account, admin, proposals, or presence.
 */
export const PUBLIC_READ_CACHE_CONTROL =
  "public, s-maxage=3600, stale-while-revalidate=86400";

/** Standard JSON response. */
export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** JSON response with {@link PUBLIC_READ_CACHE_CONTROL}. */
export function cachedJson(
  body: unknown,
  status = 200,
  extraHeaders?: Record<string, string>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": PUBLIC_READ_CACHE_CONTROL,
      ...extraHeaders,
    },
  });
}

/** Standard error response — `{ error: message }` with the given status. */
export function errorResponse(error: string, status: number): Response {
  return json({ error }, status);
}

/**
 * Parse and validate a numeric `:id` path parameter.
 * Returns the positive integer, or `null` if invalid.
 */
export function parseIdParam(value: string | undefined): number | null {
  const id = parseInt(value ?? "", 10);
  return Number.isNaN(id) || id < 1 ? null : id;
}
