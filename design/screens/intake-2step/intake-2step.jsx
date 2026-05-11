/* ─────────────────────────────────────────────────────────────────────────────
 * Studio Zero — Intake 2-Step Picker prototype
 * Route: /app/projects/new  (Step 1)
 *        /app/projects/new?step=2  (Step 2)
 * Brand: Direction A v0.1.1
 *
 * The Hick's-Law fix made real. 27-combination intake matrix collapses to
 * 3 + (2 visible | 3 with disclosure) decisions in sequence. PRD §7.2 Step A+B.
 *
 * Implementations of:
 *  - Compass AH-4 — SKU plain-English subtitles on the audit-product chip.
 *  - Compass AH-6 (MVP minimum) — optional client-tag input at Step 1.
 *  - Halo focus-restoration — back-from-Step-2 returns focus to the
 *    previously selected Step-1 card.
 *  - Trace S7 — soft warning banner on SKU/depth mismatch.
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
  Form,
  Input,
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

// ─────────────────────────────────────────────────────────────────────────────
// Step indicator — not on Canvas's 14 manifest. Spec'd inline as a Placeholder
// so Canvas can pick it up; the rendered fallback uses an ordered list with
// aria-current="step" so the SR semantics ship even before the component does.
// ─────────────────────────────────────────────────────────────────────────────
function StepIndicator({ current = 1, total = 3 }) {
  return (
    <ol className="sz-step-indicator" aria-label={`Step ${current} of ${total}`}>
      {Array.from({ length: total }).map((_, i) => {
        const n = i + 1;
        const active = n === current;
        const done = n < current;
        return (
          <li
            key={n}
            className={`step-dot${active ? ' active' : ''}${done ? ' done' : ''}`}
            aria-current={active ? 'step' : undefined}
          >
            <span className="sz-sr-only">
              Step {n}{active ? ' (current)' : done ? ' (completed)' : ''}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 1 — "What do you have?"
// ─────────────────────────────────────────────────────────────────────────────
function Step1({ selected, onSelect, clientTag, onClientTag, onContinue, onBack }) {
  const cards = [
    {
      id: 'github',
      heading: 'GitHub repo',
      body: 'Install our GitHub App on one repo. Read-only access to the source.',
      mono: 'BYOK · Managed',
      // CLI mode disables this card per Trace S6.
      disabled: false,
    },
    {
      id: 'url',
      heading: 'Paste a URL you own',
      body: 'Free Surface audit on a URL you own. Email verification required.',
      mono: 'Free tier · BYOK · Managed',
      disabled: false,
    },
    {
      id: 'local',
      heading: 'Local folder',
      body: 'CLI mode only. Source never leaves your machine. Watermarked verdict.',
      mono: 'CLI',
      disabled: false,
    },
  ];

  return (
    <section aria-labelledby="step1-h1" className="sz-intake-step">
      <Chip variant="mono-meta" tone="neutral">
        STEP 01 · INTAKE · CHOOSE WHAT YOU HAVE
      </Chip>

      <StepIndicator current={1} total={3} />

      <h1 id="step1-h1" tabIndex={-1}>
        What do you have?
      </h1>

      <p className="body-lg">
        We&apos;ll pick the audit product for you. You can change your mind on
        the next step.
      </p>

      {/*
        Radiogroup pattern: <Card interactive> wraps a hidden <input type="radio">.
        Canvas's <Card> reads aria-checked from the input state. Arrow keys move
        focus between cards per WAI-ARIA radiogroup pattern.
      */}
      <Form aria-labelledby="step1-h1">
        <fieldset className="sz-intake-fieldset">
          <legend className="sz-sr-only">Pick an intake method</legend>
          <div className="sz-intake-grid" role="radiogroup">
            {cards.map((c) => (
              <Card
                key={c.id}
                variant="default"
                interactive
                as="label"
                checked={selected === c.id}
                disabled={c.disabled}
                aria-checked={selected === c.id}
                heading={c.heading}
                body={c.body}
                mono={c.mono}
                input={
                  <input
                    type="radio"
                    name="intake"
                    value={c.id}
                    checked={selected === c.id}
                    onChange={() => onSelect(c.id)}
                    className="sz-sr-only"
                  />
                }
              />
            ))}
          </div>
        </fieldset>

        <details className="sz-advanced">
          <summary>Advanced — optional</summary>
          <Input
            label="Client tag for this project"
            helpText="Optional. Lets you group projects by client later."
            name="client_tag"
            autoComplete="off"
            placeholder="e.g. Acme Co."
            value={clientTag}
            onChange={(e) => onClientTag(e.target.value)}
          />
        </details>
      </Form>

      <div className="sz-intake-actions">
        <Button variant="ghost" size="md" onClick={onBack}>
          Back to dashboard
        </Button>
        <Button
          variant="primary"
          size="lg"
          disabled={!selected}
          aria-disabled={!selected}
          onClick={onContinue}
          arrow
        >
          Save and continue
        </Button>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 2 — "How deep?"
