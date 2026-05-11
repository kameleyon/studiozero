# Phase 2 Brand Audit — Compass

**Auditor:** Compass (Audience Alignment, Audit layer)
**Phase:** BUILD_FLOW Phase 2 — Brand Identity
**Reviewing:** Pixel's three visual directions (A · Auditor's Notebook, B · Hard Evidence, C · Receipts)
**Date:** 2026-05-11
**Status:** Binding on Phase 2 exit gate (audience-fit verdict)

---

## 0. What I'm scoring against (no audit without a defined audience)

PRD §5 defines the audience. I will not let the team's aesthetic preferences override it.

- **Primary persona (MVP):** **Technical solo founder.** BYOK / CLI mode. Lives in Linear, Sentry, Datadog, Cursor, Read.cv. Patient with rough product. Resents marketing-bright UI. GTM channel = X / HN / IndieHackers (PRD §15.5). **Buys the tool because they want receipts they can defend in writing.** This persona's "click" is the gate.
- **Secondary persona — non-technical solo founder (Managed tier).** Pays $99/mo or $249/mo — the **3.1× tier** (vs. $79 BYOK Pro, vs. $29 Starter). Pricing reality: this persona pays the rent. If the visual brand reads as "this is for engineers, not me," the Managed tier never seats.
- **Secondary persona — indie agency / freelancer (BYOK Pro $79).** The deliverable is the verdict itself. They re-export Studio Zero's receipts to *their* client. They need the artifact to look defensible *in front of a third party they don't control.*
- **Quaternary persona — engineering lead at a small startup.** Buys Linear / Stripe / Vercel. Recognizes editorial restraint as a quality signal. Forgiving of any of the three directions.
- **Explicitly not the user:** the enterprise procurement buyer (Vanta-blue would address this audience, and we are not addressing it).

What every persona is buying is the same noun: **evidence they can defend.** The brand must signal "this verdict survives outside contact with the customer's investor / boss / client." That is the audience-harm test.

---

## 1. Per-direction verdicts

### Direction A — The Auditor's Notebook · **PASS**

**Aesthetic in one sentence:** editorial-restrained dark with one warm-cream accent, Instrument Serif italic for emphasis, Geist for body, Geist Mono for metadata.

**Persona-fit scoring:**

| Persona | Comprehension | Motivation match | Trust | Friction | Completion |
|---|---|---|---|---|---|
| Technical solo founder (primary) | 5 | 4 | 5 | 5 | 5 |
| Non-tech solo founder (Managed) | 5 | 4 | 4 | 5 | 5 |
| Indie agency / freelancer | 5 | 4 | 5 | 5 | 5 |
| Engineering lead | 5 | 4 | 5 | 5 | 5 |

**3-line vignette — tired technical founder, 11pm:** *Lands on the site. Reads: dark page, italic phrase, no demo-day gradient, no rocket emoji. Recognizes the register inside two seconds — "this is built by people who use Linear, not people who pitch at YC demo day." Reads two paragraphs because the type isn't yelling. Closes the tab having added it to the open-in-the-morning list. **Click likelihood: high.***

**3-line vignette — non-technical solo founder evaluating Managed $99:** *Lands on the site. Doesn't recognize "Linear / Stripe Press" as a reference but reads it as "serious, like the bank's website." Doesn't feel locked out — the H1 is in English, the CTA is one sentence. Calls a contractor friend to ask "is this legit?" The friend says yes. **Click likelihood: medium-high — survives the friend-test.***

**3-line vignette — indie agency exporting a verdict to a client:** *Runs an audit, gets a 78/100, screenshots the verdict screen for the deck. Verdict chip is identifiable, type is editorial. Client looks at the screenshot and reads "this is from a tool, not a hobby." **Defensibility: holds.***

**Audience-harm flags:** none.

**Wrong-audience seduction:** none. Direction A is what a competent designer would ship for this audience without trying to win a design award.

**The risks Pixel flagged honestly:**
- "Most conservative — least distinctive in a screenshot grid." Correct, but the brand doesn't win on screenshot grids; the brand wins on whether the technical founder reads the verdict and forwards it. A is built for the forward, not the grid.
- "Reads as intimidating to non-technical." Mitigated by Herald's voice doc (warm in copy, restrained in color). Verified — Herald §2 voice axes sit on "slightly warm / slightly formal," which is the exact register that pairs with this brand.

