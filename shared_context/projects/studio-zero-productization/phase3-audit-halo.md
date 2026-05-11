# Phase 3 Audit — Halo (Independent Accessibility Reviewer)

**Auditor:** Halo
**Phase:** BUILD_FLOW Phase 3 — Information Architecture (independent a11y conformance pass)
**Standard:** WCAG 2.2 Level AA (PRD §14.6 + HC1–HC10)
**Subject:** Optic's sitemap, empty-states, heuristic-budget + Trace's 7 user-flow files
**Date:** 2026-05-11
**Phase-3 exit gate (BUILD_FLOW.md):** *every navigation pattern has keyboard equivalent + screen-reader pattern documented*
**Prior verdicts:** v0.3 FAIL → v0.4 PASS WITH FIXES → Phase 2 Direction A v0.1.1 PASS WITH FIXES (focus-ring + 6 new SCs added).

---

## TL;DR verdict

**PASS WITH FIXES.**

The IA artifacts are unusually rigorous — Optic and Trace cite SC numbers by hand and (mostly) get them right. The Phase-3 exit gate (keyboard + SR pattern documented for every nav pattern) **clears** at the artifact level. But three load-bearing patterns ship with under-specified a11y behavior that will silently fail at Phase 4 build if not nailed down now:

1. **Modal-as-route focus choreography** is asserted without specifying focus-return on close (back vs Esc vs X).
2. **`role="status"` is over-applied** — at least 4 surfaces use it where the SR primitive is wrong.
3. **Routes-without-back-paths** exist in the onboarding round-trip (GitHub install + Stripe Checkout return).

None of these block Phase 3 sign-off provided the fixes land before Phase 4 implementation. **Halo does NOT block Phase 4 start** — but the FIX list below is binding, not advisory.

---

## Per-artifact findings

### A1. `sitemap.md` — Optic v0.1

#### A1-1. CRITICAL — Modal-as-route close-pattern under-spec'd.
**SC 2.1.2 No Keyboard Trap, SC 2.4.3 Focus Order, SC 4.1.3 Status Messages, SC 2.4.11 Focus Not Obscured.**

The sitemap defines four "modal-as-route" surfaces (`/app/cli/offline`, `/app/billing/token-budget-exceeded`, `/app/billing/free-tier-exhausted`, and the S-DEL confirm at `/app/settings/account/delete`). The pattern note (line 292) asserts the back-button works (H3). It does **not** specify:

- **Where focus lands on open.** Empty-states ES-CLI-OFFLINE says "focus moves to the H2 on open" — good. The other three (payment-required states) do not state this. **Must extend to all four.**
- **Where focus returns on close**, and which close mechanism the user used:
  - **Back button** → focus must return to the trigger element on the parent route. The URL-routing model does not preserve trigger context across SPA navigations by default; this needs a `from` query param or a focus-return ref written to history state.
  - **Esc key** → must be operable (SC 2.1.2); spec says ESC closes for ES-CLI-OFFLINE only. Must apply to all modal-as-routes.
  - **X / close button** → must be ≥ 24×24 (SC 2.5.8), keyboard-operable, and AT-labeled "Close".
- **Screen-reader announcement on close.** When a modal-as-route closes, the URL changes. SR users need an announcement that they've navigated back to the parent. The current spec says `role="status"` on the verdict; nothing says how route-back announces. Without an `aria-live` on the parent's `<h1>` or a programmatic focus to a non-tabbable target, SR users will hear silence and won't know the modal closed.

**Fix required:** add a paragraph to the sitemap pattern note (line 292) and/or to a new section in empty-states.md specifying:
> Modal-as-route open: focus moves to dialog `<h2>` (SC 2.4.3). Trigger element ref stored on history state. ESC, X-button (≥ 24×24, aria-label="Close"), and browser-back all close. On close: pop to parent route, programmatically move focus to the original trigger element OR (if no trigger context) to parent `<h1>` (which carries `tabindex="-1"`). Route change announced via `aria-live="polite"` region on the parent shell that publishes the parent `<h1>` text. Watch SC 2.4.11: if the parent has a sticky bar, scroll-padding-top must be applied on focus.

This is the **single largest a11y risk** in Phase 3. Modal-as-route is a beautiful pattern; it traps SR users if the close choreography isn't nailed.

#### A1-2. MAJOR — Sidebar 6→4 collapse offloads to header bell + footer link without target-size guarantee.
**SC 2.5.8 Target Size, SC 2.4.4 Link Purpose.**

