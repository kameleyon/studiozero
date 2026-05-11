/* ─────────────────────────────────────────────────────────────────────────────
 * Studio Zero — Verdict FAIL screen prototype
 * Route: /app/audits/[run-id]  (verdict === FAIL, current_sku === Surface)
 * Brand: Direction A v0.1.1
 *
 * PRD §7.2 Step D — locked v0.4 (Herald + Hook + Optic + Halo).
 * Every word of body copy is quoted verbatim from
 *   brand/samples/03-fail-verdict-body.md
 *
 * Implements:
 *  - PRD §7.2 Step D verdict header (text + icon + color · SC 1.4.1).
 *  - HC1 — <h1 role="status"> on the verdict line.
 *  - HC3 — radar chart + semantic <table> sibling.
 *  - Compass AH-2 — findings grouped by category (default), not by reviewer.
 *  - Compass AH-5 — D2 free-tier "FREE · UNLIMITED RE-AUDITS ON THIS PROJECT" chip.
 *  - Herald sample 02 §2 — locked "Run the Code audit →" primary CTA.
 *
 * Pixel — Design layer, Phase 4
 * ─────────────────────────────────────────────────────────────────────────── */

import { useState } from 'react';
import {
  Nav,
  Sidebar,
  Card,
  Button,
  Chip,
  Table,
  VerdictCard,
  ScoreDisplay,
  FindingsRow,
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
        { href: '/app/projects', label: 'Projects', icon: 'folder', current: true },
        { href: '/app/projects/new', label: 'New audit', icon: 'plus' },
        { href: '/app/settings', label: 'Settings', icon: 'sliders' },
      ]}
      collapse="auto"
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Fixture — the rendered findings on this hero example.
// 14 findings, grouped by category (Compass AH-2 default).
// ─────────────────────────────────────────────────────────────────────────────
const FINDINGS_FIXTURE = [
  // ── Accessibility (5)
  { id: 'F-007', severity: 'blocker', reviewer: 'Halo', category: 'Accessibility',
    title: 'Form labels missing on /signup inputs',
    whatWeFound:
      'The email and password inputs on /signup are missing programmatic labels. Screen-reader users hear "edit text, blank" and have to guess what to type.',
    whyItMatters:
      'WCAG 2.2 AA, success criterion 1.3.1 (Info and Relationships) and 3.3.2 (Labels or Instructions). One in five visitors uses an assistive technology at some point — they\'ll bounce.',
    fix:
      'In app/signup/page.tsx, lines 42–58, add an aria-label or a visible <label for="…"> to each <input>.',
  },
  { id: 'F-008', severity: 'blocker', reviewer: 'Halo', category: 'Accessibility',
    title: 'Focus order is non-sequential on /dashboard',
    whatWeFound: 'Tab moves from header to footer-sidebar before reaching the main content region.',
    whyItMatters: 'SC 2.4.3 Focus Order. Keyboard-only users lose context every entry.',
    fix: 'app/dashboard/layout.tsx — wrap <main> with tabindex=-1 and reorder skip-link target.',
  },
  { id: 'F-021', severity: 'critical', reviewer: 'Halo', category: 'Accessibility',
    title: 'Insufficient contrast on disclaimer text',
    whatWeFound: 'Footer disclaimer renders #808080 on #ffffff — 4.0:1.',
    whyItMatters: 'SC 1.4.3 — body text fails AA at 4.5:1.',
    fix: 'Swap the disclaimer color token to --ink-1.',
  },
  // ── UX (3)
  { id: 'F-014', severity: 'critical', reviewer: 'Optic', category: 'UX',
    title: 'Pricing CTA below the fold at 768px',
    whatWeFound: 'Mobile breakpoint hides "Get started" below the first 100vh.',
    whyItMatters: 'Hick\'s + Fitts\'s — the primary action must be reachable without scroll on the activation surface.',
    fix: 'Reorder hero sections; sticky CTA at <md breakpoint.',
  },
  // ── Copy (3)
  { id: 'F-031', severity: 'critical', reviewer: 'Proof', category: 'Copy',
    title: 'Marketing claim "10x faster" lacks substantiation',
    whatWeFound: 'Landing hero states "10x faster than competitors" without a citation.',
    whyItMatters: 'FTC advertising substantiation — comparative claims require evidence on file.',
    fix: 'Either remove the claim or attach a substantiation file in marketing/claims-substantiation/.',
  },
  // ── Brand (3)
  { id: 'F-042', severity: 'major', reviewer: 'Canon', category: 'Brand',
    title: 'Heading typeface inconsistent across pages',
    whatWeFound: '/about uses Inter; rest of site uses the brand sans token.',
    whyItMatters: 'Brand consistency — the wordmark is the only identifier; type drift dilutes recall.',
    fix: 'Replace Inter import on app/about/page.tsx with the brand --font-sans token.',
  },
  // (8 more findings elided for prototype brevity; total renders 14.)
];

