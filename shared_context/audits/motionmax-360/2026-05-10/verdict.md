# Audit Verdict — motionmax-360 — 2026-05-10

> Synthesized by Jury from 6 core reviewer reports (Optic, Proof, Halo, Compass, Trace, Canon) + 28 specialist reports covering all 14 categories of `360assessment.md`. Convergence between core reviewer and specialist on the same artifact has elevated risk per the Jury rubric — overlapping evidence is treated as confirmation, not duplication.

## 1. Verdict

**Result:** `FAIL`

**One-line summary for Jo:** The bones are solid — Stripe webhook hardening, RLS scaffolding, structured logging, AES-GCM key encryption, autopost dispatcher, transient-retry classifier — but the surface is unfinished and the legal/security/branding floor is below what a paid US-first launch can stand on. Do not ship to paying customers in this state.

**Audience this was scored against:** Tool-savvy creative adults (content creators, marketers, video producers — comfortable with CapCut/Descript/Canva tier). Mobile-heavy. US-first launch. 11 languages claimed. Secondary persona: small-team marketers and L&D authors. Explicitly NOT developers, NOT seniors, NOT children, NOT enterprise procurement.

**Project state at audit:** `C:\Users\Administrator\motionmax` HEAD as of 2026-05-10. Static analysis only — no live build, no staging URL, no production telemetry. Findings cite file:line; runtime claims are flagged where verification was not possible.

**v1 audit remediation note:** Per BigBrain's brief, `B-1`, `B-2`, `B-3`, `B-4` from the v1 audit have been remediated in source (file diffs tagged `B-X fix (2026-05-09)`). They are listed as **`v1-CARRYOVER — needs re-verification`** below; the originating reviewer must re-check each before close. `B-5` from v1 is still pending.

---

## 2. Scorecard

Audience-relative, 1-5. Five = ready to ship for this audience; one = unacceptable.

| Reviewer | Score | Headline finding | Open Critical | Open Blocker |
|---|---|---|---|---|
| Optic (UX/UI heuristics) | **2** | Storytelling remnants in landing/SEO/auth + autopost ships off-brand `#11C4D0` aqua + 112 red/destructive occurrences across 40 files + `100vh` on iOS | 7 | 3 |
| Proof (content & wording) | **2** | Plan names diverge across 4 customer surfaces; "2,400+ marketers" is fabricated with TODO; "11 languages" claimed with zero i18n indirection | 4 | 0 |
| Halo (accessibility) | **2** | `--destructive` mapped to brand gold collapses error/highlight signaling (color-only signal); no AT progress on multi-minute generation; `<html lang>` hardcoded English; no `<track>` captions on in-app `<video>` | 3 | 0 |
| Compass (audience alignment) | **2** | "11 Languages" UI promise has no i18n; voice catalog actually ships only 4-5 of 11 claimed languages; testimonials are fabricated personas | 2 | 0 |
| Trace (flow & logic) | **2** | Editor `saveStatus` hardcoded `'saved'` (silent data loss); kickoff probe exhaustion → silent dead-end; account deletion lacks reauth + confirmation email | 5 | 0 |
| Canon (visual consistency) | **1** | Voice Lab speaker gradients ship red/green/orange in 9 of 17 accents; transactional emails ship `#F5B049` template orange CTA; admin shell ships `#5CD68D` green and `#a78bfa` purple as first-class tokens; two competing aquas (`#11C4D0` global vs `#14C8CC` shells) | 6 | 0 |

**Total Critical (across core reviewers):** 27
**Total Blocker (across core reviewers):** 3 (all from Optic)
**Total Critical (across 28 specialists):** 50+
**Total Blocker (across 28 specialists):** 30+

**Verdict cannot promote from `PASS WITH FIXES` to `PASS` — and cannot promote from `FAIL` to `PASS WITH FIXES` — until every Blocker is closed and verified by the originating reviewer.**

---

## 3. Punch List (severity-sorted, grouped by 14-category mapping)

> Severity rubric (per `agents/audit/jury.md`):
> - **Blocker** — ships nothing until fixed (legal, security, broken core flow)
> - **Critical** — fix before launch (significant audience exclusion, data loss, brand damage)
> - **Major** — fix before next release (clear friction, comprehension failure)
> - **Minor** — fix when convenient (polish, edge cases)
> - **Polish** — optional improvement
>
> Convergence (multiple reviewers on same artifact) raises severity per Jury rule. Each entry cites the originating report; full evidence is in the reviewer file.

### Blockers (must close before any paid US launch)