HB-9a recommends moving Notifications to a header bell and Help to a footer link. Halo Direction-A tokens lock 24×24 hit areas, but the sitemap doesn't state whether:

- The header bell icon button reserves a 24×24 hit area even if the bell glyph is smaller. **Fix:** state in sitemap §"Notifications": *"Bell button reserves 24×24 CSS px hit area; visual glyph may be smaller."*
- The footer Help link carries `aria-label` distinct from "Help" if other "Help" links exist on the page (SC 2.4.4 Link Purpose in Context). **Fix:** specify `aria-label="Help & documentation"` or scoped within `<footer>` with `<nav aria-label="Footer">`.

#### A1-3. MAJOR — Onboarding round-trip back-paths not enforced.
**SC 3.2.5 Change on Request (AAA; AA-equivalent via SC 3.2.1/3.2.2), SC 2.4.3 Focus Order.**

BigBrain ruled `mode pick → GitHub install`. The sitemap maps:
- `/auth/install/github` (GitHub App install callback) — `external → /app/projects/new`.

A user who hits browser-back from `/auth/install/github` mid-redirect will land **on the GitHub installation page on github.com**, not back at `/onboarding/mode`. This is a focus-management trap and an a11y degradation (lost context, lost focus, anonymous tab to a third-party host). **Fix:** sitemap must explicitly call out that GitHub's hosted page is the back-edge and document the recovery: when the user returns to Studio Zero from any path other than the callback, the app routes them back to `/onboarding/mode` with the prior-step's state restored (SC 3.3.7 Redundant Entry — already declared but not flow-mapped here).

Same issue applies to `/onboarding/managed → Stripe Checkout → /app/billing/checkout` (return URL). Stripe Checkout hosts external focus during the round-trip.

#### A1-4. MAJOR — Public verdict share `/v/<short-id>` a11y conformance not declared.
**WCAG 2.2 AA applies; SC 1.3.1, 2.4.6, 4.1.2.**

The sitemap lists `/app/audits/[run-id]/share/[share-token]` but doesn't speak to the publicly-anonymous `/v/<short-id>` view (referenced in verdict-to-upsell-loop.md V2c). Anonymous traffic to a public page deserves the same AA bar — and the CLI watermark per HC10 must render identically across the public share (HC9 Consistent Identification).

**Fix:** add `/v/<short-id>` to the sitemap explicitly with a row stating: *"WCAG 2.2 AA applies. `<h1>` carries verdict text; `role="status"` per HC1; CLI watermark renders with `aria-describedby` per HC10; reflow at 320 CSS px (SC 1.4.10)."*

#### A1-5. MINOR — Cookie consent banner placement claim leaks into a11y posture.
**SC 2.4.11 Focus Not Obscured, SC 2.1.2 No Keyboard Trap.**

Sitemap line 332 asserts: *"the banner is a non-modal landmark at the bottom of `<body>` so it doesn't trap focus (SC 2.1.2) and doesn't obscure focused inputs (SC 2.4.11 Focus Not Obscured Minimum)."* Correct in principle. The 320 CSS px reflow case is not addressed: a 3-button banner at the bottom of a 320px viewport with a tall message often **does obscure** the focused element on small screens. **Fix:** state in sitemap §"Cookie/consent gating" that on viewports ≤ 480 CSS px, the banner sits above a 16px scroll-padding-bottom guard so focus rings remain visible (SC 2.4.11).

---

### A2. `empty-states.md` — Optic v0.1

#### A2-1. CRITICAL — `role="status"` is misapplied to route-state surfaces.

Optic asserts `role="status"` on transient states, then applies it to:
- **ES-AUDIT-VERDICT-ZERO-FINDINGS** — verdict `<h1>` carries `role="status"` per HC1. **This is correct** because the verdict event is a transient state change on SPA finalization.
- **ES-PAYMENT-MANAGED-BUDGET** — `<dialog>` `role="status"`. **WRONG.** A modal-as-route is a **route**, not a region update. The user navigated here; `role="status"` will cause SRs to re-announce on every focus enter. Use the `<dialog>` semantics + focus-to-`<h2>` pattern; no `role="status"`.
- **ES-PAYMENT-LAPSED** — banner "uses `role="status"` site-wide once dismissed-with-undo." OK if banner is *added* dynamically to the DOM after dismiss (then `role="status"` announces the undo affordance). If pre-rendered, it shouldn't have `role="status"` because nothing transient happened.
- **ES-CLI-OFFLINE** — header chip with `aria-live="polite"` only on state transition. **Correct.** Then static. **Keep.**

