"use client";

/**
 * /app/settings/integrations/byok — BYOK key rotation (Scenario 3).
 *
 * Same Halo HC5 contract as /app/onboarding/byok. Adds a "Saved." toast
 * after the mock dry-run succeeds, per sample 02 §4.
 */
import * as React from "react";

import { Button } from "../../../../../components/Button";
import { Card } from "../../../../../components/Card";
import { Chip } from "../../../../../components/Chip";
import { Form } from "../../../../../components/Form";
import { Input } from "../../../../../components/Input";

export default function ByokSettingsPage(): React.ReactElement {
  const [key, setKey] = React.useState<string>("");
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState<boolean>(false);
  const [saved, setSaved] = React.useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    setSaved(false);
    if (!key.startsWith("sk-ant-")) {
      setError("Anthropic didn't accept that key. Check it and paste again.");
      return;
    }
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 700));
    setSubmitting(false);
    setSaved(true);
    setKey("");
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <>
      <p className="sz-demo-banner">
        <strong>Demo mode.</strong> Key never leaves the browser; mock dry-run
        accepts any string beginning with <code>sk-ant-</code>.
      </p>
      <Chip variant="mono-meta" tone="neutral">INTEGRATIONS · BYOK</Chip>
      <h1 id="page-h1">Anthropic API key (BYOK)</h1>
      <p className="body-lg">
        Your tokens, our infra. Studio Zero never logs the key. Rotate any
        time — old key is overwritten in Vault.
      </p>

      <Card
        variant="default"
        heading="Current key"
        body="sk-ant-...DEMO · Validated 3 days ago (mock)."
        mono="STATUS: VALIDATED · LAST USED 11M AGO"
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
          <p style={{ color: "var(--verdict-pass)", fontFamily: "var(--font-mono)", fontSize: "var(--fs-mono-data)" }}>
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
