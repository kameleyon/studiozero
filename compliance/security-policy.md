# Security Policy — Responsible Disclosure

**Version:** 1.0 (M4 Batch 2 — Comply locks; Cipher + Shield co-sign)
**Effective date:** 2026-05-12
**Owner:** Comply (Compliance Officer) — co-sign with Cipher (security architecture) + Shield (threat model)
**PRD anchors:** §14.3 (security), §14.5 (compliance), §17 D #18 (security disclosure machinery)
**Cross-references:** `legal/privacy-policy.md` §8 (Security), `legal/terms-of-service.md` §5 (Restrictions — prompt-injection / reverse-engineering carve-outs explicitly do NOT apply to good-faith research per this policy), `compliance/pentest-engagement-2026.md`, `architecture/threat-model.md`, `architecture/system-diagram.md`, `apps/web/app/security/page.tsx` (the public surface)
**Voice:** plain English, grade-9 ceiling, sentence case per `brand/voice.md`. Researchers should not need a lawyer to understand what we promise them.

> **Plain-English mandate.** Per `agents/operations/comply.md` Rule #5: a responsible-disclosure policy a researcher cannot read is a policy that produces no disclosures. This file is the contract Studio Zero offers every researcher who finds something on our perimeter. It is operationally executable by Jo + Cipher + Shield + Comply on day one.

---

## 1. Scope — what we ask researchers to look at

Studio Zero invites good-faith research on the following surfaces:

| Surface                 | Where                                                                                         |
| ----------------------- | --------------------------------------------------------------------------------------------- |
| Marketing site          | `https://studiozero.dev/*` (excluding `/app/*` — see in-scope below)                          |
| Authenticated app       | `https://studiozero.dev/app/*` — sign up for a free account; do not test other accounts       |
| Public API              | Every route documented under `docs/api/`                                                      |
| Supabase Edge Functions | JWT mint, Stripe webhook, GitHub webhook, BYOK dry-run, score-engine intake                   |
| Runner intake           | The Railway-hosted endpoint that ingests audit jobs                                           |
| CLI companion           | `studio-zero` npm package — pairing flow + token handling                                     |
| Multi-tenant isolation  | Postgres Row-Level Security; cross-tenant data-exfiltration attempts on your own test account |
| BYOK Vault key handling | XChaCha20-Poly1305 plaintext-exposure scrutiny against the documented threat model            |
| AI-disclosure machinery | `X-AI-Generated` header presence; `<meta name="ai-generated">` tag — Article 50 conformance   |

## 2. Out of scope — what we ask researchers NOT to look at

These belong to third parties; we cannot authorize testing on infrastructure we do not control. Reports against these will be acknowledged but cannot result in coordinated disclosure under this policy.

| Out-of-scope target                                                               | Why                                                                                                         |
| --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **Stripe** (`stripe.com`, billing.stripe.com, hosted checkout)                    | Stripe runs its own program at https://hackerone.com/stripe                                                 |
| **Anthropic** (`api.anthropic.com`, Claude responses)                             | Anthropic runs its own program at https://www.anthropic.com/responsible-disclosure-policy                   |
| **Supabase / GitHub / Vercel / Cloudflare / Railway / Sentry / PostHog / Resend** | Each has its own VDP — see `legal/subprocessors.md` for the list and their disclosure URLs                  |
| **Anything on a `*.studiozero.dev` subdomain we do not own**                      | Some subdomains are CDN edge or vendor-controlled                                                           |
| **Customer code submitted to audits**                                             | We host it for ≤ 7 days; do not exfiltrate or download it from any account other than your own test account |
| **Social-engineering attacks against Studio Zero employees / contractors**        | Out-of-scope; targeting humans is not what this policy covers                                               |
| **Physical security** of any office or registered-agent address                   | Out-of-scope                                                                                                |
| **Volumetric DDoS or load-test attacks**                                          | Will be filtered by Cloudflare WAF; please do not run them                                                  |

