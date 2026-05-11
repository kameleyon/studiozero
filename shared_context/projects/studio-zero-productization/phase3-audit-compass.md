# Phase 3 IA + Flow Audit — Compass

**Auditor:** Compass (Audience Alignment, Audit layer)
**Phase:** BUILD_FLOW Phase 3 — Information Architecture & User Flows
**Reviewing:** `ia/sitemap.md` v0.1 + `ia/empty-states.md` v0.1 + `ia/heuristic-budget.md` v0.1 + 7 files in `ia/user-flows/`
**Date:** 2026-05-11
**Status:** Binding on Phase 3 Jury exit gate (audience-fit verdict)

---

## 0. The four personas as I'm scoring them

PRD §5 + §15.5 + §17 D2 are the bible. I read every IA artifact against this list, not against a generic "user."

- **P1 — Solo founder, non-technical.** Managed tier ($99 Starter / $249 Pro). Pays the rent. Cannot debug a CLI, will not paste an API key, reads "GitHub App install" with a slight tightness in the chest. Buys because they were told the contractor's deliverable needs a sanity check, or because their AI-built app feels broken and they need an outside opinion.
- **P2 — Solo founder, technical (BYOK or CLI).** Primary persona per §5. Lives in Linear, Sentry, Cursor. CLI is the privacy tier they'll consider only if their code is sensitive; otherwise BYOK on hosted runner. Wants `studio-zero login` to feel like `gh auth login`.
- **P3 — Indie agency / freelancer (BYOK Pro $79).** The *verdict itself* is the deliverable they sell to *their* clients. They run audits in bulk across multiple clients. The `/v/<short-id>` share URL is their billable artifact.
- **P4 — Engineering lead at a small startup.** Pre-release gate. Wants to share verdict with the team and re-audit before launch. PRD says "single-user per tenant for v1" (§4 non-goals), which means this persona is squeezed into a solo workflow at MVP — a known constraint I will measure rather than condemn.

---

## 1. Verdict

**PASS WITH FIXES.**

The IA does not block Phase 4. Optic's 2-step intake collapse (HB-3) is a real Hick's fix, not just compression — the technical persona gets full power, the non-technical persona gets a guided path. Trace's flow files have explicit back/cancel/skip affordances on every state, which closes a class of dead-end failures that would have disproportionately hurt P1 and P4. Empty-state copy is graded — Herald's `verdict body = "We found 14 issues across UX, accessibility, and brand consistency. Here's every one, with the evidence."` lands for all four personas.

**But — five audience-harm flags, each tied to a surface, each fixable in Phase 4 without re-baking IA.**

---

## 2. Per-persona friction table

Critical path per persona; H/M/L = friction at each step. Steps map to `signup-to-first-verdict.md` S0–S9 plus the persona-specific surface called out.

### P1 — Non-technical solo founder (Managed)

| Step | Surface | Friction | Note |
|---|---|---:|---|
| S0 landing CTA | `/` "Run a free Surface audit →" | **L** | Single CTA; jargon-free. PASS. |
| S4 mode picker | `/onboarding/mode` | **M** | Three cards equal-weighted; only Managed card carries "Recommended for non-technical" badge. Good. **But: "BYOK" / "CLI" labels are jargon to this persona.** See AH-1. |
| S5c Stripe checkout | `/onboarding/managed` | **L** | Hosted Stripe (HC6). Familiar pattern. PASS. |
| S6 intake | `/app/audits/new` step 1 | **M** | "GitHub App install" is a stranger. The S6 copy *attempts* per-repo reassurance ("you pick which repos") but the install screen lives on GitHub, not on us — and that screen says "Studio Zero would like permission to..." which P1 reads as scary. See AH-3. |
| S7 depth picker | `/app/audits/new` step 2 | **L** | Quick default + Comprehensive upgrade. Custom hidden. Excellent. PASS. |
| S8 live progress | `/app/audits/[run-id]` | **M** | Agent names — *Optic, Halo, Proof, Compass, Trace, Canon, Jury* — read as impenetrable to P1. ES-AUDIT-RUNNING shows "per-agent rows: agent name, phase chip..." with no glossary. See AH-2. |
| S9 verdict | `/app/audits/[run-id]` | **L** | Herald-locked verdict copy is plain English. Score readable. PASS. |
| E2 upsell | `/app/audits/[run-id]/upgrade` + email | **M** | E2 hook copy: *"the Code audit reads your source — it finds 3 to 5 times as many issues."* Lands. But the *button* says "Run the Code audit →" and "Code SKU" appears in nav copy elsewhere — P1 doesn't have a model of *Surface vs Code*. See AH-4. |

