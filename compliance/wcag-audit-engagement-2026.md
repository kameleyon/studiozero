# WCAG 2.2 AA Conformance Audit — Engagement Letter (Template)

**Status:** Template — sent at M1 close (Phase 9 M1 Batch 3 dispatch).
**Owner:** Halo (technical scope) + Comply (contractual) + Jo (signatory).
**Risk mitigation:** R15 (independent a11y conformance pre-launch) +
**R21(b)** (net-30 payment terms locked before vendor work begins).
**Cite:** PRD §14.6; `sprint/milestone-M1.md` exit-gate row 147;
`agents/audit/halo.md` §"Independent WCAG 2.2 AA Audit".

---

## 1. Parties

**Studio Zero** (legal entity TBD — owner Comply)
c/o **Jo (founder)**
accessibility@studiozero.dev

**Vendor:** _<one of the short-list firms in §5; signature block filled
at engagement>_

## 2. Engagement scope

The Vendor will perform an **independent third-party WCAG 2.2 Level AA
conformance audit** of the Studio Zero customer-facing surface, defined
exactly per PRD §14.6 as:

> the web app, dashboard, score page, findings UI, evidence viewer,
> settings, billing, exported reports, marketing site, and CLI-emitted
> Markdown rendered on GitHub.

This is the **full conformance scope** — not a subset, not a sampled
audit, not "spot check the most-visited pages." Every surface listed
above is in scope and must clear or have a documented exception.

### Concrete page inventory (M1 baseline; Vendor confirms before kickoff)

1. Marketing site — `/`, `/pricing`, `/accessibility`, `/privacy`,
   `/terms`, `/aup`, `/subprocessors`.
2. Authentication — `/signup`, `/login`.
3. Onboarding — `/app/onboarding/mode`, `/app/onboarding/byok`,
   `/app/onboarding/github`.
4. Dashboard + projects — `/app`, `/app/projects/new`,
   `/app/projects/[id]`, `/app/projects/[id]/re-audit`.
5. Audit run states — queued / cloning / analyzing / scoring /
   verdict_emitted / failed; both FAIL and PASS-WITH-FIXES verdicts.
6. Verdict screens — `/app/audits/[runId]`, `/app/audits/[runId]/upgrade`.
7. Settings + billing — `/app/settings`, Stripe Checkout hand-off
   (HC6 — hosted Checkout default).
8. Exported reports — PDF + Markdown (CLI-emitted) rendered on GitHub.

## 3. Standard

