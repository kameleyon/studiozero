# PRD v0.3 — Halo Accessibility Review

**Reviewer:** Halo (Audit Layer — Accessibility)
**Standard applied:** WCAG 2.2 Level AA (mandatory), with selected AAA where the brand posture demands it
**Date:** 2026-05-10
**Document:** `PRD.md` v0.3
**Synthesis cross-reference:** `shared_context/projects/studio-zero-productization/prd-review-synthesis.md` (v0.2 self-audit) — Halo was not dispatched in the v0.2 audit; this is the first a11y-specific pass on the PRD

---

## Verdict: **FAIL**

## Top-line summary

The PRD specifies an audit product whose entire premium positioning rests on holding customers to a defensible quality bar, yet the document itself never names WCAG 2.2 AA as a binding requirement on Studio Zero's own customer-facing surface — the audit product would FAIL its own Halo pass on critical-path screens (live progress, verdict reveal, charts, evidence rendering, pricing). This is the dogfood test, and v0.3 does not eat the dogfood: §1–§14 specify the engine and APIs of the audit but contain zero AT-tested requirements for the dashboard, score page, findings UI, evidence surface, pricing table, onboarding, or AI-disclosure presentation that customers will actually touch. The good news: every gap is additive — no architectural decision must be reversed — but until a binding "Studio Zero's own product conforms to WCAG 2.2 AA, audited by an independent party before M5" clause lands in §14 with specific SC obligations called out per surface, no Halo PASS is possible and the audit verdict the product sells is not defensible in writing.

---

## Blockers (must fix before M0 spike — these gate the spec, not just the build)

### HB1. No WCAG 2.2 AA conformance commitment for Studio Zero's own customer-facing product
**Sections:** §1, §4 (Goals), §14 (NFRs)
**Hard rule:** an audit product that itself fails accessibility loses moral and FTC-substantiation authority. Halo's persona (`agents/audit/halo.md` Rule 6) explicitly forbids "we'll fix it post-launch."
**Finding:** §14 specifies performance, reliability, security, privacy, and compliance, but contains no accessibility NFR. §4 Goals 1–7 do not mention accessibility of the Studio Zero web app. §15 success metrics measure customers' first-audit FAIL rate but never measure Studio Zero's own conformance.
**WCAG mapping:** the omission spans every primary-flow SC. There is no single criterion to cite — the gap is the conformance statement itself.
**Required spec language:** add §14.6:

> **§14.6 Accessibility.** The Studio Zero web app, marketing site, dashboard, score page, findings UI, evidence viewer, settings, billing flow, and exported audit reports conform to WCAG 2.2 Level AA. Conformance is verified by an independent audit (Halo agent or external auditor not on the build team) before M5 public launch and on every release that touches a primary flow. A WCAG 2.2 AA Conformance Statement (per W3C WAI-AA template) is published at `/accessibility` and linked from the footer of every page. Findings rated Blocker or Critical under Halo's severity rubric (`agents/audit/halo.md` Rule 3) do not ship.

**Severity:** Blocker. Without this clause the rest of Halo's review has nothing to anchor against in §14.

### HB2. The FAIL-verdict screen has no critical-path accessibility specification
**Sections:** §7.2 Step D, §15 (success metric "FAIL rate ≥70%")
**Finding:** the success metric explicitly designs for ~70% of first audits to FAIL. Every customer the product is designed for encounters the FAIL screen as their first impression. A customer relying on assistive technology must be able to read, understand, and act on the FAIL findings — that is the activation moment of the entire product. §7.2 Step D specifies "Verdict + Score" output but does not specify any AT requirement.
**WCAG mapping:**
- **SC 1.3.1 Info and Relationships (A):** verdict, score, and per-finding severity must be programmatically determinable, not visual-only.
- **SC 1.4.1 Use of Color (A):** see HC1 — verdict communicated by color alone fails.
- **SC 2.4.6 Headings and Labels (AA):** the FAIL screen needs a meaningful h1 ("Audit failed: 12 findings to remediate") not just a colored banner.
- **SC 4.1.3 Status Messages (AA):** the verdict reveal after a streamed run must announce via `aria-live="polite"` or `role="status"`.
**Required spec language:** add to §7.2 Step D:

