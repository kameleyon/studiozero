# Studio Zero — Visual Brand Directions

**Phase:** BUILD_FLOW Phase 2 — Brand Identity
**Author:** Pixel
**Date:** 2026-05-10
**Status:** Draft for Jo's pick + Canon/Compass/Halo audit

---

## Framing

Studio Zero's product is *evidence under verdict*. The one-line statement — *"Your AI builder shipped code that fails accessibility. We'll prove it — line by line."* — sets a register: editorial, receipts-driven, slightly adversarial without being punitive. The brand must look like a thing that *audits* other things. Not a thing that builds them faster, prettier, cheaper.

The competitive set (v0.dev, Bolt, Lovable, Cursor, Devin, Replit Agent) trends toward gradient-saturated, demo-day, friendly-techy. Vanta/Drata trends toward enterprise-trust-blue. Codacy/SonarQube trend toward neutral-utilitarian. Studio Zero's wedge in the visual landscape is the same as its wedge in the product: **editorial seriousness** — the visual register of FT, Stripe Press, Linear's restraint, Bloomberg's data density. Not playful, not bro-y, not corporate-blue-SaaS.

Three directions follow. All three respect the existing template's structural bones (dark canvas, 6px radius, Instrument Serif + Geist + Geist Mono, grain overlay). They diverge in **emotional temperature** and **accent posture**.

---

## Direction A — The Auditor's Notebook

**Aesthetic thesis:** *Hard receipts, editorial typography, no glamour.* Refines the template Jo already shipped — keeps the warm-cream-on-near-black palette, sharpens hierarchy, locks token discipline. The brand is a leather-bound auditor's ledger photographed in a quiet room.

**Competitive aesthetic space:** Stripe Press's editorial restraint + Linear's monochrome discipline + the New York Review of Books' typographic confidence. Departs from every named competitor's gradient/glow language.

**Departure from baseline template:**
| Element | Direction A |
|---|---|
| Background system | **KEEP** — `#050506` → `#1c1c20` five-stop dark scale |
| Ink scale | **KEEP** — four-stop neutral ladder |
| Accent | **EVOLVE** — single warm cream `#cfc4b3` (oklch 0.78 0.02 70) used only for: italicized headline phrases, verdict-PASS state framing, marketing emphasis. Never used as a button fill. |
| Type pairing | **KEEP** — Instrument Serif italic + Geist + Geist Mono |
| Radius | **KEEP** — 6px geometric / 14px card |
| Grain + cursor glow | **KEEP** — both at current intensity (grain 0.035, glow 600px) |
| Motion | **EVOLVE** — codified `prefers-reduced-motion` table, throttled to ≤4 updates/sec for live regions (Halo HC2) |

**Pros:**
- Zero migration cost — landing page already renders in this language.
- Reads as serious / premium without needing customer education.
- Warm cream prevents the brand from feeling clinical-cold (a real risk with pure-neutral palettes).
- Editorial register matches the verdict-as-evidence content posture.

**Cons:**
- Most conservative of the three — least visually distinctive in a screenshot grid against Linear / Vercel / Stripe Atlas.
- Warm cream as accent is subtle; the brand carries on typography, not color.

**Best-fit persona (PRD §5):** Engineering lead at a small startup. Reads as "trusted internal tool" — the kind of brand you'd put a budget request behind.

**Recommended for:** the customer who already buys Linear, Stripe, Vercel; recognizes the editorial register; understands restraint as a quality signal.

**Risk — who this loses:** Non-technical solo founders looking for a friendly onboarding feeling. May read as "intimidating / for serious engineers." Mitigate via Herald's voice doc — warmth in copy compensates for restraint in color.

---

## Direction B — Hard Evidence

**Aesthetic thesis:** *Editorial dark for the product, editorial bone-paper for the artifacts.* Same dark spine as A, but introduces a **paper-bone light mode** (`#f3ede0`) specifically for the surfaces customers export and share: verdict PDFs, audit reports, transactional emails, PR-body Markdown rendered on GitHub. Adds a single **press-ink** accent — deep newspaper blue `#0f2748` on bone, lifted to `#b8d4ff` on dark — used structurally (links, score-line callouts), never decoratively.

