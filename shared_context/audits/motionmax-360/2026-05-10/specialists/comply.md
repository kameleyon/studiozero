# Comply — Specialist Audit (§13 Legal — GDPR / CCPA / AI)

FROM: Comply (Operations — Compliance Officer)
TO: Jury (Audit Lead) → BigBrain
RE: AUDIT — motionmax-360 — §13 Legal & Regulatory Compliance
DATE: 2026-05-10
STATUS: Review

Audience-relative posture: tool-savvy creative adults, US-first launch, mobile-heavy, 11 languages claimed (sales-side), single English legal stack. Risk lens skewed toward (a) AI-output disclosure under EU AI Act Art. 50 (transparency obligations enter into application 2026-08), (b) FTC §5 deceptive-practice exposure on AI training claims, (c) CPRA "sharing" definitions, (d) DMCA §512(c) safe-harbor preconditions, and (e) biometric / voice-clone law (BIPA, CPRA SPI, GDPR Art. 9).

Severity rubric: Blocker / Critical / Major / Minor / Polish. Every finding cites file:line evidence.

---

## Production Blockers (must clear before any prod traffic)

### L-B-01 — No synthetic-media labeling for paid users (EU AI Act Art. 50 exposure)
- Severity: Blocker
- Evidence: `worker/dist/handlers/exportVideo.js:325` — `const watermarkText = needsWatermark ? "AI-Generated" : undefined;`. Watermark is gated on `needsWatermark` derived from subscription tier (`worker/dist/handlers/exportVideo.js:187` "Fetch user plan and determine if watermark overlay is required") — paid users (Creator / Studio) export with **no** "AI-Generated" mark. There is **zero** C2PA / Content Credentials / metadata-level provenance anywhere in the worker (verified via `grep -rn "watermark\|c2pa\|provenance\|content credentials" worker` — only matches are the FFmpeg drawtext path).
- Why it blocks: EU AI Act Art. 50(2) requires providers of generative AI systems to ensure outputs are marked as artificially generated **in a machine-readable format**. Voice-cloned narration on top of AI imagery is the product itself, not an edge case — the Art. 50(4) "manifestly artistic / satirical" carve-out is not available for general-purpose social-media exports. FTC AI Compliance Plan (Operation AI Comply, 2024–2026) treats "no clear AI disclosure" as a deceptive-practice predicate.
- Fix: in `worker/src/handlers/exportVideo.ts` (source of the dist file), set `watermarkText = "AI-Generated"` unconditionally, OR (preferred) attach C2PA Content Credentials manifest via `c2patool` post-render and keep paid-tier watermark visually subtle but present. Mirror in PRD that paid users get a smaller / corner mark, not no mark.
- Effort: M

### L-B-02 — Auth signup binds T&C of the wrong version (ToS unversioned)
- Severity: Blocker
- Evidence: `src/lib/policyVersion.ts:4` — `export const CURRENT_POLICY_VERSION = "2026-04-19";`. `src/pages/Privacy.tsx:39-40` displays this version. `src/pages/Terms.tsx:38` shows only "Last updated: February 2026" — no version string, not bound to `CURRENT_POLICY_VERSION`. `src/pages/Auth.tsx:469-488` collects a single checkbox covering Terms + Privacy + AUP and stores no version against the user. Re-acceptance gate (per migration `20260419290000_add_accepted_policy_version.sql`) only knows one version field.
- Why it blocks: when ToS materially changes (e.g., to add the AI Act Art. 50 disclosure obligations on users), the platform cannot legally enforce the new ToS against existing users without a versioned re-acceptance. Current state: a user who signed up in March 2026 is still bound only to "February 2026" ToS forever, even after a re-prompt for Privacy. EU UCTD (Directive 93/13/EEC) makes silent unilateral amendments of consumer contracts unenforceable.
- Fix: add `export const CURRENT_TERMS_VERSION = "2026-02-XX";` and `export const CURRENT_AUP_VERSION = ...;` to `src/lib/policyVersion.ts`. Surface each on its respective page header. Persist three columns on `profiles` (`accepted_privacy_version`, `accepted_terms_version`, `accepted_aup_version`) and trigger re-prompt on any drift.
- Effort: S

