/* ─────────────────────────────────────────────────────────────────────────────
 * Studio Zero — Landing screen prototype
 * Route: /
 * Brand: Direction A v0.1.1 ("The Auditor's Notebook")
 * Composes Canvas's foundational components. Placeholders where a Canvas
 * component isn't on the 14-component manifest — every Placeholder carries an
 * inline interface contract for Canvas to pick up.
 *
 * Copy locked from:
 *   - brand/samples/01-landing-h1.md (H1, subhead, microcopy)
 *   - Compass AH-4 (SKU plain-English subtitles)
 *   - HB-1 (1 primary + 1 secondary CTA; Hick's PASS)
 *   - Canon finding v0.1.1 (no green pulse-dot; replaced with ink-0 or removed)
 *
 * Pixel — Design layer, Phase 4
 * ─────────────────────────────────────────────────────────────────────────── */

import {
  Nav, // Canvas — primary navigation primitive (variants: marketing | app | footer)
  Card, // Canvas — surface primitive (variants: default | mode | layer | stat | sku | pricing | rubric-row)
  Button, // Canvas — interactive primitive (variants: primary | ghost | destructive; sizes: sm | md | lg)
  Chip, // Canvas — status/eyebrow primitive (variants: mono-meta | severity | free-tier)
} from '../../components';