**Competitive aesthetic space:** Financial Times print + Stripe Atlas docs + Mercury Bank's two-surface system. The dark surface holds the live product; the bone surface holds the *receipts*. The dichotomy itself is the brand story: *the audit happens in the dark room; the verdict is delivered on paper.*

**Departure from baseline template:**
| Element | Direction B |
|---|---|
| Background system | **EVOLVE** — keep dark scale; **add** five-stop bone scale `#f3ede0` → `#1a1814` for light-mode exports |
| Ink scale | **EVOLVE** — dark-mode ink scale unchanged; light-mode ink scale inverted with bone-tinted blacks (not pure black — pure black on bone fatigues at body-text size) |
| Accent | **EVOLVE** — adds **press-ink** structural color (`#0f2748` on bone, `#b8d4ff` on dark) + retains warm cream `#cfc4b3` for editorial flourish |
| Type pairing | **KEEP** + adds **Source Serif 4** as long-form reading face for exported reports (Instrument Serif is a display face — wrong for 800-word PDF body) |
| Radius | **KEEP** 6/14 |
| Grain + cursor glow | **KEEP** on dark; **DROP** on bone (grain on light bg reads as "low-res JPEG", not editorial) |
| Motion | **EVOLVE** — same as A |

**Pros:**
- Solves a real product problem: PR-body Markdown rendered on GitHub is light-mode by default; the brand currently has no answer for that surface.
- The dark/bone dichotomy is *memorable* — a screenshot of a Studio Zero verdict on bone paper is instantly identifiable.
- Press-ink accent gives Herald a structural color for hyperlinks without inventing SaaS-blue.
- Light mode is a first-class brand surface (Pixel rule #5), not an afterthought.

**Cons:**
- ~2× the token surface area to maintain (Canon's audit burden doubles).
- Two-mode brand is harder to teach to contributors than one-mode.
- Light-mode bone palette must be tested at low-vision settings — bone-on-bone risks failing reflowed view (SC 1.4.12).

**Best-fit persona:** Indie agency / freelancer. They re-export the verdict to *their* client. Two surfaces = two audiences served — the dark product for them, the bone PDF for their client.

**Recommended for:** the customer whose deliverable is the verdict itself, not the product the verdict is about. The customer who needs to *send the receipt* somewhere.

**Risk — who this loses:** Customers who only ever live inside the dashboard. The bone surface is wasted on them, and they pay (slightly) in build complexity. Also: introduces a structural blue, even a print-press one — risks reading as "SaaS-blue-adjacent" if not policed by Canon.

---

## Direction C — Receipts

**Aesthetic thesis:** *Brutalist editorial. Monospace as the body voice. No warmth. The verdict is the only color.* The product surface is pure-neutral — five-stop dark, four-stop achromatic ink, **zero chromatic accent in the brand**. The only color anywhere is reserved for verdict states (FAIL red `#C8421A`, PASS-WITH-FIXES gold `#E4C875`, PASS aqua `#14C8CC`) and severity tags. Geist Mono is elevated from accent to **co-equal** with Geist — used for all metadata, all numbers, all data labels, half the navigation. Instrument Serif retreats to single-purpose: italicized emphasis on H1 phrases, and verdict-screen headers only.

**Competitive aesthetic space:** Bloomberg Terminal + Linear's changelog + Berkshire Hathaway's annual report + Read.cv. Hard departure from every named competitor. Closest neighbor is Modal Labs's monochrome data-density.

**Departure from baseline template:**
| Element | Direction C |
|---|---|
| Background system | **EVOLVE** — keep five-stop dark, recalibrated cooler (`#050507` → `#1c1c1f`, hue stripped) |
| Ink scale | **DEPART** — pure achromatic neutrals: `#fafafa` / `#cccccc` / `#a8a8a8` / `#707070`. No oklch hue. |
| Accent | **DEPART** — **no brand accent color exists.** Warm cream is **removed**. Color is reserved exclusively for verdict semantics. |
| Type pairing | **DEPART** — Geist Mono promoted to **body co-equal**: used for all data rows, all numbers, all metadata, captions, footer. Geist sans handles paragraphs + buttons. Instrument Serif retreats to italicized H1 phrases and verdict headlines only. |
| Radius | **DEPART** — drop to **2px** (cards) / **0px** (chips, tags, inputs). Brutalist edge. |
| Grain | **KEEP** at slightly lower opacity (0.025) |
| Cursor glow | **DROP** — too theatrical for the register |
| Motion | **DEPART** — aggressive reduction: ≤120ms transitions, no parallax, no auto-marquee. Static-by-default. |

**Pros:**
- Maximally distinctive in the competitive screenshot grid. Nobody else in the audit space looks like this.
- The "verdict is the only color" rule is *itself the brand story* — visually enforces the PRD §10 strict-elite-gate posture.
- Data-density register matches the engineering-lead persona's daily tool habits (Datadog, Sentry, Grafana, Linear).
- Lowest token-surface area to maintain.

**Cons:**
- Highest customer-acquisition friction with non-technical buyers.
- Removing warm cream removes warmth — Herald's voice doc carries 100% of the emotional register.
- Brutalist monospace-heavy direction is *trendy in 2026* — risks reading as "indie-dev cosplay" if execution wobbles. Requires discipline; cannot ship a cute illustration anywhere ever.
- Most depart-from-template — Jo's existing landing would need real rework.

**Best-fit persona:** Solo founder, **technical** (PRD §5 primary MVP persona). The customer who lives in Linear / Sentry / Datadog / Read.cv and resents marketing-bright UI.

**Recommended for:** the customer who wants the brand to look like *the auditor*, not *the agency selling the audit*. The customer who screenshot-shares a verdict on Twitter for the receipts, not the aesthetics.

**Risk — who this loses:** Non-technical solo founders (PRD §5 row 1). Managed-tier buyers. Anyone who reads brutalist-mono as "intimidating" or "DIY-coder." This direction makes a deliberate audience-trade: wins the primary MVP persona harder, sacrifices the V2 Managed-tier expansion audience.

---

## Pixel's recommendation

**Ship Direction A as the locked brand. Reserve Direction B's bone surface as a Phase-4 escalation for the exports/PR-body Markdown problem when it surfaces in M2.**

Rationale:
1. **A respects the work Jo already shipped.** The template at `project-template/studiozero/project/styles.css` is already in this language, executed competently. Switching to C means rebuilding the landing; switching to B doubles the brand maintenance surface before the export use-case is even built.
2. **A is the lowest-regret direction.** It is the most defensible against Canon's consistency audits (smallest token surface), the most flexible for Herald's copy voice (warm cream gives editorial flourish room), and the most extensible to B or C later if the audience data demands it. C is a one-way door — once you remove the warm cream and elevate the mono, retreating to "softer" looks like a brand crisis.
3. **A scores cleanest on Halo's contrast pass.** Every token combination in the JSON file ships AA-or-better; no decorative-only edge cases that Canon will have to babysit.
4. **The PRD strict-elite gate carries the seriousness — the brand does not need to shout it.** C's brutalism is shouting. A's restraint is the same message at a lower volume, which is more on-tone for "we'll prove it — line by line."

C is the right choice **only** if Jo wants the brand itself to be the conversation starter (X / HN bait — the visual identity *is* the marketing hook). If Jo is taking that bet, say so explicitly and I'll re-spec the landing in C.

---

## Files written

- `brand/directions.md` (this file)
- `brand/direction-A/tokens.json`
- `brand/direction-A/usage-rules.md`
- `brand/direction-A/logo-concept.md`
- `brand/direction-B/tokens.json`
- `brand/direction-B/usage-rules.md`
- `brand/direction-B/logo-concept.md`
- `brand/direction-C/tokens.json`
- `brand/direction-C/usage-rules.md`
- `brand/direction-C/logo-concept.md`

All tokens.json files are valid JSON; every text-on-bg pair carries its computed WCAG contrast ratio in the `_contrast` annotation block. Halo can audit programmatically.

---

## Open questions for Jo

1. **Bone-paper surface (Direction B):** the PR-body Markdown rendered on GitHub is already a thing the brand has to live on. Do we want to solve that now (pick B) or punt it to M2 with a "default GitHub light theme" fallback (pick A)?
2. **Brand-as-marketing-hook (Direction C):** is the visual identity meant to be the X / HN conversation-starter, or should it stay quiet and let the verdict screenshots do the talking?
3. **Logo timing:** all three logo-concept files spec the mark in prose + ASCII. None of them produce SVG. Confirm a designer / generator handles execution after Jo's pick — or escalate to BigBrain for CAPABILITIES.md-listed SVG tooling.