### L-B-03 — Privacy Policy promises an "AI training opt-in" UI that does not exist
- Severity: Blocker
- Evidence: `src/pages/Privacy.tsx:71` — "We do not use your generated content to train AI models without explicit opt-in consent." `src/pages/Privacy.tsx:81` — "AI training opt-in (if you explicitly enable it)." Search of the entire `src/` for any toggle, setting, profile field or edge function relating to "train" / "training opt-in" / "model improvement consent" returns zero relevant matches. The Settings page (`src/pages/Settings.tsx`) has no such control. There is no profile column for it (no migration creates `ai_training_consent_*`).
- Why it blocks: this is a written promise of a feature that ships nothing. FTC §5 unfairness/deception case law (FTC v. Everalbum 2021, FTC v. Rite Aid 2023) treats AI-disclosure mismatches as actionable. CCPA / CPRA also treats it as a misrepresentation of practice. If any subprocessor (Kling/Kuaishou, OpenRouter, ElevenLabs, Replicate) trains on inputs by default without an explicit MotionMax opt-out negotiated, the policy is materially false today.
- Fix: either (a) remove all "opt-in" language from Privacy §3 / §4 and disclose accurately what each provider does with input data per their ToS, OR (b) build a Settings → Privacy toggle with default OFF and document the per-provider implementation (Kling commercial-API contract, OpenRouter `data_collection: deny`, ElevenLabs Enterprise no-train flag).
- Effort: L

### L-B-04 — No EU / UK Article 27 representative listed
- Severity: Blocker
- Evidence: `src/pages/Privacy.tsx:101-104` — only states "MotionMax is operated from the United States… we rely on the EU–US Data Privacy Framework, Standard Contractual Clauses…". No Art. 27 representative named anywhere in the policy or marketing site. Marketing site mirror at `marketing/src/pages/privacy.astro` confirms (no representative section).
- Why it blocks: GDPR Art. 27 (and UK GDPR Art. 27) **requires** non-EU controllers offering services to EEA / UK data subjects to designate a written representative with name, address, and contact in the Union / UK and to publish that contact in their privacy notice. Failure is a fineable infraction independent of any actual incident (see EDPB *Guidelines 3/2018* on territorial scope; Berlin DPA fining Delivery Hero 2024 for missing rep).
- Fix: appoint an EU rep (e.g., DataRep, Prighter, VeraSafe; ~$50–$300/mo) and a UK rep, publish address + email in `src/pages/Privacy.tsx` between sections 5 and 6 and in `marketing/src/pages/privacy.astro`. Ship before any EU traffic.
- Effort: S (plus vendor procurement)

### L-B-05 — Cooling-off waiver not collected at point of sale
- Severity: Blocker (EU)
- Evidence: `src/pages/Terms.tsx:117-119` describes the EU 14-day right of withdrawal and waiver but the waiver is **stated only in the ToS body, not collected as an explicit checkbox at the moment of payment**. The Stripe Checkout flow (per `supabase/functions/stripe-webhook/index.ts` and absence of any `waiver_acknowledged` field in the schema) does not capture an at-payment confirmation.
- Why it blocks: under Directive 2011/83/EU Art. 16(m) and Art. 14(4)(b), the waiver of withdrawal for digital content **only** binds when the consumer (i) gives prior express consent **at the point of execution**, (ii) acknowledges loss of withdrawal right, and (iii) the trader provides confirmation of that consent on a durable medium. Current ToS-only language is widely held by EU consumer authorities to be insufficient (e.g., German Federal Court I ZR 96/20). Practical effect: every EU paid user can claw back the first 14 days of charges.
- Fix: add a checkbox on the Stripe Checkout success path (or before redirect) capturing the waiver, persist `waiver_acknowledged_at` on `subscriptions`, and email a copy. Block the pre-paid generation flow until both conditions are met.
- Effort: M

---

## Critical (must remediate before launch)

### L-C-01 — No DMCA Designated Agent registration / notice-and-takedown procedure
- Severity: Critical
- Evidence: `src/pages/Terms.tsx` (entire file 1-158) and `src/pages/AcceptableUse.tsx` (1-107) — no DMCA section, no agent contact, no takedown procedure. `mailto:abuse@motionmax.io` exists at `AcceptableUse.tsx:89` but is not a registered §512(c)(2) agent address.
- Why it matters: 17 U.S.C. §512(c)(2) makes safe-harbor protection for hosting user-uploaded content (intake docs, voice samples, project content) **conditional** on registering a Designated Agent with the U.S. Copyright Office (DMCA Designated Agent Directory, $6 fee, mandatory three-year renewal) **and** publishing the agent in a prominent location on the service. MotionMax hosts user uploads (intake form, voice samples, generated derivatives). Without a registered agent, a single rights-holder claim can pierce safe harbor and create direct infringement exposure for every cached user output.
- Fix: register a Designated Agent at https://www.copyright.gov/dmca-directory/, add a Section "Copyright Complaints (DMCA)" to `src/pages/Terms.tsx` after current §5 with the agent's name, address, phone, email, and a notice format checklist. Mirror in `marketing/src/pages/terms.astro`.
- Effort: S

