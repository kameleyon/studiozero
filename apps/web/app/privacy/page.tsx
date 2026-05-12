import * as React from "react";

import { StubPage } from "../../components/StubPage";

import type { Metadata } from "next";

/**
 * /privacy — Privacy policy stub.
 *
 * Comply authors the full text at M4 per BUILD_FLOW Phase 10 launch
 * gate + PRD §14.4. M0 stub names data we collect today (zero — the
 * site is static) and the regional matrix that ships at M4 (GDPR + UK
 * GDPR + CCPA + PIPEDA).
 */

export const metadata: Metadata = {
  title: "Privacy policy",
  description:
    "Studio Zero's privacy policy. The full text lands at M4 with the launch checklist. Read what we collect today.",
};

export default function PrivacyPage(): React.ReactElement {
  return (
    <StubPage
      eyebrow="Legal · Privacy"
      title="What we collect, what we don't, and what you can do about it."
      description="The full privacy policy lands at M4 with the regional matrix (GDPR, UK GDPR, CCPA, PIPEDA). Until then, this page is an honest summary of what's running today."
      shipsAt="M4 (full text + regional matrix)"
      owner="Comply"
    >
      <p>
        Today: the marketing site is static. We do not run analytics until
        cookie consent ships at M2. We do not set any cookies on this page.
        Server logs retain the request path and IP for 7 days for security
        purposes only.
      </p>
      <p>
        When you sign up at M1: we will collect your email, your hashed
        password, the projects you connect, and the audit findings the runner
        produces against your code. Audit findings are stored encrypted at
        rest with per-tenant key isolation. Customer code is retained for 7
        days by default and cryptoshredded on tenant offboard.
      </p>
      <p>
        Questions before the full text lands:{" "}
        <a href="mailto:privacy@studiozero.dev">privacy@studiozero.dev</a>.
      </p>
    </StubPage>
  );
}
