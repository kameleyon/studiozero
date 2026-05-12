/**
 * Mock signin helper — Phase 9 M1 Batch 3 (Probe).
 *
 * Replaces the email + password ceremony for specs that don't *test* the
 * signup form (e.g. the keyboard-navigation, BYOK paste, and verdict
 * specs). Two paths:
 *
 *   1. POST /api/signup (the legacy mock route gated by
 *      NEXT_PUBLIC_USE_AUTH_MOCK=true). This is what `/signup` itself
 *      hits when mock is on — we re-use it so we exercise the same
 *      cookie set the production-equivalent path uses.
 *
 *   2. As a fallback (the route returns 410 if NEXT_PUBLIC_USE_AUTH_MOCK
 *      isn't "true"), we drop a `sz-session-mock` cookie directly. This
 *      keeps offline-dev contributors with stale env unblocked.
 *
 * After this returns, the next nav to /app/* will render an authed shell
 * (AppLayout consults `useSupabaseUser()` which falls back to MOCK_USER
 * when `isMockMode()`).
 *
 * Cipher-reviewed: never logs the email; the value is fake & deterministic.
 */
import type { BrowserContext, Page } from "@playwright/test";

const MOCK_EMAIL = "demo-alpha@example.com";

/**
 * Pre-seed the Lens cookie-consent decision so the banner (which
 * renders role=dialog aria-modal + traps focus + intercepts clicks)
 * doesn't intercept clicks in tests. The banner key is `sz_consent`
 * in localStorage (CookieBanner.tsx ln 67).
 *
 * Without this, every authed-page test races the modal's focus-trap
 * and click-intercept, which surfaces as flaky timeouts on buttons
 * sitting behind the modal overlay.
 */
export async function dismissCookieBanner(page: Page): Promise<void> {
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem(
        "sz_consent",
        JSON.stringify({
          status: "accepted",
          buckets: { necessary: true, analytics: true, marketing: false },
          decided_at: new Date().toISOString(),
        }),
      );
    } catch {
      // localStorage may be blocked in some test contexts; the banner
      // then renders but the test will surface the underlying assertion.
    }
  });
}

export async function signinMock(
  page: Page,
  email: string = MOCK_EMAIL,
): Promise<void> {
  // Order matters: dismiss the consent banner BEFORE any navigation so
  // the init-script lands before the first paint.
  await dismissCookieBanner(page);
  const context = page.context();

  // Path 1 — POST to /api/signup. The route 410s when mock is off; we
  // detect that and fall through to the cookie-drop.
  try {
    const res = await context.request.post("/api/signup", {
      data: { email, password: "test-only-not-a-real-secret-12chars" },
      headers: { "Content-Type": "application/json" },
    });
    if (res.ok()) {
      const body = (await res.json()) as { ok?: boolean };
      if (body.ok) return;
    }
  } catch {
    // fall through to cookie-drop
  }

  // Path 2 — drop the cookie directly so /app/* renders authed.
  await dropMockSessionCookie(context, email);
}

export async function dropMockSessionCookie(
  context: BrowserContext,
  email: string = MOCK_EMAIL,
): Promise<void> {
  const value = `sz.mock.${encodeURIComponent(email)}.${Date.now()}`;
  await context.addCookies([
    {
      name: "sz-session-mock",
      value,
      domain: "localhost",
      path: "/",
      httpOnly: false,
      secure: false,
      sameSite: "Lax",
      // 7 days from now
      expires: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
    },
  ]);
}
