# Specialist Audit — Arch (Frontend Architecture)
**Project:** motionmax-360
**Date:** 2026-05-10
**Reviewer:** Arch — Frontend Architect
**Category:** §4 Code Health (architecture lens)
**Audience-relative scoring:** tool-savvy creative adults, mobile-heavy. Architecture findings affect them only via downstream symptoms (crashes, regressions, slow features). Severity therefore weights *risk of regression* and *blast radius* over aesthetic cleanliness.

Time-boxed 15-minute static review of `C:\Users\Administrator\motionmax`. No code edited. Every finding includes a `file:line` evidence pointer.

---

## 1. Findings (grouped by severity, then by surface)

### CRITICAL

#### C-A1 — Dead admin component layer (~6,498 LOC) shipped in the bundle
**Category:** Code Health / Dead code at the architecture level
**Severity:** Critical
**Issue (one sentence):** Eleven legacy top-level admin components (`AdminLogs.tsx`, `AdminGenerations.tsx`, `AdminOverview.tsx`, `AdminApiCalls.tsx`, `AdminFlags.tsx`, `AdminPerformanceMetrics.tsx`, `AdminQueueMonitor.tsx`, `AdminRevenue.tsx`, `AdminSubscribers.tsx`, `AdminUserDetails.tsx`, `AdminWorkerHealth.tsx`) are no longer imported by `Admin.tsx` (the page now wires `admin/shell/*` and `admin/tabs/Tab*`) and are not referenced from anywhere else in `src/`, but the files remain in the repo and continue to compile + carry their full transitive import surface.
**Evidence:**
- `src/pages/Admin.tsx:1-100` imports only `AdminCommandPalette`, `AdminRecentActions`, and `admin/shell/*`, `admin/_shared/*`, `admin/tabs/Tab*` lazy-loaded — none of the 11 legacy files appear.
- Repo-wide grep for `from '@/components/admin/(AdminLogs|AdminGenerations|AdminOverview|AdminApiCalls|AdminFlags|AdminPerformanceMetrics|AdminQueueMonitor|AdminRevenue|AdminSubscribers|AdminUserDetails|AdminWorkerHealth)'` returns zero matches across the project (only stale comments in `src/lib/csvExport.ts:5` and a pattern-reference comment in `src/pages/lab/autopost/RunHistory.tsx:163`).
- `wc -l` on the 11 files: 585 + 709 + 324 + 737 + 678 + 511 + 554 + 306 + 591 + 804 + 699 = **6,498 LOC** sitting unimported.
**Fix (solution + location + how):** Delete the 11 legacy files in `src/components/admin/Admin*.tsx` (top level). Solution: remove the files; rely on TS `noUnusedLocals` + `tsc --noEmit` to surface any remaining import. Location: `src/components/admin/AdminLogs.tsx`, `AdminGenerations.tsx`, `AdminOverview.tsx`, `AdminApiCalls.tsx`, `AdminFlags.tsx`, `AdminPerformanceMetrics.tsx`, `AdminQueueMonitor.tsx`, `AdminRevenue.tsx`, `AdminSubscribers.tsx`, `AdminUserDetails.tsx`, `AdminWorkerHealth.tsx`. How: `git rm` each file, then update the stale comment at `src/lib/csvExport.ts:5` to reference the new tab paths.
**Effort:** S (mostly mechanical; delete + grep + rebuild).

