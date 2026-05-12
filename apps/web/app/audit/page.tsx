import * as React from "react";

import { Button } from "../../components/Button";
import { Nav } from "../../components/Nav";

import type { Metadata } from "next";

/**
 * /audit — what the seven reviewers cover (M5 Vega + Forge).
 *
 * Landing-page-style explainer for the Audit product. Composition
 * mirrors the M0 landing surface (Hero → 7-card reviewer grid →
 * how-it-works → CTA). Copy is derived from Herald's locked
 * landing-page voice (`marketing/copy/01-landing-page.md`) — same
 * grade-8 ceiling, sentence case, no banned words.
 *
 * Cross-refs:
 *   - ia/sitemap.md §"Marketing site" — /audit row
 *   - marketing/copy/01-landing-page.md §6 — "An independent panel
 *     reads your code" + auditor names (Halo, Proof, Optic, Echo,
 *     Tide, Cipher, Canon)
 *   - PRD §6 (Product Surface) + §9 (SKUs)
 *
 * SEO: indexable, canonical=`/audit`.
 */
export const metadata: Metadata = {
  title: "The audit — seven specialist reviewers under one score",
  description:
    "Studio Zero is the independent audit for AI-built software. Seven specialist auditors. Every finding has a file path, a line range, and a fix. Free Surface audit on any URL you own.",
  alternates: { canonical: "https://studiozero-omega.vercel.app/audit" },
  openGraph: {
    type: "website",
    url: "https://studiozero-omega.vercel.app/audit",
    title: "The audit — seven specialist reviewers under one score",
    description:
      "Seven specialist auditors. UX, accessibility, copy, brand, audience-fit, security patterns, design-system drift.",
  },
  twitter: {
    card: "summary_large_image",
    title: "The audit — seven specialist reviewers under one score",
    description:
      "Every finding has a file path, a line range, and a fix.",
  },
};

interface Reviewer {
  name: string;
  axis: string;
  body: string;
}

const REVIEWER_ROWS: Reviewer[] = [
  {
    name: "Halo",
    axis: "Accessibility",
    body: "WCAG 2.2 AA, every success criterion. Reads the rendered DOM and your source. Flags missing labels, contrast failures, focus traps, keyboard dead-ends, motion that breaks reduced-motion preferences.",
  },
  {
    name: "Proof",
    axis: "Copy & clarity",
    body: 'Grades every reader-facing string against a Flesch-Kincaid 8 ceiling. Rewrites "invalid input" into something a human can act on. Flags banned words, jargon, and error messages that blame the user.',
  },
  {
    name: "Optic",
    axis: "UX & interaction",
    body: "Reads Nielsen's ten heuristics into every primary flow. Counts your Hick's-Law affordances. Flags decision overload, missing exits, and modals that trap focus. Graphs the steps a user takes to your goal.",
  },
  {
    name: "Echo",
    axis: "Audience fit",
    body: "Reads your hero, your pricing page, and your onboarding against your stated persona. Flags the gap between who you said you were building for and who the surface speaks to.",
  },
  {
    name: "Tide",
    axis: "Brand & visual system",
    body: "Reads your design tokens against your live styles. Catches the moment your primary button has three different shades of blue six prompts in. Lists every offender by file.",
  },
  {
    name: "Cipher",
    axis: "Security patterns",
    body: "Reads your source for the classes that audit tools agree on — leaked keys, insecure defaults, CORS gaps, missing CSP directives, dependency CVEs. Names the file, the line, the CVSS.",
  },
  {
    name: "Canon",
    axis: "Design-system drift",
    body: "Reads your component library against your rendered surface. Catches the buttons that bypass the token. Catches the spacing that ignores the scale. Catches the typography that drifts off the system.",
  },
];

function Hero(): React.ReactElement {
  return (
    <section className="hero" aria-labelledby="audit-h1">
      <div className="wrap">
        <div className="hero-status">
          <span className="eyebrow">The audit · Seven reviewers · One score</span>
        </div>
        <h1 id="audit-h1">
          The audit you can <em className="serif-it">defend</em> in writing.
        </h1>
        <p className="hero-sub">
          Studio Zero is the independent audit for AI-built software. Seven
          specialist reviewers read your URL or your repo, grade against a
          versioned rubric, and ship a checklist where every finding has a
          file path, a line range, and a fix.
        </p>
        <div className="hero-cta-row">
          <Button variant="primary" size="lg" href="/signup" arrow>
            Run a free Surface audit
          </Button>
          <Button variant="ghost" size="lg" href="/pricing">
            See pricing
          </Button>
        </div>
        <p className="hero-microcopy">
          Free Surface audit on a URL you own. No credit card. Email
          verification required.
        </p>
      </div>
    </section>
  );
}

