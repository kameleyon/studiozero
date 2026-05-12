/**
 * /pricing — public, indexable pricing page (PRD §12 SEO).
 *
 * Owner: Forge wires structure (Phase 9 M2 Batch 1). Herald owns the
 * locked copy at `marketing/copy/02-pricing-page.md` v1.0 — every
 * customer-facing string below is sourced verbatim from that file.
 *
 * M5 update (Vega + Forge): extended from M2 Batch 2 with Herald's
 * locked H1 + subhead, the Free-tier card (routes to /signup, not
 * Stripe), per-tier comparison-pivot rows, the SKU explainer table,
 * the 5-question FAQ, regional refund summary, and the closing
 * "what these prices do not include" block. The TierTable client
 * component is preserved — it routes BYOK Pro $79 + Managed Pro $249
 * through /app/onboarding/checkout where the cooling-off waiver UX
 * is rendered for EU/UK customers (D22 D1+D2).
 *
 * Cross-refs:
 *   - marketing/copy/02-pricing-page.md (Herald, locked)
 *   - finance/pricing.md §2 (Penny, locked source-of-truth numbers)
 *   - finance/stripe-config.md §1.6 (Checkout config)
 *   - compliance/d22-cooling-off-flow.md §2.1–2.2 (waiver flow)
 *   - sprint/milestone-M2.md Vega — Pricing page (HC7)
 *   - sprint/milestone-M5.md exit gate
 *   - PRD §12 pricing + §14.5 compliance + §12 SEO Crits
 */
import * as React from "react";

import { TierTable } from "./tier-table";
import { Button } from "../../components/Button";
import { Nav } from "../../components/Nav";
import { aiDisclosureMeta } from "../../lib/ai-disclosure";

import type { Metadata } from "next";

