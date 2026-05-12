import * as React from "react";

import { Button } from "./Button";
import { Nav } from "./Nav";
import { readLegalDoc, renderLegalMarkdown } from "../lib/legal-markdown";

/**
 * LegalPage — Phase 9 M1 Batch 3 (Comply).
 *
 * Replaces the M0 `StubPage` for `/terms`, `/privacy`, `/aup`, and
 * `/subprocessors`. The full legal text lives in `legal/*.md` (the
 * canonical source — Comply edits Markdown, not TSX). This component
 * reads the file at request time on the server, renders it through the
 * dependency-free `renderLegalMarkdown` (apps/web/lib/legal-markdown),
 * and wraps it in the marketing chrome so the deep-link is consistent
 * with the M0 stub layout.
 *
 * Per BUILD_FLOW Hard Rule §5: every legal route returns 200 with the
 * real text. No "ships at M4" stub past Comply's M1 first-draft.
 */
export interface LegalPageProps {
  eyebrow: string;
  title: string;
  /** Path to the markdown file, relative to repo root (e.g. "legal/terms-of-service.md"). */
  source: string;
  /** Effective date label rendered under the H1. */
  effectiveDate: string;
  /** Version label rendered under the H1. */
  version: string;
}

export function LegalPage({
  eyebrow,
  title,
  source,
  effectiveDate,
  version,
}: LegalPageProps): React.ReactElement {
  const markdown = readLegalDoc(source);
  const rendered = renderLegalMarkdown(markdown);

  return (
    <>
      <div className="grain" aria-hidden="true" />
      <div className="glow" aria-hidden="true" />

      <Nav
        links={[
          { href: "/how-it-works", label: "How it works" },
          { href: "/#pricing", label: "Pricing" },
          { href: "/blog", label: "Blog" },
          { href: "/accessibility", label: "Accessibility" },
        ]}
        auth={{
          signIn: { href: "/login", label: "Sign in" },
          signUp: { href: "/signup", label: "Run a free audit" },
        }}
      />

      <main id="main">
        <section className="legal-page">
          <div className="wrap">
            <span className="eyebrow stub-eyebrow">{eyebrow}</span>
            <h1>{title}</h1>
            <p className="legal-meta">
              <strong>Version:</strong> {version} ·{" "}
              <strong>Effective:</strong> {effectiveDate}
            </p>
            <article className="legal-body">{rendered}</article>
            <div style={{ marginTop: "var(--sp-32)" }}>
              <Button variant="ghost" size="md" href="/" arrow>
                Back to the landing
              </Button>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

export default LegalPage;
