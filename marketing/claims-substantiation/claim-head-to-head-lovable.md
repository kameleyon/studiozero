# claim-head-to-head-lovable

**Claim verbatim:** "Ran a Lovable-generated app through Studio Zero. Findings on the live page: 2 Blockers (a11y on the signup form), 5 Critical (copy clarity, brand drift), 11 more across Major / Minor / Polish."
**Surface(s):** `marketing/copy/04-social-bundles.md` X week 4
**Owner:** Hook + Halo
**Co-signs:** Herald (voice) · Comply (regulation) · Proof (CI)
**Status:** STUB
**Date verified:** —
**Next re-verification:** quarterly + on every public Lovable version bump

## Evidence (to author)

- The actual Lovable-generated app URL (must be publicly accessible or owned by Studio Zero).
- The actual Studio Zero verdict run on that URL — `run_id`, screenshot, findings list export.
- Date of the Lovable generation (their version at the time).
- Date of the Studio Zero audit.

## Methodology

1. Generate an app using Lovable's default flow ("create a SaaS dashboard with signup" or equivalent generic prompt). The prompt is documented; not cherry-picked.
2. Deploy the generated app to a Studio-Zero-owned domain (Vercel or similar; no modifications to the Lovable output).
3. Run Studio Zero's Surface audit against the deployed URL.
4. Capture the findings counts and severity breakdown verbatim from the run.

## Risk if challenged

**High.** This is a comparative claim about a named competitor's product output, posted on a public social channel. FTC AI-claim substantiation and Lanham Act both in scope.

Risk vector: Lovable disputes that this is a representative output, argues we used a prompt designed to fail, or claims their newer version doesn't have the issue. Mitigation: the prompt is documented; the methodology is reproducible; the verdict ships with the audited URL preserved so Lovable (or anyone) can re-run it.

Risk vector: the post implies Lovable is a bad product. The claim's framing — "Lovable shipped the code. Studio Zero shipped the receipts. Both have a place." — is the explicit non-derogatory framing required to ship this post.

**Comply hard gate:** this post does not ship until Comply reviews the substantiation file, the post copy, and confirms the framing is non-derogatory. If Comply blocks, the post is rewritten or pulled.

## Change log

| Date | Status | Note |
|---|---|---|
| 2026-05-11 | STUB | Reserved by Herald in Phase 8 GTM authoring |