#### C-A2 — Storytelling product remnants persist across worker, edge function, README, llms.txt and SEO
**Category:** Code Health / Dead code at the architecture level (project decommission gap)
**Severity:** Critical (per brief: "Storytelling product is being removed — flag every remnant")
**Issue (one sentence):** Despite the data migration `supabase/migrations/20260422030000_storytelling_to_doc2video.sql` collapsing storytelling rows into doc2video, the type still ships in worker handlers, edge functions, README, public `llms.txt`, marketing keywords, and the deprecated cleanup scripts (`clean.cjs`, `clean.py`, `clean-rest.cjs`, `fix_usage.py`).
**Evidence:**
- `worker/src/handlers/handleFinalize.ts:218-219` — `const researchCost = (isCinematic || projectType === "storytelling") ? 0.005 : 0;` — still branching on `"storytelling"`.
- `worker/src/handlers/generateVideo.ts:6` — header docblock advertises `doc2video | storytelling | smartflow` routing.
- `worker/src/services/promptSections.ts:2` — module docblock claims sections are reused across `doc2video, storytelling, ...`.
- `worker/src/services/audioProviders.ts:116, 187` — voice-over prompt strings refer to "conversational storytelling tone" (acceptable as copy, but reflects unremoved framing).
- `supabase/functions/generate-video/index.ts:330, 3804, 5431` — has a "Storytelling-specific fields" block, fetches "character bible … (storytelling projects)", and a comment "The script phase (doc2video / storytelling / smartflow) …".
- `supabase/functions/_shared/audioEngine.ts:4` — header lists `Explainer/SmartFlow/Storytelling`.
- `README.md:9, 66`, `public/llms.txt:29`, `index.html:15` (meta keywords includes "video storytelling") — public-facing docs still advertise storytelling.
- Migration `supabase/migrations/20260118032750_a6adfbc9-e8ec-4056-a67b-34ce7af65e15.sql:1-5` adds storytelling-specific columns that were never deprecated.
- One-off cleanup scripts at repo root (`clean.cjs`, `clean.py`, `clean-rest.cjs`, `fix_usage.py`) are themselves unreferenced and contain hard-coded storytelling regex transforms — both evidence of, and contributors to, the half-removed state.
**Fix:** Solution: complete the decommission in one PR. Locations + how, in order:
1. `worker/src/handlers/handleFinalize.ts:218-219` — drop the `|| projectType === "storytelling"` branch.
2. `worker/src/handlers/generateVideo.ts:6`, `worker/src/services/promptSections.ts:2`, `worker/src/services/buildCinematic.ts:265`, `worker/src/services/audioProviders.ts:116, 187`, `supabase/functions/_shared/audioEngine.ts:4` — strip storytelling from docblocks/prompt strings.
3. `supabase/functions/generate-video/index.ts:330, 3804, 5431` — remove the "Storytelling-specific" code paths and character-bible-only-for-storytelling gating; verify cinematic still routes through whatever remained.
4. `README.md:9, 66`, `public/llms.txt:29`, `index.html:15` (meta keywords) — strip storytelling.
5. Add a follow-up migration that drops storytelling-only columns identified in `supabase/migrations/20260118032750_*.sql:5` once worker references are gone.
6. Delete root-level `clean.cjs`, `clean.py`, `clean-rest.cjs`, `fix_usage.py` (one-shot scripts, unused).
**Effort:** M (touches FE, worker, edge function, docs; coordinate with Forge for edge-function changes).

#### C-A3 — `supabase/functions/generate-video/index.ts` is a 5,530-line god-file
**Category:** Code Health / Separation of concerns
**Severity:** Critical
**Issue:** A single Deno edge function houses script generation, prompt assembly, image-pipeline routing, cinematic logic, character bible, and storytelling remnants in one 5,530-line file, defeating the architectural premise that the worker handles long jobs and edge functions stay thin.
**Evidence:**
- `wc -l supabase/functions/generate-video/index.ts` → 5530.
- Same file owns: input validation, content moderation prompt (`:129`), storytelling fields (`:330`), character bible fetch (`:3804`), and pipeline orchestration (`:5431`).
**Fix:** Solution: extract by stable boundary (validation, moderation, prompt builders, character bible, pipeline orchestration) into modules in `supabase/functions/generate-video/_modules/` and re-export from `index.ts`. Location: `supabase/functions/generate-video/index.ts`. How: start with the easiest-to-isolate slice (moderation prompt at `:127–:200`); land each extraction as its own PR so reviewers can verify byte-for-byte equivalence.
**Effort:** L (forge owns; Arch flags only the architectural shape).

