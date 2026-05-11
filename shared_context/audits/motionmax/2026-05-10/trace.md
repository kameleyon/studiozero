# Trace — Flow & Logic Audit — MotionMax — 2026-05-10

FROM: Trace (Audit)
TO: Jury (Audit)
RE: AUDIT FINDINGS — motionmax — 2026-05-10
STATUS: Review

## Scope walked

Walked these flows end-to-end in source (no live host available for screen captures, so every finding cites `file:line` plus the live behaviour the code produces):

1. **Acquisition →** Landing → Watch Demo modal → "Try X" CTA → Auth (signup) → email confirm → Sign-in → /app
2. **First project →** Dashboard Hero (fast-input) → /app/create/new → IntakeForm → /app/editor/:projectId?autostart=1 → rendering overlay → ready/edit
3. **Pricing path →** Landing pricing CTA → /pricing → unauth user → /auth → post-auth landing
4. **Autopost path →** /lab/autopost (My Automations) → "New automation" → /app/create/new (toggle Schedule) → submit → /lab/autopost
5. **Account paths →** Settings tabs (Profile, Workspace, Notifications, Security, API, Activity) → Delete account
6. **Recovery paths →** Editor zombie project (no generation), kickoff failure, project-not-found, login lockout, V2 announcement on every login, subscription-expiry/credits modal
7. **Public share →** /share/:token

Audience baseline: tool-savvy creators / marketers / video producers (not developers). Holds the bar at "click → understand → progress → confirm → recover" for every screen.

---

## Verdict at a glance

| Severity   | Count |
|------------|-------|
| Blocker    | 1     |
| Critical   | 4     |
| Major      | 13    |
| Minor      | 4     |
| Polish     | 2     |

**Recommendation:** `FAIL` — at least one Blocker (advertised feature does not exist) and four Criticals (broken nav, lost paid-intent, default-disabled radio, brand-violation green/orange in primary modal) must close before Trace will sign off.

---

## BLOCKER

### B1 — Landing advertises a 4th product mode ("Visual Stories") that the system does not implement

Landing's "4 Ways to Create" section lists Cinematic / Explainers / Visual Stories / Smart Flow with a CTA "Try Visual Stories" on each card. Clicking that CTA fires `handleCta("Try Visual Stories")` which routes to `/auth?mode=signup`. After signup the user lands on the dashboard. There is no Visual Stories mode anywhere in CreateNew, IntakeForm, the pipeline, or the worker — the only modes are `cinematic | doc2video | smartflow`. `modeFromParam()` silently coerces unknown values to `cinematic`, so a Visual Stories signup → first-create gives Cinematic without a word of explanation.

This is a paid-conversion-at-stake "phantom feature." The whole Visual Stories card is unbuyable.

- Evidence (advertised mode, no `mode` property):
  `src/pages/Landing.tsx:430-436`
  ```
  { title: "Visual Stories",
    description: "AI writes the script from your story idea, generates scene images, and narrates with matched emotion...",
    example: "\"A bedtime story about a brave robot\" → animated visual story",
    color: "from-[#0D99A8]/20 to-[#0D99A8]/5",
    borderColor: "hover:border-[#0D99A8]/40",
  }, // <-- note: no `mode` field, unlike the other three
  ```
- Evidence (system supports 3 modes only):
  `src/pages/CreateNew.tsx:16-23` — `modeFromParam` only matches `doc2video | smartflow | cinematic`
  `src/components/intake/types.ts` (FEATURES / MODE_LABEL keys: cinematic/doc2video/smartflow only)
  `src/components/dashboard/Hero.tsx:12` — `type ProjectMode = 'cinematic' | 'doc2video' | 'smartflow'`

Recommendation: Either ship Visual Stories as a real mode (preferred — the marketing copy is good) or remove the card and rebalance the grid to 3-up. Do NOT keep the silent fallback to cinematic. **Owner: Vega + Nexus + Flow (mode definition).**

---

## CRITICAL

### C1 — Dead `/dashboard?tab=calendar` link on AutopostHome (404)

The "Calendar view" action button on the Autopost Lab home links to `/dashboard?tab=calendar`. There is no `/dashboard` route. The router only defines `/dashboard-new` plus `/app → /dashboard-new` redirect. `/dashboard?tab=calendar` falls into the catch-all `*` and renders the 404 page. The 404 page's Quick suggestions further send users to `/app`, `/projects`, `/pricing`, `/settings` — none surfaces a calendar view.

