"use client";

import * as React from "react";

import { Button } from "../../../../../components/Button";
import { Chip } from "../../../../../components/Chip";
import { Form } from "../../../../../components/Form";

/**
 * /app/settings/data/consent — Cookie + telemetry consent.
 *
 * GDPR + ePrivacy + UK PECR granular consent per PRD §6.1. Three
 * categories: necessary (forced on) · analytics · marketing.
 *
 * Mock persists to component state only. M1+1 writes to
 * `consent_records` table via Atlas.
 */
export default function ConsentPage(): React.ReactElement {
  const [analytics, setAnalytics] = React.useState<boolean>(false);
  const [marketing, setMarketing] = React.useState<boolean>(false);
  const [saved, setSaved] = React.useState<boolean>(false);

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <>
      <p className="sz-demo-banner">
        <strong>Demo mode.</strong> Consent persists to component state only.
      </p>
      <Chip variant="mono-meta" tone="neutral">DATA · CONSENT</Chip>
      <h1 id="page-h1">Cookies + telemetry</h1>
      <p className="body-lg">
        Three categories. Necessary cookies are required (session, security).
        Analytics and marketing are opt-in and off by default.
      </p>

      <Form onSubmit={handleSubmit}>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-12)" }}>
          <label style={{ display: "flex", gap: "var(--sp-12)", alignItems: "center" }}>
            <input type="checkbox" checked disabled />
            <span>
              <strong>Necessary</strong> — session, security, CSRF. Always on.
            </span>
          </label>
          <label style={{ display: "flex", gap: "var(--sp-12)", alignItems: "center" }}>
            <input
              type="checkbox"
              checked={analytics}
              onChange={(e) => setAnalytics(e.target.checked)}
            />
            <span>
              <strong>Analytics</strong> — aggregate usage. We HMAC the
              tenant_id before sending; no raw UUID leaves our infra.
            </span>
          </label>
          <label style={{ display: "flex", gap: "var(--sp-12)", alignItems: "center" }}>
            <input
              type="checkbox"
              checked={marketing}
              onChange={(e) => setMarketing(e.target.checked)}
            />
            <span>
              <strong>Marketing</strong> — re-engagement emails outside the
              transactional set.
            </span>
          </label>
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
