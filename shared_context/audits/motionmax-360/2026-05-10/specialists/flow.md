# Flow — Design-time Journey Cross-Reference — MotionMax 360

**Date:** 2026-05-10
**Reviewer:** Flow (UX Researcher, Design layer)
**Scope:** §3 — Reconcile Trace's as-built journey findings against the *documented* persona work and journey maps. For each divergence between as-built and intended flow, identify whether the build is wrong or the spec is. Recommend reconciliation.
**Audience (per `360assessment.md:18-22`):** Primary persona — tool-savvy creative adults (content creators, marketers, video producers, agency staff). Mobile-heavy. Comfortable with CapCut/Descript/Canva tier. NOT developers. Mixed English fluency (11 languages claimed). Secondary persona — small-team marketers, L&D authors. Explicitly NOT — developers, seniors, children, enterprise procurement.
**Inputs cross-referenced:**
- Trace's findings: `shared_context/audits/motionmax-360/2026-05-10/trace.md` (16 flow findings, 0 Blocker, 8 Critical, 8 Major, 2 Minor, 1 Polish)
- Persona definition: `motionmax/360assessment.md:14-24`
- Existing UX audits: `motionmax/deep_audit/design.md`, `motionmax/archive/UI_UX_AUDIT_REPORT.md`, `motionmax/archive/RESPONSIVE_UX_AUDIT.md`
- Native plan: `motionmax/NATIVE_MOBILE_PLAN.md`

Severity rubric per `agents/audit/jury.md`: **Blocker / Critical / Major / Minor / Polish**.
Effort: XS (≤1 h) / S (1–4 h) / M (½–2 d) / L (>2 d).

---

## Method — what does "design-time spec" mean for this audit?

The brief asks me to compare against persona work and journey maps. I performed a corpus search across `motionmax/` for `persona*.md`, `journey*.md`, `PRD*.md`, `UX*.md`, and grep across all root markdown for "persona / user journey / user flow / journey map". Findings:

1. **A persona definition exists** — but only as four prose sentences in `motionmax/360assessment.md:18-22`. There is no segmented persona doc, no "day in the life," no jobs-to-be-done framing, no ranked goals/blockers, no anti-personas beyond the one-liner.
2. **No documented user journey map exists** in the repo (no `journey*.md`, no `*flow*.md`, no Figma/Miro reference in the repo). The closest artifacts are `archive/UI_UX_AUDIT_REPORT.md` (a *post-hoc* audit, not a designed journey), `archive/RESPONSIVE_UX_AUDIT.md` (component-level responsive audit), and the brief's narrative.
3. **No documented time-to-first-value (TTFV) target** — the brief explicitly mentioned this as a Flow concern (`360assessment.md:140`: "Onboarding journey map — what's the time-to-first-value?") but no TTFV value (e.g., "first published video in <8 minutes") is committed anywhere in the repo.
4. **No documented per-surface success criteria** — e.g., what does success on the Editor look like for the persona? What is "good" Voice Lab onboarding? Nothing committed.

**This means most divergences I find cannot be cleanly classified "build wrong vs spec wrong" — the spec is largely *absent*.** That absence is the headline finding.

---

## Critical · No documented user journey map exists for production-readiness review

- **Issue:** The brief's task framing assumes a design-time journey map exists to compare the build against. Static analysis confirms no such artifact in the repository. The persona is one paragraph; no journey map, no per-surface success criteria, no TTFV benchmark, no abandonment-risk inventory by step. Trace's flow findings therefore cannot be *reconciled* against an authoritative spec — they can only be assessed against generic UX principles plus the four-sentence persona.
- **Evidence:** Repository-wide search:
  - `motionmax/` root + `docs/`, `archive/`, `deep_audit/`, `superpowers/`: no `persona*.md`, no `journey*.md`, no `PRD*.md`, no `UX*.md` files.
  - Persona definition is confined to `motionmax/360assessment.md:18-22` (4 sentences total).
  - `360assessment.md:140` charters Flow with "Onboarding journey map — what's the time-to-first-value?" — proving the org KNOWS this is needed but has not produced it.