// ─────────────────────────────────────────────────────────────────────────────
// Findings toolbar — HB-6a 3 controls.
// ─────────────────────────────────────────────────────────────────────────────
function FindingsToolbar({ group, onGroupChange }) {
  return (
    <Placeholder
      kind="component"
      name="FindingsToolbar"
      note="3 peer controls: Filter · Group (default 'category' per Compass AH-2) · Sort. Canvas v0.2."
    >
      <div style={{ marginTop: 8, font: 'var(--fs-mono-data)/1.4 var(--font-mono)', textTransform: 'uppercase' }}>
        GROUP: {group.toUpperCase()} (default)
      </div>
    </Placeholder>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main verdict region. <VerdictCard> is a Canvas primitive on the 14-list.
// ─────────────────────────────────────────────────────────────────────────────
function VerdictHero({ findingsCount }) {
  return (
    <VerdictCard
      variant="fail"
      verdict="FAIL"
      score={68}
      total={100}
      // The <h1> inside <VerdictCard> carries role="status" per PRD §7.2 Step D + HC1.
      headingText="Audit complete · FAIL"
      // Locked Herald sample 03 paragraphs.
      bodyParagraphs={[
        'We found 14 issues across UX, accessibility, and brand consistency. Here\'s every one, with the evidence.',
        'Most first audits do not pass our gate — that\'s the design. Every finding below names a file, a line, and a fix.',
      ]}
      primaryCta={
        <Button variant="primary" size="lg" href={`/app/audits/run-1234/upgrade`} arrow>
          Run the Code audit
        </Button>
      }
      secondaryCta={
        // Note: "Export report" per Herald sample 02 §5, not "Export the report".
        <Button variant="ghost" size="md" href={`/app/audits/run-1234/export`}>
          Export report
        </Button>
      }
    >
      {/* Compass AH-5 — D2 free-tier chip. Slotted under the score. */}
      <Chip variant="free-tier" tone="neutral">
        FREE · UNLIMITED RE-AUDITS ON THIS PROJECT
      </Chip>
    </VerdictCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Score breakdown — HC3 radar + table sibling.
// ─────────────────────────────────────────────────────────────────────────────
function ScoreBreakdown() {
  const categories = [
    { name: 'UX',            score: 72 },
    { name: 'Accessibility', score: 54 },
    { name: 'Copy',          score: 65 },
    { name: 'Brand',         score: 70 },
    { name: 'Flow',          score: 74 },
    { name: 'Audience',      score: 71 },
  ];

  return (
    <section aria-labelledby="score-h2" className="sz-score-section">
      <h2 id="score-h2">Score breakdown</h2>
      <ScoreDisplay
        variant="radar-with-table"
        total={68}
        categories={categories}
        // Both chart and table render; chart is aria-hidden; table is the AT surface.
        viewMode="both"
      />
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Findings list — Compass AH-2: group by CATEGORY (default), reviewer is secondary.
// ─────────────────────────────────────────────────────────────────────────────
function FindingsList() {
  const [expanded, setExpanded] = useState(new Set());
  const [group, setGroup] = useState('category');

  // Group findings by the active group key.
  const groups = FINDINGS_FIXTURE.reduce((acc, f) => {
    const key = group === 'category' ? f.category : f.severity;
    if (!acc[key]) acc[key] = [];
    acc[key].push(f);
    return acc;
  }, {});

  const toggle = (id) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <section aria-labelledby="findings-h2" className="sz-findings-section">
      <h2 id="findings-h2">Findings</h2>

      {/* Locked preamble per Herald sample 03. */}
      <p className="findings-intro">
        14 findings, grouped by severity. Expand any row for the evidence and the
        recommended fix.
      </p>

      {/* Locked severity count line — middle-dot separator. */}
      <p className="severity-counts">
        Blockers (2) · Critical (4) · Major (5) · Minor (3) · Polish (0)
      </p>

      <FindingsToolbar group={group} onGroupChange={setGroup} />

      {/* Compass AH-2 default: group by category. */}
      <Table variant="findings-list" role="region" aria-label="Findings list">
        {Object.entries(groups).map(([groupKey, items]) => (
          <div key={groupKey} className="sz-findings-group">
            <h3 className="sz-findings-group-heading">
              {groupKey} <span className="sz-mono-meta">({items.length})</span>
            </h3>
            {items.map((f) => (
              <FindingsRow
                key={f.id}
                findingId={f.id}
                severity={f.severity}
                reviewer={f.reviewer}
                category={f.category}
                title={f.title}
                whatWeFound={f.whatWeFound}
                whyItMatters={f.whyItMatters}
                fix={f.fix}
                expanded={expanded.has(f.id)}
                onToggle={() => toggle(f.id)}
                actions={[
                  { label: 'Copy fix', onClick: () => navigator.clipboard?.writeText(f.fix) },
                  { label: 'Mark won\'t-fix', onClick: () => {} },
                ]}
              />
            ))}
          </div>
        ))}
      </Table>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page composition.
// ─────────────────────────────────────────────────────────────────────────────
export default function VerdictFailScreen() {
  return (
    <div className="sz-app-shell">
      <SkipLink />
      <header><AppHeader /></header>

      <div className="sz-app-body">
        <aside className="sz-app-aside" aria-label="Primary navigation">
          <AppSidebar />
        </aside>

        <main id="main" className="sz-app-main" aria-labelledby="verdict-h1">
          <VerdictHero findingsCount={14} />
          <ScoreBreakdown />
          <FindingsList />
        </main>
      </div>
    </div>
  );
}
