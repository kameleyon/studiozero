import * as React from "react";

import { LegalPage } from "../../components/LegalPage";

import type { Metadata } from "next";

/**
 * /terms — Terms of Service (M1 first draft).
 *
 * Phase 9 M1 Batch 3 (Comply). Source-of-truth Markdown lives at
 * `legal/terms-of-service.md` (Comply edits there; this route reads
 * and renders). Includes BYOK Provider Pass-Through clause #19
 * (LOCKED in PRD §17), AI disclaimer (Comply Rule #5), and regional
 * cooling-off cross-references to `finance/refund-matrix.md`.
 */

export const metadata: Metadata = {
  title: "Terms of service",
  description:
    "Studio Zero terms of service. Includes the BYOK provider pass-through clause, AI disclaimer, regional refund matrix, and Dispute Finding path.",
};

// Static render — the markdown is read at build time, no per-request work.
export const dynamic = "force-static";

export default function TermsPage(): React.ReactElement {
  return (
    <LegalPage
      eyebrow="Legal · Terms"
      title="Terms of service"
      source="legal/terms-of-service.md"
      effectiveDate="2026-05-12"
      version="1.0"
    />
  );
}