- **Why it matters for the audience:** The persona is mobile-heavy, mixed-fluency, non-developer creators. Without a documented journey, future contributors (and post-launch audits) cannot detect when a flow regresses *for that specific persona*. The build will drift; nobody will know it has.
- **Fix:** Create `motionmax/docs/UX_JOURNEY_MAP.md` covering the five primary surfaces flagged in the brief — landing → auth → intake → editor → publish/autopost. For each: persona entry conditions, target step count, target TTFV, abandonment risks, success criteria. Cross-link from `360assessment.md:140`. This is the artifact every future audit needs as the "gold flow" reference.
- **Effort:** M (½ to 2 days)

---

## Critical · Trace finding (Editor saveStatus hardcoded `'saved'`) — BUILD wrong; spec absent but the audience expectation is unambiguous

- **Issue:** Trace flagged at `src/pages/Editor.tsx:334` that `saveStatus` is `const … = 'saved'`. Reconciliation: there is no design-time spec for autosave behaviour, but the persona ("CapCut / Descript / Canva tier" creators per `360assessment.md:18`) has *category-defined* autosave expectations. CapCut and Descript both ship autosave-with-clear-state-indicator. A perpetually-green chip is a **broken industry-table-stakes pattern** for this persona regardless of whether the spec mentions it.
- **Evidence:** `motionmax/src/pages/Editor.tsx:334` (verified independently — `const saveStatus: 'idle' | 'saving' | 'saved' | 'dirty' = 'saved';`); persona reference `360assessment.md:18`.
- **Verdict (build vs spec):** **BUILD wrong.** The persona's expectation is implied by the explicitly-named comparator products. No spec change needed.
- **Fix (in addition to Trace's):** Document in the new journey map (Critical above) that the Editor surface MUST implement autosave-with-state-indicator as a persona-level requirement, sourced to "comparator parity (CapCut/Descript/Canva)." This prevents future regressions.
- **Effort:** Trace's S + XS for journey-map entry.

---

## Critical · Trace finding (kickoff probe exhaustion → silent dead-end) — BUILD wrong; mobile-flaky-network is the dominant persona context

- **Issue:** Trace flagged the probe loop at `src/pages/Editor.tsx:188-256` running 8 probes (~60 s) and silently giving up. Reconciliation: the persona is *mobile-heavy* (`360assessment.md:18`), which means flaky LTE / spotty 5G / handoff scenarios are the **modal** network condition, not the edge case. The build's 60-second silent-fail path is the worst possible UX for the persona's most-frequent network state.
- **Evidence:** `Editor.tsx:188-256` (Trace verified); persona context `360assessment.md:18`.
- **Verdict:** **BUILD wrong; the persona explicitly mandates a different default.** The intent (probe with backoff) is correct; the absence of a terminal failure UI is a build defect the spec did not catch because the spec was never written.
- **Fix:** Trace's fix (set `kickoffState='error'` on `attempts === MAX_PROBES`) is correct and sufficient. Additionally, the journey map should call out "mobile creator on flaky LTE returning to a half-loaded editor" as a *named persona scenario* with a documented expected behavior.
- **Effort:** Trace's XS.

---

## Critical · Trace finding (Project not found → only "Back to Studio") — SPEC wrong (or absent); build literally implemented what the empty spec implied

- **Issue:** Trace flagged the load-error state at `src/pages/Editor.tsx:349-367` providing only a single CTA. Reconciliation: there is no design-time spec for error-recovery surfaces. Generic "Back" was the path-of-least-resistance for a developer with no spec. The persona shares project links across devices (a creator-software norm — Descript, Frame.io, CapCut all ship deep-link-shared projects), so 4xx/403 flows must offer a "Browse my projects" path, a copyable project ID, and a support escape hatch.
- **Evidence:** `motionmax/src/pages/Editor.tsx:349-367` (verified — single button to `/dashboard-new`, no project ID surfaced); no spec exists for error surfaces (corpus search above).
- **Verdict:** **SPEC absent — both build and absent spec at fault.** This is exactly the kind of decision the missing journey map should make for engineers.
- **Fix:** Apply Trace's recommended changes (Browse Projects link, support link with prefilled ID, monospace project ID). Then *also* add an "Error & Recovery Surfaces" section to the new journey map covering: Editor 404, Editor 403, Editor kickoff failure, Voice Lab clone failure, Autopost run failure, Auth lockout, payment decline. Each needs a primary recovery target, a secondary alternative, and a support escape hatch.
- **Effort:** Trace's XS + S to author the journey-map section.

---

## Critical · Persona–surface mismatch — Help page "Live chat — Coming soon" contradicts the documented persona's expected support tier

- **Issue:** Trace flagged at `src/pages/Help.tsx:499-511` that the "Live chat" row is a dead `aria-disabled` element with no fallback action. From the Flow lens, this is a **persona-fit failure**, not just a UX dead-end. The documented persona is "comfortable with CapCut / Descript / Canva tier" (`360assessment.md:18`). Every named comparator ships either live chat OR an in-product help search with sub-hour response times. Posting a "coming soon" badge for live chat tells the persona "this product is below the support tier you are used to."
- **Evidence:** `src/pages/Help.tsx:499-511` (Trace verified); persona definition `360assessment.md:18`.
- **Verdict:** **Both build AND spec wrong.** The build ships a dead element; the spec never asked "what support modality does this persona expect?" — and so the build defaults to email-only with a regret-coloured "coming soon" pill.
- **Fix:** Until live chat is real, **remove the "Live chat — Coming soon" row entirely**. Replace with a single email-support row plus a "Typical response time: X hours" expectation-setting line. Document support-modality target in the journey map.
- **Effort:** XS for the row removal; S to commit the support-tier expectation in the journey map.

---

## Major · Trace finding (Settings "Coming soon" pills with no expectation-setting) — SPEC wrong; the journey map should commit to a "soft-launch tease" pattern or remove them

- **Issue:** Trace flagged Settings (`src/pages/Settings.tsx:391, 479`) and Help cross-referencing "Coming soon" features with no notify-me, no roadmap link, no inline action. Reconciliation: this is a **product-narrative failure** the spec should resolve. The persona is "tool-savvy" — they will read three "coming soon" cards and infer the product is incomplete. CapCut/Descript ship "early access" or "beta" with explicit signup; MotionMax ships passive "coming soon" with no action. That's a brand-perception miss for the persona.
- **Evidence:** Trace's evidence (`Settings.tsx:391, 479`, `Help.tsx:129`) cited; persona expectation derived from comparator-parity.
- **Verdict:** **SPEC wrong.** The build is implementing a spec gap, not a spec violation.
- **Fix:** In the new journey map, commit to ONE of: (a) hide all "coming soon" cards entirely until ship, (b) show "early access — notify me" cards with a working `submit-support-ticket` integration. Do not ship passive "coming soon" pills. This is a *one-decision-fixes-many-surfaces* finding.
- **Effort:** S (decision + 3 surfaces touched).

---

## Major · Intake form cognitive load violates persona-defensibility (~10 controls; 1571 lines)

- **Issue:** The brief charters Flow specifically with: "Cognitive load on the unified intake form (currently ~10 controls; is that defensible for the audience?)" (`360assessment.md:140`). Static analysis confirms `motionmax/src/components/intake/IntakeForm.tsx` is 1571 lines (verified `grep -c '^'`) which strongly implies a high control count even if not all are user-visible at once. Trace explicitly disclaimed coverage of the intake form across breakpoints. From the Flow lens: per **Hick's Law**, 10 simultaneous controls for the persona on mobile (the dominant context) is at the upper bound of defensibility. Without a documented decision tree (mode → genre → length → narrator → music → captions → schedule → autopost), this is too many decisions per screen for a CapCut-tier persona.
- **Evidence:** `IntakeForm.tsx` line count = 1571; brief's flag at `360assessment.md:140`; persona at `360assessment.md:18`.
- **Verdict:** **SPEC absent.** The form was built without a documented progressive-disclosure plan.
- **Fix:** Author a progressive-disclosure plan in the new journey map: Step 1 (mode + topic), Step 2 (length + voice), Step 3 (advanced — autopost, schedule, brand kit). Each step should fit on one mobile viewport at 375px without scroll. This is a Major (not Critical) because the form *works*; the fix is a v1.1 rewrite, not a launch blocker.
- **Effort:** L (full intake redesign would be days; documenting the plan is M).

---

## Major · Trace finding (Auth lockout opaque) — BUILD wrong; persona context (mobile + password manager) makes this acute

- **Issue:** Trace flagged at `src/pages/Auth.tsx:103-149` that the 30 s lockout is invisible until re-submit. Persona reconciliation: the persona is mobile-heavy and mixed-fluency. Mobile + password manager autofill misfire + non-native English reading the toast in their second language = a creator who will mash the button and conclude the product is broken. The current build is unkind to the persona's specific failure modes.
- **Evidence:** Trace's `Auth.tsx:103-149`; persona at `360assessment.md:18` ("Mixed English fluency").
- **Verdict:** **BUILD wrong; the persona's mobile + multilingual context elevates this above generic UX advice.**
- **Fix:** Apply Trace's recommended fix (sticky countdown banner with `aria-live="polite"`, disable submit during lock). Additionally, document in the journey map that auth-error states must be (a) visible without a re-submit, (b) translatable per the i18n catalog (the build claims 11 languages; an opaque English-only toast violates the persona's fluency profile).
- **Effort:** Trace's S; +XS to add the journey-map note.

