import * as React from "react";

import { StubPage } from "../../components/StubPage";

import type { Metadata } from "next";

/**
 * /terms — Terms of Service stub. Comply authors at M4.
 *
 * BUILD_FLOW Phase 10 launch gate. Includes BYOK provider pass-through
 * clause per locked decision #19.
 */

export const metadata: Metadata = {
  title: "Terms of service",
  description:
    "Studio Zero terms of service. Full text lands at M4 with the launch checklist.",
};

export default function TermsPage(): React.ReactElement {
  return (
    <StubPage
      eyebrow="Legal · Terms"
      title="The terms we'll ship under."
      description="The full Terms of Service land at M4 with the launch checklist. The shape is locked: a customer agreement, a BYOK provider pass-through clause (decision #19), and a refund matrix per region (FTC Click-to-Cancel, EU 14-day cooling-off, UK CCR 2013, CA SB 313)."
      shipsAt="M4"
      owner="Comply"
    >
      <p>
        At M0 there is no service to subscribe to yet. The Terms file becomes
        live before the first paid signup at M2. Questions:{" "}
        <a href="mailto:legal@studiozero.dev">legal@studiozero.dev</a>.
      </p>
    </StubPage>
  );
}