> The verdict reveal is a primary-flow screen. It must satisfy WCAG 2.2 AA against keyboard-only navigation, NVDA on Windows, and VoiceOver on macOS. Verdict, score, and per-finding severity are conveyed through text, icon, and color simultaneously. The verdict reveal is announced via a `role="status"` live region. Halo audits this screen on every release.

**Severity:** Blocker. Per Halo Rule 3, any user with common AT being unable to complete a primary task is a Blocker.

---

## Criticals (WCAG AA failures on primary flows — must fix before M5 public launch)

### HC1. §7.2 Step D — verdict + score communicated by color alone
**Section:** §7.2 Step D
**Finding:** the verdict states `PASS` / `PASS WITH FIXES` / `FAIL` and the score is 0–100. Common implementations of this pattern use green/yellow/red. Color as the sole channel is a textbook violation.
**WCAG mapping:** **SC 1.4.1 Use of Color (A)**.
**Required spec language:** verdict UI uses three independent channels — text label, distinguishing icon (e.g., check / warning / x), and color. Score uses numeric value, label ("89/100 — PASS WITH FIXES"), and gauge fill. Forced-colors mode (Windows High Contrast) tested per SC 1.4.11 Non-text Contrast.

### HC2. §7.2 Step C — live progress streaming to dashboard has no live-region spec
**Section:** §7.2 Step C, §13.3 (event streaming), §13.6 (per-run timeline)
**Finding:** "Live progress is streamed to the dashboard" with no mention of how AT users perceive progress. Per the runner contract §13.3, events are continuous (progress, partial findings, agent logs). A screen-reader user has no signal that anything is happening.
**WCAG mapping:**
- **SC 4.1.3 Status Messages (AA):** progress updates need `role="status"` or `aria-live="polite"`. Major milestones (reviewer started/finished) may need `aria-live="assertive"` or `role="alert"` — but assertive is interruptive; spec must distinguish.
- **SC 2.2.1 Timing Adjustable (A):** if any progress UI auto-updates and disappears, an extension/pause mechanism is required.
- **SC 1.4.13 Content on Hover or Focus (AA):** any progress tooltips must be dismissable, hoverable, persistent.
**Required spec language:** add to §7.2 Step C:

> Progress events surface in the dashboard via a designated live region with `aria-live="polite"` and `aria-busy="true"` during the run. Reviewer-completion announcements use polite live regions; only the final verdict reveal uses `role="status"`. The progress region is keyboard-focusable and exposes the same content as the visual timeline (§13.6). Spec covers SC 4.1.3, 2.2.1, 1.4.13.

### HC3. §10 score breakdown radar / bar chart — no programmatic alternative
**Section:** §10 (Score breakdown, per-category)
**Finding:** "Score breakdown: displayed per-category (UX, Accessibility, Copy, Brand, Flow, Audience)." Typical implementation is a radar or bar chart rendered as SVG or canvas. Charts without programmatic alternatives fail WCAG.
**WCAG mapping:**
- **SC 1.1.1 Non-text Content (A):** the chart needs an accessible name and an equivalent.
- **SC 1.3.1 Info and Relationships (A):** the underlying data must be programmatically determinable.
- **SC 1.4.11 Non-text Contrast (AA):** chart strokes/fills must meet 3:1 against adjacent colors.
**Required spec language:** the score breakdown ships in three forms: chart (visual), data table (`<table>` with `<th scope="col">` and `<th scope="row">`), and screen-reader-friendly text summary ("Accessibility: 62 out of 100 — lowest category. UX: 88 — highest."). The data table is always present in the DOM; the chart may be `aria-hidden="true"` provided the table is the labelled element.