// Audit-product chip per Compass AH-4 carries plain-English subtitle.
// ─────────────────────────────────────────────────────────────────────────────
function Step2({
  intake,
  depth,
  onDepth,
  customReviewers,
  onCustomReviewers,
  showSkuMismatchWarning,
  onBack,
  onStart,
}) {
  // Audit-product derivation from intake (PRD §7.2 Step A table).
  const product = intake === 'github' ? 'CODE'
                 : intake === 'local' ? 'CODE'
                 : 'SURFACE';
  const productPlainEnglish = product === 'SURFACE'
    ? 'audits the live site'
    : product === 'CODE'
      ? 'audits the source code'
      : 'audits both';

  return (
    <section aria-labelledby="step2-h1" className="sz-intake-step">
      <Chip variant="mono-meta" tone="neutral">
        STEP 02 · INTAKE · CHOOSE DEPTH
      </Chip>

      <StepIndicator current={2} total={3} />

      {/* Compass AH-4 critical fix: SKU + plain-English subtitle. */}
      <Chip variant="mono-meta" tone="emphasis">
        AUDIT PRODUCT: {product} · {productPlainEnglish}
      </Chip>

      <h1 id="step2-h1" tabIndex={-1}>
        How deep?
      </h1>

      <p className="body-lg">
        Quick is the default for most first audits.
      </p>

      <Form aria-labelledby="step2-h1">
        <fieldset className="sz-intake-fieldset">
          <legend className="sz-sr-only">Pick a depth</legend>
          <div className="sz-intake-grid sz-intake-grid-2" role="radiogroup">
            <Card
              variant="default"
              interactive
              as="label"
              checked={depth === 'quick'}
              aria-checked={depth === 'quick'}
              heading="Quick"
              eyebrow="Default"
              body="10–15 minutes. Optic, Halo, and Proof reviewers."
              mono="Most first audits"
              input={
                <input
                  type="radio"
                  name="depth"
                  value="quick"
                  checked={depth === 'quick'}
                  onChange={() => onDepth('quick')}
                  className="sz-sr-only"
                />
              }
            />
            <Card
              variant="default"
              interactive
              as="label"
              checked={depth === 'comprehensive'}
              aria-checked={depth === 'comprehensive'}
              heading="Comprehensive"
              body="20–45 minutes. All six reviewers plus Jury synthesis."
              mono="Pre-launch quality bar"
              input={
                <input
                  type="radio"
                  name="depth"
                  value="comprehensive"
                  checked={depth === 'comprehensive'}
                  onChange={() => onDepth('comprehensive')}
                  className="sz-sr-only"
                />
              }
            />
          </div>
        </fieldset>

        {/* Advanced disclosure: 6-reviewer multi-select per PRD §9.3. */}
        <details className="sz-advanced">
          <summary>Advanced — pick reviewers individually</summary>
          <fieldset className="sz-advanced-fieldset">
            <legend>Pick reviewers</legend>
            <p className="sz-help">At least one reviewer required.</p>
            {['Optic', 'Halo', 'Proof', 'Compass', 'Canon', 'Compass+Audience'].map((r) => (
              <label key={r} className="sz-checkbox">
                <input
                  type="checkbox"
                  checked={customReviewers.includes(r)}
                  onChange={(e) => {
                    const next = e.target.checked
                      ? [...customReviewers, r]
                      : customReviewers.filter((x) => x !== r);
                    onCustomReviewers(next);
                  }}
                />
                <span>{r}</span>
              </label>
            ))}
          </fieldset>
        </details>

        {/* Persistent soft warning — visible banner (Optic F4: plain-English SKU clarifier).
            HF-S3-1: no role="status" here (Canvas A2-1 reserves it for verdict-card h1 +
            live-progress-region wrapper only). Appearance of this banner publishes via
            the app-shell live region: AppShell consumer should call
            announce("SKU mismatch — Comprehensive needs the Code audit") when
            showSkuMismatchWarning transitions false→true. */}
        {showSkuMismatchWarning ? (
          <div className="sz-soft-warning" id="sz-sku-mismatch">
            <p>
              Comprehensive needs the <strong>Code</strong> audit — the deeper tier
              that reads your repo source. Upgrade, or run <strong>Quick</strong> on
              the Surface audit (what we can see from your URL alone).
            </p>
          </div>
        ) : null}
      </Form>

      <div className="sz-intake-actions">
        <Button variant="ghost" size="md" onClick={onBack}>
          Back
        </Button>
        <Button variant="primary" size="lg" onClick={onStart} arrow>
          Start audit
        </Button>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sidebar (shared across app shell).
// ─────────────────────────────────────────────────────────────────────────────
function AppSidebar() {
  return (
    <Sidebar
      aria-label="Primary"
      items={[
        { href: '/app', label: 'Dashboard', icon: 'home' },
        { href: '/app/projects', label: 'Projects', icon: 'folder' },
        { href: '/app/projects/new', label: 'New audit', icon: 'plus', current: true },
        { href: '/app/settings', label: 'Settings', icon: 'sliders' },
      ]}
      collapse="auto"
    />
  );
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

// ─────────────────────────────────────────────────────────────────────────────
// Page composition with controlled state.
// ─────────────────────────────────────────────────────────────────────────────
export default function IntakeTwoStepScreen({ initialStep = 1 }) {
  const [step, setStep] = useState(initialStep);
  const [intake, setIntake] = useState(null);
  const [clientTag, setClientTag] = useState('');
  const [depth, setDepth] = useState('quick');
  const [customReviewers, setCustomReviewers] = useState([]);

  // Halo HC focus-restoration: on back-from-Step-2, send focus to the previously
  // selected intake card. Canvas's <Card interactive> exposes an imperative
  // focus method when used as a label. (Spec'd here as the contract; the
  // implementation lives in the page-level hook on real build.)
  const handleBackToStep1 = () => {
    setStep(1);
    // queueMicrotask(() => document.querySelector(`[data-intake-id="${intake}"]`)?.focus());
  };

  // Trace S7 soft-warning derivation.
  const showSkuMismatchWarning =
    depth === 'comprehensive' && intake === 'url'; // URL intake → Surface SKU.

  return (
    <div className="sz-app-shell">
      <SkipLink />
      <header><AppHeader /></header>

      <div className="sz-app-body">
        <aside className="sz-app-aside" aria-label="Primary navigation">
          <AppSidebar />
        </aside>

        <main id="main" className="sz-app-main">
          {step === 1 ? (
            <Step1
              selected={intake}
              onSelect={setIntake}
              clientTag={clientTag}
              onClientTag={setClientTag}
              onBack={() => { window.location.href = '/app'; }}
              onContinue={() => setStep(2)}
            />
          ) : (
            <Step2
              intake={intake}
              depth={depth}
              onDepth={setDepth}
              customReviewers={customReviewers}
              onCustomReviewers={setCustomReviewers}
              showSkuMismatchWarning={showSkuMismatchWarning}
              onBack={handleBackToStep1}
              onStart={() => { /* dispatch to /app/audits/[run-id] */ }}
            />
          )}
        </main>
      </div>
    </div>
  );
}