#### C-A4 — `worker/src/index.ts` is 1,603 lines — the worker's only entrypoint owns dispatch + retry + every handler hookup
**Category:** Code Health / Separation of concerns
**Severity:** Critical
**Issue:** Worker entrypoint at 1,603 lines centralizes job dispatch, every handler import, and likely retry/backoff logic — the handlers in `worker/src/handlers/` exist as files but the orchestrator concentrates the wiring, increasing merge-conflict surface for the parallel-agent workflow this studio targets.
**Evidence:** `wc -l worker/src/index.ts` → 1603. `ls worker/src/handlers` shows ~20 handler files already split out, but the entrypoint did not shrink proportionally.
**Fix:** Solution: extract a `worker/src/dispatch.ts` registry (`Record<JobType, Handler>`) so `index.ts` becomes thin (boot + poll loop only). Location: `worker/src/index.ts`. How: introduce a typed handler registry, move the per-job switch into it, then have `index.ts` import + call.
**Effort:** M.

---

### MAJOR

#### M-A1 — `projectUtils.ts` is the documented source of truth, but ~14 callsites bypass it with inline equality
**Category:** Code Health / Business logic that should be centralized
**Severity:** Major
**Issue:** A canonical helper exists (`src/lib/projectUtils.ts:6-37` defines `normalizeProjectType()`, `PROJECT_TYPE_META`, and `getProjectTypeMeta()`), yet the legacy "smartflow" / "smart-flow" duality and project-type branching is hand-coded in at least 14 files instead of going through the helper. The "centralized, then ignored" pattern means future renames will leave dangling matches.
**Evidence (inline checks instead of `normalizeProjectType` / `getProjectTypeMeta`):**
- `src/pages/Usage.tsx:68` — `(projectType === "smart-flow" ? "smartflow" : projectType || "doc2video")`.
- `src/pages/Usage.tsx:600` — `projectType === "smartflow" || projectType === "smart-flow"`.
- `src/pages/Projects.tsx:971` — same `smartflow || smart-flow` ternary.
- `src/components/projects/ProjectsGridView.tsx` — pattern recurs (count: 3 occurrences of `project_type` per repo grep).
- `src/components/layout/AppSidebar.tsx` — duplicates the same comparison.
- `src/lib/planLimits.ts:238` — checks raw `"smartflow"` only; will miss `"smart-flow"` legacy rows that bypass other normalizers.
- `src/hooks/useEditorState.ts:81`, `src/hooks/useGenerationPipeline.ts:164,182,199`, `src/hooks/generation/unifiedPipeline.ts:28,104`, `src/hooks/generation/cinematicPipeline.ts`, `src/hooks/generation/callPhase.ts` — every pipeline rederives `isCinematic` / `isSmartflow` locally.
- `src/components/editor/Inspector.tsx:133-134, 339`, `src/components/editor/Stage.tsx:897-899`, `src/components/editor/ShareModal.tsx:113`, `src/components/editor/EditorTopBar.tsx:105-107`, `src/components/editor/useSceneRegen.ts:373, 479` — mode flags rederived per file, with hardcoded labels "Cinematic"/"Smart Flow"/"Explainer" instead of `getProjectTypeMeta(...).label`.
**Fix:** Solution: refactor inline equality into helper calls. Location: each callsite above. How: introduce `isCinematic(t)`, `isSmartflow(t)`, `isDoc2Video(t)` predicates in `src/lib/projectUtils.ts` that internally call `normalizeProjectType`; replace inline checks one folder at a time (editor → workspace → pages). Add an ESLint custom rule or grep-based pre-commit check to catch regressions.
**Effort:** M (mechanical but wide).

