import * as React from "react";

import { Button } from "./Button";
import { Nav } from "./Nav";

/**
 * StubPage — chrome-consistent placeholder for routes that ship at
 * later milestones. Renders the full marketing nav + footer so the URL
 * works as a deep-link from anywhere on the site, with an honest
 * "coming at M<n>" note.
 *
 * Per BUILD_FLOW Hard Rule §5 (production-ready from day one) we do not
 * ship 404s for routes that the landing page links to. Every link in
 * the footer + nav resolves; the body honestly names what lands when.
 */
export interface StubPageProps {
  eyebrow: string;
  title: string;
  description: string;
  /** Milestone this route ships at — e.g. "M2", "M4". */
  shipsAt: string;
  /** Owner agent — e.g. "Comply", "Halo". */
  owner: string;
  children?: React.ReactNode;
}

export function StubPage({
  eyebrow,
  title,
  description,
  shipsAt,
  owner,
  children,
}: StubPageProps): React.ReactElement {
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
        <section className="stub-page">
          <div className="wrap">
            <span className="eyebrow stub-eyebrow">{eyebrow}</span>
            <h1>{title}</h1>
            <p>{description}</p>
            {children}
            <p className="stub-meta">
              Ships at {shipsAt} · Owner: {owner}
            </p>
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

export default StubPage;