### L-C-02 — Acceptable Use Policy contradicts the product (deepfake categorical ban)
- Severity: Critical
- Evidence: `src/pages/AcceptableUse.tsx:46` — "Spreads disinformation, **deepfakes**, or misleading content designed to deceive". Product category at `public/llms.txt:21` advertises "AI image-to-video conversion" + "Voice cloning (ElevenLabs)" — i.e., the platform itself manufactures "deepfakes" of arbitrary subjects. ToS §4 (Terms.tsx:67) is correctly scoped to "synthetic media (deepfakes) of real individuals without their explicit consent" — AUP is **not** scoped.
- Why it matters: an AUP that bans the product the user paid for is unenforceable on its face (estoppel) and exposes the company to FTC §5 deception (selling deepfake tooling while telling users deepfakes are banned). Worse, in any litigation a plaintiff can quote AUP §2 to prove every paying customer is in breach.
- Fix: replace AUP §2 bullet with: "Synthetic media or audio impersonating identifiable real individuals, public figures, or living persons **without their explicit, documented consent** — including non-consensual voice clones, fabricated statements attributed to real people, or election-related impersonation."
- Effort: XS

### L-C-03 — Voice biometric data not classified as such; BIPA / GDPR Art. 9 exposure
- Severity: Critical
- Evidence: `src/pages/Privacy.tsx:54` — voice data described as "voice recordings… stored as voice models", never classified as "biometric identifier" or "sensitive personal information" / Art. 9 special category. The consent record table at `supabase/migrations/20260419000007_voice_consents.sql` correctly cites Art. 9 in its comment, but the user-facing Privacy Policy does not. CCPA disclosure of "Sensitive Personal Information" (Cal. Civ. Code §1798.140(ae)(2)(C) — biometric information) is missing in §2 and §12.
- Why it matters: Illinois BIPA (740 ILCS 14) imposes a written-consent regime for biometric identifiers ("voiceprints" explicitly named) with statutory damages of $1,000 / $5,000 per violation. CPRA requires categorical disclosure of SPI collection plus a "Limit Use of Sensitive Personal Information" link. Texas CUBI and Washington's My Health My Data Act add further obligations. Privacy Policy currently provides none of these disclosures despite the platform offering voice cloning.
- Fix: in `src/pages/Privacy.tsx:54` insert: "Voice recordings used for cloning are **biometric identifiers** under Illinois BIPA, Texas CUBI, and California CCPA/CPRA 'Sensitive Personal Information.' We collect them only with your explicit written consent (recorded in our voice_consents log including IP and timestamp), retain them only for the duration of the cloned voice, and delete them within 30 days of your removing the voice." Add a "Limit Use of My Sensitive Personal Information" link in the marketing footer for California users. Mirror in `marketing/src/pages/privacy.astro`.
- Effort: S

### L-C-04 — Account deletion timeline mismatch between Privacy Policy and code
- Severity: Critical
- Evidence: `src/pages/Privacy.tsx:110` — "If you close your account, we will delete your personal data within **90 days**". `supabase/functions/delete-account/index.ts:65` — `scheduledAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)` — i.e., a **7-day** grace period before nightly cron deletion. The two timelines are inconsistent.
- Why it matters: GDPR Art. 17(1) requires deletion "without undue delay." A 90-day promise is defensible; a 7-day actual is even better — but the inconsistency means whichever number a user invokes (e.g., "you said 90 days, why was my data gone in 7?") is a documentable breach. CPRA also permits action when stated retention exceeds actual retention.
- Fix: choose one. Recommended: change `src/pages/Privacy.tsx:110` to read "Your personal data is permanently deleted within 30 days of confirming the deletion request, after a 7-day grace period in which you may cancel by signing back in." Mirror in `marketing/src/pages/privacy.astro`. Update `delete-account/index.ts` log message to match.
- Effort: XS

### L-C-05 — No "Manage Cookies" / withdraw-consent UI; consent not granular
- Severity: Critical (EU)
- Evidence: `src/components/CookieConsent.tsx:31-103` — banner only mounts when `getStoredConsent() !== null` is false (line 47), so once a decision is stored in `localStorage` under key `motionmax_cookie_consent`, the user has **no in-app mechanism** to revisit it. Settings page (`src/pages/Settings.tsx`) — no cookie management surface. Banner offers a single Accept / Reject pair with no granular categories (analytics vs functional vs marketing).
- Why it matters: GDPR Art. 7(3) requires consent to be **as easy to withdraw as to give**. ICO and CNIL both treat "no withdraw mechanism in-product" as a banned practice (CNIL fining Google €150M, Meta €60M for materially the same defect). EDPB *Guidelines 5/2020* on consent require purpose-specific consent — bundling Sentry session replay + GA4 under "analytics" without separate toggles is also non-compliant.
- Fix: in `src/pages/Settings.tsx` add a "Privacy & Cookies" section that reads `getStoredConsent()` and exposes a button to clear it and re-show `<CookieConsent />`. Add granular toggles in the banner: `Strictly necessary` (always on, no toggle), `Analytics` (GA4), `Session replay` (Sentry replay), `Marketing` (none today; ship a checkbox stub). Persist as JSON `{ analytics: bool, replay: bool, marketing: bool }` rather than a single string.
- Effort: M

