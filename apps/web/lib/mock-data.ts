/**
 * Mock data — Studio Zero Phase 9 M1 starter dispatch.
 *
 * **This module is OBVIOUSLY MOCK.** Alpha users must be able to tell the
 * difference between fixture data and a real audit they paid for. We do that
 * with:
 *  - explicit "Demo " / "example.com" project labels
 *  - fixture findings with paths like `src/MockComponent.tsx`
 *  - JSDoc on every export marking it as mock
 *  - the runId scheme `run-demo-<n>` (never a real UUID)
 *
 * Real wiring lands at M1+1 with Supabase + Anthropic + pg-boss. The shape
 * here mirrors `architecture/schemas/audit-output.v1.schema.json` so the
 * UI doesn't need refactoring when real data lands — only the producer
 * (lib/run-state-machine.ts) swaps to live network calls.
 *
 * Owner: Forge (this dispatch) → Atlas + Forge (M1+1 real-data dispatch).
 */
import type {
  RunState,
  Severity,
  Verdict,
  ReviewerName,
} from "./types";

export type { RunState, Severity, Verdict, ReviewerName } from "./types";

/** Mock user — replaces Supabase Auth `useUser()` hook until M1+1. */
export interface MockUser {
  id: string;
  email: string;
  displayName: string;
  byokVerified: boolean;
  byokKeyFingerprint: string | null;
  modePref: "byok" | "cli" | "managed" | null;
  githubAppInstalled: boolean;
}

export const MOCK_USER: MockUser = {
  // Hardcoded fake UUID — clearly fake (all zeros except last block).
  id: "00000000-0000-0000-0000-000000000001",
  email: "demo-alpha@example.com",
  displayName: "Demo Alpha User",
  byokVerified: true,
  byokKeyFingerprint: "sk-ant-...DEMO",
  modePref: "byok",
  githubAppInstalled: true,
};

/** Mock project — `id` carries the `demo-` prefix so it's obvious. */
export interface MockProject {
  id: string;
  name: string;
  clientTag: string | null;
  intakeMethod: "github" | "url" | "local";
  intakeRef: string;
  createdAt: string;
  lastRunId: string | null;
  lastVerdict: Verdict | null;
}

export const MOCK_PROJECTS: MockProject[] = [
  {
    id: "demo-project-1",
    name: "Demo Project — example.com",
    clientTag: null,
    intakeMethod: "github",
    intakeRef: "demo-org/demo-repo-fail",
    createdAt: "2026-05-08T14:22:00Z",
    lastRunId: "run-demo-1",
    lastVerdict: "FAIL",
  },
  {
    id: "demo-project-2",
    name: "Demo Project — pass-with-fixes sample",
    clientTag: "Acme Co. (demo)",
    intakeMethod: "github",
    intakeRef: "demo-org/demo-repo-pwf",
    createdAt: "2026-05-09T11:08:00Z",
    lastRunId: "run-demo-2",
    lastVerdict: "PASS_WITH_FIXES",
  },
];

/**
 * Mock finding — shape mirrors `audit-output.v1.schema.json` `findings[]`.
 * File paths are explicitly `src/Mock*` so alpha users see the seam.
 */
export interface MockFinding {
  id: string;
  severity: Severity;
  reviewer: ReviewerName;
  category: "UX" | "Accessibility" | "Copy" | "Brand" | "Flow" | "Audience";
  title: string;
  whatWeFound: string;
  whyItMatters: string;
  fix: string;
  filePath: string;
  lineRange: string;
}

/**
 * 14 findings spanning every severity tier (Blocker · Critical · Major ·
 * Minor · Polish) and every reviewer (Optic · Halo · Proof · Compass ·
 * Canon · Compass+Audience). Copy mirrors `verdict-fail.jsx` fixture so
 * the seam from prototype → app is invisible.
 */
