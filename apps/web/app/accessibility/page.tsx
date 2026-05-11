import type { Metadata } from "next";
import * as React from "react";

import { StubPage } from "../../components/StubPage";

/**
 * /accessibility — WCAG 2.2 AA conformance statement (stub at M0).
 *
 * PRD §14.6 HC1-HC10 + BUILD_FLOW Phase 10 launch gate. Halo + Comply
 * own the full statement; ships at M4 with the third-party conformance
 * audit attestation per Risk R15.
 *
 * Why a real page at M0: the landing page links here and a 404 on
 * /accessibility would itself be an a11y compliance issue. The stub
 * names exactly what the site already delivers (token contrasts,
 * keyboard navigation, semantic landmarks) and what the audit will
 * confirm at M4.
 */

export const metadata: Metadata = {
  title: "Accessibility · WCAG 2.2 AA conformance",
  description:
    "Studio Zero is built to WCAG 2.2 AA. Third-party conformance audit lands at M4. Read what we ship today.",
};

export default function AccessibilityPage(): React.ReactElement {
  return (
    <StubPage
      eyebrow="Trust · Accessibility"
      title="WCAG 2.2 AA is our floor — not our ceiling."
      description="Studio Zero is engineered against WCAG 2.2 AA from the design system up. Every component ships with documented success-criterion coverage and an axe-core gate in CI."
      shipsAt="M4 (third-party conformance audit)"
      owner="Halo + Comply"
    >
      <p>
        What we ship today: token-driven color contrast clears AA on every
        ink-on-background pair; every interactive control reserves a 24×24 CSS
        px hit area (SC 2.5.8); focus rings render at 2 px solid with 2 px
        offset on every focusable element (SC 2.4.13); the landing page
        reflows at 320 CSS px without horizontal scroll (SC 1.4.10);
        keyboard-only navigation reaches the primary CTA in eight Tab presses
        from a cold load.
      </p>
      <p>
        What lands at M4: a third-party conformance audit by a vendor on
        Halo&rsquo;s shortlist (engaged at M0 close per Risk R15 — 6 to 10
        week lead time). On pass, this page becomes the full WCAG 2.2 AA
        conformance statement with the auditor&rsquo;s name, date, methodology,
        and exception list.
      </p>
      <p>
        Report an accessibility issue:{" "}
        <a href="mailto:accessibility@studiozero.dev">
          accessibility@studiozero.dev
        </a>
        . We respond within five business days and track every report in our
        public changelog.
      </p>
    </StubPage>
  );
}
