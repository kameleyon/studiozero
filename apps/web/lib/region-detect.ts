/**
 * region-detect — server-side EU/UK/California/ROW classification.
 *
 * Owner: Locale + Forge (Phase 9 M2 Batch 3, D22 D1 close).
 *
 * Inputs (priority cascade per refund-matrix.md §3.1):
 *   1. Stripe-detected billing address country (out of scope here — only
 *      known post-Checkout; the webhook handler reconciles)
 *   2. IP geolocation via Vercel edge headers
 *      (`x-vercel-ip-country`, falls back to `cf-ipcountry`)
 *   3. Timezone / accept-language (last resort; not used here — UX flow
 *      hands off to explicit-radio disambiguation per EC-6)
 *
 * Output: a stable `RegionCode` consumed by `/api/billing/checkout-session`
 * and the waiver-UX server component.
 */

export type RegionCode =
  | "eu"
  | "uk"
  | "california"
  | "us_other"
  | "row";

/** Member-state ISO-3166 alpha-2 codes inside the EU as of 2026. */
const EU_COUNTRIES: ReadonlySet<string> = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR",
  "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK",
  "SI", "ES", "SE",
]);

/** US states/territories that count as plain US (non-California) for our
 *  pro-rata branch. We only care about flagging California; everything
 *  else under US is `us_other`. */
function isUsCountry(cc: string): boolean {
  return cc === "US";
}

interface DetectInput {
  /** Two-letter ISO country code from Vercel/CF edge headers. */
  country?: string | null;
  /** Two-letter US state/region from Vercel `x-vercel-ip-country-region`. */
  region?: string | null;
}

/**
 * Resolve a `RegionCode` from edge-provided geo signals. Safe to call on
 * any request — returns `'row'` when no geo is present, matching the
 * server-side waiver gate's permissive-default for non-EU/UK traffic.
 */
export function detectRegion(input: DetectInput): RegionCode {
  const cc = (input.country ?? "").toUpperCase();
  if (!cc) return "row";

  // UK gets its own code — CCR 2013 is separately cited and the waiver
  // copy is a separate string (refund-matrix.md §8.3).
  if (cc === "GB" || cc === "UK") return "uk";

  if (EU_COUNTRIES.has(cc)) return "eu";

  if (isUsCountry(cc)) {
    const state = (input.region ?? "").toUpperCase();
    if (state === "CA") return "california";
    return "us_other";
  }

  return "row";
}

/**
 * Pull geo signals out of a Next.js Request. Vercel sets these on the
 * edge; in local dev they are absent and `detectRegion` returns `'row'`.
 */
export function detectRegionFromRequest(req: Request): RegionCode {
  const h = req.headers;
  const country =
    h.get("x-vercel-ip-country") ??
    h.get("cf-ipcountry") ??
    h.get("x-country-code") ??
    null;
  const region = h.get("x-vercel-ip-country-region") ?? null;
  return detectRegion({ country, region });
}

/**
 * Pull geo signals out of a Next.js Headers object (server component
 * `headers()` call). Returns the same shape as `detectRegionFromRequest`.
 */
export function detectRegionFromHeaders(
  h: { get(name: string): string | null },
): RegionCode {
  const country =
    h.get("x-vercel-ip-country") ??
    h.get("cf-ipcountry") ??
    h.get("x-country-code") ??
    null;
  const region = h.get("x-vercel-ip-country-region") ?? null;
  return detectRegion({ country, region });
}

/** True when the region requires the EU/UK 14-day cooling-off waiver
 *  flow before Stripe Checkout (per refund-matrix.md §3.2). */
export function requiresCoolingOffWaiver(r: RegionCode): boolean {
  return r === "eu" || r === "uk";
}