| ID | Category | Reviewers | Finding | Owner | Re-audit |
|---|---|---|---|---|---|
| B-V1-1 | §1 / §4 | Optic 1.1 + Compass 1.2 + Canon 13 + Proof F-07 + Arch C-A2 + Stream C-4 + Trace + Hook C1 + Herald + Flow + Signal S-M3 | "Visual Stories" landing card + storytelling SEO/keywords/SpeakerSelector/llms.txt/worker handler/edge function remnants advertise a removed product **(v1-CARRYOVER — needs re-verification)** | Vega + Forge + Signal | Optic + Proof |
| B-V1-2 | §1 | Optic 1.4 + Compass 1.3 + Canon 7 + Pixel 1.C3 + Canvas F-002 + Hook B2 | Brand-color drift across landing (`#0D99A8`/`#D4A929`), autopost lab (`#11C4D0` not `#14C8CC`), v2 announcement modal (`#F5B049` orange + `#5CD68D` green pulse), email CTA (`#F5B049`), admin shell (`#5CD68D` good, `#a78bfa` purple), site-wide red 112 hits in 40 files **(v1-CARRYOVER — needs re-verification)** | Vega + Pixel | Canon + Optic |
| B-V1-3 | §2 / §13 | Optic 1.3 + Proof F-03 + Hook B2 + Compass 2.1 + Herald + Comply | Fabricated "2,400+ marketers/creators" social proof shipped with `// TODO: replace with real figure` comment; "Trusted by creators worldwide" with no proof asset; FTC §5 deceptive-advertising risk **(v1-CARRYOVER — needs re-verification)** | Sprint + Pixel | Proof + Compass |
| B-V1-4 | §1 / §5 | Optic 5.1 + Compass 1.4 + Trace + Prism PERF-026 | `100vh` (not `100dvh`) on iOS-facing surfaces in 6 files — viewport jump under address bar **(v1-CARRYOVER — needs re-verification)** | Vega | Optic |
| B-V1-5 | §13 | Comply L-B-05 + Tongue TONGUE-16 (still pending from v1) | EU 14-day cooling-off waiver not collected at point of sale; Directive 2011/83/EU Art. 16(m) requires explicit checkbox at execution, not ToS body — every EU paid user can claw back first 14 days of charges **(v1-pending — NOT remediated)** | Forge + Comply | Comply |
| B-NEW-1 | §6 / §13 | Cipher B2/B3 + Atlas F-D1/F-D2 | `scene-images` bucket grants `anon` SELECT + INSERT (100 MB cap); `videos` bucket public + `anon` INSERT (500 MB cap); plaintext OAuth refresh tokens for YouTube/Instagram/TikTok in `autopost_social_accounts.access_token`; plaintext user AI provider keys in `user_api_keys` | Forge | Shield + Cipher |
| B-NEW-2 | §6 | Shield S-001 + Pipeline C-2/C-3 + Cipher C3 | No production CSP / HSTS / X-Frame-Options / X-Content-Type-Options / Referrer-Policy / Permissions-Policy headers shipped with required directives. CSP missing `base-uri 'self'`, `object-src 'none'`, `upgrade-insecure-requests`, `report-uri`. Combined with `localStorage` JWT (Cipher S-002) → any reflected XSS = full account takeover with stored Stripe payment methods | Pipeline + Forge | Shield |
| B-NEW-3 | §6 | Shield S-003 | CORS allowlist hard-codes `http://localhost:8080` and `:5173` for production functions — DNS-rebinding / localhost-malware can issue credentialed cross-origin reads against production user data | Forge | Shield |
| B-NEW-4 | §6 | Verify V-001/V-002/V-003/V-004 | CI security audit gate failing: 5 HIGH CVEs in root (postcss XSS, vite/serialize-javascript RCE, fast-uri, esbuild SSRF, babel codegen), 1 HIGH CVE in marketing (astro reflected XSS GHSA-wrwg-2hg8-v723), 6 moderate in worker including direct `uuid 11.0.x` CVE | Pipeline | Verify |
| B-NEW-5 | §6 / §14 | Verify V-005 + Pipeline B-1/B-2/B-3/B-4 | (a) every CI action uses floating tags, no SHA pinning (SLSA L1 violation, supply-chain hijack vector); (b) `supabase functions deploy --no-verify-jwt` ships every Edge Function with platform JWT verification disabled including `delete-account`, `manage-api-keys`, `admin-force-signout`, `admin-hard-delete-user`; (c) failing CI does not block Vercel production deploy (no required-status-check); (d) Render deploy fire-and-forget with no health verification or rollback; (e) DB migrations + edge functions deploy with no rollback safety on partial failure | Pipeline | Pipeline + Shield |
| B-NEW-6 | §7 / §13 | Keeper KEEPER-01/02/03/04 | (a) GDPR Art. 20 export endpoint fully built but no UI surface; (b) two competing deletion crons — older one wins the race and skips storage/ElevenLabs/Stripe cleanup — orphans on every account deletion; (c) `deletion_requests` cascades on `auth.users` deletion, destroying the audit row that proves deletion happened (Art. 30 record-of-processing gap); (d) `profiles.deleted_at` soft-delete not enforced in app reads (only one admin tab filters) | Forge + Vega | Keeper + Comply |
| B-NEW-7 | §11 | Lens B1/B2/B3 | (a) Marketing Astro site ships zero analytics — funnel cannot start where paid ads land; (b) UTMs lost across marketing→app handoff; (c) no `gtag('config', { user_id })` identify call on signup/login — anonymous→authenticated identity is broken | Signal + Vega | Lens |
| B-NEW-8 | §11 / §13 | Herald (lifecycle gap × 3) + Comply L-C-01 | (a) No onboarding drip beyond day-0 welcome (no day-1/day-3/day-7/day-14); (b) no win-back / dormant re-engagement; (c) no branded purchase-receipt email (relies on Stripe's unbranded default); (d) no DMCA Designated Agent registered with U.S. Copyright Office — every user upload uninsured under §512(c)(2) safe harbor | Herald + Comply | Herald + Comply |
| B-NEW-9 | §13 | Tongue TONGUE-09 + Comply L-C-05 | Cookie consent UI not GDPR/ePrivacy compliant: binary Accept/Reject, no granular per-category toggle, no policy version stamp, no in-product withdrawal mechanism (Settings has no cookie controls), no "Manage preferences" link in any footer. CNIL/Garante explicitly cited similar designs as fineable | Vega + Comply | Comply |
| B-NEW-10 | §13 | Tongue TONGUE-10 | Marketing Astro site has no cookie banner at all — EU visitors tracked by GA on the marketing landing without consent before they ever reach the React app | Vega + Comply | Comply |
| B-NEW-11 | §13 | Tongue TONGUE-01 + Compass 1.1 + Halo F-A11Y-006 + Proof F-25 + Signal S-C5 | "11 languages" / "Multi-Language" marketing claim is unsupported by code: zero i18n runtime (no `react-i18next`, `next-intl`, no `messages/*`), all UI strings are hard-coded English JSX, `<html lang="en">` hardcoded, hreflang only declares `en`. UCPD Art. 6 / FTC §5 deceptive-claim risk | Vega + Tongue | Tongue + Compass + Halo |
| B-NEW-12 | §13 | Comply L-B-01 + Tongue TONGUE-12 | EU AI Act Art. 50 transparency: visible "AI-generated" watermark gated on subscription tier (paid users ship with no mark); zero machine-readable provenance (no C2PA, no XMP `xmpDM:isAI=true`); disclosure missing from `PublicShare.tsx` and exported MP4s. Art. 50 obligations apply 2026-08 | Forge + Comply | Comply |
| B-NEW-13 | §13 | Comply L-B-02 | Terms of Service is unversioned ("Last updated: February 2026"); signup binds wrong version; no per-document version stamp persisted on `profiles` for Privacy/Terms/AUP — material amendments unenforceable against existing users (UCTD Directive 93/13/EEC) | Forge + Comply | Comply |
| B-NEW-14 | §13 | Comply L-B-03 | Privacy Policy promises "AI training opt-in (if you explicitly enable it)" UI; zero implementation in code, no Settings toggle, no `profiles` column. False statement = strict-liability FTC §5 risk | Forge + Vega + Comply | Comply |
| B-NEW-15 | §13 | Comply L-B-04 | No EU/UK Article 27 representative listed; mandatory under GDPR Art. 27 for non-EU controllers offering services to EEA/UK data subjects | Comply | Comply |
| B-NEW-16 | §6 | Cipher B1 + Verify (history) | Original Supabase project anon JWT (project ref `hesnceozbedzrgvylqrm`, exp year 2036) is permanently in git history at commit `b9148c1:.env`; rotation or project-deletion not confirmed | Forge + Cipher | Cipher |
| B-NEW-17 | §8 | Terra F1/F2/F3/F4 | (a) `iac/cloudflare`, `iac/supabase`, `iac/vercel` directories are empty placeholders — zero actual IaC; (b) hard-coded production Supabase ref blocks any staging environment; (c) two conflicting worker deploy manifests (`render.yaml` + `railway.json` + `railpack.json`); (d) CI deploys straight to prod with no staging gate, no canary, no manual approval | Pipeline + Forge | Terra |
| B-NEW-18 | §8 | Crash CRASH-001 + Forge F-CH-02 + Stream C-2 | `claim_pending_job` runs O(N) correlated subqueries per pending row — quadratic queue cost; combined with stale-claim reaper (30 min) shorter than `cinematic_video` runtime (45 min) → duplicate Hypereal renders + double-spend documented as 2026-05-08 incident pattern | Forge | Crash + Forge |
| B-NEW-19 | §9 | Watch B1/B2/B3 + Siren B1/B2/B3/B4 | (a) Worker Sentry has zero PII scrubbing (no `beforeSend`); (b) 9 Edge Functions ship Sentry without `beforeSend` — Stripe payloads (last4, customer email, fingerprint) leak on every error; (c) no on-call rotation, escalation policy, or paging integration exists in code or scheduler; (d) BetterStack monitors documented as setup-instructions, not provisioned; (e) Sentry alert rules exist as JSDoc comments only, not configured; (f) no third-party-outage runbooks (Stripe/OpenRouter/Supabase/ElevenLabs/Hypereal) — five most likely outage causes have no response procedure | Pipeline + Watch + Siren | Watch + Siren |
| B-NEW-20 | §10 | Probe F-10-01/02/03/04/05 | (a) CI runs no E2E and deploy doesn't depend on E2E; (b) E2E config has no `webServer`, no test-Supabase isolation — sign-up tests pollute prod backend; (c) refund-credits test asserts against a mirrored copy of `refundCreditsOnFailure`, not the real function; (d) Stripe webhook test exercises a "handler factory" mirror, not deployed `index.ts`; (e) zero tests on every revenue and account-deletion edge function (`delete-account`, `export-my-data`, `create-checkout`, `customer-portal`, all 25+ untested) | Probe + Forge | Probe |
| B-NEW-21 | §8 | Meter B1 | Creator plan economics mathematically cannot deliver headline product: 500 cr/mo cap < 750 cr cinematic short. Top-up math = $7.50 user revenue against $11.30 provider cost = **negative ~$3.80 contribution per cinematic short** | Sprint + Forge + Meter | Meter |

### Critical (fix before launch)

> ~50 Critical findings across the 34 reports. Listing the highest-leverage and convergence-elevated below; full per-reviewer detail in `optic.md`, `proof.md`, `halo.md`, `compass.md`, `trace.md`, `canon.md`, and the 28 specialist files.

#### §1 — UI/UX & Design System

| ID | Reviewers | Finding | Owner | Re-audit |
|---|---|---|---|---|
| C-1-1 | Halo F-A11Y-001 + Canvas F-005 | `--destructive` HSL mapped to brand gold collapses error/highlight signaling — same color carries opposite meaning; gold on white measures ~1.6:1 (fails WCAG 1.4.3 AA 4.5:1 for normal text) | Vega + Pixel | Halo |
| C-1-2 | Halo F-A11Y-006 + Compass 1.1 + Tongue 02/03 + Signal S-C5 | `<html lang="en">` hardcoded; foreign-script labels in LanguageSelector announced phonetically by English voice-synthesizer (WCAG 3.1.2); hreflang lies against the 11-languages claim | Vega + Tongue | Halo + Compass |
| C-1-3 | Optic 2.1 + Hook C3 + Proof F-08 + Herald | "Watch Demo" CTA opens placeholder modal saying "Demo video coming soon" while a real Guidde walkthrough already exists embedded further down — trust-killing collapse on the secondary CTA | Vega | Optic |
| C-1-4 | Canon Critical-1 + Tongue 08 | Voice Lab speaker-flag gradients use raw red/green/orange in 9 of 17 accents (`#EF4444` UK, `#10B981` AU, `#F59E0B` ES, `#F97316` LATAM/NL, `#DC2626` RU/CN/HT, `#F472B6` JP) — direct brand-rule violation visible in Voice Lab | Vega | Canon |
| C-1-5 | Canon Critical-2 + Herald + Pixel 1.C3 | Email CTA gradient + body radial use template orange `#F5B049` in every transactional email (verification, reset, billing, support) — most-seen surface is off-brand | Forge + Pixel | Canon |
| C-1-6 | Canon Critical-3 + Pixel 1.C3 | v2 announcement modal ships template orange + green pulse `#5CD68D` — first authenticated touchpoint ships brand violations | Vega | Canon |
| C-1-7 | Canon Critical-4 + Canvas F-030 + Optic 1.10 | Admin shell defines `--good: #5CD68D` (green) and `--purple: #a78bfa` then consumes them across 13 files (TabUsers, TabGenerations, TabConsole, etc.) — direct brand violation in primary internal surface | Vega | Canon |
| C-1-8 | Canon Critical-5 | Marketing site `--destructive` token still resolves to red while in-app is gold — cross-surface drift between marketing.motionmax.io and `/app` | Signal + Vega | Canon |
| C-1-9 | Canon Critical-6 + Pixel 1.C1 + Canvas F-001 | Two different aquas in the same product: `#11C4D0` everywhere globally (HSL 184 85% 44%) vs `#14C8CC` in admin/billing/autopost shells — navigation crosses two aquas without warning | Pixel + Vega | Canon + Pixel |
| C-1-10 | Halo F-A11Y-022 | Multi-minute generation pipeline has no `aria-live` updates — screen-reader users start a 5+ minute generation and never get announced that it's running, what phase it's in, when it completes, or if it errors | Vega + Pixel | Halo |
| C-1-11 | Halo F-A11Y-015 | All in-app `<video>` elements lack `<track kind="captions">`. Captions are burned into video frames but Deaf/HoH creators can't verify or read them as text. WCAG 1.2.2 fail | Forge + Vega | Halo |
| C-1-12 | Pixel 1.B1/1.B2/1.B3/1.B4/1.B5 + Edge F3 + Prism PERF-001 | Four brand assets (`favicon.png`, `apple-touch-icon.png`, `og-image.png`, `momaxlogo.png`) are byte-identical 752 KB 2000×2000 PNGs. OG declared 1200×630 but actually square. No 512×512 maskable icon. Every browser tab, iOS home-screen pin, and social share is broken or wasteful | Pixel | Pixel |

#### §2 — Visitor → Customer Conversion

| ID | Reviewers | Finding | Owner | Re-audit |
|---|---|---|---|---|
| C-2-1 | Hook B1 | Pricing → Auth funnel silently drops `next` and `plan` query params; users who pick a paid plan never reach Stripe checkout — most expensive customer in the funnel gets dumped on `/app` | Vega + Forge | Hook |
| C-2-2 | Hook B3 + Comply (FTC) | "Creator plan: 47 people upgraded this week" hard-coded fake scarcity ribbon; manufactured-urgency dark pattern, FTC enforcement target | Vega | Hook |
| C-2-3 | Hook B4 | Manually-reset fake price-increase countdown (`PRICE_INCREASE_DATE = "2026-05-19"` with comment "Update this when you want to reset"); FTC v. WunderlandPress precedent | Vega | Hook |
| C-2-4 | Hook C2 | Free plan disappears from in-app `LandingPricing` (only Creator/Studio rendered) while marketing site shows three tiers — "Free to start" hero promise contradicts the pricing block four screens below | Vega | Hook |
| C-2-5 | Compass 2.1 + Herald + Hook C4 | "Testimonials" section contains zero real testimonials — three "quotes" attributed to role categories ("Content Creators", "Social Media Managers", "Learning & Development Teams") with no name, photo, company, or source | Vega + Pixel | Compass |

#### §3 — Process & Flow Consistency

| ID | Reviewers | Finding | Owner | Re-audit |
|---|---|---|---|---|
| C-3-1 | Trace + Flow + Ghost G-Mi2 | Editor `saveStatus` hardcoded `'saved'` (`Editor.tsx:334`) — silent data-loss; perpetually green chip across the editing surface | Forge + Vega | Trace |
| C-3-2 | Trace + Flow | Editor kickoff probe (`Editor.tsx:188-256`) exhausts 60s budget with no terminal failure UI — user sits on 2% awaiting overlay forever; the brand's modal network condition (mobile flaky LTE) is the worst-case for this code path | Forge + Vega | Trace |
| C-3-3 | Trace + Flow | "Project not found" page only routes to `/dashboard-new` — no Browse Projects link, no support escape, no project ID surfaced; creators routinely share project links across devices | Vega | Trace |
| C-3-4 | Trace + Flow | Editor error-views use raw hex `#14C8CC` literals instead of design tokens — flow-level theme changes don't propagate, brand drift will recur | Vega | Trace |
| C-3-5 | Trace | Account deletion (`Settings.tsx:212-231`) has no reauth, no confirmation email — logged-in attacker / shared device can schedule a 7-day-fuse deletion with no out-of-band signal to the user | Forge + Vega | Trace |
| C-3-6 | Compass 3.1 + Proof F-05 | Voice catalog ships voices for 4-5 of 11 claimed languages; Russian/Chinese/Japanese/Korean explicitly unimplemented (`SpeakerSelector.tsx:214` comment); German + Italian explicitly retired — claim-vs-build gap surfaces inside the product after signup | Forge + Vega | Compass |

#### §4 — Code Health & Redundancy

| ID | Reviewers | Finding | Owner | Re-audit |
|---|---|---|---|---|
| C-4-1 | Arch C-A1 | 11 legacy admin components (~6,498 LOC: AdminLogs, AdminGenerations, AdminOverview, AdminApiCalls, AdminFlags, AdminPerformanceMetrics, AdminQueueMonitor, AdminRevenue, AdminSubscribers, AdminUserDetails, AdminWorkerHealth) exist unimported — confuses readers, drifts | Arch + Vega | Arch |
| C-4-2 | Arch C-A3 | `supabase/functions/generate-video/index.ts` is a 5,530-line god-file housing validation, moderation, prompt assembly, character bible, storytelling remnants, and pipeline orchestration in one file | Forge | Arch |
| C-4-3 | Arch C-A4 | `worker/src/index.ts` is 1,603 lines centralizing dispatch + retry + every handler hookup — merge-conflict surface for parallel-agent workflow | Forge | Arch |

#### §5 — Performance / Mobile Readiness

| ID | Reviewers | Finding | Owner | Re-audit |
|---|---|---|---|---|
| C-5-1 | Prism PERF-002 + Edge F12 | 15+ Google Fonts loaded as render-blocking stylesheet on `/` (Inter, Montserrat, Bebas Neue, Poppins, Bangers, Comfortaa, Oswald, Pangolin, Flavors, Chango, Luckiest Guy, Vina Sans, Special Elite, Rubik Mono One, Pacifico, Instrument Serif, JetBrains Mono); 13 of those are caption decoratives only used inside the gated CreateNew/Editor flow | Vega + Pixel | Prism |
| C-5-2 | Prism PERF-003 | Single style-preview PNG `cardboard-preview.png` is 1.8 MB; all 17 PNGs statically imported into the same chunk via `StyleSelector.tsx:13-29` — opening intake dialog on mobile pays ~3.2 MB just for the picker thumbnails | Vega | Prism |
| C-5-3 | Prism PERF-004 + Edge F5 | `mmbg.svg` is 1.9 MB — almost certainly base64-embedded raster | Pixel + Vega | Prism |
| C-5-4 | Prism PERF-005 + Edge F4 | `herobackground.png` 2.4 MB and `caption.png` 2.2 MB ship to all clients despite WebP variants existing; PWA precache pulls all of it (~9 MB on first install) | Pixel + Vega | Prism + Edge |
| C-5-5 | Prism PERF-009 | `framer-motion` (168 KB vendor chunk) loaded for landing's fade-in animations that `@keyframes fadeIn` would solve in 200 bytes | Vega | Prism |
| C-5-6 | Prism PERF-010 | Dashboard fan-out: 9 independent `useQuery` calls on first paint, plus 60s/10s polling that doesn't pause when tab is backgrounded — dashboard LCP gated by slowest of 9 queries; CLS likely 0.15-0.25 from skeleton-to-content swaps in 4 quadrants | Vega + Forge | Prism |
| C-5-7 | Prism PERF-011 | `IntakeForm.tsx` is 1,571 lines in a single chunk; no React.lazy step splitting | Vega | Prism |
| C-5-8 | Edge F6 | Service Worker `supabase-api` runtime cache silently caches user-scoped REST/Auth GET responses for 5 minutes — privacy/auth risk on shared devices and after logout | Forge + Vega | Edge + Shield |
| C-5-9 | Edge F7 | Service Worker `supabase-thumbnails` cache (24h CacheFirst) on 5-min-signed Storage URLs causes broken-image flashes after URL expiry and serves deleted assets post-account-deletion | Vega | Edge |

#### §6 — Security & Encryption

> See Blockers B-NEW-1 through B-NEW-6 and B-NEW-16 above. Additional Critical:

| ID | Reviewers | Finding | Owner | Re-audit |
|---|---|---|---|---|
| C-6-1 | Shield S-002 | Supabase session JWT in `localStorage` with no compensating CSP — any reflected XSS = account takeover with stored payment methods | Forge + Vega | Shield |
| C-6-2 | Shield S-006 | `serve-media` IDOR uses `filePath.includes(user.id)` substring match instead of `startsWith(user.id + "/")`; `Content-Disposition` filename built from URL without escaping — CRLF/quote-injection vector | Forge | Shield |
| C-6-3 | Shield S-007 + Trace + Ghost G-M2 | Auth lockout (`Auth.tsx:24-25, 103-104`) is in-memory React state; F5 / new tab resets the counter — credential-stuffing trivially defeats the 5-attempt / 30-second lockout. Checklist requires 15 min server-side | Forge | Shield |
| C-6-4 | Shield S-008 | Admin role check (`admin-stats/index.ts:74-87`) is single-table SELECT with no MFA; admin audit-log inserts are fire-and-forget `.catch(() => {})` — single XSS or stolen admin device = full system control with no MFA backstop and no reliable audit trail | Forge | Shield |
| C-6-5 | Shield S-009 + Atlas | Six `SECURITY DEFINER` functions in migrations lack `SET search_path = public, pg_temp` — Postgres privilege-escalation footgun (function_search_path_mutable lint rule) | Forge | Shield |
| C-6-6 | Cipher C3 + Pipeline C-2 | CSP allows `'unsafe-inline'` in `style-src` — CSS-exfiltration of authenticated DOM via attribute-selector tricks | Pipeline + Vega | Cipher |
| C-6-7 | Cipher C1 | Worker `/health` endpoint emits PID + Node version + hostname + memory + active job counts to any caller with `Access-Control-Allow-Origin: *` | Forge | Cipher |
| C-6-8 | Cipher C2 | Worker `/metrics` Bearer compare uses `!==` (non-constant-time) instead of `crypto.timingSafeEqual` | Forge | Cipher |
| C-6-9 | Atlas F-D9 | `worker_anon_access` migration shipped permissive `USING(true)` policies live for ~48h on `video_generation_jobs` (2026-03-08 to 2026-03-10); historical exposure window needs incident-history review | Forge + Atlas | Atlas |
| C-6-10 | Atlas F-D10 | Right-to-erasure cleanup may leave orphans on `subscriptions`/`user_credits`/`user_api_keys` for accounts deleted before the 2026-04-04 retroactive FK migration | Forge + Atlas | Atlas |

#### §7 — Data Layer Integrity

| ID | Reviewers | Finding | Owner | Re-audit |
|---|---|---|---|---|
| C-7-1 | Atlas F-D3 | `video_generation_jobs.project_id` demoted to NULLABLE without a CHECK; conflates "script-phase legitimately null" with "deleted-project orphan" | Forge + Atlas | Atlas |
| C-7-2 | Atlas F-D4 | FK constraints missing on `user_flags.user_id`/`flagged_by`/`resolved_by`, `admin_logs.admin_id`, `generation_archives.user_id` — orphan-record risk on user deletion, audit-log integrity gap | Forge + Atlas | Atlas |
| C-7-3 | Atlas F-D13 | FK `video_generation_jobs.user_id` index never confirmed created — every authenticated read against the table runs RLS predicate `user_id = auth.uid()` as sequential scan; user-visible perf cliff at ~10k jobs/day | Forge | Atlas |
| C-7-4 | Atlas F-D17 | Admin overview page (`adminDirectQueries.ts:44-49`) does unbounded `SELECT *` on `subscriptions` and `user_flags` table-wide on every page load — 5 MB transfer at 10k subs, 50 MB at 100k | Forge | Atlas |
| C-7-5 | Stream C-1 | Pipeline-progress channel (`unifiedPipeline.ts:199-208`) subscribes to all UPDATEs on `video_generation_jobs` with no filter — every active client receives every other user's job updates over the wire | Forge | Stream |
| C-7-6 | Stream C-3 | `readCheckpoint` (`worker/src/lib/checkpoint.ts:24-40`) returns empty `{}` on any DB error → guaranteed Hypereal double-submit on transient Postgres hiccup | Forge | Stream + Forge |
| C-7-7 | Forge F-CH-01 | `Promise.race` hard-timeout (`worker/src/index.ts:1097-1120`) doesn't abort underlying work — when timeout fires, refund issues + handler keeps running and eventually marks `completed` on a row already marked `failed` and refunded | Forge | Forge |
| C-7-8 | Forge F-CH-03 | uncaughtException/unhandledRejection handlers terminally fail resumable jobs (`cinematic_video` checkpoints exist for resume) instead of releasing them to `pending` | Forge | Forge |
| C-7-9 | Forge F-CH-05 | `withTransientRetry` is a silent no-op for autopost orchestrator — second attempt hits idempotence gate at `progress_pct > 0` and immediately fails terminally | Forge | Forge |
| C-7-10 | Forge F-DI-01 | `setRunProgress(runId, 5)` writes BEFORE `projects.insert` — failed insert leaves run permanently unrecoverable (idempotence gate refuses retry) | Forge | Forge |
| C-7-11 | Forge F-DI-02 | Worker `update` calls don't filter by `worker_id` on completion/failure — sibling-replica clobber when stale-claim reaper resets a row mid-execution | Forge | Forge |
| C-7-12 | Ghost G-C1/G-C2 | `useExport.startExport` and `IntakeForm.handleGenerate` have no synchronous lock — Enter-mash or two-tab submission inserts duplicate `projects` rows + double-charges credits via upfront edge-function deduction | Vega + Forge | Ghost |
| C-7-13 | Ghost G-C3 | Stripe webhook `invoice.paid` (subscription renewal credits) handler has no per-invoice idempotency check — two parallel deliveries grant 2× monthly credits silently | Forge | Ghost |
| C-7-14 | Ghost G-C5 | Cross-tab debounce on image/video regen is in-memory `useRef<Map>` per hook — two tabs both pass local debounce, both insert `regenerate_image` jobs, two Hypereal calls billed for one visible result | Forge | Ghost |
| C-7-15 | Ghost G-C6 | User-initiated cancel forfeits credits AND races worker — Cancel within ~1s of upload completion shows BOTH "Cancelled" and "Export ready" toasts | Forge | Ghost |
| C-7-16 | Forge F-DI-03 | Hypereal API responses cast to `any` everywhere (8+ sites in `hypereal.ts`); HTML 200 response (auth/CDN error pages) crashes JSON.parse with cryptic `SyntaxError` not classified by `withTransientRetry` | Forge | Forge |

#### §8 — Infrastructure & Scaling

> See Blockers B-NEW-17, B-NEW-18, B-NEW-21 above. Additional Critical:

| ID | Reviewers | Finding | Owner | Re-audit |
|---|---|---|---|---|
| C-8-1 | Crash CRASH-002 | Hypereal fleet-wide concurrency uncoordinated — 8 instances × `HYPEREAL_MAX_CONCURRENT=10` = 80 simultaneous Hypereal requests on one API key; fleet expands at exactly the moment per-key rate ceiling matters most | Forge | Crash |
| C-8-2 | Crash CRASH-003 | OpenRouter 429 `Retry-After` not honored — the limiter doesn't yield to upstream backpressure; cited as the 2026-05-09 incident | Forge | Crash |
| C-8-3 | Crash CRASH-004 | Supabase pgbouncer pooler URL not enforced at worker startup — connection-exhaustion risk under launch load | Forge | Crash |
| C-8-4 | Crash CRASH-005 | `/health` endpoint queries the hot table on every Render probe — 16 hits/min/8-instance fleet on `video_generation_jobs`; DB blip = instance churn | Forge | Crash |
| C-8-5 | Meter C1 | All `writeApiLog` calls in worker hard-code `cost: 0` (37 sites across `audioASR.ts`, `openrouter.ts`, `qwen3TTS.ts`, `researchTopic.ts`, etc.) — `$/active-user`, `$/generated-video`, `$/audit-call` cannot be computed | Forge + Meter | Meter |
| C-8-6 | Meter C2 | `AUTOPOST_CREDITS_PER_RUN = 45` hardcoded + UI says "Per-run cost is a flat 45 credits — no surprises", but the active SQL function returns `CEIL(secs × mult)` = 75-1,800 credits per run — fraudulent UX even if unintentional | Forge + Meter | Meter |
| C-8-7 | Meter C3 | `generation_costs` table missing columns for Fish Audio, ElevenLabs, LemonFox, Smallest, OpenAI — half of provider spend currently rolled into wrong columns | Forge + Meter | Meter |
| C-8-8 | Meter C4 | `handleFinalize.ts` charges Qwen3 rate for audio that actually runs on Gemini Flash TTS / LemonFox / Fish per `audioRouter.ts` — recorded cost ≠ real cost on every generation | Forge | Meter |

#### §9 — Observability & Incident Readiness

> See Blocker B-NEW-19 above. Additional Critical:

| ID | Reviewers | Finding | Owner | Re-audit |
|---|---|---|---|---|
| C-9-1 | Watch C1 | PostHog listed in planned Privacy sub-processor list but NOT installed; either install or strike from privacy plan — shipping with named sub-processors you don't use is FTC/ICO finding waiting to happen | Vega + Comply | Watch |
| C-9-2 | Watch C3 | `tracesSampleRate: 0.1` on `stripe-webhook` (and worker overall) — 90% of failed billing requests have no distributed trace; when checkout fails and customer emails, repro is impossible | Forge | Watch |
| C-9-3 | Watch C4 + Siren B2 | No external synthetic uptime monitor configured (`/health` endpoints exist but nothing pings them); regional Supabase outage looks identical to "everything is fine" from the inside | Pipeline + DevOps | Watch |
| C-9-4 | Watch C5 + Siren C1 | No status page exists despite 11-language US-launch audience expecting one; in-app `support_system_status` is gated to authenticated users — unreachable when auth is the outage | DevOps + Vega | Watch + Siren |
| C-9-5 | Watch C6 | Marketing site (`marketing/`) has no Sentry instrumentation — failed marketing renders, broken CTAs, and 404s are invisible | Signal + DevOps | Watch |
| C-9-6 | Chronicle C1 | Trace-ID propagation is dead code — `src/lib/tracing.ts` `generateTraceId`, `attachTraceHeader`, `startGenerationTrace` have zero callers; FE→edge hop is broken; no `trace_id` column on `system_logs`; support cannot give a user a single reference ID | Forge + Vega | Chronicle |
| C-9-7 | Chronicle C2 | `api_call_logs` is unattributable — every LLM call inserts NULL `userId`/`generationId`/`cost` (37 sites in worker/services); per-user billing and abuse forensics impossible | Forge | Chronicle + Meter |
| C-9-8 | Chronicle C3 | Stripe webhook audit row written AFTER handlers commit and is best-effort — billing mutations can commit without an audit row (SOC 2 CC7.2 / PCI-DSS 10.2 violation) | Forge | Chronicle |
| C-9-9 | Chronicle C4 | Two retention crons race on `system_logs` with conflicting windows (90d migration vs 7d redefinition vs duplicate cron); documented retention ≠ actual retention; auditor finds the discrepancy | Forge + Comply | Chronicle |

#### §10 — Testing

> See Blocker B-NEW-20 above. Additional Critical:

| ID | Reviewers | Finding | Owner | Re-audit |
|---|---|---|---|---|
| C-10-1 | Probe F-10-06 | E2E pipeline is desktop-Chromium only despite mobile-heavy audience; brief lists 8 mobile breakpoints (320/375/390/414/428/768/1024/1280px) and explicit iOS/Android requirements | Probe | Probe |
| C-10-2 | Probe F-10-08 | Coverage threshold is 20%/15% AND `test:coverage` script is never run in CI — the laughable bar is unenforced | Probe + Pipeline | Probe |
| C-10-3 | Probe F-10-09 | Server-side paywall / plan-limit enforcement (worker `generateVideo`, edge `generate-cinematic`, `create-checkout`) has no tests; client-side guard tests exist but anyone can curl past them | Forge + Probe | Probe |
| C-10-4 | Probe F-10-10 + Stream C-2 | No tests for mid-generation crash recovery (worker restart mid-job, stranded-job reaper, refund-on-orphan) | Forge + Probe | Probe |
| C-10-5 | Crash CRASH-018 | No automated load test exists — production-readiness rests entirely on incident-driven hotfixes; the 2026-05-04/05/07/08/09 hotfix density in code comments shows the team is learning load behavior in production | Crash + Forge | Crash |

#### §11 — Analytics, Marketing, Growth

> See Blocker B-NEW-7, B-NEW-8 above. Additional Critical:

| ID | Reviewers | Finding | Owner | Re-audit |
|---|---|---|---|---|
| C-11-1 | Lens C1 | Admin dashboard funnel renders fake drop-off — first three rows ("Visited landing", "Started sign-up", "Completed sign-up") all hardcoded to `funnel.signups` with `pctOfTop: 100`; first three bars are always 100/100/100 regardless of actual data | Forge + Vega | Lens |
| C-11-2 | Lens C2 | No tracking on `generation_started` / `generation_completed` — the activation event in the funnel has zero GA4 visibility | Vega + Forge | Lens |
| C-11-3 | Lens C3 | Voice Lab + Autopost Lab have zero tracking; Lens cannot answer "what % of paying users use Voice Lab in week 1" | Vega | Lens |
| C-11-4 | Lens C4 | Server-side conversion uses `userId` as GA4 `client_id` — every purchase looks like "(direct) / (none)" with no UTMs; ROAS broken | Forge | Lens |
| C-11-5 | Lens C5 | Pre-consent events vanish silently (no buffer/queue) — user clicking CTA in first 1.5s before banner mounts loses the event | Vega | Lens |
| C-11-6 | Herald (lifecycle gap) + Comply L-C-09 | Auto-renewal disclosure in ToS only; no self-service cancel UI; FTC "Click to Cancel" rule (16 CFR Part 425) effective 2026 — cancellation must be at least as easy as signup, current path is email-only | Forge + Comply | Herald + Comply |

#### §12 — SEO & Discoverability

| ID | Reviewers | Finding | Owner | Re-audit |
|---|---|---|---|---|
| C-12-1 | Signal S-C1 | `dist/app-shell.html:17` ships hard-coded `<link rel="canonical" href="https://motionmax.io" />` — every SPA route inherits homepage canonical, collapsing `/pricing`, `/share/:token`, all SPA routes into `/` for indexing | Signal + Vega | Signal |
| C-12-2 | Signal S-C2 | `app-shell.html:10` ships `index, follow` for every authenticated route (admin/lab/dashboard-new/billing/usage) — Helmet noindex only fires after JS hydration; non-Googlebot crawlers leak | Vega | Signal |
| C-12-3 | Signal S-C3 | `robots.txt` blocks `/dashboard` (gone) but not `/dashboard-new`, `/lab`, `/billing`, `/unsubscribe` — internal pages indexable | Signal + Vega | Signal |
| C-12-4 | Signal S-C4 | `/pricing` has no description, no canonical override, no OG override — highest-intent transactional URL is unindexable | Vega | Signal |
| C-12-5 | Pixel 11.B1 + Signal S-M2 | Twitter/Facebook/LinkedIn/Slack share previews ship broken (OG image 2000×2000 vs declared 1200×630). No `VideoObject` JSON-LD on a video product — Google Video Search invisible | Pixel + Signal | Signal + Pixel |

#### §13 — Legal & Regulatory Compliance

> See Blockers B-V1-5, B-NEW-8, B-NEW-9, B-NEW-10, B-NEW-11, B-NEW-12, B-NEW-13, B-NEW-14, B-NEW-15 above. Additional Critical:

| ID | Reviewers | Finding | Owner | Re-audit |
|---|---|---|---|---|
| C-13-1 | Comply L-C-01 | No DMCA Designated Agent registered with U.S. Copyright Office; without the registration + on-site notice, every user upload is uninsured under §512(c)(2) safe harbor | Comply | Comply |
| C-13-2 | Comply L-C-02 | AUP §2 categorically bans "deepfakes" — but the product itself manufactures deepfakes (image-to-video + voice cloning); ToS §4 is correctly scoped, AUP is not. Self-contradicting AUP is unenforceable on its face | Comply | Comply |
| C-13-3 | Comply L-C-03 | Voice biometric data not classified as such in Privacy Policy; BIPA $1,000-$5,000-per-violation statutory damages risk. CCPA/CPRA "Sensitive Personal Information" disclosure missing | Comply | Comply |
| C-13-4 | Comply L-C-04 | Privacy Policy promises "delete personal data within 90 days" of account closure; code processes a 7-day grace + nightly cron — documented breach of the longer-stated commitment | Comply + Forge | Comply |
| C-13-5 | Comply L-C-06 | Subprocessor / DPA list gated to "enterprise customers" — GDPR Art. 28(2) requires availability to all customers; SCCs Module 2/3 Clause 9 grants data subjects the right | Comply | Comply |
| C-13-6 | Comply L-C-07 + Keeper KEEPER-01 | Self-service `export-my-data` Edge Function is fully implemented but never invoked from any UI; Privacy §8 promises portability via emailing support — Art. 12(2) facilitation gap | Vega | Keeper + Comply |
| C-13-7 | Comply L-C-08 | ToS §5 grants user ownership "subject to AI model licenses" but contains no warranty disclaimer for output non-infringement, no IP indemnification, no copyright-uncertainty disclaimer; post-Andersen v. Stability AI / Getty v. Stability AI exposure | Comply | Comply |
| C-13-8 | Tongue TONGUE-11 | Privacy Policy / ToS / AUP only in English while marketing claims 11 languages; GDPR Art. 12(1) "intelligible and easily accessible" + Directive 2011/83/EU CRD Art. 8 + member-state language laws (LG Berlin 16 O 64/22) | Tongue + Comply | Tongue + Comply |

#### §14 — Production Readiness

> See Blockers B-NEW-5, B-NEW-17, B-NEW-19, B-NEW-20 above.

### Major (fix before next release)

The 34 reports collectively log ~150+ Major findings. Routing them as a bundle to Sprint for next-release scope rather than re-listing here. High-leverage clusters:

- **§1 — `--text-tertiary` token explicitly fails WCAG 1.4.3 by design comment (Halo F-A11Y-002)**; Framer Motion ignores `prefers-reduced-motion` (Halo F-A11Y-003); brand "no orange" violated in user-facing warning components (Halo F-A11Y-004 + Compass 1.3); auth signup blocks submit on disabled button with no AT explanation (Halo F-A11Y-007); broken `aria-describedby` on login error (Halo F-A11Y-009); Sonner toasts may not announce to AT (Halo F-A11Y-010); Timeline transport has ARIA labels but no scene-change announcement (Halo F-A11Y-012); skip-link missing on authenticated layout (Halo F-A11Y-021); tertiary token contrast (Halo F-A11Y-002).
- **§2 — Conflicting "Most Popular" + "Best Value" badging neutralizes both (Hook M2)**; email-confirmation interstitial breaks TTFV (Hook M3); voice-cloning feature gating not visible until pricing page (Hook M4); no exit-intent capture (Hook M5); no Apple Sign-In / Magic Link on mobile-heavy iOS audience (Hook C7); intake form 1571-line monolith creates decision paralysis (Hook M9 + Arch M-A4 + Flow + Probe).
- **§4 — `projectUtils.ts` exists but ~14 callsites bypass it with inline `=== "smartflow" || === "smart-flow"` (Arch M-A1)**; hooks split across three folders with no rule (Arch M-A2); two competing Sidebar implementations (Arch M-A3); 26 TODO/FIXME with 17 in admin shipping copy (Arch M-A7); top-level repo pollution `clean.cjs`, `clean.py`, `clean-rest.cjs`, `fix_usage.py`, `archive/`, `tasks/`, `*.log` (Arch M-A8).
- **§5 — UserDrawer chunk 394 KB (Prism PERF-006)**; Tailwind CSS chunk 208 KB (Prism PERF-007); Lucide imported at 133 sites (Prism PERF-008); recharts loads 4 chart families simultaneously (Prism PERF-020); no Web Vitals reporting (Prism PERF-012); PWA precache size limit too permissive (Prism PERF-013); Lighthouse CI gate covers only `/admin` (Prism PERF-014); Editor active-jobs polls every 3s on top of realtime (Prism PERF-016); marketing dist duplicate hero PNGs (Prism PERF-021).
- **§6 — Worker `/health` Bearer compare non-constant-time (Cipher C2)**; CSP `'unsafe-inline'` style-src (Cipher C3); CSP allows `https://api.openai.com` connect-src for unused feature (Cipher C4); Sentry `sendDefaultPii` not explicitly disabled (Cipher M1); `vercel.json` rewrites hardcode prod Supabase ref (Cipher M2 + Terra F2); `audio` bucket grants `anon` UPDATE (Cipher M3); `manage-api-keys` legacy SHA-256 KDF kept indefinitely (Cipher M4); Stripe price/product IDs hardcoded with `??` fallbacks (Cipher M5); errors echo raw exception messages to clients (Shield S-004); no content-type validation before `req.json()` (Shield S-005); 6 SECURITY DEFINER functions missing search_path (Shield S-009); RLS toggle history (Shield S-010); update_scene_field anon grant pre-fix verification needed (Shield S-011); SSRF guard missing on worker URL fetchers (Shield S-021); `get-shared-project` mints 7-day signed URLs (Shield S-019); production secret-scan missing across git history (Shield S-012).
- **§7 — `subscriptions.plan_name` unconstrained TEXT (Atlas F-D6)**; `generations.status`/`projects.status` unconstrained (Atlas F-D7); FK indexes missing on `autopost_*` tables (Atlas F-D14); partial unindexed-FK sweep needed (Atlas F-D15); `generations` lacks `updated_at` + trigger (Atlas F-D8); admin user details does 9× `SELECT *` (Atlas F-D18); end-user pages still `SELECT *` (Atlas F-D19); Safari WebSocket recovery doesn't actually reopen channel (Stream M-1); editor doesn't detect in-flight export from another tab (Stream M-2); no connection-status badge outside admin (Stream M-3); refreshProgress not debounced (Stream M-4); no optimistic UI for scene edits (Stream M-5); worker REST broadcast has no retry/rate limit (Stream M-6); pollWorkerJob doesn't validate result row id matches (Stream M-7); mid-generation logout doesn't detach in-flight channels (Stream M-8); useExport polls every 30s but never re-attaches realtime channel on drop (Stream M-11); `master_audio` revival on stale-claim re-runs partially-completed external API (Ghost G-M5); referral code applyStoredReferralCode swallows all errors (Trace + Ghost G-M2 + Lens M3).
- **§8 — Render deploy fire-and-forget no rollback (Terra F8)**; worker autoscaling thresholds out of sync with platform reality (Terra F9); no connection pooler config declared (Terra F10); `ALERT_WEBHOOK_URL` declared but no IaC ensures it's set (Terra F11); committed `.env` files pinning prod Supabase URL (Terra F12); no storage lifecycle policy (Terra F13 + Keeper KEEPER-08); `region: oregon` contradicts DR doc claim of `us-east` (Terra F14); FFmpeg children not killed on graceful shutdown (Crash CRASH-006); export reaper races active export (Crash CRASH-007); auto-tuned LLM concurrency hard-caps at 8 even on bigger pods (Crash CRASH-008); Promise.race timeout leaks loser promise (Crash CRASH-009); background pollers compound DB load with no jitter (Crash CRASH-010); no backpressure between worker and Supabase Storage (Crash CRASH-011); _restartCount races between concurrent boots (Crash CRASH-012); storage growth uncapped (Crash CRASH-013 + Keeper KEEPER-08); no race-test for double-fire claim_pending_job (Crash CRASH-019); mid-generation crash recovery untested (Crash CRASH-020); `claim_video_job` unindexed FK columns (Atlas F-D13/14/15); `withTransientRetry` silent retry without idempotency = duplicate Resend emails / OpenRouter calls / Hypereal calls (Forge F-CH-10 + Ghost G-M11); refund idempotency check uses string-match on description (Forge F-CH-11); concurrency override clamp ignores actual memory ceiling (Forge F-CH-12); FFmpeg `drawtext` brand-mark filter injection vector (Forge F-PF-01); EXPORT_BATCH_SIZE=3 contradicts safety comment (Forge F-PF-02); no daily cost cap or anomaly alert (Meter M1); pricing model proposal vs implementation drift (Meter M2); free tier 0 monthly + 0 daily credits closes funnel (Meter M3); 6 unused TTS provider clients shipped (Meter M4); no CI cost-diff gate (Meter M5); no untagged-resource policy (Meter M6).
- **§9 — Sentry alert rules exist as comments, not code (Watch C2 + Siren B3)**; Stripe webhook delivery failures not alerted (Siren C3 + Watch M8); master-kill propagation lag 5s vs 60s contradiction across runbooks (Siren C4); single-instance worker with no failover documented (Siren C5); postmortem template too thin (Siren M1); comms templates English-only despite 11-language launch claim (Siren M2); no automated chaos / DR drill (Siren M3); /metrics public no auth (Siren M4); no AI provider cost-spike alerting (Siren M5); inconsistent Sentry instrumentation across edge functions (Siren M6); SLO/SLI definitions absent (Watch M1); `/metrics` Prometheus exposed but no scraper (Watch M2); queue-depth alert fire-and-forget (Watch M3); `allowUrls` excludes worker host (Watch M4); trace ID propagation broken end-to-end (Watch M5 + Chronicle C1); Render service-level alerting missing (Watch M6); `api_call_logs.error_message` not scrubbed (Watch M7 + Chronicle M-1/M-2); Stripe webhook signature failures lack routing tag (Watch M8); admin Performance dashboard requires admin login at 3am (Watch M9); /health probe uses service-role (Watch M10); admin_logs schema drift between two migrations (Chronicle M-4); Stripe audit row captures only `stripe_event_id` (Chronicle M-5); admin_logs no retention policy (Chronicle M-6); audit() lacks traceId (Chronicle M-7); double-reporting to Sentry via console + capture (Chronicle M-8); serve-media awaits log on hot path (Chronicle M-3); FE Sentry redaction shallow (Chronicle M-1).
- **§10 — Sign-up E2E pollutes real backend (Probe F-10-11)**; race / double-submit / mid-flow logout untested (Probe F-10-12 + Ghost cluster); no i18n / locale tests despite 11-language claim (Probe F-10-13); no storytelling-remnant guard test (Probe F-10-14); edge-function lint runs `deno check` only, no `deno test` (Probe F-10-15 + Pipeline); no a11y axe scans (Probe F-10-16); webhook idempotency missing-constraint not tested (Probe F-10-17); critical UI surfaces (Editor/Stage/Timeline/IntakeForm) have zero tests (Probe F-10-18).
- **§11 — `og:locale` declares `en_US` only despite multi-language claim (Compass 2.2)**; UTM `sessionStorage` lost across tabs (Lens m2); reset on signOut leaks identity (Lens M1); no tracking plan / event nomenclature doc (Lens M2); referral conversions not tracked (Lens M3); checkout opens new tab (Lens M4); `trackEvent` swallows errors silently (Lens M5); twitter handle inconsistency (Compass 11.1); `og:image` cache-bust pinned to old date (Compass 11.2); fonts loaded on landing (Edge F12); marketing dist duplicate (Edge F21); no SBOM (Verify V-013); no Renovate/Dependabot (Verify V-006 + Pipeline C-6); 8 Edge Functions import Sentry from unpinned URL (Verify V-007); worker `@sentry/node` floats `^8.0.0` (Verify V-008); single-maintainer `pdf-parse` (Verify V-009); single-maintainer `lovable-tagger` (Verify V-010); herald welcome subject too generic (Herald M); welcome email leaks Creator-plan upsell to free users (Herald M); payment-failed copy buries urgency (Herald M); cancellation copy lacks retention/feedback hooks (Herald M); inconsistent emoji vs Lucide icons across surfaces (Compass + Herald + Canon Major-11).
- **§12 — JSON-LD missing `aggregateRating`, `priceRange` (Signal S-M1)**; zero `VideoObject` structured data on a video product (Signal S-M2); www-vs-apex inconsistency (Signal S-M4); `Crawl-delay: 10` throttles young domain (Signal S-M5); CCBot blocked while GPTBot allowed (Signal S-M6); sitemap `lastmod` frozen at 2026-04-19 (Signal S-M7); visible hero heading is `<p>` not `<h1>` (Signal S-M8 + Halo F-A11Y-019); Help / FAQ trapped behind auth (Signal S-M9); Organization JSON-LD has no `contactPoint` (Signal S-M10).
- **§13 — Cookie banner copy too vague (Comply L-M-01)**; marketing privacy.astro version drift (Comply L-M-02 + Tongue); no cookie-policy artifact (Comply L-M-03); Sentry session-replay PII scrubbing not verified (Comply L-M-04); no Art. 22 automated-decision disclosure (Comply L-M-05); DSAR response timeline inconsistency 30 vs 45 days (Comply L-M-06); children's privacy COPPA threshold (Comply L-M-07); 11-language sales claim with English-only legal stack (Comply L-M-08 + Tongue); Stripe webhook retention 7 days too short for tax/financial (Comply L-M-09); watermark text ASCII only no provenance metadata (Comply L-M-10); robots.txt allows GPTBot on marketing (Comply L-M-11); DPF claim without verifying provider certification (Comply L-M-12); no California "Notice at Collection" / "Limit Use of SPI" (Comply L-M-13); no GPC handling (Tongue TONGUE-15); pricing in USD only, EU prices not VAT-inclusive (Tongue TONGUE-14); transactional emails English-only (Tongue TONGUE-13); `<html lang>` hardcoded with no per-locale switching (Tongue TONGUE-03); no RTL plumbing (Tongue TONGUE-04); hardcoded `en-US` date/currency formatters everywhere (Tongue TONGUE-05); worker injects `en-US` dates into AI prompts (Tongue TONGUE-06); `date-fns` installed but no per-locale loaders (Tongue TONGUE-07); voice flag colors violate brand (Tongue TONGUE-08).
- **§14 — Husky pre-commit only runs lint-staged (Pipeline M-5)**; no SAST / CodeQL / SBOM / secret scanning (Pipeline M-4); `release-checklist.md` "Per-vertical extras" not automated (Pipeline M-6); HSTS preload claimed but not submitted (Pipeline M-7); `npm audit` skips marketing (Pipeline M-8); Supabase CLI `version: latest` (Pipeline M-9); no staging environment in deploy pipeline (Pipeline M-2); Render deploy curl no timeout (Pipeline M-3); single-region deployment no failover (Terra F5).

### Minor & Polish

~80+ Minor and ~40+ Polish findings across the 34 reports. Captured in the originating reviewer files. Sprint should batch as next-release scope.

---

## 4. Routing & Next Steps

- [x] Blockers routed: 21 new Blockers (B-NEW-1 through B-NEW-21) plus 5 v1 carryovers. Owners + re-audit reviewer assigned in tables above. Deadline: pre-launch (recommend NLT 2026-06-30 for full remediation; cluster Critical brand + RLS + Stripe-idempotency + EU compliance fixes within 2 weeks).
- [x] Critical findings routed to layer leads with deadlines (~50 Critical, table above lists by category). Default deadline: pre-launch.
- [x] Major findings logged for Sprint's next-release queue (~150).
- [ ] Re-audit scheduled — only originating reviewers per studio rule. Each Blocker row names the re-audit reviewer.
- [x] Pipeline gate: this verdict file is at `shared_context/audits/motionmax-360/2026-05-10/verdict.md`. Result is `FAIL` — pipeline must NOT promote this build to production until the verdict promotes to `PASS WITH FIXES` (which itself requires every Blocker closed and re-verified) or `PASS`.
- [x] **v1 remediation re-verification**: B-V1-1, B-V1-2, B-V1-3, B-V1-4 are tagged `B-X fix (2026-05-09)` in source per BigBrain's brief. Originating reviewers must re-grep the cited files and confirm fixes hold. B-V1-5 is still pending and remains open.

---

## 5. Conflict Resolutions

| Conflict | Reviewers involved | Jury decision | Rationale |
|---|---|---|---|
| Brand color: keep aqua=`#11C4D0` (current global) or migrate to `#14C8CC` (brand spec, shells already use this) | Optic, Compass, Canon, Pixel, Canvas | **Side with the spec — `#14C8CC` everywhere** | Memory `feedback_motionmax_brand_gold.md` explicitly pins aqua at `#14C8CC`; the shells already use it; the global token drift is the bug. Per Jury rule "audience wins, not the reviewer" — the audience expects the brand spec, not the implementation |
| `--destructive` mapped to brand gold (deliberate per Optic/Canon brand-only rule) vs Halo's WCAG 1.4.3 / 1.4.1 failure | Optic, Canon, Halo | **Side with Halo — gold-as-destructive must pair with icon + text-bold** | The brand-only rule is correct; the implementation is wrong. Color must never be the sole signal (WCAG 1.4.1) and contrast must clear 4.5:1. The fix is icon-paired affordances + a `--destructive-strong` darker variant for text usage, not abandoning the brand rule |
| Storytelling product removal — surfaces with deprecated-product names | All reviewers (universal) | **Remove from public copy/SEO/voice descriptions; keep `EXPLAINER_TYPES = new Set(['doc2video', 'storytelling', 'explainer'])` legacy alias for back-compat with annotation | Trace correctly distinguishes: SEO meta + speaker-card subtitles + llms.txt are user-facing and must be stripped; the projects-gallery alias keeps legacy storytelling projects from disappearing for users who created them pre-removal |
| Optic wants emoji-to-Lucide migration on marketing site for brand consistency vs Compass concern that this is purely cosmetic | Optic, Compass, Canon | **Migrate to Lucide** | Audience is creative adults whose medium is visual consistency; emoji rendering varies per OS and breaks the sober brand voice. Cost is XS. Defaults to brand discipline |
| Hook wants to add Apple Sign-In + Magic Link (M effort) vs Probe wants to invest in test infrastructure first | Hook, Probe | **Both, in this order: tests first, then auth providers** | Probe's test gaps (fake Stripe webhook test, fake refund test) are a higher-priority safety net for paid launch; Hook's auth providers are a conversion lever that depends on a stable auth surface. Land tests first |
| Disagreement on whether i18n is shippable as scope reduction (Tongue option B) or i18n implementation (Tongue option A) | Tongue, Compass, Halo, Comply | **Scope reduction first** — relabel "11 voiceover languages" everywhere; ship localized legal pages (FR/DE/ES/IT/PT for Privacy/Terms/AUP) before claiming UI i18n | Marketing claim must match build today. Real UI i18n is a 6-12 week project that should not block a US-first launch. Voiceover is the actual capability; localize the legal stack to satisfy EU consumer law |

---

## 6. Reviewer Reports

Per-reviewer detailed findings are stored alongside this verdict in:

**Core reviewers:**
- `shared_context/audits/motionmax-360/2026-05-10/optic.md` — UX/UI heuristics
- `shared_context/audits/motionmax-360/2026-05-10/proof.md` — Content & wording
- `shared_context/audits/motionmax-360/2026-05-10/halo.md` — Accessibility
- `shared_context/audits/motionmax-360/2026-05-10/compass.md` — Audience alignment
- `shared_context/audits/motionmax-360/2026-05-10/trace.md` — Flow & logic
- `shared_context/audits/motionmax-360/2026-05-10/canon.md` — Visual consistency

**Specialist reviewers (28 — covering all 14 categories of `360assessment.md`):**
- `specialists/hook.md` — §2 Conversion Rate Optimization
- `specialists/arch.md` — §4 Code Health (architecture lens)
- `specialists/prism.md` — §5 Frontend Performance / Web Vitals
- `specialists/edge.md` — §5/§8 CDN, caching, asset delivery
- `specialists/shield.md` — §6 Application Security (OWASP A01-A10)
- `specialists/cipher.md` — §6 Cryptography & secrets
- `specialists/verify.md` — §6/§14 Supply chain & dependency security
- `specialists/atlas.md` — §7 Data layer (schema · RLS · indexes)
- `specialists/keeper.md` — §7/§13 Backups, retention, GDPR data
- `specialists/stream.md` — §7 Realtime + state consistency
- `specialists/terra.md` — §8 Cloud infrastructure & IaC
- `specialists/crash.md` — §8/§10 Load + scaling
- `specialists/meter.md` — §8 FinOps & cost engineering
- `specialists/watch.md` — §9 Observability
- `specialists/chronicle.md` — §9 Logging & audit
- `specialists/siren.md` — §9/§14 Incident response & on-call
- `specialists/probe.md` — §10 Testing coverage
- `specialists/ghost.md` — §10 Exploratory edge cases
- `specialists/lens.md` — §11 Analytics: funnel + events
- `specialists/herald.md` — §11 Lifecycle copy + email
- `specialists/signal.md` — §12 SEO (technical + on-page)
- `specialists/tongue.md` — §12/§13 Localization quality + per-region legal
- `specialists/comply.md` — §13 Legal — GDPR / CCPA / AI
- `specialists/pipeline.md` — §14 CI/CD + release
- `specialists/pixel.md` — §1/§11 Brand assets + social cards
- `specialists/canvas.md` — §1 Design system cross-cuts
- `specialists/flow.md` — §3 Design-time journey cross-reference
- `specialists/forge.md` — §4/§5/§7 Backend architecture & worker pipeline

This verdict file is the synthesized output. Reviewer files are the source of truth for individual findings. Where this verdict cites a finding ID (e.g. `Halo F-A11Y-001`, `Forge F-CH-01`, `Comply L-B-03`), open the relevant reviewer file to read the full file:line evidence and the prescribed fix.

---

## 7. Sign-off

- **Jury (synthesis):** 2026-05-10 — full panel of 6 core reviewers and 28 specialists synthesized into this verdict.
- **BigBrain acknowledgment:** _pending_
- **Jo's review:** required — verdict is `FAIL` per studio rule.

---

## Appendix — Coverage map across 360assessment.md categories

| Category | Coverage | Reviewers |
|---|---|---|
| §1 UI/UX & design system | Full | Optic, Halo, Canon, Pixel, Canvas, Flow |
| §2 Visitor → customer conversion | Full | Hook, Optic, Compass, Herald |
| §3 Process & flow consistency | Full | Trace, Flow, Optic |
| §4 Code health & redundancy | Full | Arch, Forge, Optic |
| §5 Performance / mobile readiness | Full | Prism, Edge, Optic, Compass, Forge |
| §6 Security & encryption | Full | Shield, Cipher, Verify, Atlas |
| §7 Data integrity / backups / cron / RLS | Full | Atlas, Keeper, Stream, Forge |
| §8 Infrastructure & scaling | Full | Terra, Crash, Meter |
| §9 Observability & incident readiness | Full | Watch, Chronicle, Siren, Trace |
| §10 Testing coverage | Full | Probe, Ghost, Crash |
| §11 Analytics / marketing / growth | Full | Lens, Herald, Hook, Compass |
| §12 SEO & discoverability | Full | Signal, Tongue, Pixel |
| §13 Legal & regulatory compliance | Full | Comply, Tongue, Keeper, Herald |
| §14 Production readiness | Full | Pipeline, Verify, Siren, Watch, Probe |

All 14 categories of the assessment have at least one core reviewer and one specialist. Convergence between core + specialist on the same artifact is treated as elevated risk per Jury rule and is reflected in severity of the punch list above.