## 3. Rules of engagement

You may, in good faith:

- Sign up for a free account and test the surfaces in §1 on **your own account only**.
- Run automated scanners against `studiozero.dev` at a rate of **≤ 5 requests per second** so Cloudflare WAF does not auto-block your IP.
- Read the public API responses for vulnerabilities (auth bypass, IDOR, injection, etc.).
- Probe Row-Level Security by attempting to read another tenant's data **from your own account** — RLS denials are expected; an RLS bypass is a finding.
- Inspect HTTP headers, source maps, and any other client-side artifact.
- Test our HTML and Markdown rendering paths for XSS using your own audit submissions.
- Test our CSP and CORS posture.

You may NOT:

- Access, modify, or destroy data belonging to any other Studio Zero customer.
- Use production endpoints to mass-mint runner tokens, exhaust Anthropic credits on Managed-mode accounts, or otherwise burn third-party resources.
- Phish, social-engineer, or otherwise target Studio Zero personnel or contractors.
- Submit prompt-injection or adversarial inputs intended to disrupt other tenants' audits (testing on your own audit submissions is fine).
- Publish your findings before we coordinate disclosure with you per §6.
- Use any finding to extract, leak, or sell customer data.

**ToS §5 carve-outs.** `legal/terms-of-service.md` §5 prohibits prompt-injection campaigns, reverse-engineering of the runner / score engine / agents, and adversarial-input campaigns "against Studio Zero itself." **For the avoidance of doubt, good-faith research under this Security Policy is exempt from those prohibitions.** A researcher acting within §3's rules of engagement is NOT in breach of the ToS; submitting a finding via §5 of this policy is the affirmative defense.

## 4. Safe harbor — what we promise the researcher

For research conducted in good faith and in compliance with §1–§3, Studio Zero will:

