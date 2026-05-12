# PostHog — Product Analytics Bootstrap

**Vendor:** PostHog (Cloud · US region; free tier covers MVP — 1M events/mo, $0)
**Region:** US cloud (us.i.posthog.com) — matches PRD §14.4 US-only data residency
**Owner:** Lens (instrumentation spec) + Terra (project bootstrap) + Forge (SDK wiring) + Cipher (tenant_id HMAC-salting per Cipher Fix-3b)
**Status at M0:** **STUB** — project created M0 close; SDK wires at M1; consent-gate ships before any event fires.

> **Why PostHog (not Mixpanel / Amplitude).** PostHog gives funnels + session replay (gated by consent) + feature flags in one product at $0 free-tier. Sister vendor pattern: `agents/growth/lens.md` requirement is consent-gated init — PostHog SDK supports `posthog.opt_in_capturing()` / `opt_out_capturing()` which maps cleanly to our cookie-consent banner. Mixpanel's consent semantics are clumsier.

## Consent-gate hard rule (Lens spec)

**PostHog SDK is NOT initialized — not even imported lazily — until cookie consent is granted.**

Implementation:

1. Cookie banner asks consent (Halo's HC1-compliant copy + a11y).
2. On "Accept": set `consent_granted` cookie (httpOnly=false so JS can read; SameSite=Lax).
3. App shell checks the cookie on every mount; if granted, `import('posthog-js')` lazily + call `posthog.init()`.
4. On "Reject": never load the SDK. Period.
5. Settings page exposes "Re-evaluate cookie consent" → clears cookie → next page-load shows banner again.

Verify writes `tests/acceptance/e2e/consent-gate.spec.ts` at M1 asserting: before consent, `window.posthog` is undefined; after consent, identify call fires.

## Project identity

| Field                                      | Value (placeholder; populated at bootstrap)           |
| ------------------------------------------ | ----------------------------------------------------- |
| Org name                                   | `studio-zero`                                         |
| Project name                               | `studio-zero`                                         |
| Region                                     | US cloud (`https://us.i.posthog.com`)                 |
| Project API key                            | TBD → wired as `NEXT_PUBLIC_POSTHOG_KEY`              |
| Personal API key (for IaC / event imports) | TBD → wired as `POSTHOG_PERSONAL_API_KEY` (CI only)   |
| Tracked environments                       | `production`, `preview` (NOT development — too noisy) |

## Identification scheme

Per Cipher Fix-3b: **tenant_id is HMAC-SHA256 salted before sending to PostHog.** Salt is a per-org constant stored in Vercel env `POSTHOG_TENANT_SALT` (32 random bytes, rotates 90d per Cipher Fix-4).

- `posthog.identify(hmac_sha256(salt, user_id))` — never raw user_id
- `posthog.group('tenant', hmac_sha256(salt, tenant_id))` — never raw tenant_id
- User properties (email, name, etc.) → **NOT sent**. Period.
- Tenant properties (plan_tier, seat_count, BYOK vs Managed) → sent (PostHog group properties)

The salt-rotation procedure: rotate salt, re-emit `posthog.identify()` at next user session with the new salt. Old salt's identities drift orphaned in PostHog — accepted (we don't need historical join across salt rotations; PostHog funnels are time-bounded queries).

## Event catalog (Lens publishes M1; placeholder here)

M0–M1 events fire from the funnel surfaces only — PRD §15.5 conversion analytics:

| Event                    | Properties                                                                               | Fires from             | M0/M1 |
| ------------------------ | ---------------------------------------------------------------------------------------- | ---------------------- | ----- |
| `page_view`              | `pathname`, `referrer`, `utm_*`                                                          | every page             | M1    |
| `signup_started`         | `provider` (email/google/github)                                                         | `/signup`              | M1    |
| `signup_completed`       | `provider`, `tenant_created_at`                                                          | post-signup            | M1    |
| `audit_started`          | `sku`, `depth`, `mode` (managed/byok/cli)                                                | `/app/audits/new`      | M1    |
| `audit_completed`        | `sku`, `verdict`, `score` (rounded to nearest 5 for k-anonymity), `score_engine_version` | post-verdict-emitted   | M1    |
| `pricing_viewed`         | `referrer`, `utm_*`                                                                      | `/pricing`             | M1    |
| `byok_validated`         | `success`, `error_code` if fail                                                          | `/onboarding/byok`     | M1    |
| `cli_paired`             | `device_hash` (NOT device_id)                                                            | `/onboarding/cli`      | M3    |
| `checkout_started`       | `plan_tier`, `billing_cycle`                                                             | `/onboarding/managed`  | M2    |
| `subscription_activated` | `plan_tier`                                                                              | post-Stripe webhook    | M2    |
| `upgrade_started`        | `from_tier`, `to_tier`, `run_id`                                                         | E2 upsell button click | M1    |
| `auto_pr_purchased`      | `run_id`                                                                                 | V1.5                   | V1.5  |
| `pr_merged`              | `run_id`, `pr_url` (host stripped)                                                       | V1.5 GitHub webhook    | V1.5  |