**Verdict: PASS.** No fixes required at brand-token level. Audience-fit is best-balanced of the three.

---

### Direction B — Hard Evidence · **PASS WITH FIXES**

**Aesthetic in one sentence:** Direction A's dark spine + a bone-paper light surface for exports / PDF / PR-body / email + a press-ink (deep navy) structural accent.

**Persona-fit scoring:**

| Persona | Comprehension | Motivation match | Trust | Friction | Completion |
|---|---|---|---|---|---|
| Technical solo founder (primary) | 5 | 4 | 5 | 4 | 5 |
| Non-tech solo founder (Managed) | 5 | 5 | 5 | 4 | 5 |
| Indie agency / freelancer | 5 | 5 | 5 | 5 | 5 |
| Engineering lead | 5 | 4 | 5 | 4 | 5 |

**3-line vignette — tired technical founder, 11pm:** *Lands on dark hero (same read as Direction A). Scrolls. Sees a bone-paper PDF export screenshot. Reads it as "this exports cleanly to a doc I can hand to my co-founder." Adds it to the morning list. **Click likelihood: high.***

**3-line vignette — non-technical solo founder evaluating Managed:** *Sees the bone PDF mock-up first. Reads it as "this is a report, not a debug tool." This is the persona Direction B actually wins, harder than A. **Click likelihood: high — bone-surface is the friend-test conversation-starter.***

**3-line vignette — indie agency exporting a verdict to a client:** *Direction B's whole reason to exist. Gets the verdict, exports the bone-paper PDF, drops it into a client deliverable. The bone surface reads as "I had this audited," not "I ran a tool." **Defensibility: maximum. This persona converts harder under B than under A.***

**Where audience-fit hits trouble (the fixes):**

- **Fix B1 (Critical) — the press-ink accent risks reading as SaaS-blue.** `#0f2748` is a defensible editorial-press color in isolation. But the primary persona spends their day looking at Vanta-blue, Stripe-blue, GitHub-blue. A press-ink "68" in a score block at 11pm reads as "another SaaS hyperlink" unless the type and layout *aggressively* sell the editorial register. Pixel's `press_ink_usage_rule` (≤1 callout per section, no buttons, no icons) is the right enforcement, but it's the kind of rule that bends after the third contributor. **Mitigation:** Canon's drift detector must treat any press-ink use outside the three permitted slots as a Critical finding *and* the marketing landing must ship without press-ink for the first 90 days (let the bone surface earn the navy on artifacts, not on the marketing page where it reads as link-blue).
- **Fix B2 (Major) — two-mode brand doubles every audience-fit test.** Compass scores every screen *per persona*. Direction B asks Compass + Halo + Canon to score every screen *per persona × per surface*. Acceptable, but the surface-assignment table in `usage-rules.md` must be **immutable in production CSS** — any contributor mixing bone-on-dark inside a viewport is a regression that the audit cycle has to catch retroactively. **Mitigation:** add a CI check that rejects a single rendered page rendering tokens from both `background_dark` and `background_bone` namespaces.
- **Fix B3 (Major) — the bone-mark favicon at 16 px.** Pixel notes the inner ring blurs against the bone texture at 16 px. Acceptable per the spec, but the *fallback rule* needs to be unambiguous: at the OS / browser favicon level, the brand must look like one thing, not two. **Mitigation:** explicit `<link rel="icon">` switch per `prefers-color-scheme` in the layout file before bone ships.
- **Fix B4 (Minor) — the serif lockup adds a fourth typeface (Source Serif 4).** Acceptable, but every new typeface is an audit burden for Tongue (subset coverage), Halo (rendering-fidelity at small sizes on Windows GDI), and Canon (CSS variable surface). **Mitigation:** before bone ships, verify Source Serif 4 covers Tongue's M2 locale set (CJK is not — confirm Latin-only is OK at MVP).

**Audience-harm flags:** none, *if* fixes B1–B4 are accepted.

**Wrong-audience seduction:** mild. The bone surface is sufficiently elegant that an aesthetic-savvy designer-founder will rate Direction B "the most beautiful" — the risk is over-investing brand maintenance against an audience that isn't paying the rent yet. Mitigated by surfacing bone *as an export-time artifact*, not as a daily-driver UI shift.

**Verdict: PASS WITH FIXES.** Direction B is strictly more *defensible-to-third-parties* than A, but at higher maintenance cost. Use if-and-only-if the bone surface is treated as a Phase-3+ deliverable, not a Phase-2 invariant.

