"use client";

/**
 * VerifyEmailBanner — Phase 9 M1 Batch 3 (Hook).
 *
 * Persistent dismissable banner shown to users in E-005 variant B
 * (defer-email-verify). Renders inside the AppShell above page content
 * whenever:
 *   - The active user has `email_verified === false` (Supabase user),
 *     OR
 *   - The query string carries `?verify=pending` (set by the signup
 *     handler at variant-B redirect time so the banner appears even
 *     before the AuthProvider's first `getUser()` round-trip completes).
 *
 * Variant A users never see this banner — they cannot reach the
 * AppShell without first clicking the verify link.
 *
 * Trust-cliff: the copy is exactly the line in Hook's experiment spec:
 *   "Confirm your email to keep your account active"
 * No urgency theatrics; no countdown timers. Variant B is a friction
 * removal, not a friction-replacement.
 *
 * a11y: role="status" + aria-live="polite" so AT users hear the banner
 * once on first render; a Button with `aria-label` not just visual icon.
 */
import * as React from "react";

import { useSupabaseUser } from "../lib/auth-context";

export function VerifyEmailBanner(): React.ReactElement | null {
  const { user, mock } = useSupabaseUser();
  const [dismissed, setDismissed] = React.useState<boolean>(false);
  const [queryPending, setQueryPending] = React.useState<boolean>(false);
  const [resending, setResending] = React.useState<boolean>(false);
  const [resent, setResent] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    setQueryPending(sp.get("verify") === "pending");
  }, []);

  // In mock mode the user is always "verified" (no email round-trip).
  if (mock) return null;
  if (dismissed) return null;

  // Hide when the user is verified per Supabase's user shape. We don't
  // have direct access to email_confirmed_at via the adapter, so we use
  // the queryPending flag as the variant-B trigger and let the AuthProvider
  // refresh strip it on next /me round-trip in a follow-up Lens commit.
  const needsBanner = queryPending && user !== null;
  if (!needsBanner) return null;

  const handleResend = async (): Promise<void> => {
    setResending(true);
    try {
      // Server route lives at /auth/callback for the click handler.
      // The Supabase resend API requires the client to be in scope;
      // call-site keeps it simple by re-using the existing verify-email
      // page which knows how to trigger Supabase resend.
      window.location.href = "/auth/verify-email?resend=1";
    } finally {
      setResending(false);
      setResent(true);
    }
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="sz-verify-banner"
      style={{
        background: "var(--c-warn-soft, #fff8e1)",
        border: "1px solid var(--c-warn, #e0b400)",
        padding: "var(--sp-12, 12px) var(--sp-16, 16px)",
        margin: "var(--sp-12, 12px) 0",
        borderRadius: "var(--radius-sm, 6px)",
        display: "flex",
        alignItems: "center",
        gap: "var(--sp-12, 12px)",
        justifyContent: "space-between",
      }}
    >
      <span>
        <strong>Confirm your email to keep your account active.</strong>{" "}
        We sent a link to <code>{user.email}</code> — click it to verify.
      </span>
      <span style={{ display: "flex", gap: "var(--sp-8, 8px)" }}>
        <button
          type="button"
          onClick={() => void handleResend()}
          disabled={resending || resent}
          className="sz-link"
          aria-label="Resend verification email"
        >
          {resent ? "Sent" : resending ? "Sending…" : "Resend"}
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss banner"
          className="sz-link"
        >
          Dismiss
        </button>
      </span>
    </div>
  );
}