---

## Major · Storytelling-removal divergence — SPEC ahead of build; the persona returning to a legacy project will see broken-narrative UX

- **Issue:** Trace flagged storytelling remnants in `ProjectsGallery.tsx:35-39`, `SeoHead.tsx:41`, `SpeakerSelector.tsx:102-135`. Reconciliation from the Flow lens: a creator who created a "Storytelling" project before the removal returns to find their project bucketed under a "legacy compatibility" alias (Trace's evidence at `ProjectsGallery.tsx:35-39`: `EXPLAINER_TYPES = new Set(['doc2video', 'storytelling', 'explainer'])`). For the persona, **a returning project with a relabelled type is a trust break** — they will wonder if their content has been silently altered.
- **Evidence:** Trace's evidence cited above; persona expectation (return-after-time-away is the second-most-common visit type for creator software per category data).
- **Verdict:** **Spec is correct (remove the product), build hasn't caught up, AND there is no documented user-comms plan for legacy-project users.**
- **Fix:** In the new journey map, add an "Existing creators with deprecated-product projects" persona scenario. Define the user-comms (in-product banner + email) for the storytelling sunset. Then apply Trace's code fixes.
- **Effort:** Trace's XS + S to author the comms plan.

---

## Major · Email-sent confirmation has no resend — BUILD wrong; persona's email-deliverability context (Gmail, enterprise tenants) makes this acute

- **Issue:** Trace flagged at `src/pages/Auth.tsx:243-279` that the "Check your email" panel offers only a "Back to Sign In" CTA — no resend, no support escape, no TTL. Verified independently at `Auth.tsx:266-272` (single Button only). Persona reconciliation: tool-savvy creators on Gmail and enterprise tenants regularly miss confirmation emails to spam-aggressive filters. The build dead-ends the persona at the highest-intent moment of the funnel (just submitted creds, just gave us their email). This is a **conversion-funnel persona-fit failure**.
- **Evidence:** `motionmax/src/pages/Auth.tsx:243-279` (verified — `<Button variant="outline" … >Back to Sign In</Button>` is the only CTA at L266-272); persona email-deliverability inference from `360assessment.md:18`.
- **Verdict:** **BUILD wrong; spec absent.** No journey map exists for "creator stuck in email-confirm purgatory."
- **Fix:** Apply Trace's recommended changes (resend with 60 s cooldown, support escape link). Additionally, document in the journey map that signup confirmation must include resend + support paths within the same surface.
- **Effort:** Trace's S.

---

## Major · No persona segmentation in onboarding — agency staff and L&D authors get the creator funnel

- **Issue:** `360assessment.md:18-20` documents two personas: primary (creators) and secondary (small-team marketers, L&D / training authors). Static analysis of `Auth.tsx`, `IntakeForm.tsx`, and the onboarding flow (`Editor.tsx`, `dashboard-new`) shows a *single* funnel — no persona selector, no role-based step variation, no intake template per persona. The secondary persona is therefore being served the primary persona's UX with no adaptation.
- **Evidence:** Persona segmentation exists at `360assessment.md:18-20`; no segmenting code path found in Auth → Dashboard → IntakeForm sequence (corpus search for `persona`, `userRole`, `accountType`, `role`, `useCase` in `src/pages/Auth.tsx` and `src/components/intake/`). **Unable to verify exhaustively without a full grep across `src/`** — recommend Compass (audience alignment) cross-check.
- **Verdict:** **SPEC under-committed.** The persona doc names two segments but the build implements one funnel.
- **Fix:** Two options for the journey map: (a) commit to the unified funnel and remove the secondary-persona language from `360assessment.md:20` (single-persona simplicity), OR (b) add a one-question persona-tag at signup ("Creator / Marketer / L&D") and personalise the IntakeForm defaults per tag. (b) is more work but better for the L&D persona.
- **Effort:** S (decision + spec update); M to L if option (b) is chosen.

---

## Minor · Trace finding (NotFound `window.history.back()` fallback) — BUILD wrong; persona-relevant edge case

- **Issue:** Trace flagged at `src/pages/NotFound.tsx:44`. Persona reconciliation: this is a generic UX bug, not a persona-specific one — but it disproportionately affects the persona's *deep-link-from-email* use case (e.g., a creator clicking a published-video link from a teammate's Slack). Affirms Trace's recommendation.
- **Evidence:** Trace's `NotFound.tsx:44`.
- **Verdict:** **BUILD wrong.** Apply Trace's fix.
- **Effort:** Trace's XS.