export const MOCK_FINDINGS: MockFinding[] = [
  // ── Blockers (2)
  {
    id: "F-MOCK-001",
    severity: "blocker",
    reviewer: "Halo",
    category: "Accessibility",
    title: "Form labels missing on /signup inputs",
    whatWeFound:
      "The email and password inputs on /signup are missing programmatic labels. Screen-reader users hear \"edit text, blank\" and have to guess what to type.",
    whyItMatters:
      "WCAG 2.2 AA, success criterion 1.3.1 (Info and Relationships) and 3.3.2 (Labels or Instructions). One in five visitors uses an assistive technology at some point — they'll bounce.",
    fix: "Add an aria-label or a visible <label for=\"…\"> to each <input>.",
    filePath: "src/MockSignupPage.tsx",
    lineRange: "42–58",
  },
  {
    id: "F-MOCK-002",
    severity: "blocker",
    reviewer: "Halo",
    category: "Accessibility",
    title: "Focus order is non-sequential on /dashboard",
    whatWeFound:
      "Tab moves from header to footer-sidebar before reaching the main content region.",
    whyItMatters: "SC 2.4.3 Focus Order. Keyboard-only users lose context every entry.",
    fix: "Wrap <main> with tabindex=-1 and reorder skip-link target.",
    filePath: "src/MockDashboardLayout.tsx",
    lineRange: "12–24",
  },
  // ── Critical (4)
  {
    id: "F-MOCK-003",
    severity: "critical",
    reviewer: "Halo",
    category: "Accessibility",
    title: "Insufficient contrast on disclaimer text",
    whatWeFound: "Footer disclaimer renders #808080 on #ffffff — 4.0:1.",
    whyItMatters: "SC 1.4.3 — body text fails AA at 4.5:1.",
    fix: "Swap the disclaimer color token to --ink-1.",
    filePath: "src/MockFooter.tsx",
    lineRange: "30–35",
  },
  {
    id: "F-MOCK-004",
    severity: "critical",
    reviewer: "Optic",
    category: "UX",
    title: "Pricing CTA below the fold at 768px",
    whatWeFound: "Mobile breakpoint hides \"Get started\" below the first 100vh.",
    whyItMatters:
      "Hick's + Fitts's — the primary action must be reachable without scroll on the activation surface.",
    fix: "Reorder hero sections; sticky CTA at <md breakpoint.",
    filePath: "src/MockHero.tsx",
    lineRange: "88–104",
  },
  {
    id: "F-MOCK-005",
    severity: "critical",
    reviewer: "Proof",
    category: "Copy",
    title: "Marketing claim \"10x faster\" lacks substantiation",
    whatWeFound:
      "Landing hero states \"10x faster than competitors\" without a citation.",
    whyItMatters:
      "FTC advertising substantiation — comparative claims require evidence on file.",
    fix:
      "Either remove the claim or attach a substantiation file in marketing/claims-substantiation/.",
    filePath: "src/MockLandingHero.tsx",
    lineRange: "14–14",
  },
  {
    id: "F-MOCK-006",
    severity: "critical",
    reviewer: "Optic",
    category: "Flow",
    title: "Dead-end state on payment failure",
    whatWeFound:
      "When Stripe returns card_declined the user lands on /billing/error with no path forward.",
    whyItMatters:
      "Trace red-line — every state must have a forward action. Card declines are common; this drops conversion.",
    fix: "Add \"Try a different card\" and \"Pick a different plan\" affordances.",
    filePath: "src/MockBillingError.tsx",
    lineRange: "1–48",
  },
  // ── Major (5)
  {
    id: "F-MOCK-007",
    severity: "major",
    reviewer: "Canon",
    category: "Brand",
    title: "Heading typeface inconsistent across pages",
    whatWeFound:
      "/about uses Inter; rest of site uses the brand sans token.",
    whyItMatters:
      "Brand consistency — the wordmark is the only identifier; type drift dilutes recall.",
    fix: "Replace Inter import with the brand --font-sans token.",
    filePath: "src/MockAboutPage.tsx",
    lineRange: "3–8",
  },
  {
    id: "F-MOCK-008",
    severity: "major",
    reviewer: "Compass",
    category: "Audience",
    title: "Technical jargon in onboarding for non-technical persona",
    whatWeFound:
      "Onboarding copy uses \"API key\", \"OAuth scope\", \"webhook\" without plain-English glosses.",
    whyItMatters:
      "PRD §5 — non-technical solo-founder persona stalls when terminology assumes infra fluency.",
    fix: "Add inline glosses; demote technical terms to eyebrow positions.",
    filePath: "src/MockOnboarding.tsx",
    lineRange: "60–120",
  },
  {
    id: "F-MOCK-009",
    severity: "major",
    reviewer: "Halo",
    category: "Accessibility",
    title: "Live-progress region not throttled",
    whatWeFound:
      "Reviewer-progress events fire >10/sec at peak; AT users get a firehose.",
    whyItMatters: "SC 2.2.1 + Halo A2-2 — coalesce to 250ms trailing debounce, ≤4/sec.",
    fix: "Wrap event emitter with debounce in LiveProgressRegion.",
    filePath: "src/MockProgress.tsx",
    lineRange: "40–70",
  },
  {
    id: "F-MOCK-010",
    severity: "major",
    reviewer: "Optic",
    category: "UX",
    title: "Hick's Law overflow on settings page",
    whatWeFound: "Settings root surfaces 12 top-level rows; cognitive load too high.",
    whyItMatters: "Optic HB-4 — group into 3–5 sections.",
    fix: "Apply Account / Integrations / Billing & Data grouping per settings-root spec.",
    filePath: "src/MockSettings.tsx",
    lineRange: "1–120",
  },
  {
    id: "F-MOCK-011",
    severity: "major",
    reviewer: "Proof",
    category: "Copy",
    title: "Error message uses raw 401 in user-facing string",
    whatWeFound:
      "BYOK validation surface shows \"HTTP 401 Unauthorized\" verbatim on key reject.",
    whyItMatters:
      "Error-frame — never surface raw protocol errors. Speak in user terms.",
    fix: "Replace with \"Anthropic didn't accept that key. Check it and paste again.\"",
    filePath: "src/MockByokForm.tsx",
    lineRange: "88–94",
  },
  // ── Minor (3)
  {
    id: "F-MOCK-012",
    severity: "minor",
    reviewer: "Canon",
    category: "Brand",
    title: "Watermark missing on shared-link PASS page",
    whatWeFound:
      "PASS verdicts shared publicly do not carry the brand watermark.",
    whyItMatters: "Distribution + provenance — the verdict travels; the brand should too.",
    fix: "Add <Chip variant=\"watermark\"> to share-page composition.",
    filePath: "src/MockSharePage.tsx",
    lineRange: "50–55",
  },
  {
    id: "F-MOCK-013",
    severity: "minor",
    reviewer: "Optic",
    category: "UX",
    title: "Toast persists 8s — too long",
    whatWeFound:
      "\"Saved\" toast lingers 8 seconds after success.",
    whyItMatters:
      "Optic — feedback should be brief; 3s is the brand norm per sample 02 §4.",
    fix: "Lower toast TTL to 3000ms.",
    filePath: "src/MockToast.tsx",
    lineRange: "12–14",
  },
  // ── Polish (1)
  {
    id: "F-MOCK-014",
    severity: "polish",
    reviewer: "Canon",
    category: "Brand",
    title: "Mono meta letter-spacing off by 0.005em",
    whatWeFound:
      "Eyebrow text uses 0.075em; brand spec is 0.08em.",
    whyItMatters: "Microtype consistency.",
    fix: "Update eyebrow letter-spacing token.",
    filePath: "src/MockEyebrow.css",
    lineRange: "4–4",
  },
];

