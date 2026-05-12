import * as React from "react";

import { LegalPage } from "../../components/LegalPage";

import type { Metadata } from "next";

/**
 * /aup — Acceptable Use Policy (M1 first draft).
 *
 * Phase 9 M1 Batch 3 (Comply). Source-of-truth Markdown lives at
 * `legal/aup.md`. Covers the load-bearing URL-authorization
 * attestation clause (PRD §14.7), prohibited content, no-automated-
 * abuse, termination + regional pro-rata refund posture per
 * `finance/refund-matrix.md` RT-10, abuse reporting paths.
 */

export const metadata: Metadata = {
  title: "Acceptable use policy",
  description:
    "Studio Zero acceptable use policy. URL-audit authorization, prohibited content, no automated abuse, termination + refund posture.",
};

export const dynamic = "force-static";

export default function AUPPage(): React.ReactElement {
  return (
    <LegalPage
      eyebrow="Legal · Acceptable use"
      title="Acceptable use policy"
      source="legal/aup.md"
      effectiveDate="2026-05-12"
      version="1.0"
    />
  );
}