### L-C-06 — Subprocessor / DPA list is gated to "enterprise customers"
- Severity: Critical
- Evidence: `src/pages/Privacy.tsx:97` — "Enterprise customers may request a complete, up-to-date subprocessor list by contacting privacy@motionmax.io. We will notify enterprise customers at least 10 business days before adding or replacing a subprocessor".
- Why it matters: GDPR Art. 28(2) requires the controller to make subprocessor changes available to **all** customers, not just enterprise tier. Standard SCCs Module 2/3 Clause 9 gives data subjects the right to be informed of the identity of subprocessors. GDPR Art. 30(1)(d) requires maintaining a register of categories of recipients including those in third countries. Restricting visibility to enterprise tier breaches both. This also matters for the §1798.115 CCPA right to know categories of third parties — already disclosed in §5 broadly, so the breach is the **change-notice gating**, not the initial list.
- Fix: publish a public, dated subprocessor list at `/legal/subprocessors` with a JSON or markdown source, link from Privacy §5, and offer email notification on change to **all** users (not just enterprise). Update §5 wording: "We will notify all users of subprocessor changes at least 10 business days before they take effect."
- Effort: S

### L-C-07 — No data-export UI surfacing the export-my-data edge function
- Severity: Critical
- Evidence: `supabase/functions/export-my-data/index.ts:1-207` (entire file) — fully implemented GDPR Art. 20 portability endpoint exists. `src/pages/Settings.tsx` (verified via grep on `export-my-data` returning no UI invocation) — no button surfaces it. Privacy Policy §8 promises Right to Portability via emailing support, but the self-service endpoint is built and unwired.
- Why it matters: GDPR Art. 12(2) requires controllers to "facilitate the exercise of data subject rights." When self-service infrastructure exists but is not surfaced, the latency of an email-only path (claimed 30 days) versus instant export becomes both a UX failure and a documentable Art. 12 friction violation. Also disqualifies the company from many SOC 2 / ISO 27701 maturity claims.
- Fix: in `src/pages/Settings.tsx` add a "Data & Privacy" section with three buttons: "Download my data" (POST to export-my-data, save returned JSON via Blob URL), "Delete my account" (POSTs to delete-account, opens 7-day grace warning modal), and "Manage cookies" (per L-C-05).
- Effort: S

### L-C-08 — User content licensing in ToS does not shift IP liability for AI outputs
- Severity: Critical
- Evidence: `src/pages/Terms.tsx:74-76` — §5 grants user ownership of inputs and outputs "subject to the limitations of the underlying AI model licenses and any applicable terms of the third-party AI providers" but contains **no** indemnification, no warranty disclaimer for output non-infringement, no liability shift for downstream commercial use. Hypereal, Kling, Replicate, ElevenLabs each have *different* output-license terms (some reserve commercial rights, some require attribution, some forbid certain uses).
- Why it matters: post-*Andersen v. Stability AI* (N.D. Cal. 2024) and *Getty v. Stability AI* (UK High Court, 2025), AI image outputs have an active infringement risk. The `Thaler v. Perlmutter` line (D.D.C. 2023, affirmed 2024) confirms purely AI-generated works are not copyrightable in the US — meaning user "ownership" claim in §5 is partially false. Without (a) a per-provider attribution table, (b) a "you are responsible for your use" indemnification clause, and (c) a copyright-uncertainty disclaimer, MotionMax inherits all the downstream IP exposure.
- Fix: rewrite §5 to add: (1) "You acknowledge that AI-generated outputs may not be eligible for copyright protection in some jurisdictions including the United States (see U.S. Copyright Office *AI Registration Guidance*, March 2023)." (2) "You agree to indemnify MotionMax against any third-party claim arising from your use, distribution, or commercial exploitation of generated content." (3) Link to a per-provider rights table at `/legal/ai-providers`.
- Effort: M