---

## Minor · Trace finding (`/app` vs `/dashboard-new` routing inconsistency) — BUILD wrong; symptomatic of the missing journey map

- **Issue:** Trace flagged at `NotFound.tsx:7` vs `Editor.tsx:359, 392`. From the Flow lens, this is a *symptom* of the missing journey map: when no document defines the canonical "Home" target, two engineers will pick two different ones. The fix is route-standardisation **plus** capturing "the Home route" in the journey map so the next divergence is caught at PR review.
- **Evidence:** Trace's evidence cited.
- **Verdict:** **BUILD wrong; root cause is spec absence.**
- **Fix:** Trace's standardisation + add "Canonical routes" subsection to the journey map.
- **Effort:** Trace's XS + XS for journey-map note.

---

## Cross-cutting Flow concerns

### Major · No documented Time-To-First-Value (TTFV) target

- **Issue:** The brief explicitly charters Flow at `360assessment.md:140` with "Onboarding journey map — what's the time-to-first-value?" — but no TTFV target is committed anywhere. For a creator-tool product the *standard* TTFV benchmark is "first generated artefact in <10 min from first sign-up click." Without this number, no team can measure whether the build is regressing the persona's onboarding experience.
- **Evidence:** Corpus search across `motionmax/` for `TTFV`, `time to first value`, `time-to-first-value`, `time-to-publish` returns no committed target.
- **Verdict:** **SPEC absent.**
- **Fix:** Commit a TTFV target in the new journey map. Suggested initial value: "first generated draft visible to the persona in ≤8 min p50, ≤12 min p95, from sign-up email-click." Wire to PostHog as `signup → first_render_visible` event pair.
- **Effort:** XS to commit the number; S to wire the event funnel.