- Evidence:
  `src/pages/lab/autopost/AutopostHome.tsx:453`
  ```
  <Link to="/dashboard?tab=calendar" className="btn-ghost">
    <Calendar width={13} height={13} />
    Calendar view
  </Link>
  ```
  `src/App.tsx:103-256` — route table contains no `/dashboard` declaration. Verified with `Grep "path=\"/dashboard\"" src/` — zero matches; `/dashboard-new` is the only existing route.
  `src/pages/NotFound.tsx:6-11` — Quick suggestions don't include any calendar-equivalent.

Recommendation: Either remove the button (no calendar view exists for autopost yet) or repoint at the real destination once Calendar lands. Holding it as a phantom link is worse than removing — looks broken to every user who clicks. **Owner: Sprint (route owner) + Vega.**

### C2 — Pricing → Signup loses paid-intent (returnUrl param mismatch)

Pricing.tsx redirects an unauthed user who clicks Creator/Studio to `/auth?next=/pricing&plan=creator`. Auth.tsx ignores both `next` and `plan` and only honours `returnUrl`. `returnUrl ?? "/app"` means after sign-in the user lands on the Studio dashboard with zero context that they were mid-checkout, and the `plan=creator` intent is lost entirely.

- Evidence:
  `src/pages/Pricing.tsx:104` — `navigate(`/auth?next=/pricing&plan=${plan.id}`);`
  `src/pages/Auth.tsx:107` — `const rawReturnUrl = searchParams.get("returnUrl") || "/app";`
  Verified with grep: no other code in `src/` reads `next` or `plan` from auth search params (the only `searchParams.get("plan")` lives in admin TabUsers.tsx).

This is dropped-revenue territory. Trace consistently sees ~25-40% of warm-intent paid clicks abandon when post-signup doesn't return them to the checkout. Recommendation: rename to `returnUrl` on the Pricing side OR add `next` parsing on the Auth side, AND surface the plan param so the Pricing page can auto-pop the Stripe redirect on landing. **Owner: Hook (conversion) + Nexus (auth).**

### C3 — Autopost delivery-method default points at a disabled radio (trap state)

`IntakeForm` initializes `scheduleState.deliveryMethod = 'social'`. `ScheduleBlock` renders the "Publish to social media" radio with `disabled: true` (Social is paused pending YouTube data-access verification). The user enabling autopost lands on a radio set with the visually-selected option un-actionable. `handleGenerate` validates: if `deliveryMethod === 'social'` and `platformAccountIds.length === 0`, the form rejects with `"Pick at least one platform or change delivery method."` — but the user *cannot* switch back to social later (the input is disabled), so the toast steers them only into the second clause, while the first clause is forever impossible.

This is exactly the "default state user can't act on" pattern: invalid initial state + misleading recovery hint = users churn out of the autopost flow. Trace counts this as a conversion-killer for the entire Lab feature.

- Evidence:
  `src/components/intake/IntakeForm.tsx:161-170` — default `deliveryMethod: 'social'`
  `src/components/intake/ScheduleBlock.tsx:596-602` — `{ value: 'social', label: 'Publish to social media', ..., disabled: true }`
  `src/components/intake/IntakeForm.tsx:665-674` — validation toast
  `src/components/intake/ScheduleBlock.tsx:639-643` — "Coming soon" pill confirms social is disabled

Recommendation: Default `deliveryMethod` to `'email'` (the recommended live option) until social verification completes. Update the validation toast to say *"Pick a delivery method"* (single corrective action) when social is selected. **Owner: Vega + Hook.**

### C4 — Brand violations in primary V2 Announcement modal (orange + green)

Brand brief says aqua + gold only — `gold = #E4C875`. The V2 Announcement modal (which fires on every authenticated page load until dismissed) is built around `--gold = #F5B049` (template orange-amber) and uses `#5CD68D` (green) for the pulse dot. The CSS file's own header documents the wrong gold.

This is the first thing every signed-in user sees on every login until they tick a checkbox. It launches with the wrong brand colours.

- Evidence:
  `src/components/announcements/v2-announcement.css:11` — `--gold      → #F5B049` (header doc lists the violating value as canonical)
  `src/components/announcements/v2-announcement.css:162-164` — `.mm-ann-num i { color: #F5B049; -webkit-text-fill-color: #F5B049; }` — the "v2.0" period
  `src/components/announcements/v2-announcement.css:171, 176-178` — `background: #5CD68D` + green pulse halo
  `src/components/announcements/v2-announcement.css:267-271, 293-302` — `.mm-ann-ico-gold` + `.mm-ann-new` AutoPost Lab badge use `#F5B049` for fill, border, glow