**Fix required:** rewrite the cross-cutting a11y note (line 332) to distinguish:
> `role="status"` is for **content that appears or changes in place** inside the same route. `<dialog>` is for modal surfaces (including modal-as-route). Use either, not both. The verdict-screen `<h1>` is an exception — it carries `role="status"` because the SPA renders the same route URL pre- and post-finalization, and the verdict text is the load-bearing state-change announcement (PRD §7.2 Step D + HC1).

#### A2-2. MAJOR — `aria-live` throttle rate confirmed but `polite` vs `assertive` posture under-specified.
**SC 4.1.3 Status Messages, SC 2.2.1 Timing Adjustable, HC2.**

ES-AUDIT-RUNNING declares throttle ≤ 4 updates/sec (token-locked at `motion.rules.live_region_throttle_per_sec=4`). Halo Phase-2 locked this. Phase 3 must add:

- **`polite` is the right level** for per-agent phase chips. `assertive` would interrupt SR users' current reading position and is reserved for ES-AUDIT-FAILED-IRRECOVERABLY (which correctly uses `role="alert"`).
- **Cumulative announcement budget:** 4 updates/sec × N reviewers (6 reviewers in Comprehensive depth) = up to 24 announcements/sec at the region wrapper level. **Fix:** the throttle must apply **per region**, not per reviewer row. Spec the implementation: one `aria-live="polite"` region wraps all reviewer rows; a coalesced summary message ("Optic finished. 2 reviewers running. 4 minutes left.") fires at most 4×/sec. Per-row chip changes are visual-only; SR users hear the coalesced summary.

This is a Phase-3-binding addendum because if Phase 4 builds 6 independent live regions, SR users get a screaming firehose. The coalescing pattern must be specified now.

#### A2-3. MAJOR — ES-429 countdown clarification is correct; ES-CLI-OFFLINE chip transition under-specified.
**SC 2.2.1, SC 4.1.3.**

ES-429 correctly avoids live-region countdown announcements. Good. ES-CLI-OFFLINE says the chip uses `aria-live="polite"` on transition then becomes static — but doesn't specify the SR-friendly transition mechanism. **Fix:** implementation must be *"insert into a dedicated live region, allow SR to announce once, then either remove the live region or set `aria-live="off"` to prevent re-announcement on focus changes."* The current copy implies static element with aria-live attribute toggled, which works but should be stated.

#### A2-4. MINOR — Empty-state focus-target spec inconsistent.

ES-DASHBOARD-FIRST-RUN says: *"Skip-to-content target = primary CTA."* This conflates two patterns:
- The skip link target should be `<main>` or the `<h1>` (SC 2.4.1).
- The default focus on route entry can be the `<h1>` (with `tabindex="-1"`) or the first interactive control.

**Fix:** specify: *Skip-link target = `<main id="main">`. On route load, focus moves to `<h1 tabindex="-1">` for context. Primary CTA receives focus on Tab.* Conflating skip-target with CTA target is a minor doc error that will propagate to implementation.

---

### A3. `heuristic-budget.md` — Optic v0.1

#### A3-1. MAJOR — Settings flat-at-MVP question (Trace open question) — Halo answer.

The prompt asks: *is a flat settings IA at 9 sub-pages keyboard-navigable in <7 keystrokes? Or does it need a settings landing with focus management on sub-page entry?*

**Halo answer: the current 3-group structure (HB-4) is correct; flat-9 would fail SC 2.4.1 Bypass Blocks at scale.**

Tab-count math from `/app/settings`:
- 3 group headings + (5 + 3 + 7) panels = 15 tabbable targets if rendered flat as a single nav list.
- Tab-to-Cancel-Subscription (worst-case, deepest item) = up to 14 tabs from page entry.

The 3-group accordion-or-rail with `aria-current` per panel keeps each surface at ≤ 8 tabs (group nav 3 + within-group panels 5–7). **Keep HB-4 as specified.** Trace's open question is resolved: do not flatten.

**Additional fix:** sub-page entry from `/app/settings` should programmatically move focus to the sub-page `<h1>` (with `tabindex="-1"`), not leave focus on the rail. This is the SR equivalent of "you arrived at the new page." Settings-and-account-management.md does not currently specify this; **add it**.