#### M-A2 — Hooks live in three different folders with no clear rule for which goes where
**Category:** Code Health / Folder structure
**Severity:** Major
**Issue:** Custom hooks are split across `src/hooks/` (24 files), `src/components/editor/use*.ts` (`useActiveJobs.ts`, `useExport.ts`, `useSceneRegen.ts`), and `src/components/admin/_shared/use*.ts` (`useAdminLiveCounters.ts`, `useAdminRealtimeChannel.ts`). There is no documented criterion (per-feature vs shared), so the same shape (e.g. `useExport.ts` in editor folder vs `useVideoExport.ts` in `/hooks`) sits in different homes and the architectural rule from CLAUDE/ADRs is absent.
**Evidence:**
- `ls src/hooks` → 24 hook files.
- `ls src/components/editor` → `useActiveJobs.ts`, `useExport.ts`, `useSceneRegen.ts` co-located with components.
- `ls src/components/admin/_shared` → `useAdminLiveCounters.ts`, `useAdminRealtimeChannel.ts`.
- Two hooks both touch export: `src/hooks/useVideoExport.ts` AND `src/components/editor/useExport.ts` — cannot determine canonical owner from naming.
**Fix:** Solution: pick one rule and enforce: (a) feature-local hooks live in `src/components/<feature>/hooks/` OR (b) all hooks live in `src/hooks/<feature>/`. Recommend (a) — co-location is the React 18+ convention and admin/editor already lean that way. Location: pick (a), then move `src/hooks/useEditorState.ts`, `src/hooks/useSceneVersions.ts`, `src/hooks/useSceneRegeneration.ts`, `src/hooks/useCinematicRegeneration.ts`, `src/hooks/useVideoExport.ts`, `src/hooks/generation/*` under `src/components/editor/hooks/` or `src/components/workspace/hooks/`. How: write a one-line ADR in `docs/architecture/` and execute moves in one PR per feature.
**Effort:** M.

#### M-A3 — Two competing "Sidebar" implementations
**Category:** Code Health / Architectural duplication
**Severity:** Major
**Issue:** `src/components/dashboard/Sidebar.tsx` and `src/components/layout/AppSidebar.tsx` both render a primary navigation surface; only one should own the role. The dashboard variant is imported by `Admin.tsx:6` while the layout variant is the newer abstraction — a typical mid-refactor split.
**Evidence:**
- `src/pages/Admin.tsx:6` imports `Sidebar from "@/components/dashboard/Sidebar"`.
- `src/components/layout/AppSidebar.tsx` exists and references `project_type` (per repo grep) — clearly a sidebar of its own.
- Cannot verify which is canonical without runtime inspection — flag for Vega + Arch decision.
**Fix:** Solution: pick one. Location: `src/components/layout/AppSidebar.tsx` is the architecturally correct home (matches `layout/` purpose); migrate Admin.tsx + any dashboard consumers to it, delete `src/components/dashboard/Sidebar.tsx`. How: rename `AppSidebar` to be parametric on `variant: "app" | "admin"`, run one consumer migration per PR.
**Effort:** M.

#### M-A4 — `src/components/intake/IntakeForm.tsx` at 1,571 lines is a single component
**Category:** Code Health / Separation of concerns
**Severity:** Major
**Issue:** `IntakeForm.tsx` is the primary funnel component (per the brief, intake is a SURFACE TO COVER) and lives as one 1,571-line file, mixing per-mode (cinematic / doc2video / smartflow) logic, modal triggers, and validation in one render tree. Mobile breakpoints + i18n changes will hit merge conflicts here.
**Evidence:** `wc -l src/components/intake/IntakeForm.tsx` → 1571. Folder `src/components/intake/` already has an `IntakeFrame.tsx` (uses `createContext`) — the splitting started but did not complete.
**Fix:** Solution: extract per-step / per-mode subcomponents into `src/components/intake/steps/{Source,Style,Voice,Speakers,Format,Confirm}.tsx`; keep `IntakeForm.tsx` as the orchestrator (<300 lines target). Location: `src/components/intake/IntakeForm.tsx`. How: lift state to `IntakeFrame` context (already exists per `IntakeFrame.tsx:createContext`), then extract step-by-step.
**Effort:** L.