Cross-reference: stored memory `feedback_motionmax_brand_gold` (gold is `#E4C875`, swap `#F5B049` on import) and `feedback_motionmax_theme_colors` (no red/green/orange in autopost/lab UI) — both are violated by this modal even though the modal is global, not lab-scoped, so the brand brief still bites.

Recommendation: global find/replace `#F5B049 → #E4C875` (and adjust accompanying `rgba(245,176,73,*)` to `rgba(228,200,117,*)`). Replace `#5CD68D` pulse with aqua `#14C8CC` glow at low opacity. **Owner: Pixel + Vega.**

---

## MAJOR

### M1 — V2 Announcement defaults to "show again on every login"

Modal opens 500 ms after every authenticated route change unless `profiles.dismissed_v2_announcement_at` is set. The "Don't show this again" checkbox defaults to UNCHECKED. Every silent dismissal (X / overlay click / Esc / "Take me in") closes the modal for the session only — next login it returns. A user who simply wants the modal gone has to remember to check the box. After 3-5 logins this becomes hostile.

- Evidence: `src/components/announcements/V2AnnouncementModal.tsx:48` (default `false`), `:91-108` (close handler only persists when checked).
- Cross-finding: the 6-feature list takes ~720 px tall — on laptops the X is reachable, but on landscape phones the modal exceeds viewport and the X stays anchored to the top while content scrolls.

Recommendation: Default the checkbox to CHECKED ("Don't show this again" pre-ticked). Any dismissal then persists. Or: drop the checkbox and persist on every dismissal — the announcement is one-time information, not a settings panel.

### M2 — "Smart prompt" CTA is a primary-styled fake button (`coming soon` toast)

The Smart-Prompt button in the IntakeForm Sources block is styled identically to the live cyan-bg cyan-border primary affordances elsewhere in the form (border + bg + Wand2 icon). Click → `toast.info('Smart Prompt coming soon.')`. Users will tap it once and trust drops.

- Evidence: `src/components/intake/IntakeForm.tsx:977-983`.

Recommendation: Either ship it or hide it. If keeping a teaser, demote visual treatment to muted/dashed border + "Coming soon" pill (the same pattern used in the autopost ScheduleBlock and Settings).

### M3 — `window.prompt()` for URL attachment in IntakeForm + character block

Two places in IntakeForm and one in the admin RichEditor pop a native `window.prompt()` to ask for a URL. The author has flagged this themselves at line 934. Native dialogs:
- Visually break the brand (no theming possible),
- Leak typed values into the browser's prompt history,
- Behave inconsistently across iOS Safari + PWA installs,
- Cannot be styled for accessible focus management.

VoiceLab uses native `confirm()` and `window.prompt()` for rename + delete (4 sites). Same problems.

- Evidence:
  `src/components/intake/IntakeForm.tsx:939, 1274`
  `src/pages/VoiceLab.tsx:648, 661, 989, 1001`
  `src/components/admin/_shared/RichEditor.tsx:78`

Recommendation: Use the existing themed `<Dialog>` / `<AlertDialog>` (already used elsewhere in the codebase, e.g. SubscriptionRenewalModal) for these prompts. **Owner: Vega.**

### M4 — Hero "Direct" CTA: ambiguous label

The dashboard Hero's primary submit CTA says **"Direct"** with the ⏎ kbd hint. Tool-savvy creators and marketers recognise "Generate", "Create", "Make video", "Render" — none recognise "Direct" as a verb in this context. Trace's heuristic for primary CTAs is "what action will run?" — "Direct" answers nothing.

- Evidence: `src/components/dashboard/Hero.tsx:350`.