**WCAG 2.2 Level AA, full conformance** — every Level A and Level AA
success criterion in the [WCAG 2.2 Recommendation](https://www.w3.org/TR/WCAG22/),
including the nine new SCs introduced in WCAG 2.2:

- 2.4.11 Focus Not Obscured (Minimum) — AA
- 2.4.12 Focus Not Obscured (Enhanced) — AAA (not in gate but noted)
- 2.4.13 Focus Appearance — AAA (Studio Zero ships AAA-grade per
  `tokens.json` §wcag_2_2_compliance — Vendor verifies)
- 2.5.7 Dragging Movements — AA
- 2.5.8 Target Size (Minimum) — AA (24×24 CSS px)
- 3.2.6 Consistent Help — A
- 3.3.7 Redundant Entry — A
- 3.3.8 Accessible Authentication (Minimum) — AA
- 3.3.9 Accessible Authentication (Enhanced) — AAA (not in gate)

Methodology must combine **automated tooling AND manual testing**:
- automated: axe-core, Lighthouse, pa11y, Wave (Vendor's choice; ≥2)
- manual: keyboard-only walkthrough, NVDA + VoiceOver screen-reader
  walkthroughs, 200% + 400% zoom + reflow at 320 CSS px, forced-colors
  mode, prefers-reduced-motion mode

Per `agents/audit/halo.md` Rule §2: automated tools are necessary but
not sufficient. The audit MUST include the manual passes; an axe-clean
report alone is not acceptable as the deliverable.

## 4. Deliverables

The Vendor will produce, signed by the lead auditor:

### 4.1 Signed Conformance Report (primary deliverable)

- **VPAT 2.5 (or successor) — INT/Rev** filled out for the customer-
  facing surface.
- **Conformance statement** suitable for Studio Zero to publish at
  `/accessibility` per PRD §14.6 — vendor name, audit date,
  methodology summary, tools used, conformance level achieved.
- **Exception list** — every documented non-conformance with cited SC,
  severity, location, screenshot/recording evidence, and recommended
  remediation. Severity rubric matches Halo's in `agents/audit/halo.md`
  §"Rules" (Blocker / Critical / Major / Minor).

### 4.2 Remediation guidance

- Per-finding remediation pattern + code-level pointer (CSS selector,
  React component path, or DOM diff) sufficient for Studio Zero's
  Access + Vega + Canvas to fix without back-and-forth.
- Re-test of remediated items at cost agreed below (one re-test round
  included; additional rounds at vendor's hourly rate).

### 4.3 Screen-reader recordings

- NVDA (Windows / Firefox latest) and VoiceOver (macOS / Safari latest)
  recordings of the FAIL-verdict primary flow (per PRD §14.6 final
  paragraph + Phase 6 F-MAJ-3).
- Format: `.webm` 720p, audio = AT speech track. Studio Zero stores
  these in `tests/a11y/at-recordings/` per the manifest at
  `tests/a11y/at-recordings/m4/signoff.md`.

## 5. Vendor short-list

Studio Zero will engage **one** of the following (Halo's recommendation
in priority order; final choice is Jo's):

1. **Deque Systems** — creators of axe-core. Strongest tooling pedigree;
   premium price band. https://www.deque.com/services/
2. **TPGi** (formerly Paciello Group) — JAWS team alumni; deep AT lab.
   https://www.tpgi.com/assistive-technology/
3. **AccessibilityOz** — Gian Wild's firm; strong on WCAG 2.2 net-new
   SCs. https://www.accessibilityoz.com/
4. **Knowbility** — non-profit; strong on usability-with-disabilities
   panels alongside SC conformance. https://knowbility.org/

## 6. Timing

- **Engagement letter signed:** end of M1 (Phase 9, week 6 placeholder
  per PRD §16) — **six-week lead time** for the M4 exit gate per Risk
  R15.
- **Vendor kickoff call:** within 5 business days of signature.
- **Audit window:** Vendor's standard turnaround (~3–4 weeks) starting
  on a Studio Zero staging URL Halo provides.
- **Conformance report delivered:** no later than 2 weeks before M4
  launch gate (Phase 10).
- **Remediation + re-test:** before M4 launch gate.

## 7. Commercial terms

**Estimated fee range:** USD $5,000 – $15,000 (vendor-dependent).
A single line-item fixed fee is preferred; T&M acceptable with a
not-to-exceed ceiling agreed in writing.

**Payment terms: net-30 from receipt of signed Conformance Report.**
This is R21(b) mandatory mitigation per `agents/owner-matrix.md` and
`sprint/milestone-M1.md` exit-gate row 147 — net-30 (or better; net-60
acceptable, prepay refused) aligns the bill with the MRR ramp window
(~week 18+). Vendors requiring prepayment or net-15 are disqualified
unless Penny + Jo approve a documented exception.

**Re-test rounds:** first re-test of remediated findings included.
Additional rounds billed at Vendor's published hourly rate.

**Travel + expenses:** none expected; the audit is performed remote
against the Studio Zero staging URL. Any T&E must be pre-approved in
writing.

## 8. Independence

Per `agents/audit/halo.md` Rule §1, the Vendor must not have
participated in Studio Zero's design, implementation, or accessibility
remediation prior to this engagement. Vendor confirms in writing at
kickoff. Subsequent remediation consulting by Vendor is permitted; a
**second-round conformance audit** following remediation consulting
must rotate to a different vendor on the short-list to preserve
independence.

## 9. Confidentiality + data handling

- Staging URL credentials provisioned per-auditor; revoked at delivery.
- No production tenant data shared with Vendor; staging uses
  synthetic fixtures only (`apps/web/lib/mock-data.ts` family).
- Vendor signs Studio Zero's mutual NDA before kickoff (Comply owns
  the template).
- Vendor may publish the conformance summary (name + audit date +
  result) with Studio Zero's permission once `/accessibility` ships
  the signed statement — co-marketing is welcome.

## 10. Signature block

| Party       | Name        | Title    | Signature | Date |
| ----------- | ----------- | -------- | --------- | ---- |
| Studio Zero | Jo          | Founder  |           |      |
| Studio Zero | _Halo proxy_| A11y AOR |           |      |
| Vendor      |             |          |           |      |

---

_Template version: v1.0 (M1 Batch 3 dispatch, Phase 9). Halo + Comply
review before each send; Jo signs._