#### M-A5 — `src/pages/VoiceLab.tsx` at 1,316 lines sits in `pages/` instead of being a feature folder
**Category:** Code Health / Folder structure
**Severity:** Major
**Issue:** Pages folder convention is "thin route container that imports a feature." Voice Lab violates this with 1,316 lines in the page file itself. There is no `src/components/voice-lab/` subset of components driving it (folder exists but page-level logic is monolithic).
**Evidence:**
- `wc -l src/pages/VoiceLab.tsx` → 1316.
- `ls src/components/voice-lab` exists but page does not break down by step.
**Fix:** Solution: move clone/library/preview state into `src/components/voice-lab/{CloneFlow,Library,PreviewModal}.tsx`; reduce `pages/VoiceLab.tsx` to ≤200 lines. Location: `src/pages/VoiceLab.tsx`. How: identify the three top-level sections by jsdoc'd region comments first, extract one at a time.
**Effort:** L.

#### M-A6 — Two parallel pipeline implementations in `src/hooks/`
**Category:** Code Health / Architectural duplication
**Severity:** Major
**Issue:** `src/hooks/useGenerationPipeline.ts` (244 lines) and `src/hooks/generation/unifiedPipeline.ts` (250 lines) + `cinematicPipeline.ts` (384) + `callPhase.ts` (476) appear to be two generations of the same orchestrator; the older `useGenerationPipeline.ts` directly checks `project.project_type === "cinematic"` (lines 164, 182, 199) while the newer `generation/unifiedPipeline.ts` parameterizes on `projectType`. Pick one.
**Evidence:**
- `wc -l src/hooks/useGenerationPipeline.ts` → 244, `src/hooks/generation/unifiedPipeline.ts` → 250.
- `useGenerationPipeline.ts:164` hardcodes `"cinematic"`; `unifiedPipeline.ts:28` uses `params.projectType === "cinematic"` (parameter, not raw row).
- Both files exist and both export hook-shape functions (per file headers).
**Fix:** Solution: identify which file is on the call path from `Editor.tsx`/`workspace/*` and delete the other. Location: `src/hooks/useGenerationPipeline.ts` and `src/hooks/generation/*`. How: grep for imports of each, choose the most-imported, move the other behind a deprecation banner for one release, then delete.
**Effort:** M.

#### M-A7 — 26 TODO/FIXME pointers, 17 of them in admin shipping copy
**Category:** Code Health / Architecture-level dead code (incomplete features)
**Severity:** Major
**Issue:** Repo grep for `TODO|FIXME|HACK|XXX` returns 26 occurrences in 16 files. 17 of these are in the admin surface (`AdminHero.tsx:58`, `UserDrawer.tsx:10, 330`, `AdminTopBar.tsx:29`, `TabApi.tsx:5, 206`, `TabNewsletter.tsx:11`, `TabNotifications.tsx:11, 231, 259, 312, 328`) and surface as `toast.info("TODO: hook to overview export"...)` style placeholders that ship to admins as broken buttons.
**Evidence:**
- `src/components/admin/shell/AdminHero.tsx:58` — `toast.info("TODO: hook to overview export", ...)`.
- `src/components/admin/users/UserDrawer.tsx:330` — `Stripe charge lookup ships in Phase 8.6.3 — refund button TODO.` Live admin copy.
- `src/components/admin/tabs/TabNotifications.tsx:231` — `onClick={() => toast.info("Routing rule editor — TODO Phase 18")}`.
- `src/components/admin/tabs/TabNotifications.tsx:259, 312, 328` — three more placeholder toasts in the same file.
- `src/components/intake/IntakeForm.tsx:934` — `// TODO[polish]: replace with themed inline input dialog`.
- `src/pages/Landing.tsx:299`, `src/components/landing/LandingPricing.tsx:16` — `TODO: replace 2,400+ with a real figure from your analytics/DB` — a placeholder testimonial number is shipping to the marketing site.
**Fix:** Solution: gate the TODO admin actions behind a feature flag (already have `src/lib/featureFlags.ts`) so they hide in production until wired; replace the Landing fake counter with a real query or a benign static claim. Location: each callsite above. How: wrap each `TODO`-toast with `if (flags.adminPhase18) {...}`; for `Landing.tsx:299` and `LandingPricing.tsx:16`, either remove the figure or pull from a `lib/marketingMetrics.ts` source that reads a static export from the analytics pipeline.
**Effort:** S per item, M total.