### L-C-09 — Auto-renewal disclosure does not satisfy California ARL / FTC Click-to-Cancel
- Severity: Critical
- Evidence: `src/pages/Terms.tsx:111-114` (§12 Auto-Renewal) provides a generic disclosure. Cancellation flow not surfaced — no `/billing/cancel` or in-app one-click cancel found in `src/pages/Billing.tsx` (verified by directory listing; not yet fully read but ToS routes user to email).
- Why it matters: California Auto Renewal Law (Cal. BPC §17601) requires (a) clear and conspicuous *pre-checkout* auto-renewal disclosure, (b) affirmative consent, (c) acknowledgement on a durable medium with cancellation instructions, (d) easy online cancellation. FTC's "Click to Cancel" rule (16 CFR Part 425, effective 2026) requires cancellation to be at least as easy as sign-up. ToS-buried disclosure plus email-only cancellation route is non-compliant on both. CARU / NY Auto Renewal Act 2023 add similar layered requirements.
- Fix: build self-service cancel in `src/pages/Billing.tsx` (Stripe Customer Portal embed is acceptable). Add a pre-checkout auto-renewal banner ("You will be charged $X every month until you cancel. Cancel anytime in Settings.") with an explicit checkbox. Send a renewal-receipt email via Resend 7 days before each charge (already promised in §12 but not verified).
- Effort: M

---

## Major

### L-M-01 — Cookie banner copy is too vague (ICO/CNIL guidance)
- Severity: Major
- Evidence: `src/components/CookieConsent.tsx:79-82` — "We use cookies to analyze site usage and improve your experience." No mention of providers (Google, Sentry), categories, or duration.
- Fix: replace with: "We use cookies for security (always on), analytics (Google Analytics 4), and session replay (Sentry, only on errors). See our Privacy Policy or Manage preferences."
- Effort: XS

### L-M-02 — Marketing privacy.astro version drift
- Severity: Major
- Evidence: `marketing/src/pages/privacy.astro:3` — `const POLICY_VERSION = "2026-04";` vs `src/lib/policyVersion.ts:4` — `"2026-04-19"`. Two surfaces show two different versions; users approving one are unsure which they accepted.
- Fix: import the constant in the Astro front-matter, or hard-pin both to "2026-04-19". Add a CI check that diffs the two strings.
- Effort: XS

### L-M-03 — No Cookie Policy as discrete artifact / no per-cookie inventory
- Severity: Major
- Evidence: Privacy.tsx covers cookies in §4 and §5 generically. No `/cookie-policy` route, no per-cookie table (name, domain, purpose, duration, type — first / third party). ICO *Cookies and Similar Technologies* guidance and CNIL deliberation 2020-091 both expect a cookie inventory.
- Fix: add `src/pages/CookiePolicy.tsx` with a table sourced from a single TS module that drives both the banner copy and the page.
- Effort: S

### L-M-04 — Sentry session-replay PII scrubbing not verified
- Severity: Major
- Evidence: `src/lib/sentry.ts` (referenced from CookieConsent.tsx:4 — `grantAnalyticsConsent`) is the Sentry init point. Privacy.tsx:94 promises "No generated content or passwords are captured in error reports", but Sentry replay defaults capture DOM text, network bodies, and form values unless `maskAllText: true` and `blockAllMedia: true` are enabled.
- Fix: open `src/lib/sentry.ts` and confirm Replay options include `maskAllText: true`, `maskAllInputs: true`, `blockAllMedia: true`, `networkDetailAllowUrls: []`; or document deviations and reconcile with Privacy Policy.
- Effort: S — Unable to fully verify from this slice; flagging for creator.

### L-M-05 — No automated decision-making (Art. 22) disclosure for user_flags / suspension
- Severity: Major
- Evidence: `supabase/migrations/20260505190000_admin_phase2_rls_hardening.sql` and `user_flags` references in `export-my-data/index.ts:139` confirm the platform records account-standing flags. No GDPR Art. 22 disclosure ("you have the right not to be subject to a decision based solely on automated processing") in Privacy §3 or §8.
- Fix: add a paragraph in `src/pages/Privacy.tsx` §8: "Automated decisions: we use automated abuse-prevention systems that may temporarily restrict generation. You may request human review by contacting support@motionmax.io. No fully automated decisions producing legal or similarly significant effects are made without human oversight."
- Effort: XS

### L-M-06 — DSAR response timeline inconsistency (30 vs 45 days)
- Severity: Major
- Evidence: `src/pages/Privacy.tsx:132-133` — "We will respond to verified requests within **30 days**." `src/pages/Privacy.tsx:163-164` (CCPA section) — "within **45 days** as required by the CCPA." Two paragraphs in one document offer two SLAs.
- Fix: in §8 add: "EU/UK requests: within 30 days (extendable to 90 for complex requests, GDPR Art. 12(3)). California requests: within 45 days (CCPA §1798.130(a)(2))." Remove the bare 30-day promise.
- Effort: XS

