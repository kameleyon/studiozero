# Specialist Audit — Meter (FinOps & Cost Engineering)

**Project:** motionmax-360
**Date:** 2026-05-10
**Category:** §8 — Cost efficiency
**Audience-relative scoring:** tool-savvy creative adults; mobile-heavy; pre-launch SaaS economics

---

## Executive Summary

MotionMax cannot answer the most basic FinOps questions today: **what does an active user cost, what does a generated video cost, what does an autopost run actually cost the platform.** The instrumentation that would answer those questions is wired in shape only — `cost: 0` is hardcoded on **every** API-call log site in the worker (37 occurrences), and the `generation_costs` table aggregates an estimate computed at finalize from constants that no longer match the live provider mix. On top of that, the **Creator plan's 500 credits/month cannot fund a single Cinematic short (750 credits)** — a structural pricing failure that turns the headline product unsellable on the entry tier — and the **Autopost UI promises "flat 45 credits / no surprises" while the active SQL function deducts up to 1,800.** Until these are fixed, every other cost-cutting recommendation is speculation against unmeasured economics.

**Verdict on §8:** **FAIL** — cannot ship to paying customers in this state.

---

## Findings (sorted by severity)

### Blocker

**B1 — Creator plan economics mathematically cannot deliver the headline product.**
- Issue: `PLAN_LIMITS.creator.creditsPerMonth = 500` (`src/lib/planLimits.ts:58`) but `getCreditsRequired("cinematic", "short") = 150 * 5 = 750` (`src/lib/planLimits.ts:96-118`). A Creator-plan user paying $19/month cannot generate one cinematic short on their monthly allowance.
- Evidence: `src/lib/planLimits.ts:41-90` (plan caps), `src/lib/planLimits.ts:95-119` (credit formula). Free-plan offers `creditsPerMonth: 0` and `dailyFreeCredits: 0` (`src/lib/planLimits.ts:42-44`), so Free users cannot generate anything either.
- Provider unit cost for a 15-scene Cinematic short (from `worker/src/handlers/handleFinalize.ts:15-32`): 15 × $0.70 (Hypereal Kling I2V) + 15 × $0.04 (Hypereal image) + ~150 s × $0.001 (audio) + ASR + script ≈ **$11.30**. Top-up rate at the Small pack is $0.01/credit (`PRICING_PROPOSAL.md:115`), so 750 credits = $7.50 in user revenue against $11.30 in provider cost. **Negative ~$3.80 contribution per cinematic short, before Stripe fees, hosting, storage, and worker compute.** Cinematic at the entry tier is bankrupting on every generation that gets surfaced via top-up.
- Fix: align (a) credit caps with `PRICING_PROPOSAL.md` (Creator=3,000 / Studio=10,000), AND (b) reduce cinematic multiplier OR raise top-up price floor so 1 cr ≥ provider cost / multiplier; AND (c) gate cinematic to Studio until margin ≥ 30% in `src/lib/planLimits.ts` and `validateGenerationAccess`. Add a margin self-test that fails CI if `(top_up_rate × credits) < projected_provider_cost × 1.3`.
- Effort: M

---

### Critical

**C1 — All API-cost telemetry is hardcoded to zero; `$/active-user`, `$/generated-video`, `$/audit-call` cannot be computed.**
- Issue: Every `writeApiLog(...)` call in `worker/src/services/*.ts` passes `cost: 0`. 37 occurrences across `audioASR.ts`, `openrouter.ts`, `qwen3TTS.ts`, `researchTopic.ts`, etc. The `api_call_logs.cost` column exists (`worker/src/lib/logger.ts:68,165`) but stores zero forever.
- Evidence: `worker/src/services/openrouter.ts:170,178,183,259,267,286`; `worker/src/services/audioASR.ts:123,129,133`; `worker/src/services/researchTopic.ts:109,113`; `worker/src/services/qwen3TTS.ts:186,195`. Same pattern across all 8 provider files. `wc -l` of `cost: 0` matches in `worker/src` = 37.
- The downstream `generation_costs` table receives a single bulk insert at finalize (`worker/src/handlers/handleFinalize.ts:230-242`) computed from a stale `PRICING` constant table — not from real per-call accounting — so admin dashboards and `get_generation_costs_summary()` (`supabase/migrations/20260419000003_fix_admin_costs_rpc.sql`) are reporting an estimate, not actual spend.
- Fix: in each `writeApiLog` callsite, wrap the API call to capture (a) tokens / output seconds / image count from the provider response, (b) multiply by the canonical PRICING constants, (c) pass the real cost. Centralize PRICING in one shared module imported by both `handleFinalize.ts` and the per-call sites. Reconcile `api_call_logs.SUM(cost)` against `generation_costs.SUM(total_cost)` daily; flag drift > 5%.
- Effort: M