#### M-A8 — Top-level repo pollution: 4 one-shot cleanup scripts plus `archive/`, `deep_audit/`, `tasks/` and stale `.md` planning files
**Category:** Code Health / Architecture-level dead code
**Severity:** Major
**Issue:** Repo root contains `clean.cjs`, `clean-rest.cjs`, `clean.py`, `fix_usage.py` — one-shot transforms for the storytelling removal whose work is now baked into the migration. They are unreferenced by `package.json` scripts and confuse new contributors. Same applies to `archive/` (19 markdown planning docs), `deep_audit/`, `tasks/` (agent log captures), and `forge-low-error.log` / `forge-low-output.log` at root.
**Evidence:**
- `ls C:/Users/Administrator/motionmax` shows `archive/`, `deep_audit/`, `tasks/`, `clean.cjs`, `clean-rest.cjs`, `clean.py`, `fix_usage.py`, `forge-low-error.log`, `forge-low-output.log`.
- `package.json` `scripts` block references none of `clean.*` or `fix_usage.py`.
- Files contain hardcoded storytelling regex transforms (`clean.py:25-50`, `clean.cjs:10-15`) — strictly historical.
**Fix:** Solution: delete the four cleanup scripts; move planning markdown into `docs/archive/` (or out of the repo); add `tasks/` and `*.log` to `.gitignore`. Location: repo root. How: `git rm clean.cjs clean.py clean-rest.cjs fix_usage.py forge-low-*.log`; `git mv archive docs/archive`; add the patterns to `.gitignore`.
**Effort:** XS.

---

### MINOR

#### m-A1 — Stale comment references decommissioned components in shared utility
**Category:** Code Health / Documentation rot
**Severity:** Minor
**Issue:** `src/lib/csvExport.ts:5` — comment `Used by AdminLogs, AdminSubscribers, AdminApiCalls (and any future` — the listed components are the dead ones from C-A1; future readers will look for callsites that no longer exist.
**Evidence:** `src/lib/csvExport.ts:5`.
**Fix:** Solution: update comment to reference the new tab paths or delete the explanatory comment. Location: `src/lib/csvExport.ts:5`. How: replace with `Used by admin/tabs/Tab*.tsx via AdminUserCsvDownload, etc.` or delete entirely.
**Effort:** XS.

#### m-A2 — Two side-by-side autopost realtime panels duplicate the AdminQueueMonitor pattern by copy-paste
**Category:** Code Health / Architectural duplication
**Severity:** Minor (for now; will become Major if Autopost grows)
**Issue:** `src/pages/lab/autopost/AutopostHome.tsx:214` and `src/pages/lab/autopost/RunHistory.tsx:163` both contain comments stating "Mirrors the AdminQueueMonitor / RunHistory pattern" — implying the realtime channel + debounce logic was copy-pasted rather than abstracted into a hook.
**Evidence:** `src/pages/lab/autopost/AutopostHome.tsx:214` ("Mirrors the AdminQueueMonitor / RunHistory pattern."), `src/pages/lab/autopost/RunHistory.tsx:163` ("Realtime — copy of the AdminQueueMonitor pattern, debounced.").
**Fix:** Solution: extract a `useDebouncedRealtimeChannel(table, filter, debounceMs)` hook in `src/hooks/`; refactor both lab files plus the admin queue counterpart to consume it. Location: `src/pages/lab/autopost/{AutopostHome,RunHistory}.tsx` + `src/components/admin/_shared/useAdminRealtimeChannel.ts` (already a similar hook — reuse it). How: prefer extending the existing `useAdminRealtimeChannel.ts` so there is one realtime helper.
**Effort:** S.

