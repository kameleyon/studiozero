import * as React from "react";

import { LegalPage } from "../../components/LegalPage";

import type { Metadata } from "next";

/**
 * /privacy — Privacy Policy (M1 first draft).
 *
 * Phase 9 M1 Batch 3 (Comply). Source-of-truth Markdown lives at
 * `legal/privacy-policy.md`. Covers GDPR (30-day SLA on Art. 15-22),
 * CCPA (45-day SLA), retention table per PRD §14.4, the consent_kind
 * enum mirrored from `marketing/analytics-spec.md`, the breach
 * notification posture (72h to authority, undue-delay to affected
 * users), and the EU/UK Art. 27 representative placeholder.
 */

export const metadata: Metadata = {
  title: "Privacy policy",
  description:
    "Studio Zero's privacy policy. What we collect, why, how long we keep it, and how to exercise your GDPR / CCPA rights.",
};

export const dynamic = "force-static";

export default function PrivacyPage(): React.ReactElement {
  return (
    <LegalPage
      eyebrow="Legal · Privacy"
      title="Privacy policy"
      source="legal/privacy-policy.md"
      effectiveDate="2026-05-12"
      version="1.0"
    />
  );
}
