/**
 * /app/settings — Settings root.
 *
 * Composition: Pixel's `settings-root.jsx`. Three groups (Account ·
 * Integrations · Billing & Data) + Team V2 placeholder.
 *
 * Halo: every row surfaces its current state on the card (Optic OPT-M3 H6
 * recognition-over-recall).
 */
import * as React from "react";

import { Card } from "../../../components/Card";
import { Chip } from "../../../components/Chip";

interface SettingsRowProps {
  href?: string;
  title: string;
  stateText: string;
  destructive?: boolean;
  disabled?: boolean;
}

function SettingsRow({
  href,
  title,
  stateText,
  destructive,
  disabled,
}: SettingsRowProps): React.ReactElement {
  if (disabled || !href) {
    return (
      <li className="sz-settings-row sz-settings-row-disabled">
        <h3 className="sz-settings-row-title">{title}</h3>
        <span className="sz-settings-row-state">{stateText} (disabled)</span>
      </li>
    );
  }
  return (
    <li className="sz-settings-row">
      <a
        href={href}
        className={`sz-settings-row-link${destructive ? " sz-destructive" : ""}`}
      >
        <h3 className="sz-settings-row-title">{title}</h3>
        <span className="sz-settings-row-state">{stateText}</span>
        <span className="sz-settings-row-chevron" aria-hidden="true">
          →
        </span>
      </a>
    </li>
  );
}

interface SettingsGroupProps {
  id: string;
  heading: string;
  children: React.ReactNode;
}

function SettingsGroup({
  id,
  heading,
  children,
}: SettingsGroupProps): React.ReactElement {
  return (
    <section aria-labelledby={`${id}-h2`} className="sz-settings-group">
      <Card variant="default">
        <h2 id={`${id}-h2`} className="sz-settings-group-heading">
          {heading}
        </h2>
        <ul className="sz-settings-row-list">{children}</ul>
      </Card>
    </section>
  );
}

export const metadata = { title: "Settings" };

export default function SettingsPage(): React.ReactElement {
  return (
    <>
      <Chip variant="mono-meta" tone="neutral">SETTINGS</Chip>
      <h1 id="page-h1">Settings</h1>
      <p className="body-lg">
        Three groups. Each panel shows its current state on the card —
        change details inside.
      </p>

      <SettingsGroup id="account" heading="Account">
        <SettingsRow
          href="/app/settings/account"
          title="Profile"
          stateText="DEMO · DEMO-ALPHA@EXAMPLE.COM"
        />
        <SettingsRow
          href="/app/settings/account/notifications"
          title="Notifications"
          stateText="3 ENABLED"
        />
        <SettingsRow
          href="/app/settings/data/consent"
          title="Consent · AI training opt-in"
          stateText="ANALYTICS: OFF"
        />
        <SettingsRow
          href="/app/settings/account/export"
          title="Export your data"
          stateText="GDPR ART. 20 · READY"
        />
        <SettingsRow
          href="/app/settings/account/delete"
          title="Delete account"
          stateText="RE-AUTH REQUIRED"
          destructive
        />
      </SettingsGroup>

      <SettingsGroup id="integrations" heading="Integrations">
        <SettingsRow
          href="/app/settings/integrations/byok"
          title="Anthropic API key (BYOK)"
          stateText="VALIDATED 3D AGO · DEMO"
        />
        <SettingsRow
          href="/app/settings/integrations/cli"
          title="CLI pairings"
          stateText="0 DEVICES"
        />
        <SettingsRow
          href="/app/settings/integrations/github"
          title="GitHub App"
          stateText="ON 1 REPO · DEMO"
        />
      </SettingsGroup>

      <SettingsGroup id="billing-data" heading="Billing & Data">
        <SettingsRow
          href="/app/settings/billing"
          title="Plan"
          stateText="BYOK STARTER · $29 / MO · DEMO"
        />
        <SettingsRow
          href="/app/settings/billing"
          title="Invoices"
          stateText="0 PAID · DEMO"
        />
        <SettingsRow
          href="/app/settings/data/retention"
          title="Findings retention"
          stateText="30 DAYS"
        />
        <SettingsRow
          href="/app/settings/data/consent"
          title="Cookie + telemetry consent"
          stateText="ANALYTICS: OFF"
        />
      </SettingsGroup>

      <SettingsGroup id="team" heading="Team">
        <SettingsRow title="Team members" stateText="V2 — COMING LATER" disabled />
      </SettingsGroup>
    </>
  );
}
