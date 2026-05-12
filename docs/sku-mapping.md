# SKU Mapping — Compass M6 close

**Phase:** 9 M2
**Owner:** Compass + Forge
**PRD:** §9.1 (Audit Products) + §12 (Pricing)
**Closes:** Jury M2 audit M6 finding

The three audit SKUs from PRD §9.1 need plain-English subtitles per Compass AH-4 (Phase 3). Engineering names + UI labels + buyer-persona descriptions follow.

## Surface

**Engineering name:** `audit_product = 'surface'`
**UI label:** Surface audit
**Plain-English subtitle (Compass AH-4):** _URL-only — what we can see from your live site._
**One-line description (landing/pricing):** Scan your deployed URL for UX, accessibility, copy, brand consistency, and audience alignment issues.
**Inputs required:** Deployed URL (customer-attested own URL on free tier; paid SKUs allow third-party URLs with §14.7 AUP attestation).
**What it can find:** Visible UX heuristic violations, copy errors, visible a11y issues, brand-consistency drift, audience-alignment friction.
**What it cannot find:** Code-level issues (bundle size, dead code, schema brittleness, security patterns).
**Available depths:** Quick · Custom.
**Available modes:** Free · BYOK · Managed · CLI (all).
**Buyer persona:** Solo founder (non-technical) trying a free audit; indie agency demo-ing client work; engineering lead pre-launch sanity check.

## Code

**Engineering name:** `audit_product = 'code'`
**UI label:** Code audit
**Plain-English subtitle (Compass AH-4):** _Repo source — what your AI builder shipped._
**One-line description:** Read your repository source code to surface design-system drift, dead code, bundle weight, security patterns, schema issues, and everything Surface finds when paired with a deployed URL.
**Inputs required:** Source repo (GitHub App per-repo permissions, D1) OR local folder via CLI.
**What it can find:** Code-level findings (linting-grade + structural + accessibility-via-source) PLUS everything Surface finds when a URL is also provided.
**What it cannot find:** Live runtime UX issues if no URL is provided.
**Available depths:** Quick · Custom · Comprehensive.
**Available modes:** BYOK · Managed · CLI.
**Buyer persona:** Solo founder (technical) auditing their own codebase; indie agency auditing client work; engineering lead pre-release.

## Full

**Engineering name:** `audit_product = 'full'`
**UI label:** Full audit
**Plain-English subtitle (Compass AH-4):** _Repo + URL — the deepest tier; reviewers cross-reference source against runtime._
**One-line description:** Both source and URL audited together. Reviewers correlate code-level findings with live-runtime evidence (a layout regression seen on the deployed URL is traced back to its file and line; an a11y violation found in source is verified visible on the URL).
**Inputs required:** Source repo AND deployed URL (both required; Full SKU rejected if either is missing).
**What it can find:** The complete audit: code-level + runtime + cross-correlation; the deepest finding evidence Studio Zero produces.
**What it cannot find:** (none — this is the deepest tier).
**Available depths:** Quick · Custom · Comprehensive.
**Available modes:** BYOK · Managed · CLI.
**Buyer persona:** Engineering lead at small startup pre-investor / pre-launch; indie agency delivering a comprehensive client report.

## Depth × Product compatibility matrix

|             | Quick | Custom | Comprehensive                               |
| ----------- | ----- | ------ | ------------------------------------------- |
| **Surface** | ✓     | ✓      | ✗ (PRD §9.3 — Surface caps at Quick/Custom) |
| **Code**    | ✓     | ✓      | ✓                                           |
| **Full**    | ✓     | ✓      | ✓                                           |

## SKU mode-eligibility matrix

|             | Free                                                                           | BYOK | Managed | CLI |
| ----------- | ------------------------------------------------------------------------------ | ---- | ------- | --- |
| **Surface** | ✓ (D2: 1 project, unlimited Surface re-audits, customer-attested own URL only) | ✓    | ✓       | ✓   |
| **Code**    | ✗                                                                              | ✓    | ✓       | ✓   |
| **Full**    | ✗                                                                              | ✓    | ✓       | ✓   |

## Plain-English subtitle rule (Compass AH-4)

Every customer-facing surface that names a SKU (pricing page tier table, mode picker, intake step 1 picker, upsell card, FAIL-screen primary CTA, lifecycle email E2) MUST render the subtitle alongside the engineering name. Examples:

- **Pricing page:** "Code audit — Repo source: what your AI builder shipped."
- **Intake step 1:** "Code: repo source · We read your repository to surface code-level findings + design system drift."
- **Upsell CTA after Surface FAIL:** "Run the Code audit → Repo source: we'll find 3-5× more."
- **E2 email body:** "We only ran Surface — what we can see from your URL. The Code audit reads your repo source and finds the structural issues."

Subtitle text is locked in `agents/growth/herald-brand-voice.md` + samples; do not paraphrase.

## Conversion-funnel hook

Per Hook's experiments backlog E-008: the FAIL-verdict primary CTA copy variant **"Run the Code audit →"** (Surface→Code upgrade) is the highest-ICE M1+ upsell test (26/30). Tier label uses the engineering name; subtitle establishes shared understanding.

## Cross-references

- `PRD.md` §9.1 (Audit Products) · §12 (Pricing tier × SKU eligibility)
- `finance/pricing.md` (Penny — buyer-persona lockup)
- `marketing/copy/02-pricing-page.md` (Herald — locked tier descriptions)
- `marketing/copy/03-emails-e1-through-e5.md` (Herald — E2 upsell)
- `shared_context/projects/studio-zero-productization/phase3-audit-compass.md` AH-4 finding origin
- `shared_context/projects/studio-zero-productization/phase4-audit-optic.md` F4 SKU mismatch banner copy
- `architecture/schemas/audit-input.v1.schema.json` `audit_product` enum
- `architecture/database/tables.sql` `audit_product` PostgreSQL ENUM

## Versioning

- v1.0 — 2026-05-12 — Compass M6 close at M2 audit.
- v1.1 reserved for V2 SKU additions (e.g., "Compliance-Ready" enterprise SKU per Comply Phase 7 flag).