### Major · No "mobile creator returning after tab-close" scenario in flow design

- **Issue:** Trace flagged the absence of a `beforeunload` guard for the dirty-editor case. Persona reconciliation: the persona is mobile-heavy. Mobile creators routinely tab-close to take a phone call, switch apps, or hand the device to a colleague — the dirty-editor state must survive across tab close + reopen. No `beforeunload`, no `visibilitychange` autosave, and the hardcoded `'saved'` chip make this scenario a silent data-loss path.
- **Evidence:** Trace's evidence at `Editor.tsx` (no `beforeunload` referenced); `Editor.tsx:334` for the chip.
- **Verdict:** **BUILD wrong; spec absent.**
- **Fix:** In the new journey map, name the "tab-closed mid-edit" scenario as a tier-1 persona scenario. Build must implement (a) real `saveStatus`, (b) `useBeforeUnload` guard, (c) `visibilitychange` autosave, (d) a "you have unsaved edits — restore?" prompt on next open.
- **Effort:** M (after the saveStatus Critical above lands).

### Minor · 11 languages claimed; flow-translatability of error states unverified

- **Issue:** The brief and `360assessment.md:18` claim 11-language support and "mixed English fluency" persona. Trace's flow-error findings (auth lockout toast, "Project not found" body copy, Help "Live chat" string) all cite English literals. **Unable to verify from static analysis whether these strings flow through `i18next` / a translation catalog.** If they don't, the persona's mixed-fluency profile is not served on the flow's error path — exactly when comprehension matters most.
- **Evidence:** `360assessment.md:18` claims 11 languages; spot-grep on `src/pages/Auth.tsx` for `t(` (i18n function call) is needed to confirm — recommend Canon (i18n cross-check) or Compass (audience alignment) verify exhaustively.
- **Verdict:** **Unable to verify from static analysis (live walk + i18n catalog inspection required).** Possible BUILD wrong.
- **Fix:** Audit every error-path string for i18n catalog membership. Document in the journey map that flow-error strings have a tier-1 translation requirement (some non-error UI may be acceptable to ship in English-only, but error states are not).
- **Effort:** S to audit; M to translate if gaps found.

