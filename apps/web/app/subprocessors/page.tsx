import * as React from "react";

import { LegalPage } from "../../components/LegalPage";

import type { Metadata } from "next";

/**
 * /subprocessors — Subprocessor list (M2 refinement).
 *
 * Phase 9 M2 Batch 2 (Comply). Source-of-truth Markdown at
 * `legal/subprocessors.md` v1.1 — 13 in-use (10 core + 3 conditional)
 * + 3 reserved for V1.5/V2 = 16 total on the canonical inventory.
 * Mirrors every external service in `architecture/system-diagram.md`.
 * 30-day change-notification window per Decision #17.
 */

export const metadata: Metadata = {
  title: "Subprocessors",
  description:
    "The third-party vendors that touch your data when you use Studio Zero, with purpose, region, data category, and DPA links — 13 in use plus 3 reserved.",
};

export const dynamic = "force-static";

export default function SubprocessorsPage(): React.ReactElement {
  return (
    <LegalPage
      eyebrow="Legal · Subprocessors"
      title="Subprocessors"
      source="legal/subprocessors.md"
      effectiveDate="2026-05-12"
      version="1.1"
    />
  );
}