/** Score breakdown — mirrors `score_engine.v1.json` category weights. */
export interface MockScoreBreakdown {
  total: number;
  categories: Array<{ name: string; score: number; weight: number }>;
}

export const MOCK_SCORE_FAIL: MockScoreBreakdown = {
  total: 58,
  categories: [
    { name: "UX", score: 62, weight: 0.2 },
    { name: "Accessibility", score: 44, weight: 0.25 },
    { name: "Copy", score: 55, weight: 0.15 },
    { name: "Brand", score: 70, weight: 0.15 },
    { name: "Flow", score: 64, weight: 0.15 },
    { name: "Audience", score: 61, weight: 0.1 },
  ],
};

export const MOCK_SCORE_PWF: MockScoreBreakdown = {
  total: 82,
  categories: [
    { name: "UX", score: 84, weight: 0.2 },
    { name: "Accessibility", score: 78, weight: 0.25 },
    { name: "Copy", score: 81, weight: 0.15 },
    { name: "Brand", score: 86, weight: 0.15 },
    { name: "Flow", score: 84, weight: 0.15 },
    { name: "Audience", score: 80, weight: 0.1 },
  ],
};

/** Mock run — mirrors `runs.*` columns from the M1 migration. */
export interface MockRun {
  id: string;
  projectId: string;
  state: RunState;
  verdict: Verdict | null;
  score: number | null;
  depth: "quick" | "comprehensive";
  mode: "byok" | "managed" | "cli";
  intakeMethod: "github" | "url" | "local";
  intakeRef: string;
  startedAt: string;
  finishedAt: string | null;
  findingsCount: number;
  scoreEngineVersion: "v1";
}