#### m-A3 — `IntakeFrame.tsx` adds a context but `IntakeForm.tsx` keeps state local
**Category:** Code Health / State management consistency
**Severity:** Minor
**Issue:** `src/components/intake/IntakeFrame.tsx` declares `createContext(...)` to share intake state, but `IntakeForm.tsx` (the 1,571-line component) keeps the bulk of its state as `useState`/`useReducer` inside the form rather than going through the context. The context is only partially adopted.
**Evidence:** Repo grep for `createContext` returns only 5 files: `useAuth.ts`, `useGenerationPipeline.ts`, `intake/IntakeFrame.tsx`, `ui/sidebar.tsx`, `ui/carousel.tsx`. `IntakeForm.tsx` sits next to `IntakeFrame.tsx` but is not wired to it for the bulk of its state.
**Fix:** Solution: route step-level state through `IntakeFrame` context once `IntakeForm` is decomposed (see M-A4). Location: `src/components/intake/{IntakeFrame,IntakeForm}.tsx`. How: as steps are extracted, move shared fields (selectedMode, sourceText, voice, speakers) to context.
**Effort:** S — pairs with M-A4.

#### m-A4 — No documented frontend ADRs; architectural decisions are implicit
**Category:** Code Health / Architecture documentation
**Severity:** Minor
**Issue:** Per Arch persona Rule 1 ("Architecture decisions are documented in ADRs — no tribal knowledge"), but the project has no `docs/architecture/` ADR record. `docs/` exists at repo root but no Architecture Decision Records were found via `Glob "**/adr*"` or `**/decision*` (none surfaced in the directory listing). Folder structure (`hooks/` vs co-located, `pages/` thin vs thick), state strategy (TanStack Query + ad-hoc `useState`, no global store), and rendering strategy (SPA only) are all undocumented.
**Evidence:** `ls C:/Users/Administrator/motionmax` shows no `docs/architecture/` directory; `ls C:/Users/Administrator/motionmax/docs` not yet inspected, but no ADR files found in repo root scan.
**Fix:** Solution: create `docs/architecture/0001-folder-structure.md`, `0002-state-management.md`, `0003-component-co-location.md` capturing the decisions implied by current code. Location: `docs/architecture/`. How: 1-page ADR per topic, written by Arch + reviewed by BigBrain.
**Effort:** S (docs only).

#### m-A5 — Two contexts in `ui/` (sidebar, carousel) suggests vendored shadcn primitives are not all kept versioned consistently
**Category:** Code Health / Vendor drift
**Severity:** Minor / Polish
**Issue:** `src/components/ui/sidebar.tsx` and `src/components/ui/carousel.tsx` both create their own `createContext` — typical of the shadcn copy-paste model. Without a manifest of which shadcn primitives were vendored at which version, future shadcn upgrades will diff against an unknown baseline.
**Evidence:** Repo grep for `createContext` flags `ui/sidebar.tsx` and `ui/carousel.tsx`. `components.json` exists at repo root but no per-component version stamp.
**Fix:** Solution: when each shadcn primitive is added/updated, leave a header comment with the upstream commit hash. Location: `src/components/ui/*.tsx`. How: amend the shadcn add command to record the version in a docblock.
**Effort:** S.

---

### POLISH

