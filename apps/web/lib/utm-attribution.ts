/**
 * UTM attribution — Lens (Phase 9 M1 Batch 3).
 *
 * Implements analytics-spec.md §3 — client capture + server passthrough.
 *
 * Lens posture (locked):
 *   - Capture happens BEFORE consent — UTM in URL is data the user
 *     already gave us by clicking the link. Per spec §3.1 this is the
 *     "necessary" bucket; nothing leaves the browser at capture time.
 *   - Server is the source of truth for attribution. Client-side
 *     attribution is treated as broken-by-design (ad-blockers + cookie
 *     clears + incognito). The `signup-with-attribution` route is the
 *     only authoritative writer.
 *   - `referrer.hostname` only — never the full URL. Full referrers leak
 *     Google query terms = PII.
 *
 * Storage layout:
 *   localStorage `sz_first_touch`        — first-ever touch (immutable
 *                                          once set)
 *   localStorage `sz_attribution_persistent`
 *                                       — { first_touch, all_touches:[<=20] }
 *   sessionStorage `sz_attribution_session_id`
 *                                       — sticky id used to join PostHog
 *                                          events across the tab
 *
 * Mock-safety: every read/write is wrapped in try/catch so SSR + private
 * tab modes degrade silently.
 */

import type { UtmTouch } from "./analytics-events.v1";

const LS_FIRST_TOUCH = "sz_first_touch";
const LS_PERSISTENT = "sz_attribution_persistent";
const SS_SESSION_ID = "sz_attribution_session_id";

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"] as const;
const TOUCH_CAP = 20;

interface PersistentAttribution {
  first_touch: UtmTouch;
  all_touches: UtmTouch[];
}

/** Build a UtmTouch from the current location. */
function captureFromLocation(): UtmTouch | null {
  if (typeof window === "undefined") return null;
  const url = new URL(window.location.href);
  const referrer = document.referrer;

  let referrerHost: string | null = null;
  try {
    if (referrer) {
      const r = new URL(referrer);
      if (r.hostname !== window.location.hostname) {
        referrerHost = r.hostname;
      } else {
        // Self-referrer = session continuation, NOT a new acquisition
        // touch per spec §3.5.
        return null;
      }
    }
  } catch {
    referrerHost = null;
  }

  const params = url.searchParams;
  const source = params.get("utm_source");
  const medium = params.get("utm_medium");
  const campaign = params.get("utm_campaign");
  const term = params.get("utm_term");
  const content = params.get("utm_content");

  const hasAnyUtm =
    UTM_KEYS.some((k) => params.get(k)) || referrerHost !== null;
  if (!hasAnyUtm) return null;

  return {
    source: source ?? (referrerHost ? referrerHost : null),
    medium: medium ?? (referrerHost ? "referral" : null),
    campaign: campaign ?? null,
    term: term ?? null,
    content: content ?? null,
    ts: new Date().toISOString(),
    referrer_host: referrerHost,
  };
}

/**
 * Capture the current touch on landing. Idempotent within a session.
 * Call from the root layout / a top-level `useEffect` once per mount.
 */
export function captureOnLanding(): void {
  if (typeof window === "undefined") return;

  // Sticky session id for the tab.
  try {
    let sid = window.sessionStorage.getItem(SS_SESSION_ID);
    if (!sid) {
      sid = crypto.randomUUID();
      window.sessionStorage.setItem(SS_SESSION_ID, sid);
    }
  } catch {
    /* private tab */
  }

  const touch = captureFromLocation();
  if (!touch) return;

  // First-touch: persistent, never overwritten.
  try {
    const existing = window.localStorage.getItem(LS_FIRST_TOUCH);
    if (!existing) {
      window.localStorage.setItem(LS_FIRST_TOUCH, JSON.stringify(touch));
    }
  } catch {
    /* localStorage disabled */
  }

  // All-touches: FIFO-capped.
  try {
    const raw = window.localStorage.getItem(LS_PERSISTENT);
    let attrib: PersistentAttribution;
    if (raw) {
      attrib = JSON.parse(raw) as PersistentAttribution;
      attrib.all_touches.push(touch);
      if (attrib.all_touches.length > TOUCH_CAP) {
        attrib.all_touches.splice(0, attrib.all_touches.length - TOUCH_CAP);
      }
    } else {
      attrib = { first_touch: touch, all_touches: [touch] };
    }
    window.localStorage.setItem(LS_PERSISTENT, JSON.stringify(attrib));
  } catch {
    /* localStorage disabled */
  }
}