#### A3-2. MINOR — Pricing table semantic structure assertion.

HB-5 declares: *"pricing table renders as semantic `<table>` with `<th scope>`."* Good. 7-tier table at 320 CSS px reflow (SC 1.4.10) — Halo Phase 2 already locked the responsive scale concern (A-5 in phase2 audit). **Cross-reference fix:** add a note to HB-5 that the 7-tier rendering at 320 px stacks cards vertically (table-to-card responsive pattern) with `<dl>` semantics per stacked card, and that the "Most popular" badge per HC7 carries both text + visual.

#### A3-3. MINOR — Findings list `kebab` (3-dot menu) a11y unstated.

HB-6 collapses per-row to 3 visible + 1 "more" kebab. Kebab menus are a known a11y trap. **Fix:** spec the kebab as a `<button aria-haspopup="menu" aria-expanded="false">` with a `role="menu"` popup that handles arrow-key navigation, Esc-to-close, and focus-return to the button (SC 2.1.2, SC 2.4.3, SC 4.1.2). 24×24 hit area (SC 2.5.8). This is implementation detail but must be specified in IA so Phase 4 doesn't ship a div-with-onclick.

---

### A4. `signup-to-first-verdict.md` — Trace

#### A4-1. CRITICAL — S5a BYOK key paste + S5b CLI pairing code paste — SC 3.3.8 declared but show/hide not consistent.
**SC 3.3.8 Accessible Authentication Minimum.**

S5a calls out: *"show/hide toggle keyboard-operable, `aria-describedby` linking purpose, paste supported, password-manager-friendly per SC 3.3.8."* ✓

S5b CLI pairing code is **not similarly specified**. The pairing code is OTP-like (6 chars, 5-min TTL). Per SC 3.3.8, paste must work (e.g., user clicks copy on web, switches to terminal, pastes). The flow at C3 says the user pastes manually — but the **web-side display** of the code should be:

- Copy-on-click button next to the 6-char code (≥ 24×24, aria-label="Copy pairing code").
- Code rendered in `<code>` with `aria-live="polite"` on regeneration (so SR users hear the new code).
- No CAPTCHA on web-side code display or CLI-side code entry.

**Fix:** add an SC 3.3.8 paragraph to cli-pairing-and-tamper.md C2 with the above explicit.

#### A4-2. MAJOR — S5c Stripe Checkout return polling page (`/billing/return?cs=<session-id>`) is a screen-reader trap candidate.
**SC 4.1.3 Status Messages, SC 2.2.1 Timing Adjustable, SC 2.4.11 Focus Not Obscured.**

The polling page (S5c "Async during webhook lag") shows: *"Confirming payment with Stripe…"* with `aria-live="polite"` (implied, not stated). The 60-second user-visible threshold + 5-minute timeout escape hatch is good — but:

- **Live-region spec missing.** Spec the polling page renders `<div role="status" aria-live="polite">Confirming payment…</div>` with **a single announcement on entry**, not on every poll. Repeat polls update silently; only **state changes** (success / "taking longer" / timeout) re-announce.
- **Timeout escape hatch must be keyboard-reachable.** "Refresh status now" + "Contact us" buttons must be in tab order from the moment the page renders, not appear after a 60s delay (SC 2.4.3 Focus Order). If they appear later, they need an `aria-live` announcement of their availability.

**Fix:** add this spec to signup-to-first-verdict.md S5c and to billing-and-cancel.md B-WH.

#### A4-3. MAJOR — S8 live-progress region — verify per A2-2 above.

Already declared in flow file (`aria-live="polite"` + `role="status"`, throttle ≤ 4/sec, reduced-motion respected). The coalescing fix from A2-2 applies here. **Cross-reference fix:** Trace's flow file should state the region is **single** at the wrapper level, not per-reviewer-row.

#### A4-4. MAJOR — S9 verdict — `role="status"` on `<h1>` confirmed.
**HC1, SC 4.1.3.**

Trace correctly references HC1 + PRD §7.2 Step D. The `<h1 role="status">` on SPA transition is the right pattern because the route URL doesn't change (`/app/audits/[run-id]` renders pre- and post-verdict). **No fix required.** This is the one place where verdict-as-status is correct.

#### A4-5. MAJOR — OAuth callback focus preservation not specified.
**SC 3.2.1 On Focus, SC 3.2.2 On Input, SC 2.4.3 Focus Order.**

