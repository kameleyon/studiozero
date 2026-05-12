import * as React from "react";

import { Button } from "../../components/Button";
import { Nav } from "../../components/Nav";

import type { Metadata } from "next";

/**
 * /modes — BYOK / CLI / Managed explainer (M5 Vega).
 *
 * Per `ia/sitemap.md` Marketing-site row 7:
 *   "/modes — BYOK / CLI / Managed comparison"
 *
 * Three audit-execution modes, one comparison table. Copy derives
 * from `finance/pricing.md` v1.0 (Penny) + `marketing/copy/02-
 * pricing-page.md` (Herald) FAQ Q3 ("What is BYOK?") — verbatim
 * where applicable, paraphrased only for layout reasons.
 *
 * SEO: indexable, canonical=`/modes`.
 */
export const metadata: Metadata = {
  title: "Modes — BYOK, CLI, Managed",
  description:
    "Three ways to run a Studio Zero audit. BYOK uses your Anthropic key. CLI runs the audit on your machine. Managed includes tokens and runs in our cloud. Same rubric, three places to put the work.",
  alternates: { canonical: "https://studiozero-omega.vercel.app/modes" },
  openGraph: {
    type: "website",
    url: "https://studiozero-omega.vercel.app/modes",
    title: "Modes — BYOK, CLI, Managed",
    description: "Three ways to run a Studio Zero audit. Same rubric, three places to put the work.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Modes — BYOK, CLI, Managed",
    description: "Three ways to run a Studio Zero audit. Same rubric, three places to put the work.",
  },
};

export default function ModesPage(): React.ReactElement {
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

      <main id="main">
        <section className="hero" aria-labelledby="modes-h1">
          <div className="wrap">
            <div className="hero-status">
              <span className="eyebrow">
                Three modes · Same rubric · One readiness score
              </span>
            </div>
            <h1 id="modes-h1">
              Three ways to run the{" "}
              <em className="serif-it">same audit</em>.
            </h1>
            <p className="hero-sub">
              The audit&rsquo;s rubric does not change. The reviewers do not
              change. The score math does not change. What changes is where
              the work runs and who pays for the tokens.
            </p>
            <div className="hero-cta-row">
              <Button variant="primary" size="lg" href="/signup" arrow>
                Run a free Surface audit
              </Button>
              <Button variant="ghost" size="lg" href="/pricing">
                See pricing
              </Button>
            </div>
          </div>
        </section>

        <section className="section" id="modes" aria-labelledby="modes-h2">
          <div className="wrap">
            <div className="section-head">
              <div>
                <p className="eyebrow">01 · The three modes</p>
                <h2 id="modes-h2">
                  Pick the mode that{" "}
                  <em className="serif-it">fits</em> the work.
                </h2>
              </div>
              <p className="section-lede">
                BYOK if you already pay Anthropic. CLI if your code cannot
                leave your machine. Managed if you don&rsquo;t want to know
                what an Anthropic key is.
              </p>
            </div>

            <div className="solution-grid">
              <article className="solution-card">
                <h3>BYOK — <em className="serif-it">bring your own key</em></h3>
                <p>
                  You give Studio Zero your Anthropic API key. We run the
                  audit against your key. You pay Anthropic directly for the
                  tokens. We charge a flat platform fee for the
                  orchestration, the GitHub App, the scoring engine, and
                  support.
                </p>
                <p className="meta">
                  Best when: you already have an Anthropic bill, you want to
                  see the audit&rsquo;s token cost on your own invoice, or
                  you want a hard spend ceiling controlled by your own
                  Anthropic quota.
                </p>
              </article>
              <article className="solution-card">
                <h3>CLI — <em className="serif-it">local-folder audit</em></h3>
                <p>
                  Install the CLI on your machine. Point it at a local
                  folder. The audit runs locally; only the verdict, the
                  findings, and the score are sent back to your Studio Zero
                  account. Your code never leaves your machine.
                </p>
                <p className="meta">
                  Best when: privacy is a hard constraint &mdash; you work
                  under NDA, in regulated industries (fintech, healthtech),
                  or you cannot ship source to a remote service. Your
                  Claude Code subscription pays tokens.
                </p>
              </article>
              <article className="solution-card">
                <h3>Managed — <em className="serif-it">tokens included</em></h3>
                <p>
                  Studio Zero pays Anthropic. You pay a flat monthly fee
                  with a fair-use token cap. No Anthropic account required.
                  No key paste step. The simplest path from signup to
                  verdict.
                </p>
                <p className="meta">
                  Best when: you don&rsquo;t want to know what an Anthropic
                  key is, you want one invoice for the whole service, or
                  you&rsquo;re running audits on behalf of a team that
                  expects flat predictable pricing.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section className="section" id="comparison" aria-labelledby="comparison-h2">
          <div className="wrap">
            <div className="section-head">
              <div>
                <p className="eyebrow">02 · Comparison</p>
                <h2 id="comparison-h2">
                  Side by <em className="serif-it">side</em>.
                </h2>
              </div>
              <p className="section-lede">
                What each mode does and what it does not.
              </p>
            </div>

            <table className="audit-sku-table">
              <caption className="sz-sr-only">
                Comparison of BYOK, CLI, and Managed modes across price
                floor, token payer, code location, and watermark.
              </caption>
              <thead>
                <tr>
                  <th scope="col">&nbsp;</th>
                  <th scope="col">BYOK</th>
                  <th scope="col">CLI</th>
                  <th scope="col">Managed</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">Price floor</th>
                  <td>$29 / mo</td>
                  <td>$19 / mo</td>
                  <td>$99 / mo</td>
                </tr>
                <tr>
                  <th scope="row">Who pays Anthropic</th>
                  <td>You</td>
                  <td>You (Claude Code subscription)</td>
                  <td>Studio Zero</td>
                </tr>
                <tr>
                  <th scope="row">Where the code runs</th>
                  <td>Studio Zero cloud (your key)</td>
                  <td>Your machine</td>
                  <td>Studio Zero cloud</td>
                </tr>
                <tr>
                  <th scope="row">Verdict watermark</th>
                  <td>Server-verified</td>
                  <td>Private Run &middot; Self-Audited</td>
                  <td>Server-verified</td>
                </tr>
                <tr>
                  <th scope="row">Repo audit (GitHub App)</th>
                  <td>Yes</td>
                  <td>No (local-folder only)</td>
                  <td>Yes</td>
                </tr>
                <tr>
                  <th scope="row">Fair-use token cap</th>
                  <td>N/A (you own the bill)</td>
                  <td>N/A (your Claude Code quota)</td>
                  <td>Yes &mdash; disclosed in plan</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="final-cta" aria-labelledby="modes-final-cta-h2">
          <div className="wrap">
            <h2 id="modes-final-cta-h2">
              Pick a mode &mdash; the audit is{" "}
              <em className="serif-it">the same</em>.
            </h2>
            <p>
              If you can&rsquo;t decide, start free. The free Surface audit
              runs in Managed mode &mdash; we pay tokens, you get the
              verdict, you keep the receipts.
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
