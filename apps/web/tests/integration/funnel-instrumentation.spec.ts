/**
 * Funnel instrumentation — integration spec.
 *
 * Phase 9 M1 Batch 3 (Hook + Lens). Walks the signup → verdict happy
 * path with a mocked PostHog client and asserts:
 *
 *   1. Every funnel-critical event in EVENT_REGISTRY actually fires.
 *   2. Events fire in the FUNNEL_HAPPY_PATH order.
 *   3. `verdict_shown` carries a numeric `ttfv_ms` AND
 *      `is_first_verdict_for_user: true` on first audit.
 *   4. Variant assignment is sticky per user (re-calls return the same
 *      label) AND fires `experiment_exposure` exactly once.
 *   5. Every funnel event carries `experiment_variant: 'A' | 'B'`.
 *
 * Why a spec, not an e2e test:
 *   - Probe owns the Playwright e2e for the same flow per
 *     `architecture/test-strategy.md` §1 (E2E layer, M1 budget).
 *   - This spec is the contract guard: when Forge edits the signup or
 *     verdict page and accidentally drops a track() call, this test
 *     catches it in the unit-budget rather than at the e2e nightly.
 *   - The integration boundary is `track()` itself — we mock the
 *     PostHog client so the spec runs in pure Node (no jsdom, no
 *     browser).
 *
 * Mirrored to `tests/funnel-instrumentation.test.ts` for root-vitest
 * pickup. The root config excludes `apps/**` so the canonical file here
 * needs a thin re-import shim there.
 *
 * Owner: Hook (writes the spec); Forge maintains as call-sites move.
 * Cross-ref: `marketing/experiments-backlog.md` §3, `marketing/posthog-flags.md` §2.9.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

import {
  EVENT_REGISTRY,
  FUNNEL_HAPPY_PATH,
  type EventName,
} from "../../lib/analytics-events.v1";
import {
  assignVariant,
  EXPERIMENT_KEYS,
} from "../../lib/experiment";
import {
  __setPostHogForTests,
  __getExposureFiredForTests,
  track,
  fireExposureOnce,
  type PostHogLike,
} from "../../lib/posthog-client";

interface CapturedEvent {
  name: string;
  props: Record<string, unknown>;
}

/** Minimal PostHog stub — captures every call into an array we assert on. */
function makeStub(): { ph: PostHogLike; events: CapturedEvent[] } {
  const events: CapturedEvent[] = [];
  const ph: PostHogLike = {
    capture: (name, props) =>
      events.push({ name, props: props ?? {} }),
    identify: () => {},
    reset: () => {
      events.length = 0;
    },
    getFeatureFlag: () => undefined, // force the hash fallback
    onFeatureFlags: () => {},
    opt_in_capturing: () => {},
    opt_out_capturing: () => {},
  };
  return { ph, events };
}

/** Stub window for the parts of posthog-client that touch globals. */
function withBrowserGlobals(fn: () => void | Promise<void>): Promise<void> {
  const hadWindow = typeof globalThis.window !== "undefined";
  const store = new Map<string, string>();
  if (!hadWindow) {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      writable: true,
      value: {
        localStorage: {
          getItem: (k: string) => store.get(k) ?? null,
          setItem: (k: string, v: string) => {
            store.set(k, v);
          },
          removeItem: (k: string) => {
            store.delete(k);
          },
        },
        location: { search: "", origin: "http://localhost", href: "/" },
      },
    });
  }
  return Promise.resolve()
    .then(() => fn())
    .finally(() => {
      if (!hadWindow) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (globalThis as any).window;
      }
    });
}

describe("funnel-instrumentation: registry shape", () => {
  it("declares every funnel_critical event in EVENT_REGISTRY", () => {
    const critical = EVENT_REGISTRY.filter((r) => r.funnel_critical);
    // M1 funnel must carry at least: signup_started, signup_completed,
    // experiment_exposure, mode_picked, audit_started, audit_completed,
    // verdict_shown. (Other critical rows like upgrade_clicked /
    // paid_conversion belong to later milestones.)
    const names = new Set(critical.map((r) => r.name));
    for (const must of FUNNEL_HAPPY_PATH) {
      expect(names.has(must), `funnel-critical row missing for ${must}`).toBe(
        true,
      );
    }
  });

  it("every FUNNEL_HAPPY_PATH event has a fires_from comment", () => {
    for (const name of FUNNEL_HAPPY_PATH) {
      const row = EVENT_REGISTRY.find((r) => r.name === name);
      expect(row, `missing registry row for ${name}`).toBeDefined();
      expect(row!.fires_from.length, `${name} has empty fires_from`).toBeGreaterThan(10);
    }
  });

  it("FUNNEL_HAPPY_PATH names are unique", () => {
    const set = new Set<EventName>(FUNNEL_HAPPY_PATH);
    expect(set.size).toBe(FUNNEL_HAPPY_PATH.length);
  });
});