/** Read the current attribution snapshot for inclusion in signup forms. */
export function readAttributionSnapshot(): {
  first_touch: UtmTouch | null;
  last_touch: UtmTouch | null;
  all_touches: UtmTouch[];
  session_id: string | null;
} {
  if (typeof window === "undefined") {
    return { first_touch: null, last_touch: null, all_touches: [], session_id: null };
  }

  let first_touch: UtmTouch | null = null;
  let all_touches: UtmTouch[] = [];
  try {
    const rawFirst = window.localStorage.getItem(LS_FIRST_TOUCH);
    if (rawFirst) first_touch = JSON.parse(rawFirst) as UtmTouch;
    const rawAll = window.localStorage.getItem(LS_PERSISTENT);
    if (rawAll) {
      const parsed = JSON.parse(rawAll) as PersistentAttribution;
      all_touches = Array.isArray(parsed.all_touches) ? parsed.all_touches : [];
    }
  } catch {
    /* parse error — treat as empty */
  }

  const last_touch = all_touches.length > 0 ? (all_touches[all_touches.length - 1] ?? null) : first_touch;

  let session_id: string | null = null;
  try {
    session_id = window.sessionStorage.getItem(SS_SESSION_ID);
  } catch {
    /* private tab */
  }

  return { first_touch, last_touch, all_touches, session_id };
}

/** Stringified payload suitable for a hidden form field. */
export function serializeAttributionPayload(): string {
  const snap = readAttributionSnapshot();
  return JSON.stringify({
    first_touch: snap.first_touch,
    last_touch: snap.last_touch,
    all_touches: snap.all_touches,
    captured_via: "client_local_storage",
  });
}

/**
 * Helper for the signup-with-attribution route. Resolves the request body's
 * `sz_attribution_payload` into a shape suitable for the
 * `users.acquisition_attribution` jsonb column.
 *
 * Safe to pass arbitrary user input — every nested value is bounded by
 * `TOUCH_CAP` and string-length limits, and unknown keys are dropped.
 */
export function normalizeAttributionPayload(
  raw: unknown,
): {
  first_touch: UtmTouch | null;
  last_touch: UtmTouch | null;
  all_touches: UtmTouch[];
  captured_via: string;
} {
  const fallback = {
    first_touch: null,
    last_touch: null,
    all_touches: [] as UtmTouch[],
    captured_via: "server_unknown",
  };
  if (!raw || typeof raw !== "object") return fallback;

  const obj = raw as Record<string, unknown>;
  const firstTouch = sanitizeTouch(obj.first_touch);
  const lastTouch = sanitizeTouch(obj.last_touch);
  const allTouches: UtmTouch[] = Array.isArray(obj.all_touches)
    ? (obj.all_touches as unknown[])
        .map(sanitizeTouch)
        .filter((t): t is UtmTouch => t !== null)
        .slice(-TOUCH_CAP)
    : [];

  return {
    first_touch: firstTouch,
    last_touch: lastTouch,
    all_touches: allTouches,
    captured_via: typeof obj.captured_via === "string" ? obj.captured_via : "client_local_storage",
  };
}

function sanitizeTouch(raw: unknown): UtmTouch | null {
  if (!raw || typeof raw !== "object") return null;
  const t = raw as Record<string, unknown>;
  const clip = (v: unknown): string | null => {
    if (typeof v !== "string") return null;
    return v.length > 200 ? v.slice(0, 200) : v;
  };
  return {
    source: clip(t.source),
    medium: clip(t.medium),
    campaign: clip(t.campaign),
    term: clip(t.term),
    content: clip(t.content),
    ts:
      typeof t.ts === "string" && t.ts.length <= 32
        ? t.ts
        : new Date().toISOString(),
    referrer_host: clip(t.referrer_host),
  };
}