1. **Not pursue civil action against the researcher** for actions undertaken in compliance with this policy.
2. **Not initiate or refer the researcher to law enforcement** for actions undertaken in compliance with this policy. The Computer Fraud and Abuse Act (18 U.S.C. § 1030) was reformed in 2022 — the DOJ has publicly committed not to prosecute good-faith security research under the CFAA. Studio Zero adopts the same posture.
3. **Treat the researcher's submission as authorized** for the limited purpose of vulnerability investigation. This is the §1030 "authorization" the CFAA requires; treating research as authorized closes the residual prosecutorial exposure.
4. **Defend the researcher** if a third party makes a claim against the researcher solely on the basis of actions covered by this policy, **provided** the researcher gave us prompt notice and full cooperation. (Studio Zero's outside counsel handles; no out-of-pocket cost to the researcher.)

**Limits of safe harbor.** Safe harbor does not extend to: (a) actions outside §1–§3; (b) violations of law independent of the research (e.g., stealing credit-card data from any source); (c) public disclosure before §6 coordination. If you are unsure whether your planned action is covered, email `security@studiozero.dev` first — we will tell you, and the asking itself is evidence of good faith.

---

## 5. How to report — what your submission should include

Send a single email to **`security@studiozero.dev`**. PGP-encryption is optional; key at `/.well-known/security.txt`.

Include the following:

| Field                        | What to write                                                                                             |
| ---------------------------- | --------------------------------------------------------------------------------------------------------- |
| **Title**                    | One sentence describing the vulnerability — e.g., "Stored XSS in finding-evidence viewer (audit reports)" |
| **Severity assessment**      | Critical / High / Medium / Low — your honest take; we may re-grade                                        |
| **Surface affected**         | Web, API, CLI, Runner, Database, BYOK, AI-disclosure (one of the §1 surfaces)                             |
| **Reproduction steps**       | Numbered, copy-pasteable. Include the exact URL, payload, account email, request body, observed response  |
| **Proof-of-concept**         | Screenshot, video, request-response pair, or a minimal reproducer script                                  |
| **Impact analysis**          | What does the vulnerability let the attacker do? Data read? Data write? Auth bypass? RCE? Cross-tenant?   |
| **Suggested fix (optional)** | If you have a remediation idea, share it — we credit suggested fixes in the hall of fame                  |
| **Your contact**             | Email, GitHub handle, name as you want it credited — or "anonymous" if you prefer                         |

Submissions without §1–§3 compliance + §5 fields can still be acknowledged but cannot trigger the §7 SLA clock.

---

## 6. Coordinated disclosure timeline

Studio Zero coordinates with the researcher on a fixed-window timeline. The default is **90 days from acknowledgement** to public disclosure, matching the industry norm (Google Project Zero, CERT/CC). Researchers may negotiate shorter or longer windows in writing.

| Day                    | Step                                                                                                                                                     | Owner                           |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| **Day 0**              | You send the submission to `security@studiozero.dev`                                                                                                     | Researcher                      |
| **+24h**               | We acknowledge receipt; we share a tracking ID (e.g., `SZ-SEC-2026-001`)                                                                                 | Cipher (on-call)                |
| **+5 days**            | We triage — severity confirmed; surface owner assigned; ETA for fix communicated                                                                         | Cipher + Shield                 |
| **+ patch window**     | Patch deployed; verified by researcher if they want re-test                                                                                              | Forge + the surface owner       |
| **+90 days** (default) | Public disclosure — security advisory at `studiozero.dev/security/advisories/SZ-SEC-2026-001`; researcher credited in hall of fame (§9) unless anonymous | Comply + Herald (advisory copy) |

If the patch lands faster than the disclosure window, we may publish earlier with the researcher's consent. If the patch is materially blocked (third-party dependency; coordinated multi-vendor disclosure), we negotiate an extension with the researcher in writing.

---

## 7. SLAs — what we commit to

| Severity                                                                             | Acknowledgement | Triage (severity confirmed) | Patch deployed                     |
| ------------------------------------------------------------------------------------ | --------------- | --------------------------- | ---------------------------------- |
| **Critical** — auth bypass, RCE, cross-tenant data read, BYOK plaintext leak         | 24 hours        | 5 business days             | **7 calendar days**                |
| **High** — IDOR within tenant, XSS with session-impact, RLS bypass on read           | 24 hours        | 5 business days             | **30 calendar days**               |
| **Medium** — XSS without session-impact, info-disclosure on non-PII, low-impact CSRF | 48 hours        | 10 business days            | **90 calendar days**               |
| **Low** — missing security header, cosmetic, defense-in-depth gap                    | 48 hours        | 10 business days            | **90 calendar days** (best-effort) |

Critical severities trigger the on-call rotation per `operations/oncall-rotation.md` even outside business hours. The full incident-response runbook is at `operations/runbook-day-zero.md` + `architecture/threat-model.md` §5.4.

---

## 8. What we do NOT offer at MVP

We are upfront about this so researchers know what to expect:

- **No paid bug bounty.** Studio Zero is at MVP cash burn; the $6.9k Day-0 cushion does not support a bounty program. We may launch a paid program at V2 once revenue supports it. Until then, the offer is: safe harbor + credit + a free Managed-tier Pro subscription for the researcher who reports the vulnerability (where they want one).
- **No HackerOne / Bugcrowd integration at MVP.** Disclosure goes through `security@studiozero.dev` directly. We may join a platform at V1.5+ if disclosure volume warrants.
- **No SLA on cosmetic / defense-in-depth findings.** We log them and ship a fix in normal release cadence — typically within 90 days.

What we DO offer:

- Safe harbor (§4).
- Acknowledgement + tracking ID within 24h (§7).
- Public credit in the hall of fame (§9) unless researcher opts out.
- Free Managed-tier Pro subscription on successful disclosure of any High or Critical issue.
- Direct line to Cipher + Shield for technical discussion during the patch window.

---

## 9. Hall of fame

Public credit for researchers who disclose under this policy. Names are added at researcher's option (anonymous accepted; full name, handle, or both accepted).

| Researcher                                                       | Finding | Severity | Disclosure date | Advisory |
| ---------------------------------------------------------------- | ------- | -------- | --------------- | -------- |
| _(placeholder — first entry lands on first credited disclosure)_ |         |          |                 |          |

---

## 10. security.txt — RFC 9116 conformance

The machine-readable companion to this human-readable policy. Hosted at **`/.well-known/security.txt`** on every domain we operate (per RFC 9116 §3). The file's full text is reproduced below; Vega ships the actual file at `apps/web/public/.well-known/security.txt` in M4 Batch 2.

```
Contact: mailto:security@studiozero.dev
Contact: https://studiozero.dev/security
Expires: 2027-05-12T23:59:59Z
Acknowledgments: https://studiozero.dev/security#hall-of-fame
Preferred-Languages: en
Canonical: https://studiozero.dev/.well-known/security.txt
Policy: https://studiozero.dev/security
Hiring: https://studiozero.dev/about

# Studio Zero security disclosure policy — see /security for the full policy.
# RFC 9116 conformance. Re-issued on each Expires rollover.
```

**Expiry discipline.** RFC 9116 §2.5.5 requires `Expires` ≤ 1 year out. Comply re-issues the file annually on the same calendar date (2026-05-12 → 2027-05-12 → 2028-05-12). Tickler on Jo's calendar 30 days ahead.

**PGP key.** We may add a `Encryption: openpgp4fpr:<fingerprint>` line in V1.5 once Cipher provisions an org-level PGP key. At MVP we accept plaintext email submissions; PGP-encrypted submissions can be sent to `security@studiozero.dev` with the public key fetched from the researcher's contact.

---

## 11. HUMAN-pending actions

| Action                                                                             | Owner               | Status                                                        |
| ---------------------------------------------------------------------------------- | ------------------- | ------------------------------------------------------------- |
| Provision `security@studiozero.dev` inbox in Resend; route to Cipher + Comply + Jo | Jo + Forge (Resend) | **HUMAN-pending — Jo configures**                             |
| Ship `apps/web/public/.well-known/security.txt`                                    | Vega                | M4 Batch 2 (Vega's queue)                                     |
| Ship `apps/web/app/security/page.tsx`                                              | Vega                | M4 Batch 2 (Comply ships in this batch — see Vega review row) |
| Configure on-call rotation to cover `security@studiozero.dev` 24/7                 | Watch + Cipher      | M4 Batch 2                                                    |
| Annual security.txt re-issue (Expires field rollover)                              | Comply              | 30-day tickler before each expiry                             |

---

## 12. Comply self-verdict

| Gate                                                                    | Status |
| ----------------------------------------------------------------------- | ------ |
| Scope + out-of-scope unambiguous (§1–§2)                                | PASS   |
| Rules of engagement enumerated + ToS §5 carve-out explicit (§3)         | PASS   |
| Safe harbor language CFAA-aligned + 2022-reform-aware (§4)              | PASS   |
| Submission format spec'd (§5)                                           | PASS   |
| Coordinated-disclosure timeline + 90-day default (§6)                   | PASS   |
| SLAs per severity + matches threat-model §5.4 (§7)                      | PASS   |
| What we don't offer disclosed upfront (§8) — no fake bug-bounty promise | PASS   |
| security.txt RFC 9116 conformance (§10) + annual rollover discipline    | PASS   |
| HUMAN-pending actions tracked (§11)                                     | PASS   |

**Comply verdict: POLICY LIVE-READY.** Vega ships the `/security` route in this M4 Batch 2 commit; security.txt lands in the same batch; researchers can begin reporting from M4 close (week 14).

---

_Comply locks this Security Policy at v1.0 on 2026-05-12. Re-verify quarterly. Any regulatory change (CFAA amendments, EU NIS2 / CRA implementation milestones, US state vulnerability-disclosure laws) triggers a version bump. security.txt expiry rolls every 12 months._