Notably **NOT** captured: raw URLs of audited sites, file paths, finding text, code snippets, screenshots, transcripts, BYOK keys, customer emails.

## UTM passthrough

Marketing landings (PRD §15.5 channels — Scout owns) pass UTM params:

- `utm_source` (e.g., `twitter`, `hn`, `producthunt`)
- `utm_medium` (e.g., `social`, `community`, `email`)
- `utm_campaign` (e.g., `m0-waitlist-launch`)
- `utm_content` (e.g., `tweet-123`, `hn-post-title`)

Stored as PostHog person properties on `signup_completed` and `subscription_activated`. Lens reports cohort attribution monthly in `marketing/attribution-monthly.md`.

## Session replay

**OFF at M0–M2.** Session replay captures DOM + interactions — under our consent gate it's GDPR-defensible, but `runway.md` §4.1 says PostHog stays free tier through M5 (replay would push us past free tier event budget). Lens scopes replay activation to V1.5+ if conversion-debugging needs it.

## Feature flags

PostHog supports feature flags out-of-the-box (no extra cost on free tier). Wired at M1 for:

- `enable_byok_signup` (controls visibility of BYOK SKU)
- `enable_cli_pairing` (controls `/onboarding/cli` reachability — gates M3 ship)
- `enable_auto_pr_v1_5` (V1.5 gate — Forge + Hook)
- `pricing_starter_19_vs_29` (Penny's A/B for D4 — first 200 signups get 50/50)

## Bootstrap actions (Jo executes at M0 close)

1. **PostHog account** → sign up at posthog.com → choose **US cloud** region → confirm $0 free tier ($0/mo, 1M events/mo cap).
2. **Create project** `studio-zero`. Copy project API key. Wire to Vercel env as `NEXT_PUBLIC_POSTHOG_KEY` (Production + Preview).
3. **Issue Personal API Key** → Account → Personal API Keys → scope `project:read`, `events:write` → save as GitHub Actions secret `POSTHOG_PERSONAL_API_KEY` for any future event-import scripts.
4. **Generate salt** → `openssl rand -hex 32` → save to Vercel env as `POSTHOG_TENANT_SALT` (production target only; preview uses a different salt).
5. **Wire SDK at M1** when Forge does the consent-gate + lazy import. PR includes `apps/web/lib/posthog.ts` + page-level identify in `apps/web/app/(authed)/layout.tsx`.
6. **Verify consent gate** before any event fires — Verify writes `tests/acceptance/e2e/consent-gate.spec.ts` at M1 exit.

## Cost trajectory

| Month                          | Plan                                   | Why                                    |
| ------------------------------ | -------------------------------------- | -------------------------------------- |
| M0–M5                          | Free $0                                | 1M events/mo includes; we're far under |
| M5+ (if user count grows fast) | Paid scaling at $0.0001/event after 1M | Triggers when MAU > ~2000              |

## Drift-check protocol

Weekly (Mon): Lens (or Jo) checks PostHog dashboard:

- Active project count = 1
- Event volume below 1M/mo (free tier)
- No PII leaks in event properties (random spot-check on `audit_completed` events)
- Quarterly: rotate `POSTHOG_TENANT_SALT` per Cipher Fix-4 cadence

## Cross-references

- `agents/growth/lens.md` (instrumentation spec)
- `architecture/threat-model.md` Cipher B5 (PII scrub; PostHog parallel to Sentry)
- PRD §13.6 (consent-gated analytics)
- PRD §14.5 (cookie consent UX)
- `architecture/iac/secrets/vault-keys.md` (POSTHOG_TENANT_SALT)
- `finance/unit-economics.md` §0 (PostHog pricing $0 at MVP)

---

_Terra · PostHog · M0 manual-bootstrap notes._