**C2 — Autopost UI lies to the user about per-run cost; SQL deducts 1.6x to 40x more than promised.**
- Issue: `AUTOPOST_CREDITS_PER_RUN = 45` (`src/lib/planLimits.ts:133`) and the user-facing copy reads "Per-run cost is a flat 45 credits — no surprises" (`src/components/intake/IntakeForm.tsx:1549`). The active SQL function (most-recent migration `20260502110000_autopost_credit_deduction_and_empty_topic_guard.sql:43-71`) returns `CEIL(secs × mult)`, where `secs ∈ {150, 280, 360}` and `mult ∈ {0.5, 1, 5}`. So a real autopost run charges **75 credits (smartflow short) up to 1,800 credits (cinematic presentation)**.
- Evidence: comment in `src/lib/planLimits.ts:127-132` literally says it "mirrors the SQL function which returns 45 unconditionally" — that statement was true under `20260501150000_autopost_flat_45_and_plan_gate.sql` (which `RETURN 45`), but the later `20260502110000` migration replaced it with a dynamic formula. The frontend constant was not updated.
- Bill impact: a Creator user (500 cr/mo) running daily Cinematic autopost (750 cr/run) drains their monthly cap on day 1 and either (a) hits insufficient-credits failure with no scheduled run, or (b) buys top-ups at $0.01/cr × 750 = $7.50/run = $225/mo, against a published $19/mo plan price. This is fraudulent UX even if unintentional.
- Fix: pick one — (1) change SQL `autopost_credits_required` back to `RETURN 45` (matches the planLimits.ts comment and the customer-facing copy), OR (2) change the frontend to compute `getCreditsRequired(mode, length)` and remove `AUTOPOST_CREDITS_PER_RUN` and remove the "flat / no surprises" copy. Option (1) is the safer path since 45 was the recent product decision per `20260501150000_autopost_flat_45_and_plan_gate.sql:1-13`.
- Effort: S (one SQL migration to revert, plus add a regression test that asserts `autopost_credits_required('cinematic', 'presentation') = 45`)

