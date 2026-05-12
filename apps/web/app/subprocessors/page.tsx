import * as React from "react";

import { StubPage } from "../../components/StubPage";

import type { Metadata } from "next";

/**
 * /subprocessors — Subprocessor list stub.
 *
 * Locked decision #17: GDPR Article 28 DPA + subprocessor list ships
 * before the first Managed-tier customer at M2. M0 stub names the
 * known shape so the legal surface is honest.
 */

export const metadata: Metadata = {
  title: "Subprocessors",
  description:
    "Studio Zero's subprocessor list. Ships at M2 with the DPA template.",
};

export default function SubprocessorsPage(): React.ReactElement {
  return (
    <StubPage
      eyebrow="Legal · Subprocessors"
      title="The vendors that touch your data."
      description="A full subprocessor list with purpose, region, and data category ships at M2 alongside the Article 28 DPA template. Below is the known shape."
      shipsAt="M2"
      owner="Comply"
    >
      <p>The known shape at M0:</p>
      <ul>
        <li>
          <strong>Vercel</strong> — application hosting and CDN (US iad1
          region).
        </li>
        <li>
          <strong>Supabase</strong> — Postgres database, authentication, edge
          functions (US East 1).
        </li>
        <li>
          <strong>Anthropic</strong> — large language model inference for the
          audit runner.
        </li>
        <li>
          <strong>Stripe</strong> — billing and payment processing (M2).
        </li>
        <li>
          <strong>Resend</strong> — transactional email (M2).
        </li>
        <li>
          <strong>GitHub</strong> — source repository access via the Studio
          Zero GitHub App (M1).
        </li>
      </ul>
      <p>
        Studio Zero commits to a 30-day change-notification window for any
        subprocessor addition per decision #17.
      </p>
    </StubPage>
  );
}
