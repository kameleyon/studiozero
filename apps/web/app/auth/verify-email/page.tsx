/**
 * /auth/verify-email — Trace flow S2 stub.
 *
 * The mock skips email verification (mod1.1 cookie set immediately at
 * signup); this page is rendered for direct deep-links. Real M1+1 wiring
 * will poll Supabase Auth `email_confirmed_at` and auto-advance to S3.
 */
import * as React from "react";

import { Button } from "../../../components/Button";

export const metadata = {
  title: "Check your email",
};

export default function VerifyEmailPage(): React.ReactElement {
  return (
    <main id="main" className="sz-auth-page">
      <div className="sz-auth-card">
        <p className="sz-demo-banner">
          <strong>Demo mode.</strong> Email verification is stubbed for M1.
        </p>
        <h1>Check your email.</h1>
        <p>
          We sent a link to your email. In production, you&apos;d click it from
          any device to verify and land on your dashboard.
        </p>
        <p>
          The demo skipped this step — your session is already active. Head
          to your dashboard to start your first audit.
        </p>
        <Button variant="primary" size="lg" href="/app" arrow>
          Go to dashboard
        </Button>
        <p className="sz-auth-meta">
          Wrong email? <a href="/signup">Use a different one</a>
        </p>
      </div>
    </main>
  );
}