### P2 — Technical solo founder (BYOK or CLI)

| Step | Surface | Friction | Note |
|---|---|---:|---|
| S0–S4 | as above | **L** | Mode picker correctly affords BYOK as a peer; the "Paste an Anthropic API key" framing is exactly the recognition cue this persona wants. PASS. |
| S5a BYOK dry-run | `/onboarding/byok` | **L** | HC5 password-manager support, show/hide, paste, `aria-describedby`, dry-run validation. Visible. **OQ-4 flags that the 1-token dry-run call is a customer cost not disclosed — minor copy fix.** Otherwise PASS. |
| S5b CLI pair | `/onboarding/cli` | **L** | `studio-zero login` mirrors `gh auth login`. Pairing code TTL visible. PASS. |
| S6 intake | `/app/audits/new` | **L** | Three intake methods, GitHub App vs local folder vs URL — all read correctly. PASS. |
| S7 depth + Custom | `/app/audits/new` | **L** | H7 flexibility honored: Custom expander reveals 6-reviewer multi-select for power users. PASS. |
| S8 timeline | `/app/audits/[run-id]/timeline` | **L** | `treegrid` keyboard-nav; per-agent timing data. This persona will appreciate it. PASS. |
| S9 verdict + re-audit | `/app/audits/[run-id]/re-audit` | **L** | D2 unlimited Surface re-audits surface as primary affordance. **But: where is the re-audit button rendered as "free / unlimited"?** Empty-states.md is silent on this. See AH-5. |

### P3 — Indie agency / freelancer (BYOK Pro)

| Step | Surface | Friction | Note |
|---|---|---:|---|
| Multi-project workflow | `/app/projects` | **H** | **The sitemap shows `/app/projects` and per-project pages, but the IA has no "all clients' audits" view, no bulk-audit dispatch, no client labels.** Every project lives as a sibling under one tenant. P3's mental model is "I have 8 clients; show me at-a-glance status." Trace's flows are all single-project linear. See AH-6. |
| Verdict share | `/app/audits/[run-id]/share/[token]` | **M** | Public share works. OG image. Score-only vs findings toggle. But the share page **never renders P3's branding** — it's Studio Zero's. P3 is reselling this artifact; they'd want at least a "Reviewed by [agency name]" line or co-brand affordance. Out of scope for MVP per non-goals (white-label), but flag it. |
| CLI mode for confidential client | `/onboarding/cli` | **L** | This is exactly the persona that needs CLI. Pairing flow is clean. PASS. |

### P4 — Engineering lead at small startup

| Step | Surface | Friction | Note |
|---|---|---:|---|
| Pre-launch audit | as P2 | **L** | Same flow as technical founder. PASS. |
| Share with team | `/app/audits/[run-id]/share/[token]` | **M** | Share URL is public-tokenized. Fine for "send the link to my CTO" but **no internal-only share, no comment thread, no "assign to engineer" affordance**. Multi-user per tenant is PRD §4 non-goal — known. But for P4 specifically, even at single-tenant MVP, the share URL is the only collaboration primitive. See AH-7. |
| Re-audit before release | `/app/audits/[run-id]/re-audit` | **L** | Available. PASS. |

---

## 3. Audience-harm flags

Named, surface-cited, severity-graded.

### AH-1 · **Major** · Mode picker labels "BYOK" / "CLI" are jargon to P1

- **Surface:** `/onboarding/mode` (S4).
- **Evidence:** signup-to-first-verdict.md S4 renders three mode cards with names *BYOK*, *CLI*, *Managed*. Card body copy is fine; the **name label** is the problem. P1 reads "BYOK" and thinks *bring your own…* what? "CLI" reads as "command line interface" only to someone who already knows what a CLI is.
- **Fix:** rename to human-language primary labels: *Use my API key* / *Run on my computer* / *Let Studio Zero handle it* with technical names as secondary chips for P2's recognition. Trace OQ-1 already asks about the "Skip for now" affordance — same surface, expand the rename.
- **Severity rationale:** P1 is the persona who pays $99–$249; if they bounce here they never even reach the Managed checkout. Trace's flow correctly badges Managed as "Recommended for non-technical" but the *peer labels* are still alien.

### AH-2 · **Major** · Agent names ("Optic / Halo / Proof / Compass / Trace / Canon / Jury") render as jargon to P1 without a glossary