OAuth round-trip (S1 → GitHub/Google → S2/S3) loses focus context. On return:
- Focus should land on the `<h1>` of the destination route (`tabindex="-1"`).
- No unexpected context change (SC 3.2.1) — return URL must match the user's stated intent (`/onboarding/mode` post-OAuth-signup; `/app` post-OAuth-login).
- If the OAuth callback fails (provider down, denied scopes), focus must land on the error message, not at the top of the page.

**Fix:** add a paragraph to S1 / EC-1 specifying OAuth-return focus behavior.

---

### A5. `audit-run-state-machine.md` — Trace

#### A5-1. MAJOR — `reviewers_running` per-reviewer substates need SR coalescing — see A2-2.

Already covered. Trace's flow file specifies the live region correctly; the coalescing addendum from A2-2 must be referenced.

#### A5-2. MINOR — `all_reviewers_complete → jury_synthesizing` uncancellable window — SC 2.2.1.
**SC 2.2.1 Timing Adjustable.**

Trace exempts this state from the cancel-affordance rule because the window is bounded < 30s. SC 2.2.1 allows time-limit exemptions when the time is essential. The "Hang on" copy + bounded ETA satisfy the exception. **No fix required** as a hard SC violation, but **add:** the ETA must be rendered as **static text** ("about 10 seconds") **not a countdown timer** (a live countdown would violate SC 2.2.1 without a pause control). Trace's ETA text language is fine; just be explicit about not animating it.

#### A5-3. MINOR — `cancelled` confirmation modal — SC 2.4.11 Focus Not Obscured.

The confirm modal at "Cancel run" must not be obscured by sticky nav (Halo Direction-A locked `scroll-padding-top: 80px` token). **Fix:** reference the token in the modal-render spec.

---

### A6. `verdict-to-upsell-loop.md` — Trace

#### A6-1. MAJOR — V2c share surface (`/v/<short-id>`) — see A1-4.

Cross-reference; same fix applies.

#### A6-2. MAJOR — V1.5 dispute path (EC-6) — pre-chargeback form must satisfy SC 3.3.1 + SC 3.3.2.
**SC 3.3.1 Error Identification, SC 3.3.2 Labels or Instructions, SC 3.3.7 Redundant Entry.**

Dispute form is described but not a11y-specified. **Fix:**
- Every field needs a visible `<label>` (SC 3.3.2). No placeholder-as-label.
- Submit-time validation must announce errors via `aria-live` (SC 3.3.1). Field-level errors use `aria-describedby` linking the error message to the field, and `aria-invalid="true"` on the failing field.
- Pre-filled fields (charge id, run id) must be editable but pre-populated to satisfy SC 3.3.7.

#### A6-3. MINOR — EC-7 score-trend chart (radar diff).

HC3 already locks the radar chart with semantic `<table>` fallback. The diff variant ("62 to 81") is rendered as text per Herald — good. **Fix nudge:** the `+19` delta should be readable by SRs without color reliance ("+19, improved" or "19 points up"), not just a green arrow. SC 1.4.1.

---

### A7. `cli-pairing-and-tamper.md` — Trace

#### A7-1. CRITICAL — `Private Run · Self-Audited` watermark `aria-describedby` per HC10.
**HC10, SC 1.3.1 Info and Relationships, SC 3.2.4 Consistent Identification.**

C9 spec says: *"Help-text via `aria-describedby` (SC 1.3.1 + SC 3.2.4): 'This verdict was produced on your machine and not independently re-verified by Studio Zero infrastructure. Findings remain on your device.'"* **Correct.** ✓

OQ-4 asks Halo to confirm cross-surface tokens are locked. **Halo confirms:** the watermark text is identical across:
1. Web verdict page.
2. Exported reports (Markdown + JSON).
3. (V1.5) GitHub PR body.
4. (V2c) Public share `/v/<short-id>`.

