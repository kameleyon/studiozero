import Link from "next/link";
import * as React from "react";

import { Button } from "../components/Button";
import { Nav } from "../components/Nav";

/**
 * Landing — Studio Zero `/`
 *
 * Phase 9 M0. Composition spec: `design/screens/landing/landing.md`
 * (Pixel). Copy locked from `marketing/copy/01-landing-page.md`
 * (Herald) — and inside that, the hero H1 + subhead are sourced
 * verbatim from `brand/samples/01-landing-h1.md`.
 *
 * Hard rules embedded here:
 *  - Single primary CTA above the fold + 1 secondary link (HB-1).
 *  - One <h1>, hierarchical headings.
 *  - Server-rendered. No client-side state. The page ships as static
 *    HTML; Vercel CDN serves it at the edge.
 *  - WCAG 2.2 AA: skip-link first (in Nav), semantic landmarks,
 *    320px reflow without horizontal scroll, ≥24×24 hit areas.
 *
 * M1 TODO: extract Hero/Problem/Solution/HowItWorks/Pricing into
 *          per-section components under `components/landing/`. At M0
 *          we keep them inline so the diff against `landing.jsx`
 *          stays readable for Pixel's review.
 */

// ─── Hero (locked copy) ───────────────────────────────────────────────
function Hero(): React.ReactElement {
  return (
    <section className="hero" aria-labelledby="hero-h1">
      <div className="wrap">
        <div className="hero-status">
          <span className="eyebrow">Studio status · 56 agents online</span>
          <span className="sep" aria-hidden="true">
            ·
          </span>
          <span className="eyebrow eyebrow-dim">
            v0.5 — Audit Layer Live
          </span>
        </div>

        {/* H1 — locked verbatim from brand/samples/01-landing-h1.md.
            Italicized phrase "line by line" per usage-rules.md. */}
        <h1 id="hero-h1">
          Your AI builder shipped code that fails accessibility. We&rsquo;ll
          prove it — <em className="serif-it">line by line</em>.
        </h1>

        <p className="hero-sub">
          Studio Zero is the independent audit for AI-built software. Connect
          your repo, pick a depth, get a graded checklist — every finding
          with a file path, a line range, and a fix.
        </p>

        <div className="hero-cta-row">
          <Button variant="primary" size="lg" href="/signup" arrow>
            Run a free Surface audit
          </Button>
          <Button variant="ghost" size="lg" href="/how-it-works">
            See how it works
          </Button>
        </div>

        <p className="hero-microcopy">
          Free Surface audit on a URL you own. No credit card. Email
          verification required.
        </p>

        <div className="hero-stats" aria-label="Studio Zero by the numbers">
          <Stat number={56} label="Specialist agents" />
          <Stat number={14} label="Layers in the system" />
          <Stat number={7} label="Independent auditors" />
          <Stat number={5} label="Severity levels" />
        </div>
      </div>
    </section>
  );
}

function Stat({
  number,
  label,
}: {
  number: number;
  label: string;
}): React.ReactElement {
  return (
    <div className="stat-card">
      <span className="stat-num" aria-hidden="true">
        {number}
      </span>
      <span className="stat-label">{label}</span>
      <span className="sz-sr-only">
        {number} {label}
      </span>
    </div>
  );
}

// ─── Problem section ──────────────────────────────────────────────────
function Problem(): React.ReactElement {
  return (
    <section className="section" id="problem" aria-labelledby="problem-h2">
      <div className="wrap">
        <div className="section-head">
          <div>
            <p className="eyebrow">01 · The problem</p>
            <h2 id="problem-h2">
              The three things AI-built software ships{" "}
              <em className="serif-it">broken</em>.
            </h2>
          </div>
          <p className="section-lede">
            Every row below is something Studio Zero&rsquo;s audit catches on
            the first run. We measured it on our own repo.
          </p>
        </div>

        <div className="problem-grid">
          <article className="problem-card">
            <h3>Your signup form is invisible to a screen reader.</h3>
            <p>
              AI builders generate <code>&lt;input&gt;</code> elements without
              labels four times out of five on the first scaffold. Screen-reader
              users hear &ldquo;edit text, blank&rdquo; and bounce. WCAG 2.2
              AA, success criterion 1.3.1.
            </p>
          </article>
          <article className="problem-card">
            <h3>Your error message blames the user.</h3>
            <p>
              &ldquo;Invalid input&rdquo; is the most common AI-generated error
              string. It tells the user nothing and tells them it&rsquo;s their
              fault. Halo and Proof rewrite it with a cause, an action, and a
              fallback.
            </p>
          </article>
          <article className="problem-card">
            <h3>Your primary button has three different shades of blue.</h3>
            <p>
              Six prompts in, the AI forgot the design token. The buttons still
              work. The system drift is invisible until your designer joins and
              asks why. Optic finds it; the audit lists every offender by file.
            </p>
          </article>
        </div>

        <p className="problem-close">
          Your AI builder shipped code that fails accessibility.
          <br />
          We&rsquo;ll prove it — <em className="serif-it">line by line</em>.
        </p>
      </div>
    </section>
  );
}

