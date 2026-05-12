"use client";

/**
 * /signup — Phase 9 M1 Batch 2 (Forge — real Supabase Auth).
 *
 * Trace flow S1. Three entry surfaces:
 *   1. Email + password → `supabase.auth.signUp({ email, password })` with
 *      `emailRedirectTo` pointing back at `/auth/callback` so the verify
 *      link lands on a server route that exchanges the code for a session.
 *   2. Google OAuth → `signInWithOAuth({ provider: "google" })`.
 *   3. GitHub OAuth → `signInWithOAuth({ provider: "github" })`.
 *
 * PKCE flow type is configured on the browser client (lib/supabase-client.ts)
 * so the OAuth round-trip is single-use, refresh-tokenable, and CSRF-safe.
 *
 * After a successful email+password signup, Supabase returns a session
 * iff the project has "Confirm email" disabled (dev). With confirm email
 * enabled (production), the session is null and we redirect to
 * `/auth/verify-email` to await the link click.
 *
 * Accessibility (unchanged from M1 starter):
 *  - <label for=…> on every input (SC 3.3.2)
 *  - autocomplete="email" + autocomplete="new-password" (SC 1.3.5)
 *  - error summary uses role=alert (SC 3.3.1)
 *  - one h1, one primary CTA
 *
 * The `NEXT_PUBLIC_USE_AUTH_MOCK=true` env flag re-routes the form to the
 * legacy mock endpoint for offline dev (lib/auth-mock.tsx). The mock
 * branch is intentionally a one-liner — production builds never see it.
 */
import { useRouter } from "next/navigation";
import * as React from "react";

import { Button } from "../../components/Button";
import { Form } from "../../components/Form";
import { Input } from "../../components/Input";
import { isAuthMockEnabled } from "../../lib/auth-mock";
import { createBrowserSupabaseClient } from "../../lib/supabase-client";

export default function SignupPage(): React.ReactElement {
  const router = useRouter();
  const [email, setEmail] = React.useState<string>("");
  const [password, setPassword] = React.useState<string>("");
  const [submitting, setSubmitting] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    if (!email.includes("@")) {
      setError("Enter a valid email so we can save your session.");
      return;
    }
    if (password.length < 12) {
      setError("Password must be at least 12 characters.");
      return;
    }
    setSubmitting(true);
    try {
      // Offline-dev fallback path — legacy mock endpoint.
      if (isAuthMockEnabled()) {
        const res = await fetch("/api/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = (await res.json()) as { ok: boolean; redirectTo?: string; error?: string };
        if (!data.ok || !data.redirectTo) {
          setError(data.error ?? "Could not save. Check your connection and try again.");
          setSubmitting(false);
          return;
        }
        router.push(data.redirectTo);
        return;
      }

      const supabase = createBrowserSupabaseClient();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        setSubmitting(false);
        return;
      }

      // Confirm-email ON (production) → session is null until link click.
      // Confirm-email OFF (dev) → session present, jump to onboarding.
      if (data.session) {
        router.push("/app/onboarding/mode");
      } else {
        router.push("/auth/verify-email");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(`Could not save: ${msg}`);
      setSubmitting(false);
    }
  };

  const handleOAuth = async (provider: "google" | "github"): Promise<void> => {
    setError(null);
    if (isAuthMockEnabled()) {
      setEmail("oauth-demo@example.com");
      setTimeout(() => void handleSubmit({ preventDefault: () => {} } as React.FormEvent), 0);
      return;
    }
    setSubmitting(true);
    try {
      const supabase = createBrowserSupabaseClient();
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (oauthError) {
        setError(oauthError.message);
        setSubmitting(false);
      }
      // signInWithOAuth navigates the browser to the provider; nothing
      // more to do here on success.
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(`Could not start sign-in: ${msg}`);
      setSubmitting(false);
    }
  };

  return (
    <main id="main" className="sz-auth-page">
      <div className="sz-auth-card">
        {isAuthMockEnabled() ? (
          <p className="sz-demo-banner">
            <strong>Demo mode.</strong> Auth mock is active
            (`NEXT_PUBLIC_USE_AUTH_MOCK=true`).
          </p>
        ) : null}
        <h1>Create your Studio Zero account.</h1>
        <p>Free Surface audit on a URL you own. No card on file.</p>

        <div className="sz-auth-oauth">
          <Button
            variant="ghost"
            size="md"
            onClick={() => void handleOAuth("google")}
          >
            Continue with Google
          </Button>
          <Button
            variant="ghost"
            size="md"
            onClick={() => void handleOAuth("github")}
          >
            Continue with GitHub
          </Button>
        </div>

        <div className="sz-auth-divider">or</div>

        <Form
          onSubmit={handleSubmit}
          errorSummary={error}
          aria-labelledby="sz-signup-heading"
        >
          <Input
            variant="email"
            label="Email"
            name="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
          <Input
            variant="password"
            label="Password"
            name="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            helpText="At least 12 characters. Password managers welcome."
          />
          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={submitting}
            arrow
          >
            {submitting ? "Saving" : "Create account"}
          </Button>
        </Form>

        <p className="sz-auth-meta">
          Already have an account? <a href="/login">Sign in</a>
        </p>
      </div>
    </main>
  );
}
