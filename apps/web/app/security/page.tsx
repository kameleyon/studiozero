import * as React from "react";

import { Button } from "../../components/Button";
import { Nav } from "../../components/Nav";

import type { Metadata } from "next";

/**
 * /security — Responsible disclosure policy (M4 Batch 2, Comply).
 *
 * Public-facing surface for the policy locked at
 * `compliance/security-policy.md`. The page renders the
 * researcher-facing terms: scope, rules of engagement, safe harbor,
 * SLAs by severity, coordinated-disclosure timeline, hall of fame.
 *
 * Companion file: `apps/web/public/.well-known/security.txt` (RFC 9116).
 *
 * Brand-voice grade-9 ceiling per `agents/growth/herald-brand-voice.md`.
 * The page is exemplary on accessibility — landmark `<main>`, heading
 * hierarchy without skips, semantic `<dl>`/`<table>` where the content
 * is a metadata pairing.
 *
 * Comply own — re-verified quarterly + on security.txt Expires rollover.
 */
export const metadata: Metadata = {
  title: "Security · Responsible disclosure policy",
  description:
    "Report a security vulnerability to Studio Zero. Safe harbor for good-faith research. 24-hour acknowledgement. 7-day patch SLA for Critical findings.",
};

export default function SecurityPage(): React.ReactElement {
  return (
    <>
      <div className="grain" aria-hidden="true" />
      <div className="glow" aria-hidden="true" />

      <Nav
        links={[
          { href: "/how-it-works", label: "How it works" },
          { href: "/#pricing", label: "Pricing" },
          { href: "/blog", label: "Blog" },
          { href: "/security", label: "Security" },
        ]}
        auth={{
          signIn: { href: "/login", label: "Sign in" },
          signUp: { href: "/signup", label: "Run a free audit" },
        }}
      />

      <main id="main">
        <section className="stub-page">
          <div className="wrap">
            <span className="eyebrow stub-eyebrow">
              Trust · Responsible disclosure
            </span>
            <h1>Report a security issue.</h1>
            <p>
              Studio Zero invites good-faith security research on the
              surfaces below. If you find a vulnerability, we want to hear
              about it — directly, before public disclosure, so we can
              fix it and credit you. This page is the contract we offer
              every researcher.
            </p>

            <h2 id="contact">How to report</h2>
            <address>
              Email:{" "}
              <a href="mailto:security@studiozero.dev">
                security@studiozero.dev
              </a>
              <br />
              PGP key + machine-readable contact:{" "}
              <a href="/.well-known/security.txt">
                /.well-known/security.txt
              </a>{" "}
              (RFC 9116)
            </address>
            <p>
              Acknowledgement within <strong>24 hours</strong>. Triage
              within 5 business days. Patch SLAs vary by severity — see
              the table below.
            </p>

            <h2 id="scope">In scope</h2>
            <ul>
              <li>
                Marketing site:{" "}
                <code>https://studiozero.dev/*</code>
              </li>
              <li>
                Authenticated app:{" "}
                <code>https://studiozero.dev/app/*</code> — sign up for a
                free account; do not test other accounts
              </li>
              <li>
                Public API — every route documented under{" "}
                <code>docs/api/</code>
              </li>
              <li>
                Supabase Edge Functions — JWT mint, Stripe webhook,
                GitHub webhook, BYOK dry-run, score-engine intake
              </li>
              <li>Runner intake (Railway-hosted)</li>
              <li>
                CLI companion — <code>studio-zero</code> npm package;
                pairing flow + token handling
              </li>
              <li>
                Multi-tenant isolation — Row-Level Security; cross-tenant
                data-exfiltration attempts on your own test account
              </li>
              <li>
                BYOK Vault key handling — XChaCha20-Poly1305
                plaintext-exposure scrutiny
              </li>
              <li>
                AI-disclosure machinery — <code>X-AI-Generated</code>{" "}
                header presence;{" "}
                <code>&lt;meta name=&quot;ai-generated&quot;&gt;</code>{" "}
                tag (EU AI Act Article 50 conformance)
              </li>
            </ul>

            <h2 id="out-of-scope">Out of scope</h2>
            <p>
              The following belong to third parties; we cannot authorize
              testing on infrastructure we do not control. Reports will
              be acknowledged but cannot be coordinated under this
              policy.
            </p>
            <ul>
              <li>
                <strong>Stripe</strong> — separate program at{" "}
                <a
                  href="https://hackerone.com/stripe"
                  rel="noopener noreferrer"
                >
                  hackerone.com/stripe
                </a>
              </li>
              <li>
                <strong>Anthropic</strong> — separate program at{" "}
                <a
                  href="https://www.anthropic.com/responsible-disclosure-policy"
                  rel="noopener noreferrer"
                >
                  anthropic.com/responsible-disclosure-policy
                </a>
              </li>
              <li>
                <strong>
                  Other subprocessors — Supabase, GitHub, Vercel,
                  Cloudflare, Railway, Sentry, PostHog, Resend
                </strong>{" "}
                — each has its own VDP; see{" "}
                <a href="/subprocessors">/subprocessors</a>
              </li>
              <li>
                Customer code submitted to audits (we host it for ≤ 7
                days; do not exfiltrate)
              </li>
              <li>
                Social-engineering attacks against Studio Zero personnel
                or contractors
              </li>
              <li>Physical security of any office or registered-agent address</li>
              <li>Volumetric DDoS or load-test attacks</li>
            </ul>

            <h2 id="rules">Rules of engagement</h2>
            <p>You may, in good faith:</p>
            <ul>
              <li>
                Sign up for a free account and test the in-scope surfaces
                on <strong>your own account only</strong>
              </li>
              <li>
                Run automated scanners at{" "}
                <strong>≤ 5 requests/second</strong> so our WAF does not
                auto-block your IP
              </li>
              <li>
                Probe Row-Level Security from your own account — RLS
                denials are expected; an RLS bypass is a finding
              </li>
              <li>
                Inspect HTTP headers, source maps, and any client-side
                artifact
              </li>
              <li>
                Test our HTML and Markdown rendering paths for XSS using
                your own audit submissions
              </li>
            </ul>
            <p>You may NOT:</p>
            <ul>
              <li>
                Access, modify, or destroy data belonging to any other
                Studio Zero customer
              </li>
              <li>
                Use production endpoints to mass-mint runner tokens,
                exhaust Anthropic credits, or burn third-party resources
              </li>
              <li>
                Phish, social-engineer, or otherwise target Studio Zero
                personnel
              </li>
              <li>
                Submit prompt-injection or adversarial inputs intended to
                disrupt other tenants&rsquo; audits
              </li>
              <li>
                Publish your findings before we coordinate disclosure
                with you
              </li>
            </ul>

            <h2 id="safe-harbor">Safe harbor</h2>
            <p>
              For research conducted in good faith and in compliance with
              the scope and rules above, Studio Zero will:
            </p>
            <ul>
              <li>
                Not pursue civil action against the researcher for
                actions undertaken in compliance with this policy.
              </li>
              <li>
                Not initiate or refer the researcher to law enforcement.
                The Computer Fraud and Abuse Act (18 U.S.C. § 1030) was
                reformed in 2022 — the DOJ has publicly committed not to
                prosecute good-faith security research under the CFAA.
                We adopt the same posture.
              </li>
              <li>
                Treat the researcher&rsquo;s submission as{" "}
                <em>authorized</em> for the limited purpose of
                vulnerability investigation.
              </li>
              <li>
                Defend the researcher if a third party makes a claim
                against the researcher solely on the basis of actions
                covered by this policy, provided the researcher gave us
                prompt notice and full cooperation.
              </li>
            </ul>
            <p>
              <strong>Our Terms of Service §5</strong> prohibits
              prompt-injection campaigns and reverse-engineering of the
              runner / score engine / agents. For the avoidance of
              doubt: good-faith research under this Security Policy is
              exempt from those prohibitions. Submitting a finding under
              this policy is the affirmative defense.
            </p>

            <h2 id="slas">SLAs by severity</h2>
            <table className="security-slas">
              <thead>
                <tr>
                  <th scope="col">Severity</th>
                  <th scope="col">Examples</th>
                  <th scope="col">Acknowledgement</th>
                  <th scope="col">Patch deployed</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">Critical</th>
                  <td>
                    Auth bypass; RCE; cross-tenant data read; BYOK
                    plaintext leak
                  </td>
                  <td>24 hours</td>
                  <td>
                    <strong>7 days</strong>
                  </td>
                </tr>
                <tr>
                  <th scope="row">High</th>
                  <td>
                    IDOR within tenant; XSS with session-impact; RLS
                    bypass on read
                  </td>
                  <td>24 hours</td>
                  <td>
                    <strong>30 days</strong>
                  </td>
                </tr>
                <tr>
                  <th scope="row">Medium</th>
                  <td>
                    XSS without session-impact; info-disclosure on
                    non-PII; low-impact CSRF
                  </td>
                  <td>48 hours</td>
                  <td>
                    <strong>90 days</strong>
                  </td>
                </tr>
                <tr>
                  <th scope="row">Low</th>
                  <td>
                    Missing security header; cosmetic;
                    defense-in-depth gap
                  </td>
                  <td>48 hours</td>
                  <td>90 days (best-effort)</td>
                </tr>
              </tbody>
            </table>

            <h2 id="timeline">Coordinated disclosure timeline</h2>
            <p>
              Default window is <strong>90 days from acknowledgement</strong>{" "}
              to public disclosure, matching the industry norm. The
              researcher and Studio Zero may negotiate a shorter or
              longer window in writing. On day 90 (or sooner if the
              patch ships earlier with researcher consent), we publish
              an advisory at <code>/security/advisories/SZ-SEC-YYYY-NNN</code>{" "}
              and credit the researcher in the hall of fame.
            </p>

            <h2 id="what-we-offer">What we offer</h2>
            <p>We are upfront about this so researchers know what to expect:</p>
            <ul>
              <li>
                <strong>Safe harbor.</strong> Covered in detail above.
              </li>
              <li>
                <strong>Acknowledgement within 24 hours</strong> with a
                tracking ID (e.g.,{" "}
                <code>SZ-SEC-2026-001</code>).
              </li>
              <li>
                <strong>Public credit</strong> in the hall of fame —
                unless you prefer to be anonymous.
              </li>
              <li>
                <strong>
                  Free Managed-tier Pro subscription
                </strong>{" "}
                on successful disclosure of any High or Critical issue.
              </li>
              <li>
                <strong>Direct line to our security team</strong> —
                Cipher and Shield, by name, during the patch window.
              </li>
            </ul>
            <p>
              We do <strong>not</strong> currently offer a paid bug
              bounty. Studio Zero is at MVP cash burn; the cushion does
              not support a bounty program. We may launch one at V2
              once revenue supports it.
            </p>

            <h2 id="hall-of-fame">Hall of fame</h2>
            <p>
              Researchers who disclose under this policy and choose
              public credit. First entry lands on first credited
              disclosure.
            </p>
            <ul>
              <li>
                <em>
                  (placeholder — first entry lands on first credited
                  disclosure)
                </em>
              </li>
            </ul>

            <h2 id="submission-format">What to include in your submission</h2>
            <p>
              Send a single email to{" "}
              <a href="mailto:security@studiozero.dev">
                security@studiozero.dev
              </a>{" "}
              with:
            </p>
            <ul>
              <li>
                <strong>Title</strong> — one sentence describing the
                vulnerability
              </li>
              <li>
                <strong>Severity assessment</strong> — Critical / High /
                Medium / Low (your honest take; we may re-grade)
              </li>
              <li>
                <strong>Surface affected</strong> — Web, API, CLI,
                Runner, Database, BYOK, or AI-disclosure
              </li>
              <li>
                <strong>Reproduction steps</strong> — numbered,
                copy-pasteable
              </li>
              <li>
                <strong>Proof-of-concept</strong> — screenshot, video,
                request-response pair, or minimal reproducer
              </li>
              <li>
                <strong>Impact analysis</strong> — what does the
                vulnerability let an attacker do?
              </li>
              <li>
                <strong>Suggested fix</strong> (optional) — we credit
                suggested fixes in the hall of fame
              </li>
              <li>
                <strong>Your contact</strong> — email, GitHub handle,
                name as you want it credited (or &quot;anonymous&quot;)
              </li>
            </ul>

            <p className="stub-meta">
              Owner: Comply · Co-signed: Cipher (security architecture) +
              Shield (threat model) · Policy file:{" "}
              <code>compliance/security-policy.md</code>
            </p>

            <div style={{ marginTop: "var(--sp-32)" }}>
              <Button variant="ghost" size="md" href="/" arrow>
                Back to the landing
              </Button>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
