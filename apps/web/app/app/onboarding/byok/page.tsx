"use client";

/**
 * /app/onboarding/byok — BYOK key paste (Trace flow S5a).
 *
 * Phase 9 M1 Batch 2 (Vega) — wires the real Edge Function path while
 * keeping the mock fallback. Halo HC5 / SC 3.3.8 contracts unchanged:
 *  - autocomplete="off"
 *  - type=password masking with show/hide toggle (Input variant=byok)
 *  - paste enabled (no onPaste e.preventDefault())
 *  - aria-describedby links to help text
 *
 * Real path (env vars present, mock disabled):
 *   POST `${SUPABASE_FN_URL}/byok-validate` with `Authorization: Bearer <jwt>`
 *   body `{ key }` — backend resolves tenant_id from the JWT (matches the
 *   dispatch contract "no tenant_id; backend resolves from caller's JWT").
 *   On 200 → push next onboarding step. On 400 → render locked error copy.
 *
 * Mock path (env vars missing OR `NEXT_PUBLIC_USE_AUTH_MOCK=true`):
 *   Accept any key starting with `sk-ant-`; simulate 800ms latency.
 */
import { useRouter } from "next/navigation";
import * as React from "react";

import { Button } from "../../../../components/Button";
import { Chip } from "../../../../components/Chip";
import { Form } from "../../../../components/Form";
import { Input } from "../../../../components/Input";
import { useSupabaseUser } from "../../../../lib/auth-context";
import { getFunctionsBaseUrl, isMockMode } from "../../../../lib/env";
import { track } from "../../../../lib/posthog-client";
import { createBrowserSupabaseClient } from "../../../../lib/supabase-client";

// Locked Herald error copy — never surfaces raw "HTTP 400" or Supabase
// error messages. Cross-ref: Proof F-MOCK-011 in lib/mock-data.ts.
const ERR_REJECTED =
  "Anthropic didn't accept that key. Check it and paste again.";

export default function ByokPage(): React.ReactElement {
  const router = useRouter();
  const { user } = useSupabaseUser();
  const [key, setKey] = React.useState<string>("");
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);

    // Quick shape check — saves a round trip and gives the AT a fast error.
    if (!key.startsWith("sk-ant-")) {
      setError(ERR_REJECTED);
      return;
    }
    setSubmitting(true);
    const startedAt = Date.now();

    // ---- MOCK path: keep clickable demo working ---------------------
    if (isMockMode()) {
      await new Promise((r) => setTimeout(r, 800));
      // Lens spec §2.2 byok_key_validated — even in mock, fire the
      // event so funnel walkers in CI see the row.
      track("byok_key_validated", {
        tenant_id: user?.tenantId ?? "mock-tenant",
        success: true,
        latency_ms: Date.now() - startedAt,
      });
      router.push("/app/onboarding/github");
      return;
    }

    // ---- REAL path: POST to byok-validate Edge Function -------------
    const base = getFunctionsBaseUrl();
    if (!base) {
      // Defensive: env says non-mock but the URL didn't resolve.
      setError(ERR_REJECTED);
      setSubmitting(false);
      return;
    }

    try {
      // Resolve the caller's JWT for the Authorization header. The Edge
      // Function uses the JWT to derive tenant_id — no tenant_id is sent
      // in the body per the M1 contract.
      const supabase = createBrowserSupabaseClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) {
        setError("Your session expired. Sign in again to paste your key.");
        setSubmitting(false);
        return;
      }

      const res = await fetch(`${base}/byok-validate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ key }),
      });

      if (res.status === 200) {
        track("byok_key_validated", {
          tenant_id: user?.tenantId ?? "",
          success: true,
          latency_ms: Date.now() - startedAt,
        });
        router.push("/app/onboarding/github");
        return;
      }

      // 400 / 401 / 422 / anything else — same locked copy. We never
      // surface Anthropic's raw error to the user (Proof F-MOCK-011).
      track("byok_key_failed", {
        tenant_id: user?.tenantId,
        failure_reason:
          res.status === 429
            ? "rate_limited"
            : res.status === 401 || res.status === 400
              ? "invalid_key"
              : "unknown",
        latency_ms: Date.now() - startedAt,
      });
      setError(ERR_REJECTED);
      setSubmitting(false);
    } catch {
      track("byok_key_failed", {
        tenant_id: user?.tenantId,
        failure_reason: "network",
        latency_ms: Date.now() - startedAt,
      });
      setError(ERR_REJECTED);
      setSubmitting(false);
    }
  };

  return (
    <>
      <Chip variant="mono-meta" tone="neutral">
        STEP 02 · BYOK
      </Chip>
      <h1 id="page-h1">Paste your Anthropic API key.</h1>
      <p className="body-lg">
        We dry-run a single call to verify the key. Studio Zero never logs
        the key. {isMockMode() ? (
          <>
            Paste any string starting with <code>sk-ant-</code> for the mock
            to accept it.
          </>
        ) : (
          <>Your key never leaves the secure path between your browser, Anthropic, and our Vault.</>
        )}
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