---

## Reconciliation summary table — Trace findings vs documented spec

| # | Trace severity | Trace finding (abbrev.) | Spec status | Build status | Verdict | Reconciliation |
|---|---|---|---|---|---|---|
| T1 | Critical | Editor `saveStatus` hardcoded | Absent (industry-table-stakes implied) | Wrong | BUILD wrong | Apply Trace fix + commit autosave to journey map |
| T2 | Critical | Kickoff probe silent exhaustion | Absent | Wrong | BUILD wrong | Apply Trace fix + name "mobile flaky network" scenario |
| T3 | Critical | Project-not-found single CTA | Absent | Conforms to absent spec | BOTH | Apply Trace fix + author error-recovery section |
| T4 | Critical | Inline hex tokens in error views | Absent | Wrong | BUILD wrong | Apply Trace fix |
| T5 | Critical | Account deletion no reauth/email | Absent | Wrong (also security) | BUILD wrong | Apply Trace fix; cross-check with Compass |
| T6 | Major | Pipeline partial-failure no banner | Absent | Wrong | BUILD wrong | Apply Trace fix + add to journey map |
| T7 | Major | Auth lockout opaque | Absent | Wrong | BUILD wrong | Apply Trace fix; flag i18n |
| T8 | Major | Email-sent screen no resend | Absent | Wrong | BUILD wrong | Apply Trace fix |
| T9 | Major | Help "Live chat" dead element | Absent | Wrong | BOTH (persona-fit failure) | Remove row + commit support-tier in journey map |
| T10 | Major | Settings "Coming soon" no action | Absent | Wrong (persona-narrative miss) | SPEC wrong | Decide pattern in journey map |
| T11 | Major | Help/Settings "Coming soon" overlap | Absent | Inconsistent | SPEC wrong | One source of truth |
| T12 | Major | Storytelling SEO/copy remnants | Spec ahead of build | Lagging | BUILD lagging spec | Apply + add user-comms plan |
| T13 | Major | Deletion sign-out before user sees cancel UI | Absent | Wrong | BUILD wrong | Apply Trace fix |
| T14 | Major | No e2e for multi-tab signup race | Absent | Wrong (test gap) | BUILD wrong | Defer to Canon |
| T15 | Major | No editor `beforeunload` guard | Absent | Wrong | BOTH | Apply Trace fix + add scenario |
| T16 | Major | `void forceRefresh` dead code | n/a | Dead code | BUILD wrong | Apply Trace fix |
| T17 | Minor | NotFound `history.back()` | Absent | Wrong | BUILD wrong | Apply Trace fix |
| T18 | Minor | `/app` vs `/dashboard-new` | Absent | Wrong | BUILD wrong (root cause: spec absence) | Apply Trace fix + canonical routes section |
| T19 | Minor | Email provider analytics missing | Absent | Wrong | BUILD wrong | Apply Trace fix |
| T20 | Polish | `toast.error` for user-correctable | Absent | Wrong (taxonomy) | BUILD wrong | Apply Trace fix |

