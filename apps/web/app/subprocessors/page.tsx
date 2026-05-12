import * as React from "react";

import { LegalPage } from "../../components/LegalPage";

import type { Metadata } from "next";

/**
 * /subprocessors — Subprocessor list (M1 first publication).
 *
 * Phase 9 M1 Batch 3 (Comply). Pulled forward from the M3 stub. Source-
 * of-truth Markdown lives at `legal/subprocessors.md`. 13 entries
 * (10 core + 3 conditional). Mirrors every external service in
 * `architecture/system-diagram.md`. 30-day change-notification window
 * per Decision #17.
 */

export const metadata: Metadata = {
  title: "Subprocessors",
  description:
    "The 13 third-party vendors that touch your data when you use Studio Zero, with purpose, region, data category, and DPA links.",
};

export const dynamic = "force-static";

export default function SubprocessorsPage(): React.ReactElement {
  return (
    <LegalPage
      eyebrow="Legal · Subprocessors"
      title="Subprocessors"
      source="legal/subprocessors.md"
      effectiveDate="2026-05-12"
      version="1.0"
    />
  );
}