const SITE_URL = "https://studiozero-omega.vercel.app";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Seven plans. Free Surface audit. BYOK from $29. Managed from $99. CLI from $19. Auto-PR fix delivery in V1.5.",
  alternates: { canonical: `${SITE_URL}/pricing` },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/pricing`,
    title: "Pricing — Studio Zero",
    description:
      "Seven plans. Free Surface audit. BYOK from $29. Managed from $99. CLI from $19.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pricing — Studio Zero",
    description:
      "Seven plans. Free Surface audit. BYOK from $29. Managed from $99. CLI from $19.",
  },
  other: { ...aiDisclosureMeta },
};

interface TierSpec {
  tier:
    | "byok_starter"
    | "byok_pro"
    | "managed_starter"
    | "managed_pro"
    | "cli";
  display_name: string;
  monthly_usd: number;
  annual_usd: number;
  audits_per_month: string;
  modes: string;
  features: string[];
  popular?: boolean;
}

const TIERS: TierSpec[] = [
  {
    tier: "byok_starter",
    display_name: "BYOK Starter",
    monthly_usd: 29,
    annual_usd: 290,
    audits_per_month: "2 audits / month",
    modes: "BYOK or CLI",
    features: [
      "2 audits per month, any depth",
      "Specs-only fixes",
      "GitHub App connection",
      "Full findings export (MD / CSV / JSON)",
      "Customer-supplied Anthropic key",
    ],
  },
  {
    tier: "cli",
    display_name: "CLI",
    monthly_usd: 19,
    annual_usd: 190,
    audits_per_month: "Unlimited (local)",
    modes: "CLI only",
    features: [
      "Audits run on your machine — code never leaves",
      "Private Run · Self-Audited watermark",
      "Customer's Claude Code subscription pays tokens",
      "Surface depths on your own URL",
    ],
  },
  {
    tier: "byok_pro",
    display_name: "BYOK Pro",
    monthly_usd: 79,
    annual_usd: 790,
    audits_per_month: "Unlimited",
    modes: "BYOK or CLI",
    features: [
      "Unlimited audits per month",
      "Priority queue",
      "Client-tag organization",
      "All export formats",
      "Customer-supplied Anthropic key",
    ],
  },
  {
    tier: "managed_starter",
    display_name: "Managed Starter",
    monthly_usd: 99,
    annual_usd: 990,
    audits_per_month: "2 Full audits / month",
    modes: "Managed",
    features: [
      "2 Full audits per month",
      "Tokens included",
      "Specs-only fixes",
      "GitHub App connection",
      "Zero API key setup",
    ],
  },
  {
    tier: "managed_pro",
    display_name: "Managed Pro",
    monthly_usd: 249,
    annual_usd: 2490,
    audits_per_month: "Unlimited Full audits",
    modes: "Managed",
    features: [
      "Unlimited Full audits per month",
      "Tokens included",
      "Auto-PR fix delivery (V1.5)",
      "Priority queue",
      "Engineering-team posture",
    ],
    popular: true,
  },
];

export default function PricingPage(): React.ReactElement {
  return (
    <>
      <div className="grain" aria-hidden="true" />
      <div className="glow" aria-hidden="true" />

      <Nav
        links={[
          { href: "/audit", label: "The audit" },
          { href: "/modes", label: "Modes" },
          { href: "/pricing", label: "Pricing" },
          { href: "/blog", label: "Blog" },
        ]}
        auth={{
          signIn: { href: "/login", label: "Sign in" },
          signUp: { href: "/signup", label: "Run a free audit" },
        }}
      />

      <main id="main" role="main" className="pricing-page">
        {/* ─── Header (Herald §1 — locked) ─────────────────────────── */}
        <header className="pricing-header">
          <div className="wrap">
            <p className="eyebrow">Pricing &middot; Seven plans</p>
            <h1>
              Pricing that <em className="serif-it">matches the work</em>.
            </h1>
            <p className="hero-sub">
              Studio Zero prices like a code-quality service, not an AI
              builder &mdash; because that&rsquo;s what the audit is.
            </p>
            <p className="hero-microcopy">
              Annual plans unlock the full year of audits upfront &mdash;
              useful for launch weeks and crunch weeks, since audits are
              bursty.
            </p>
          </div>
        </header>

        {/* ─── Free tier card (no Stripe — routes to /signup) ───────── */}
        <section
          aria-labelledby="free-tier-h2"
          className="pricing-free"
        >
          <div className="wrap">
            <article className="pricing-card pricing-card--free">
              <h2 id="free-tier-h2">Free</h2>
              <p className="pricing-price">
                $0
                <span className="pricing-cadence-suffix"> / month</span>
              </p>
              <p className="pricing-for-who">
                <strong>For who:</strong> founders evaluating the rubric
                on a project they own.
              </p>
              <div className="pricing-feature-cols">
                <div>
                  <p className="pricing-feature-heading">What you get</p>
                  <ul>
                    <li>1 project (a URL you own)</li>
                    <li>Unlimited Surface re-audits on that project</li>
                    <li>Quick or Custom audit depth</li>
                    <li>MD and CSV findings export</li>
                    <li>Email verification required</li>
                  </ul>
                </div>
                <div>
                  <p className="pricing-feature-heading">
                    What you don&rsquo;t get
                  </p>
                  <ul>
                    <li>Code audit (no repo connection)</li>
                    <li>Full audit (URL + repo cross-reference)</li>
                    <li>Comprehensive depth</li>
                    <li>
                      JSON export, second project, third-party URLs
                    </li>
                  </ul>
                </div>
              </div>
              <Button
                variant="primary"
                size="lg"
                href="/signup"
                arrow
                aria-label="Start free Surface audit"
              >
                Start free Surface audit
              </Button>
              <p className="microcopy">No card on file.</p>
              <p className="pricing-pivot">
                If you want to audit your repo, look at{" "}
                <strong>BYOK Starter</strong> below.
              </p>
            </article>
          </div>
        </section>

        {/* ─── Paid tiers (the existing 5-card client TierTable) ─── */}
        <section
          aria-labelledby="paid-tiers-h2"
          className="pricing-paid"
        >
          <div className="wrap">
            <h2 id="paid-tiers-h2" className="sz-sr-only">
              Paid plans
            </h2>
            <TierTable tiers={TIERS} />
          </div>
        </section>

        {/* ─── SKU explainer (Herald §3) ──────────────────────────── */}
        <section
          aria-labelledby="skus-h2"
          className="pricing-skus"
        >
          <div className="wrap">
            <h2 id="skus-h2">
              Three audit SKUs. Two ways to{" "}
              <em className="serif-it">pay</em> for them.
            </h2>
            <p>
              Every plan above grants access to one or more <em>audit
              SKUs</em>. The SKU controls <em>what gets audited</em>. The
              plan controls <em>how many times</em>.
            </p>
            <table className="audit-sku-table">
              <caption className="sz-sr-only">
                The three audit SKUs: Surface, Code, Full &mdash; what each
                reads and what it costs in plan-credits.
              </caption>
              <thead>
                <tr>
                  <th scope="col">SKU</th>
                  <th scope="col">What it reads</th>
                  <th scope="col">Plan credits</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">Surface</th>
                  <td>The live URL only &mdash; what a visitor sees.</td>
                  <td>1 credit per audit</td>
                </tr>
                <tr>
                  <th scope="row">Code</th>
                  <td>The source code in your connected repo.</td>
                  <td>1 credit per audit</td>
                </tr>
                <tr>
                  <th scope="row">Full</th>
                  <td>
                    Both &mdash; the URL and the code, cross-referenced.
                  </td>
                  <td>1 credit per audit (Managed tiers only)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* ─── FAQ — 5 hardest questions (Herald §4) ─────────────── */}
        <section
          aria-labelledby="faq-h2"
          className="pricing-faq"
        >
          <div className="wrap">
            <h2 id="faq-h2">
              The five hardest <em className="serif-it">questions</em>.
            </h2>

            <details>
              <summary>
                <h3>Why $29 a month when Cursor is $20?</h3>
              </summary>
              <p>
                Cursor is an AI builder. It writes code. Studio Zero is
                an independent audit. It reads code that was written and
                grades it against UX, accessibility, copy, brand,
                audience-fit, and code-quality rubrics &mdash; seven
                specialist reviewers under a single readiness score.
              </p>
              <p>
                Compare us instead to SonarQube Cloud Team ($32 / month,
                5 contributors) or Codacy Pro ($15 per developer per
                month). We sit at $29 in the same band, with five more
                axes than either of them ships.
              </p>
              <p>
                If you want the AI builder, pay the AI builder. If you
                want the audit on what your AI builder shipped,
                that&rsquo;s us.
              </p>
            </details>

            <details>
              <summary>
                <h3>What&rsquo;s the difference between Surface and Code?</h3>
              </summary>
              <p>
                Surface reads the live page. It sees what a visitor sees
                &mdash; your HTML, your styles, your rendered text, your
                forms. A Surface audit takes 6 to 12 minutes and ships
                on the free tier.
              </p>
              <p>
                Code reads your source. It connects to your repo via the
                GitHub App and reads the files. It finds three to five
                times as many issues as Surface &mdash; dead code,
                unused dependencies, semantic HTML problems,
                design-system drift, security patterns the live page
                hides. Code is on BYOK Starter and above.
              </p>
              <p>
                If your AI builder shipped a single page, run Surface.
                If your AI builder shipped a codebase, run Code.
              </p>
            </details>

            <details>
              <summary>
                <h3>What is BYOK?</h3>
              </summary>
              <p>
                BYOK means <em>bring your own key</em>. You give Studio
                Zero your Anthropic API key; we run the audit against
                your key; you pay Anthropic directly for the tokens; we
                charge you the platform fee ($29 or $79 a month) for the
                orchestration, the GitHub App, the scoring engine, and
                support.
              </p>
              <p>
                The reason it costs less than Managed: you carry the
                variable token cost. The reason some people prefer it:
                you control the spend ceiling, you see the bill from
                Anthropic alongside everything else, and you keep the
                audit billing decoupled from infrastructure billing.
              </p>
              <p>
                If you don&rsquo;t know what an Anthropic key is,
                that&rsquo;s fine. Pick Managed Starter &mdash; we pay
                tokens, you pay a flat fee.
              </p>
            </details>

            <details>
              <summary>
                <h3>What happens if I cancel?</h3>
              </summary>
              <p>
                Cancel anytime, in the same place you signed up &mdash;
                Settings &rarr; Billing. One click to cancel, one click
                to confirm. Confirmation email within sixty seconds.
              </p>
              <p>What you get back depends on where you live:</p>
              <ul>
                <li>
                  <strong>EU and UK:</strong> 14-day cooling-off right
                  under Directive 2011/83/EU and CCR 2013. Full refund
                  within the window. Window resets every time you
                  upgrade.
                </li>
                <li>
                  <strong>California:</strong> Pro-rata refund of the
                  unused part of your current billing period under SB
                  313, automatically.
                </li>
                <li>
                  <strong>Rest of the US:</strong> No automatic refund.
                  If you believe the audit didn&rsquo;t deliver what you
                  paid for, the Dispute Finding path opens &mdash; a
                  human reviewer at Studio Zero looks at your case
                  within five business days.
                </li>
              </ul>
            </details>

            <details>
              <summary>
                <h3>Is there a free trial?</h3>
              </summary>
              <p>
                The free plan <em>is</em> the trial. Unlimited Surface
                re-audits on one project, no card on file, no time
                limit. Run as many Surface audits as you want.
              </p>
              <p>
                The reason there&rsquo;s no &ldquo;14-day free
                trial&rdquo; of the paid tiers: the audit you can run on
                the free tier is the same audit, on the same rubric,
                with the same scoring engine, that the paid tiers run.
                The free plan caps the <em>depth</em> (Surface, not Code
                or Full) and the <em>scope</em> (one project), not the
                quality.
              </p>
              <p>
                If you outgrow the free plan, the cheapest paid tier
                &mdash; CLI mode at $19 &mdash; undercuts every AI
                builder on the market.
              </p>
            </details>
          </div>
        </section>

        {/* ─── What none of these prices include (Herald §6) ──────── */}
        <section
          aria-labelledby="exclude-h2"
          className="pricing-exclude"
        >
          <div className="wrap">
            <h2 id="exclude-h2">
              What none of these prices{" "}
              <em className="serif-it">include</em>.
            </h2>
            <ul>
              <li>
                <strong>No setup fee.</strong> Connect, run, read.
              </li>
              <li>
                <strong>No call gating.</strong> The buy button is the
                buy button.
              </li>
              <li>
                <strong>No surprise charges.</strong> Token caps are
                visible; overage drops you into a BYOK pivot offer,
                never a hard cut-off mid-run on Managed.
              </li>
              <li>
                <strong>No data sale.</strong> We never sell your code,
                your findings, or your personal information.
              </li>
              <li>
                <strong>No long-term contract.</strong> Cancel anytime,
                one click, in the same medium you signed up.
              </li>
            </ul>
          </div>
        </section>

        {/* ─── Final CTA (Herald §8) ──────────────────────────────── */}
        <section className="final-cta" aria-labelledby="pricing-final-cta-h2">
          <div className="wrap">
            <h2 id="pricing-final-cta-h2">
              Still <em className="serif-it">not sure</em>?
            </h2>
            <p>
              Start free. The audit you can run today on the free plan
              is the same audit, on the same rubric, that every paid
              tier runs. You&rsquo;ll know within ten minutes whether
              Studio Zero is the audit you can defend in writing.
            </p>
            <Button variant="primary" size="lg" href="/signup" arrow>
              Run a free Surface audit
            </Button>
            <p className="microcopy">
              No card on file. Email verification required.
            </p>
          </div>
        </section>
      </main>
    </>
  );
}