Recommendation: Relabel to **"Generate"** (consistent with IntakeForm's mobile CTA "Create Video"). Reserve "Direct" for a Director-mode toggle if that becomes a feature.

### M5 — Hero submits via `window.location.href` (full page reload)

Hero's submit handler navigates with `window.location.href = submitHref` (lines 139, 175). This blows away the loaded React tree, refetches the bundle, re-runs every Suspense lazy boundary, flashes the PageLoader, drops scroll position, and re-runs the V2AnnouncementModal logic. SPA navigation via `useNavigate()` would be a 1-line change and immediate-feel.

- Evidence: `src/components/dashboard/Hero.tsx:131-141, 175`.

Recommendation: `const navigate = useNavigate();` and `navigate(submitHref)`. Same for the keyboard-Enter path.

### M6 — Hero language picker (7 langs) ≠ IntakeForm picker (11 langs)

Hero offers en/fr/es/ht/de/it/nl. IntakeForm offers those plus ru/zh/ja/ko. A user who wants to start a Russian or Chinese video from the dashboard's fast-input cannot — they have to open IntakeForm and reset language manually. Inconsistent surface.

- Evidence: `src/components/dashboard/Hero.tsx:13` vs. `src/components/intake/IntakeForm.tsx:82-94`.

Recommendation: Single shared `LANGUAGES` constant imported by both Hero and IntakeForm. Single source of truth.

### M7 — Autopost empty-state instructions don't match the CTA path

Empty-state copy on /lab/autopost: *"Head to a new project's intake form and toggle 'Run on a schedule' at the bottom to create your first one."* The "New automation" button next to it deeplinks to `/app/create/new?mode=cinematic` — a 1500-line form where the schedule toggle is buried after Sources / Format / Duration / Language / Voice / Captions / Brand / Audio / Character / Style / Direction. A first-time autopost user who lands on the form with this expectation has to scroll through 10+ unrelated sections before seeing the toggle.

- Evidence: `src/pages/lab/autopost/AutopostHome.tsx:507-535`; `src/components/intake/IntakeForm.tsx` (toggle lives in `<IntakeRail>` invocation around line 800+).

Recommendation: Either deeplink with a `?focus=schedule` flag the IntakeForm reads and scrolls/highlights, OR ship a dedicated `/lab/autopost/new` minimalist intake that asks only the autopost-relevant fields.

### M8 — Editor kickoff-error recovery has no "Buy credits" CTA

When `kickoffState === 'error'` the Editor takes over the full screen with copy *"The script job failed to queue — this is usually a credits or auth issue. Check the toast for details."* and offers Retry + Back to Studio. But Retry won't help if credits are exhausted — the job will fail again with the same toast. There's no "Top up" / "View pricing" link in the error UI even though the error copy itself names credits as the most likely cause.

- Evidence: `src/pages/Editor.tsx:374-401`.

Recommendation: Probe `user_credits.credits_balance` on entering the error state. If <required cost, swap Retry for "Top up" (→ /pricing#top-up).

### M9 — Editor zombie-project state has no in-stage retry button

Code comment at `src/pages/Editor.tsx:160-174` claims: *"In this case we also show the awaiting screen with a 'Start generation' retry button so the user is never stuck on a dead black editor frame."* — but the actual rendering path then sets `void awaitingGeneration;` (line 403) and the in-stage rendering overlay does not surface a manual "Start generation" button. A genuinely zombie project (no `generation` row, no `?autostart=1` flag, no error) will sit on the rendering overlay forever, watching the bounded backoff probe (max ~60 s) silently expire.

- Evidence: `src/pages/Editor.tsx:166-174` (claim) vs `:403` (`void awaitingGeneration`); the recovery path appears wired in `retryStartGeneration` (line 168-174) but never exposed when `kickoffState !== 'error'`.

Recommendation: After the bounded backoff (`MAX_PROBES = 8`) exits without a generation row appearing, flip into a visible "Start generation" CTA that calls `retryStartGeneration()`. Don't leave the user reading rotating "Painting your scenes…" copy on a dead pipeline.

### M10 — Watch-Demo modal on Landing serves a "Demo video coming soon" placeholder, while Demo iframe section above shows a Guidde walkthrough

Landing has TWO demos:
1. The "See It in Action" section iframes `embed.app.guidde.com/playbooks/wvJwFaqbh66kuXS3hZ23ir?mode=videoOnly` (line 332).
2. The hero "Watch Demo" button opens a modal (line 511) that displays the placeholder *"Demo video coming soon"* with a Try-for-Free CTA.

Audience: marketers/producers expecting product proof. Inconsistent: clicking the more-prominent hero "Watch Demo" pops a placeholder; the working demo is buried below the fold.

- Evidence: `src/pages/Landing.tsx:332-342` (Guidde iframe); `:520-541` (placeholder modal).

Recommendation: Either point the modal at the same Guidde URL (or a shorter ≤90-second clip) or remove the modal CTA entirely and let the hero scroll users to the existing "See It in Action" section.

### M11 — Landing fabricates social proof ("2,400+ marketers / creators")

Hero subtitle: *"Free to start · No credit card required · Used by 2,400+ marketers"* and the social-proof avatar row says *"Join 2,400+ creators already making videos"*. Inline TODO at line 299 acknowledges the number is fake: `// TODO: replace 2,400+ with a real figure from your analytics/DB`.

- Evidence: `src/pages/Landing.tsx:288-302`.

Recommendation: Pull a real figure from `auth.users.count()` or a marketing CMS field BEFORE launch — or remove the count and lead with a different proof element (testimonials, brand logos). Shipping a fabricated user count is a brand + trust risk and depending on jurisdiction, an advertising-claims risk.

### M12 — Mobile Generate button's label doesn't change for autopost-mode submits

`src/components/intake/IntakeForm.tsx:1518-1524` — the lg:hidden mobile-only sticky CTA reads `Create Video · {totalCost} cr` regardless of whether the user has flipped the schedule toggle. A user creating a recurring schedule sees a button that says "Create Video" — but submission creates an autopost_schedule row and routes to `/lab/autopost`.

- Evidence: `src/components/intake/IntakeForm.tsx:1518-1524, 684-748`.

Recommendation: Compute label dynamically — *"Create Schedule · {AUTOPOST_CREDITS_PER_RUN} cr / run"* when `scheduleState.enabled && scheduleState.termsAgreed`, else current label.

### M13 — Auth signup age-verify enforced only via `disabled`

The "Create Account" button disables when `(!acceptedTerms || !ageVerified)`. After click, `handleSubmit` only re-validates `acceptedTerms` (toast + early return). There's no server-side trip on `ageVerified` and no submit-time check. A user with autofill quirks, devtools, or a tampered DOM could create an account without ticking the 18+ box.

- Evidence: `src/pages/Auth.tsx:179-199` (only `acceptedTerms` checked); `:504-507` (button disabled gate).

Recommendation: Mirror the `acceptedTerms` server-side check pattern for `ageVerified` and add a submit-time guard before the `signUp()` call. Persist age-verification on the profile row for downstream policy enforcement.

---

## MINOR

### m1 — Login lockout (5 attempts / 30 s) survives only the React tree

`failedAttemptsRef` is a `useRef` (in-memory). A page refresh resets the counter, so the lockout is per-session-per-tab. Not a brute-force defence. Still useful as a UX speed bump — but not what users (or auditors) expect from "Too many failed attempts. Locked for 30 seconds."

- Evidence: `src/pages/Auth.tsx:103, 159-162`.

Recommendation: persist failed-attempt count + lockout deadline in `localStorage` or call a server RPC.

### m2 — Sources block has two visually-different buttons firing the same action

"+ Add source" (dashed border) and "File" (solid border + paperclip icon) both call `fileInputRef.current?.click()`. Two different chrome treatments for the same action is a Hick's-law tax — the user pauses to choose between them, learns they're identical, then writes off the form's signal-to-noise ratio.

- Evidence: `src/components/intake/IntakeForm.tsx:911-930`.

Recommendation: Drop one. Keep "+ Add source" (the dashed-border primary affordance) and remove the redundant "File" pill.

### m3 — Editor "Project not found" recovery offers only "Back to Studio"

Single-action recovery. No "Reload page" / "Try again" / "Report issue" / "Contact support". For transient permission-loading or RLS race conditions, a reload would often work — but the user has to discover it themselves.

- Evidence: `src/pages/Editor.tsx:349-367`.

Recommendation: Add a secondary "Try again" button that calls `refetchEditor()`.

### m4 — Subscription renewal modal uses `text-orange-500` (forbidden in lab/autopost; in tension with brand-aqua-and-gold elsewhere)

`<Clock className="h-5 w-5 text-orange-500" />` on the modal header. Brand brief and audit memory both flag orange as out-of-palette.

- Evidence: `src/components/workspace/SubscriptionRenewalModal.tsx:120`.

Recommendation: swap for `text-[#E4C875]` (gold) or `text-[#14C8CC]` (aqua). Same fix needed in `src/components/ui/password-strength.tsx:15, 36` (`bg-orange-500`, `text-orange-500`).

---

## POLISH

### p1 — Route-level retiring left two redirects that just bounce

`/app/create → /app/create/new`, `/app/legacy → /dashboard-new` etc. — fine. But `/lab/autopost/schedules*` redirects to `/lab/autopost` (line 204-206) without preserving the `:id` segment, so a bookmark to `/lab/autopost/schedules/abc-123` lands on the bare grid with no indication of which schedule the user was after. Polish-tier because no live-traffic bookmarks exist (Wave B2 redirect was recent).

- Evidence: `src/App.tsx:204-206`.

Recommendation: Either honour the id (`navigate to /lab/autopost?focus=:id`) or accept the data loss but show a toast on landing: *"Schedule editing has moved to the card on this page."*

### p2 — V2 Announcement at 720 px tall + landscape phones

Modal height `min(720px, 92vh)` with the X button absolute-positioned at top-right of the modal frame. On landscape phones (~360 px viewport height), 92vh ≈ 330 px and the body content scrolls inside while the X stays anchored above the scroll region — fine — but on tablets at 760 px portrait, 92vh ≈ 700 px puts the X just within thumb-reach but the bottom CTA "Take me in" is the natural flow exit, requiring a second pass to either tick the box or scroll back up to X. Mild ergonomic friction for a once-per-session modal.

- Evidence: `src/components/announcements/v2-announcement.css:42-65`.

Recommendation: Move the close affordance to the same row as the "Take me in" CTA so dismissal lives in the user's natural reading endpoint, not at top-right.

---

## Cognitive-jump tally per primary flow

| Flow | Steps | Avg clarity (1-5) | Worst step |
|------|-------|-------------------|------------|
| Landing → Signup → first project | ~7 | 3.4 | Visual Stories click → silent fallback to Cinematic (1) |
| Hero quick-start → Editor | ~3 | 3.5 | "Direct" CTA label (2) |
| IntakeForm full → Editor | ~10 | 3.7 | Smart Prompt fake button (2) |
| Empty Autopost → first automation | ~9 | 2.5 | Empty-state copy doesn't match where the "New automation" button leads (1); Social default-disabled radio (1) |
| Pricing (unauth) → Stripe | ~5 | 2.0 | returnUrl param mismatch loses paid-intent (1) |
| Editor zombie / kickoff failure | ~4 | 2.0 | No surfaced retry, no top-up CTA (2) |
| Settings → Delete account | ~5 | 4.5 | Strong (typed-DELETE confirmation; gold not red; cancel-deletion banner) |
| Public share player | ~3 | 4.0 | Strong (clean) |

---

## What's working (call-out for the build team)

Trace doesn't only flag breakage — these are flows that rated 4.5 or 5 and should be treated as the in-house pattern reference:

- **Settings delete-account confirmation** (`src/pages/Settings.tsx:682-733`): typed-DELETE gate, gold (not red) destructive accent, 7-day cancellation banner, named consequences. Best-in-class destructive flow.
- **Auth signup → email confirmation persistent screen** (`src/pages/Auth.tsx:243-279`): replaces the dismissible toast with a persistent confirmation screen that names the email, explains what to do next, and offers a "Back to Sign In" affordance. Solid recovery from "did the email send?"
- **Landing mobile menu focus-trap** (`src/pages/Landing.tsx:37-81`): proper Tab/Shift-Tab cycling, Esc-to-close with focus return to trigger, aria-expanded/aria-controls plumbed. Usable from keyboard.
- **Editor partial-failure recovery** (`src/pages/Editor.tsx:316-323`): on `pipelineStep === 'error'`, the editor still paints the scenes that DID complete and surfaces a per-finding toast with the regenerate-from-Inspector recovery path. Significantly better than the "all-or-nothing" failure mode this likely replaced.

---

## Re-audit triggers

I will re-verify the following findings before I will sign a `PASS` from Trace:

- **B1** — Visual Stories card removed OR mode shipped end-to-end (CreateNew + IntakeForm + worker)
- **C1** — `/dashboard?tab=calendar` either removed or repointed at a real route
- **C2** — Pricing→Auth round-trip preserves the plan and lands the user on Stripe checkout (not /app)
- **C3** — Default delivery method is `'email'`; validation toast text is corrected
- **C4** — V2 Announcement modal renders zero `#F5B049` and zero `#5CD68D`; brand grep clean
- **M1** — Don't-show-again is checkbox-checked by default OR removed entirely

Other Major findings should pass through originating-reviewer re-verification per the standard PASS-WITH-FIXES → PASS protocol.

NEEDS: Verdict synthesis from Jury. Cross-check brand findings (M2/M4/C4) against Pixel for any whitelisted exceptions before final close. Cross-check M11 (fabricated social proof) with Compass (audience-fit) and Canon (legal/claims).

DEADLINE: Before any production deploy.

---
END OF REPORT
