/* ─────────────────────────────────────────────────────────────────────────────
 * Studio Zero — Dashboard first-run prototype
 * Route: /app (when count(projects) === 0)
 * Brand: Direction A v0.1.1
 *
 * Empty-state catalog: ES-DASHBOARD-FIRST-RUN
 * Heuristic: HB-9a (sidebar collapsed to 4 items)
 * Copy: Herald sample 02 + ia/empty-states.md ES-DASHBOARD-FIRST-RUN
 *
 * The dashboard at zero is the activation moment. Single H1, single CTA,
 * restrained motion. Reduced-motion budget per usage-rules.md.
 *
 * Pixel — Design layer, Phase 4
 * ─────────────────────────────────────────────────────────────────────────── */

import {
  Nav, // Canvas — app variant
  Sidebar, // Canvas — primary sidebar nav
  Card, // Canvas — surface primitive
  Button, // Canvas — interactive primitive
  Chip, // Canvas — eyebrow / status
  EmptyState, // Canvas — empty-state composition wrapper
  ModalRoute, // Canvas — modal-as-route primitive (used by notifications drawer)
} from '../../components';

// ─────────────────────────────────────────────────────────────────────────────
// Placeholder primitive (see landing.jsx for full doc).
// ─────────────────────────────────────────────────────────────────────────────
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
  return (
    <a className="sz-skip-link" href="#main">
      Skip to content
    </a>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// App-shell header. Bell + user menu live here; sidebar lives in <aside>.
// ─────────────────────────────────────────────────────────────────────────────
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
      // Mode chip — Canon fix: no green pulse dot. Words carry the state.
      statusChip={
        <Chip variant="mono-meta" tone="neutral">
          MODE: BYOK · KEY VALIDATED · NO RUNS YET
        </Chip>
      }
      // Bell + user menu sit on the right.
      right={[
        <Button
          key="bell"
          variant="ghost"
          size="icon"
          aria-label="Notifications"
          aria-haspopup="dialog"
          href="/app/notifications"
        >
          <Placeholder kind="icon" name="bell" ariaHidden note="16px lucide bell; 24×24 hit area." />
        </Button>,
        <Placeholder
          key="user-menu"
          kind="component"
          name="UserMenu"
          note="Canvas v0.2: dropdown with email + Settings + Log out. <Sidebar> sibling primitive."
        />,
      ]}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sidebar — HB-9a 4-item collapse. Notifications moved to header bell; Help
// moved to footer (footer absent in app shell).
// ─────────────────────────────────────────────────────────────────────────────
function AppSidebar() {
  return (
    <Sidebar
      aria-label="Primary"
      items={[
        { href: '/app', label: 'Dashboard', icon: 'home', current: true },
        { href: '/app/projects', label: 'Projects', icon: 'folder' },
        { href: '/app/projects/new', label: 'New audit', icon: 'plus' },
        { href: '/app/settings', label: 'Settings', icon: 'sliders' },
      ]}
      // Tablet (≤768px) auto-collapses to icon rail; labels remain in DOM as sr-only text.
      collapse="auto"
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main first-run content. Composed via Canvas <EmptyState> wrapper.
// If <EmptyState> doesn't support a `children` slot, fall back to manual.
// ─────────────────────────────────────────────────────────────────────────────
function FirstRunHero() {
  return (
    <EmptyState
      eyebrow={
        <Chip variant="mono-meta" tone="neutral">
          STEP 01 · YOU&apos;RE IN
        </Chip>
      }
      heading={
        <h1 id="page-h1" tabIndex={-1}>
          Run your first audit.
        </h1>
      }
      body={
        <p className="body-lg">
          Connect a repo or paste a URL. We&apos;ll run seven reviewer agents
          and hand you a graded checklist with the evidence.
        </p>
      }
      primaryCta={
        <Button variant="primary" size="lg" href="/app/projects/new" arrow>
          Run your free Surface audit
        </Button>
      }
      secondaryCta={
        <Button variant="ghost" size="md" href="/app/settings">
          Settings
        </Button>
      }
    >
      <hr className="sz-divider" />

      <section aria-labelledby="three-ways-h2" className="explainer">
        <h2 id="three-ways-h2" className="explainer-heading">
          Three ways to start:
        </h2>

        <div className="explainer-grid">
          <Card
            variant="default"
            interactive
            heading="Connect a GitHub repo"
            body="Install our GitHub App on one repo. The audit reads it read-only and never sees the rest."
            mono="BYOK · Managed"
            cta={{ href: '/app/projects/new?intake=github', label: 'Pick this', arrow: true }}
          />
          <Card
            variant="default"
            interactive
            heading="Paste a URL you own"
            body="Free Surface audit on a live page. Email-verification required; we never crawl uninvited."
            mono="Free tier"
            cta={{ href: '/app/projects/new?intake=url', label: 'Pick this', arrow: true }}
          />
          <Card
            variant="default"
            interactive
            heading="Run on your machine"
            body="CLI mode — source stays on your laptop. We watermark the verdict as Private Run · Self-Audited."
            mono="CLI"
            cta={{ href: '/app/projects/new?intake=local', label: 'Pick this', arrow: true }}
          />
        </div>
      </section>
    </EmptyState>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page composition.
// ─────────────────────────────────────────────────────────────────────────────
export default function DashboardFirstRunScreen() {
  return (
    <div className="sz-app-shell">
      <SkipLink />

      <header>
        <AppHeader />
      </header>

      <div className="sz-app-body">
        <aside className="sz-app-aside" aria-label="Primary navigation">
          <AppSidebar />
        </aside>

        <main id="main" className="sz-app-main" aria-labelledby="page-h1">
          <FirstRunHero />
        </main>
      </div>
    </div>
  );
}
