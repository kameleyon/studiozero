"use client";

/**
 * /login — Phase 9 M1 starter (MOCK).
 *
 * Mirrors /signup minimal — same /api/signup endpoint sets the mock
 * cookie; M1+1 splits into Supabase `signInWithPassword` and proper
 * error handling for wrong-password / unverified-email.
 */
import { useRouter } from "next/navigation";
import * as React from "react";

import { Button } from "../../components/Button";
import { Form } from "../../components/Form";
import { Input } from "../../components/Input";

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
      const data = (await res.json()) as { ok: boolean; redirectTo?: string };
      if (!data.ok) {
        setError("Could not sign in. Check your connection and try again.");
        setSubmitting(false);
        return;
      }
      // Real login lands on dashboard, not onboarding.
      router.push("/app");
    } catch {
      setError("Could not sign in. Check your connection and try again.");
      setSubmitting(false);
    }
  };

  return (
    <main id="main" className="sz-auth-page">
      <div className="sz-auth-card">
        <p className="sz-demo-banner">
          <strong>Demo mode.</strong> Real auth lands at M1+1.
        </p>
        <h1>Sign in.</h1>
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