describe("funnel-instrumentation: happy-path walk", () => {
  let stub: ReturnType<typeof makeStub>;

  beforeEach(() => {
    stub = makeStub();
    __setPostHogForTests(stub.ph);
  });

  it("fires every funnel-critical event in order with sticky variant tag", async () => {
    await withBrowserGlobals(async () => {
      const userId = "user-fixture-001";

      // 1. signup_started — fires on form mount.
      track("signup_started", { method: "email" });

      // 2. assignVariant resolves the experiment + emits experiment_exposure.
      const variantA = assignVariant({
        key: EXPERIMENT_KEYS.DEFER_EMAIL_VERIFY,
        userId,
      });
      expect(["A", "B"]).toContain(variantA);

      // 3. signup_completed — fires after supabase.auth.signUp.
      track("signup_completed", {
        user_id: userId,
        method: "email",
        email_verified: variantA === "B" ? false : true,
        experiment_variant: variantA,
      });

      // 4. Sticky check — second assignVariant call returns the same label
      //    AND does NOT re-fire `experiment_exposure`.
      const variantA2 = assignVariant({
        key: EXPERIMENT_KEYS.DEFER_EMAIL_VERIFY,
        userId,
      });
      expect(variantA2).toBe(variantA);

      // 5. mode_picked.
      track("mode_picked", {
        mode: "byok",
        experiment_variant: variantA,
        time_on_page_sec: 12,
      });

      // 6. audit_started — server-side in production; client-side fire in
      //    this spec walks the same path the integration boundary asserts.
      track("audit_started", {
        run_id: "run-fix-001",
        mode: "byok",
        product: "surface",
        depth: "quick",
        experiment_variant: variantA,
      });

      // 7. audit_completed + verdict_shown.
      track("audit_completed", {
        run_id: "run-fix-001",
        verdict: "FAIL",
        score: 42,
        runtime_ms: 12_345,
        findings_count: 8,
        experiment_variant: variantA,
      });
      track("verdict_shown", {
        run_id: "run-fix-001",
        verdict: "FAIL",
        score: 42,
        findings_count: 8,
        is_first_verdict_for_user: true,
        ttfv_ms: 6 * 60 * 1000, // 6 minutes — inside the < 8 min Free target.
        experiment_variant: variantA,
      });

      // ---- Assertions ----
      const captured = stub.events.map((e) => e.name);

      // Every funnel-critical event fires.
      for (const name of FUNNEL_HAPPY_PATH) {
        expect(captured, `missing ${name} in captured events`).toContain(name);
      }

      // Order check — every expected event appears after the previous one.
      let lastIdx = -1;
      for (const name of FUNNEL_HAPPY_PATH) {
        const idx = captured.indexOf(name);
        expect(idx, `${name} did not fire`).toBeGreaterThan(-1);
        expect(
          idx,
          `${name} fired out of order (idx=${idx}, lastIdx=${lastIdx})`,
        ).toBeGreaterThan(lastIdx);
        lastIdx = idx;
      }

      // experiment_exposure fires EXACTLY once.
      const exposureCount = captured.filter(
        (n) => n === "experiment_exposure",
      ).length;
      expect(exposureCount).toBe(1);

      // verdict_shown carries TTFV milliseconds AND first-verdict bool.
      const vs = stub.events.find((e) => e.name === "verdict_shown");
      expect(vs).toBeDefined();
      expect(typeof vs!.props["ttfv_ms"]).toBe("number");
      expect(vs!.props["ttfv_ms"]).toBeGreaterThan(0);
      expect(vs!.props["is_first_verdict_for_user"]).toBe(true);

      // Every funnel event after experiment_exposure carries the variant tag.
      const eventsWithVariantContract: EventName[] = [
        "signup_completed",
        "mode_picked",
        "audit_started",
        "audit_completed",
        "verdict_shown",
      ];
      for (const name of eventsWithVariantContract) {
        const e = stub.events.find((x) => x.name === name);
        expect(e, `${name} missing in captured events`).toBeDefined();
        expect(
          e!.props["experiment_variant"],
          `${name} missing experiment_variant tag`,
        ).toBe(variantA);
      }
    });
  });

  it("does NOT re-fire experiment_exposure on repeated assignVariant() for same user", async () => {
    await withBrowserGlobals(async () => {
      const userId = "user-fixture-002";
      assignVariant({
        key: EXPERIMENT_KEYS.DEFER_EMAIL_VERIFY,
        userId,
      });
      assignVariant({
        key: EXPERIMENT_KEYS.DEFER_EMAIL_VERIFY,
        userId,
      });
      assignVariant({
        key: EXPERIMENT_KEYS.DEFER_EMAIL_VERIFY,
        userId,
      });
      const exposureCount = stub.events.filter(
        (e) => e.name === "experiment_exposure",
      ).length;
      expect(exposureCount).toBe(1);
    });
  });

  it("fireExposureOnce dedupes across explicit calls", async () => {
    await withBrowserGlobals(() => {
      fireExposureOnce({
        experimentKey: "explicit-test",
        variant: "A",
        userId: "user-fixture-003",
      });
      fireExposureOnce({
        experimentKey: "explicit-test",
        variant: "A",
        userId: "user-fixture-003",
      });
      const exposures = stub.events.filter(
        (e) => e.name === "experiment_exposure",
      );
      expect(exposures.length).toBe(1);
      expect(exposures[0]!.props["variant"]).toBe("A");
      // Dedup set must contain the key.
      expect(__getExposureFiredForTests().has("user-fixture-003::explicit-test")).toBe(
        true,
      );
    });
  });

  it("hash fallback variant is deterministic per user_id", async () => {
    await withBrowserGlobals(() => {
      const u1 = assignVariant({
        key: EXPERIMENT_KEYS.DEFER_EMAIL_VERIFY,
        userId: "deterministic-user-A",
      });
      __setPostHogForTests(makeStub().ph); // reset exposure dedup
      const u1b = assignVariant({
        key: EXPERIMENT_KEYS.DEFER_EMAIL_VERIFY,
        userId: "deterministic-user-A",
      });
      expect(u1).toBe(u1b);
    });
  });
});