function Reviewers(): React.ReactElement {
  return (
    <section className="section" id="reviewers" aria-labelledby="reviewers-h2">
      <div className="wrap">
        <div className="section-head">
          <div>
            <p className="eyebrow">01 · The seven reviewers</p>
            <h2 id="reviewers-h2">
              An independent panel <em className="serif-it">reads</em> your code.
            </h2>
          </div>
          <p className="section-lede">
            They flag, recommend, and verify. They never edit your code. We
            name them so you can read the receipts.
          </p>
        </div>

        <div className="solution-grid">
          {REVIEWER_ROWS.map((r) => (
            <article className="solution-card" key={r.name}>
              <h3>
                {r.name} — <em className="serif-it">{r.axis.toLowerCase()}</em>
              </h3>
              <p>{r.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function SKUs(): React.ReactElement {
  return (
    <section className="section" id="skus" aria-labelledby="skus-h2">
      <div className="wrap">
        <div className="section-head">
          <div>
            <p className="eyebrow">02 · Three SKUs</p>
            <h2 id="skus-h2">
              Three SKUs. <em className="serif-it">One readiness score.</em>
            </h2>
          </div>
          <p className="section-lede">
            The SKU controls what gets read. The plan controls how often.
          </p>
        </div>

        <table className="audit-sku-table">
          <caption className="sz-sr-only">
            Audit SKUs and what each one reads.
          </caption>
          <thead>
            <tr>
              <th scope="col">SKU</th>
              <th scope="col">What it reads</th>
              <th scope="col">Typical runtime</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Surface</th>
              <td>The live URL — what a visitor sees.</td>
              <td>6 to 12 minutes</td>
            </tr>
            <tr>
              <th scope="row">Code</th>
              <td>Your source via the GitHub App.</td>
              <td>10 to 20 minutes</td>
            </tr>
            <tr>
              <th scope="row">Full</th>
              <td>Both — URL and code, cross-referenced.</td>
              <td>15 to 30 minutes</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

function HowItWorks(): React.ReactElement {
  return (
    <section className="section" id="how-it-works" aria-labelledby="how-h2">
      <div className="wrap">
        <div className="section-head">
          <div>
            <p className="eyebrow">03 · How it works</p>
            <h2 id="how-h2">
              Three steps from a repo to a{" "}
              <em className="serif-it">verdict</em>.
            </h2>
          </div>
          <p className="section-lede">
            No setup call. No discovery questionnaire. The audit is the
            product.
          </p>
        </div>

        <div className="how-grid">
          <article className="how-card">
            <h3>Connect your repo or paste a URL.</h3>
            <p>
              Install the Studio Zero GitHub App on the org that owns the
              repo, or paste a URL you own. We verify ownership before the
              runner starts.
            </p>
          </article>
          <article className="how-card">
            <h3>Pick a depth. Hit run.</h3>
            <p>
              Quick (the gist), Custom (the priorities you flag), or
              Comprehensive (every reviewer, every axis). Most first audits
              take 6 to 12 minutes.
            </p>
          </article>
          <article className="how-card">
            <h3>Every finding with a file, a line, and a fix.</h3>
            <p>
              A graded checklist. A single readiness score. Copy-paste-ready
              specs your team can ship. Export to MD, CSV, or JSON.
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}

function FinalCTA(): React.ReactElement {
  return (
    <section className="final-cta" aria-labelledby="audit-final-cta-h2">
      <div className="wrap">
        <h2 id="audit-final-cta-h2">
          Find out what your AI builder{" "}
          <em className="serif-it">missed</em>.
        </h2>
        <p>
          Run a free Surface audit on a URL you own. Most first audits do
          not pass our gate &mdash; that&rsquo;s the design.
        </p>
        <Button variant="primary" size="lg" href="/signup" arrow>
          Run a free Surface audit
        </Button>
        <p className="microcopy">
          No card on file. Email verification required. Most audits take 6
          to 12 minutes.
        </p>
      </div>
    </section>
  );
}

export default function AuditPage(): React.ReactElement {
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
        <Hero />
        <Reviewers />
        <SKUs />
        <HowItWorks />
        <FinalCTA />
      </main>
    </>
  );
}