---

### Direction C — Receipts · **FAIL**

**Aesthetic in one sentence:** brutalist-monochrome, Geist Mono promoted to body co-equal, no warm accent, sharp corners, no cursor glow, no warmth.

**Persona-fit scoring:**

| Persona | Comprehension | Motivation match | Trust | Friction | Completion |
|---|---|---|---|---|---|
| Technical solo founder (primary) | 5 | 5 | 5 | 5 | 5 |
| **Non-tech solo founder (Managed) — 3.1× the price tag** | **2** | **2** | **2** | **2** | **3** |
| Indie agency / freelancer | 5 | 4 | 4 | 4 | 5 |
| Engineering lead | 5 | 5 | 5 | 5 | 5 |

**3-line vignette — tired technical founder, 11pm:** *Lands on the page. Reads it as Read.cv / Modal Labs / Linear's changelog header. Recognizes the tribe immediately. Forwards to two friends on X with the caption "finally a tool that doesn't look like it was designed by a growth marketer." **Click likelihood: maximum. Best-in-class.***

**3-line vignette — non-technical solo founder evaluating Managed $99:** *Lands on the page. Geist Mono everywhere. Sharp corners. No warmth. Reads as "this is for programmers." Closes the tab. Calls the contractor friend who would have unblocked Direction A, but the friend says "this is built for devs — find something else." **Click likelihood: low. Does not survive the friend-test. This is a $99–$249/mo audience that just bounced.***

**3-line vignette — indie agency exporting a verdict to a client:** *Direction C has no light surface. The PR-body Markdown header in `code-formatting backticks` reads on GitHub as "internal tooling output," not "audit deliverable." Client looks at the screenshot and reads it as "this is from someone's terminal," not "this is from a tool that audits things for me." Defensibility drops. **Falls short on the deliverable surface specifically.***