**C3 — `generation_costs` schema cannot represent half the providers in use; cost attribution is lossy by design.**
- Issue: `generation_costs` table has columns `openrouter_cost, replicate_cost, hypereal_cost, google_tts_cost` (`supabase/migrations/20260201165235_*.sql:6-10`). But the codebase actively bills against **Fish Audio** (`worker/src/services/fishVoiceClone.ts`), **ElevenLabs** (`worker/src/services/elevenlabs.ts`, `audioProviders.ts:237`), **LemonFox** (`audioRouter.ts:115`), **Smallest** (`worker/src/services/smallestTTS.ts`), and **OpenAI** (`gpt-image-2` referenced at `imageGenerator.ts:5`). None of those have a column. They are silently rolled into "hypereal" or "replicate" (`handleFinalize.ts:225-228`).
- Evidence: column list at `supabase/migrations/20260201165235_*.sql:2-12`; usage of unmapped providers at `worker/src/services/audioRouter.ts:18-22, 99-110`; cost-attribution rollup at `worker/src/handlers/handleFinalize.ts:224-228`.
- Fix: add `fish_audio_cost`, `elevenlabs_cost`, `lemonfox_cost`, `smallest_cost`, `openai_cost` columns to `generation_costs`; update the `total_cost` GENERATED column to include them; update `handleFinalize.ts` cost attribution to insert into the right columns. Without this, every provider-mix decision (Meter Rule #1: tag every resource) is unfounded.
- Effort: S

**C4 — `handleFinalize.ts` cost rollup uses a provider that is not actually called.**
- Issue: `worker/src/handlers/handleFinalize.ts:208` charges non-Haitian-Creole audio at `PRICING.qwen3PerSecond` ($0.001/s). But `audioRouter.ts:1-15` documents "Three paths only: clone → Fish, English+Male → LemonFox, anything else → Gemini Flash TTS" — Qwen3 is not in the active router. So the recorded `replicate_cost` is fabricated for a provider that did not generate the audio.
- Evidence: `worker/src/handlers/handleFinalize.ts:201-228` (recording logic); `worker/src/services/audioRouter.ts:1-22, 95-130` (actual routing). Qwen3 prices are still in the worker `PRICING` constant table at `handleFinalize.ts:20`.
- Fix: replace `PRICING.qwen3PerSecond` rate with the actual provider rate selected by `audioRouter.ts` at run time. The handler already knows the language and clone status — call the same router-decision function and look up the right rate. Or, more defensively, have the audio handler emit the actual cost in `_meta.costTracking.audioCostUsd` and have finalize sum that.
- Effort: S

---

### Major

**M1 — No daily cost cap, anomaly alert, or per-user abuse cap.**
- Issue: The retry classifier (`worker/src/lib/retryClassifier.ts` referenced from `handleFinalize.ts:11`) governs retry behavior but there is no daily $/user spend cap, no cost-per-render hard ceiling, no anomaly alert (e.g. "Hypereal video traffic 3x baseline"). A bug that triggers infinite Kling retries at $0.70/clip would burn cash silently until a human notices the bill.
- Evidence: `Grep "daily.*cap\|cost.*cap\|spend.*cap\|cost.*alert\|anomaly" worker/src` returns zero matches. `Grep "MAX_COST_PER_GENERATION\|HARD_CAP\|ABUSE" src worker/src` returns zero matches.
- Fix: add a worker-side cap before each Kling/Hypereal call: refuse to start if `sum(api_call_logs.cost WHERE generation_id = X) > GENERATION_COST_HARD_CAP` (configurable via env, default $25). Add a daily-spend cap per user: `sum(generation_costs.total_cost WHERE user_id = U AND created_at > now() - 1 day) < DAILY_USER_CAP_USD`. Sentry alert on any 24h provider line-item that doubles week-over-week.
- Effort: M

**M2 — Pricing model proposal and implementation are out of sync.**
- Issue: `PRICING_PROPOSAL.md:31-37` proposes Creator = 3,000 cr/mo, Studio = 10,000 cr/mo, cinematic multiplier 3x. Code has Creator = 500, Studio = 2,500, cinematic multiplier 5x. Either the proposal was never executed or the proposal is stale — neither is sustainable to ship in this state.
- Evidence: `PRICING_PROPOSAL.md:33` (`Cinematic | 3x`) vs `src/lib/planLimits.ts:105` (`cinematic: 5`); `PRICING_PROPOSAL.md:67` (Creator 3,000) vs `src/lib/planLimits.ts:58` (`creditsPerMonth: 500`).
- Fix: pick the source of truth, run the unit-economic spreadsheet (provider cost per length × multiplier × top-up rate), and converge code + proposal + pricing-page copy in one PR. Block merges that change `PLAN_LIMITS` without updating `PRICING_PROPOSAL.md`.
- Effort: S (alignment) — economic decision is L

**M3 — `Free` tier provides 0 monthly credits and 0 daily — funnel is closed.**
- Issue: `src/lib/planLimits.ts:42-44`: `free.creditsPerMonth: 0` and `dailyFreeCredits: 0`. New signups cannot generate even a sample without paying.
- Evidence: `src/lib/planLimits.ts:42-56`. `PRICING_PROPOSAL.md:121-138` claims a 300-credit one-time signup credit and 100/day cap; not present in the code.
- Cost angle: free trials are paid acquisition. A 300-credit one-time grant equals one cheap explainer (~$0.30 provider cost) for the platform. Closing the funnel saves cents and loses dollars in conversion. Hand off to Penny + Axiom for the business decision.
- Effort: XS to add 300 starter credits at signup; aligns with the proposal.

**M4 — Six TTS provider clients shipped despite audio router declaring "three paths only".**
- Issue: `audioRouter.ts:1-15` says English+Male → LemonFox, clone → Fish, else → Gemini Flash. But the worker bundle still ships clients for ElevenLabs (`elevenlabs.ts`, `audioProviders.ts:237-280`), Qwen3 (`qwen3TTS.ts`), Smallest (`smallestTTS.ts`), and Gemini Native (`geminiNative.ts`) plus Gemini Flash TTS (`geminiFlashTTS.ts`).
- Evidence: `worker/src/services/` has 29 files; provider clients listed in router-as-of-2026-05 are only 3, but 6+ are imported elsewhere (`worker/src/services/customVoiceProvider.ts:18-27` still routes "elevenlabs"; `audioRouter.ts:38-39` retains `elevenLabsApiKey` for backcompat).
- Cost angle: every unused client is (a) a secret-key surface area to rotate and pay for in incident response time, (b) attack/leak surface for the audit team, (c) bundle bloat in the worker (Render.com instance size). Audit each unused client and remove or move to `worker/src/archive/`.
- Effort: M

**M5 — No CI cost-diff gate, no per-deploy `$/day` projection.**
- Issue: Per Meter Rule #2 ("cost is a release-gate input"), CI should produce a $/day delta per merge using a fixed benchmark trace. None present.
- Evidence: `.github/workflows/*` (sampled), `package.json:scripts` — no cost-diff job; `lighthouserc.cjs` covers Lighthouse but not provider cost.
- Fix: add a CI step that runs a synthetic 1-scene cinematic + 1-scene smartflow + 1 autopost run against a staging environment, sums actual `api_call_logs.cost` for the run, compares to the previous main-branch baseline, fails the build if delta > 10% on a top-10 endpoint.
- Effort: M (and depends on C1 being fixed first — without per-call cost telemetry, the gate measures nothing).

**M6 — No untagged-resource policy; cost attribution at the cloud-provider invoice level cannot reach feature granularity.**
- Issue: Per Meter Rule #1 ("no untagged resource"), every Hypereal / Replicate / Render.com / Supabase resource should carry `project=motionmax env=<prod/staging> feature=<cinematic|autopost|voicelab>` tags. There is no evidence of tag application — `iac/` directory exists but is not surfaced in this audit (Unable to verify from static analysis).
- Fix: in worker, attach a `feature` and `env` tag to every outbound provider request via a request header where the provider supports it (Replicate `prediction.metadata`, Hypereal — check API), and log the same in `api_call_logs.details` JSONB. This unblocks per-feature cost reports.
- Effort: M

---

### Minor

**Mn1 — ASR reruns are not cached.**
- Issue: `audioASR.ts` runs ASR on every cinematic finalize (`handleFinalize.ts:222`). If a user regenerates audio for a scene (`handleRegenerateAudio.ts`), ASR is re-run. At $0.01/min × 8s/scene × 15 scenes = $0.02 per regeneration burst — small, but multiplies by user count.
- Fix: cache ASR results in `audio_assets` (or similar) keyed on `sha256(audio_url)`; reuse on regenerate-audio.
- Effort: S

**Mn2 — `scriptPerCall: 0.01` flat-fee floor in `supabase/functions/generate-video/index.ts:400` over-charges short scripts.**
- Issue: `Math.max(llmResult.tokensUsed * PRICING.scriptPerToken, PRICING.scriptPerCall)` always rounds up to $0.01 per call, even when actual tokens cost ~$0.001. Self-imposed margin tax that distorts `$/generated-video` metric upward.
- Evidence: `supabase/functions/generate-video/index.ts:2984`.
- Fix: drop the floor; report actual tokens × rate. The margin protection belongs in the credit price, not the cost-recording side.
- Effort: XS

**Mn3 — `imageNanoBananaPro` and `imageNanoBanana2` have identical $0.04 prices but separate constants.**
- Issue: `supabase/functions/generate-video/index.ts:405-407` defines three image prices, all $0.04. Either (a) one of them is wrong and one provider actually costs more, or (b) the duplication is dead code.
- Fix: consolidate; verify against the actual Hypereal/Replicate/Google invoice line items.
- Effort: XS

**Mn4 — Verbose logging at every TTS/ASR call (`console.log(...)` per scene) is paid log volume on Render.**
- Issue: `audioRouter.ts:103,108,119` plus per-handler info logs in `handleCinematicAudio.ts` etc. Render bills log volume above the included tier.
- Fix: demote per-scene success logs to `debug`; keep only error and "generation start/finish" at `info`.
- Effort: XS

---

### Polish

**P1 — Pricing page does not surface "credits remaining" as $-equivalent.** Tool-savvy creators will ask "what does 750 credits cost me if I top up?" — surface `credits × $0.01` next to the credit balance in `RightRail.tsx`. Aids upsell. Effort: XS.

**P2 — `PRICING` constant duplicated between `worker/src/handlers/handleFinalize.ts:15-32` and `supabase/functions/generate-video/index.ts:397-408` with different values (worker has more providers, edge has older trio).** Risk of drift. Move to a shared `_shared/pricing.ts` and import. Effort: XS.

---

## Production Blockers Table

| ID | Severity | Issue | Fix Location | Effort |
|----|----------|-------|--------------|--------|
| B1 | Blocker | Creator plan (500 cr/mo) cannot fund one Cinematic short (750 cr); negative margin via top-up | `src/lib/planLimits.ts:41-119` + Stripe products | M |
| C1 | Critical | All `writeApiLog` calls send `cost: 0`; per-call FinOps blind | `worker/src/services/*.ts` (37 sites), `worker/src/lib/logger.ts` | M |
| C2 | Critical | Autopost UI says "flat 45 / no surprises", SQL charges 75–1,800 credits | `supabase/migrations/20260502110000_*.sql:43-71` OR `src/lib/planLimits.ts:133` + `IntakeForm.tsx:1541-1549` | S |
| C3 | Critical | `generation_costs` table missing columns for Fish, ElevenLabs, LemonFox, Smallest, OpenAI | `supabase/migrations/<new>` + `worker/src/handlers/handleFinalize.ts:230-242` | S |
| C4 | Critical | `handleFinalize.ts` charges Qwen3 rate for audio that runs on Gemini/LemonFox/Fish | `worker/src/handlers/handleFinalize.ts:206-228` | S |

---

## Top 10 Priority Fixes (cost angle)

| # | Severity | Fix | Why now |
|---|----------|-----|---------|
| 1 | Blocker | Realign Creator/Studio credit caps OR cinematic multiplier so one entry-tier generation is fundable | Headline product unsellable on cheapest paid tier; negative margin via top-up |
| 2 | Critical | Replace `cost: 0` with real per-call cost in all 37 `writeApiLog` sites | Without this, no other cost recommendation can be measured |
| 3 | Critical | Reconcile autopost cost: revert SQL to flat 45 OR remove the "no surprises" copy | Active billing fraud risk against paying users |
| 4 | Critical | Add `fish_audio_cost`, `elevenlabs_cost`, `lemonfox_cost`, `smallest_cost`, `openai_cost` columns to `generation_costs` | Half of provider spend is currently unattributed |
| 5 | Critical | Fix `qwen3PerSecond` attribution in `handleFinalize.ts` to use the actual router-selected provider | Recorded cost ≠ real cost on every generation |
| 6 | Major | Add `GENERATION_COST_HARD_CAP` (per-render) and `DAILY_USER_CAP_USD` (per-user) to worker | Single retry bug today = unbounded provider bill |
| 7 | Major | Restore Free-tier 300 starter credits per `PRICING_PROPOSAL.md` | Closed funnel = lost conversion at near-zero CAC |
| 8 | Major | Sync `PRICING_PROPOSAL.md` and `PLAN_LIMITS` in one PR; gate future PR merges on consistency | Ship-blocker if marketing copy diverges from billing |
| 9 | Major | Add CI cost-diff gate (synthetic generation + cost delta vs main) | Without it, any PR can silently regress unit economics |
| 10 | Major | Audit and prune unused TTS provider clients (ElevenLabs, Qwen3, Smallest, Gemini Native) | Secret-key surface + bundle weight + drift risk |

---

## Items I Could Not Verify From Static Analysis

- Actual cloud-provider invoices (Render, Supabase, Hypereal, Replicate) for the past 30 days — needed to reconcile against `generation_costs.total_cost` and confirm the underestimation magnitude.
- Whether `iac/` carries resource tags (`project=motionmax env=prod feature=…`) — directory exists but not inspected in this 15-min budget.
- Cron-driven cost (e.g., autopost, refresh-project-thumbnails, drain-deletion-tasks edge functions) — these run on Supabase Edge Function quota and may be cheap, but need a 24h sample to confirm.
- Storage cost growth (Supabase Storage for scene-images, scene-videos, exported MP4s) — no lifecycle policy visible in `supabase/migrations/`; orphaned-blob risk on cancelled generations is plausible. Coordinate with Keeper.

---

**Submitted by:** Meter (FinOps & Cost Engineering)
**Time spent:** ~14 min
**Confidence:** High on findings B1, C1, C2, C3, C4 (verified file:line); Medium on M5/M6 (depends on CI/IaC files I did not exhaustively inspect).
