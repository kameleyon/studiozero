"use client";

/**
 * /signup — Phase 9 M1 starter (MOCK).
 *
 * Trace flow S1. Email + password (or fake OAuth) → POST /api/signup →
 * sets mock session cookie → redirect to /app/onboarding/mode.
 *
 * Real M1+1 wiring goes to Supabase Auth with email-verify step (S2).
 *
 * Accessibility:
 *  - <label for=…> on every input (SC 3.3.2)
 *  - autocomplete="email" + autocomplete="new-password" (SC 1.3.5)
 *  - error summary uses role=alert (SC 3.3.1)
 *  - one h1, one primary CTA
 */
import { useRouter } from "next/navigation";
import * as React from "react";

import { Button } from "../../components/Button";
import { Form } from "../../components/Form";
import { Input } from "../../components/Input";

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
    setSubmitting(true);
    try {
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
    } catch {
      setError("Could not save. Check your connection and try again.");
      setSubmitting(false);
    }
  };

  return (
    <main id="main" className="sz-auth-page">
      <div className="sz-auth-card">
        <p className="sz-demo-banner">
          <strong>Demo mode.</strong> Real Supabase Auth lands at M1+1.
        </p>
        <h1>Create your Studio Zero account.</h1>
        <p>Free Surface audit on a URL you own. No card on file.</p>

        <div className="sz-auth-oauth">
          <Button
            variant="ghost"
            size="md"
            onClick={() => {
              // Fake OAuth — same effect as the email path.
              setEmail("oauth-demo@example.com");
              setTimeout(() => {
                void handleSubmit({
                  preventDefault: () => {},
                } as React.FormEvent);
              }, 0);
            }}
          >
            Continue with Google
          </Button>
          <Button
            variant="ghost"
            size="md"
            onClick={() => {
              setEmail("oauth-demo@example.com");
              setTimeout(() => {
                void handleSubmit({
                  preventDefault: () => {},
                } as React.FormEvent);
              }, 0);
            }}
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