// ─── Solution section ─────────────────────────────────────────────────
function Solution(): React.ReactElement {
  return (
    <section className="section" id="solution" aria-labelledby="solution-h2">
      <div className="wrap">
        <div className="section-head">
          <div>
            <p className="eyebrow">02 · The audit</p>
            <h2 id="solution-h2">
              The audit you can <em className="serif-it">defend</em> in
              writing.
            </h2>
          </div>
          <p className="section-lede">One service. Three things it does for you.</p>
        </div>

        <div className="solution-grid">
          <article className="solution-card">
            <h3>An independent panel reads your code.</h3>
            <p>
              Seven specialist auditors — UX, accessibility, copy, brand,
              audience-fit, security patterns, and design-system drift. They
              flag, recommend, and verify. They never edit your code.
            </p>
            <p className="meta">
              Auditor names: Halo, Proof, Optic, Echo, Tide, Cipher, Canon. We
              name them so you can read the receipts.
            </p>
          </article>
          <article className="solution-card">
            <h3>Every finding has a file, a line, and a fix.</h3>
            <p>
              No &ldquo;consider improving.&rdquo; Every issue ships with the
              file path, the line range, the WCAG or heuristic citation, and
              one concrete change. Export to MD, CSV, or JSON. Hand it to your
              team or your client.
            </p>
          </article>
          <article className="solution-card">
            <h3>
              Coming in V1.5 — we&rsquo;ll write the fix PR for you.
            </h3>
            <p>
              Today, you get the spec. In V1.5, you can pay per fix bundle and
              Studio Zero opens a PR on a fix branch — re-audited before it
              lands. PRs never touch your default branch. Until V1.5, the audit
              ships with copy-paste-ready specs.
            </p>
            <p className="meta">
              Auto-PR fix delivery is on the V1.5 roadmap. MVP ships
              specs-only.
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}

// ─── How it works ─────────────────────────────────────────────────────
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
              Install the Studio Zero GitHub App on the org that owns the repo,
              or paste a URL you own. We verify ownership before the runner
              starts. Surface audits run on the URL. Code and Full audits read
              your source.
            </p>
          </article>
          <article className="how-card">
            <h3>Pick a depth. Hit run.</h3>
            <p>
              Quick (the gist), Custom (the priorities you flag), or
              Comprehensive (every reviewer, every axis). Most first audits
              take 6 to 12 minutes. We&rsquo;ll email you when it&rsquo;s done.
            </p>
          </article>
          <article className="how-card">
            <h3>Every finding with a file, a line, and a fix.</h3>
            <p>
              A graded checklist. A single readiness score. Copy-paste-ready
              specs your team can ship. Export to MD, CSV, or JSON. Re-audit
              free for 30 days on PASS WITH FIXES.
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}

// ─── Pricing strip ────────────────────────────────────────────────────
function PricingStrip(): React.ReactElement {
  return (
    <section className="section" id="pricing" aria-labelledby="pricing-h2">
      <div className="wrap">
        <div className="section-head">
          <div>
            <p className="eyebrow">04 · Pricing</p>
            <h2 id="pricing-h2">
              Pick a plan. <em className="serif-it">Or stay on free.</em>
            </h2>
          </div>
          <p className="section-lede">
            Three plans here. Four more on the pricing page. Annual saves two
            months.
          </p>
        </div>

        <div className="pricing-grid">
          <article className="pricing-card" aria-labelledby="plan-free">
            <p className="pricing-tier" id="plan-free">
              Free
            </p>
            <p className="pricing-price">
              $0
              <span className="sz-sr-only"> per month</span>
            </p>
            <p className="pricing-cadence">forever, one project</p>
            <ul className="pricing-features">
              <li>1 project, unlimited Surface re-audits</li>
              <li>Quick and Custom depths</li>
              <li>MD and CSV export</li>
              <li>Email verification required</li>
            </ul>
            <Button variant="ghost" size="md" href="/signup" arrow>
              Start free
            </Button>
          </article>

          <article
            className="pricing-card is-recommended"
            aria-labelledby="plan-byok"
          >
            <span className="pricing-badge" aria-label="Recommended">
              Recommended
            </span>
            <p className="pricing-tier" id="plan-byok">
              BYOK Starter
            </p>
            <p className="pricing-price">
              $29
              <span className="sz-sr-only"> per month</span>
            </p>
            <p className="pricing-cadence">per month · or $290 / year</p>
            <ul className="pricing-features">
              <li>2 audits / month, any depth, any SKU</li>
              <li>GitHub App connection</li>
              <li>MD, CSV, JSON export</li>
              <li>Your Anthropic key — you pay tokens</li>
            </ul>
            <Button
              variant="primary"
              size="md"
              href="/signup?plan=byok-starter"
              arrow
            >
              Start the Starter
            </Button>
          </article>

          <article className="pricing-card" aria-labelledby="plan-managed">
            <p className="pricing-tier" id="plan-managed">
              Managed Pro
            </p>
            <p className="pricing-price">
              $249
              <span className="sz-sr-only"> per month</span>
            </p>
            <p className="pricing-cadence">per month · or $2,490 / year</p>
            <ul className="pricing-features">
              <li>Unlimited Full audits, tokens included</li>
              <li>Auto-PR fix delivery at V1.5 (no upcharge)</li>
              <li>Priority queue</li>
              <li>For teams shipping every two weeks</li>
            </ul>
            <Button
              variant="ghost"
              size="md"
              href="/signup?plan=managed-pro"
              arrow
            >
              Talk to us
            </Button>
          </article>
        </div>

        <p className="pricing-disclosure">
          <a href="/pricing">
            See all 7 plans, including CLI mode and the Auto-PR upcharge →
          </a>
        </p>
      </div>
    </section>
  );
}