**SC 3.2.4 Consistent Identification** requires the *label* and *text* be identical, not the rendering. The `aria-describedby` association is web-specific; exported reports cannot carry `aria-describedby` (Markdown doesn't have it). **Fix:** state that exported reports include the watermark as a callout block with the same body text, **preceded by a heading or italicized "Note:"** so it reads as supplementary in Markdown/plain-text rendering. The PR body version (V1.5) uses a `> blockquote` per Comply Art. 50 template.

#### A7-2. MAJOR — C-TAMPER red banner accessibility — SC 1.4.1.

C-TAMPER red banner uses color + icon + text per HC1's verdict-banner pattern. Trace's spec doesn't explicitly say "text alone conveys the warning" — it's implied. **Fix:** assert: *"Red banner background never carries the warning alone; the heading text 'We couldn't verify…' is the signal. Icon + color are reinforcing."* (SC 1.4.1.)

#### A7-3. MINOR — Multi-device "active CLI" picker (EC-7) — SC 4.1.2.

The S-NAV header dropdown for "active CLI" device must be a proper combobox or select, not a div-listbox. **Fix:** spec as `<select>` or ARIA combobox with `aria-expanded`, `aria-activedescendant`, arrow-key navigation, Esc-close. Halo HC2 already covers this in principle; cross-reference.

---

### A8. `billing-and-cancel.md` — Trace

#### A8-1. MAJOR — B-CAN-REGIONAL — locked checkbox copy is long; SC 1.3.5 + SC 3.3.2.
**SC 1.3.5 Identify Input Purpose, SC 3.3.2 Labels or Instructions.**

The 14-day cooling-off waiver checkbox carries 5 lines of legal copy as its label. This is correct for compliance (Comply + Herald locked) but creates an a11y question: at 320 CSS px reflow (SC 1.4.10) the label wraps to 12+ lines. **Fix:** ensure the checkbox itself remains visible while the label scrolls (no clipping); `<label>` wraps the input so click-target is the entire label; long-form text is not collapsed behind an "i" tooltip (that would violate SC 1.3.2 Meaningful Sequence by hiding load-bearing legal info).

#### A8-2. MAJOR — B-CAN-STANDARD — FTC Click-to-Cancel keyboard verification.
**SC 2.1.1 Keyboard, SC 2.4.3 Focus Order.**

Trace declares: *"Cancellation completes in ≤ 2 clicks (B-CAN screen + confirm)."* For keyboard users: ≤ 2 Tabs + 2 Enters from B0. The acceptance test (`tests/acceptance/e2e/billing-cancel-click-to-cancel.spec.ts`) should include a keyboard-only assertion. **Fix:** add keyboard-only path to the acceptance criteria — *"keyboard-only user can reach 'Cancel subscription', activate, confirm, in ≤ 4 keystrokes from B0."*

#### A8-3. MINOR — B-PAYFAIL dunning banner — SC 4.1.3.

Banner appears on page load when subscription is in failed state. Should be a `role="status"` region (transient, polite). Trace doesn't specify. **Fix:** state the banner uses `role="status"`.

---

### A9. `settings-and-account-management.md` — Trace

#### A9-1. MAJOR — S-DEL multi-step confirm — focus management between steps.
**SC 2.4.3 Focus Order, SC 3.3.4 Error Prevention (Legal/Financial/Data).**

S-DEL has 4 steps. Inter-step focus management not specified. **Fix:** on each "Continue" click, focus moves to the new step's `<h2>` (`tabindex="-1"`). Step 3 ("type DELETE to confirm") is an SC 3.3.4 mechanism — confirm it's adequate per the SC (multi-step + explicit text-match + reauth = three independent confirms, exceeds SC 3.3.4 requirement).

#### A9-2. MAJOR — Cross-cutting destructive-action pattern — confirmed `<dialog>` semantics needed.

Trace's pattern uses confirm modals. **Fix:** spec these as `<dialog>` (or ARIA `role="dialog"` + `aria-modal="true"` + `aria-labelledby`) with focus-trap on open, focus-return to trigger on close, Esc to dismiss. This is restated from A1-1 but applies across settings.

#### A9-3. MINOR — S-CONS toggle behavior — SC 4.1.2.

Toggles for cookie/AI-training consent must be `<input type="checkbox" role="switch">` or `<button role="switch" aria-checked="true|false">`. Visual on/off must not be the only signal (SC 1.4.1). **Fix:** state the switch pattern.

---

### A10. `fix-delivery-prflow.md` — Trace (V1.5)

#### A10-1. MINOR — P4 uncancellable gate — same as A5-2.

Same fix as audit-run-state-machine.md `all_reviewers_complete`. Static ETA text, no live countdown.

#### A10-2. MINOR — PR body Art. 50 disclosure — accessibility of generated PR text.
**HC10, SC 3.2.4.**

The PR body is rendered by GitHub, not Studio Zero. Halo cannot control GitHub's a11y. **Fix nudge:** ensure the Markdown structure uses proper heading levels (`##` not `**bold**`), the Art. 50 disclosure is its own section with a heading, and the watermark callout uses `>` blockquote not plain text. This propagates the consistency required by SC 3.2.4 to the surface where Studio Zero has control (the Markdown template).

---

## Per-WCAG-2.2 new SC checklist coverage

| SC | Required by Phase 3 | Coverage in artifacts | Verdict |
|---|---|---|---|
| **2.4.11 Focus Not Obscured** | Sticky nav + modal-routes + sticky verdict-CTA bar | Halo Phase 2 tokens lock `scroll-padding-top: 80px`. Sitemap modal-as-route pattern references SC 2.4.11. Empty-states ES-AUDIT-FAILED-IRRECOVERABLY doesn't reference it. **Partial.** | **FIX (A1-1)** |
| **2.4.13 Focus Appearance** | Focus ring spec'd in brand v0.1.1 | Brand tokens carry `focus-ring` at 6.8:1, 2px solid + 2px offset. Not referenced in flow files. | **FIX**: every flow file's "keyboard" assertions should `@reference brand/tokens.json#focus-ring`. |
| **2.5.7 Dragging Movements** | Findings list reorder — flagged in v0.4 | brand tokens.json declares non-drag alternative spec'd in IA phase (Optic). **Optic's IA does not surface the alternative explicitly.** | **FIX**: add to HB-6 / findings list spec: *"Reorder via keyboard (Alt+Up/Down) or 'Move to…' menu (kebab). Drag is enhancement, not requirement."* |
| **2.5.8 Target Size 24×24** | Sidebar items, findings row affordances, mobile bottom-nav | Empty-states + heuristic-budget cite SC 2.5.8 multiple times. Sidebar collapse (A1-2) needs explicit hit-area note. Kebab (A3-3) needs explicit hit area. | **FIX (A1-2, A3-3)** |
| **3.3.7 Redundant Entry** | Multi-step signup → BYOK → intake | Signup-to-first-verdict S1 declares form state preserved on accidental nav. HB-12 cites SC 3.3.7. Dispute form (A6-2) doesn't. | **FIX (A6-2)** |
| **3.3.8 Accessible Authentication** | BYOK key paste, CLI pairing code, OAuth | BYOK (S5a) ✓. CLI pairing (A4-1, A7-1) **MISSING**. OAuth (A4-5) **MISSING**. | **FIX (A4-1, A4-5, A7-1)** |

---

## Phase-3 exit gate verdict

**BUILD_FLOW.md Phase 3 gate:** *every navigation pattern has keyboard equivalent + screen-reader pattern documented.*

| Navigation pattern | Keyboard equivalent | SR pattern | Gate |
|---|---|---|---|
| Marketing top nav | Tab + Enter | `<nav aria-label="Primary">` + roving tabindex | ✓ |
| Dashboard sidebar (4 items) | Tab + Enter, arrow keys within nav | `<nav aria-label="Primary">` with `aria-current="page"` | ✓ |
| Header bell notifications | Tab + Enter + Esc | `<button aria-haspopup="true" aria-expanded>` → `<dialog>` drawer | **FIX (A1-2)** |
| Footer Help link | Tab + Enter | `<nav aria-label="Footer">` | **FIX (A1-2)** |
| Modal-as-route open | Tab from trigger | `<dialog>` + focus to `<h2>` | ✓ partially — **FIX (A1-1)** for close |
| Modal-as-route close | Esc / X / back | Focus return to trigger + parent route announce | **FIX (A1-1) — critical** |
| OAuth round-trip | Browser back | Focus restored to destination `<h1>` | **FIX (A4-5)** |
| Stripe Checkout return | Browser back / polling | `role="status"` polite single-announcement | **FIX (A4-2)** |
| GitHub install round-trip | Browser back | Focus restored | **FIX (A1-3)** |
| Settings sub-page entry | Tab from rail / Enter | Focus to sub-page `<h1 tabindex="-1">` | **FIX (A3-1)** |
| Verdict-screen state change | n/a (SPA transition) | `role="status"` on `<h1>` per HC1 | ✓ |
| Per-agent live progress | n/a (passive) | Coalesced `aria-live="polite"` region | **FIX (A2-2)** — coalescing |
| Findings row kebab menu | arrow keys + Esc | `role="menu"` + focus-trap-within-menu | **FIX (A3-3)** |
| Cancel-run confirm | Tab + Enter | `<dialog>` + focus-trap | **FIX (A5-3)** scroll-padding ref |
| 14-day waiver checkbox | Tab + Space | `<label>` wraps `<input>` | **FIX (A8-1)** reflow |

**Gate verdict:** all navigation patterns are *enumerated*; some are *under-specified*. The exit gate technically clears at the documentation level — every pattern has at least one sentence about keyboard and SR behavior. But 8 of 15 patterns need spec tightening before Phase 4 build. **PASS WITH FIXES at the gate.**

---

## Required fixes before Phase 4 starts (binding)

1. **A1-1** — Modal-as-route close-pattern paragraph added to sitemap §"Pattern note" and to empty-states.md cross-cutting section.
2. **A1-3** — Onboarding round-trip (OAuth, GitHub install, Stripe Checkout return) back-paths and focus restoration spec'd.
3. **A1-4** — `/v/<short-id>` route added to sitemap with AA + HC10 declaration.
4. **A2-1** — `role="status"` audit across empty-states.md; remove from modal-as-route surfaces; keep on verdict `<h1>` only.
5. **A2-2** — Live-region coalescing for per-agent progress: one wrapper region, summary message, ≤ 4/sec throttle. Cross-reference in audit-run-state-machine.md S8.
6. **A3-1** — Settings sub-page entry focus management: focus moves to sub-page `<h1 tabindex="-1">`.
7. **A3-3** — Findings list kebab menu spec'd as ARIA menu with focus-trap.
8. **A4-1** — CLI pairing code SC 3.3.8 compliance: copy button, code in `<code>`, no CAPTCHA.
9. **A4-2** — Stripe Checkout return polling page `role="status"` single-announcement spec.
10. **A4-5** — OAuth callback focus restoration paragraph.
11. **A6-2** — Dispute form SC 3.3.1 / 3.3.2 / 3.3.7 compliance.
12. **A7-1** — Watermark text consistency across exported reports + PR body (HC10 + SC 3.2.4).
13. **A8-1** — 14-day waiver checkbox reflow + label-as-target.
14. **SC 2.5.7** — Findings list non-drag alternative explicit in HB-6.
15. **SC 2.4.13** — Flow files reference brand focus-ring token.

---

## Open question answers for Optic / Trace

- **Optic OQ on `role="status"` for transient state per HC2:** answered in A2-1. Use `role="status"` only for in-route state changes; `<dialog>` for modal surfaces.
- **Optic OQ on AT recording obligations per HC2:** PRD §14.6 test gate requires FAIL primary flow only. ES-AUDIT-RUNNING and ES-CLI-OFFLINE additionally warrant recording because they exercise the throttle. Halo confirms both should be in the recorded set.
- **Optic OQ on modal-as-route vs true modal:** modal-as-route stands for the 4 surfaces specified (CLI-offline + 3 payment states + delete confirm). True modal acceptable only for in-page confirms (revoke, cancel-run) where URL change would be lossy. The settings destructive-action pattern uses true modal — keep.
- **Trace OQ-4 in cli-pairing-and-tamper.md (cross-surface watermark tokens):** answered in A7-1. Tokens locked; text-identity required; rendering primitive (aria-describedby / blockquote / callout) differs per surface as long as the text is identical.
- **Trace settings flat-at-MVP question:** answered in A3-1. **Do not flatten.** Keep 3-group structure.

---

## Final verdict

**PASS WITH FIXES.**

Phase 3 artifacts are detailed, SC-cited, and largely correct. The fixes are concentrated in three areas:
1. Modal-as-route close-pattern focus choreography (A1-1) — the single highest-risk gap.
2. `role="status"` over-application (A2-1) — fix before it propagates into Phase 4 component primitives.
3. Round-trip focus restoration for OAuth + Stripe + GitHub (A1-3, A4-2, A4-5) — silent SR traps if not nailed.

**Halo does NOT block Phase 4 start.** The fixes above must land before Phase 4 implementation begins — most are 1–3 sentence additions to existing IA files. None require structural rework.

The exit-gate condition (*every navigation pattern has keyboard equivalent + SR pattern documented*) is **met at the artifact level**. Tighten the under-specified patterns, then build.

---

*End of phase3-audit-halo v0.1. Halo — Independent Accessibility Reviewer.*