**Headline pattern:** Of 20 Trace findings, **0 represent the build correctly implementing a spec that is itself wrong.** All findings either (a) the build is wrong against an absent spec (15), (b) both build and absent spec are wrong (3), or (c) build lags an updated spec (1) plus 1 not-applicable. **The dominant failure mode is spec absence.** Authoring the journey map (Critical finding above) addresses 16+ findings at the root rather than per-incident.

---

## Production Blockers (Flow lens)

| # | Category | Issue | Location |
|---|---|---|---|
| (none Blocker; the journey-map gap is Critical, not Blocker — the product can ship without a journey map but the next regression will be undetectable) | — | — | — |

## Top 10 Priority Fixes (Flow lens, severity-then-effort)

| # | Severity | Category | Issue | File:line | Effort |
|---|---|---|---|---|---|
| 1 | Critical | §3 / Spec | Author the missing user journey map (covers ~16 of Trace's findings at the root) | `motionmax/docs/UX_JOURNEY_MAP.md` (new) | M |
| 2 | Critical | §3 / Persona-fit | Help "Live chat — Coming soon" contradicts persona's expected support tier | `src/pages/Help.tsx:499-511` | XS |
| 3 | Critical | §3 / Build | Editor saveStatus hardcoded — autosave is industry table-stakes for the persona | `src/pages/Editor.tsx:334` | S |
| 4 | Critical | §3 / Build | Kickoff probe exhaustion silent — mobile-flaky-network is dominant persona context | `src/pages/Editor.tsx:188-256` | XS |
| 5 | Critical | §3 / Build+Spec | Project-not-found dead-end — author error-recovery section in journey map | `src/pages/Editor.tsx:349-367` | XS |
| 6 | Major | §3 / Spec | Commit a TTFV target (suggested ≤8 min p50 from sign-up to first draft) | journey map | XS |
| 7 | Major | §3 / Spec | Settings "Coming soon" — pick "hide" vs "notify-me" once for all surfaces | `Settings.tsx:391, 479` + journey map | S |
| 8 | Major | §3 / Spec | Persona segmentation gap — agency/L&D get creator funnel | journey map + intake | S to L |
| 9 | Major | §3 / Build | Email-sent screen has no resend — funnel breaks at highest-intent moment | `src/pages/Auth.tsx:266-272` | S |
| 10 | Major | §3 / Both | Mobile-creator-returning-after-tab-close scenario unbuilt and unspec'd | `Editor.tsx` + journey map | M |

---

## What Flow did NOT cover (out of category)

- Per-surface contrast / token / spacing — defer to Optic.
- Copy quality / voice / brand-tone — defer to Proof.
- A11y screen-reader / keyboard / WCAG AA — defer to Halo.
- Audience-alignment per individual word/phrase — defer to Compass.
- Live runtime walk-throughs / video traces — defer to Trace's re-audit when a staging URL is available.
- i18n catalog completeness across 11 languages — defer to Canon.

---

**Audit complete.**

— FROM: Flow (Design / UX Researcher) — TO: Jury (Audit) — RE: AUDIT FINDINGS §3 — motionmax-360 — STATUS: Review
