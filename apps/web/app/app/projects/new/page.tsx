"use client";

/**
 * /app/projects/new — 2-step intake (Pixel's intake-2step.jsx).
 *
 * Step 1: "What do you have?"   GitHub / URL / Local
 * Step 2: "How deep?"           Quick (default) / Comprehensive
 *
 * Compass AH-4 — Audit-product chip with plain-English subtitle.
 * Halo focus-restoration on back-from-step-2 — flagged for M1+1 (would
 * require imperative focus handle on Card components, which we don't
 * have at M1).
 *
 * On Start: POST /api/runs and redirect to /app/audits/[runId].
 */
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

import { Button } from "../../../../components/Button";
import { Card } from "../../../../components/Card";
import { Chip } from "../../../../components/Chip";
import { Form } from "../../../../components/Form";
import { Input } from "../../../../components/Input";

type IntakeMethod = "github" | "url" | "local";
type Depth = "quick" | "comprehensive";

export default function NewProjectPage(): React.ReactElement {
  return (
    <React.Suspense fallback={<p>Loading intake…</p>}>
      <NewProjectInner />
    </React.Suspense>
  );
}

function NewProjectInner(): React.ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialIntake = searchParams?.get("intake") as IntakeMethod | null;

  const [step, setStep] = React.useState<1 | 2>(1);
  const [intake, setIntake] = React.useState<IntakeMethod | null>(
    initialIntake ?? null,
  );
  const [clientTag, setClientTag] = React.useState<string>("");
  const [urlValue, setUrlValue] = React.useState<string>(
    "https://example.com/demo",
  );
  // CFAA shield (PRD §14.7) — URL intake REQUIRES affirmative AUP
  // attestation. The checkbox is NOT pre-ticked; the user must
  // explicitly opt-in BEFORE /api/runs is called.
  const [aupAttested, setAupAttested] = React.useState<boolean>(false);
  const [attestError, setAttestError] = React.useState<string | null>(null);
  const [depth, setDepth] = React.useState<Depth>("quick");
  const [starting, setStarting] = React.useState<boolean>(false);

  const product: "SURFACE" | "CODE" =
    intake === "url" ? "SURFACE" : "CODE";
  const productPlainEnglish =
    product === "SURFACE" ? "audits the live site" : "audits the source code";

  const showSkuMismatchWarning =
    depth === "comprehensive" && intake === "url";

  const handleStart = async (): Promise<void> => {
    if (!intake) return;
    setStarting(true);
    setAttestError(null);
    try {
      // ---- CFAA shield: URL intake → AUP attestation BEFORE run start.
      // Per PRD §14.7 + Jury M3 audit Critical #2. The attestation row
      // MUST land in audit_logs before the run flips to state='queued'.
      const projectId = crypto.randomUUID();
      if (intake === "url") {
        if (!aupAttested) {
          setAttestError(
            // Herald-locked error copy — what + what-to-do, grade 6.
            "Tick the authorization box above to continue. We can only audit URLs you own or have written authorization to audit.",
          );
          setStarting(false);
          return;
        }
        const attestRes = await fetch("/api/audit/url-attest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: urlValue, project_id: projectId }),
        });
        if (!attestRes.ok) {
          const body = (await attestRes.json().catch(() => ({}))) as {
            error?: string;
          };
          setAttestError(
            body.error === "missing_attestation"
              ? "We couldn't record your authorization. Please tick the box and try again."
              : "We couldn't start the audit. Try again in a moment.",
          );
          setStarting(false);
          return;
        }
      }

      const res = await fetch("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intakeMethod: intake,
          depth,
          mode: intake === "local" ? "cli" : "byok",
          projectId,
          intakePayload:
            intake === "url"
              ? { url: urlValue, aup_attested: true }
              : intake === "github"
                ? { client_tag: clientTag || undefined }
                : { client_tag: clientTag || undefined },
        }),
      });
      const data = (await res.json()) as { ok: boolean; redirectTo?: string };
      if (data.ok && data.redirectTo) {
        router.push(data.redirectTo);
      } else {
        setStarting(false);
      }
    } catch {
      setStarting(false);
    }
  };

  if (step === 1) {
    return (
      <section aria-labelledby="page-h1" className="sz-intake-step">
        <Chip variant="mono-meta" tone="neutral">
          STEP 01 · INTAKE · CHOOSE WHAT YOU HAVE
        </Chip>
        <h1 id="page-h1">What do you have?</h1>
        <p className="body-lg">
          We&apos;ll pick the audit product for you. You can change your mind
          on the next step.
        </p>

        <Form>
          <fieldset className="sz-intake-fieldset">
            <legend className="sz-sr-only">Pick an intake method</legend>
            <div className="sz-intake-grid" role="radiogroup">
              <Card
                variant="default"
                heading="GitHub repo"
                body="Install our GitHub App on one repo. Read-only access to the source."
                mono="BYOK · Managed"
                interactive
                onClick={() => setIntake("github")}
                className={intake === "github" ? "sz-card--checked" : undefined}
              />
              <Card
                variant="default"
                heading="Paste a URL you own"
                body="Free Surface audit on a URL you own. Email verification required."
                mono="Free tier · BYOK · Managed"
                interactive
                onClick={() => setIntake("url")}
                className={intake === "url" ? "sz-card--checked" : undefined}
              />
              <Card
                variant="default"
                heading="Local folder"
                body="CLI mode only. Source never leaves your machine. Watermarked verdict."
                mono="CLI"
                interactive
                onClick={() => setIntake("local")}
                className={intake === "local" ? "sz-card--checked" : undefined}
              />
            </div>
          </fieldset>

          {intake === "url" ? (
            <>
              <Input
                variant="text"
                label="URL to audit"
                name="audit_url"
                autoComplete="off"
                placeholder="https://example.com"
                value={urlValue}
                onChange={(e) => setUrlValue(e.target.value)}
                helpText="Free Surface audit. Email-verified attestation: you own this URL."
              />
              {/* CFAA shield — PRD §14.7. Verbatim Herald-locked copy.
                 NOT pre-ticked. Mandatory before submit. */}
              <label
                style={{
                  display: "flex",
                  gap: "var(--sp-12, 12px)",
                  alignItems: "flex-start",
                  marginTop: "var(--sp-12, 12px)",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  name="aup_attestation"
                  required
                  checked={aupAttested}
                  onChange={(e) => {
                    setAupAttested(e.target.checked);
                    if (e.target.checked) setAttestError(null);
                  }}
                  aria-describedby={attestError ? "sz-aup-error" : undefined}
                />
                <span>
                  I am the owner of, or have written authorization to audit,
                  the URL above.
                </span>
              </label>
              {attestError ? (
                <p
                  id="sz-aup-error"
                  role="alert"
                  className="sz-soft-warning"
                  style={{ marginTop: "var(--sp-8, 8px)" }}
                >
                  {attestError}
                </p>
              ) : null}
            </>
          ) : null}

          <details>
            <summary
              style={{
                cursor: "pointer",
                color: "var(--ink-2)",
                padding: "var(--sp-8) 0",
              }}
            >
              Advanced — optional
            </summary>
            <Input
              variant="text"
              label="Client tag for this project"
              name="client_tag"
              autoComplete="off"
              placeholder="e.g. Acme Co."
              value={clientTag}
              onChange={(e) => setClientTag(e.target.value)}
              helpText="Optional. Lets you group projects by client later."
            />
          </details>
        </Form>

        <div className="sz-intake-actions">
          <Button variant="ghost" size="md" href="/app">
            Back to dashboard
          </Button>
          <Button
            variant="primary"
            size="lg"
            disabled={!intake}
            aria-disabled={!intake}
            onClick={() => setStep(2)}
            arrow
          >
            Save and continue
          </Button>
        </div>
      </section>
    );
  }

  // Step 2 — depth picker
  return (
    <section aria-labelledby="page-h1" className="sz-intake-step">
      <Chip variant="mono-meta" tone="neutral">
        STEP 02 · INTAKE · CHOOSE DEPTH
      </Chip>
      <div>
        <Chip variant="mono-meta" tone="emphasis">
          AUDIT PRODUCT: {product} · {productPlainEnglish}
        </Chip>
      </div>
      <h1 id="page-h1">How deep?</h1>
      <p className="body-lg">Quick is the default for most first audits.</p>

      <Form>
        <fieldset className="sz-intake-fieldset">
          <legend className="sz-sr-only">Pick a depth</legend>
          <div className="sz-intake-grid sz-intake-grid-2" role="radiogroup">
            <Card
              variant="default"
              eyebrow={<span className="sz-mono-meta">DEFAULT</span>}
              heading="Quick"
              body="10–15 minutes. Optic, Halo, and Proof reviewers."
              mono="Most first audits"
              interactive
              onClick={() => setDepth("quick")}
              className={depth === "quick" ? "sz-card--checked" : undefined}
            />
            <Card
              variant="default"
              heading="Comprehensive"
              body="20–45 minutes. All six reviewers plus Jury synthesis."
              mono="Pre-launch quality bar"
              interactive
              onClick={() => setDepth("comprehensive")}
              className={depth === "comprehensive" ? "sz-card--checked" : undefined}
            />
          </div>
        </fieldset>

        {showSkuMismatchWarning ? (
          <div className="sz-soft-warning" id="sz-sku-mismatch">
            <p>
              Comprehensive needs the <strong>Code</strong> audit — the deeper
              tier that reads your repo source. Upgrade, or run{" "}
              <strong>Quick</strong> on the Surface audit (what we can see
              from your URL alone).
            </p>
          </div>
        ) : null}
      </Form>

      <div className="sz-intake-actions">
        <Button variant="ghost" size="md" onClick={() => setStep(1)}>
          Back
        </Button>
        <Button
          variant="primary"
          size="lg"
          onClick={handleStart}
          loading={starting}
          arrow
        >
          {starting ? "Starting" : "Start audit"}
        </Button>
      </div>
    </section>
  );
}
