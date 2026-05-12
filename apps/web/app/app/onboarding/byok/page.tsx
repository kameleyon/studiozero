"use client";

/**
 * /app/onboarding/byok — BYOK key paste (Trace flow S5a).
 *
 * Halo HC5 / SC 3.3.8:
 *  - autocomplete="off"
 *  - type=password masking with show/hide toggle (Input variant=byok)
 *  - paste enabled (no e.preventDefault on onPaste!)
 *  - password-manager support is opt-in (autocomplete=off allows it)
 *  - aria-describedby links to help text
 *
 * Mock: dry-run "succeeds" if the key starts with `sk-ant-`. Real M1+1
 * wiring calls byok-validate Edge Function which fires the Anthropic
 * `messages` endpoint with max_tokens=1.
 */
import { useRouter } from "next/navigation";
import * as React from "react";

import { Button } from "../../../../components/Button";
import { Chip } from "../../../../components/Chip";
import { Form } from "../../../../components/Form";
import { Input } from "../../../../components/Input";

export default function ByokPage(): React.ReactElement {
  const router = useRouter();
  const [key, setKey] = React.useState<string>("");
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    if (!key.startsWith("sk-ant-")) {
      setError(
        "Anthropic didn't accept that key. Check it and paste again.",
      );
      return;
    }
    setSubmitting(true);
    // Simulate dry-run latency.
    await new Promise((r) => setTimeout(r, 800));
    router.push("/app/onboarding/github");
  };

  return (
    <>
      <Chip variant="mono-meta" tone="neutral">
        STEP 02 · BYOK
      </Chip>
      <h1 id="page-h1">Paste your Anthropic API key.</h1>
      <p className="body-lg">
        We dry-run a single call to verify the key. Studio Zero never logs
        the key. Paste any string starting with <code>sk-ant-</code> for the
        mock to accept it.
      </p>

      <Form onSubmit={handleSubmit} errorSummary={error}>
        <Input
          variant="byok"
          label="Anthropic API key"
          name="anthropic_key"
          required
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="sk-ant-api03-..."
          helpText="Paste from your Anthropic dashboard. Use the Show/Hide toggle to verify what you pasted."
        />
        <div className="sz-intake-actions">
          <Button variant="ghost" size="md" href="/app/onboarding/mode">
            Back
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={submitting}
            arrow
          >
            {submitting ? "Verifying" : "Verify and save"}
          </Button>
        </div>
      </Form>
    </>
  );
}