- **Surface:** `/app/audits/[run-id]/timeline` (HC8 treegrid), ES-AUDIT-RUNNING in `empty-states.md`, verdict screen findings rows (`finding.reviewer` field per PRD §9.4).
- **Evidence:** empty-states.md ES-AUDIT-RUNNING line: *"Per-agent rows: agent name, phase chip [...]"* — no spec for what P1 sees when "Halo" appears next to "Running heuristics." For P2/P4 agent names read as *expert peers* (good — same affordance as Linear's Cycle / Project / Initiative vocabulary). For P1 they're opaque.
- **Fix options (Phase 4):**
  - (a) On hover / focus, each agent chip shows the persona-readable role: `HALO — Accessibility reviewer`.
  - (b) On first-run only, a one-line key above the timeline: *"Seven specialist reviewers. Hover any name for what it checks."*
  - (c) Findings list groups by category first (Accessibility / UX / Copy / Brand), reviewer name as secondary metadata. Empty-states.md doesn't spec this; sitemap allows it.
- **Severity:** Major — names don't *block* P1, but they're a 12-minute exposure during S8 (the anxiety vector Optic-C3 already identified). Compounding cognitive load on the persona least equipped to absorb it.

### AH-3 · **Major** · GitHub App install handoff is a trust break for P1 with no in-app reassurance frame

- **Surface:** `/auth/install/github` callback + S6 intake.
- **Evidence:** S6 copy says *"You pick which repos; we never see the rest. The audit runs read-only."* — correct framing. But the user **leaves our site** to GitHub's own consent screen, which lists raw permissions (Read access to code, metadata...). P1 sees that screen cold. The IA has no "what this means in plain English" interstitial *before* the GitHub redirect.
- **Fix:** insert an interstitial route (proposed: `/onboarding/github/preview`) that shows the exact permissions list with Herald-voice plain-English translation *before* the GitHub redirect. Free Tier's free-Surface-on-attested-own-URL path (PRD §17 D2) lets P1 avoid GitHub entirely for the first audit — but the sitemap doesn't currently signpost this divergence. The "Attested own URL" card on S6 should be visually equal to "GitHub repo" for free-tier users, not the third option.
- **Severity:** Major. This is the install moment that converts the §15 25-paying-customers-in-60-days target. Lose P1 here and the Managed tier never seats.

### AH-4 · **Critical** · "Surface" / "Code" / "Full" SKU vocabulary lacks an in-app glossary for P1 and bleeds into upsell copy

- **Surface:** E2 lifecycle email + `/app/audits/[run-id]/upgrade` + verdict-to-upsell-loop.md V1a.
- **Evidence:** PRD §9.1 defines the SKUs. PRD §6.3 E2 email CTA: *"Run the Code audit →"*. verdict-to-upsell-loop.md V1a copy: *"The Code audit reads your source — it finds 3 to 5 times as many issues."* — the 3-to-5x line is good. But "Code audit" as a *named SKU* never gets a Plain-English handoff before the customer is asked to upgrade. P1 thinks *"my code? what code? I had a contractor build this."*
- **Fix:**
  - V1a CTA secondary line: *"Code = we read what's under the hood, not just the live site."* (Herald to copy-grade.)
  - `/pricing` page already needs HC7 semantic table — add a **plain-English subtitle per SKU**: *Surface · audits the live site*; *Code · audits the source code*; *Full · audits both*.
  - E2 email body must include the plain-English translation, not just "Run the Code audit →".
- **Severity:** **Critical.** This is the wedge translation. PRD §15 measures *Code-audit upgrade attach rate > 20% of free signups* as a launch metric. If P1 doesn't grasp what they're upgrading *to*, the conversion target dies. Sitemap is fine; the copy gap inside the linked surfaces is not.

### AH-5 · **Major** · D2 (free-tier unlimited Surface re-audits) is not surfaced as a feature anywhere in the verdict→upsell loop

- **Surface:** V1a card on verdict screen, `/app/audits/[run-id]/re-audit` proposed route, dashboard for free-tier users.
- **Evidence:** verdict-to-upsell-loop.md V1a renders the upsell card. The "Stay on free Surface" + "Run another Surface audit on this project →" links exist. But **neither of those links communicates the *unlimited* benefit**. PRD §17 D2 rationale: *"the strict-elite gate fails 70%+ of first audits; the free tier's only job is to make the customer feel the audit→fix→re-audit loop close."* That feeling depends on the customer *knowing* the next re-audit is free.
- **Fix:** every verdict screen for a free-tier user renders a persistent chip near the secondary CTA: `FREE · UNLIMITED RE-AUDITS ON THIS PROJECT` (Herald to copy-grade). The chip is the contract D2 promises.
- **Severity:** Major. This is the dopamine loop Decision D2 was bought to deliver. The IA buried the receipt.

### AH-6 · **Major** · Multi-project / multi-client mental model is absent for P3 (indie agency)

- **Surface:** `/app/projects` (project list), no `/app/clients` route, no bulk-dispatch route, no portfolio overview.
- **Evidence:** sitemap.md `/app/projects` is a flat list. No tagging, no labels, no client-grouping. verdict-to-upsell-loop.md V2c share affordance is per-run, not per-client. PRD §5 explicitly names indie agencies as a persona; pricing §12 BYOK Pro $79 explicitly targets them with *"Unlimited audits (any depth)."* But the IA gives them no mental tooling to **organize unlimited audits across N clients**.
- **Fix (Phase 4 / V1.1 if not MVP):**
  - Minimum at MVP: a free-text "client" / "tag" field on the project create form. Project list groups by tag.
  - V1.1: dedicated `/app/clients` route. Bulk re-audit dispatch ("re-audit all 8 clients tonight").
  - The agency-specific verdict-share is a separate ask (white-label is V1 non-goal); a "co-attribution line" on `/v/<short-id>` (*"Audit run by [agency name] using Studio Zero"*) is a low-cost MVP win.
- **Severity:** Major. P3 is one of four named personas; the IA accommodates the other three but treats P3 as P2-with-volume.

### AH-7 · **Minor** · P4's team-share scenario forces tokenized public URL as the only collaboration primitive

- **Surface:** `/app/audits/[run-id]/share/[share-token]`.
- **Evidence:** sitemap.md correctly notes the share route is "token-gated, anon-reachable." For P4 sending the verdict to their CTO this works fine. But there's no "share with a teammate inside my tenant" affordance because there *is* no concept of a teammate (PRD §4 non-goal). The known constraint is acknowledged; flag it for V2 (`/app/settings/team`) so the IA growth path is preserved.
- **Severity:** Minor. Constraint is explicit in the PRD; not a Phase 3 IA defect, just an acknowledgment that P4's flow is squeezed.

### Wrong-audience-seduction check · **PASS** (with one watch)

Does the IA over-rotate toward P2 (the developer-founder) and accidentally exclude the $249 Managed customer? Mostly **no**:

- The 2-step intake collapse (HB-3) explicitly fixes the 27-combination Hick's failure that would have shipped a Cursor-style power-user matrix at P1.
- The mode picker is 3 cards, not a comparison table — P1 can choose without comparison-shopping.
- The verdict-screen primary CTA is single, locked, persona-agnostic.
- Empty-states.md grades copy to Flesch-Kincaid ≤ 8 (in-app) / ≤ 7 (FAIL) / ≤ 6 (errors). P1-safe.

**One watch:** the **agent-names language** (AH-2) is the seam where Cursor-power-user-aesthetics could leak in. As long as the verdict and findings surfaces *also* expose category names (Accessibility, UX, Copy, Brand, Flow, Audience) as the primary grouping — with agent names as secondary — the seduction stays contained. Currently empty-states.md and sitemap.md let agent names be primary. **Recommendation (binding for Phase 4):** PRD §9.4 `findings[].reviewer` becomes a secondary label; the primary grouping is *category* (Accessibility / UX / Copy / etc.). This is a one-page Optic + Herald artifact that I want to see before brand build kicks off in Phase 4.

---

## 4. Per-persona vignettes — 11pm at the kitchen table

### P1 — Non-technical solo founder, opens Studio Zero at 11pm

*Their AI-built app feels slow and one form keeps breaking. They land on `/`, see one CTA in English ("Run a free Surface audit →"), and click. Signup is fast — they use Google OAuth. They hit `/onboarding/mode` and see three cards: **BYOK · CLI · Managed**. They don't know what BYOK is. The Managed card has a "Recommended for non-technical" badge — they click that. Stripe Checkout, they pay $99, they're in. Then `/app/audits/new` asks "What do you have?" and they pick "Attested own URL" because the GitHub thing scared them. The audit runs for 12 minutes; the timeline shows seven boxes labeled **Optic Halo Proof Compass Trace Canon Jury** and they don't know what any of them mean — they wait. The verdict says FAIL, the body says **"We found 14 issues..."**, and they breathe out. The next CTA says "Run the Code audit →" and they hover for a moment because nobody explained the difference. **Click likelihood at the upsell: medium. The fix: AH-1, AH-2, AH-4.***

### P2 — Technical solo founder, opens Studio Zero at 11pm

*Their app is fine but they want a sanity check before launching. They land, scan the hero, click the secondary "See how it works." They read three sections. They sign up with GitHub OAuth, pick BYOK, paste their key, see the dry-run validate. They install the GitHub App on the one repo. The intake says "What do you have?" — they pick repo. The depth picker offers Quick / Comprehensive / Advanced; they expand Advanced to confirm they can pick a subset. Reassured, they collapse it and pick Quick. The timeline shows agent names — they recognize the pattern (Linear has "Cycle," Sentry has "Issue") and feel at home. Verdict: FAIL, score 67. They scroll through findings, copy three to Linear, click "Re-audit free →" without thinking about whether it costs them. **Click likelihood at re-audit: high.***

### P3 — Indie agency, two glasses of wine in, 11:45pm

*They have three clients to audit this week. They land on the dashboard and there is **one flat project list**. They created "Acme Co", "Beth's Cafe", and "Carlos PT" yesterday and now they can't remember which is which without clicking each one. They run an audit on Acme, get a 71 / PASS WITH FIXES, click "Share verdict →" and copy the URL. They paste it into the Acme client email. The share page renders aqua-and-mono Studio Zero branding with no attribution to the agency. The client opens the link and asks "what's Studio Zero, why am I trusting them, where's your name?" The freelancer types a paragraph explaining. **Click likelihood at next-audit-purchase: medium. The fix: AH-6.***

### P4 — Engineering lead at small startup, 11pm pre-launch

*Their team is shipping a v1 next week and they want a black-box audit. They sign up with BYOK, run a Comprehensive audit, get a PASS WITH FIXES at 82. They want to share it with their CTO and one engineer. They click "Share verdict →" — it generates a public tokenized URL. They paste it in Slack with "FYI before Wednesday." The CTO opens it, sees the radar chart and findings, replies "two of these are blockers." Nobody can assign findings to anybody; nobody can comment on a finding inside Studio Zero. They copy three findings into Linear manually. The next day, the engineer ships fixes and the lead clicks "Re-audit →" — new score 91, PASS. They share again. **Click likelihood at renewal: high — the workflow is rough, but the receipt is good. AH-7 is known and acceptable at MVP.***

---

## 5. Phase 3 gate verdict

**Compass votes PASS WITH FIXES on Phase 3.**

I do not block Phase 4 brand-build kickoff. The five Major / one Critical / one Minor flags are **Phase 4 copy + interstitial + chip-affordance work**, not IA rebuilds. The sitemap is correct; the empty-states catalog is structurally correct; the heuristic-budget is correct. The flow files have every back/cancel/skip I want to see.

**Fix order (binding for Phase 4 gate):**

1. **AH-4 (Critical) — SKU vocabulary plain-English subtitles** everywhere "Surface / Code / Full" appears. Herald owns the copy; Optic owns the placement.
2. **AH-1 (Major) — mode picker human-language labels** with technical names as secondary chips.
3. **AH-2 (Major) — agent-names glossary affordance** on the run timeline + findings list grouped by category, not by reviewer.
4. **AH-3 (Major) — GitHub install interstitial** with plain-English translation of the permissions screen; equal visual weight for "Attested own URL" on free tier S6.
5. **AH-5 (Major) — D2 unlimited-re-audit chip** persistent on free-tier verdict screens.
6. **AH-6 (Major) — minimum: project-tag field for P3** at MVP. Bulk dispatch + `/app/clients` route by V1.1.
7. **AH-7 (Minor) — acknowledged constraint;** ensure `/app/settings/team` route placeholder remains in sitemap (it does).

**Open questions for the panel:**

- **OQ-Compass-1:** AH-6 (P3 multi-project) — Penny + Scout: is BYOK Pro $79 actually marketed to indie agencies, or have we silently abandoned P3 in favor of P2 volume? If P3 is in, the IA needs the fix. If P3 is out, update PRD §5.
- **OQ-Compass-2:** AH-4 (SKU vocabulary) — Herald + Hook: should the SKUs themselves be **renamed** to plain English (e.g., *Live Site Audit / Source Code Audit / Full Audit*) in customer-facing copy while keeping Surface/Code/Full as internal names? This is a brand-voice call, not an IA call.
- **OQ-Compass-3:** AH-2 (agent names) — Pixel + Optic + Herald: do agent names appear *anywhere* P1 sees them, or are they hidden in P1 mode entirely? My read: keep them, but glossary them. Pixel may disagree.

**Severity legend (per jury.md):** Blocker = persona cannot complete primary task; Critical = significant friction / abandonment risk; Major = secondary persona excluded or pattern misaligns; Minor = small mismatches.

This audit produced **0 Blockers, 1 Critical, 5 Major, 1 Minor.**

---

*End of Phase 3 audit. Compass — Audit Layer. Verdict travels to Jury.*