// ─────────────────────────────────────────────────────────────────────────────
// Placeholder primitive — every <Placeholder> documents an interface contract
// for a component or asset Canvas hasn't shipped yet. Renders as a visible,
// hairline-bounded slot so design review can spot gaps.
// ─────────────────────────────────────────────────────────────────────────────
function Placeholder({ kind, name, note, ariaHidden, children, ...rest }) {
  return (
    <div
      data-placeholder={name}
      data-kind={kind}
      aria-hidden={ariaHidden ?? false}
      style={{
        border: '1px dashed var(--line-2)',
        borderRadius: 'var(--r)',
        padding: 'var(--sp-12)',
        color: 'var(--ink-2)',
        font: 'var(--fs-mono-meta)/1.4 var(--font-mono)',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
      }}
      {...rest}
    >
      <span>[ placeholder: {name} · {kind} ]</span>
      {note ? <div style={{ marginTop: 4, textTransform: 'none', letterSpacing: 0 }}>{note}</div> : null}
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Skip link (SC 2.4.1). Lives outside <main>; first focusable element.
// ─────────────────────────────────────────────────────────────────────────────
function SkipLink() {
  return (
    <a className="sz-skip-link" href="#main">
      Skip to content
    </a>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Cookie consent banner — non-modal landmark at bottom of <body> per HB-8.
// 3 peer-weighted choices: Accept all / Reject all / Customize.
// ─────────────────────────────────────────────────────────────────────────────
function CookieBanner() {
  return (
    <aside aria-label="Cookie preferences" className="sz-cookie-banner">
      <p className="cookie-body">
        Studio Zero uses necessary cookies. Analytics and marketing cookies are
        off by default. <a href="/privacy">Read the privacy policy.</a>
      </p>
      <div className="cookie-actions">
        <Button variant="ghost" size="sm">Reject all</Button>
        <Button variant="ghost" size="sm">Customize</Button>
        <Button variant="primary" size="sm">Accept all</Button>
      </div>
    </aside>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Hero — locked Herald sample 01 copy. Single primary CTA + 1 secondary (HB-1).
// ─────────────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-h1">
      <div className="hero-grid" aria-hidden="true" />
      <div className="wrap">
        {/* Eyebrow — Canon v0.1.1 fix: NO green pulse dot. Mono-meta text only. */}
        <div className="hero-status reveal" data-d="0">
          <span className="eyebrow">Studio status · 56 agents online</span>
          <span className="sep" aria-hidden="true">·</span>
          <span className="eyebrow eyebrow-dim">v0.5 — Audit Layer Live</span>
        </div>

        {/* H1 locked from brand/samples/01-landing-h1.md
            Italicized phrase: "line by line" (Instrument Serif italic per usage-rules.md). */}
        <h1 id="hero-h1" className="reveal" data-d="1" tabIndex={-1}>
          Your AI builder shipped code that fails accessibility.
          <br />
          We'll prove it — <em className="serif-it">line by line</em>.
        </h1>

        {/* Subhead locked from brand/samples/01-landing-h1.md */}
        <p className="hero-sub reveal" data-d="2">
          Studio Zero is the independent audit for AI-built software. Connect
          your repo, pick a depth, get a graded checklist — every finding with
          a file path, a line range, and a fix.
        </p>

        {/* CTAs: 1 primary + 1 secondary per HB-1 (Hick's PASS at 2 choices). */}
        <div className="hero-cta-row reveal" data-d="3">
          <Button variant="primary" size="lg" href="/signup" arrow>
            Run a free Surface audit
          </Button>
          <Button variant="ghost" size="lg" href="/how-it-works">
            See how it works
          </Button>
        </div>

        {/* Microcopy locked from Herald sample 01 §"Microcopy near the primary CTA". */}
        <p className="hero-microcopy reveal" data-d="4">
          Free Surface audit on a URL you own. No credit card.
          <br />
          Email verification required.
        </p>

        {/* Hero stats — count-up animation on intersect; static under reduced motion. */}
        <div className="hero-stats reveal" data-d="5">
          <Card variant="stat" number={56} label="Specialist agents" countUp />
          <Card variant="stat" number={14} label="Operational layers" countUp />
          <Card variant="stat" number={7} label="Independent auditors" countUp />
          <Card variant="stat" number={5} label="Severity tiers" countUp />
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Modes section (preserves template baseline; passes content to Canvas Card).
// ─────────────────────────────────────────────────────────────────────────────
function Modes() {
  return (
    <section className="section" id="modes" aria-labelledby="modes-h2">
      <div className="wrap">
        <div className="section-head reveal">
          <div>
            <p className="eyebrow">01 · Two modes</p>
            <h2 id="modes-h2">
              Build from a vision.
              <br />
              <em className="serif-it">Or audit</em> what already ships.
            </h2>
          </div>
          <p className="section-lede">
            Studio Zero operates in two modes. Either way, the same audit gate
            applies — work only leaves the studio when the rubric clears.
          </p>
        </div>

        <div className="modes">
          <Card
            variant="mode"
            interactive
            eyebrow="Mode A"
            title={<><em className="serif-it">Build</em> end-to-end</>}
            body="Hand BigBrain a vision in any form — vibe, sketch, voice memo, PRD. The studio assembles the right team for the product type and ships."
            items={[
              { label: 'Brief intake & translation', meta: 'BigBrain' },
              { label: 'Team roster selection', meta: 'teams/*' },
              { label: 'Parallel layer execution', meta: '14 layers' },
              { label: 'Pre-ship audit gate', meta: 'Jury verdict' },
            ]}
            cta={{ href: '/build', label: 'Open a brief', arrow: true }}
            footMeta="Avg. 3 phases"
          >
            <Placeholder
              kind="svg"
              name="ModeVisualBuild"
              ariaHidden
              note="Concentric rings + crosshair; static under prefers-reduced-motion."
            />
          </Card>

          <Card
            variant="mode"
            interactive
            eyebrow="Mode B"
            title={<><em className="serif-it">Audit</em> any surface</>}
            body="Drop in an existing product, repo, or live URL. Choose a focused review — or the full panel — and receive a verdict against the fixed severity rubric."
            items={[
              { label: 'UX heuristics', meta: 'Optic' },
              { label: 'WCAG 2.2 AA', meta: 'Halo' },
              { label: 'Performance & web vitals', meta: 'Meter' },
              { label: 'Security · OWASP, PCI', meta: 'Shield · Cipher' },
              { label: 'Content & audience fit', meta: 'Proof · Compass' },
              { label: 'Visual consistency', meta: 'Canon' },
            ]}
            cta={{ href: '/signup', label: 'Run a free Surface audit', arrow: true }}
            footMeta="Read-only · No edits"
          >
            <Placeholder
              kind="svg"
              name="ModeVisualAudit"
              ariaHidden
              note="Nested rectangles + diagonal slashes."
            />
          </Card>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SKU explainer — Compass AH-4 plain-English subtitles.
// Critical finding: customers don't grok "Surface / Code / Full" without
// the plain-English translation. This section answers that before pricing.
// ─────────────────────────────────────────────────────────────────────────────
function SKUExplainer() {
  return (
    <section className="section" id="sku-explainer" aria-labelledby="sku-h2">
      <div className="wrap">
        <div className="section-head reveal">
          <div>
            <p className="eyebrow">04 · What you get</p>
            <h2 id="sku-h2">
              Three audits. <em className="serif-it">One rubric</em>.
            </h2>
          </div>
          <p className="section-lede">
            Each audit scopes different evidence. Same severity rubric, same
            verdict primitives — the scope of the receipts is what changes.
          </p>
        </div>

        <div className="sku-grid reveal" data-d="1">
          <Card
            variant="sku"
            name="Surface"
            plainEnglish="audits the live site"
            bullets={[
              'Public-facing pages only.',
              'UX, accessibility, copy, brand.',
              'Free on a URL you own.',
            ]}
            priceFrom="Free"
            cta={{ href: '/signup', label: 'Run a free Surface audit', arrow: true }}
          />
          <Card
            variant="sku"
            name="Code"
            plainEnglish="audits the source code"
            bullets={[
              'Reads your repo. Finds what Surface can't see.',
              'Adds: dead code, semantic HTML, security patterns, design-system drift.',
              '3 to 5× as many findings as Surface.',
            ]}
            priceFrom="From $29"
            cta={{ href: '/pricing#code', label: 'See Code plans', arrow: true }}
          />
          <Card
            variant="sku"
            name="Full"
            plainEnglish="audits both"
            bullets={[
              'Live site + source code, end-to-end.',
              'All seven reviewers.',
              'For pre-launch and pre-release.',
            ]}
            priceFrom="From $249"
            cta={{ href: '/pricing#full', label: 'See Full plans', arrow: true }}
          />
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Pricing strip — HB-5 recommendation: 3 above-fold cards (Free · $29 · $249)
// with "See all plans →" disclosure to full 7-tier /pricing table.
// ─────────────────────────────────────────────────────────────────────────────
function PricingStrip() {
  return (
    <section className="section" id="pricing-strip" aria-labelledby="pricing-h2">
      <div className="wrap">
        <div className="section-head reveal">
          <div>
            <p className="eyebrow">05 · Pricing</p>
            <h2 id="pricing-h2">
              Pick a plan. <em className="serif-it">Or stay on free.</em>
            </h2>
          </div>
          <p className="section-lede">
            Free tier covers unlimited Surface re-audits on one project. Paid
            tiers unlock Code and Full audits with deeper evidence.
          </p>
        </div>

        <div className="pricing-grid reveal" data-d="1">
          <Card
            variant="pricing"
            tier="Free"
            price="$0"
            cadence="forever, one project"
            features={[
              'Unlimited Surface re-audits on one project',
              'Email & in-app notifications',
              'No card required',
            ]}
            cta={{ href: '/signup', label: 'Start free', arrow: true }}
          />
          <Card
            variant="pricing"
            tier="BYOK Starter"
            price="$29"
            cadence="per month"
            features={[
              'All audit depths (Surface · Code · Full)',
              'Bring your own Anthropic API key',
              '2 audits any depth per month',
            ]}
            recommendedBadge
            cta={{ href: '/signup?plan=byok-starter', label: 'Start Starter', arrow: true }}
          />
          <Card
            variant="pricing"
            tier="Managed Pro"
            price="$249"
            cadence="per month"
            features={[
              'We handle tokens & infra',
              'Unlimited Comprehensive audits',
              'Priority queue + SLA',
            ]}
            cta={{ href: '/signup?plan=managed-pro', label: 'Start Pro', arrow: true }}
          />
        </div>

        <p className="pricing-disclosure reveal" data-d="2">
          <a href="/pricing" className="link-arrow">
            See all 7 plans →
          </a>
        </p>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Gate section (preserved from template) — rubric strip composed via Card.
// ─────────────────────────────────────────────────────────────────────────────
function Gate() {
  const rubric = [
    { sev: 'Blocker',  def: 'Ships a defect that breaks core function or violates a hard requirement.', action: 'Halt. Re-audit required.' },
    { sev: 'Critical', def: 'Significant failure against the rubric; clear risk to users or the business.', action: 'Block ship until resolved.' },
    { sev: 'Major',    def: 'Misalignment with a heuristic or AA criterion; degrades quality.', action: 'Fix before the next release.' },
    { sev: 'Minor',    def: 'Small mismatch; not user-blocking but inconsistent with the system.', action: 'Schedule on the next cycle.' },
    { sev: 'Polish',   def: 'Cosmetic; would improve fit and finish without changing function.', action: 'Optional.' },
  ];

  return (
    <section className="section" id="audit" aria-labelledby="gate-h2">
      <div className="wrap">
        <div className="section-head reveal">
          <div>
            <p className="eyebrow">03 · The audit gate</p>
            <h2 id="gate-h2">
              An independent panel,
              <br />
              against a <em className="serif-it">fixed rubric</em>.
            </h2>
          </div>
          <p className="section-lede">
            Auditors don't edit code. They flag, recommend, and verify fixes.
            That separation is what makes the verdict trustworthy.
          </p>
        </div>

        <div className="gate-wrap">
          {/* Decorative diagram — Canvas-owned visual utility. Reduced-motion: static. */}
          <Placeholder
            kind="svg"
            name="GateStageDiagram"
            ariaHidden
            note="7 auditor orbits around a Jury core. Ring pulse 4-5s; stops under prefers-reduced-motion."
          />

          <div className="gate-rubric reveal" data-d="2">
            {rubric.map((r) => (
              <Card
                key={r.sev}
                variant="rubric-row"
                severity={r.sev.toLowerCase()}
                definition={r.def}
                action={r.action}
                label={r.sev}
              />
            ))}
            <p className="rubric-foot">
              Verdicts · <span className="ink-1">Pass</span>
              {' / '}
              <span className="ink-1">Pass with fixes</span>
              {' / '}
              <span className="verdict-fail-text">Fail</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Footer — legal + AI System Card + accessibility statement.
// ─────────────────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <Nav
      variant="footer"
      aria-label="Footer"
      brandLockup={
        <span className="brand">
          <span className="brand-mark" aria-hidden="true" />
          {' Studio · Zero'}
        </span>
      }
      tagline="The independent audit for AI-built software."
      columns={[
        {
          heading: 'Product',
          links: [
            { href: '/how-it-works', label: 'How it works' },
            { href: '/audit', label: 'The audit' },
            { href: '/modes', label: 'Modes' },
            { href: '/pricing', label: 'Pricing' },
          ],
        },
        {
          heading: 'Trust',
          links: [
            { href: '/security', label: 'Security' },
            { href: '/accessibility', label: 'Accessibility · WCAG 2.2 AA' },
            { href: '/ai-system-card', label: 'AI System Card' },
            { href: '/status', label: 'Status' },
          ],
        },
        {
          heading: 'Legal',
          links: [
            { href: '/privacy', label: 'Privacy' },
            { href: '/terms', label: 'Terms' },
            { href: '/aup', label: 'Acceptable use' },
            { href: '/dpa', label: 'DPA' },
            { href: '/subprocessors', label: 'Subprocessors' },
            { href: '/dmca', label: 'DMCA' },
          ],
        },
        {
          heading: 'Studio',
          links: [
            { href: '/blog', label: 'Blog' },
            { href: '/changelog', label: 'Changelog' },
            { href: 'mailto:hello@studiozero.dev', label: 'Contact' },
          ],
        },
      ]}
      base={[
        { text: '© Studio Zero · 2026' },
        { text: 'v0.5 · Audit Layer Live' },
      ]}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page composition.
// ─────────────────────────────────────────────────────────────────────────────
export default function LandingScreen() {
  return (
    <React.Fragment>
      {/* Decorative overlays. pointer-events: none; disabled under reduced motion. */}
      <div className="grain" aria-hidden="true" />
      <div className="glow" aria-hidden="true" />

      <SkipLink />

      <header>
        <Nav
          variant="marketing"
          sticky
          brandLockup={
            <span className="brand">
              <span className="brand-mark" aria-hidden="true" />
              {' Studio · Zero'}
            </span>
          }
          links={[
            { href: '/how-it-works', label: 'How it works' },
            { href: '/audit', label: 'Audit' },
            { href: '/modes', label: 'Modes' },
            { href: '/pricing', label: 'Pricing' },
            { href: '/blog', label: 'Blog' },
          ]}
          auth={{
            signIn: { href: '/login', label: 'Sign in' },
            signUp: { href: '/signup', label: 'Run a free audit', arrow: true },
          }}
        />
      </header>

      <main id="main">
        <Hero />
        <Modes />
        {/* Team / Roster section omitted from prototype — preserved from template; lower priority for Phase 4 hero composition. */}
        <Gate />
        <SKUExplainer />
        <PricingStrip />
      </main>

      <Footer />
      <CookieBanner />
    </React.Fragment>
  );
}
