/* ─────────────────────────────────────────────────────────────────────────────
 * Studio Zero — Settings root prototype
 * Route: /app/settings
 * Brand: Direction A v0.1.1
 *
 * Three-group IA per Optic OPT-M3 + HB-4:
 *   Account (5 panels)
 *   Integrations (3 panels)
 *   Billing & Data (7 panels)
 *   Team V2 (disabled placeholder)
 *
 * Each row surfaces its current state on the card per OPT-M3 H6
 * (recognition over recall).
 *
 * Motion: NONE beyond default form-input focus rings per usage-rules.md.
 * Settings are work, not theatre.
 *
 * Pixel — Design layer, Phase 4
 * ─────────────────────────────────────────────────────────────────────────── */

import {
  Nav,
  Sidebar,
  Card,
  Button,
  Chip,
} from '../../components';

function Placeholder({ kind, name, note, ariaHidden, children, ...rest }) {
  return (
    <div
      data-placeholder={name}
      data-kind={kind}
      aria-hidden={ariaHidden ?? false}
      style={{
        border: '1px dashed var(--line-2)',
        borderRadius: 'var(--r)',
        padding: 'var(--sp-8)',
        color: 'var(--ink-2)',
        font: 'var(--fs-mono-meta)/1.4 var(--font-mono)',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
      }}
      {...rest}
    >
      <span>[ placeholder: {name} · {kind} ]</span>
      {note ? <div style={{ marginTop: 4, textTransform: 'none', letterSpacing: 0 }}>{note}</div> : null}
      {children}
    </div>
  );
}

function SkipLink() {
  return <a className="sz-skip-link" href="#main">Skip to content</a>;
}

function AppHeader() {
  return (
    <Nav
      variant="app"
      sticky
      brandLockup={
        <span className="brand">
          <span className="brand-mark" aria-hidden="true" />
          {' Studio · Zero'}
        </span>
      }
      right={[
        <Button key="bell" variant="ghost" size="icon" aria-label="Notifications" aria-haspopup="dialog" href="/app/notifications">
          <Placeholder kind="icon" name="bell" ariaHidden />
        </Button>,
        <Placeholder key="user-menu" kind="component" name="UserMenu" note="Canvas v0.2." />,
      ]}
    />
  );
}

function AppSidebar() {
  return (
    <Sidebar
      aria-label="Primary"
      items={[
        { href: '/app', label: 'Dashboard', icon: 'home' },
        { href: '/app/projects', label: 'Projects', icon: 'folder' },
        { href: '/app/projects/new', label: 'New audit', icon: 'plus' },
        { href: '/app/settings', label: 'Settings', icon: 'sliders', current: true },
      ]}
      collapse="auto"
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SettingsRow primitive — not on Canvas's 14 manifest. Inline spec for now;
// flag for Canvas v0.2 as a thin primitive: title + state + chevron + variant.
// ─────────────────────────────────────────────────────────────────────────────
function SettingsRow({ href, title, stateText, destructive = false, disabled = false }) {
  if (disabled) {
    return (
      <li className="sz-settings-row sz-settings-row-disabled" aria-disabled="true">
        <h3 className="sz-settings-row-title">{title}</h3>
        <span className="sz-settings-row-state sz-mono-meta">{stateText}</span>
      </li>
    );
  }
  return (
    <li className="sz-settings-row">
      <a
        href={href}
        className={
          'sz-settings-row-link sz-focus-ring' +
          (destructive ? ' sz-destructive sz-focus-ring-emphasis' : '')
        }
      >
        <h3 className="sz-settings-row-title">{title}</h3>
        <span className="sz-settings-row-state sz-mono-meta">{stateText}</span>
        <span className="sz-settings-row-chevron" aria-hidden="true">→</span>
      </a>
    </li>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Group card — each group is a <section aria-labelledby> for landmark nav.
// ─────────────────────────────────────────────────────────────────────────────
function SettingsGroup({ id, heading, children }) {
  return (
    <section aria-labelledby={`${id}-h2`} className="sz-settings-group">
      <Card variant="default" padding="lg">
        <h2 id={`${id}-h2`} className="sz-settings-group-heading">
          {heading}
        </h2>
        <ul className="sz-settings-row-list">{children}</ul>
      </Card>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page composition.
// ─────────────────────────────────────────────────────────────────────────────
export default function SettingsRootScreen() {
  return (
    <div className="sz-app-shell">
      <SkipLink />
      <header><AppHeader /></header>

      <div className="sz-app-body">
        <aside className="sz-app-aside" aria-label="Primary navigation">
          <AppSidebar />
        </aside>

        <main id="main" className="sz-app-main" aria-labelledby="page-h1">
          <Chip variant="mono-meta" tone="neutral">SETTINGS</Chip>

          <h1 id="page-h1" tabIndex={-1}>Settings</h1>

          <p className="body-lg">
            Three groups. Each panel shows its current state on the card —
            change details inside.
          </p>

          {/* ── Group 1: Account (5 panels) ─────────────────────────────── */}
          <SettingsGroup id="account" heading="Account">
            <SettingsRow
              href="/app/settings/account"
              title="Profile"
              stateText="JO · JO@STUDIOZERO.DEV"
            />
            <SettingsRow
              href="/app/settings/account/notifications"
              title="Notifications"
              stateText="3 ENABLED"
            />
            <SettingsRow
              href="/app/settings/account/consent"
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

          {/* ── Group 2: Integrations (3 panels) ────────────────────────── */}
          <SettingsGroup id="integrations" heading="Integrations">
            <SettingsRow
              href="/app/settings/integrations/byok"
              title="Anthropic API key (BYOK)"
              stateText="VALIDATED 3D AGO"
            />
            <SettingsRow
              href="/app/settings/integrations/cli"
              title="CLI pairings"
              stateText="1 DEVICE"
            />
            <SettingsRow
              href="/app/settings/integrations/github"
              title="GitHub App"
              stateText="ON 2 REPOS"
            />
          </SettingsGroup>

          {/* ── Group 3: Billing & Data (7 panels — HB-4c WARN at the ceiling) ── */}
          <SettingsGroup id="billing-data" heading="Billing & Data">
            <SettingsRow
              href="/app/settings/billing/plan"
              title="Plan"
              stateText="BYOK STARTER · $29 / MO"
            />
            <SettingsRow
              href="/app/settings/billing/invoices"
              title="Invoices"
              stateText="3 PAID"
            />
            <SettingsRow
              href="/app/settings/billing/payment-method"
              title="Payment method"
              stateText="VISA •••• 4242"
            />
            <SettingsRow
              href="/app/settings/billing/cancel"
              title="Cancel plan"
              stateText="AVAILABLE · FTC CLICK-TO-CANCEL"
              destructive
            />
            <SettingsRow
              href="/app/settings/billing/dispute"
              title="Dispute a charge"
              stateText="NO ACTIVE DISPUTES"
            />
            <SettingsRow
              href="/app/settings/data/retention"
              title="Findings retention"
              stateText="30 DAYS"
            />
            <SettingsRow
              href="/app/settings/data/findings-export"
              title="Findings JSON · CSV export"
              stateText="READY"
            />
          </SettingsGroup>

          {/* ── Group 4: Team — V2 placeholder, feature-flagged disabled ── */}
          <SettingsGroup id="team" heading="Team">
            <SettingsRow
              title="Team members"
              stateText="V2 — COMING LATER"
              disabled
            />
          </SettingsGroup>
        </main>
      </div>
    </div>
  );
}