### HC4. §9.3 evidence (screenshot, transcript) — accessibility not specified for UI surfacing
**Section:** §9.3 output contract, §13.2 (storage)
**Finding:** `evidence.type` includes `"screenshot"` and `"transcript"`. Screenshots in the rendered findings UI need alt text describing the captured violation. Screen-reader transcripts are themselves accessibility evidence — they must be rendered as text in the DOM, not delivered only as a JSON blob or a downloadable file. v0.3 does not specify either.
**WCAG mapping:**
- **SC 1.1.1 Non-text Content (A):** screenshot alt text must summarize the violation captured ("Signup form, email input with no visible label, contrast measured 2.8:1 on placeholder").
- **SC 1.4.5 Images of Text (AA):** screenshots that capture text are images-of-text. The PRD must require the underlying selector + text snippet to be surfaced as real DOM text alongside the screenshot.
- **SC 1.2.1 Audio-only and Video-only / 1.2.2 Captions:** if any evidence is a screen-reader audio recording (Halo persona mentions recordings), a transcript is required and must be the primary surface, not a supplement.
**Required spec language:** add to §9.3:

> Every `evidence` object whose `type` is `"screenshot"` includes an `alt` field — a structured description of what the screenshot demonstrates, authored by the reviewer agent that captured it. Every `evidence.type === "transcript"` is rendered as semantic text in the findings UI (collapsible `<details>` or expandable region), not only as a JSON property or a downloadable artifact. Image-of-text screenshots additionally surface the relevant text snippet as DOM text. Reviewers (especially Halo) must populate `evidence.alt`; missing `alt` is itself a finding against the runner.

### HC5. §6.1 settings — API key paste is a sensitive input lacking spec
**Section:** §6.1, §7.1 BYOK step
**Finding:** "API key entry (BYOK)" is the highest-stakes input in the product. v0.3 does not specify label association, autocomplete behavior, show/hide pattern, or keyboard operability of the toggle.
**WCAG mapping:**
- **SC 1.3.1 Info and Relationships (A):** programmatically associated `<label for>` required.
- **SC 1.3.5 Identify Input Purpose (AA):** API keys are not in the SC 1.3.5 list of personal-data fields, but the same pattern applies — `autocomplete="off"` is required to prevent password managers from caching the wrong field; the label must clearly identify the field as an Anthropic API key.
- **SC 2.1.1 Keyboard (A):** show/hide toggle must be a `<button>` with `aria-pressed` and Enter/Space activation, not a click-only icon.
- **SC 3.3.2 Labels or Instructions (A):** instructions must state where to obtain the key and that it is stored encrypted (cite §13.4).
- **SC 4.1.2 Name, Role, Value (A):** toggle button has accessible name "Show API key" / "Hide API key" updating with state.
**Required spec language:** add to §7.1 BYOK step:

> The API-key input uses an associated `<label>`, `type="password"` by default, `autocomplete="off"`, `spellcheck="false"`. A keyboard-operable show/hide toggle (`<button aria-pressed>`) reveals the value. Dry-run validation status announces via `role="status"`. Per SC 1.3.1, 2.1.1, 3.3.2, 4.1.2.

### HC6. §7.1 — Stripe checkout iframe is a known AT trap
**Section:** §7.1 step 2 (Managed mode), §12 (pricing flow)
**Finding:** Stripe Checkout (hosted, full-page redirect) is significantly more accessible than Stripe Elements (embedded iframe). Embedded Elements iframes commonly trap focus, mis-handle keyboard, mis-announce field labels, and conflict with the surrounding page's live regions.
**WCAG mapping:**
- **SC 2.1.2 No Keyboard Trap (A):** Elements iframe historically traps focus in some configurations.
- **SC 1.3.1 Info and Relationships (A):** iframe accessibility is opaque to the surrounding page's landmarks.
- **SC 4.1.2 Name, Role, Value (A):** payment-element fields' accessible names are controlled by Stripe; we cannot fix them.
**Required spec language:** add to §7.1:

> Billing flow uses Stripe Checkout (hosted, full-page) by default. Stripe Elements (embedded) is permitted only on pages where an independent a11y audit confirms no keyboard trap and correct label association at the time of release. Trade-off: hosted Checkout costs a redirect; embedded Elements costs an a11y budget.

