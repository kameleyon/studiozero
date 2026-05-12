"use client";

/**
 * /app/settings/integrations/byok — BYOK key rotation (Scenario 3).
 *
 * Phase 9 M1 Batch 2 (Vega) — same Edge Function as the onboarding form,
 * just with a "Saved." toast on success and no redirect. Mock fallback
 * preserved: when `lib/env.ts isMockMode()` is true, we accept any
 * `sk-ant-*` key offline.
 */
import * as React from "react";

import { Button } from "../../../../../components/Button";
import { Card } from "../../../../../components/Card";
import { Chip } from "../../../../../components/Chip";
import { Form } from "../../../../../components/Form";
import { Input } from "../../../../../components/Input";
import { useSupabaseUser } from "../../../../../lib/auth-context";
import { getFunctionsBaseUrl, isMockMode } from "../../../../../lib/env";
import { createBrowserSupabaseClient } from "../../../../../lib/supabase-client";

const ERR_REJECTED =
  "Anthropic didn't accept that key. Check it and paste again.";

export default function ByokSettingsPage(): React.ReactElement {
  const { user, mock } = useSupabaseUser();
  const [key, setKey] = React.useState<string>("");
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState<boolean>(false);
  const [saved, setSaved] = React.useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    setSaved(false);
    if (!key.startsWith("sk-ant-")) {
      setError(ERR_REJECTED);
      return;
    }
    setSubmitting(true);

    if (isMockMode()) {
      await new Promise((r) => setTimeout(r, 700));
      setSubmitting(false);
      setSaved(true);
      setKey("");
      setTimeout(() => setSaved(false), 3000);
      return;
    }

    const base = getFunctionsBaseUrl();
    if (!base) {
      setError(ERR_REJECTED);
      setSubmitting(false);
      return;
    }

    try {
      const supabase = createBrowserSupabaseClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setError("Your session expired. Sign in again to rotate your key.");
        setSubmitting(false);
        return;
      }
      const res = await fetch(`${base}/byok-validate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ key }),
      });
      if (res.status !== 200) {
        setError(ERR_REJECTED);
        setSubmitting(false);
        return;
      }
      setSubmitting(false);
      setSaved(true);
      setKey("");
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError(ERR_REJECTED);
      setSubmitting(false);
    }
  };

  const currentFp = user?.byokKeyFingerprint ?? null;
  const currentBody = currentFp
    ? `${currentFp} · Validated.`
    : "No key on file yet.";

  return (
    <>
      {mock ? (
        <p className="sz-demo-banner">
          <strong>Demo mode.</strong> Key never leaves the browser; mock
          dry-run accepts any string beginning with <code>sk-ant-</code>.
        </p>
      ) : null}
      <Chip variant="mono-meta" tone="neutral">INTEGRATIONS · BYOK</Chip>
      <h1 id="page-h1">Anthropic API key (BYOK)</h1>
      <p className="body-lg">
        Your tokens, our infra. Studio Zero never logs the key. Rotate any
        time — old key is overwritten in Vault.
      </p>

      <Card
        variant="default"
        heading="Current key"
        body={currentBody}
        mono={
          user?.byokVerified ? "STATUS: VALIDATED" : "STATUS: NOT VALIDATED"
        }
      />

      <h2>Rotate the key</h2>
      <Form onSubmit={handleSubmit} errorSummary={error}>
        <Input
          variant="byok"
          label="New Anthropic API key"
          name="new_anthropic_key"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          required
          placeholder="sk-ant-api03-..."
          helpText="Pasting replaces the existing key after a successful dry-run."
        />
        {saved ? (
          <p
            style={{
              color: "var(--verdict-pass)",
              fontFamily: "var(--font-mono)",
              fontSize: "var(--fs-mono-data)",
            }}
            role="status"
            aria-live="polite"
          >
            Saved.
          </p>
        ) : null}
        <div className="sz-intake-actions">
          <Button variant="ghost" size="md" href="/app/settings">
            Back to settings
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={submitting}
            disabled={!key}
            arrow
          >
            {submitting ? "Saving" : "Save changes"}
          </Button>
        </div>
      </Form>
    </>
  );
}