/**
 * Mock factory: returns a run starting in `queued` so the state machine
 * has somewhere to advance. The fixed runIds map to a deterministic
 * verdict path:
 *  - `run-demo-1` → FAIL (Surface SKU; URL intake; free tier)
 *  - `run-demo-2` → PASS_WITH_FIXES (Code SKU; GitHub intake; BYOK)
 *  - `run-demo-3` → BYOK Code Quick → PASS_WITH_FIXES (scenario 2)
 *  - `run-demo-fail` → free Surface FAIL (scenario 1)
 */
export function getMockRunFixture(runId: string): MockRun {
  // Newly created runs (when a runId begins with `run-demo-` followed by a
  // numeric timestamp from `crypto.randomUUID()`-equivalent mock minting)
  // map to FAIL by default unless the URL path suggests otherwise.
  const isPwf = runId === "run-demo-2" || runId === "run-demo-3";

  return {
    id: runId,
    projectId: isPwf ? "demo-project-2" : "demo-project-1",
    state: "queued",
    verdict: null,
    score: null,
    depth: "quick",
    mode: isPwf ? "byok" : "byok",
    intakeMethod: isPwf ? "github" : "url",
    intakeRef: isPwf ? "demo-org/demo-repo-pwf" : "https://example.com/demo",
    startedAt: new Date().toISOString(),
    finishedAt: null,
    findingsCount: 0,
    scoreEngineVersion: "v1",
  };
}

/**
 * Deterministic verdict mapping. The state machine calls this after the
 * `verdict_emitted` transition fires.
 */
export function getMockVerdictForRun(runId: string): {
  verdict: Verdict;
  score: MockScoreBreakdown;
  findings: MockFinding[];
} {
  const isPwf = runId === "run-demo-2" || runId === "run-demo-3";
  if (isPwf) {
    return {
      verdict: "PASS_WITH_FIXES",
      score: MOCK_SCORE_PWF,
      // PWF shows fewer findings — the polish + minor tier.
      findings: MOCK_FINDINGS.filter(
        (f) => f.severity === "minor" || f.severity === "polish" || f.severity === "major",
      ).slice(0, 6),
    };
  }
  return {
    verdict: "FAIL",
    score: MOCK_SCORE_FAIL,
    findings: MOCK_FINDINGS,
  };
}