### HC7. §12 pricing table — multi-column comparison without spec'd table semantics
**Section:** §12
**Finding:** the pricing table is a 7-row × multi-column comparison with badges ("Most popular," "BYOK only," "Annual billing: 2 months free"). Pricing tables are notoriously inaccessible: divs-as-tables, header cells without `scope`, "Most popular" badge that is visual emphasis only, currency that is read character-by-character.
**WCAG mapping:**
- **SC 1.3.1 Info and Relationships (A):** real `<table>` with `<th scope="col">` per tier and `<th scope="row">` per feature. Visual emphasis on "Most popular" must also be programmatic (e.g., `<th><span class="visually-hidden">Most popular tier:</span> Managed Pro</th>` or an `aria-describedby`).
- **SC 1.4.4 Resize Text (AA):** at 200% the table must reflow without horizontal scrolling on a 1280px viewport. Common pricing-page failure.
- **SC 1.4.10 Reflow (AA):** at 320 CSS px wide, the comparison must reflow to per-tier cards.
- **SC 2.4.6 Headings and Labels (AA):** each tier card needs a heading; price must be read as "$29 per month," not "$ 2 9 / m o."
**Required spec language:** add to §12:

> The pricing comparison is implemented as a semantic `<table>` with column scope on tier names and row scope on feature names. The "Most popular" indicator is programmatic (caption or `aria-describedby`), not color/icon only. Currency values include a visually-hidden expansion ("twenty-nine dollars per month") or use `aria-label`. At 320px viewport (SC 1.4.10) the table reflows to stacked per-tier cards with `<h3>` per tier. Tested under SC 1.3.1, 1.4.4, 1.4.10, 2.4.6.

### HC8. §13.6 dashboard timeline visualization — no keyboard or ARIA spec
**Section:** §13.6 ("Per-run timeline visible in the dashboard")
**Finding:** "which agent ran when, how long, token cost" implies a Gantt-style timeline. Custom timeline widgets are among the highest-risk patterns for AT support.
**WCAG mapping:**
- **SC 2.1.1 Keyboard (A):** every segment must be keyboard-focusable and the entire widget operable without a mouse.
- **SC 4.1.2 Name, Role, Value (A):** the widget needs a defined ARIA pattern. WAI-ARIA Authoring Practices 1.2 does not have a "timeline" pattern by name; the closest fits are `treegrid` (with rows per agent, columns per event), `table` (rows per agent), or a stepper. The spec must pick one; ad-hoc ARIA fails.
- **SC 1.4.11 Non-text Contrast (AA):** segment bars must meet 3:1 against the timeline track.
**Required spec language:** add to §13.6:

> The per-run timeline implements one of: (a) a semantic `<table>` (agents as rows, events as cells); (b) an ARIA `treegrid` per WAI-ARIA Authoring Practices 1.2; (c) a textual stepper. Every segment is keyboard-focusable with arrow-key navigation per the chosen pattern. Color is not the sole channel for status (running / done / failed). A textual summary ("Run completed in 14 minutes 32 seconds. Halo took 4 minutes 12 seconds. Trace took 6 minutes 8 seconds.") is always present.