**Audience-harm flags (BIGBRAIN rubric #1 — exclude / mislead / fail a target persona):**

- **Flag C1 (Blocker for the persona, Critical for the business) — Direction C excludes the non-technical solo founder.** Pixel says it out loud in the spec ("This direction makes a deliberate audience-trade: wins the primary MVP persona harder, sacrifices the V2 Managed-tier expansion audience"). That is the honest read. But the Managed tier is **not a V2 audience** — it ships at MVP per PRD §12 and Decision D6 (Managed before CLI). The pricing table has Managed Starter at $99 and Managed Pro at $249, and PRD §5 row 1 names the non-technical solo founder. Direction C deliberately fails a paying audience that the PRD says is in scope at launch. **This is the audience-harm test failing.**
- **Flag C2 (Critical) — Direction C ships no light-mode surface.** GitHub PR bodies render light by default. Customer emails render light by default. The brand's answer in Direction C is "render it in a terminal-status-line voice and call it a Direction C signature." That's a brand-voice choice for the primary persona, but for the indie agency forwarding the verdict to a non-technical client, the GitHub light render reads as "this is internal logging," not "this is a deliverable." Direction C is *narrower than the audience the PRD names.*
- **Flag C3 (Major) — brutalism-as-2026-trend risk.** Pixel flags this honestly: "Brutalist monospace-heavy direction is *trendy in 2026* — risks reading as 'indie-dev cosplay' if execution wobbles." Compass agrees. The brand is leaning hard on a register that is currently *en vogue* on Read.cv / Modal / Linear changelog. By the time Studio Zero ships M2 (per the M1 / M2 schedule in PRD §15), the register may already feel period-specific. A is timeless-editorial; C is 2026-editorial. Audience-fit horizon shortens.
- **Flag C4 (Minor) — the wordmark in mono lowercase reads as "small project."** Geist Mono lowercase is the register of Linear's *pre-rebrand* changelog header, Read.cv, Modal Labs. All three are products built by small teams for small teams. Studio Zero positions premium ($249/mo Managed Pro). The wordmark register undersells the price.

**Wrong-audience seduction (this is where C fails hardest):**

Direction C is the direction the team will fall in love with because *Compass and Pixel are technical*, and the technical-founder vignette under C is the most enthusiastic vignette in this audit. **That is exactly the trap.** The primary persona is one of four named personas in PRD §5, and the other three pay more. The aesthetic-savvy designer-founder reading this report will see "Direction C is the most distinctive" and want to ship it. The non-technical solo founder paying $99/mo will never see this report — but they will see the landing page, and they will bounce.

**Verdict: FAIL.** Direction C is the right brand for a different product — one that prices like Linear ($8/seat/mo dev-team buyer), not like Studio Zero ($99–$249/mo audience that includes non-technical Managed-tier buyers). Ship it and Studio Zero converts the persona it least needs to convert (technical founder will tolerate any of three directions; they're the patient one) and loses the persona that pays the rent.

---

## 2. Brand-pick vote

### **Direction A — PASS — single vote.**

**Why A over B:**

- A serves all four PRD §5 personas at PASS-level. B serves the agency / freelancer harder, but at the cost of doubling Canon's audit surface and asking Compass to score per-persona × per-surface from day one. The agency persona is real, but it is the *second* persona Pixel optimizes for, not the first.
- A is the lowest-regret direction (Pixel's own framing — verified). Migrating A → B later (when M2 demand for bone-surface exports surfaces) is a controlled additive change. Migrating C → A or C → B later is a brand crisis ("they softened the brand because it wasn't working" is the only read).
- A's warm-cream accent is the single piece of brand emotional warmth that compensates for the dark canvas. Removing it (Direction C) leaves Herald's voice doc carrying 100% of the emotional register — which is a single point of failure. Adding press-ink (Direction B) doubles the accent vocabulary without adding emotional warmth to the *primary* surface.
- A renders cleanly on every surface the MVP must ship — including the surfaces B claims to solve (GitHub PR-body Markdown renders fine in plain Markdown because A is structural-not-chromatic, per Pixel's own §motion appropriateness table in A's usage rules).

**Why not B (vote for A despite B's strengths):**

- B's bone surface is genuinely the better answer for the *export artifact*. But the export artifact is a Phase-3 deliverable per BUILD_FLOW, and Phase 2 is locking the brand. Locking B in Phase 2 commits the brand to bone-surface maintenance *before the V1.5 Auto-PR ships*. Compass recommends: ship A, escalate "add bone-surface as Direction B layer" as a Phase-3 amendment when V1.5 Auto-PR lands and the export use-case is real.
- If Pixel and Jo want to ship A *with the contract* that B's bone-surface is a known Phase-3 extension (rather than a separate brand decision), Compass endorses that. The two directions are compatible by Pixel's own construction.

**Why not C:**

- See §1 Direction C audience-harm flags. C deliberately excludes the Managed-tier audience that the PRD §12 pricing table says ships at MVP. C is the right brand for the wrong product. Do not let the design taste of the team override the audience the PRD names.

---

## 3. Phase 2 exit gate — Compass verdict

**PASS** (Direction A locked; Direction B held as a Phase-3 amendment slot; Direction C rejected on audience-harm grounds).

**Gate conditions:**
1. Pixel locks Direction A's tokens.json as the canonical brand. Direction B's bone surface escalated to Phase-3 as a deferred amendment, contingent on M2 export demand surfacing.
2. Canon's drift detector configured against Direction A's `tokens.json§_contrast_pairs` allowed list. Any non-listed pair is a Critical finding (per Direction A usage-rules §"Contrast pairings (locked)").
3. Herald's voice doc remains the single source of emotional register. Direction A's restraint is the visual half of "the audit you can defend in writing"; Herald's slightly-warm voice is the verbal half.
4. The two open questions Pixel surfaced at the bottom of `directions.md`:
   - Q1 (bone-paper surface): deferred to Phase 3 per this verdict.
   - Q2 (brand-as-marketing-hook via Direction C): **declined.** The verdict screenshots are the marketing hook, not the brand chrome.
   - Q3 (logo SVG generation): escalates to BigBrain per CAPABILITIES.md routing — not a Compass call.

**What this verdict does not say:** Compass is not voting on Pixel's aesthetic taste, on Canon's audit burden preference, or on Halo's contrast pass (Halo audits separately). Compass is voting on whether the named personas in PRD §5 see themselves in the brand and click. Direction A wins that test for all four. Direction B wins it for three of four at higher cost. Direction C wins it for one of four and loses the most expensive one.

**The audience is the brief. The brief is the audience. A passes the brief.**

---

*End of Phase 2 audit — Compass.*
*Sent to: Jury (synthesis), Pixel (lock), Canon (drift detector config), Halo (contrast-pass coordination), Axiom (PRD persona reference).*
