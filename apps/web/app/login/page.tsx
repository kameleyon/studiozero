"use client";

/**
 * /login — Phase 9 M1 Batch 2 (Forge — real Supabase Auth).
 *
 * Mirrors /signup. Email+password uses `signInWithPassword`; OAuth uses
 * `signInWithOAuth`. On success, lands on `/app` (dashboard). On failure,
 * shows the Supabase error message verbatim (already user-facing —
 * "Invalid login credentials", "Email not confirmed", etc.).
 *
 * The `NEXT_PUBLIC_USE_AUTH_MOCK=true` env flag re-routes to legacy mock.
 */
import { useRouter } from "next/navigation";
import * as React from "react";

import { Button } from "../../components/Button";
import { Form } from "../../components/Form";
import { Input } from "../../components/Input";
import { isAuthMockEnabled } from "../../lib/auth-mock";
import { createBrowserSupabaseClient } from "../../lib/supabase-client";

export default function LoginPage(): React.ReactElement {
  const router = useRouter();
  const [email, setEmail] = React.useState<string>("");
  const [password, setPassword] = React.useState<string>("");
  const [submitting, setSubmitting] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    if (!email.includes("@")) {
      setError("Enter a valid email so we can sign you in.");
      return;
    }
    setSubmitting(true);
    try {
      if (isAuthMockEnabled()) {
        const res = await fetch("/api/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = (await res.json()) as { ok: boolean };
        if (!data.ok) {
          setError("Could not sign in. Check your credentials and try again.");
          setSubmitting(false);
          return;
        }
        router.push("/app");
        return;
      }

      const supabase = createBrowserSupabaseClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        setError(signInError.message);
        setSubmitting(false);
        return;
      }
      router.push("/app");
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(`Could not sign in: ${msg}`);
      setSubmitting(false);
    }
  };

  const handleOAuth = async (provider: "google" | "github"): Promise<void> => {
    setError(null);
    if (isAuthMockEnabled()) return;
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
            <strong>Demo mode.</strong> Auth mock is active.
          </p>
        ) : null}
        <h1>Sign in.</h1>

        <div className="sz-auth-oauth">
          <Button variant="ghost" size="md" onClick={() => void handleOAuth("google")}>
            Continue with Google
          </Button>
          <Button variant="ghost" size="md" onClick={() => void handleOAuth("github")}>
            Continue with GitHub
          </Button>
        </div>
        <div className="sz-auth-divider">or</div>

        <Form onSubmit={handleSubmit} errorSummary={error}>
          <Input
            variant="email"
            label="Email"
            name="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            variant="password"
            label="Password"
            name="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button type="submit" variant="primary" size="lg" loading={submitting} arrow>
            {submitting ? "Signing in" : "Sign in"}
          </Button>
        </Form>
        <p className="sz-auth-meta">
          New here? <a href="/signup">Create an account</a>
        </p>
      </div>
    </main>
  );
}