### HC9. §11.2 Auto-PR commit/PR description — Markdown structure on GitHub
**Section:** §11.2
**Finding:** GitHub renders our Markdown. We control the structure. Per-finding badges (severity, reviewer) are emitted as images or text; if images, they need alt text. Heading hierarchy in PR descriptions must not skip levels.
**WCAG mapping:**
- **SC 1.1.1 Non-text Content (A):** any shields.io-style badge needs `alt` text in the Markdown.
- **SC 1.3.1 Info and Relationships (A):** PR description heading hierarchy must start at `##` (GitHub's PR body is rendered inside an `<h1>`).
- **SC 2.4.6 Headings and Labels (AA):** each finding's heading describes the violation, not just an ID.
**Required spec language:** add to §11.2:

> Auto-PR descriptions are rendered Markdown. The runner emits headings starting at `##` (PR body is nested under GitHub's `<h1>`); per-finding sections use descriptive headings, not just IDs. All badges are emitted as Markdown images with descriptive `alt` text (`![Severity: Critical](...)` not `![](...)`). Per-commit attribution to a finding ID is text first, badge second.

### HC10. §14.5 AI disclosure — must be programmatically associated, not visually adjacent
**Section:** §14.5
**Finding:** "AI disclosure copy required on every audit report (per Comply agent)." Comply owns the wording; Halo owns the rendering. A disclosure that sits visually adjacent to a finding but is not programmatically associated is invisible to AT users.
**WCAG mapping:**
- **SC 1.3.1 Info and Relationships (A):** disclosure must be associated with the report content via `aria-describedby` on the report region, or as a landmark with a clear heading, or as the first focusable element on the page with appropriate `tabindex`.
- **SC 3.2.4 Consistent Identification (AA):** the disclosure component is identical across every audit report surface (web, exported HTML, PR description).
**Required spec language:** add to §14.5:

> The AI disclosure is rendered as the first content under the report's `<main>` landmark, with an `<h2>` heading, and is referenced via `aria-describedby` from the report region. Identical wording and placement on every audit report surface (web dashboard, exported HTML, PR description, JSON export's `disclosure` field). Halo and Comply jointly audit each release.

---

## Majors (WCAG AA failures off the primary flow, or AAA on primary flow)

### HM1. §17 Decision #6 / D7 — CLI tamper badge needs spec for SC 1.4.1 and 1.3.1
**Sections:** §17 Decision 6, §17 D7 (open)
**Finding:** the tamper-detection messaging (whichever framing is chosen — "Studio Zero Certified" vs "Self-Audited / Unverified") will be rendered as a badge on the verdict screen. Badges fail SC 1.4.1 when status is conveyed by color only and SC 1.3.1 when the label is decorative-only.
**WCAG mapping:** **SC 1.4.1 (A), SC 1.3.1 (A), SC 4.1.2 (A).**
**Required spec language:** the trust-status badge includes an icon, text label, and color simultaneously. Text label expands on hover and focus into a sentence ("This audit ran on a Studio Zero hosted runner — verdict is cryptographically signed."). Pattern repeated identically on every audit-report surface. Add to D7 resolution criteria.

### HM2. PRD-level meta-finding — severity tables use bare ✓ glyphs in §9.2
**Section:** §9.2 (auditor coverage table), self-applied
**Finding:** the §9.2 table uses raw ✓ characters in cells. As Markdown the PRD is a document, but if the same pattern ships in customer-facing comparison tables (pricing in §12, "what each audit finds" tables), the glyph needs an accessible name. Screen readers vary: NVDA reads "✓" as "check mark"; some configurations skip it.
**WCAG mapping:** **SC 1.1.1 (A), SC 1.3.1 (A).**
**Required spec language:** comparison tables in customer-facing surfaces use `<span class="visually-hidden">Included</span>` alongside the ✓ glyph, or use the data-cell content "Included" / "Not included" with the glyph as `aria-hidden="true"` decoration. Document-level (PRD) is Minor; product-level is Major.

### HM3. §13.6 Sentry / PostHog widgets — third-party a11y
**Section:** §13.6
**Finding:** PostHog feedback widgets, Sentry feedback dialogs, and any in-app survey embeds carry their own a11y profile that we do not control. v0.3 doesn't restrict their use in customer surfaces.
**WCAG mapping:** **SC 2.1.2 (A), SC 4.1.2 (A).**
**Required spec language:** any third-party widget shown to customers (PostHog feedback widget, Sentry user-feedback dialog, intercom-style chat) is gated by an a11y audit on the specific widget version before enablement. Default state: telemetry only, no customer-facing widgets without Halo approval.

### HM4. §6.1 OAuth flow announcements
**Section:** §6.1, §7.1
**Finding:** GitHub / Google OAuth flows leave and return the page. The return state ("connected as @username") must announce; the disconnected state must be unambiguous.
**WCAG mapping:** **SC 4.1.3 (AA), SC 3.2.4 (AA).**
**Required spec language:** on OAuth return, the connection status announces via `role="status"`. Disconnect actions confirm via modal with focus management (SC 2.4.3 Focus Order). All OAuth state changes are reflected as text, not icon alone.

### HM5. Exported audit-report formats — Markdown / JSON / CSV
**Section:** §7.2 Step D ("exportable as Markdown / JSON / CSV")
**Finding:** customers will share the exported report. Markdown export must preserve heading hierarchy; CSV is text-only and fine; JSON is not human-consumable and is fine for tooling. But a PDF export, if added, must be tagged PDF/UA. The PRD must address future PDF export now to prevent post-launch retrofit.
**WCAG mapping:** **SC 1.3.1 (A) for Markdown, PDF/UA-1 for any PDF.**
**Required spec language:** Markdown export uses semantic heading structure (`#`, `##`, `###`) without skipping levels. PDF export is out of scope until a tagged-PDF pipeline ships (deferred decision; track in §17 if added).

---

## Minors (AAA gaps, polish)

- **HMin1. SC 2.4.7 Focus Visible (AA) — the *AAA* sibling SC 2.4.13 Focus Appearance** (WCAG 2.2 new): focus indicator must meet a minimum size + contrast. Not in current AA conformance, but Strict-elite brand posture (§10) implies we hold ourselves to this. Add to §14.6 as "AAA aspirations on the customer-facing surface."
- **HMin2. SC 3.3.7 Redundant Entry (AA, new in 2.2)** — onboarding (workspace → mode selection → optional GitHub connect) must not require the user to re-enter information already provided. Spec the state-persistence behavior.
- **HMin3. SC 3.3.8 Accessible Authentication (Minimum) (AA, new in 2.2)** — pasted API keys: do not block paste, do not impose puzzle CAPTCHAs on returning users. Already implied by §17 Decision 7 (CAPTCHA on free tier only) but spec it explicitly.
- **HMin4. SC 2.5.7 Dragging Movements (AA, new in 2.2)** — if the timeline (§13.6) ever supports zoom-by-drag or pan-by-drag, single-pointer alternatives required.
- **HMin5. SC 2.5.8 Target Size (Minimum) (AA, new in 2.2)** — 24×24 CSS px minimum for interactive controls. Spec applies to the dashboard run-action buttons, severity-filter chips, and findings-list controls.
- **HMin6. Heading hierarchy in the dashboard** — verify a single `<h1>` per route. Common SPA failure when route transitions don't reset heading order.
- **HMin7. Language declaration** — `<html lang="en">` declared; future i18n (§14.4 EU residency note) must carry lang changes per SC 3.1.2.

---

## Polish (V1+)

- **HPol1. Forced-colors mode** — verdict colors, score gauge, and timeline segments tested under Windows High Contrast. Per SC 1.4.11 these must remain legible when forced colors override our palette.
- **HPol2. Reduced motion** — `prefers-reduced-motion` honored on all dashboard transitions, especially the verdict reveal animation.
- **HPol3. Skip links** — dashboard has many landmarks (nav, findings list, evidence, timeline); a "Skip to findings" link from the top of the score page reduces keyboard travel.
- **HPol4. AXE-core CI gate** — add to §13 CI: every PR runs `axe-core` against representative pages and fails the build on Critical/Serious findings. Note: automated tools cover ~30% of WCAG. CI gate is necessary but not sufficient — Halo audit is the other 70%.
- **HPol5. NVDA / VoiceOver recordings as release artifacts** — per Halo persona Rule 5, every release ships an AT recording of the primary flow (signup → run audit → view FAIL → export). Stored alongside the score snapshot.

---

## Add proposals (new spec language for v0.4)

The following additions land in §14 (new §14.6) and §7.2:

1. **§14.6 Accessibility (new):** WCAG 2.2 AA binding statement (see HB1 wording).
2. **§7.2 Step C addendum:** live-region + `aria-busy` requirements (see HC2 wording).
3. **§7.2 Step D addendum:** verdict UI uses text + icon + color; live-region announce; primary-flow AT test required (see HB2 + HC1 wording).
4. **§7.2 Step D + §10 addendum:** score breakdown ships as chart **plus** semantic data table **plus** text summary (see HC3 wording).
5. **§9.3 addendum:** every `evidence` object includes accessible alternative — `alt` for screenshots, DOM-rendered text for transcripts (see HC4 wording).
6. **§7.1 BYOK step addendum:** API-key input spec — label association, password type, `autocomplete="off"`, keyboard-operable show/hide toggle, validation status announce (see HC5 wording).
7. **§7.1 Managed step / §12 billing addendum:** Stripe Checkout (hosted) by default; Elements only after independent a11y audit (see HC6 wording).
8. **§12 addendum:** semantic table, scope attributes, "Most popular" programmatic, reflow at 320px (see HC7 wording).
9. **§13.6 addendum:** timeline implements a defined ARIA pattern (table / treegrid / stepper); textual summary always present (see HC8 wording).
10. **§11.2 addendum:** Markdown emission rules — heading hierarchy, badge alt text (see HC9 wording).
11. **§14.5 addendum:** disclosure rendered in `<main>` with `<h2>`, `aria-describedby` association, identical placement across surfaces (see HC10 wording).
12. **§17 D7 resolution criteria addendum:** trust badge accessibility requirements (see HM1 wording).
13. **§13 CI gate addendum:** axe-core in CI; AT recording per release (see HPol4–5).

## Remove proposals
None. All findings are additive. The v0.3 architectural decisions stand; the gap is specification, not direction.

---

## Decision votes (D1–D9)

Halo's domain is accessibility; non-a11y decisions are deferred to the agents who own them. Votes below cover only the a11y dimension.

- **D1. GitHub App vs OAuth.** No a11y dimension. **Abstain.** (Defer to Shield/Sprint.)
- **D2. Free tier scope.** No direct a11y dimension. **Abstain** — but flag: if the free tier is the first contact with AT users, the demo flow must be the most polished a11y surface in the product, not the roughest.
- **D3. Auto-PR scope in MVP.** No a11y dimension to the *fix*, but the **PR description rendering** (HC9) ships whether MVP or V1.5. **Vote: defer Auto-PR to V1.5** (aligns with synthesis C7) — buys time to land HC9 properly.
- **D4. BYOK Starter pricing.** No a11y dimension. **Abstain.**
- **D5. Auto-PR pricing tiering.** No a11y dimension. **Abstain.**
- **D6. Milestone reorder M2↔M3.** No a11y dimension to the order itself; flag: every milestone that ships a new customer-facing screen requires a Halo pass before it ships. **Vote: accept synthesis recommendation** (Managed before CLI) with addendum: Halo-pass gate inserted between every milestone and its public release.
- **D7. CLI tamper-detection messaging.** **Strong a11y dimension** — see HM1. Both framings ("Studio Zero Certified" vs "Self-Audited / Unverified") render as a status badge. **Vote: prefer the "Self-Audited / Unverified" watermark framing** (synthesis M11) — a single negative-state badge is easier to render accessibly than a two-state PASS/FAIL trust toggle. Either framing ships only if HM1 spec lands.
- **D8. Sandboxing strategy.** No customer-facing a11y dimension. **Abstain.**
- **D9. SSRF / prompt-injection / telemetry / ingestion.** No customer-facing a11y dimension; but redaction middleware must not strip `aria-*` attributes or alt-text contents from evidence — a common over-redaction bug. **Vote: accept synthesis recommendations** with addendum: redaction allow-list includes accessibility attribute payloads.

---

## What changes if v0.4 lands these additions

- §14 gains an accessibility NFR with binding WCAG 2.2 AA language and conformance-statement requirement.
- §7.2 Steps C and D gain live-region + AT-test obligations.
- §9.3 gains `evidence.alt` and DOM-rendering rules.
- §10 score breakdown becomes chart + table + text summary, not chart-only.
- §11.2 Markdown emission rules become spec'd.
- §12 pricing table semantics are defined, not implementation-dependent.
- §13.6 timeline picks an ARIA pattern.
- §14.5 disclosure placement is programmatic.
- §17 D7 resolves with a11y-aware messaging.

After these changes, Halo can issue a **PASS WITH FIXES** on the spec. PASS on the spec is not the same as PASS on the shipped product — that requires an AT-tested release, recorded, and signed off. Per the persona rules: source-code review is insufficient evidence. M5 launch ships with NVDA + VoiceOver recordings, or M5 doesn't ship.

---

*Independent reviewer. I flag. I don't fix. Halo out.*

---

## v0.4 Plan Sign-Off (2026-05-10)

**1. Does §14.6 close HB1? Do additions cover HC1–HC10?** **Partial — closes HB1 in principle; HC coverage is contingent on per-section spec text landing, not just the §14.6 umbrella.**
- HB1: **Yes** — binding WCAG 2.2 AA NFR, independent pre-M5 audit, `/accessibility` statement.
- HB2: **Yes** — §7.2 Step D verdict spec lands.
- HC1 color-only verdict (SC 1.4.1, 1.3.1, 4.1.3): **Yes** if Step D spec mandates text + icon + color + `role="status"`.
- HC2 live regions (SC 4.1.3, 2.2.1, 1.4.13): **Not explicit** — §7.2 Step C addendum still required.
- HC3 score chart (SC 1.1.1, 1.3.1, 1.4.11): **Not explicit** — §10 chart + `<table>` + text-summary triad missing from listed additions.
- HC4 evidence alt/transcript (SC 1.1.1, 1.4.5, 1.2.1): **Not explicit** — §9.3 `evidence.alt` field still missing.
- HC5 API-key input (SC 1.3.1, 2.1.1, 3.3.2, 4.1.2, 3.3.8): **Not explicit** — §7.1 BYOK addendum missing.
- HC6 Stripe (SC 2.1.2, 1.3.1, 4.1.2): **Not explicit** — "Stripe Checkout hosted by default" clause missing.
- HC7 pricing table (SC 1.3.1, 1.4.4, 1.4.10, 2.4.6): **Not explicit** — §12 semantic-table clause missing.
- HC8 timeline ARIA pattern (SC 2.1.1, 4.1.2, 1.4.11): **Not explicit** — §13.6 pattern-pick missing.
- HC9 PR Markdown (SC 1.1.1, 1.3.1, 2.4.6): **Yes** — Test Strategy + §11.2 emission rules land.
- HC10 disclosure association (SC 1.3.1, 3.2.4): **Not explicit** — §14.5 `aria-describedby` clause missing.

**2. Add to v0.4:** §14.6 must enumerate the SC obligations per surface (not just "conforms to AA"). Add SC 2.4.11 Focus Not Obscured (Minimum, AA, 2.2 new), SC 2.5.8 Target Size 24px (AA, 2.2 new), SC 3.3.8 Accessible Authentication for API-key paste (AA, 2.2 new), SC 3.3.7 Redundant Entry across onboarding (AA, 2.2 new). Test Strategy must name axe-core severities that fail CI (Critical + Serious). NVDA + VoiceOver recordings cover the FAIL primary flow (signup → audit → verdict → export), not just happy path.

**3. Remove/adjust:** Nothing to remove. Adjust §14.6 wording to bind on every release touching a primary flow, not only pre-M5 — otherwise post-launch regressions ship.

**D7 resolution (refined):** Hold prior call — **"Self-Audited / Unverified" watermark**, single negative-state badge. SC-driven spec: badge carries icon + text + color (SC 1.4.1); accessible name updates with state (SC 4.1.2); focus/hover expansion to full sentence is dismissable, hoverable, persistent (SC 1.4.13); identical rendering across CLI HTML export, web report, PR Markdown (SC 3.2.4); tooltip is `aria-describedby`-linked, not title-attribute-only (SC 1.3.1). H10 tooltip framing stands.

**4. Final verdict if plan ships as-listed: PASS WITH FIXES.** §14.6 umbrella + Test Strategy + Step D close HB1/HB2 and HC1/HC9. HC2–HC8 and HC10 require the per-section addendum text (items 2–11 of my v0.3 "Add proposals") to be merged verbatim, not implied by §14.6. If BigBrain commits to landing those addenda before §14.6 audit, this is PASS WITH FIXES. If §14.6 is the sole a11y clause and per-section spec is deferred to implementation, that flips to **FAIL** — "we'll meet AA somewhere in the build" is exactly the post-launch handwave Halo Rule 6 forbids.

*Halo, signing.*