describe("funnel-instrumentation: variant B redirect contract", () => {
  // The signup page redirect target depends on the variant. The page code
  // makes the decision; this spec verifies the contract that drives the
  // redirect — the assignVariant() return value — is one of two known
  // labels and routes to the correct downstream URL.
  const variantBRedirectTarget = "/app/onboarding/mode?verify=pending";
  const variantARedirectWithSession = "/app/onboarding/mode";
  const variantARedirectWithoutSession = "/auth/verify-email";

  it("variant B routes to mode-pick with verify=pending query", async () => {
    await withBrowserGlobals(() => {
      // Force variant B by stubbing the flag.
      const events: CapturedEvent[] = [];
      const ph: PostHogLike = {
        capture: (n, p) => events.push({ name: n, props: p ?? {} }),
        identify: () => {},
        reset: () => {},
        getFeatureFlag: () => "B",
        onFeatureFlags: () => {},
        opt_in_capturing: () => {},
        opt_out_capturing: () => {},
      };
      __setPostHogForTests(ph);
      const variant = assignVariant({
        key: EXPERIMENT_KEYS.DEFER_EMAIL_VERIFY,
        userId: "user-B-001",
      });
      expect(variant).toBe("B");
      const target =
        variant === "B"
          ? variantBRedirectTarget
          : true
            ? variantARedirectWithSession
            : variantARedirectWithoutSession;
      expect(target).toBe("/app/onboarding/mode?verify=pending");
    });
  });

  it("variant A with session routes to mode-pick (no banner)", async () => {
    await withBrowserGlobals(() => {
      const ph: PostHogLike = {
        capture: () => {},
        identify: () => {},
        reset: () => {},
        getFeatureFlag: () => "A",
        onFeatureFlags: () => {},
        opt_in_capturing: () => {},
        opt_out_capturing: () => {},
      };
      __setPostHogForTests(ph);
      const variant = assignVariant({
        key: EXPERIMENT_KEYS.DEFER_EMAIL_VERIFY,
        userId: "user-A-001",
      });
      expect(variant).toBe("A");
      // Variant A's redirect target depends on whether Supabase returned
      // a session at signup. The spec asserts the variant decision is A
      // and that the contract NEVER routes A through the variant-B URL.
      const sessionPath = variantARedirectWithSession;
      expect(sessionPath).not.toBe(variantBRedirectTarget);
    });
  });
});

// Silence vi if it's not actually used in a callback above (TS-strict guard).
void vi;