// ─── Final CTA ────────────────────────────────────────────────────────
function FinalCTA(): React.ReactElement {
  return (
    <section className="final-cta" aria-labelledby="final-cta-h2">
      <div className="wrap">
        <h2 id="final-cta-h2">
          Find out what your AI builder{" "}
          <em className="serif-it">missed</em>.
        </h2>
        <p>
          Run a free Surface audit on a URL you own. Most first audits do not
          pass our gate — that&rsquo;s the design.
        </p>
        <Button variant="primary" size="lg" href="/signup" arrow>
          Run a free Surface audit
        </Button>
        <p className="microcopy">
          No card on file. Email verification required. Most audits take 6 to
          12 minutes.
        </p>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────
function Footer(): React.ReactElement {
  return (
    <footer className="sz-footer" role="contentinfo">
      <div className="wrap">
        <div className="sz-footer__grid">
          <div className="sz-footer__brand">
            <Link
              href="/"
              className="sz-nav__brand"
              aria-label="Studio Zero — home"
            >
              <span className="sz-nav__mark" aria-hidden="true" />
              <span className="sz-nav__word">STUDIO ZERO</span>
            </Link>
            <p className="sz-footer__tagline">
              The independent audit for AI-built software.
            </p>
          </div>

          <div className="sz-footer__col">
            <h4>Product</h4>
            <ul>
              <li>
                <a href="/how-it-works">How it works</a>
              </li>
              <li>
                <a href="/pricing">Pricing</a>
              </li>
              <li>
                <a href="/changelog">Changelog</a>
              </li>
              <li>
                <a href="/status">Status</a>
              </li>
            </ul>
          </div>

          <div className="sz-footer__col">
            <h4>Trust</h4>
            <ul>
              <li>
                <a href="/accessibility">
                  Accessibility · WCAG 2.2 AA
                </a>
              </li>
              <li>
                <a href="/ai-system-card">AI System Card</a>
              </li>
              <li>
                <a href="/security">Security</a>
              </li>
              <li>
                <a href="/methodology">Methodology</a>
              </li>
            </ul>
          </div>

          <div className="sz-footer__col">
            <h4>Legal</h4>
            <ul>
              <li>
                <a href="/privacy">Privacy</a>
              </li>
              <li>
                <a href="/terms">Terms</a>
              </li>
              <li>
                <a href="/aup">Acceptable use</a>
              </li>
              <li>
                <a href="/subprocessors">Subprocessors</a>
              </li>
              <li>
                <a href="/dpa">DPA</a>
              </li>
              <li>
                <a href="/dmca">DMCA</a>
              </li>
            </ul>
          </div>

          <div className="sz-footer__col">
            <h4>Studio</h4>
            <ul>
              <li>
                <a href="/blog">Blog</a>
              </li>
              <li>
                <a href="mailto:hello@studiozero.dev">Contact</a>
              </li>
            </ul>
          </div>
        </div>

        <div className="sz-footer__base">
          <span>© 2026 Studio Zero</span>
          <span>v0.5 · Audit Layer Live</span>
        </div>
      </div>
    </footer>
  );
}

// ─── Page composition ────────────────────────────────────────────────
export default function LandingPage(): React.ReactElement {
  return (
    <>
      <div className="grain" aria-hidden="true" />
      <div className="glow" aria-hidden="true" />

      <Nav
        links={[
          { href: "/how-it-works", label: "How it works" },
          { href: "/#pricing", label: "Pricing" },
          { href: "/blog", label: "Blog" },
          { href: "/accessibility", label: "Accessibility" },
        ]}
        auth={{
          signIn: { href: "/login", label: "Sign in" },
          signUp: { href: "/signup", label: "Run a free audit" },
        }}
      />

      <main id="main">
        <Hero />
        <Problem />
        <Solution />
        <HowItWorks />
        <PricingStrip />
        <FinalCTA />
      </main>

      <Footer />
    </>
  );
}
