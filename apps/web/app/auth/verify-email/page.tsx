/**
 * /auth/verify-email — Phase 9 M1 Batch 2 (Forge).
 *
 * Trace flow S2. After `supabase.auth.signUp()` with confirm-email ON,
 * Supabase emails a magic link; the user clicks it; the link lands on
 * `/auth/callback?code=...` which exchanges the code for a session and
 * redirects to `/app/onboarding/mode`. This page is the in-between
 * "check your email" screen.
 *
 * If the auth mock is enabled (`NEXT_PUBLIC_USE_AUTH_MOCK=true`), email
 * verification is skipped and we copy in a demo banner; the link button
 * goes to `/app` directly.
 */
import * as React from "react";

import { Button } from "../../../components/Button";

export const metadata = {
  title: "Check your email",
};

export default function VerifyEmailPage(): React.ReactElement {
  const mockEnabled = process.env.NEXT_PUBLIC_USE_AUTH_MOCK === "true";
  return (
    <main id="main" className="sz-auth-page">
      <div className="sz-auth-card">
        {mockEnabled ? (
          <p className="sz-demo-banner">
            <strong>Demo mode.</strong> Email verification is stubbed.
          </p>
        ) : null}
        <h1>Check your email.</h1>
        <p>
          We sent a verification link to your email address. Click it to
          confirm your account and land on your dashboard.
        </p>
        <p>
          Didn&apos;t arrive within a minute? Check your spam folder, or{" "}
          <a href="/signup">try a different email</a>.
        </p>
        <Button variant="primary" size="lg" href={mockEnabled ? "/app" : "/login"} arrow>
          {mockEnabled ? "Go to dashboard" : "Back to sign in"}
        </Button>
      </div>
    </main>
  );
}
