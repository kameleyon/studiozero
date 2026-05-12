"use client";

import * as React from "react";

import { Button } from "../../../../../components/Button";
import { Chip } from "../../../../../components/Chip";
import { Form } from "../../../../../components/Form";

/**
 * /app/settings/data/retention — Customer code retention setting.
 *
 * Per PRD §14.4 + signup-to-first-verdict.md: customer code retention
 * defaults to 7 days, 0–30 customer-overridable. Findings + verdicts +
 * scores retained 24 months regardless.
 *
 * Mock: setting persists to component state only. M1+1 wires to
 * `tenants.code_retention_days` via Supabase.
 */
export default function RetentionPage(): React.ReactElement {
  const [days, setDays] = React.useState<number>(7);
  const [saved, setSaved] = React.useState<boolean>(false);

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <>
      <p className="sz-demo-banner">
        <strong>Demo mode.</strong> Retention setting persists to component
        state only at M1.
      </p>
      <Chip variant="mono-meta" tone="neutral">BILLING & DATA · RETENTION</Chip>
      <h1 id="page-h1">Findings retention</h1>
      <p className="body-lg">
        How long Studio Zero retains your customer code after a run. Default
        7 days. 0 days means cryptoshred immediately on verdict emission.
      </p>

      <Form onSubmit={handleSubmit}>
        <div>
          <label
            htmlFor="retention-days"
            className="sz-input-label"
            style={{ display: "block", marginBottom: "var(--sp-8)" }}
          >
            Retention (days)
          </label>
          <input
            id="retention-days"
            type="range"
            min={0}
            max={30}
            step={1}
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            style={{ width: "100%", maxWidth: 400 }}
          />
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "var(--fs-mono-data)",
              color: "var(--ink-1)",
              marginTop: "var(--sp-8)",
            }}
          >
            {days === 0
              ? "0 days — cryptoshred immediately"
              : `${days} day${days === 1 ? "" : "s"}`}
          </p>
        </div>
        {saved ? (
          <p style={{ color: "var(--verdict-pass)", fontFamily: "var(--font-mono)" }}>
            Saved.
          </p>
        ) : null}
        <div className="sz-intake-actions">
          <Button variant="ghost" size="md" href="/app/settings">
            Back to settings
          </Button>
          <Button type="submit" variant="primary" size="lg" arrow>
            Save changes
          </Button>
        </div>
      </Form>
    </>
  );
}