#### p-A1 — Stylesheet sprawl in `src/styles/`: 7 token files but no shared `tokens.css`
**Category:** Code Health / Folder structure
**Severity:** Polish
**Issue:** `src/styles/` contains `admin-shell.css`, `admin-tokens.css`, `autopost-modal.css`, `autopost-tokens.css`, `billing-tokens.css`, `settings-tokens.css`, `support-tokens.css` — six per-feature token files but no common `tokens.css` defining the brand aqua/gold mentioned in the brief. Risk: brand colors (#14C8CC aqua / #E4C875 gold) get redefined per feature and drift.
**Evidence:** `ls src/styles` shows seven feature CSS files; no `tokens.css`. `tailwind.config.ts` exists but I did not verify central token definition within the time budget — flag for Vega/Optic.
**Fix:** Solution: extract brand colors into one `src/styles/tokens.css` (or Tailwind theme extend) and have feature `*-tokens.css` import-only feature-specific tokens. Location: `src/styles/`. How: create root tokens file referenced by `index.css`, audit each feature file for cross-feature duplicates.
**Effort:** S — coordinate with Vega/Optic.

---

## 2. Items unable to verify from static analysis (per brief instruction)

- Whether the worker `index.ts` retry/backoff strategy is correct or duplicated across handlers — would require reading the 1,603-line dispatcher with full attention; flagged size only.
- Whether bundle output actually includes the dead admin files (Vite tree-shakes when they are not imported); the *risk* is duplication left in source, not necessarily bytes shipped. Confirms via `vite build --report` not run.
- Whether `IntakeFrame` context is wired to a deeper provider tree than `IntakeForm` exposes — needs runtime inspection.
- Whether the two `Sidebar` implementations differ functionally or are merely stale copies — needs runtime/route inspection.

---

## 3. Production Blockers Table

| ID | Severity | Surface | Issue (one line) | Effort |
| --- | --- | --- | --- | --- |
| C-A2 | Critical | Worker + edge function + README + llms.txt | Storytelling product remnants persist after the migration; user-facing & worker code still branches on `"storytelling"`. | M |

(Per the audit rubric, only Critical+ entries that block ship gate this column. C-A1, C-A3, C-A4 are Critical for code health risk but are dead-source / oversize problems that do not block production functionally — promote at Jury's discretion.)

---

## 4. Top 10 Architecture Priority Fixes

| # | ID | Severity | Surface | Fix headline | Effort |
| --- | --- | --- | --- | --- | --- |
| 1 | C-A2 | Critical | Worker + edge function + README + `llms.txt` + `index.html` keywords | Complete the storytelling decommission across worker, edge function, public docs, and SEO meta. | M |
| 2 | C-A1 | Critical | `src/components/admin/Admin*.tsx` (11 files) | Delete the 11 unimported legacy admin components (~6,498 LOC). | S |
| 3 | C-A3 | Critical | `supabase/functions/generate-video/index.ts` | Break the 5,530-line edge function into modules under `_modules/`. | L |
| 4 | C-A4 | Critical | `worker/src/index.ts` | Extract a typed handler-registry; shrink the 1,603-line entrypoint. | M |
| 5 | M-A1 | Major | 14 callsites across editor / workspace / pages / hooks | Route every project-type comparison through `projectUtils.ts` (`isCinematic`, `isSmartflow`, `isDoc2Video`); kill inline `=== "smart-flow"` duals. | M |
| 6 | M-A4 | Major | `src/components/intake/IntakeForm.tsx` | Extract `IntakeForm` (1,571 lines) into per-step components driven by `IntakeFrame` context. | L |
| 7 | M-A5 | Major | `src/pages/VoiceLab.tsx` | Move VoiceLab logic into `src/components/voice-lab/*`; keep page file under 200 lines. | L |
| 8 | M-A2 | Major | `src/hooks/` vs `src/components/<feature>/` | Pick a hooks-location convention (recommend feature co-location); document in ADR. | M |
| 9 | M-A6 | Major | `src/hooks/useGenerationPipeline.ts` vs `src/hooks/generation/unifiedPipeline.ts` | Delete whichever pipeline orchestrator is no longer on the call path. | M |
| 10 | M-A7 | Major | Admin tabs + `Landing.tsx` + `LandingPricing.tsx` | Hide TODO admin actions behind feature flag; remove the placeholder "2,400+" testimonial number from marketing copy. | M |

---

## 5. Closing notes for Jury

- All findings are evidence-anchored to `file:line` or to multi-file repo greps reproducible with the queries quoted.
- I deferred two surfaces explicitly because the time budget could not cover them with my own depth: (a) `Editor.tsx` (481 lines) — within range, but its three editor co-located hooks (`useExport`, `useSceneRegen`, `useActiveJobs`) overlap with `src/hooks/generation/*`, and a careful pass requires runtime tracing; (b) `tailwind.config.ts` token centralization — strictly Vega/Optic territory.
- I did not audit Render.com worker beyond file shape and entrypoint size (Forge owns).
- Recommend Jury weight C-A2 as the lone Production Blocker from this category; promote others if cross-referenced by Trace (observability) or Forge (code-health on backend).
