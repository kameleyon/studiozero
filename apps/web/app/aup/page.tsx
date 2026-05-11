import type { Metadata } from "next";
import * as React from "react";

import { StubPage } from "../../components/StubPage";

/**
 * /aup — Acceptable Use Policy stub.
 *
 * PRD §14.7. Comply authors at M4. Ships before first paid signup at
 * M2; the M0 stub names the load-bearing prohibitions so the policy
 * surface is honest from the first page view.
 */

export const metadata: Metadata = {
  title: "Acceptable use policy",
  description:
    "Studio Zero acceptable use policy. The full text ships at M4. Read the load-bearing prohibitions today.",
};

export default function AUPPage(): React.ReactElement {
  return (
    <StubPage
      eyebrow="Legal · Acceptable use"
      title="What you can — and can't — point Studio Zero at."
      description="Studio Zero audits software you own or have explicit permission to audit. The full policy lands at M4 with the launch checklist; the load-bearing rules are below."
      shipsAt="M4"
      owner="Comply"
    >
      <p>
        Today&rsquo;s rules — already enforced where the product exists:
      </p>
      <ul>
        <li>
          You only audit URLs and repositories you own or have written
          authorization to audit.
        </li>
        <li>
          No reverse engineering, scraping, or load-testing of third-party
          services through the Studio Zero runner.
        </li>
        <li>
          No prompt-injection corpora or other adversarial inputs targeting
          Studio Zero itself.
        </li>
        <li>
          No content that violates Anthropic&rsquo;s usage policy when running
          under your BYOK key.
        </li>
      </ul>
      <p>
        Report abuse:{" "}
        <a href="mailto:abuse@studiozero.dev">abuse@studiozero.dev</a>.
      </p>
    </StubPage>
  );
}