### L-M-07 — Children's privacy section addresses age 18 only, not COPPA threshold
- Severity: Major
- Evidence: `src/pages/Privacy.tsx:143-144` — "The Service is not directed to individuals under the age of 18." `src/pages/Auth.tsx:498` — single self-attestation checkbox "I confirm that I am 18 years of age or older."
- Why: COPPA's threshold is 13, GDPR Art. 8 default is 16 (member-state variable down to 13). A pure 18+ posture is fine but the policy should explain (a) what happens if a 13–17 user is detected, (b) parental request mechanism, (c) GDPR Art. 8 alignment. Also: self-attestation alone is increasingly flagged in FTC AI enforcement actions (FTC v. NGL Labs, 2024). Add at least an IP-based EU age gate or stronger acknowledgement.
- Fix: rewrite §10 to include detection-and-deletion language, parental contact channel (privacy@motionmax.io), and reference COPPA / GDPR Art. 8 by name. Add SuperAwesome-style age gate or device-storage flag for high-risk EU markets.
- Effort: S

### L-M-08 — Privacy Policy retains 11-language sales claim with English-only legal stack
- Severity: Major (EU consumer protection)
- Evidence: `public/llms.txt:21,38` claims 11 supported languages including French, German, Italian, Spanish, etc. `marketing/src/pages/` — only one of each legal page (`privacy.astro`, `terms.astro`, `acceptable-use.astro`); none localized. `src/pages/Privacy.tsx` — English only.
- Why: Directive 2011/83/EU Art. 8 (CRD) and many member-state implementations (e.g., France's CCons L221-5, Germany's BGB §312d) require contractual terms to be made available in the consumer's national language when targeting that market; non-localized legal terms have repeatedly been struck down (e.g., LG Berlin 16 O 64/22 against Telegram for English-only AGB). Sales-side claims of multi-language support strengthen the "directed activity" element.
- Fix: ship at minimum FR/DE/ES/IT/PT translations of Privacy + Terms + AUP, with a "Legally binding version: English" footer that some jurisdictions accept. Coordinate with Tongue (i18n).
- Effort: L

### L-M-09 — Stripe webhook retention (7 days) is too short for tax/financial regs
- Severity: Major
- Evidence: `src/pages/Privacy.tsx:116` — "Payment webhook records (idempotency keys): automatically deleted after 7 days." If this also covers payment events (not just idempotency keys), it conflicts with IRS §6001 (3 years), HMRC (6 years), and EU VAT Directive (10 years for some MS).
- Fix: reword to "**Stripe webhook idempotency keys** — 7 days" and add a separate retention line: "**Transaction history** (invoices, charges, refunds) — 7 years for tax and audit compliance, after which records are anonymized."
- Effort: XS

