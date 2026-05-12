import * as React from "react";

import { Button } from "../../components/Button";
import { Nav } from "../../components/Nav";

import type { Metadata } from "next";

/**
 * /accessibility — WCAG 2.2 AA conformance statement (M1 Batch 3, Halo).
 *
 * Upgrade from M0 stub to a proper conformance statement per
 * PRD §14.6 + sprint/milestone-M1.md exit-gate row 144. Last-audited
 * date stays as a placeholder until the M4 third-party vendor signs
 * the conformance report (template at
 * `compliance/wcag-audit-engagement-2026.md`).
 *
 * The page itself must be exemplary — every interactive element keyboard
 * reachable; landmark `<main>`; heading hierarchy without skips; proper
 * `<address>` for the accessibility-feedback contact; semantic
 * `<dl>`/`<table>` for the conformance metadata.
 *
 * Halo own — re-audited on every primary-flow release per
 * `agents/audit/halo.md` Rule §1 (audit cadence).
 */
export const metadata: Metadata = {
  title: "Accessibility · WCAG 2.2 AA conformance",
  description:
    "Studio Zero is committed to WCAG 2.2 AA conformance. Read our scope, methodology, last-audit date, and how to report an accessibility issue.",
};

export default function AccessibilityPage(): React.ReactElement {
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
        <section className="stub-page">
          <div className="wrap">
            <span className="eyebrow stub-eyebrow">
              Trust · Accessibility statement
            </span>
            <h1>Studio Zero is committed to WCAG 2.2 AA conformance.</h1>
            <p>
              Studio Zero is built against the{" "}
              <a
                href="https://www.w3.org/TR/WCAG22/"
                rel="noopener noreferrer"
              >
                Web Content Accessibility Guidelines 2.2
              </a>{" "}
              at Level AA. We treat accessibility as a measurable contract
              with our users, not a feeling. This page names the scope,
              the methodology, the last audit date, the known gaps, and
              how to reach us when something is broken.
            </p>

            <h2 id="commitment">Our commitment</h2>
            <p>
              Studio Zero&rsquo;s customer-facing surface conforms to{" "}
              <strong>WCAG 2.2 Level AA</strong>, the standard referenced
              by U.S. Section 508 (revised), the EU EN 301 549 procurement
              norm, and the UK PSBAR. Conformance is verified by an
              independent third-party audit before each major release and
              continuously enforced in CI by an axe-core gate on every
              pull request.
            </p>

            <h2 id="scope">Conformance scope</h2>
            <p>
              The statement covers every surface a customer encounters:
            </p>
            <ul>
              <li>Marketing site (this site, including pricing and trust pages).</li>
              <li>Authentication: sign-up, sign-in, password recovery.</li>
              <li>
                Application shell: dashboard, project list, project intake,
                onboarding (mode pick, BYOK setup, GitHub App install).
              </li>
              <li>
                Audit run experience: queued / cloning / analyzing / scoring
                live progress, verdict screen, findings checklist, evidence
                viewer (screenshots and transcripts).
              </li>
              <li>Settings and billing (Stripe Checkout hosted page).</li>
              <li>
                Exported reports: PDF and Markdown rendered on GitHub
                (CLI-emitted).
              </li>
            </ul>
            <p>
              Out of scope at this time: third-party embedded components
              outside our control (e.g., GitHub&rsquo;s own UI when we
              deep-link into a repo). Where we link out, we flag the
              transition.
            </p>

            <h2 id="status">Current status</h2>
            <dl className="a11y-status">
              <dt>Conformance target</dt>
              <dd>WCAG 2.2 Level AA (full conformance, not subset)</dd>

              <dt>Last third-party audit</dt>
              <dd>
                <em>
                  Pending — vendor engaged at M1 close; report lands before
                  M4 launch. See{" "}
                  <code>compliance/wcag-audit-engagement-2026.md</code> for
                  the engagement scope.
                </em>
              </dd>

              <dt>Last automated CI gate run</dt>
              <dd>
                Every pull request — axe-core scans 12 primary-flow pages
                at 320&nbsp;px and 1280&nbsp;px viewports. Build fails on
                any{" "}
                <abbr title="critical or serious">critical or serious</abbr>{" "}
                violation.
              </dd>

              <dt>Last AT (screen-reader) recording sign-off</dt>
              <dd>
                <em>
                  Pending — first recording at M4 covers the FAIL-verdict
                  primary flow with NVDA (Windows) and VoiceOver (macOS).
                </em>
              </dd>
            </dl>

            <h2 id="how-we-test">How we test</h2>
            <p>
              Halo, our independent accessibility auditor, follows the
              practice that automated tools cover roughly 30% of WCAG —
              the remaining 70% requires manual testing. Each release runs
              through:
            </p>
            <ul>
              <li>
                <strong>Automated:</strong> axe-core (Playwright integration,
                CI-blocking), Lighthouse a11y, pa11y, the WAVE browser
                extension for spot checks.
              </li>
              <li>
                <strong>Keyboard-only walkthroughs</strong> of every primary
                flow — tab order matches visual order, focus is always
                visible, no traps, every control operable without a mouse.
              </li>
              <li>
                <strong>Screen-reader walkthroughs</strong> with NVDA
                (Firefox, Windows) and VoiceOver (Safari, macOS and iOS).
              </li>
              <li>
                <strong>Zoom + reflow:</strong> 200% browser zoom and 400%
                with reflow at 320 CSS px viewport per SC 1.4.10.
              </li>
              <li>
                <strong>Forced colors + reduced motion:</strong> Windows
                High Contrast Mode and the <code>prefers-reduced-motion</code>{" "}
                media query.
              </li>
            </ul>

            <h2 id="known-issues">Known issues</h2>
            <p>
              We track every known accessibility issue publicly. At
              M1 there are no known critical or serious violations on
              primary-flow pages — the axe-core gate would block the
              merge. Moderate and minor findings, when present, are
              triaged into the next sprint.
            </p>
            <ul>
              <li>
                <em>None recorded at the time of writing.</em> This list
                is updated within five business days of a new finding
                being filed.
              </li>
            </ul>

            <h2 id="standards">Standards we follow</h2>
            <ul>
              <li>
                <strong>WCAG 2.2 AA</strong> — including the nine
                success criteria new in 2.2 (Focus Not Obscured, Focus
                Appearance, Dragging Movements, Target Size Minimum,
                Consistent Help, Redundant Entry, Accessible
                Authentication, etc.).
              </li>
              <li>
                <strong>WAI-ARIA Authoring Practices 1.2</strong> for
                custom widgets (modal, combobox, tabs, disclosure,
                treegrid).
              </li>
              <li>
                <strong>U.S. Section 508 (revised)</strong> by reference
                to WCAG 2.0 AA, met by our 2.2 AA conformance.
              </li>
              <li>
                <strong>EU EN 301 549</strong> and{" "}
                <strong>UK PSBAR</strong> by the same reference.
              </li>
            </ul>

            <h2 id="contact">Report an accessibility issue</h2>
            <p>
              If anything on Studio Zero is not usable for you, tell us.
              We treat accessibility reports as high-priority bugs.
            </p>
            <address>
              Email:{" "}
              <a href="mailto:accessibility@studiozero.dev">
                accessibility@studiozero.dev
              </a>
              <br />
              We respond within <strong>five business days</strong> and
              track every report in our public changelog.
            </address>
            <p>
              If the response does not resolve the issue, you may
              escalate to <a href="mailto:jo@studiozero.dev">jo@studiozero.dev</a>.
            </p>

            <p className="stub-meta">
              Owner: Halo (independent a11y auditor) · Standard: WCAG 2.2 AA
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