### L-M-10 — Watermark text is ASCII-only with no provenance metadata
- Severity: Major
- Evidence: `worker/dist/handlers/exportVideo.js:325` — `watermarkText = "AI-Generated"` is a drawtext string, easily cropped, recompressed away, and not machine-detectable.
- Why: even a corner watermark fails EU AI Act Art. 50(2) "machine-readable" requirement. C2PA Content Credentials (https://c2pa.org/) is the de-facto standard adopted by Adobe, Microsoft, OpenAI, Google. The C2PA manifest survives recompression and identifies generator + timestamp.
- Fix: integrate `c2patool` (Apache-2.0) in the worker render step to attach a signed C2PA manifest declaring `c2pa.action = c2pa.created` with `softwareAgent = "MotionMax v<n>"`. Pair with the visible watermark.
- Effort: M

### L-M-11 — robots.txt allows GPTBot/ChatGPT-User on the marketing site
- Severity: Major
- Evidence: `public/robots.txt:45-55` — `GPTBot` and `ChatGPT-User` are only `Disallow: /app/`, `/auth`, `/dashboard`, `/projects`. Marketing pages (`/`, `/pricing`, `/blog`) are implicitly allowed for OpenAI training. `CCBot` is correctly `Disallow: /` (good). `anthropic-ai`, `Claude-Web` mirror the partial pattern.
- Why: Privacy Policy §3 says MotionMax "does not use" user content for training but is silent on whether MotionMax's own marketing copy can be scraped. If you intend to bar AI training across the board, the marketing site is currently leaking to OpenAI / Anthropic. Reverse is also defensible — flag the choice.
- Fix: decide policy. If "no AI training of MotionMax content," set every AI-bot user-agent (`GPTBot`, `ChatGPT-User`, `anthropic-ai`, `Claude-Web`, `Google-Extended`, `PerplexityBot`, `Bytespider`, `Amazonbot`, `Applebot-Extended`) to `Disallow: /`. Also add `User-Agent: ai.txt` directives or an `ai.txt` (https://spawning.ai/ai-txt) manifest.
- Effort: XS

### L-M-12 — Privacy Policy claims DPF coverage without verifying provider certification
- Severity: Major
- Evidence: `src/pages/Privacy.tsx:103` — "Where required, we rely on the EU–US Data Privacy Framework, Standard Contractual Clauses (SCCs)…". MotionMax itself must self-certify at https://www.dataprivacyframework.gov to claim DPF; it is not enough that subprocessors are certified.
- Why: misrepresenting DPF participation is a per-se FTC §5 deceptive practice (the Department of Commerce explicitly enforces this; see e.g. FTC v. RagingBull 2020 Privacy-Shield analog).
- Fix: either remove the DPF claim and rely solely on SCCs, OR self-certify MotionMax LLC on the DPF list and add the certification ID and "active" status to §6.
- Effort: S (decide path) / L (full DPF self-cert)

### L-M-13 — No California "Notice at Collection" and "Limit Use of SPI" link
- Severity: Major
- Evidence: `marketing/src/pages/index.astro` — checked via search; no inline notice at collection. CCPA §1798.100(a) requires notice at or before collection. "Limit Use of My Sensitive Personal Information" link required (§1798.135(a)(2)) since voice data = SPI.
- Fix: add a "Your California Privacy Rights" footer link on every marketing page (mirrors the existing footer structure in `src/components/landing/LandingFooter.tsx`). Add the inline-notice via a small banner on the signup page.
- Effort: S

---

## Minor

### L-Min-01 — Privacy §13 contact lists support@ but rights enumerated to privacy@ in CCPA §12
- Severity: Minor
- Evidence: `src/pages/Privacy.tsx:130-131` (DSAR contact = support@motionmax.io) vs `:162` (California rights = privacy@motionmax.io). Inconsistent.
- Fix: standardize on `privacy@motionmax.io` for all DSARs and `support@motionmax.io` for service issues; update both lines.
- Effort: XS

### L-Min-02 — Marketing privacy.astro lacks the version date string the React mirror has
- Severity: Minor
- Evidence: `marketing/src/pages/privacy.astro:18-19` shows "April 2026 · Version 2026-04". `src/pages/Privacy.tsx:39-40` shows "April 2026 · Version 2026-04-19". Visible to user.
- Fix: hard-pin both to "2026-04-19" or import shared constant.
- Effort: XS

### L-Min-03 — No DPA download link for SMB customers on pricing page
- Severity: Minor
- Evidence: `src/components/landing/LandingPricing.tsx` — no "Download our DPA" affordance even though Privacy §5 says enterprise customers may request one.
- Fix: link a downloadable PDF DPA at `/legal/dpa` from the Studio plan card.
- Effort: S

### L-Min-04 — Voice consent IP/UA capture not disclosed in Privacy Policy
- Severity: Minor
- Evidence: `supabase/migrations/20260419000007_voice_consents.sql:13-14` — voice_consents stores `ip_address` and `user_agent`. Privacy Policy §2 mentions "we automatically collect IP addresses" generically but does not specifically tie this to voice-clone consent records (which a DSAR may reveal as a surprise).
- Fix: in §2 Voice Data subsection, add: "When you create a voice clone, we record the timestamp, IP address, and user-agent string used to give consent, as required for our biometric consent audit trail."
- Effort: XS

### L-Min-05 — No arbitration / class-action waiver in ToS
- Severity: Minor (US litigation exposure)
- Evidence: `src/pages/Terms.tsx:122-124` (§14 Dispute Resolution) — 30-day pre-suit notice but no AAA arbitration clause and no class-action waiver. §15 sets Delaware exclusive jurisdiction.
- Why: SaaS norm is AAA + class waiver to cap class-action risk. Decision is a commercial judgement, not a strict-compliance issue. Flagging.
- Fix: optional. Insert standard AAA Consumer Arbitration Rules clause if Echo / counsel agrees.
- Effort: S

### L-Min-06 — Help / Settings has no "Cookies" link from in-app footer
- Severity: Minor
- Evidence: `src/components\landing\LandingFooter.tsx` (referenced) — links to Privacy and Terms only. AUP is *not* linked from in-app footer; in-app users cannot find AUP without typing the URL.
- Fix: add AUP link in the in-app footer.
- Effort: XS

### L-Min-07 — Pricing changes "30 days' prior notice" promise
- Severity: Minor
- Evidence: `src/pages/Terms.tsx:82` — "MotionMax reserves the right to adjust plan limits with 30 days' prior notice." Stripe billing changes also need to honor California ARL "clear and conspicuous" notice requirement (1+ business day for material changes).
- Fix: align language with California ARL; add a sentence: "You will receive an email at least 30 days before any change to plan limits or pricing that adversely affects you."
- Effort: XS

### L-Min-08 — Acceptable Use abuse@ inbox not separately monitored / no SLA
- Severity: Minor
- Evidence: `src/pages/AcceptableUse.tsx:89` — `mailto:abuse@motionmax.io`. No referenced runbook for triage.
- Fix: ensure abuse@ inbox is ticketed (e.g., to Linear/Help Scout) and add an SLA line: "We respond to abuse reports within 72 hours."
- Effort: S

---

## Polish

### L-P-01 — No in-editor "AI-generated" disclosure overlay on preview
- Evidence: `src/components/workspace/VideoPlayer.tsx`, `src/components/editor/Stage.tsx` — preview shown without a persistent "AI" badge in-frame. FTC AI guidance and OpenAI/Sora UX precedent overlay a small "AI" mark in the preview.
- Fix: small "AI" pill in the player chrome, removable on export only for paid (per the watermark policy).
- Effort: XS

### L-P-02 — `llms.txt` "AI Crawling & Training Disallow" lacks legal teeth
- Evidence: `public/llms.txt:91-98` — informal disallow notice. No mention of contractual basis or hashing fingerprint.
- Fix: tie to ToS §4 or a new §18 referencing `llms.txt` as binding for AI scraping vendors. Marginal.
- Effort: XS

---

## Production Blockers Table

| ID       | Title                                                                | File evidence                                                                                                       | Effort |
|----------|----------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------|--------|
| L-B-01   | No synthetic-media labeling for paid users (EU AI Act Art. 50)       | worker/dist/handlers/exportVideo.js:325                                                                             | M      |
| L-B-02   | ToS unversioned; signup binds wrong version                          | src/lib/policyVersion.ts:4 ; src/pages/Terms.tsx:38 ; src/pages/Auth.tsx:469-488                                    | S      |
| L-B-03   | Privacy promises AI-training opt-in UI that does not exist           | src/pages/Privacy.tsx:71,81 (no matching code path)                                                                 | L      |
| L-B-04   | No EU / UK Article 27 representative listed                          | src/pages/Privacy.tsx:101-104                                                                                       | S      |
| L-B-05   | EU 14-day cooling-off waiver not collected at point of sale          | src/pages/Terms.tsx:117-119 ; absence in stripe-webhook flow                                                        | M      |

## Top 10 Priority Fixes

| Rank | Finding  | Why first                                                                                              | Effort |
|------|----------|--------------------------------------------------------------------------------------------------------|--------|
| 1    | L-B-01   | EU AI Act Art. 50 obligations apply 2026-08; market launch is US-first but EU traffic is inevitable     | M      |
| 2    | L-B-03   | False statement in Privacy = strict-liability FTC §5 risk; cheap to fix by removing or shipping toggle | L      |
| 3    | L-C-01   | DMCA agent registration takes one form + $6; without it, every user upload is uninsured                | S      |
| 4    | L-B-04   | Art. 27 rep is a vendor procurement; line-item; no excuse not to ship                                  | S      |
| 5    | L-C-02   | AUP self-contradiction is unenforceable on its face                                                    | XS     |
| 6    | L-B-02   | Re-acceptance gate is broken without per-document version pinning                                      | S      |
| 7    | L-C-03   | Voice = biometric; BIPA statutory damages are punishing; one-paragraph fix                              | S      |
| 8    | L-C-07   | Self-service export already built; surfacing it removes the bulk of GDPR Art. 12 friction              | S      |
| 9    | L-C-05   | "Manage Cookies" + granular toggles; CNIL fines for missing this are the largest GDPR fines on record  | M      |
| 10   | L-C-04   | One number to change, removes a documented breach                                                      | XS     |

---

## Items Unable to Verify From Static Analysis

- Whether MotionMax LLC is currently certified on the EU–US Data Privacy Framework register (commerce.gov list); claim at Privacy.tsx:103 may be false. **Action**: open https://www.dataprivacyframework.gov/list and search for "MotionMax".
- Whether Sentry SDK init in `src/lib/sentry.ts` actually masks all text/inputs/media in session replay (referenced at L-M-04). Read the file to confirm.
- Whether OpenRouter, Kling, ElevenLabs, Replicate, Hypereal subscription tiers used by MotionMax are configured for `data_collection: deny` / no-train flags. Required to validate the Privacy §3 promise. Cannot determine from codebase alone — needs vendor contracts.
- Whether `abuse@motionmax.io` and `privacy@motionmax.io` mailboxes are provisioned and monitored. Cannot determine from code.
- Whether Stripe Customer Portal is wired in `src/pages/Billing.tsx` for self-service cancellation (L-C-09). Read the file to confirm.

---

End of Comply specialist audit.

AUDIT WRITTEN: C:\Users\Administrator\studio-zero\shared_context\audits\motionmax-360\2026-05-10\specialists\comply.md
